import { PrismaClient } from '@prisma/client'

export interface SMSPreferences {
  patientId: string
  reportReadyNotifications: boolean
  appointmentReminders: boolean
  generalInformation: boolean
  emergencyNotifications: boolean
  optedOutAt?: Date
  optOutReason?: string
}

export class PatientPreferences {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async canSendSMS(patientId: string, templateType: string): Promise<boolean> {
    // Get patient's SMS preferences
    const preferences = await this.getPreferences(patientId)
    
    // Check global opt-out
    if (preferences.optedOutAt) {
      return false
    }

    // Check specific preference categories
    const category = this.getTemplateCategory(templateType)
    
    switch (category) {
      case 'emergency':
        return preferences.emergencyNotifications
      case 'report_ready':
        return preferences.reportReadyNotifications
      case 'appointment':
        return preferences.appointmentReminders
      case 'information':
      case 'registration':
        return preferences.generalInformation
      default:
        return false
    }
  }

  async getPreferences(patientId: string): Promise<SMSPreferences> {
    const dbPreferences = await this.prisma.patientSMSPreferences.findUnique({
      where: { patientId }
    })

    if (!dbPreferences) {
      // Create default preferences (all enabled except emergency)
      const defaultPreferences = await this.prisma.patientSMSPreferences.create({
        data: {
          patientId,
          reportReadyNotifications: true,
          appointmentReminders: true,
          generalInformation: true,
          emergencyNotifications: true // Default to true for emergency
        }
      })
      
      return {
        patientId,
        reportReadyNotifications: defaultPreferences.reportReadyNotifications,
        appointmentReminders: defaultPreferences.appointmentReminders,
        generalInformation: defaultPreferences.generalInformation,
        emergencyNotifications: defaultPreferences.emergencyNotifications,
        optedOutAt: defaultPreferences.optedOutAt || undefined,
        optOutReason: defaultPreferences.optOutReason || undefined
      }
    }

    return {
      patientId,
      reportReadyNotifications: dbPreferences.reportReadyNotifications,
      appointmentReminders: dbPreferences.appointmentReminders,
      generalInformation: dbPreferences.generalInformation,
      emergencyNotifications: dbPreferences.emergencyNotifications,
      optedOutAt: dbPreferences.optedOutAt || undefined,
      optOutReason: dbPreferences.optOutReason || undefined
    }
  }

  async updatePreferences(patientId: string, preferences: Partial<SMSPreferences>): Promise<void> {
    await this.prisma.patientSMSPreferences.upsert({
      where: { patientId },
      update: {
        reportReadyNotifications: preferences.reportReadyNotifications,
        appointmentReminders: preferences.appointmentReminders,
        generalInformation: preferences.generalInformation,
        emergencyNotifications: preferences.emergencyNotifications,
        updatedAt: new Date()
      },
      create: {
        patientId,
        reportReadyNotifications: preferences.reportReadyNotifications ?? true,
        appointmentReminders: preferences.appointmentReminders ?? true,
        generalInformation: preferences.generalInformation ?? true,
        emergencyNotifications: preferences.emergencyNotifications ?? true
      }
    })
  }

  async optOutCompletely(patientId: string, reason?: string): Promise<void> {
    await this.prisma.patientSMSPreferences.upsert({
      where: { patientId },
      update: {
        reportReadyNotifications: false,
        appointmentReminders: false,
        generalInformation: false,
        emergencyNotifications: false, // Even emergency notifications
        optedOutAt: new Date(),
        optOutReason: reason,
        updatedAt: new Date()
      },
      create: {
        patientId,
        reportReadyNotifications: false,
        appointmentReminders: false,
        generalInformation: false,
        emergencyNotifications: false,
        optedOutAt: new Date(),
        optOutReason: reason
      }
    })

    // Log the opt-out for audit purposes
    await this.prisma.sMSOptOut.create({
      data: {
        patientId,
        optOutDate: new Date(),
        reason: reason || 'Patient requested opt-out',
        method: 'manual'
      }
    })
  }

