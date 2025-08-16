import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import multer from 'multer'
import { z } from 'zod'
import { AppointmentBookingService, AppointmentBookingRequest } from '../services/booking/AppointmentBookingService'
import { ScanTypeConfigurationService } from '../services/booking/ScanTypeConfigurationService'
import { SMSAutomationService } from '../services/sms/SMSAutomationService'

// Validation schemas
const bookingRequestSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format'),
  phoneNumber: z.string().min(10, 'Phone number is required'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  medicareNumber: z.string().optional(),
  
  scanType: z.enum(['XRAY', 'CT', 'ULTRASOUND', 'DEXA', 'MAMMOGRAPHY']),
  bodyPartExamined: z.string().min(1, 'Body part is required'),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  preferredTime: z.enum(['morning', 'afternoon', 'evening']).optional(),
  specialRequirements: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  
  hasReferral: z.boolean(),
  referralSource: z.string().max(100).optional(),
  
  contrastRequired: z.boolean().optional(),
  contrastAllergies: z.string().max(500).optional(),
  currentMedications: z.string().max(1000).optional(),
  allergies: z.string().max(1000).optional(),
  
  wheelchairAccess: z.boolean().optional(),
  interpreterRequired: z.boolean().optional(),
  interpreterLanguage: z.string().max(50).optional(),
  accompaniedByCaregiver: z.boolean().optional(),
  
  termsAccepted: z.boolean().refine(val => val === true, 'Terms must be accepted'),
  privacyAccepted: z.boolean().refine(val => val === true, 'Privacy policy must be accepted'),
  marketingConsent: z.boolean().optional()
})

const searchBookingsSchema = z.object({
  phoneNumber: z.string().optional(),
  email: z.string().optional(),
  bookingReference: z.string().optional(),
  status: z.string().optional(),
  scanType: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional()
})

