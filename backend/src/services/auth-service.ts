import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { clickSendSMS } from './clicksend-sms';
import { config } from '../config/config';

const prisma = new PrismaClient();

interface RegisterData {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  medicareNumber?: string;
  email?: string;
}

export class AuthService {
  
  // Generate a 6-digit verification code
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send SMS verification code
  async sendVerificationCode(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      // Format Australian phone number
      const formattedNumber = this.formatAustralianNumber(phoneNumber);
      
      // Generate verification code
      const code = this.generateVerificationCode();
      
      // Store verification code in database (using a separate approach)
      // For now, we'll simulate storing the verification code
      // In production, you'd use a Redis cache or separate verification table
      console.log(`📱 SMS Verification Code for ${this.maskPhoneNumber(formattedNumber)}: ${code}`);

      // Send SMS via ClickSend
      const smsSuccess = await clickSendSMS.sendVerificationCode(formattedNumber, code);
      
      if (smsSuccess) {
        return {
          success: true,
          message: `Verification code sent to ${this.maskPhoneNumber(formattedNumber)}`
        };
      } else {
        return {
          success: false,
          message: 'Failed to send SMS. Please try again.'
        };
      }
    } catch (error) {
      console.error('Error sending verification code:', error);
      return {
        success: false,
        message: 'An error occurred. Please try again.'
      };
    }
  }

  // Verify SMS code
  async verifyCode(phoneNumber: string, code: string): Promise<{ success: boolean; message: string; token?: string }> {
    try {
      const formattedNumber = this.formatAustralianNumber(phoneNumber);
      
      // For demo purposes, accept any 6-digit code
      // In production, you'd verify against stored codes in Redis or database
      if (code.length !== 6 || !/^\d{6}$/.test(code)) {
        return {
          success: false,
          message: 'Invalid or expired verification code.'
        };
      }
      
      console.log(`✅ Verification code verified for ${this.maskPhoneNumber(formattedNumber)}`);

      // Generate temporary auth token for registration
      const tempToken = jwt.sign(
        { 
          phoneNumber: formattedNumber,
          verified: true,
          type: 'registration'
        },
        config.JWT_SECRET,
        { expiresIn: '30m' }
      );

      return {
        success: true,
        message: 'Phone number verified successfully.',
        token: tempToken
      };
    } catch (error) {
      console.error('Error verifying code:', error);
      return {
        success: false,
        message: 'An error occurred during verification.'
      };
    }
  }

  // Register new patient
  async registerPatient(registerData: RegisterData, verificationToken: string): Promise<{ success: boolean; message: string; patient?: any }> {
    try {
      // Verify the registration token
      const decoded = jwt.verify(verificationToken, config.JWT_SECRET) as any;
      
      if (decoded.type !== 'registration' || !decoded.verified) {
        return {
          success: false,
          message: 'Invalid registration token.'
        };
      }

      if (decoded.phoneNumber !== this.formatAustralianNumber(registerData.phoneNumber)) {
        return {
          success: false,
          message: 'Phone number mismatch.'
        };
      }

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { phoneNumber: decoded.phoneNumber },
            { email: registerData.email || undefined }
          ]
        }
      });

      if (existingUser) {
        return {
          success: false,
          message: 'A patient with this phone number or email already exists.'
        };
      }

      // Generate patient number
      const patientCount = await prisma.patient.count();
      const patientNumber = `AXI${String(patientCount + 1).padStart(4, '0')}`;

      // Create user and patient records
      const user = await prisma.user.create({
        data: {
          email: registerData.email || `patient_${Date.now()}@axisimaging.com.au`,
          firstName: registerData.firstName,
          lastName: registerData.lastName,
          phoneNumber: decoded.phoneNumber,
          passwordHash: '', // No password needed - SMS-only authentication
          role: 'PATIENT',
          isVerified: true
        }
      });

      const patient = await prisma.patient.create({
        data: {
          userId: user.id,
          patientNumber,
          dateOfBirth: new Date(registerData.dateOfBirth),
          medicareNumber: registerData.medicareNumber,
          country: 'Australia'
        }
      });

      // Generate main auth token
      const authToken = jwt.sign(
        {
          userId: user.id,
          patientId: patient.id,
          role: user.role,
          type: 'auth'
        },
        config.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Create active session
      await prisma.session.create({
        data: {
          userId: user.id,
          token: authToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          isActive: true
        }
      });

      return {
        success: true,
        message: 'Registration successful! Welcome to Axis Imaging.',
        patient: {
          id: patient.id,
          patientNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          email: user.email,
          authToken
        }
      };
    } catch (error) {
      console.error('Error registering patient:', error);
      return {
        success: false,
        message: 'Registration failed. Please try again.'
      };
    }
  }

  // Login with phone number (send SMS code)
  async loginWithPhone(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      const formattedNumber = this.formatAustralianNumber(phoneNumber);
      
      // Check if user exists
      const user = await prisma.user.findFirst({
        where: { phoneNumber: formattedNumber }
      });

      if (!user) {
        return {
          success: false,
          message: 'No account found with this phone number.'
        };
      }

      // Send verification code for login
      return await this.sendVerificationCode(phoneNumber);
    } catch (error) {
      console.error('Error in login:', error);
      return {
        success: false,
        message: 'Login failed. Please try again.'
      };
    }
  }

  // Complete login with verification code
  async completeLogin(phoneNumber: string, code: string): Promise<{ success: boolean; message: string; patient?: any }> {
    try {
      // First verify the code
      const verification = await this.verifyCode(phoneNumber, code);
      
      if (!verification.success) {
        return verification;
      }

      const formattedNumber = this.formatAustralianNumber(phoneNumber);
      
      // Get user and patient data
      const user = await prisma.user.findFirst({
        where: { phoneNumber: formattedNumber },
        include: {
          patient: true
        }
      });

      if (!user || !user.patient) {
        return {
          success: false,
          message: 'Account not found.'
        };
      }

      // Generate auth token
      const authToken = jwt.sign(
        {
          userId: user.id,
          patientId: user.patient.id,
          role: user.role,
          type: 'auth'
        },
        config.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Create active session
      await prisma.session.create({
        data: {
          userId: user.id,
          token: authToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          isActive: true
        }
      });

      return {
        success: true,
        message: 'Login successful!',
        patient: {
          id: user.patient.id,
          patientNumber: user.patient.patientNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          email: user.email,
          authToken
        }
      };
    } catch (error) {
      console.error('Error completing login:', error);
      return {
        success: false,
        message: 'Login failed. Please try again.'
      };
    }
  }

  // Logout
  async logout(authToken: string): Promise<{ success: boolean; message: string }> {
    try {
      // Deactivate session
      await prisma.session.updateMany({
        where: {
          token: authToken,
          isActive: true
        },
        data: {
          isActive: false
        }
      });

      return {
        success: true,
        message: 'Logged out successfully.'
      };
    } catch (error) {
      console.error('Error logging out:', error);
      return {
        success: false,
        message: 'Logout failed.'
      };
    }
  }

  // Utility methods
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

  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length < 8) return phoneNumber;
    const start = phoneNumber.substring(0, phoneNumber.length - 6);
    const end = phoneNumber.substring(phoneNumber.length - 2);
    return start + '****' + end;
  }
}

export const authService = new AuthService();