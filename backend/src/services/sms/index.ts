import { PrismaClient } from '@prisma/client'
import { SMSService } from './SMSService'
import { SMSAutomationService } from './SMSAutomationService'
import { SMSController } from '../../controllers/SMSController'
import { SMSJobScheduler } from '../../jobs/SMSJobScheduler'
import { getSMSConfig, validateSMSConfig } from '../../config/sms'

export interface SMSServiceContainer {
  service: SMSService
  automation: SMSAutomationService
  controller: SMSController
  scheduler: SMSJobScheduler
  config: ReturnType<typeof getSMSConfig>
}

/**
 * Initialize the complete SMS service stack
 */
export async function initializeSMSServices(prisma: PrismaClient): Promise<SMSServiceContainer> {
  console.log('Initializing SMS services...')
  
  // Load and validate configuration
  const config = getSMSConfig()
  const validation = validateSMSConfig(config)
  
  if (!validation.valid) {
    console.error('SMS configuration validation failed:')
    validation.errors.forEach(error => console.error(`  - ${error}`))
    throw new Error('Invalid SMS configuration')
  }
  
  console.log('✓ SMS configuration validated')
  
  // Initialize core services
  const smsService = new SMSService({
    accountSid: config.twilio.accountSid,
    authToken: config.twilio.authToken,
    fromNumber: config.twilio.fromNumber,
    webhookUrl: config.twilio.webhookUrl,
    appBaseUrl: config.urls.appBaseUrl,
    registrationBaseUrl: config.urls.registrationBaseUrl
  }, prisma)
  
  const automationService = new SMSAutomationService({
    accountSid: config.twilio.accountSid,
    authToken: config.twilio.authToken,
    fromNumber: config.twilio.fromNumber,
    webhookUrl: config.twilio.webhookUrl,
    appBaseUrl: config.urls.appBaseUrl,
    registrationBaseUrl: config.urls.registrationBaseUrl
  }, prisma)
  
  const controller = new SMSController(prisma, smsService, automationService)
  const scheduler = new SMSJobScheduler(prisma, automationService)
  
  console.log('✓ SMS services initialized')
  
  return {
    service: smsService,
    automation: automationService,
    controller,
    scheduler,
    config
  }
}

/**
 * Start SMS automation and scheduled jobs
 */
export async function startSMSAutomation(container: SMSServiceContainer): Promise<void> {
  console.log('Starting SMS automation...')
  
  // Start the job scheduler
  container.scheduler.start()
  
  console.log('✓ SMS automation started')
}

/**
 * Stop SMS automation and scheduled jobs
 */
export async function stopSMSAutomation(container: SMSServiceContainer): Promise<void> {
  console.log('Stopping SMS automation...')
  
  // Stop the job scheduler
  container.scheduler.stop()
  
  console.log('✓ SMS automation stopped')
}

/**
 * Health check for SMS services
 */
export async function healthCheckSMS(container: SMSServiceContainer): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  checks: Record<string, { status: 'pass' | 'fail'; message?: string }>
}> {
  const checks: Record<string, { status: 'pass' | 'fail'; message?: string }> = {}
  
  // Check Twilio connectivity
  try {
    // This is a simple check - in production you might want to use Twilio's API
    if (!container.config.twilio.accountSid || !container.config.twilio.authToken) {
      checks.twilio = { status: 'fail', message: 'Missing Twilio credentials' }
    } else {
      checks.twilio = { status: 'pass' }
    }
  } catch (error) {
    checks.twilio = { status: 'fail', message: error instanceof Error ? error.message : 'Unknown error' }
  }
  
  // Check database connectivity for SMS tables
  try {
    await container.service['prisma'].sMSNotification.count({ take: 1 })
    checks.database = { status: 'pass' }
  } catch (error) {
    checks.database = { status: 'fail', message: 'Cannot access SMS tables' }
  }
  
  // Check job scheduler status
  const jobStatus = container.scheduler.getJobStatus()
  const runningJobs = jobStatus.filter(job => job.running).length
  const totalJobs = jobStatus.filter(job => job.config.enabled).length
  
  if (runningJobs === totalJobs) {
    checks.scheduler = { status: 'pass', message: `${runningJobs}/${totalJobs} jobs running` }
  } else {
    checks.scheduler = { status: 'fail', message: `Only ${runningJobs}/${totalJobs} jobs running` }
  }
  
  // Check recent delivery success rate
  try {
    const recentMessages = await container.service['prisma'].sMSNotification.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      select: {
        status: true
      }
    })
    
    if (recentMessages.length === 0) {
      checks.delivery = { status: 'pass', message: 'No recent messages to analyze' }
    } else {
      const successfulMessages = recentMessages.filter(m => m.status === 'sent' || m.status === 'delivered').length
      const successRate = (successfulMessages / recentMessages.length) * 100
      
      if (successRate >= 90) {
        checks.delivery = { status: 'pass', message: `${successRate.toFixed(1)}% success rate` }
      } else {
        checks.delivery = { status: 'fail', message: `Low success rate: ${successRate.toFixed(1)}%` }
      }
    }
  } catch (error) {
    checks.delivery = { status: 'fail', message: 'Cannot check delivery status' }
  }
  
  // Determine overall status
  const failedChecks = Object.values(checks).filter(check => check.status === 'fail').length
  let status: 'healthy' | 'degraded' | 'unhealthy'
  
  if (failedChecks === 0) {
    status = 'healthy'
  } else if (failedChecks <= 1) {
    status = 'degraded'
  } else {
    status = 'unhealthy'
  }
  
  return { status, checks }
}

// Export all SMS services for use in other parts of the application
export {
  SMSService,
  SMSAutomationService,
  SMSController,
  SMSJobScheduler
}

export * from './SMSTemplateService'
export * from './SMSDeliveryTracker'
export * from './PatientPreferences'