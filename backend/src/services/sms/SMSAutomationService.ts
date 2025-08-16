import { PrismaClient } from '@prisma/client'
import { SMSService } from './SMSService'
import { SMSTemplateService } from './SMSTemplateService'
import { addDays, addHours, subDays } from 'date-fns'

interface SMSConfig {
  accountSid: string
  authToken: string
  fromNumber: string
  webhookUrl?: string
  appBaseUrl: string
  registrationBaseUrl: string
}

export class SMSAutomationService {
  private prisma: PrismaClient
  private smsService: SMSService
  private templateService: SMSTemplateService
  private config: SMSConfig

  constructor(config: SMSConfig, prisma: PrismaClient) {
    this.config = config
    this.prisma = prisma
    this.smsService = new SMSService(config, prisma)
    this.templateService = new SMSTemplateService()
  }

  // ===== REPORT READINESS NOTIFICATIONS =====

  async handleReportStatusChange(reportId: string, newStatus: string, oldStatus: string): Promise<void> {
    if (newStatus === 'FINAL' && oldStatus !== 'FINAL') {
      await this.sendReportReadyNotification(reportId)
    }

    if (newStatus === 'PRELIMINARY' && oldStatus !== 'PRELIMINARY') {
      await this.sendPreliminaryReportNotification(reportId)
    }

    // Handle critical findings regardless of status
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        patient: {
          include: {
            user: true
          }
        },
        study: true
      }
    })

    if (report?.isCritical && !report.criticalNotifiedAt) {
      await this.sendCriticalFindingNotification(reportId)
    }
  }

  async sendReportReadyNotification(reportId: string): Promise<void> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        patient: {
          include: {
            user: true
          }
        },
        study: true
      }
    })

    if (!report || !report.patient) return

    // Determine specific template based on scan type
    const modality = report.study.modality
    let templateType = 'report_ready_general'
    
    switch (modality) {
      case 'XR':
      case 'DX':
        templateType = 'report_ready_xray'
        break
      case 'CT':
        templateType = 'report_ready_ct'
        break
      case 'US':
        templateType = 'report_ready_ultrasound'
        break
      case 'MR':
        templateType = 'report_ready_mri'
        break
      case 'MG':
        templateType = 'report_ready_mammogram'
        break
      default:
        templateType = 'report_ready_general'
    }

    const variables = this.templateService.generateReportReadyVariables(
      report.patient.user,
      report.study,
      this.config.appBaseUrl
    )

    await this.smsService.sendSMS({
      to: report.patient.user.phoneNumber,
      templateType,
      variables,
      patientId: report.patient.id,
      reportId: report.id,
      priority: 'normal'
    })

    // Send follow-up reminder to discuss with GP after 3 days
    await this.scheduleGPDiscussionReminder(report.patient.id, report.study.modality)
  }

  async sendPreliminaryReportNotification(reportId: string): Promise<void> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        patient: {
          include: {
            user: true
          }
        },
        study: true
      }
    })

    if (!report || !report.patient) return

    const variables = {
      patientName: `${report.patient.user.firstName} ${report.patient.user.lastName}`,
      scanType: this.templateService['formatScanType'](report.study.modality, report.study.studyDescription),
      contactNumber: '(03) 8746 4200'
    }

    await this.smsService.sendSMS({
      to: report.patient.user.phoneNumber,
      templateType: 'custom_message',
      variables: {
        ...variables,
        message: `Your preliminary ${variables.scanType} results are available. Your final report will be ready soon. Any urgent findings have been communicated to your GP.`
      },
      patientId: report.patient.id,
      reportId: report.id,
      priority: 'high'
    })
  }

  async sendCriticalFindingNotification(reportId: string): Promise<void> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        patient: {
          include: {
            user: true
          }
        },
        study: true
      }
    })

    if (!report || !report.patient) return

    const variables = {
      patientName: `${report.patient.user.firstName} ${report.patient.user.lastName}`,
      contactNumber: '(03) 8746 4200'
    }

    await this.smsService.sendSMS({
      to: report.patient.user.phoneNumber,
      templateType: 'urgent_review_required',
      variables,
      patientId: report.patient.id,
      reportId: report.id,
      priority: 'emergency'
    })

    // Mark as notified
    await this.prisma.report.update({
      where: { id: reportId },
      data: {
        criticalNotifiedAt: new Date(),
        criticalNotifiedBy: 'SMS Automation',
        criticalNotifiedTo: report.patient.user.phoneNumber
      }
    })
  }

  // ===== APPOINTMENT NOTIFICATIONS =====

  async handleAppointmentBooked(appointmentId: string): Promise<void> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          include: {
            user: true
          }
        }
      }
    })

    if (!appointment || !appointment.patient) return

    const variables = this.templateService.generateAppointmentVariables(
      appointment.patient.user,
      appointment
    )

    await this.smsService.sendSMS({
      to: appointment.patient.user.phoneNumber,
      templateType: 'appointment_confirmation',
      variables,
      patientId: appointment.patient.id,
      priority: 'normal'
    })

    // Schedule reminders
    await this.scheduleAppointmentReminders(appointmentId)
  }

  async scheduleAppointmentReminders(appointmentId: string): Promise<void> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          include: {
            user: true
          }
        }
      }
    })

    if (!appointment || !appointment.patient) return

    const appointmentDate = new Date(appointment.scheduledAt)
    const variables = this.templateService.generateAppointmentVariables(
      appointment.patient.user,
      appointment
    )

    // 24-hour reminder
    const reminder24h = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000)
    if (reminder24h > new Date()) {
      await this.smsService.sendSMS({
        to: appointment.patient.user.phoneNumber,
        templateType: 'appointment_reminder_24h',
        variables,
        patientId: appointment.patient.id,
        priority: 'normal',
        scheduledAt: reminder24h
      })
    }

    // 2-hour reminder
    const reminder2h = new Date(appointmentDate.getTime() - 2 * 60 * 60 * 1000)
    if (reminder2h > new Date()) {
      await this.smsService.sendSMS({
        to: appointment.patient.user.phoneNumber,
        templateType: 'appointment_reminder_2h',
        variables,
        patientId: appointment.patient.id,
        priority: 'high',
        scheduledAt: reminder2h
      })
    }
  }

  // ===== REGISTRATION & WELCOME NOTIFICATIONS =====

  async handleScanCompleted(studyId: string): Promise<void> {
    const study = await this.prisma.study.findUnique({
      where: { id: studyId },
      include: {
        patient: {
          include: {
            user: true
          }
        }
      }
    })

    if (!study || !study.patient) return

    // Check if patient has account access
    const user = study.patient.user
    if (!user.isVerified || !user.passwordHash) {
      // Send registration invitation
      await this.sendRegistrationInvitation(study.patient.id)
    } else {
      // Send scan completion notification
      await this.sendScanCompletionNotification(study.patient.id, study.modality)
    }
  }

  async sendRegistrationInvitation(patientId: string): Promise<void> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        user: true
      }
    })

    if (!patient) return

    const variables = this.templateService.generateRegistrationVariables(
      patient.user,
      this.config.registrationBaseUrl
    )

    await this.smsService.sendSMS({
      to: patient.user.phoneNumber,
      templateType: 'registration_invitation',
      variables,
      patientId: patient.id,
      priority: 'normal'
    })
  }

  async sendWelcomeMessage(patientId: string): Promise<void> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        user: true
      }
    })

    if (!patient) return

    const variables = {
      patientName: `${patient.user.firstName} ${patient.user.lastName}`,
      appLink: this.config.appBaseUrl,
      contactNumber: '(03) 8746 4200'
    }

    await this.smsService.sendSMS({
      to: patient.user.phoneNumber,
      templateType: 'welcome_new_patient',
      variables,
      patientId: patient.id,
      priority: 'normal'
    })
  }

  private async sendScanCompletionNotification(patientId: string, modality: string): Promise<void> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        user: true
      }
    })

    if (!patient) return

    const scanType = this.templateService['formatScanType'](modality)

    const variables = {
      patientName: `${patient.user.firstName} ${patient.user.lastName}`,
      scanType: scanType,
      message: `Your ${scanType} has been completed successfully. You'll receive another message when your report is ready.`,
      contactNumber: '(03) 8746 4200'
    }

    await this.smsService.sendSMS({
      to: patient.user.phoneNumber,
      templateType: 'custom_message',
      variables,
      patientId: patient.id,
      priority: 'normal'
    })
  }

  private async scheduleGPDiscussionReminder(patientId: string, modality: string): Promise<void> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        user: true
      }
    })

    if (!patient) return

    const scanType = this.templateService['formatScanType'](modality)
    const reminderDate = addDays(new Date(), 3)

    const variables = {
      patientName: `${patient.user.firstName} ${patient.user.lastName}`,
      scanType: scanType
    }

    await this.smsService.sendSMS({
      to: patient.user.phoneNumber,
      templateType: 'gp_discussion_reminder',
      variables,
      patientId: patient.id,
      priority: 'normal',
      scheduledAt: reminderDate
    })
  }

  // ===== BATCH PROCESSING =====

  async processScheduledMessages(): Promise<void> {
    await this.smsService.processScheduledMessages()
  }

  async retryFailedMessages(): Promise<void> {
    await this.smsService.retryFailedMessages()
  }

  // ===== REPORTING =====

  async generateDailyReport(date: Date): Promise<any> {
    const startDate = new Date(date)
    startDate.setHours(0, 0, 0, 0)
    
    const endDate = new Date(date)
    endDate.setHours(23, 59, 59, 999)

    const reportReadyMessages = await this.prisma.sMSNotification.count({
      where: {
        templateType: {
          startsWith: 'report_ready'
        },
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    const appointmentMessages = await this.prisma.sMSNotification.count({
      where: {
        templateType: {
          startsWith: 'appointment'
        },
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    const criticalMessages = await this.prisma.sMSNotification.count({
      where: {
        templateType: 'urgent_review_required',
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    const deliveryStats = await this.prisma.sMSNotification.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: {
        id: true
      }
    })

    return {
      date: date.toISOString().split('T')[0],
      messageCounts: {
        reportReady: reportReadyMessages,
        appointments: appointmentMessages,
        critical: criticalMessages
      },
      deliveryStats: deliveryStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.id
        return acc
      }, {} as Record<string, number>)
    }
  }
}