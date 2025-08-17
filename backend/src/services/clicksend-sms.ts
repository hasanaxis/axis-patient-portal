import axios from 'axios';
import { logger } from '../utils/logger';

// ClickSend message interface
interface ClickSendMessage {
  to: string;
  body: string;
  from?: string;
  custom_string?: string;
}

interface ClickSendResponse {
  http_code: number;
  response_code: string;
  response_msg: string;
  data: {
    total_price: number;
    total_count: number;
    queued_count: number;
    messages: Array<{
      direction: string;
      date: number;
      to: string;
      body: string;
      from: string;
      schedule: number;
      message_id: string;
      message_parts: number;
      message_price: number;
      custom_string: string;
      user_id: number;
      subaccount_id: number;
      country: string;
      carrier: string;
      status: string;
    }>;
  };
}

export class ClickSendSMSService {
  private username: string;
  private apiKey: string;
  private fromNumber: string;
  private baseURL = 'https://rest.clicksend.com/v3';

  constructor() {
    this.username = process.env.CLICKSEND_USERNAME || '';
    this.apiKey = process.env.CLICKSEND_API_KEY || '';
    this.fromNumber = process.env.CLICKSEND_FROM_NUMBER || '+61400000000';

    if (!this.username || !this.apiKey) {
      logger.warn('ClickSend credentials not configured. SMS features will be disabled.');
    }
  }

  private getAuthHeaders() {
    const credentials = Buffer.from(`${this.username}:${this.apiKey}`).toString('base64');
    return {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    };
  }

  async sendSMS(to: string, message: string, customString?: string): Promise<boolean> {
    try {
      if (!this.username || !this.apiKey) {
        logger.error('ClickSend credentials not configured');
        return false;
      }

      // Ensure Australian format
      const formattedNumber = this.formatAustralianNumber(to);
      
      const payload = {
        messages: [{
          to: formattedNumber,
          body: message,
          from: this.fromNumber,
          custom_string: customString || `axis-imaging-${Date.now()}`
        } as ClickSendMessage]
      };

      logger.info(`Sending SMS to ${formattedNumber}`, {
        to: formattedNumber,
        messageLength: message.length,
        customString
      });

      const response = await axios.post<ClickSendResponse>(
        `${this.baseURL}/sms/send`,
        payload,
        { headers: this.getAuthHeaders() }
      );

      if (response.data.response_code === 'SUCCESS') {
        logger.info('SMS sent successfully', {
          to: formattedNumber,
          messageId: response.data.data.messages[0]?.message_id,
          cost: response.data.data.total_price
        });
        return true;
      } else {
        logger.error('ClickSend API error', {
          responseCode: response.data.response_code,
          responseMsg: response.data.response_msg
        });
        return false;
      }

    } catch (error) {
      logger.error('Failed to send SMS via ClickSend', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to
      });
      return false;
    }
  }

  async sendVerificationCode(phoneNumber: string, code: string): Promise<boolean> {
    const message = `Your Axis Imaging verification code is: ${code}. This code expires in 10 minutes. If you didn't request this, please ignore this message.`;
    
    return this.sendSMS(phoneNumber, message, `verification-${code}`);
  }

  async sendReportNotification(phoneNumber: string, patientName: string, studyType: string): Promise<boolean> {
    const message = `Hi ${patientName}, your ${studyType} results are now available. View them securely at: https://portal.axisimaging.com.au`;
    
    return this.sendSMS(phoneNumber, message, `report-notification-${Date.now()}`);
  }

  async sendAppointmentReminder(phoneNumber: string, patientName: string, appointmentDate: string, appointmentTime: string): Promise<boolean> {
    const message = `Hi ${patientName}, reminder: Your appointment at Axis Imaging is tomorrow ${appointmentDate} at ${appointmentTime}. Location: Mickleham. Call +61 3 7036 1709 if you need to reschedule.`;
    
    return this.sendSMS(phoneNumber, message, `appointment-reminder-${Date.now()}`);
  }

  async sendInvitation(phoneNumber: string, patientName: string, invitationCode: string): Promise<boolean> {
    const message = `Hi ${patientName}, your scan at Axis Imaging is complete. Register to view your images: https://portal.axisimaging.com.au/register?code=${invitationCode}`;
    
    return this.sendSMS(phoneNumber, message, `invitation-${invitationCode}`);
  }

  private formatAustralianNumber(phoneNumber: string): string {
    // Remove all non-numeric characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle Australian mobile numbers
    if (cleaned.startsWith('0')) {
      // Convert 04XXXXXXXX to +614XXXXXXXX
      cleaned = '61' + cleaned.substring(1);
    } else if (cleaned.startsWith('4') && cleaned.length === 9) {
      // Convert 4XXXXXXXX to +614XXXXXXXX
      cleaned = '61' + cleaned;
    } else if (!cleaned.startsWith('61')) {
      // Assume it's an Australian number and add country code
      cleaned = '61' + cleaned;
    }
    
    return '+' + cleaned;
  }

  async getAccountBalance(): Promise<number | null> {
    try {
      if (!this.username || !this.apiKey) {
        return null;
      }

      const response = await axios.get(
        `${this.baseURL}/account`,
        { headers: this.getAuthHeaders() }
      );

      return response.data.data.balance || 0;
    } catch (error) {
      logger.error('Failed to get ClickSend account balance', error);
      return null;
    }
  }

  async getSMSHistory(limit: number = 100): Promise<any[] | null> {
    try {
      if (!this.username || !this.apiKey) {
        return null;
      }

      const response = await axios.get(
        `${this.baseURL}/sms/history?limit=${limit}`,
        { headers: this.getAuthHeaders() }
      );

      return response.data.data.data || [];
    } catch (error) {
      logger.error('Failed to get SMS history', error);
      return null;
    }
  }
}

export const clickSendSMS = new ClickSendSMSService();