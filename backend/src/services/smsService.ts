import twilio from 'twilio';
import { config } from '../config/config';
import { logger, healthcareLogger } from '../utils/logger';

// Initialize Twilio client
const client = config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN 
  ? twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN)
  : null;

// SMS template types for Axis Imaging
export interface SMSTemplate {
  type: 'invitation' | 'otp' | 'welcome' | 'password_reset' | 'appointment_reminder' | 'report_ready';
  message: string;
}

// SMS service class
export class SMSService {
  private static instance: SMSService;

  private constructor() {}

  public static getInstance(): SMSService {
    if (!SMSService.instance) {
      SMSService.instance = new SMSService();
    }
    return SMSService.instance;
  }

  // Check if SMS is properly configured
  public isConfigured(): boolean {
    return !!(client && config.TWILIO_PHONE_NUMBER && config.SMS_ENABLED);
  }

  // Send SMS with template
  public async sendSMS(
    phoneNumber: string, 
    template: SMSTemplate,
    variables?: Record<string, string>
  ): Promise<boolean> {
    try {
      // Validate phone number (Australian format)
      const cleanedPhone = this.cleanPhoneNumber(phoneNumber);
      if (!this.isValidAustralianPhone(cleanedPhone)) {
        throw new Error('Invalid Australian phone number format');
      }

      // Replace variables in message
      let message = template.message;
      if (variables) {
        Object.entries(variables).forEach(([key, value]) => {
          message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
        });
      }

      // In test environment, just log the SMS
      if (config.SKIP_SMS_IN_TEST || !this.isConfigured()) {
        logger.info('SMS would be sent (test mode)', {
          phoneNumber: cleanedPhone,
          message: template.type,
          template: template.type
        });
        return true;
      }

      // Send actual SMS
      const result = await client!.messages.create({
        body: message,
        from: config.TWILIO_PHONE_NUMBER,
        to: cleanedPhone
      });

      // Log successful SMS
      healthcareLogger.systemAccess('SMS_SENT', undefined, 'SMS_SERVICE', {
        messageId: result.sid,
        phoneNumber: this.maskPhoneNumber(cleanedPhone),
        templateType: template.type,
        status: result.status
      });

      logger.info('SMS sent successfully', {
        messageId: result.sid,
        phoneNumber: this.maskPhoneNumber(cleanedPhone),
        templateType: template.type,
        status: result.status
      });

      return true;

    } catch (error) {
      logger.error('Failed to send SMS', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        templateType: template.type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      healthcareLogger.securityIncident('SMS_SEND_FAILED', 'low', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        templateType: template.type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  // Clean and format Australian phone number
  private cleanPhoneNumber(phoneNumber: string): string {
    // Remove all non-digits
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    // Handle different Australian number formats
    if (digitsOnly.startsWith('61')) {
      // International format +61...
      return `+${digitsOnly}`;
    } else if (digitsOnly.startsWith('04') || digitsOnly.startsWith('03') || digitsOnly.startsWith('02') || digitsOnly.startsWith('08') || digitsOnly.startsWith('07')) {
      // Australian domestic format 04..., 03..., etc.
      return `+61${digitsOnly.substring(1)}`;
    } else if (digitsOnly.length === 9 && (digitsOnly.startsWith('4') || digitsOnly.startsWith('3') || digitsOnly.startsWith('2') || digitsOnly.startsWith('8') || digitsOnly.startsWith('7'))) {
      // Missing leading 0
      return `+61${digitsOnly}`;
    }
    
    return phoneNumber; // Return as-is if format not recognized
  }

  // Validate Australian phone number
  private isValidAustralianPhone(phoneNumber: string): boolean {
    // Australian phone number patterns
    const mobilePattern = /^\+61[4-5]\d{8}$/; // +61 4XX XXX XXX or +61 5XX XXX XXX
    const landlinePattern = /^\+61[2-8]\d{8}$/; // +61 2/3/7/8 XXXX XXXX
    
    return mobilePattern.test(phoneNumber) || landlinePattern.test(phoneNumber);
  }

  // Mask phone number for logging (HIPAA compliance)
  private maskPhoneNumber(phoneNumber: string): string {
    const cleaned = this.cleanPhoneNumber(phoneNumber);
    if (cleaned.length > 6) {
      return `${cleaned.substring(0, 4)}***${cleaned.substring(cleaned.length - 2)}`;
    }
    return '***';
  }

  // Generate OTP
  public generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  }

  // SMS Templates for Axis Imaging
  public getTemplate(type: SMSTemplate['type']): SMSTemplate {
    const templates: Record<SMSTemplate['type'], SMSTemplate> = {
      invitation: {
        type: 'invitation',
        message: 'Your scan at Axis Imaging is complete. Register to view your images: {{registrationLink}} (expires in 30 days)'
      },
      
      otp: {
        type: 'otp',
        message: 'Your Axis Imaging verification code is: {{otp}}. Valid for {{expiryMinutes}} minutes. Do not share this code.'
      },
      
      welcome: {
        type: 'welcome',
        message: 'Welcome to Axis Imaging Patient Portal! Your account is now active. Login at {{portalUrl}} with your phone number.'
      },
      
      password_reset: {
        type: 'password_reset',
        message: 'Reset your Axis Imaging password using this code: {{otp}}. Valid for {{expiryMinutes}} minutes. If you didn\'t request this, please contact us.'
      },
      
      appointment_reminder: {
        type: 'appointment_reminder',
        message: 'Reminder: You have an appointment at Axis Imaging on {{date}} at {{time}}. Please arrive 15 minutes early. Location: {{address}}'
      },
      
      report_ready: {
        type: 'report_ready',
        message: 'Your imaging results from Axis Imaging are now available. Login to your patient portal to view: {{portalUrl}}'
      }
    };

    return templates[type];
  }

  // Send invitation SMS
  public async sendInvitationSMS(phoneNumber: string, registrationLink: string): Promise<boolean> {
    const template = this.getTemplate('invitation');
    return this.sendSMS(phoneNumber, template, { registrationLink });
  }

  // Send OTP SMS
  public async sendOTPSMS(phoneNumber: string, otp: string, expiryMinutes: number = 10): Promise<boolean> {
    const template = this.getTemplate('otp');
    return this.sendSMS(phoneNumber, template, { 
      otp, 
      expiryMinutes: expiryMinutes.toString() 
    });
  }

  // Send welcome SMS
  public async sendWelcomeSMS(phoneNumber: string): Promise<boolean> {
    const template = this.getTemplate('welcome');
    return this.sendSMS(phoneNumber, template, { 
      portalUrl: config.FRONTEND_URL 
    });
  }

  // Send password reset SMS
  public async sendPasswordResetSMS(phoneNumber: string, otp: string, expiryMinutes: number = 10): Promise<boolean> {
    const template = this.getTemplate('password_reset');
    return this.sendSMS(phoneNumber, template, { 
      otp, 
      expiryMinutes: expiryMinutes.toString() 
    });
  }

  // Send appointment reminder SMS
  public async sendAppointmentReminderSMS(
    phoneNumber: string, 
    date: string, 
    time: string, 
    address: string = '123 Imaging Drive, Mickleham VIC 3064'
  ): Promise<boolean> {
    const template = this.getTemplate('appointment_reminder');
    return this.sendSMS(phoneNumber, template, { date, time, address });
  }

  // Send report ready SMS
  public async sendReportReadySMS(phoneNumber: string): Promise<boolean> {
    const template = this.getTemplate('report_ready');
    return this.sendSMS(phoneNumber, template, { 
      portalUrl: config.FRONTEND_URL 
    });
  }

  // Verify SMS delivery status (for important notifications)
  public async checkMessageStatus(messageId: string): Promise<string> {
    if (!client || config.SKIP_SMS_IN_TEST) {
      return 'delivered'; // Assume delivered in test
    }

    try {
      const message = await client.messages(messageId).fetch();
      return message.status;
    } catch (error) {
      logger.error('Failed to check SMS status', { messageId, error });
      return 'unknown';
    }
  }
}

// Export singleton instance
export const smsService = SMSService.getInstance();
export default smsService;