import { Twilio } from 'twilio'
import { PrismaClient } from '@prisma/client'
import { addHours, isWithinInterval, parseISO } from 'date-fns'
import { SMSTemplateService } from './SMSTemplateService'
import { SMSDeliveryTracker } from './SMSDeliveryTracker'
import { PatientPreferences } from './PatientPreferences'

interface SMSConfig {
  accountSid: string
  authToken: string
  fromNumber: string
  webhookUrl?: string
}

interface SendSMSRequest {
  to: string
  templateType: string
  variables?: Record<string, string>
  patientId?: string
  reportId?: string
  priority?: 'normal' | 'high' | 'emergency'
  scheduledAt?: Date
}

interface SMSDeliveryResult {
  id: string
  status: 'sent' | 'failed' | 'scheduled'
  twilioSid?: string
  error?: string
  scheduledRetryAt?: Date
}

export class SMSService {
  private twilioClient: Twilio
  private prisma: PrismaClient
  private templateService: SMSTemplateService
  private deliveryTracker: SMSDeliveryTracker
  private patientPreferences: PatientPreferences
  private config: SMSConfig

  constructor(config: SMSConfig, prisma: PrismaClient) {
    this.config = config
    this.prisma = prisma
    this.twilioClient = new Twilio(config.accountSid, config.authToken)
    this.templateService = new SMSTemplateService()
    this.deliveryTracker = new SMSDeliveryTracker(prisma)
    this.patientPreferences = new PatientPreferences(prisma)
  }

  async sendSMS(request: SendSMSRequest): Promise<SMSDeliveryResult> {
    try {
      // Check patient preferences and opt-out status
      if (request.patientId) {
        const canSend = await this.patientPreferences.canSendSMS(
          request.patientId,
          request.templateType
        )
        if (!canSend) {
          return {
            id: 'opted-out',
            status: 'failed',
            error: 'Patient has opted out of SMS notifications'
          }
        }
      }

      // Format Australian phone number
      const formattedNumber = this.formatAustralianNumber(request.to)
      if (!formattedNumber) {
        return {
          id: 'invalid-number',
          status: 'failed',
          error: 'Invalid Australian phone number format'
        }
      }

      // Get message template
      const message = await this.templateService.getTemplate(
        request.templateType,
        request.variables || {}
      )

      // Check business hours and priority
      const shouldDelay = this.shouldDelayDelivery(request.priority)
      if (shouldDelay && !request.scheduledAt) {
        const nextBusinessHour = this.getNextBusinessHour()
        return this.scheduleMessage(request, nextBusinessHour)
      }

      // Send via Twilio
      const twilioMessage = await this.twilioClient.messages.create({
        body: message,
        from: this.config.fromNumber,
        to: formattedNumber,
        statusCallback: this.config.webhookUrl ? 
          `${this.config.webhookUrl}/sms/status` : undefined
      })

      // Record in database
      const smsRecord = await this.prisma.sMSNotification.create({
        data: {
          patientId: request.patientId,
          reportId: request.reportId,
          phoneNumber: formattedNumber,
          templateType: request.templateType,
          message: message,
          twilioSid: twilioMessage.sid,
          status: 'sent',
          priority: request.priority || 'normal',
          sentAt: new Date(),
          variables: request.variables ? JSON.stringify(request.variables) : null
        }
      })

      // Track delivery
      await this.deliveryTracker.trackMessage(smsRecord.id, twilioMessage.sid)

      return {
        id: smsRecord.id,
        status: 'sent',
        twilioSid: twilioMessage.sid
      }

    } catch (error) {
      console.error('SMS sending failed:', error)
      
      // Log failed attempt
      if (request.patientId) {
        await this.prisma.sMSNotification.create({
          data: {
            patientId: request.patientId,
            reportId: request.reportId,
            phoneNumber: request.to,
            templateType: request.templateType,
            message: 'Failed to generate message',
            status: 'failed',
            priority: request.priority || 'normal',
            error: error instanceof Error ? error.message : 'Unknown error',
            variables: request.variables ? JSON.stringify(request.variables) : null
          }
        })
      }

      return {
        id: 'failed',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private formatAustralianNumber(phoneNumber: string): string | null {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '')
    
    // Handle different Australian number formats
    if (digits.length === 10 && digits.startsWith('0')) {
      // 0412345678 -> +61412345678
      return `+61${digits.substring(1)}`
    } else if (digits.length === 9 && !digits.startsWith('0')) {
      // 412345678 -> +61412345678
      return `+61${digits}`
    } else if (digits.length === 12 && digits.startsWith('61')) {
      // 61412345678 -> +61412345678
      return `+${digits}`
    } else if (digits.length === 13 && digits.startsWith('61')) {
      // +61412345678 (already formatted)
      return `+${digits}`
    }
    
    return null // Invalid format
  }

  private shouldDelayDelivery(priority?: string): boolean {
    if (priority === 'emergency') return false
    
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay()
    
    // Business hours: Mon-Fri 7AM-7PM, Sat 8AM-4PM
    const isWeekday = day >= 1 && day <= 5
    const isSaturday = day === 6
    const isSunday = day === 0
    
    if (isSunday) return true
    if (isWeekday && (hour >= 7 && hour < 19)) return false
    if (isSaturday && (hour >= 8 && hour < 16)) return false
    
    return true
  }

  private getNextBusinessHour(): Date {
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay()
    
    // If it's before 7 AM on weekday, schedule for 7 AM today
    if (day >= 1 && day <= 5 && hour < 7) {
      const next = new Date(now)
      next.setHours(7, 0, 0, 0)
      return next
    }
    
    // If it's before 8 AM on Saturday, schedule for 8 AM today
    if (day === 6 && hour < 8) {
      const next = new Date(now)
      next.setHours(8, 0, 0, 0)
      return next
    }
    
    // Otherwise, schedule for next business day at opening time
    const next = new Date(now)
    
    if (day === 0) { // Sunday -> Monday 7 AM
      next.setDate(next.getDate() + 1)
      next.setHours(7, 0, 0, 0)
    } else if (day === 6) { // Saturday -> Monday 7 AM
      next.setDate(next.getDate() + 2)
      next.setHours(7, 0, 0, 0)
    } else { // Weekday after hours -> next day 7 AM
      next.setDate(next.getDate() + 1)
      next.setHours(7, 0, 0, 0)
    }
    
    return next
  }

  private async scheduleMessage(request: SendSMSRequest, scheduledAt: Date): Promise<SMSDeliveryResult> {
    const smsRecord = await this.prisma.sMSNotification.create({
      data: {
        patientId: request.patientId,
        reportId: request.reportId,
        phoneNumber: request.to,
        templateType: request.templateType,
        message: 'Scheduled for delivery',
        status: 'scheduled',
        priority: request.priority || 'normal',
        scheduledAt: scheduledAt,
        variables: request.variables ? JSON.stringify(request.variables) : null
      }
    })

    return {
      id: smsRecord.id,
      status: 'scheduled',
      scheduledRetryAt: scheduledAt
    }
  }

  async processScheduledMessages(): Promise<void> {
    const now = new Date()
    const scheduledMessages = await this.prisma.sMSNotification.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: {
          lte: now
        }
      },
      take: 50 // Process in batches
    })

