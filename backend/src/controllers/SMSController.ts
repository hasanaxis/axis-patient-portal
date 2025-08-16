import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { SMSService } from '../services/sms/SMSService'
import { SMSTemplateService } from '../services/sms/SMSTemplateService'
import { PatientPreferences } from '../services/sms/PatientPreferences'
import { SMSDeliveryTracker } from '../services/sms/SMSDeliveryTracker'
import { SMSAutomationService } from '../services/sms/SMSAutomationService'
import { z } from 'zod'

// Validation schemas
const sendSMSSchema = z.object({
  patientId: z.string().uuid(),
  templateType: z.string(),
  variables: z.record(z.string()).optional(),
  priority: z.enum(['normal', 'high', 'emergency']).optional(),
  scheduledAt: z.string().datetime().optional()
})

const bulkSMSSchema = z.object({
  patientIds: z.array(z.string().uuid()),
  templateType: z.string(),
  variables: z.record(z.string()).optional(),
  priority: z.enum(['normal', 'high', 'emergency']).optional()
})

const customMessageSchema = z.object({
  patientId: z.string().uuid(),
  message: z.string().min(1).max(480), // SMS character limit with margin
  priority: z.enum(['normal', 'high', 'emergency']).optional()
})

const updatePreferencesSchema = z.object({
  reportReadyNotifications: z.boolean().optional(),
  appointmentReminders: z.boolean().optional(),
  generalInformation: z.boolean().optional(),
  emergencyNotifications: z.boolean().optional()
})

export class SMSController {
  private prisma: PrismaClient
  private smsService: SMSService
  private templateService: SMSTemplateService
  private patientPreferences: PatientPreferences
  private deliveryTracker: SMSDeliveryTracker
  private automationService: SMSAutomationService

  constructor(
    prisma: PrismaClient,
    smsService: SMSService,
    automationService: SMSAutomationService
  ) {
    this.prisma = prisma
    this.smsService = smsService
    this.automationService = automationService
    this.templateService = new SMSTemplateService()
    this.patientPreferences = new PatientPreferences(prisma)
    this.deliveryTracker = new SMSDeliveryTracker(prisma)
  }

  // ===== MANUAL SMS SENDING =====

  async sendSMS(req: Request, res: Response): Promise<void> {
    try {
      const data = sendSMSSchema.parse(req.body)
      
      // Get patient details
      const patient = await this.prisma.patient.findUnique({
        where: { id: data.patientId },
        include: {
          user: true
        }
      })

      if (!patient) {
        res.status(404).json({ error: 'Patient not found' })
        return
      }

      // Validate template and variables
      const validation = await this.templateService.validateTemplate(
        data.templateType,
        data.variables || {}
      )

      if (!validation.valid) {
        res.status(400).json({
          error: 'Invalid template variables',
          missingVariables: validation.missingVariables
        })
        return
      }

      // Send SMS
      const result = await this.smsService.sendSMS({
        to: patient.user.phoneNumber,
        templateType: data.templateType,
        variables: data.variables,
        patientId: data.patientId,
        priority: data.priority,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined
      })

      res.status(200).json({
        success: result.status === 'sent' || result.status === 'scheduled',
        messageId: result.id,
        status: result.status,
        twilioSid: result.twilioSid,
        scheduledAt: result.scheduledRetryAt
      })
    } catch (error) {
      console.error('Send SMS error:', error)
      res.status(500).json({ error: 'Failed to send SMS' })
    }
  }

  async sendBulkSMS(req: Request, res: Response): Promise<void> {
    try {
      const data = bulkSMSSchema.parse(req.body)
      
      if (data.patientIds.length > 100) {
        res.status(400).json({ error: 'Maximum 100 patients per bulk send' })
        return
      }

      // Get all patients
      const patients = await this.prisma.patient.findMany({
        where: {
          id: { in: data.patientIds }
        },
        include: {
          user: true
        }
      })

      if (patients.length === 0) {
        res.status(404).json({ error: 'No patients found' })
        return
      }

      // Validate template
      const validation = await this.templateService.validateTemplate(
        data.templateType,
        data.variables || {}
      )

      if (!validation.valid) {
        res.status(400).json({
          error: 'Invalid template variables',
          missingVariables: validation.missingVariables
        })
        return
      }

      // Send to all patients
      const results = await Promise.allSettled(
        patients.map(patient =>
          this.smsService.sendSMS({
            to: patient.user.phoneNumber,
            templateType: data.templateType,
            variables: data.variables,
            patientId: patient.id,
            priority: data.priority
          })
        )
      )

      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      res.status(200).json({
        success: true,
        totalPatients: patients.length,
        successful,
        failed,
        results: results.map((result, index) => ({
          patientId: patients[index].id,
          success: result.status === 'fulfilled',
          messageId: result.status === 'fulfilled' ? result.value.id : null,
          error: result.status === 'rejected' ? result.reason.message : null
        }))
      })
    } catch (error) {
      console.error('Bulk SMS error:', error)
      res.status(500).json({ error: 'Failed to send bulk SMS' })
    }
  }

