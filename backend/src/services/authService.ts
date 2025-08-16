import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient, User, Patient } from '@prisma/client';
import { config } from '../config/config';
import { logger, healthcareLogger } from '../utils/logger';
import { AuthenticationError, ValidationError, NotFoundError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// JWT payload interface
export interface JWTPayload {
  userId: string;
  phoneNumber: string;
  role: string;
  patientId?: string;
  sessionId: string;
  iat: number;
  exp: number;
}

// User session interface
export interface UserSession {
  user: User & { patient?: Patient };
  sessionId: string;
  token: string;
  refreshToken?: string;
}

// Login credentials
export interface LoginCredentials {
  phoneNumber: string;
  password: string;
  deviceInfo?: any;
  rememberMe?: boolean;
}

// Registration data
export interface RegistrationData {
  phoneNumber: string;
  password: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  deviceInfo?: any;
  invitationToken: string;
}

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Generate JWT token
  public generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
      issuer: 'axis-imaging',
      audience: 'patient-portal'
    });
  }

  // Generate refresh token
  public generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN,
      issuer: 'axis-imaging',
      audience: 'patient-portal-refresh'
    });
  }

  // Verify JWT token
  public verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.JWT_SECRET, {
        issuer: 'axis-imaging',
        audience: 'patient-portal'
      }) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid token');
      }
      throw new AuthenticationError('Token verification failed');
    }
  }

  // Verify refresh token
  public verifyRefreshToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.JWT_SECRET, {
        issuer: 'axis-imaging',
        audience: 'patient-portal-refresh'
      }) as JWTPayload;
    } catch (error) {
      throw new AuthenticationError('Invalid refresh token');
    }
  }

  // Hash password
  public async hashPassword(password: string): Promise<string> {
    // Validate password strength
    this.validatePassword(password);
    
    return bcrypt.hash(password, config.BCRYPT_ROUNDS);
  }

  // Verify password
  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Validate password strength
  private validatePassword(password: string): void {
    if (password.length < config.PASSWORD_MIN_LENGTH) {
      throw new ValidationError(`Password must be at least ${config.PASSWORD_MIN_LENGTH} characters long`);
    }

    // Password must contain at least one uppercase, one lowercase, one digit, and one special character
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasUppercase) {
      throw new ValidationError('Password must contain at least one uppercase letter');
    }
    if (!hasLowercase) {
      throw new ValidationError('Password must contain at least one lowercase letter');
    }
    if (!hasDigit) {
      throw new ValidationError('Password must contain at least one number');
    }
    if (!hasSpecialChar) {
      throw new ValidationError('Password must contain at least one special character');
    }

    // Check for common weak passwords
    const commonPasswords = [
      'password', '12345678', 'qwerty123', 'password123', 'admin123',
      'welcome123', 'changeme', 'letmein', 'monkey123', 'dragon123'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      throw new ValidationError('Password is too common. Please choose a more secure password');
    }
  }

  // Clean phone number for storage
  private cleanPhoneNumber(phoneNumber: string): string {
    // Remove all non-digits
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    // Convert to international format (+61...)
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

  // Register new patient (invitation-only)
  public async registerPatient(registrationData: RegistrationData): Promise<UserSession> {
    const { phoneNumber, password, acceptedTerms, acceptedPrivacy, deviceInfo, invitationToken } = registrationData;

    try {
      // Clean phone number
      const cleanedPhone = this.cleanPhoneNumber(phoneNumber);

      // Validate invitation token and get patient
      const invitation = await prisma.invitation.findFirst({
        where: {
          token: invitationToken,
          isUsed: false,
          expiresAt: { gt: new Date() }
        },
        include: {
          patient: {
            include: {
              user: true
            }
          }
        }
      });

      if (!invitation) {
        healthcareLogger.securityIncident('INVALID_INVITATION_TOKEN', 'medium', {
          phoneNumber: this.maskPhoneNumber(cleanedPhone),
          invitationToken: invitationToken?.substring(0, 8) + '...'
        });
        throw new ValidationError('Invalid or expired invitation. Please contact Axis Imaging if you believe this is an error.');
      }

      // Verify phone number matches invitation
      if (invitation.phoneNumber !== cleanedPhone) {
        healthcareLogger.securityIncident('PHONE_MISMATCH_REGISTRATION', 'high', {
          invitationPhone: this.maskPhoneNumber(invitation.phoneNumber),
          providedPhone: this.maskPhoneNumber(cleanedPhone)
        });
        throw new ValidationError('Phone number does not match invitation. Please use the phone number we have on file.');
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { phoneNumber: cleanedPhone }
      });

      if (existingUser) {
        throw new ValidationError('An account with this phone number already exists. Please try logging in instead.');
      }

      // Validate terms acceptance
      if (!acceptedTerms || !acceptedPrivacy) {
        throw new ValidationError('You must accept the terms of service and privacy policy to register');
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Create session ID
      const sessionId = require('uuid').v4();

      // Update user with authentication details
      const updatedUser = await prisma.user.update({
        where: { id: invitation.patient.userId },
        data: {
          passwordHash,
          isVerified: true,
          lastLoginAt: new Date()
        },
        include: {
          patient: true
        }
      });

      // Mark invitation as used
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          isUsed: true,
          usedAt: new Date()
        }
      });

      // Create session record
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + config.SESSION_TIMEOUT_HOURS);

      const session = await prisma.session.create({
        data: {
          userId: updatedUser.id,
          token: sessionId,
          deviceInfo,
          ipAddress: '', // Will be set by middleware
          userAgent: '', // Will be set by middleware
          expiresAt,
          isActive: true
        }
      });

      // Create consent records
      await this.createDefaultConsents(updatedUser.id, invitation.patient.id);

      // Generate JWT tokens
      const tokenPayload = {
        userId: updatedUser.id,
        phoneNumber: updatedUser.phoneNumber,
        role: updatedUser.role,
        patientId: updatedUser.patient?.id,
        sessionId: session.id
      };

      const token = this.generateToken(tokenPayload);
      const refreshToken = this.generateRefreshToken(tokenPayload);

      // Update session with refresh token
      await prisma.session.update({
        where: { id: session.id },
        data: { refreshToken }
      });

      // Log successful registration
      healthcareLogger.authEvent('PATIENT_REGISTERED', updatedUser.id, {
        phoneNumber: this.maskPhoneNumber(cleanedPhone),
        patientId: updatedUser.patient?.id,
        invitationId: invitation.id
      });

      // Create audit log
      await this.createAuditLog(updatedUser.id, 'CREATE', 'USER', updatedUser.id, 'Patient registration completed');

      return {
        user: updatedUser,
        sessionId: session.id,
        token,
        refreshToken
      };

    } catch (error) {
      logger.error('Patient registration failed', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Login existing patient
  public async loginPatient(credentials: LoginCredentials, ipAddress?: string, userAgent?: string): Promise<UserSession> {
    const { phoneNumber, password, deviceInfo, rememberMe } = credentials;

    try {
      // Clean phone number
      const cleanedPhone = this.cleanPhoneNumber(phoneNumber);

      // Find user
      const user = await prisma.user.findUnique({
        where: { phoneNumber: cleanedPhone },
        include: { patient: true }
      });

      if (!user) {
        healthcareLogger.securityIncident('LOGIN_ATTEMPT_UNKNOWN_USER', 'low', {
          phoneNumber: this.maskPhoneNumber(cleanedPhone),
          ipAddress
        });
        throw new AuthenticationError('Invalid phone number or password');
      }

      // Check if user has password set (completed registration)
      if (!user.passwordHash) {
        throw new AuthenticationError('Account not fully set up. Please complete registration first.');
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        healthcareLogger.securityIncident('LOGIN_FAILED_WRONG_PASSWORD', 'medium', {
          userId: user.id,
          phoneNumber: this.maskPhoneNumber(cleanedPhone),
          ipAddress
        });

        // Create audit log for failed login
        await this.createAuditLog(user.id, 'LOGIN', 'USER', user.id, 'Login failed - incorrect password', ipAddress);
        
        throw new AuthenticationError('Invalid phone number or password');
      }

      // Check if user is active
      if (!user.isActive) {
        healthcareLogger.securityIncident('LOGIN_ATTEMPT_INACTIVE_USER', 'medium', {
          userId: user.id,
          phoneNumber: this.maskPhoneNumber(cleanedPhone)
        });
        throw new AuthenticationError('Account has been deactivated. Please contact Axis Imaging.');
      }

      // Create session
      const sessionId = require('uuid').v4();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + (rememberMe ? config.SESSION_TIMEOUT_HOURS * 7 : config.SESSION_TIMEOUT_HOURS));

      const session = await prisma.session.create({
        data: {
          userId: user.id,
          token: sessionId,
          deviceInfo,
          ipAddress: ipAddress || '',
          userAgent: userAgent || '',
          expiresAt,
          isActive: true
        }
      });

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role,
        patientId: user.patient?.id,
        sessionId: session.id
      };

      const token = this.generateToken(tokenPayload);
      const refreshToken = this.generateRefreshToken(tokenPayload);

      // Update session with refresh token
      await prisma.session.update({
        where: { id: session.id },
        data: { refreshToken }
      });

      // Log successful login
      healthcareLogger.authEvent('PATIENT_LOGIN', user.id, {
        phoneNumber: this.maskPhoneNumber(cleanedPhone),
        sessionId: session.id,
        ipAddress,
        deviceInfo
      });

      // Create audit log
      await this.createAuditLog(user.id, 'LOGIN', 'USER', user.id, 'Patient login successful', ipAddress);

      return {
        user,
        sessionId: session.id,
        token,
        refreshToken
      };

    } catch (error) {
      logger.error('Patient login failed', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Logout patient
  public async logoutPatient(sessionId: string, userId?: string): Promise<void> {
    try {
      // Deactivate session
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          isActive: false,
          terminatedAt: new Date(),
          terminationReason: 'LOGOUT'
        }
      });

      if (userId) {
        healthcareLogger.authEvent('PATIENT_LOGOUT', userId, { sessionId });
        await this.createAuditLog(userId, 'LOGOUT', 'USER', userId, 'Patient logout');
      }

    } catch (error) {
      logger.error('Logout failed', { sessionId, error });
      throw error;
    }
  }

  // Refresh token
  public async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    try {
      // Verify refresh token
      const payload = this.verifyRefreshToken(refreshToken);

      // Check if session is still active
      const session = await prisma.session.findFirst({
        where: {
          id: payload.sessionId,
          isActive: true,
          refreshToken,
          expiresAt: { gt: new Date() }
        },
        include: { user: true }
      });

      if (!session) {
        throw new AuthenticationError('Invalid or expired refresh token');
      }

      // Generate new tokens
      const newTokenPayload = {
        userId: payload.userId,
        phoneNumber: payload.phoneNumber,
        role: payload.role,
        patientId: payload.patientId,
        sessionId: payload.sessionId
      };

      const newToken = this.generateToken(newTokenPayload);
      const newRefreshToken = this.generateRefreshToken(newTokenPayload);

      // Update session
      await prisma.session.update({
        where: { id: session.id },
        data: {
          refreshToken: newRefreshToken,
          lastActivityAt: new Date()
        }
      });

      healthcareLogger.authEvent('TOKEN_REFRESHED', payload.userId, { sessionId: session.id });

      return {
        token: newToken,
        refreshToken: newRefreshToken
      };

    } catch (error) {
      logger.error('Token refresh failed', { error });
      throw error;
    }
  }

  // Create default consent records for new patient
  private async createDefaultConsents(userId: string, patientId: string): Promise<void> {
    const consents = [
      {
        userId,
        patientId,
        consentType: 'PRIVACY' as const,
        consentVersion: config.PRIVACY_POLICY_VERSION,
        consentText: 'I consent to the collection, use and disclosure of my personal health information in accordance with the Privacy Act 1988 and Australian Privacy Principles.',
        isConsented: true,
        consentMethod: 'ONLINE' as const,
        consentedAt: new Date(),
        legalBasis: 'Consent under Privacy Act 1988',
        jurisdiction: 'Australia'
      },
      {
        userId,
        patientId,
        consentType: 'PORTAL_TERMS' as const,
        consentVersion: config.TERMS_VERSION,
        consentText: 'I accept the Terms of Service for the Axis Imaging Patient Portal.',
        isConsented: true,
        consentMethod: 'ONLINE' as const,
        consentedAt: new Date(),
        legalBasis: 'Contract for healthcare services',
        jurisdiction: 'Australia'
      }
    ];

    await prisma.consent.createMany({
      data: consents
    });
  }

  // Create audit log entry
  private async createAuditLog(
    userId: string,
    action: 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'VIEW' | 'DELETE',
    entity: string,
    entityId: string,
    description: string,
    ipAddress?: string
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity: entity as any,
        entityId,
        description,
        category: 'SECURITY',
        severity: 'INFO',
        ipAddress
      }
    });
  }

  // Mask phone number for logging
  private maskPhoneNumber(phoneNumber: string): string {
    const cleaned = this.cleanPhoneNumber(phoneNumber);
    if (cleaned.length > 6) {
      return `${cleaned.substring(0, 4)}***${cleaned.substring(cleaned.length - 2)}`;
    }
    return '***';
  }

  // Validate session
  public async validateSession(sessionId: string): Promise<User & { patient?: Patient } | null> {
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        isActive: true,
        expiresAt: { gt: new Date() }
      },
      include: {
        user: {
          include: {
            patient: true
          }
        }
      }
    });

    if (session) {
      // Update last activity
      await prisma.session.update({
        where: { id: sessionId },
        data: { lastActivityAt: new Date() }
      });

      return session.user;
    }

    return null;
  }
}

export const authService = AuthService.getInstance();
export default authService;