    for (const message of scheduledMessages) {
      try {
        const variables = message.variables ? JSON.parse(message.variables) : {}
        
        await this.sendSMS({
          to: message.phoneNumber,
          templateType: message.templateType,
          variables,
          patientId: message.patientId || undefined,
          reportId: message.reportId || undefined,
          priority: message.priority as 'normal' | 'high' | 'emergency'
        })

        // Mark as processed
        await this.prisma.sMSNotification.update({
          where: { id: message.id },
          data: { status: 'sent', sentAt: now }
        })
        
      } catch (error) {
        console.error(`Failed to send scheduled message ${message.id}:`, error)
        
        // Mark as failed
        await this.prisma.sMSNotification.update({
          where: { id: message.id },
          data: { 
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        })
      }
    }
  }

  async handleDeliveryWebhook(twilioSid: string, status: string, errorMessage?: string): Promise<void> {
    await this.deliveryTracker.updateDeliveryStatus(twilioSid, status, errorMessage)
  }

  async retryFailedMessages(): Promise<void> {
    const failedMessages = await this.prisma.sMSNotification.findMany({
      where: {
        status: 'failed',
        retryCount: {
          lt: 3 // Max 3 retries
        },
        createdAt: {
          gte: addHours(new Date(), -24) // Only retry messages from last 24 hours
        }
      },
      take: 20
    })

    for (const message of failedMessages) {
      try {
        const variables = message.variables ? JSON.parse(message.variables) : {}
        
        const result = await this.sendSMS({
          to: message.phoneNumber,
          templateType: message.templateType,
          variables,
          patientId: message.patientId || undefined,
          reportId: message.reportId || undefined,
          priority: message.priority as 'normal' | 'high' | 'emergency'
        })

        if (result.status === 'sent') {
          await this.prisma.sMSNotification.update({
            where: { id: message.id },
            data: { 
              status: 'sent',
              sentAt: new Date(),
              retryCount: message.retryCount + 1,
              twilioSid: result.twilioSid
            }
          })
        }
        
      } catch (error) {
        await this.prisma.sMSNotification.update({
          where: { id: message.id },
          data: { 
            retryCount: message.retryCount + 1,
            error: error instanceof Error ? error.message : 'Retry failed'
          }
        })
      }
    }
  }
}