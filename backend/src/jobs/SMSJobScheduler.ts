import cron from 'node-cron'
import { PrismaClient } from '@prisma/client'
import { SMSAutomationService } from '../services/sms/SMSAutomationService'
import { SMSService } from '../services/sms/SMSService'
import { SMSDeliveryTracker } from '../services/sms/SMSDeliveryTracker'
import { PatientPreferences } from '../services/sms/PatientPreferences'
import { addHours, subDays } from 'date-fns'

interface JobConfig {
  enabled: boolean
  schedule: string
  description: string
}

interface SMSJobConfig {
  processScheduledMessages: JobConfig
  retryFailedMessages: JobConfig
  generateDailyReports: JobConfig
  cleanupOldData: JobConfig
  sendAppointmentReminders: JobConfig
  checkCriticalFindings: JobConfig
}

export class SMSJobScheduler {
  private prisma: PrismaClient
  private automationService: SMSAutomationService
  private deliveryTracker: SMSDeliveryTracker
  private patientPreferences: PatientPreferences
  private jobs: Map<string, cron.ScheduledTask> = new Map()
  private config: SMSJobConfig

  constructor(
    prisma: PrismaClient,
    automationService: SMSAutomationService
  ) {
    this.prisma = prisma
    this.automationService = automationService
    this.deliveryTracker = new SMSDeliveryTracker(prisma)
    this.patientPreferences = new PatientPreferences(prisma)
    
    // Default job configuration
    this.config = {
      processScheduledMessages: {
        enabled: true,
        schedule: '*/5 * * * *', // Every 5 minutes
        description: 'Process scheduled SMS messages'
      },
      retryFailedMessages: {
        enabled: true,
        schedule: '0 */6 * * *', // Every 6 hours
        description: 'Retry failed SMS messages'
      },
      generateDailyReports: {
        enabled: true,
        schedule: '0 1 * * *', // 1 AM daily
        description: 'Generate daily SMS reports'
      },
      cleanupOldData: {
        enabled: true,
        schedule: '0 2 * * 0', // 2 AM on Sundays
        description: 'Cleanup old SMS data'
      },
      sendAppointmentReminders: {
        enabled: true,
        schedule: '0 8,14,20 * * *', // 8 AM, 2 PM, 8 PM daily
        description: 'Send appointment reminders'
      },
      checkCriticalFindings: {
        enabled: true,
        schedule: '*/15 * * * *', // Every 15 minutes
        description: 'Check for critical findings requiring immediate notification'
      }
    }
  }

  start(): void {
    console.log('Starting SMS job scheduler...')
    
    // Process scheduled messages
    if (this.config.processScheduledMessages.enabled) {
      const task = cron.schedule(
        this.config.processScheduledMessages.schedule,
        () => this.processScheduledMessages(),
        { scheduled: false }
      )
      this.jobs.set('processScheduledMessages', task)
      task.start()
      console.log('✓ Scheduled: Process scheduled messages')
    }

    // Retry failed messages
    if (this.config.retryFailedMessages.enabled) {
      const task = cron.schedule(
        this.config.retryFailedMessages.schedule,
        () => this.retryFailedMessages(),
        { scheduled: false }
      )
      this.jobs.set('retryFailedMessages', task)
      task.start()
      console.log('✓ Scheduled: Retry failed messages')
    }

    // Generate daily reports
    if (this.config.generateDailyReports.enabled) {
      const task = cron.schedule(
        this.config.generateDailyReports.schedule,
        () => this.generateDailyReports(),
        { scheduled: false }
      )
      this.jobs.set('generateDailyReports', task)
      task.start()
      console.log('✓ Scheduled: Generate daily reports')
    }

    // Cleanup old data
    if (this.config.cleanupOldData.enabled) {
      const task = cron.schedule(
        this.config.cleanupOldData.schedule,
        () => this.cleanupOldData(),
        { scheduled: false }
      )
      this.jobs.set('cleanupOldData', task)
      task.start()
      console.log('✓ Scheduled: Cleanup old data')
    }

    // Send appointment reminders
    if (this.config.sendAppointmentReminders.enabled) {
      const task = cron.schedule(
        this.config.sendAppointmentReminders.schedule,
        () => this.sendAppointmentReminders(),
        { scheduled: false }
      )
      this.jobs.set('sendAppointmentReminders', task)
      task.start()
      console.log('✓ Scheduled: Send appointment reminders')
    }

    // Check critical findings
    if (this.config.checkCriticalFindings.enabled) {
      const task = cron.schedule(
        this.config.checkCriticalFindings.schedule,
        () => this.checkCriticalFindings(),
        { scheduled: false }
      )
      this.jobs.set('checkCriticalFindings', task)
      task.start()
      console.log('✓ Scheduled: Check critical findings')
    }

    console.log(`SMS job scheduler started with ${this.jobs.size} active jobs`)
  }