const updateStatusSchema = z.object({
  status: z.enum(['SUBMITTED', 'UNDER_REVIEW', 'REFERRAL_REQUIRED', 'REFERRAL_RECEIVED', 
                  'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'DECLINED', 'NO_SHOW', 'RESCHEDULED']),
  reason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional()
})

export class BookingController {
  private prisma: PrismaClient
  private bookingService: AppointmentBookingService
  private scanConfigService: ScanTypeConfigurationService
  private smsService?: SMSAutomationService

  constructor(
    prisma: PrismaClient,
    smsService?: SMSAutomationService
  ) {
    this.prisma = prisma
    this.smsService = smsService
    this.bookingService = new AppointmentBookingService(prisma, smsService)
    this.scanConfigService = new ScanTypeConfigurationService(prisma)
  }

  // ===== PUBLIC BOOKING ENDPOINTS =====

  async submitBooking(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = bookingRequestSchema.parse(req.body)
      
      // Handle referral file if uploaded
      let referralFile: { buffer: Buffer; originalName: string; mimeType: string } | undefined
      if (req.file) {
        referralFile = {
          buffer: req.file.buffer,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype
        }
      }

      const bookingRequest: AppointmentBookingRequest = {
        ...validatedData,
        email: validatedData.email || undefined,
        referralFile
      }

      const result = await this.bookingService.submitBookingRequest(bookingRequest)

      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message,
          bookingReference: result.bookingReference,
          appointmentRequestId: result.appointmentRequestId,
          requiresReferral: result.requiresReferral,
          estimatedProcessingTime: result.estimatedProcessingTime
        })
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: result.errors
        })
      }
    } catch (error) {
      console.error('Booking submission error:', error)
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors.map(e => e.message)
        })
      } else {
        res.status(500).json({
          success: false,
          message: 'An error occurred while processing your booking. Please try again.'
        })
      }
    }
  }

  async getBookingStatus(req: Request, res: Response): Promise<void> {
    try {
      const { bookingReference } = req.params
      
      if (!bookingReference) {
        res.status(400).json({ error: 'Booking reference is required' })
        return
      }

      const booking = await this.bookingService.getBookingByReference(bookingReference)
      
      if (!booking) {
        res.status(404).json({ error: 'Booking not found' })
        return
      }

      // Return limited information for privacy
      res.status(200).json({
        bookingReference: booking.bookingReference,
        status: booking.status,
        scanType: booking.scanType,
        bodyPartExamined: booking.bodyPartExamined,
        submittedAt: booking.submittedAt,
        lastUpdated: booking.updatedAt,
        patientName: `${booking.firstName} ${booking.lastName}`,
        statusHistory: booking.statusHistory?.map(h => ({
          status: h.toStatus,
          changedAt: h.createdAt,
          reason: h.reason
        })) || []
      })
    } catch (error) {
      console.error('Get booking status error:', error)
      res.status(500).json({ error: 'Failed to retrieve booking status' })
    }
  }

  async getScanTypes(req: Request, res: Response): Promise<void> {
    try {
      const scanTypes = await this.scanConfigService.getAllActiveScanTypes()
      
      const formattedScanTypes = scanTypes.map(st => ({
        value: st.scanType,
        label: st.displayName,
        description: st.description,
        duration: st.duration,
        requiresReferral: st.requiresReferral,
        requiresFasting: st.requiresFasting,
        fastingHours: st.fastingHours,
        contrastAvailable: st.contrastAvailable,
        wheelchairAccessible: st.wheelchairAccessible,
        pregnancyRestrictions: st.pregnancyRestrictions,
        ageRestrictions: st.ageRestrictions,
        availableDays: st.availableDays,
        availableTimeSlots: st.availableTimeSlots,
        bulkBillingAvailable: st.bulkBillingAvailable,
        privatePrice: st.privatePrice
      }))
      
      res.status(200).json({ scanTypes: formattedScanTypes })
    } catch (error) {
      console.error('Get scan types error:', error)
      res.status(500).json({ error: 'Failed to retrieve scan types' })
    }
  }

  async getBodyParts(req: Request, res: Response): Promise<void> {
    try {
      const { scanType } = req.params
      
      if (!scanType) {
        res.status(400).json({ error: 'Scan type is required' })
        return
      }

      const bodyParts = await this.scanConfigService.getBodyPartsForScanType(scanType)
      
      res.status(200).json({ bodyParts })
    } catch (error) {
      console.error('Get body parts error:', error)
      res.status(500).json({ error: 'Failed to retrieve body parts' })
    }
  }

  async getPreparationInstructions(req: Request, res: Response): Promise<void> {
    try {
      const { scanType } = req.params
      const { bodyPart } = req.query
      
      if (!scanType) {
        res.status(400).json({ error: 'Scan type is required' })
        return
      }

      const instructions = await this.scanConfigService.getPreparationInstructions(
        scanType,
        bodyPart as string
      )
      
      if (!instructions) {
        res.status(404).json({ error: 'Scan type not found' })
        return
      }

      res.status(200).json({ instructions })
    } catch (error) {
      console.error('Get preparation instructions error:', error)
      res.status(500).json({ error: 'Failed to retrieve preparation instructions' })
    }
  }

  async getEstimatedCost(req: Request, res: Response): Promise<void> {
    try {
      const { scanType } = req.params
      const { bulkBilled = 'true' } = req.query
      
      if (!scanType) {
        res.status(400).json({ error: 'Scan type is required' })
        return
      }

      const costInfo = await this.scanConfigService.getEstimatedCost(
        scanType,
        bulkBilled === 'true'
      )
      
      if (!costInfo) {
        res.status(404).json({ error: 'Scan type not found' })
        return
      }

      res.status(200).json({ costInfo })
    } catch (error) {
      console.error('Get estimated cost error:', error)
      res.status(500).json({ error: 'Failed to retrieve cost information' })
    }
  }

  async getAvailableTimeSlots(req: Request, res: Response): Promise<void> {
    try {
      const { scanType, date } = req.params
      
      if (!scanType || !date) {
        res.status(400).json({ error: 'Scan type and date are required' })
        return
      }

      const timeSlots = await this.bookingService.getAvailableTimeSlots(scanType, date)
      
      res.status(200).json({ timeSlots })
    } catch (error) {
      console.error('Get available time slots error:', error)
      res.status(500).json({ error: 'Failed to retrieve available time slots' })
    }
  }

  // ===== STAFF MANAGEMENT ENDPOINTS =====

  async searchBookings(req: Request, res: Response): Promise<void> {
    try {
      const validatedQuery = searchBookingsSchema.parse(req.query)
      
      const result = await this.bookingService.searchBookings(validatedQuery)
      
      res.status(200).json({
        bookings: result.bookings.map(booking => ({
          id: booking.id,
          bookingReference: booking.bookingReference,
          patientName: `${booking.firstName} ${booking.lastName}`,
          phoneNumber: booking.phoneNumber,
          email: booking.email,
          scanType: booking.scanType,
          bodyPartExamined: booking.bodyPartExamined,
          status: booking.status,
          submittedAt: booking.submittedAt,
          preferredDate: booking.preferredDate,
          hasReferral: booking.hasReferral,
          lastStatusChange: booking.statusHistory[0]?.createdAt,
          wheelchairAccess: booking.wheelchairAccess,
          interpreterRequired: booking.interpreterRequired
        })),
        total: result.total,
        limit: validatedQuery.limit || 50,
        offset: validatedQuery.offset || 0
      })
    } catch (error) {
      console.error('Search bookings error:', error)
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid search parameters',
          details: error.errors
        })
      } else {
        res.status(500).json({ error: 'Failed to search bookings' })
      }
    }
  }

  async getBookingDetails(req: Request, res: Response): Promise<void> {
    try {
      const { bookingId } = req.params
      
      const booking = await this.prisma.appointmentRequest.findUnique({
        where: { id: bookingId },
        include: {
          statusHistory: {
            orderBy: { createdAt: 'desc' }
          },
          notifications: {
            orderBy: { createdAt: 'desc' }
          },
          confirmedAppointment: true
        }
      })
      
      if (!booking) {
        res.status(404).json({ error: 'Booking not found' })
        return
      }

      res.status(200).json({ booking })
    } catch (error) {
      console.error('Get booking details error:', error)
      res.status(500).json({ error: 'Failed to retrieve booking details' })
    }
  }

  async updateBookingStatus(req: Request, res: Response): Promise<void> {
    try {
      const { bookingId } = req.params
      const validatedData = updateStatusSchema.parse(req.body)
      const staffMember = req.user?.id || 'SYSTEM'
      
      await this.bookingService.updateBookingStatus(
        bookingId,
        validatedData.status,
        staffMember,
        validatedData.reason,
        validatedData.notes
      )
      
      res.status(200).json({
        success: true,
        message: 'Booking status updated successfully'
      })
    } catch (error) {
      console.error('Update booking status error:', error)
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid status update data',
          details: error.errors
        })
      } else {
        res.status(500).json({ error: 'Failed to update booking status' })
      }
    }
  }

  async getBookingStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { dateFrom, dateTo } = req.query
      
      const whereClause: any = {}
      if (dateFrom || dateTo) {
        whereClause.submittedAt = {}
        if (dateFrom) whereClause.submittedAt.gte = new Date(dateFrom as string)
        if (dateTo) whereClause.submittedAt.lte = new Date(dateTo as string)
      }

      const [totalBookings, statusCounts, scanTypeCounts] = await Promise.all([
        this.prisma.appointmentRequest.count({ where: whereClause }),
        
        this.prisma.appointmentRequest.groupBy({
          by: ['status'],
          where: whereClause,
          _count: { id: true }
        }),
        
        this.prisma.appointmentRequest.groupBy({
          by: ['scanType'],
          where: whereClause,
          _count: { id: true }
        })
      ])

      const statistics = {
        totalBookings,
        byStatus: statusCounts.reduce((acc, item) => {
          acc[item.status] = item._count.id
          return acc
        }, {} as Record<string, number>),
        byScanType: scanTypeCounts.reduce((acc, item) => {
          acc[item.scanType] = item._count.id
          return acc
        }, {} as Record<string, number>)
      }
      
      res.status(200).json({ statistics })
    } catch (error) {
      console.error('Get booking statistics error:', error)
      res.status(500).json({ error: 'Failed to retrieve booking statistics' })
    }
  }

  // ===== REFERRAL MANAGEMENT =====

  async uploadReferral(req: Request, res: Response): Promise<void> {
    try {
      const { bookingReference } = req.params
      
      if (!req.file) {
        res.status(400).json({ error: 'Referral file is required' })
        return
      }

      const booking = await this.bookingService.getBookingByReference(bookingReference)
      if (!booking) {
        res.status(404).json({ error: 'Booking not found' })
        return
      }

      // Validate file type and size
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
      if (!allowedTypes.includes(req.file.mimetype)) {
        res.status(400).json({ error: 'File must be PDF, JPEG, or PNG' })
        return
      }

      const maxSize = 10 * 1024 * 1024 // 10MB
      if (req.file.size > maxSize) {
        res.status(400).json({ error: 'File must be smaller than 10MB' })
        return
      }

      // Handle file upload (implement actual storage logic)
      const referralUrl = `https://storage.axisimaging.com.au/referrals/${bookingReference}/${Date.now()}.${req.file.originalname.split('.').pop()}`
      
      // Update booking with referral information
      await this.prisma.appointmentRequest.update({
        where: { id: booking.id },
        data: {
          hasReferral: true,
          referralUploadUrl: referralUrl,
          referralOriginalName: req.file.originalname,
          status: 'REFERRAL_RECEIVED'
        }
      })

      // Update status history
      await this.prisma.appointmentRequestStatusHistory.create({
        data: {
          appointmentRequestId: booking.id,
          fromStatus: booking.status as any,
          toStatus: 'REFERRAL_RECEIVED',
          changedBy: 'PATIENT_UPLOAD',
          reason: 'Referral uploaded by patient'
        }
      })

      res.status(200).json({
        success: true,
        message: 'Referral uploaded successfully',
        referralUrl
      })
    } catch (error) {
      console.error('Upload referral error:', error)
      res.status(500).json({ error: 'Failed to upload referral' })
    }
  }

  async getReferral(req: Request, res: Response): Promise<void> {
    try {
      const { bookingId } = req.params
      
      const booking = await this.prisma.appointmentRequest.findUnique({
        where: { id: bookingId },
        select: {
          referralUploadUrl: true,
          referralOriginalName: true,
          hasReferral: true
        }
      })
      
      if (!booking || !booking.hasReferral || !booking.referralUploadUrl) {
        res.status(404).json({ error: 'Referral not found' })
        return
      }

      // In a real implementation, this would stream the file from storage
      res.status(200).json({
        referralUrl: booking.referralUploadUrl,
        originalName: booking.referralOriginalName
      })
    } catch (error) {
      console.error('Get referral error:', error)
      res.status(500).json({ error: 'Failed to retrieve referral' })
    }
  }
}

// Multer configuration for file uploads
export const uploadReferral = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only PDF, JPEG, and PNG files are allowed'))
    }
  }
})