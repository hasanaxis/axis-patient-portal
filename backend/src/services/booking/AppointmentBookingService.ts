import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import { addDays, format, parseISO } from 'date-fns'
import { SMSAutomationService } from '../sms/SMSAutomationService'

export interface AppointmentBookingRequest {
  // Patient Information
  firstName: string
  lastName: string
  dateOfBirth: string
  phoneNumber: string
  email?: string
  medicareNumber?: string
  
  // Appointment Details
  scanType: string
  bodyPartExamined: string
  preferredDate?: string
  preferredTime?: 'morning' | 'afternoon' | 'evening'
  specialRequirements?: string
  notes?: string
  
  // Referral Information
  hasReferral: boolean
  referralSource?: string
  referralFile?: {
    buffer: Buffer
    originalName: string
    mimeType: string
  }
  
  // Medical Information
  contrastRequired?: boolean
  contrastAllergies?: string
  currentMedications?: string
  allergies?: string
  
  // Special Requirements
  wheelchairAccess?: boolean
  interpreterRequired?: boolean
  interpreterLanguage?: string
  accompaniedByCaregiver?: boolean
  
  // Consent
  termsAccepted: boolean
  privacyAccepted: boolean
  marketingConsent?: boolean
}

export interface AppointmentBookingResult {
  success: boolean
  bookingReference?: string
  appointmentRequestId?: string
  message: string
  errors?: string[]
  requiresReferral?: boolean
  estimatedProcessingTime?: string
}

export class AppointmentBookingService {
  private prisma: PrismaClient
  private smsService?: SMSAutomationService

  constructor(prisma: PrismaClient, smsService?: SMSAutomationService) {
    this.prisma = prisma
    this.smsService = smsService
  }

  async submitBookingRequest(request: AppointmentBookingRequest): Promise<AppointmentBookingResult> {
    try {
      // Validate the request
      const validation = await this.validateBookingRequest(request)
      if (!validation.isValid) {
        return {
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        }
      }

      // Check if scan type exists and get configuration
      const scanConfig = await this.getScanTypeConfiguration(request.scanType as any)
      if (!scanConfig) {
        return {
          success: false,
          message: 'Invalid scan type selected'
        }
      }

      // Generate unique booking reference
      const bookingReference = this.generateBookingReference()

      // Handle referral upload if provided
      let referralUploadUrl: string | undefined
      if (request.hasReferral && request.referralFile) {
        referralUploadUrl = await this.handleReferralUpload(
          request.referralFile,
          bookingReference
        )
      }

      // Create appointment request in database
      const appointmentRequest = await this.prisma.appointmentRequest.create({
        data: {
          firstName: request.firstName,
          lastName: request.lastName,
          dateOfBirth: parseISO(request.dateOfBirth),
          phoneNumber: this.formatPhoneNumber(request.phoneNumber),
          email: request.email,
          medicareNumber: request.medicareNumber,
          
          scanType: request.scanType as any,
          bodyPartExamined: request.bodyPartExamined,
          preferredDate: request.preferredDate ? parseISO(request.preferredDate) : null,
          preferredTime: request.preferredTime,
          specialRequirements: request.specialRequirements,
          notes: request.notes,
          
          hasReferral: request.hasReferral,
          referralSource: request.referralSource,
          referralUploadUrl: referralUploadUrl,
          referralOriginalName: request.referralFile?.originalName,
          
          contrastRequired: request.contrastRequired || false,
          contrastAllergies: request.contrastAllergies,
          currentMedications: request.currentMedications,
          allergies: request.allergies,
          
          wheelchairAccess: request.wheelchairAccess || false,
          interpreterRequired: request.interpreterRequired || false,
          interpreterLanguage: request.interpreterLanguage,
          accompaniedByCaregiver: request.accompaniedByCaregiver || false,
          
          termsAccepted: request.termsAccepted,
          privacyAccepted: request.privacyAccepted,
          marketingConsent: request.marketingConsent || false,
          
          bookingReference: bookingReference,
          status: scanConfig.requiresReferral && !request.hasReferral ? 
            'REFERRAL_REQUIRED' : 'SUBMITTED'
        }
      })

      // Create initial status history
      await this.prisma.appointmentRequestStatusHistory.create({
        data: {
          appointmentRequestId: appointmentRequest.id,
          toStatus: appointmentRequest.status as any,
          changedBy: 'SYSTEM',
          reason: 'Initial submission'
        }
      })

      // Send confirmation notifications
      await this.sendBookingConfirmation(appointmentRequest.id)

      // Notify staff of new booking
      await this.notifyStaffOfNewBooking(appointmentRequest.id)

      return {
        success: true,
        bookingReference: bookingReference,
        appointmentRequestId: appointmentRequest.id,
        message: scanConfig.requiresReferral && !request.hasReferral ?
          'Booking request submitted. Please upload your GP referral to complete the booking.' :
          'Booking request submitted successfully. You will be contacted within 24 hours to confirm your appointment.',
        requiresReferral: scanConfig.requiresReferral && !request.hasReferral,
        estimatedProcessingTime: '24 hours'
      }
    } catch (error) {
      console.error('Booking submission error:', error)
      return {
        success: false,
        message: 'An error occurred while processing your booking. Please try again or contact us directly.'
      }
    }
  }

