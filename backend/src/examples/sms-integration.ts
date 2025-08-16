/**
 * AXIS IMAGING SMS NOTIFICATION SYSTEM
 * 
 * Complete SMS notification system for Australian healthcare provider
 * Focus: Report readiness notifications and patient engagement
 * 
 * Features:
 * - Report readiness notifications with scan-specific templates
 * - Appointment reminders and confirmations
 * - Patient registration invitations
 * - Critical finding alerts with emergency override
 * - Australian phone number formatting and validation
 * - Business hours delivery with scheduling
 * - Patient opt-out management with keyword support
 * - Comprehensive delivery tracking and retry logic
 * - GDPR/Australian Privacy Act compliance
 * 
 * Usage Examples:
 */

import { PrismaClient } from '@prisma/client'
import { initializeSMSServices, startSMSAutomation } from '../services/sms'

// Initialize the SMS system
async function setupSMSSystem() {
  const prisma = new PrismaClient()
  
  // Initialize all SMS services
  const smsContainer = await initializeSMSServices(prisma)
  
  // Start automation and scheduled jobs
  await startSMSAutomation(smsContainer)
  
  return smsContainer
}

// Example 1: Manual report ready notification
async function sendReportReadyNotification() {
  const smsContainer = await setupSMSSystem()
  
  // Send X-ray report ready notification
  const result = await smsContainer.service.sendSMS({
    to: '+61412345678',
    templateType: 'report_ready_xray',
    variables: {
      patientName: 'John Smith',
      appLink: 'https://app.axisimaging.com.au/scan/abc123?token=xyz789'
    },
    patientId: 'patient-uuid-here',
    reportId: 'report-uuid-here',
    priority: 'normal'
  })
  
  console.log('SMS sent:', result)
  // Output: { id: 'sms-uuid', status: 'sent', twilioSid: 'SM...' }
}

// Example 2: Automated report status change handler
async function handleReportStatusChange(reportId: string) {
  const smsContainer = await setupSMSSystem()
  
  // This would typically be called from a Prisma middleware or API endpoint
  await smsContainer.automation.handleReportStatusChange(
    reportId,
    'FINAL',   // new status
    'PENDING'  // old status
  )
  
  console.log('Automated notification sent for report:', reportId)
}

// Example 3: Appointment booking confirmation
async function sendAppointmentConfirmation(appointmentId: string) {
  const smsContainer = await setupSMSSystem()
  
  // Automatically sends confirmation and schedules reminders
  await smsContainer.automation.handleAppointmentBooked(appointmentId)
  
  console.log('Appointment confirmation and reminders scheduled')
}

// Example 4: Critical finding emergency notification
async function sendCriticalFindingAlert(reportId: string) {
  const smsContainer = await setupSMSSystem()
  
  // Emergency notification bypasses business hours and opt-out (for critical findings)
  await smsContainer.service.sendSMS({
    to: '+61412345678',
    templateType: 'urgent_review_required',
    variables: {
      patientName: 'Jane Doe',
      contactNumber: '(03) 8746 4200'
    },
    patientId: 'patient-uuid-here',
    reportId: reportId,
    priority: 'emergency' // Bypasses business hours
  })
  
  console.log('Critical finding notification sent')
}

// Example 5: Bulk appointment reminders
async function sendBulkAppointmentReminders() {
  const smsContainer = await setupSMSSystem()
  
  const patientIds = ['patient-1', 'patient-2', 'patient-3']
  
  // Send bulk SMS to multiple patients
  const results = await Promise.allSettled(
    patientIds.map(patientId =>
      smsContainer.service.sendSMS({
        to: '+61412345678', // Would be fetched from patient record
        templateType: 'appointment_reminder_24h',
        variables: {
          patientName: 'Patient Name',
          appointmentDate: 'Monday, 15th January 2024',
          appointmentTime: '2:30 PM',
          preparationInstructions: 'Please fast for 4 hours before your appointment.'
        },
        patientId: patientId,
        priority: 'normal'
      })
    )
  )
  
  console.log('Bulk reminders sent:', results)
}

// Example 6: Patient preference management
async function managePatientPreferences(patientId: string) {
  const smsContainer = await setupSMSSystem()
  const preferences = smsContainer.service['patientPreferences']
  
  // Get current preferences
  const current = await preferences.getPreferences(patientId)
  console.log('Current preferences:', current)
  
  // Update preferences
  await preferences.updatePreferences(patientId, {
    reportReadyNotifications: true,
    appointmentReminders: true,
    generalInformation: false,
    emergencyNotifications: true
  })
  
  console.log('Preferences updated')
}

// Example 7: Handle patient opt-out
async function handlePatientOptOut(patientId: string) {
  const smsContainer = await setupSMSSystem()
  const preferences = smsContainer.service['patientPreferences']
  
  // Complete opt-out
  await preferences.optOutCompletely(patientId, 'Patient requested via phone call')
  
  console.log('Patient opted out of all SMS notifications')
}

// Example 8: Custom message for staff
async function sendCustomStaffMessage(patientId: string, message: string) {
  const smsContainer = await setupSMSSystem()
  
  await smsContainer.service.sendSMS({
    to: '+61412345678',
    templateType: 'custom_message',
    variables: {
      patientName: 'Patient Name',
      message: message
    },
    patientId: patientId,
    priority: 'normal'
  })
  
  console.log('Custom message sent')
}