  async sendCustomMessage(req: Request, res: Response): Promise<void> {
    try {
      const data = customMessageSchema.parse(req.body)
      
      // Get patient details
      const patient = await this.prisma.patient.findUnique({
        where: { id: data.patientId },
        include: {
          user: true
        }
      })

      if (!patient) {
        res.status(404).json({ error: 'Patient not found' })
        return
      }

      // Send custom message using custom template
      const result = await this.smsService.sendSMS({
        to: patient.user.phoneNumber,
        templateType: 'custom_message',
        variables: {
          patientName: `${patient.user.firstName} ${patient.user.lastName}`,
          message: data.message
        },
        patientId: data.patientId,
        priority: data.priority
      })

      res.status(200).json({
        success: result.status === 'sent',
        messageId: result.id,
        status: result.status,
        twilioSid: result.twilioSid
      })
    } catch (error) {
      console.error('Custom message error:', error)
      res.status(500).json({ error: 'Failed to send custom message' })
    }
  }

  // ===== TEMPLATE MANAGEMENT =====

  async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.query
      
      let templates
      if (category && typeof category === 'string') {
        templates = await this.templateService.getTemplatesByCategory(category as any)
      } else {
        templates = await this.templateService.getAllTemplates()
      }

      res.status(200).json({ templates })
    } catch (error) {
      console.error('Get templates error:', error)
      res.status(500).json({ error: 'Failed to get templates' })
    }
  }

  async previewTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateType, variables = {} } = req.body
      
      const message = await this.templateService.getTemplate(templateType, variables)
      
      res.status(200).json({
        templateType,
        variables,
        message,
        characterCount: message.length
      })
    } catch (error) {
      console.error('Preview template error:', error)
      res.status(500).json({ error: 'Failed to preview template' })
    }
  }

  // ===== DELIVERY TRACKING =====

  async getMessageStatus(req: Request, res: Response): Promise<void> {
    try {
      const { messageId } = req.params
      
      const message = await this.prisma.sMSNotification.findUnique({
        where: { id: messageId },
        include: {
          patient: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  phoneNumber: true
                }
              }
            }
          },
          deliveryTracking: {
            orderBy: {
              trackedAt: 'desc'
            },
            take: 1
          }
        }
      })

      if (!message) {
        res.status(404).json({ error: 'Message not found' })
        return
      }

      res.status(200).json({
        id: message.id,
        templateType: message.templateType,
        message: message.message,
        status: message.status,
        deliveryStatus: message.deliveryStatus,
        priority: message.priority,
        sentAt: message.sentAt,
        deliveredAt: message.deliveredAt,
        error: message.error,
        retryCount: message.retryCount,
        patient: message.patient ? {
          name: `${message.patient.user.firstName} ${message.patient.user.lastName}`,
          phoneNumber: message.patient.user.phoneNumber
        } : null,
        tracking: message.deliveryTracking[0] || null
      })
    } catch (error) {
      console.error('Get message status error:', error)
      res.status(500).json({ error: 'Failed to get message status' })
    }
  }

  async getMessageHistory(req: Request, res: Response): Promise<void> {
    try {
      const { patientId } = req.params
      const { limit = 50, offset = 0 } = req.query
      
      const messages = await this.prisma.sMSNotification.findMany({
        where: { patientId },
        include: {
          deliveryTracking: {
            orderBy: {
              trackedAt: 'desc'
            },
            take: 1
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: Number(limit),
        skip: Number(offset)
      })

      const total = await this.prisma.sMSNotification.count({
        where: { patientId }
      })

      res.status(200).json({
        messages: messages.map(message => ({
          id: message.id,
          templateType: message.templateType,
          message: message.message,
          status: message.status,
          deliveryStatus: message.deliveryStatus,
          priority: message.priority,
          sentAt: message.sentAt,
          deliveredAt: message.deliveredAt,
          tracking: message.deliveryTracking[0] || null
        })),
        total,
        limit: Number(limit),
        offset: Number(offset)
      })
    } catch (error) {
      console.error('Get message history error:', error)
      res.status(500).json({ error: 'Failed to get message history' })
    }
  }

  // ===== PATIENT PREFERENCES =====

  async getPatientPreferences(req: Request, res: Response): Promise<void> {
    try {
      const { patientId } = req.params
      
      const preferences = await this.patientPreferences.getPreferences(patientId)
      
      res.status(200).json({ preferences })
    } catch (error) {
      console.error('Get preferences error:', error)
      res.status(500).json({ error: 'Failed to get patient preferences' })
    }
  }

  async updatePatientPreferences(req: Request, res: Response): Promise<void> {
    try {
      const { patientId } = req.params
      const data = updatePreferencesSchema.parse(req.body)
      
      await this.patientPreferences.updatePreferences(patientId, data)
      
      res.status(200).json({ success: true })
    } catch (error) {
      console.error('Update preferences error:', error)
      res.status(500).json({ error: 'Failed to update patient preferences' })
    }
  }

  async optOutPatient(req: Request, res: Response): Promise<void> {
    try {
      const { patientId } = req.params
      const { reason } = req.body
      
      await this.patientPreferences.optOutCompletely(patientId, reason)
      
      res.status(200).json({ success: true })
    } catch (error) {
      console.error('Opt out error:', error)
      res.status(500).json({ error: 'Failed to opt out patient' })
    }
  }

  // ===== REPORTING =====

  async getDeliveryReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query
      
      if (!startDate || !endDate) {
        res.status(400).json({ error: 'Start date and end date are required' })
        return
      }

      const start = new Date(startDate as string)
      const end = new Date(endDate as string)
      
      const report = await this.deliveryTracker.getDeliveryReport(start, end)
      
      res.status(200).json({ report })
    } catch (error) {
      console.error('Get delivery report error:', error)
      res.status(500).json({ error: 'Failed to get delivery report' })
    }
  }

  async getFailedMessages(req: Request, res: Response): Promise<void> {
    try {
      const { hours = 24 } = req.query
      
      const failedMessages = await this.deliveryTracker.getFailedMessages(Number(hours))
      
      res.status(200).json({
        failedMessages: failedMessages.map(message => ({
          id: message.id,
          templateType: message.templateType,
          phoneNumber: message.phoneNumber,
          error: message.error,
          retryCount: message.retryCount,
          createdAt: message.createdAt,
          patient: message.patient ? {
            name: `${message.patient.firstName} ${message.patient.lastName}`,
            email: message.patient.email
          } : null
        }))
      })
    } catch (error) {
      console.error('Get failed messages error:', error)
      res.status(500).json({ error: 'Failed to get failed messages' })
    }
  }

  // ===== WEBHOOK HANDLERS =====

  async handleTwilioWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { MessageSid, MessageStatus, ErrorMessage } = req.body
      
      if (!MessageSid || !MessageStatus) {
        res.status(400).json({ error: 'Invalid webhook payload' })
        return
      }

      await this.smsService.handleDeliveryWebhook(MessageSid, MessageStatus, ErrorMessage)
      
      res.status(200).json({ success: true })
    } catch (error) {
      console.error('Twilio webhook error:', error)
      res.status(500).json({ error: 'Failed to process webhook' })
    }
  }

  async handleOptOutKeyword(req: Request, res: Response): Promise<void> {
    try {
      const { From, Body } = req.body
      
      if (!From || !Body) {
        res.status(400).json({ error: 'Invalid SMS payload' })
        return
      }

      const processed = await this.patientPreferences.processOptOutKeyword(From, Body)
      
      if (processed) {
        // Send confirmation SMS
        res.status(200).type('text/xml').send(`
          <?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Message>You have been unsubscribed from Axis Imaging SMS notifications. To re-subscribe, please contact us on (03) 8746 4200.</Message>
          </Response>
        `)
      } else {
        res.status(200).type('text/xml').send(`
          <?xml version="1.0" encoding="UTF-8"?>
          <Response></Response>
        `)
      }
    } catch (error) {
      console.error('Opt-out keyword error:', error)
      res.status(500).json({ error: 'Failed to process opt-out' })
    }
  }
}