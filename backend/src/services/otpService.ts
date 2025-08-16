import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { config } from '../config/config';
import { logger, healthcareLogger } from '../utils/logger';
import { smsService } from './smsService';
import { ValidationError, TooManyRequestsError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export interface OTPRequest {
  phoneNumber: string;
  purpose: 'registration' | 'password_reset' | 'login_verification' | 'phone_verification';
  userId?: string;
  metadata?: any;
}

export interface OTPVerification {
  phoneNumber: string;
  otp: string;
  purpose: string;
  userId?: string;
}

export interface OTPValidationResult {
  isValid: boolean;
  isExpired?: boolean;
  attemptsRemaining?: number;
  error?: string;
}

interface StoredOTP {
  phoneNumber: string;
  hashedOTP: string;
  purpose: string;
  userId?: string;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
  metadata?: any;
}

export class OTPService {
  private static instance: OTPService;
  private otpStore: Map<string, StoredOTP> = new Map();
  private requestLimiter: Map<string, { count: number; resetTime: number }> = new Map();

  private constructor() {
    // Clean up expired OTPs every 5 minutes
    setInterval(() => {
      this.cleanupExpiredOTPs();
    }, 5 * 60 * 1000);

    // Reset rate limiting every 15 minutes
    setInterval(() => {
      this.cleanupRateLimiting();
    }, 15 * 60 * 1000);
  }

  public static getInstance(): OTPService {
    if (!OTPService.instance) {
      OTPService.instance = new OTPService();
    }
    return OTPService.instance;
  }

  // Generate cryptographically secure OTP
  private generateSecureOTP(): string {
    // Use crypto.randomInt for cryptographically secure random number
    const otp = crypto.randomInt(100000, 999999);
    return otp.toString();
  }

  // Hash OTP for secure storage
  private hashOTP(otp: string, phoneNumber: string): string {
    // Use HMAC with phone number as additional context
    const hmac = crypto.createHmac('sha256', config.JWT_SECRET);
    hmac.update(otp + phoneNumber);
    return hmac.digest('hex');
  }

  // Create storage key
  private createStorageKey(phoneNumber: string, purpose: string): string {
    return `${phoneNumber}:${purpose}`;
  }

  // Clean phone number format
  private cleanPhoneNumber(phoneNumber: string): string {
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    if (digitsOnly.startsWith('61')) {
      return `+${digitsOnly}`;
    } else if (digitsOnly.startsWith('04') || digitsOnly.startsWith('03') || 
               digitsOnly.startsWith('02') || digitsOnly.startsWith('08') || 
               digitsOnly.startsWith('07')) {
      return `+61${digitsOnly.substring(1)}`;
    } else if (digitsOnly.length === 9) {
      return `+61${digitsOnly}`;
    }
    
    return phoneNumber;
  }

  // Check rate limiting
  private checkRateLimit(phoneNumber: string): void {
    const now = Date.now();
    const key = this.cleanPhoneNumber(phoneNumber);
    const limiter = this.requestLimiter.get(key);

    if (limiter) {
      if (now < limiter.resetTime) {
        if (limiter.count >= 5) { // Max 5 OTP requests per 15 minutes
          throw new TooManyRequestsError('Too many OTP requests. Please try again in 15 minutes.');
        }
        limiter.count++;
      } else {
        // Reset counter
        this.requestLimiter.set(key, { count: 1, resetTime: now + (15 * 60 * 1000) });
      }
    } else {
      // First request
      this.requestLimiter.set(key, { count: 1, resetTime: now + (15 * 60 * 1000) });
    }
  }

  // Generate and send OTP
  public async generateAndSendOTP(request: OTPRequest): Promise<boolean> {
    const { phoneNumber, purpose, userId, metadata } = request;

    try {
      // Clean phone number
      const cleanedPhone = this.cleanPhoneNumber(phoneNumber);

      // Check rate limiting
      this.checkRateLimit(cleanedPhone);

      // Validate phone number format
      if (!this.isValidAustralianPhone(cleanedPhone)) {
        throw new ValidationError('Invalid Australian phone number format');
      }

      // For password reset, verify user exists
      if (purpose === 'password_reset' && !userId) {
        const user = await prisma.user.findUnique({
          where: { phoneNumber: cleanedPhone }
        });

        if (!user) {
          // Don't reveal if user exists or not for security
          logger.warn('Password reset requested for non-existent user', {
            phoneNumber: this.maskPhoneNumber(cleanedPhone)
          });
          return true; // Pretend success to avoid user enumeration
        }
      }

      // Generate OTP
      const otp = this.generateSecureOTP();
      const hashedOTP = this.hashOTP(otp, cleanedPhone);

      // Store OTP
      const storageKey = this.createStorageKey(cleanedPhone, purpose);
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + config.OTP_EXPIRES_IN_MINUTES);

      this.otpStore.set(storageKey, {
        phoneNumber: cleanedPhone,
        hashedOTP,
        purpose,
        userId,
        expiresAt,
        attempts: 0,
        createdAt: new Date(),
        metadata
      });

      // Send SMS based on purpose
      let smsSuccess = false;
      switch (purpose) {
        case 'registration':
        case 'phone_verification':
        case 'login_verification':
          smsSuccess = await smsService.sendOTPSMS(cleanedPhone, otp, config.OTP_EXPIRES_IN_MINUTES);
          break;
        case 'password_reset':
          smsSuccess = await smsService.sendPasswordResetSMS(cleanedPhone, otp, config.OTP_EXPIRES_IN_MINUTES);
          break;
        default:
          throw new ValidationError('Invalid OTP purpose');
      }

      if (smsSuccess) {
        // Log OTP generation (without the actual OTP)
        healthcareLogger.authEvent('OTP_GENERATED', userId, {
          phoneNumber: this.maskPhoneNumber(cleanedPhone),
          purpose,
          expiresAt: expiresAt.toISOString()
        });

        logger.info('OTP generated and sent', {
          phoneNumber: this.maskPhoneNumber(cleanedPhone),
          purpose,
          expiresAt: expiresAt.toISOString()
        });
      }

      return smsSuccess;

    } catch (error) {
      logger.error('Failed to generate and send OTP', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        purpose,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Verify OTP
  public async verifyOTP(verification: OTPVerification): Promise<OTPValidationResult> {
    const { phoneNumber, otp, purpose, userId } = verification;

    try {
      // Clean phone number
      const cleanedPhone = this.cleanPhoneNumber(phoneNumber);
      const storageKey = this.createStorageKey(cleanedPhone, purpose);

      // Get stored OTP
      const storedOTP = this.otpStore.get(storageKey);
      if (!storedOTP) {
        healthcareLogger.securityIncident('OTP_VERIFICATION_NO_REQUEST', 'medium', {
          phoneNumber: this.maskPhoneNumber(cleanedPhone),
          purpose,
          userId
        });

        return {
          isValid: false,
          error: 'No OTP request found. Please request a new OTP.'
        };
      }

      // Check if expired
      if (storedOTP.expiresAt < new Date()) {
        this.otpStore.delete(storageKey);
        
        healthcareLogger.securityIncident('OTP_VERIFICATION_EXPIRED', 'low', {
          phoneNumber: this.maskPhoneNumber(cleanedPhone),
          purpose,
          userId
        });

        return {
          isValid: false,
          isExpired: true,
          error: 'OTP has expired. Please request a new one.'
        };
      }

      // Check max attempts
      if (storedOTP.attempts >= config.OTP_MAX_ATTEMPTS) {
        this.otpStore.delete(storageKey);
        
        healthcareLogger.securityIncident('OTP_MAX_ATTEMPTS_EXCEEDED', 'high', {
          phoneNumber: this.maskPhoneNumber(cleanedPhone),
          purpose,
          attempts: storedOTP.attempts,
          userId
        });

        return {
          isValid: false,
          error: 'Too many incorrect attempts. Please request a new OTP.'
        };
      }

      // Increment attempt count
      storedOTP.attempts++;
      this.otpStore.set(storageKey, storedOTP);

      // Verify OTP
      const hashedProvidedOTP = this.hashOTP(otp, cleanedPhone);
      const isValid = hashedProvidedOTP === storedOTP.hashedOTP;

      if (isValid) {
        // Remove OTP after successful verification
        this.otpStore.delete(storageKey);

        // Log successful verification
        healthcareLogger.authEvent('OTP_VERIFIED', userId, {
          phoneNumber: this.maskPhoneNumber(cleanedPhone),
          purpose,
          attempts: storedOTP.attempts
        });

        logger.info('OTP verified successfully', {
          phoneNumber: this.maskPhoneNumber(cleanedPhone),
          purpose,
          attempts: storedOTP.attempts
        });

        return { isValid: true };
      } else {
        // Log failed verification
        healthcareLogger.securityIncident('OTP_VERIFICATION_FAILED', 'medium', {
          phoneNumber: this.maskPhoneNumber(cleanedPhone),
          purpose,
          attempts: storedOTP.attempts,
          userId
        });

        return {
          isValid: false,
          attemptsRemaining: config.OTP_MAX_ATTEMPTS - storedOTP.attempts,
          error: `Invalid OTP. ${config.OTP_MAX_ATTEMPTS - storedOTP.attempts} attempts remaining.`
        };
      }

    } catch (error) {
      logger.error('OTP verification failed', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        purpose,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        isValid: false,
        error: 'An error occurred during OTP verification. Please try again.'
      };
    }
  }

  // Check if OTP exists and is valid (without verifying)
  public hasValidOTP(phoneNumber: string, purpose: string): boolean {
    const cleanedPhone = this.cleanPhoneNumber(phoneNumber);
    const storageKey = this.createStorageKey(cleanedPhone, purpose);
    const storedOTP = this.otpStore.get(storageKey);

    return !!(storedOTP && storedOTP.expiresAt > new Date() && storedOTP.attempts < config.OTP_MAX_ATTEMPTS);
  }

  // Get OTP attempts remaining
  public getAttemptsRemaining(phoneNumber: string, purpose: string): number {
    const cleanedPhone = this.cleanPhoneNumber(phoneNumber);
    const storageKey = this.createStorageKey(cleanedPhone, purpose);
    const storedOTP = this.otpStore.get(storageKey);

    if (!storedOTP || storedOTP.expiresAt < new Date()) {
      return 0;
    }

    return Math.max(0, config.OTP_MAX_ATTEMPTS - storedOTP.attempts);
  }

  // Invalidate OTP (for security purposes)
  public invalidateOTP(phoneNumber: string, purpose: string): void {
    const cleanedPhone = this.cleanPhoneNumber(phoneNumber);
    const storageKey = this.createStorageKey(cleanedPhone, purpose);
    this.otpStore.delete(storageKey);

    logger.info('OTP invalidated', {
      phoneNumber: this.maskPhoneNumber(cleanedPhone),
      purpose
    });
  }

  // Clean up expired OTPs
  private cleanupExpiredOTPs(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, otp] of this.otpStore.entries()) {
      if (otp.expiresAt < now) {
        this.otpStore.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Cleaned up expired OTPs', { cleanedCount });
    }
  }

  // Clean up rate limiting
  private cleanupRateLimiting(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, limiter] of this.requestLimiter.entries()) {
      if (now >= limiter.resetTime) {
        this.requestLimiter.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Cleaned up rate limiting entries', { cleanedCount });
    }
  }

  // Validate Australian phone number
  private isValidAustralianPhone(phoneNumber: string): boolean {
    const mobilePattern = /^\+61[4-5]\d{8}$/;
    const landlinePattern = /^\+61[2-8]\d{8}$/;
    
    return mobilePattern.test(phoneNumber) || landlinePattern.test(phoneNumber);
  }

  // Mask phone number for logging
  private maskPhoneNumber(phoneNumber: string): string {
    const cleaned = this.cleanPhoneNumber(phoneNumber);
    if (cleaned.length > 6) {
      return `${cleaned.substring(0, 4)}***${cleaned.substring(cleaned.length - 2)}`;
    }
    return '***';
  }

  // Get OTP statistics
  public getOTPStats(): any {
    const now = new Date();
    let activeCount = 0;
    let expiredCount = 0;
    
    for (const otp of this.otpStore.values()) {
      if (otp.expiresAt > now) {
        activeCount++;
      } else {
        expiredCount++;
      }
    }

    return {
      active: activeCount,
      expired: expiredCount,
      total: this.otpStore.size,
      rateLimitEntries: this.requestLimiter.size
    };
  }
}

export const otpService = OTPService.getInstance();
export default otpService;