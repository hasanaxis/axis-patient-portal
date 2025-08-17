import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { clickSendSMS } from './clicksend-sms';
import { config } from '../config/config';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const prisma = new PrismaClient();

interface VerifyPatientData {
  phoneNumber: string;
  dateOfBirth: string;
}

interface CreateAccountData {
  email: string;
  password: string;
  enableTwoFactor?: boolean;
  twoFactorMethod?: 'SMS' | 'AUTHENTICATOR_APP';
}

interface LoginData {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export class SecureAuthService {
  
  // Generate secure random tokens
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate 6-digit OTP
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Format Australian phone number
  private formatAustralianNumber(phoneNumber: string): string {
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.startsWith('0')) {
      cleaned = '61' + cleaned.substring(1);
    } else if (cleaned.startsWith('4') && cleaned.length === 9) {
      cleaned = '61' + cleaned;
    } else if (!cleaned.startsWith('61')) {
      cleaned = '61' + cleaned;
    }
    
    return '+' + cleaned;
  }

  // Mask sensitive data for logs
  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length < 8) return phoneNumber;
    const start = phoneNumber.substring(0, phoneNumber.length - 6);
    const end = phoneNumber.substring(phoneNumber.length - 2);
    return start + '****' + end;
  }

  // ===== PATIENT VERIFICATION (Step 1 of Registration) =====
  async verifyPatientExists(data: VerifyPatientData): Promise<{
    success: boolean;
    message: string;
    verificationToken?: string;
  }> {
    try {
      const formattedPhone = this.formatAustralianNumber(data.phoneNumber);
      const dob = new Date(data.dateOfBirth);

      // Check if patient exists in invitations (from RIS)
      const invitation = await prisma.patientInvitation.findFirst({
        where: {
          phoneNumber: formattedPhone,
          dateOfBirth: dob,
          status: {
            in: ['PENDING', 'SMS_SENT', 'CLICKED']
          }
        }
      });

      if (!invitation) {
        // Check if patient already registered
        const existingPatient = await prisma.patient.findFirst({
          where: {
            dateOfBirth: dob,
            user: {
              phoneNumber: formattedPhone
            }
          }
        });

        if (existingPatient) {
          return {
            success: false,
            message: 'An account already exists with these details. Please login instead.'
          };
        }

        return {
          success: false,
          message: 'We could not find your records. Please ensure you have received a scan at Axis Imaging and check your details.'
        };
      }

      // Generate OTP and send SMS
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store verification code
      await prisma.verificationCode.create({
        data: {
          phoneNumber: formattedPhone,
          code: otp,
          type: 'REGISTRATION',
          expiresAt
        }
      });

      // Send SMS
      const smsBody = `Your Axis Imaging verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, please ignore this message.`;
      
      await clickSendSMS.sendSMS(formattedPhone, smsBody);

      // Generate temporary token for the verification session
      const verificationToken = jwt.sign(
        {
          invitationId: invitation.id,
          phoneNumber: formattedPhone,
          type: 'patient_verification',
          step: 'otp_sent'
        },
        config.JWT_SECRET,
        { expiresIn: '30m' }
      );

      // Update invitation status
      await prisma.patientInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'CLICKED',
          clickedAt: new Date()
        }
      });

      return {
        success: true,
        message: `Verification code sent to ${this.maskPhoneNumber(formattedPhone)}`,
        verificationToken
      };

    } catch (error) {
      console.error('Error verifying patient:', error);
      return {
        success: false,
        message: 'An error occurred during verification. Please try again.'
      };
    }
  }

  // ===== VERIFY OTP (Step 2 of Registration) =====
  async verifyOTP(otp: string, verificationToken: string): Promise<{
    success: boolean;
    message: string;
    registrationToken?: string;
    patientInfo?: any;
  }> {
    try {
      // Verify the session token
      const decoded = jwt.verify(verificationToken, config.JWT_SECRET) as any;
      
      if (decoded.type !== 'patient_verification') {
        return {
          success: false,
          message: 'Invalid verification session.'
        };
      }

      // Find and verify the OTP
      const verificationCode = await prisma.verificationCode.findFirst({
        where: {
          phoneNumber: decoded.phoneNumber,
          code: otp,
          type: 'REGISTRATION',
          isUsed: false,
          expiresAt: {
            gt: new Date()
          }
        }
      });

      if (!verificationCode) {
        // Increment attempts for rate limiting
        await prisma.verificationCode.updateMany({
          where: {
            phoneNumber: decoded.phoneNumber,
            type: 'REGISTRATION',
            isUsed: false
          },
          data: {
            attempts: {
              increment: 1
            }
          }
        });

        return {
          success: false,
          message: 'Invalid or expired verification code.'
        };
      }

      // Check max attempts
      if (verificationCode.attempts >= verificationCode.maxAttempts) {
        return {
          success: false,
          message: 'Maximum verification attempts exceeded. Please request a new code.'
        };
      }

      // Mark code as used
      await prisma.verificationCode.update({
        where: { id: verificationCode.id },
        data: { isUsed: true }
      });

      // Get patient invitation details
      const invitation = await prisma.patientInvitation.findUnique({
        where: { id: decoded.invitationId }
      });

      if (!invitation) {
        return {
          success: false,
          message: 'Invitation not found.'
        };
      }

      // Generate registration token for account creation
      const registrationToken = jwt.sign(
        {
          invitationId: invitation.id,
          phoneNumber: decoded.phoneNumber,
          firstName: invitation.firstName,
          lastName: invitation.lastName,
          dateOfBirth: invitation.dateOfBirth,
          patientNumber: invitation.patientNumber,
          type: 'registration',
          verified: true
        },
        config.JWT_SECRET,
        { expiresIn: '1h' }
      );

      return {
        success: true,
        message: 'Phone number verified successfully.',
        registrationToken,
        patientInfo: {
          firstName: invitation.firstName,
          lastName: invitation.lastName,
          phoneNumber: this.maskPhoneNumber(decoded.phoneNumber)
        }
      };

    } catch (error) {
      console.error('Error verifying OTP:', error);
      return {
        success: false,
        message: 'Verification failed. Please try again.'
      };
    }
  }

  // ===== CREATE ACCOUNT (Step 3 of Registration) =====
  async createAccount(data: CreateAccountData, registrationToken: string): Promise<{
    success: boolean;
    message: string;
    authToken?: string;
    twoFactorSetup?: {
      secret?: string;
      qrCode?: string;
      backupCodes?: string[];
    };
  }> {
    try {
      // Verify registration token
      const decoded = jwt.verify(registrationToken, config.JWT_SECRET) as any;
      
      if (decoded.type !== 'registration' || !decoded.verified) {
        return {
          success: false,
          message: 'Invalid or expired registration token.'
        };
      }

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email }
      });

      if (existingUser) {
        return {
          success: false,
          message: 'An account with this email already exists.'
        };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 10);

      // Setup 2FA if requested
      let twoFactorSecret: string | undefined;
      let twoFactorQR: string | undefined;
      let backupCodes: string[] = [];

      if (data.enableTwoFactor) {
        if (data.twoFactorMethod === 'AUTHENTICATOR_APP') {
          // Generate TOTP secret
          const secret = speakeasy.generateSecret({
            name: `Axis Imaging (${data.email})`,
            issuer: 'Axis Imaging'
          });
          
          twoFactorSecret = secret.base32;
          
          // Generate QR code
          twoFactorQR = await QRCode.toDataURL(secret.otpauth_url!);
          
          // Generate backup codes
          for (let i = 0; i < 10; i++) {
            backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
          }
        }
      }

      // Create user and patient in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email: data.email,
            firstName: decoded.firstName,
            lastName: decoded.lastName,
            phoneNumber: decoded.phoneNumber,
            passwordHash,
            isVerified: true,
            role: 'PATIENT',
            twoFactorEnabled: data.enableTwoFactor || false,
            twoFactorMethod: data.twoFactorMethod || null,
            twoFactorSecret: twoFactorSecret || null,
            registeredAt: new Date()
          }
        });

        // Create patient record
        const patient = await tx.patient.create({
          data: {
            userId: user.id,
            patientNumber: decoded.patientNumber,
            dateOfBirth: new Date(decoded.dateOfBirth),
            country: 'Australia'
          }
        });

        // Update invitation
        await tx.patientInvitation.update({
          where: { id: decoded.invitationId },
          data: {
            userId: user.id,
            status: 'REGISTERED',
            registeredAt: new Date()
          }
        });

        return { user, patient };
      });

      // Generate auth token
      const authToken = jwt.sign(
        {
          userId: result.user.id,
          patientId: result.patient.id,
          email: result.user.email,
          role: result.user.role,
          type: 'auth'
        },
        config.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Create session
      await prisma.session.create({
        data: {
          userId: result.user.id,
          token: authToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          isActive: true
        }
      });

      // Send welcome SMS
      const welcomeMessage = `Welcome to Axis Imaging, ${decoded.firstName}! Your account has been created successfully. You can now access your scan results anytime at portal.axisimaging.com.au`;
      await clickSendSMS.sendSMS(decoded.phoneNumber, welcomeMessage);

      const response: any = {
        success: true,
        message: 'Account created successfully!',
        authToken
      };

      if (data.enableTwoFactor && data.twoFactorMethod === 'AUTHENTICATOR_APP') {
        response.twoFactorSetup = {
          secret: twoFactorSecret,
          qrCode: twoFactorQR,
          backupCodes
        };
      }

      return response;

    } catch (error) {
      console.error('Error creating account:', error);
      return {
        success: false,
        message: 'Failed to create account. Please try again.'
      };
    }
  }

  // ===== LOGIN WITH EMAIL/PASSWORD =====
  async login(data: LoginData): Promise<{
    success: boolean;
    message: string;
    authToken?: string;
    requiresTwoFactor?: boolean;
    twoFactorMethod?: string;
  }> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: data.email },
        include: { patient: true }
      });

      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password.'
        };
      }

      // Verify password
      const validPassword = await bcrypt.compare(data.password, user.passwordHash || '');
      
      if (!validPassword) {
        return {
          success: false,
          message: 'Invalid email or password.'
        };
      }

      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        if (!data.twoFactorCode) {
          // Send SMS OTP if using SMS 2FA
          if (user.twoFactorMethod === 'SMS') {
            const otp = this.generateOTP();
            
            await prisma.verificationCode.create({
              data: {
                userId: user.id,
                phoneNumber: user.phoneNumber,
                code: otp,
                type: 'TWO_FACTOR',
                expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
              }
            });

            const message = `Your Axis Imaging login code is: ${otp}\n\nThis code expires in 5 minutes.`;
            await clickSendSMS.sendSMS(user.phoneNumber, message);
          }

          return {
            success: false,
            message: '2FA code required',
            requiresTwoFactor: true,
            twoFactorMethod: user.twoFactorMethod || 'SMS'
          };
        }

        // Verify 2FA code
        let validCode = false;

        if (user.twoFactorMethod === 'SMS') {
          // Verify SMS OTP
          const verificationCode = await prisma.verificationCode.findFirst({
            where: {
              userId: user.id,
              code: data.twoFactorCode,
              type: 'TWO_FACTOR',
              isUsed: false,
              expiresAt: {
                gt: new Date()
              }
            }
          });

          if (verificationCode) {
            validCode = true;
            await prisma.verificationCode.update({
              where: { id: verificationCode.id },
              data: { isUsed: true }
            });
          }
        } else if (user.twoFactorMethod === 'AUTHENTICATOR_APP' && user.twoFactorSecret) {
          // Verify TOTP
          validCode = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: data.twoFactorCode,
            window: 2
          });
        }

        if (!validCode) {
          return {
            success: false,
            message: 'Invalid 2FA code.'
          };
        }
      }

      // Generate auth token
      const authToken = jwt.sign(
        {
          userId: user.id,
          patientId: user.patient?.id,
          email: user.email,
          role: user.role,
          type: 'auth'
        },
        config.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Create session
      await prisma.session.create({
        data: {
          userId: user.id,
          token: authToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          isActive: true
        }
      });

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      return {
        success: true,
        message: 'Login successful!',
        authToken
      };

    } catch (error) {
      console.error('Error during login:', error);
      return {
        success: false,
        message: 'Login failed. Please try again.'
      };
    }
  }

  // ===== RIS WEBHOOK - Create Patient Invitation =====
  async createPatientInvitation(risData: {
    patientNumber: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    dateOfBirth: string;
    studyAccessionNumber?: string;
    risMessageId?: string;
  }): Promise<{
    success: boolean;
    message: string;
    invitationUrl?: string;
  }> {
    try {
      const formattedPhone = this.formatAustralianNumber(risData.phoneNumber);
      const invitationToken = this.generateSecureToken();
      const invitationUrl = `${config.REGISTRATION_BASE_URL}/register?token=${invitationToken}`;

      // Check if invitation already exists
      const existing = await prisma.patientInvitation.findFirst({
        where: {
          patientNumber: risData.patientNumber,
          status: {
            not: 'EXPIRED'
          }
        }
      });

      if (existing) {
        return {
          success: false,
          message: 'Invitation already exists for this patient.'
        };
      }

      // Create invitation
      const invitation = await prisma.patientInvitation.create({
        data: {
          patientNumber: risData.patientNumber,
          firstName: risData.firstName,
          lastName: risData.lastName,
          phoneNumber: formattedPhone,
          dateOfBirth: new Date(risData.dateOfBirth),
          studyAccessionNumber: risData.studyAccessionNumber,
          risMessageId: risData.risMessageId,
          invitationToken,
          invitationUrl,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          status: 'PENDING'
        }
      });

      // Send SMS invitation
      const smsMessage = `Hi ${risData.firstName},\n\nYour recent scan at Axis Imaging is ready for viewing.\n\nCreate your account to access your results:\n${invitationUrl}\n\nThis link expires in 30 days.\n\nAxis Imaging\nMickleham, VIC`;

      const smsSent = await clickSendSMS.sendSMS(formattedPhone, smsMessage);

      if (smsSent) {
        await prisma.patientInvitation.update({
          where: { id: invitation.id },
          data: {
            status: 'SMS_SENT',
            smsSentAt: new Date()
          }
        });
      }

      return {
        success: true,
        message: 'Patient invitation created and SMS sent.',
        invitationUrl
      };

    } catch (error) {
      console.error('Error creating patient invitation:', error);
      return {
        success: false,
        message: 'Failed to create invitation.'
      };
    }
  }

  // ===== LOGOUT =====
  async logout(authToken: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
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
      console.error('Error during logout:', error);
      return {
        success: false,
        message: 'Logout failed.'
      };
    }
  }
}

export const secureAuthService = new SecureAuthService();