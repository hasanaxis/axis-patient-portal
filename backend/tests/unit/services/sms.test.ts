import { SMSAutomationService, SMSRequest } from '../../../src/services/sms/SMSAutomationService'
import { PrismaClient } from '@prisma/client'
import { TestDataFactory } from '../../factories'
import twilio from 'twilio'

// Mock dependencies
jest.mock('../../../src/lib/prisma')
jest.mock('twilio')

const mockPrisma = jest.mocked(require('../../../src/lib/prisma').default as PrismaClient)
const mockTwilio = {
  messages: {
    create: jest.fn()
  }
} as any

const mockTwilioConstructor = jest.mocked(twilio)
mockTwilioConstructor.mockReturnValue(mockTwilio)

describe('SMSAutomationService', () => {
  let smsService: SMSAutomationService

  beforeEach(() => {
    smsService = new SMSAutomationService()
    jest.clearAllMocks()
  })

  describe('sendSMS', () => {
    it('should successfully send SMS with template', async () => {
      // Arrange
      const patient = TestDataFactory.createPatient()
      const template = TestDataFactory.createSMSTemplate({
        templateType: 'APPOINTMENT_REMINDER',
        message: 'Hi {{patientName}}, your appointment is on {{appointmentDate}}'
      })

      mockPrisma.patient.findUnique.mockResolvedValue(patient)
      mockPrisma.sMSTemplate.findFirst.mockResolvedValue(template)
      mockPrisma.sMSLog.create.mockResolvedValue({
        id: 'sms-log-id',
        status: 'SENT'
      } as any)

      mockTwilio.messages.create.mockResolvedValue({
        sid: 'SM123456789',
        status: 'sent'
      })

      const smsRequest: SMSRequest = {
        to: '+61400000000',
        templateType: 'APPOINTMENT_REMINDER',
        variables: {
          patientName: patient.user.firstName,
          appointmentDate: '2024-01-15'
        },
        patientId: patient.id,
        priority: 'normal'
      }

      // Act
      const result = await smsService.sendSMS(smsRequest)

      // Assert
      expect(result.success).toBe(true)
      expect(result.messageId).toBe('SM123456789')
      expect(mockTwilio.messages.create).toHaveBeenCalledWith({
        body: `Hi ${patient.user.firstName}, your appointment is on 2024-01-15`,
        to: '+61400000000',
        from: process.env.TWILIO_PHONE_NUMBER
      })
      expect(mockPrisma.sMSLog.create).toHaveBeenCalled()
    })

    it('should send custom message without template', async () => {
      // Arrange
      const patient = TestDataFactory.createPatient()
      
      mockPrisma.patient.findUnique.mockResolvedValue(patient)
      mockPrisma.sMSLog.create.mockResolvedValue({
        id: 'sms-log-id',
        status: 'SENT'
      } as any)

      mockTwilio.messages.create.mockResolvedValue({
        sid: 'SM123456789',
        status: 'sent'
      })

      const smsRequest: SMSRequest = {
        to: '+61400000000',
        templateType: 'custom_message',
        variables: {
          message: 'Your test results are ready for collection.'
        },
        patientId: patient.id,
        priority: 'high'
      }

      // Act
      const result = await smsService.sendSMS(smsRequest)

      // Assert
      expect(result.success).toBe(true)
      expect(mockTwilio.messages.create).toHaveBeenCalledWith({
        body: 'Your test results are ready for collection.',
        to: '+61400000000',
        from: process.env.TWILIO_PHONE_NUMBER
      })
    })

    it('should handle Twilio errors', async () => {
      // Arrange
      const patient = TestDataFactory.createPatient()
      const template = TestDataFactory.createSMSTemplate()

      mockPrisma.patient.findUnique.mockResolvedValue(patient)
      mockPrisma.sMSTemplate.findFirst.mockResolvedValue(template)
      mockPrisma.sMSLog.create.mockResolvedValue({
        id: 'sms-log-id',
        status: 'FAILED'
      } as any)

      mockTwilio.messages.create.mockRejectedValue(new Error('Twilio error'))

      const smsRequest: SMSRequest = {
        to: '+61400000000',
        templateType: 'APPOINTMENT_REMINDER',
        variables: {},
        patientId: patient.id,
        priority: 'normal'
      }

      // Act
      const result = await smsService.sendSMS(smsRequest)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('Twilio error')
    })

    it('should validate Australian phone numbers', async () => {
      // Arrange
      const smsRequest: SMSRequest = {
        to: '1234567890', // Invalid format
        templateType: 'APPOINTMENT_REMINDER',
        variables: {},
        patientId: 'patient-id',
        priority: 'normal'
      }

      // Act
      const result = await smsService.sendSMS(smsRequest)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid phone number format')
    })
  })

  describe('scheduleAppointmentReminder', () => {
    it('should schedule appointment reminder SMS', async () => {
      // Arrange
      const appointment = TestDataFactory.createAppointment({
        appointmentDate: new Date('2024-01-15T10:00:00Z')
      })
      const patient = TestDataFactory.createPatient()

      mockPrisma.appointment.findUnique.mockResolvedValue({
        ...appointment,
        patient: {
          ...patient,
          user: patient.user
        }
      } as any)

      mockPrisma.sMSSchedule.create.mockResolvedValue({
        id: 'schedule-id'
      } as any)

      // Act
      const result = await smsService.scheduleAppointmentReminder(appointment.id)

      // Assert
      expect(result.success).toBe(true)
      expect(mockPrisma.sMSSchedule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          appointmentId: appointment.id,
          templateType: 'APPOINTMENT_REMINDER',
          scheduledFor: expect.any(Date), // 24 hours before appointment
          status: 'SCHEDULED'
        })
      })
    })

    it('should not schedule for past appointments', async () => {
      // Arrange
      const appointment = TestDataFactory.createAppointment({
        appointmentDate: new Date('2020-01-15T10:00:00Z') // Past date
      })

      mockPrisma.appointment.findUnique.mockResolvedValue({
        ...appointment,
        patient: TestDataFactory.createPatient()
      } as any)

      // Act
      const result = await smsService.scheduleAppointmentReminder(appointment.id)

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toContain('past appointment')
    })
  })

  describe('processScheduledSMS', () => {
    it('should process due scheduled messages', async () => {
      // Arrange
      const scheduledSMS = [
        {
          id: 'schedule-1',
          patientId: 'patient-1',
          templateType: 'APPOINTMENT_REMINDER',
          variables: { patientName: 'John', appointmentDate: '2024-01-15' },
          phoneNumber: '+61400000000',
          scheduledFor: new Date(),
          status: 'SCHEDULED'
        }
      ]

      mockPrisma.sMSSchedule.findMany.mockResolvedValue(scheduledSMS as any)
      mockPrisma.patient.findUnique.mockResolvedValue(TestDataFactory.createPatient())
      mockPrisma.sMSTemplate.findFirst.mockResolvedValue(TestDataFactory.createSMSTemplate())
      mockPrisma.sMSLog.create.mockResolvedValue({ id: 'log-id' } as any)
      mockPrisma.sMSSchedule.update.mockResolvedValue({} as any)

      mockTwilio.messages.create.mockResolvedValue({
        sid: 'SM123456789',
        status: 'sent'
      })

      // Act
      const result = await smsService.processScheduledSMS()

      // Assert
      expect(result.processed).toBe(1)
      expect(result.successful).toBe(1)
      expect(result.failed).toBe(0)
      expect(mockTwilio.messages.create).toHaveBeenCalled()
      expect(mockPrisma.sMSSchedule.update).toHaveBeenCalledWith({
        where: { id: 'schedule-1' },
        data: { status: 'SENT', sentAt: expect.any(Date) }
      })
    })
  })

  describe('getSMSHistory', () => {
    it('should return SMS history for patient', async () => {
      // Arrange
      const patientId = 'patient-id'
      const smsLogs = [
        {
          id: 'log-1',
          patientId,
          phoneNumber: '+61400000000',
          message: 'Test message',
          status: 'SENT',
          sentAt: new Date()
        }
      ]

      mockPrisma.sMSLog.findMany.mockResolvedValue(smsLogs as any)

      // Act
      const result = await smsService.getSMSHistory(patientId)

      // Assert
      expect(result).toEqual(smsLogs)
      expect(mockPrisma.sMSLog.findMany).toHaveBeenCalledWith({
        where: { patientId },
        orderBy: { sentAt: 'desc' },
        take: 50
      })
    })
  })

  describe('validatePhoneNumber', () => {
    it('should validate Australian mobile numbers', () => {
      const validNumbers = [
        '+61400000000',
        '+61 400 000 000',
        '0400000000',
        '0400 000 000'
      ]

      validNumbers.forEach(number => {
        expect(smsService.validatePhoneNumber(number)).toBe(true)
      })
    })

    it('should reject invalid phone numbers', () => {
      const invalidNumbers = [
        '1234567890',
        '+1400000000',
        '400000000',
        'not-a-number'
      ]

      invalidNumbers.forEach(number => {
        expect(smsService.validatePhoneNumber(number)).toBe(false)
      })
    })
  })

  describe('formatPhoneNumber', () => {
    it('should format Australian phone numbers correctly', () => {
      expect(smsService.formatPhoneNumber('0400000000')).toBe('+61400000000')
      expect(smsService.formatPhoneNumber('0400 000 000')).toBe('+61400000000')
      expect(smsService.formatPhoneNumber('+61400000000')).toBe('+61400000000')
    })
  })
})