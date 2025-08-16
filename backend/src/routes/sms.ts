import { Router } from 'express'
import { SMSController } from '../controllers/SMSController'
import { authenticateToken, requireRole } from '../middleware/auth'
import { validateRequest } from '../middleware/validation'

export function createSMSRoutes(smsController: SMSController): Router {
  const router = Router()

  // ===== MANUAL SMS SENDING (Staff Only) =====
  
  // Send single SMS
  router.post('/send',
    authenticateToken,
    requireRole(['ADMIN', 'CLERK', 'RADIOLOGIST']),
    smsController.sendSMS.bind(smsController)
  )

  // Send bulk SMS
  router.post('/send/bulk',
    authenticateToken,
    requireRole(['ADMIN', 'CLERK']),
    smsController.sendBulkSMS.bind(smsController)
  )

  // Send custom message
  router.post('/send/custom',
    authenticateToken,
    requireRole(['ADMIN', 'CLERK', 'RADIOLOGIST']),
    smsController.sendCustomMessage.bind(smsController)
  )

  // ===== TEMPLATE MANAGEMENT =====
  
  // Get all templates or by category
  router.get('/templates',
    authenticateToken,
    requireRole(['ADMIN', 'CLERK', 'RADIOLOGIST']),
    smsController.getTemplates.bind(smsController)
  )

  // Preview template with variables
  router.post('/templates/preview',
    authenticateToken,
    requireRole(['ADMIN', 'CLERK', 'RADIOLOGIST']),
    smsController.previewTemplate.bind(smsController)
  )

  // ===== DELIVERY TRACKING =====
  
  // Get specific message status
  router.get('/messages/:messageId/status',
    authenticateToken,
    requireRole(['ADMIN', 'CLERK', 'RADIOLOGIST']),
    smsController.getMessageStatus.bind(smsController)
  )

  // Get patient message history
  router.get('/patients/:patientId/messages',
    authenticateToken,
    requireRole(['ADMIN', 'CLERK', 'RADIOLOGIST']),
    smsController.getMessageHistory.bind(smsController)
  )

  // ===== PATIENT PREFERENCES =====
  
  // Get patient SMS preferences
  router.get('/patients/:patientId/preferences',
    authenticateToken,
    requireRole(['ADMIN', 'CLERK', 'PATIENT']),
    smsController.getPatientPreferences.bind(smsController)
  )

  // Update patient SMS preferences
  router.put('/patients/:patientId/preferences',
    authenticateToken,
    requireRole(['ADMIN', 'CLERK', 'PATIENT']),
    smsController.updatePatientPreferences.bind(smsController)
  )

  // Opt out patient completely
  router.post('/patients/:patientId/opt-out',
    authenticateToken,
    requireRole(['ADMIN', 'CLERK', 'PATIENT']),
    smsController.optOutPatient.bind(smsController)
  )

  // ===== REPORTING (Admin Only) =====
  
  // Get delivery report
  router.get('/reports/delivery',
    authenticateToken,
    requireRole(['ADMIN']),
    smsController.getDeliveryReport.bind(smsController)
  )

  // Get failed messages
  router.get('/reports/failed',
    authenticateToken,
    requireRole(['ADMIN']),
    smsController.getFailedMessages.bind(smsController)
  )

  // ===== WEBHOOK ENDPOINTS (No Auth) =====
  
  // Twilio delivery status webhook
  router.post('/webhook/twilio/status',
    smsController.handleTwilioWebhook.bind(smsController)
  )

  // Twilio incoming SMS (for opt-out keywords)
  router.post('/webhook/twilio/incoming',
    smsController.handleOptOutKeyword.bind(smsController)
  )

  return router
}

// ===== PATIENT PORTAL ROUTES =====
// These routes are for patient self-service

export function createPatientSMSRoutes(smsController: SMSController): Router {
  const router = Router()

  // Get own SMS preferences (patient only)
  router.get('/preferences',
    authenticateToken,
    requireRole(['PATIENT']),
    async (req, res) => {
      // Get patient ID from authenticated user
      const patient = await req.prisma.patient.findUnique({
        where: { userId: req.user.id }
      })
      
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' })
      }
      
      req.params.patientId = patient.id
      return smsController.getPatientPreferences(req, res)
    }
  )

  // Update own SMS preferences (patient only)
  router.put('/preferences',
    authenticateToken,
    requireRole(['PATIENT']),
    async (req, res) => {
      // Get patient ID from authenticated user
      const patient = await req.prisma.patient.findUnique({
        where: { userId: req.user.id }
      })
      
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' })
      }
      
      req.params.patientId = patient.id
      return smsController.updatePatientPreferences(req, res)
    }
  )

  // Opt out of SMS notifications (patient only)
  router.post('/opt-out',
    authenticateToken,
    requireRole(['PATIENT']),
    async (req, res) => {
      // Get patient ID from authenticated user
      const patient = await req.prisma.patient.findUnique({
        where: { userId: req.user.id }
      })
      
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' })
      }
      
      req.params.patientId = patient.id
      return smsController.optOutPatient(req, res)
    }
  )

  // Get own message history (patient only)
  router.get('/messages',
    authenticateToken,
    requireRole(['PATIENT']),
    async (req, res) => {
      // Get patient ID from authenticated user
      const patient = await req.prisma.patient.findUnique({
        where: { userId: req.user.id }
      })
      
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' })
      }
      
      req.params.patientId = patient.id
      return smsController.getMessageHistory(req, res)
    }
  )

  return router
}