  stop(): void {
    console.log('Stopping SMS job scheduler...')
    
    this.jobs.forEach((task, name) => {
      task.stop()
      console.log(`✓ Stopped: ${name}`)
    })
    
    this.jobs.clear()
    console.log('SMS job scheduler stopped')
  }

  // ===== JOB IMPLEMENTATIONS =====

  private async processScheduledMessages(): Promise<void> {
    try {
      console.log('Processing scheduled SMS messages...')
      await this.automationService.processScheduledMessages()
      console.log('✓ Scheduled messages processed')
    } catch (error) {
      console.error('Error processing scheduled messages:', error)
    }
  }

  private async retryFailedMessages(): Promise<void> {
    try {
      console.log('Retrying failed SMS messages...')
      await this.automationService.retryFailedMessages()
      console.log('✓ Failed messages retry completed')
    } catch (error) {
      console.error('Error retrying failed messages:', error)
    }
  }

  private async generateDailyReports(): Promise<void> {
    try {
      console.log('Generating daily SMS reports...')
      
      const yesterday = subDays(new Date(), 1)
      const report = await this.automationService.generateDailyReport(yesterday)
      
      // Store report in database
      await this.prisma.systemSetting.upsert({
        where: { key: `sms_daily_report_${report.date}` },
        update: { value: report },
        create: {
          key: `sms_daily_report_${report.date}`,
          value: report,
          dataType: 'JSON',
          name: `SMS Daily Report - ${report.date}`,
          description: 'Daily SMS delivery and engagement report',
          category: 'SMS_REPORTS'
        }
      })
      
      console.log(`✓ Daily report generated for ${report.date}`)
    } catch (error) {
      console.error('Error generating daily reports:', error)
    }
  }

  private async cleanupOldData(): Promise<void> {
    try {
      console.log('Cleaning up old SMS data...')
      
      // Cleanup old delivery tracking (90 days)
      const trackingDeleted = await this.deliveryTracker.cleanupOldTrackingData(90)
      
      // Cleanup old opt-out records (1 year)
      const optOutsDeleted = await this.patientPreferences.cleanupOldOptOuts(365)
      
      // Cleanup old SMS notifications (1 year, keep only metadata)
      const oneYearAgo = subDays(new Date(), 365)
      const oldMessages = await this.prisma.sMSNotification.updateMany({
        where: {
          createdAt: {
            lt: oneYearAgo
          },
          message: {
            not: ''
          }
        },
        data: {
          message: '[Archived - content removed for privacy]',
          variables: null
        }
      })
      
      console.log(`✓ Cleanup completed:`, {
        trackingRecords: trackingDeleted,
        optOutRecords: optOutsDeleted,
        archivedMessages: oldMessages.count
      })
    } catch (error) {
      console.error('Error cleaning up old data:', error)
    }
  }