  async updateBookingStatus(
    appointmentRequestId: string,
    newStatus: string,
    changedBy: string,
    reason?: string,
    notes?: string
  ): Promise<void> {
    const appointmentRequest = await this.prisma.appointmentRequest.findUnique({
      where: { id: appointmentRequestId },
      select: { status: true }
    })

    if (!appointmentRequest) {
      throw new Error('Appointment request not found')
    }

    const oldStatus = appointmentRequest.status

    // Update the status
    await this.prisma.appointmentRequest.update({
      where: { id: appointmentRequestId },
      data: {
        status: newStatus as any,
        processedBy: changedBy,
        processedAt: new Date()
      }
    })

    // Create status history
    await this.prisma.appointmentRequestStatusHistory.create({
      data: {
        appointmentRequestId,
        fromStatus: oldStatus as any,
        toStatus: newStatus as any,
        changedBy,
        reason,
        notes
      }
    })

    // Send appropriate notifications based on status change
    await this.handleStatusChangeNotifications(appointmentRequestId, newStatus, oldStatus)
  }

  async getBookingByReference(bookingReference: string) {
    return this.prisma.appointmentRequest.findUnique({
      where: { bookingReference },
      include: {
        statusHistory: {
          orderBy: { createdAt: 'desc' }
        },
        notifications: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })
  }

  async searchBookings(criteria: {
    phoneNumber?: string
    email?: string
    bookingReference?: string
    status?: string
    scanType?: string
    dateFrom?: string
    dateTo?: string
    limit?: number
    offset?: number
  }) {
    const where: any = {}

    if (criteria.phoneNumber) {
      where.phoneNumber = { contains: criteria.phoneNumber }
    }
    if (criteria.email) {
      where.email = { contains: criteria.email, mode: 'insensitive' }
    }
    if (criteria.bookingReference) {
      where.bookingReference = criteria.bookingReference
    }
    if (criteria.status) {
      where.status = criteria.status
    }
    if (criteria.scanType) {
      where.scanType = criteria.scanType
    }
    if (criteria.dateFrom || criteria.dateTo) {
      where.submittedAt = {}
      if (criteria.dateFrom) {
        where.submittedAt.gte = parseISO(criteria.dateFrom)
      }
      if (criteria.dateTo) {
        where.submittedAt.lte = parseISO(criteria.dateTo)
      }
    }

    const [bookings, total] = await Promise.all([
      this.prisma.appointmentRequest.findMany({
        where,
        include: {
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: { submittedAt: 'desc' },
        take: criteria.limit || 50,
        skip: criteria.offset || 0
      }),
      this.prisma.appointmentRequest.count({ where })
    ])

    return { bookings, total }
  }

  async getAvailableTimeSlots(scanType: string, date: string): Promise<string[]> {
    const scanConfig = await this.getScanTypeConfiguration(scanType as any)
    if (!scanConfig) {
      return []
    }

    const requestedDate = parseISO(date)
    const dayOfWeek = format(requestedDate, 'E') // Mon, Tue, Wed, etc.

    // Check if the scan type is available on this day
    if (!scanConfig.availableDays.includes(dayOfWeek)) {
      return []
    }

    // Return available time slots for this scan type
    return scanConfig.availableTimeSlots
  }

  async getScanTypeConfiguration(scanType: any) {
    return this.prisma.scanTypeConfiguration.findUnique({
      where: { scanType },
      include: {
        // Include any relations if needed
      }
    })
  }

  async getAllScanTypes() {
    return this.prisma.scanTypeConfiguration.findMany({
      where: { isActive: true },
      orderBy: { displayName: 'asc' }
    })
  }

  async getBodyPartsForScanType(scanType: string) {
    const config = await this.getScanTypeConfiguration(scanType as any)
    if (!config) {
      return []
    }

    return config.availableBodyParts
  }

  private async validateBookingRequest(request: AppointmentBookingRequest): Promise<{
    isValid: boolean
    errors: string[]
  }> {
    const errors: string[] = []

    // Required field validation
    if (!request.firstName?.trim()) {
      errors.push('First name is required')
    }
    if (!request.lastName?.trim()) {
      errors.push('Last name is required')
    }
    if (!request.dateOfBirth) {
      errors.push('Date of birth is required')
    }
    if (!request.phoneNumber?.trim()) {
      errors.push('Phone number is required')
    }
    if (!request.scanType) {
      errors.push('Scan type is required')
    }
    if (!request.bodyPartExamined?.trim()) {
      errors.push('Body part to be examined is required')
    }

    // Terms acceptance validation
    if (!request.termsAccepted) {
      errors.push('You must accept the terms of service')
    }
    if (!request.privacyAccepted) {
      errors.push('You must accept the privacy policy')
    }

    // Phone number format validation
    if (request.phoneNumber && !this.isValidAustralianPhoneNumber(request.phoneNumber)) {
      errors.push('Please enter a valid Australian phone number')
    }

    // Email validation (if provided)
    if (request.email && !this.isValidEmail(request.email)) {
      errors.push('Please enter a valid email address')
    }

    // Date of birth validation
    if (request.dateOfBirth) {
      try {
        const dob = parseISO(request.dateOfBirth)
        const now = new Date()
        const age = now.getFullYear() - dob.getFullYear()
        if (age < 0 || age > 120) {
          errors.push('Please enter a valid date of birth')
        }
      } catch {
        errors.push('Please enter a valid date of birth')
      }
    }

    // Preferred date validation (if provided)
    if (request.preferredDate) {
      try {
        const prefDate = parseISO(request.preferredDate)
        const tomorrow = addDays(new Date(), 1)
        if (prefDate < tomorrow) {
          errors.push('Preferred date must be at least 24 hours from now')
        }
      } catch {
        errors.push('Please enter a valid preferred date')
      }
    }

    // Referral validation
    if (request.hasReferral && request.referralFile) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
      if (!allowedTypes.includes(request.referralFile.mimeType)) {
        errors.push('Referral file must be a PDF, JPEG, or PNG')
      }
      
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (request.referralFile.buffer.length > maxSize) {
        errors.push('Referral file must be smaller than 10MB')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  private generateBookingReference(): string {
    const prefix = 'AXI'
    const timestamp = Date.now().toString().slice(-8)
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `${prefix}${timestamp}${random}`
  }

  private async handleReferralUpload(
    file: { buffer: Buffer; originalName: string; mimeType: string },
    bookingReference: string
  ): Promise<string> {
    // In a real implementation, this would upload to S3 or similar
    // For now, we'll simulate a file upload URL
    const timestamp = Date.now()
    const fileExtension = file.originalName.split('.').pop()
    const fileName = `referrals/${bookingReference}/${timestamp}.${fileExtension}`
    
    // TODO: Implement actual file upload to cloud storage
    // const uploadResult = await uploadToS3(file.buffer, fileName, file.mimeType)
    
    // Return simulated URL for now
    return `https://storage.axisimaging.com.au/${fileName}`
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '')
    
    // Convert to Australian international format
    if (digits.length === 10 && digits.startsWith('0')) {
      return `+61${digits.substring(1)}`
    } else if (digits.length === 9 && !digits.startsWith('0')) {
      return `+61${digits}`
    } else if (digits.length === 12 && digits.startsWith('61')) {
      return `+${digits}`
    }
    
    return phoneNumber // Return original if can't format
  }

  private isValidAustralianPhoneNumber(phoneNumber: string): boolean {
    const formatted = this.formatPhoneNumber(phoneNumber)
    return /^\+61[2-9]\d{8}$/.test(formatted)
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  private async sendBookingConfirmation(appointmentRequestId: string): Promise<void> {
    try {
      const booking = await this.prisma.appointmentRequest.findUnique({
        where: { id: appointmentRequestId }
      })

      if (!booking) return

      // Send SMS confirmation
      if (this.smsService) {
        await this.smsService.sendSMS({
          to: booking.phoneNumber,
          templateType: 'custom_message',
          variables: {
            patientName: `${booking.firstName} ${booking.lastName}`,
            message: `Thank you for your booking request (Ref: ${booking.bookingReference}). We'll contact you within 24 hours to confirm your appointment. - Axis Imaging`
          },
          priority: 'normal'
        })
      }

      // Create notification record
      await this.prisma.appointmentRequestNotification.create({
        data: {
          appointmentRequestId,
          type: 'BOOKING_CONFIRMATION',
          method: 'SMS',
          recipient: booking.phoneNumber,
          content: `Booking confirmation sent for reference ${booking.bookingReference}`,
          status: 'SENT',
          sentAt: new Date()
        }
      })
    } catch (error) {
      console.error('Error sending booking confirmation:', error)
    }
  }

  private async notifyStaffOfNewBooking(appointmentRequestId: string): Promise<void> {
    try {
      const booking = await this.prisma.appointmentRequest.findUnique({
        where: { id: appointmentRequestId }
      })

      if (!booking) return

      // Send email notification to booking staff
      // TODO: Implement email service
      console.log(`New booking received: ${booking.bookingReference}`)
      
      // Create notification record
      await this.prisma.appointmentRequestNotification.create({
        data: {
          appointmentRequestId,
          type: 'BOOKING_RECEIVED',
          method: 'EMAIL',
          recipient: 'bookings@axisimaging.com.au',
          content: `New booking request received: ${booking.bookingReference} - ${booking.firstName} ${booking.lastName}`,
          status: 'SENT',
          sentAt: new Date()
        }
      })
    } catch (error) {
      console.error('Error notifying staff of new booking:', error)
    }
  }

  private async handleStatusChangeNotifications(
    appointmentRequestId: string,
    newStatus: string,
    oldStatus: string
  ): Promise<void> {
    const booking = await this.prisma.appointmentRequest.findUnique({
      where: { id: appointmentRequestId }
    })

    if (!booking) return

    let notificationType: string | null = null
    let message = ''

    switch (newStatus) {
      case 'SCHEDULED':
        notificationType = 'APPOINTMENT_SCHEDULED'
        message = `Great news! Your appointment has been scheduled. Reference: ${booking.bookingReference}. You'll receive confirmation details shortly.`
        break
      case 'CONFIRMED':
        notificationType = 'BOOKING_CONFIRMATION'
        message = `Your appointment is confirmed. Reference: ${booking.bookingReference}. Please arrive 15 minutes early.`
        break
      case 'CANCELLED':
        notificationType = 'APPOINTMENT_CANCELLED'
        message = `Your appointment has been cancelled. Reference: ${booking.bookingReference}. Please contact us to reschedule.`
        break
      case 'DECLINED':
        notificationType = 'APPOINTMENT_CANCELLED'
        message = `We're unable to process your booking request. Reference: ${booking.bookingReference}. Please contact us for assistance.`
        break
    }

    if (notificationType && this.smsService) {
      try {
        await this.smsService.sendSMS({
          to: booking.phoneNumber,
          templateType: 'custom_message',
          variables: {
            patientName: `${booking.firstName} ${booking.lastName}`,
            message: message
          },
          priority: 'normal'
        })

        // Create notification record
        await this.prisma.appointmentRequestNotification.create({
          data: {
            appointmentRequestId,
            type: notificationType as any,
            method: 'SMS',
            recipient: booking.phoneNumber,
            content: message,
            status: 'SENT',
            sentAt: new Date()
          }
        })
      } catch (error) {
        console.error('Error sending status change notification:', error)
      }
    }
  }
}