  async optIn(patientId: string): Promise<void> {
    await this.prisma.patientSMSPreferences.upsert({
      where: { patientId },
      update: {
        reportReadyNotifications: true,
        appointmentReminders: true,
        generalInformation: true,
        emergencyNotifications: true,
        optedOutAt: null,
        optOutReason: null,
        updatedAt: new Date()
      },
      create: {
        patientId,
        reportReadyNotifications: true,
        appointmentReminders: true,
        generalInformation: true,
        emergencyNotifications: true
      }
    })
  }

  async processOptOutKeyword(phoneNumber: string, message: string): Promise<boolean> {
    const optOutKeywords = ['STOP', 'UNSUBSCRIBE', 'OPT OUT', 'OPTOUT', 'QUIT', 'CANCEL']
    const normalizedMessage = message.trim().toUpperCase()
    
    if (optOutKeywords.includes(normalizedMessage)) {
      // Find patient by phone number
      const patient = await this.prisma.patient.findFirst({
        where: {
          OR: [
            { phone: phoneNumber },
            { phone: this.normalizePhoneNumber(phoneNumber) }
          ]
        }
      })

      if (patient) {
        await this.optOutCompletely(patient.id, 'SMS keyword opt-out')
        
        // Log the opt-out
        await this.prisma.sMSOptOut.create({
          data: {
            patientId: patient.id,
            optOutDate: new Date(),
            reason: `Keyword opt-out: ${message}`,
            method: 'sms_keyword',
            phoneNumber: phoneNumber
          }
        })
        
        return true
      }
    }
    
    return false
  }

  async getOptOutReport(startDate: Date, endDate: Date): Promise<any> {
    const optOuts = await this.prisma.sMSOptOut.findMany({
      where: {
        optOutDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        optOutDate: 'desc'
      }
    })

    const byMethod = await this.prisma.sMSOptOut.groupBy({
      by: ['method'],
      where: {
        optOutDate: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: {
        id: true
      }
    })

    const byReason = await this.prisma.sMSOptOut.groupBy({
      by: ['reason'],
      where: {
        optOutDate: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: {
        id: true
      }
    })

    return {
      period: { startDate, endDate },
      totalOptOuts: optOuts.length,
      optOuts: optOuts,
      byMethod: byMethod.map(item => ({
        method: item.method,
        count: item._count.id
      })),
      byReason: byReason.map(item => ({
        reason: item.reason,
        count: item._count.id
      }))
    }
  }

  private getTemplateCategory(templateType: string): string {
    const categoryMap: Record<string, string> = {
      'report_ready_general': 'report_ready',
      'report_ready_xray': 'report_ready',
      'report_ready_ct': 'report_ready',
      'report_ready_ultrasound': 'report_ready',
      'report_ready_mri': 'report_ready',
      'report_ready_mammogram': 'report_ready',
      'urgent_review_required': 'emergency',
      'registration_invitation': 'registration',
      'welcome_new_patient': 'registration',
      'appointment_confirmation': 'appointment',
      'appointment_reminder_24h': 'appointment',
      'appointment_reminder_2h': 'appointment',
      'preparation_instructions_ct': 'information',
      'preparation_instructions_ultrasound': 'information',
      'contact_information': 'information',
      'gp_discussion_reminder': 'information',
      'custom_message': 'information'
    }

    return categoryMap[templateType] || 'information'
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '')
    
    // Convert to standard Australian format
    if (digits.length === 10 && digits.startsWith('0')) {
      return `+61${digits.substring(1)}`
    } else if (digits.length === 9 && !digits.startsWith('0')) {
      return `+61${digits}`
    } else if (digits.length === 12 && digits.startsWith('61')) {
      return `+${digits}`
    }
    
    return phoneNumber // Return original if can't normalize
  }

  // Cleanup old opt-out records
  async cleanupOldOptOuts(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    
    const result = await this.prisma.sMSOptOut.deleteMany({
      where: {
        optOutDate: {
          lt: cutoffDate
        }
      }
    })

    return result.count
  }
}