// Example 9: Delivery tracking and reporting
async function checkDeliveryStatus(messageId: string) {
  const smsContainer = await setupSMSSystem()
  const tracker = smsContainer.service['deliveryTracker']
  
  // Get delivery status
  const status = await tracker.getDeliveryStatus(messageId)
  console.log('Delivery status:', status)
  
  // Get delivery report for last week
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const report = await tracker.getDeliveryReport(weekAgo, new Date())
  console.log('Weekly delivery report:', report)
}

// Example 10: Integration with Prisma middleware for automatic triggers
function setupPrismaMiddleware(prisma: PrismaClient, smsContainer: any) {
  // Automatically send notifications when report status changes
  prisma.$use(async (params, next) => {
    const result = await next(params)
    
    // Check for report status changes
    if (params.model === 'Report' && params.action === 'update') {
      const reportId = params.where?.id
      const newStatus = params.data?.status
      
      if (reportId && newStatus) {
        // Get old status
        const oldReport = await prisma.report.findUnique({
          where: { id: reportId },
          select: { status: true }
        })
        
        if (oldReport && oldReport.status !== newStatus) {
          // Trigger SMS automation
          await smsContainer.automation.handleReportStatusChange(
            reportId,
            newStatus,
            oldReport.status
          )
        }
      }
    }
    
    // Check for appointment bookings
    if (params.model === 'Appointment' && params.action === 'create') {
      const appointmentId = result.id
      await smsContainer.automation.handleAppointmentBooked(appointmentId)
    }
    
    // Check for study completion
    if (params.model === 'Study' && params.action === 'update') {
      const studyId = params.where?.id
      const newStatus = params.data?.status
      
      if (studyId && newStatus === 'COMPLETED') {
        await smsContainer.automation.handleScanCompleted(studyId)
      }
    }
    
    return result
  })
}

// Example 11: Express.js integration
import express from 'express'
import { createSMSRoutes, createPatientSMSRoutes } from '../routes/sms'

function setupExpressRoutes(app: express.Application, smsContainer: any) {
  // Staff SMS management routes
  app.use('/api/admin/sms', createSMSRoutes(smsContainer.controller))
  
  // Patient SMS preference routes
  app.use('/api/patient/sms', createPatientSMSRoutes(smsContainer.controller))
  
  // Health check endpoint
  app.get('/api/health/sms', async (req, res) => {
    const health = await smsContainer.service.healthCheckSMS(smsContainer)
    res.status(health.status === 'healthy' ? 200 : 503).json(health)
  })
}

// Example 12: Environment-specific configuration
function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development'
  
  switch (env) {
    case 'development':
      return {
        twilioFromNumber: '+15005550006', // Twilio magic number for testing
        enableScheduledJobs: false,
        enableActualSending: false,
        logLevel: 'debug'
      }
      
    case 'staging':
      return {
        twilioFromNumber: process.env.TWILIO_FROM_NUMBER,
        enableScheduledJobs: true,
        enableActualSending: true,
        logLevel: 'info'
      }
      
    case 'production':
      return {
        twilioFromNumber: process.env.TWILIO_FROM_NUMBER,
        enableScheduledJobs: true,
        enableActualSending: true,
        logLevel: 'warn'
      }
      
    default:
      throw new Error(`Unknown environment: ${env}`)
  }
}

// Example 13: Complete application setup
async function startAxisImagingSMSSystem() {
  console.log('🏥 Starting Axis Imaging SMS System...')
  
  try {
    // Initialize database
    const prisma = new PrismaClient()
    
    // Initialize SMS services
    const smsContainer = await initializeSMSServices(prisma)
    
    // Setup Prisma middleware for automatic triggers
    setupPrismaMiddleware(prisma, smsContainer)
    
    // Start automation
    await startSMSAutomation(smsContainer)
    
    // Setup Express.js routes (if using Express)
    const app = express()
    setupExpressRoutes(app, smsContainer)
    
    console.log('✅ Axis Imaging SMS System started successfully')
    console.log('📱 Features enabled:')
    console.log('   - Report readiness notifications')
    console.log('   - Appointment reminders')
    console.log('   - Critical finding alerts')
    console.log('   - Patient preference management')
    console.log('   - Australian phone number support')
    console.log('   - Business hours delivery')
    console.log('   - Comprehensive delivery tracking')
    console.log('   - GDPR compliance features')
    
    return smsContainer
    
  } catch (error) {
    console.error('❌ Failed to start SMS system:', error)
    throw error
  }
}

// Example 14: Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down SMS system...')
  // Stop SMS automation if running
  // await stopSMSAutomation(smsContainer)
  process.exit(0)
})

export {
  setupSMSSystem,
  sendReportReadyNotification,
  handleReportStatusChange,
  sendAppointmentConfirmation,
  sendCriticalFindingAlert,
  sendBulkAppointmentReminders,
  managePatientPreferences,
  handlePatientOptOut,
  sendCustomStaffMessage,
  checkDeliveryStatus,
  startAxisImagingSMSSystem
}