  private async sendAppointmentReminders(): Promise<void> {
    try {
      console.log('Sending appointment reminders...')
      
      // Check for appointments in the next 24-26 hours
      const tomorrow = addHours(new Date(), 24)
      const dayAfterTomorrow = addHours(new Date(), 26)
      
      const upcomingAppointments = await this.prisma.appointment.findMany({
        where: {
          scheduledAt: {
            gte: tomorrow,
            lte: dayAfterTomorrow
          },
          status: {
            in: ['SCHEDULED', 'CONFIRMED']
          },
          reminderSent: false
        },
        include: {
          patient: {
            include: {
              user: true
            }
          }
        }
      })
      
      let remindersSent = 0
      
      for (const appointment of upcomingAppointments) {
        try {
          await this.automationService.scheduleAppointmentReminders(appointment.id)
          
          // Mark reminder as sent
          await this.prisma.appointment.update({
            where: { id: appointment.id },
            data: { reminderSent: true }
          })
          
          remindersSent++
        } catch (error) {
          console.error(`Failed to send reminder for appointment ${appointment.id}:`, error)
        }
      }
      
      console.log(`✓ Sent ${remindersSent} appointment reminders`)
    } catch (error) {
      console.error('Error sending appointment reminders:', error)
    }
  }

  private async checkCriticalFindings(): Promise<void> {
    try {
      console.log('Checking for critical findings...')
      
      // Find reports with critical findings that haven't been notified
      const criticalReports = await this.prisma.report.findMany({
        where: {
          isCritical: true,
          criticalNotifiedAt: null,
          status: {
            in: ['PRELIMINARY', 'FINAL']
          }
        },
        include: {
          patient: {
            include: {
              user: true
            }
          },
          study: true
        }
      })
      
      let notificationsSent = 0
      
      for (const report of criticalReports) {
        try {
          await this.automationService.sendCriticalFindingNotification(report.id)
          notificationsSent++
        } catch (error) {
          console.error(`Failed to send critical finding notification for report ${report.id}:`, error)
        }
      }
      
      if (notificationsSent > 0) {
        console.log(`✓ Sent ${notificationsSent} critical finding notifications`)
      }
    } catch (error) {
      console.error('Error checking critical findings:', error)
    }
  }

  // ===== MANUAL JOB TRIGGERS =====

  async runJob(jobName: string): Promise<void> {
    console.log(`Manually running job: ${jobName}`)
    
    switch (jobName) {
      case 'processScheduledMessages':
        await this.processScheduledMessages()
        break
      case 'retryFailedMessages':
        await this.retryFailedMessages()
        break
      case 'generateDailyReports':
        await this.generateDailyReports()
        break
      case 'cleanupOldData':
        await this.cleanupOldData()
        break
      case 'sendAppointmentReminders':
        await this.sendAppointmentReminders()
        break
      case 'checkCriticalFindings':
        await this.checkCriticalFindings()
        break
      default:
        throw new Error(`Unknown job: ${jobName}`)
    }
  }

  // ===== JOB STATUS =====

  getJobStatus(): Array<{ name: string; running: boolean; config: JobConfig }> {
    return Object.entries(this.config).map(([name, config]) => ({
      name,
      running: this.jobs.has(name) && this.jobs.get(name)!.getStatus() === 'scheduled',
      config
    }))
  }

  updateJobConfig(jobName: string, config: Partial<JobConfig>): void {
    if (!(jobName in this.config)) {
      throw new Error(`Unknown job: ${jobName}`)
    }
    
    // Update config
    this.config[jobName as keyof SMSJobConfig] = {
      ...this.config[jobName as keyof SMSJobConfig],
      ...config
    }
    
    // Restart job if it's running
    if (this.jobs.has(jobName)) {
      const task = this.jobs.get(jobName)!
      task.stop()
      this.jobs.delete(jobName)
      
      if (config.enabled !== false) {
        // Restart with new config
        this.start()
      }
    }
  }
}