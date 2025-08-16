import { Twilio } from 'twilio'
import { config } from '../config/config'

export class SimpleSMSService {
  private twilioClient: Twilio | null = null
  private isEnabled: boolean = false

  constructor() {
    try {
      if (config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN && config.TWILIO_PHONE_NUMBER) {
        this.twilioClient = new Twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN)
        this.isEnabled = true
        console.log('✅ SMS Service initialized with Twilio')
      } else {
        console.log('⚠️ SMS Service disabled - missing Twilio configuration')
      }
    } catch (error) {
      console.error('❌ Failed to initialize SMS Service:', error)
      this.isEnabled = false
    }
  }

  async sendWelcomeSMS(phoneNumber: string, firstName: string): Promise<boolean> {
    if (!this.isEnabled || !this.twilioClient) {
      console.log('SMS Service not enabled, skipping welcome SMS')
      return false
    }

    try {
      const message = `Welcome to Axis Imaging, ${firstName}! Your patient portal is now active. View your scan results and book appointments anytime. Need help? Call ${config.FACILITY_PHONE}`

      const result = await this.twilioClient.messages.create({
        body: message,
        from: config.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      })

      console.log(`✅ Welcome SMS sent to ${phoneNumber}, SID: ${result.sid}`)
      return true
    } catch (error) {
      console.error(`❌ Failed to send welcome SMS to ${phoneNumber}:`, error)
      return false
    }
  }

  async sendReportReadySMS(phoneNumber: string, firstName: string, studyDescription: string): Promise<boolean> {
    if (!this.isEnabled || !this.twilioClient) {
      console.log('SMS Service not enabled, skipping report ready SMS')
      return false
    }

    try {
      const message = `Hi ${firstName}, your ${studyDescription} report is ready to view in your Axis Imaging patient portal. Login at https://portal.axisimaging.com.au or use our mobile app.`

      const result = await this.twilioClient.messages.create({
        body: message,
        from: config.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      })

      console.log(`✅ Report ready SMS sent to ${phoneNumber}, SID: ${result.sid}`)
      return true
    } catch (error) {
      console.error(`❌ Failed to send report ready SMS to ${phoneNumber}:`, error)
      return false
    }
  }

  async sendAppointmentReminderSMS(phoneNumber: string, firstName: string, appointmentDate: string): Promise<boolean> {
    if (!this.isEnabled || !this.twilioClient) {
      console.log('SMS Service not enabled, skipping appointment reminder SMS')
      return false
    }

    try {
      const message = `Hi ${firstName}, reminder: You have an appointment at Axis Imaging on ${appointmentDate}. Please arrive 15 minutes early with your referral. Call ${config.FACILITY_PHONE} if you need to reschedule.`

      const result = await this.twilioClient.messages.create({
        body: message,
        from: config.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      })

      console.log(`✅ Appointment reminder SMS sent to ${phoneNumber}, SID: ${result.sid}`)
      return true
    } catch (error) {
      console.error(`❌ Failed to send appointment reminder SMS to ${phoneNumber}:`, error)
      return false
    }
  }

  async sendCriticalFindingSMS(phoneNumber: string, firstName: string): Promise<boolean> {
    if (!this.isEnabled || !this.twilioClient) {
      console.log('SMS Service not enabled, skipping critical finding SMS')
      return false
    }

    try {
      const message = `URGENT: ${firstName}, please contact your referring doctor immediately regarding your recent scan results from Axis Imaging. If this is an emergency, call 000.`

      const result = await this.twilioClient.messages.create({
        body: message,
        from: config.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      })

      console.log(`✅ Critical finding SMS sent to ${phoneNumber}, SID: ${result.sid}`)
      return true
    } catch (error) {
      console.error(`❌ Failed to send critical finding SMS to ${phoneNumber}:`, error)
      return false
    }
  }

  async testSMS(phoneNumber: string): Promise<boolean> {
    if (!this.isEnabled || !this.twilioClient) {
      console.log('SMS Service not enabled, cannot send test SMS')
      return false
    }

    try {
      const message = `Test message from Axis Imaging Patient Portal. SMS service is working correctly! 🏥`

      const result = await this.twilioClient.messages.create({
        body: message,
        from: config.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      })

      console.log(`✅ Test SMS sent to ${phoneNumber}, SID: ${result.sid}`)
      return true
    } catch (error) {
      console.error(`❌ Failed to send test SMS to ${phoneNumber}:`, error)
      return false
    }
  }

  isServiceEnabled(): boolean {
    return this.isEnabled
  }
}

// Create singleton instance
export const smsService = new SimpleSMSService()
export default smsService