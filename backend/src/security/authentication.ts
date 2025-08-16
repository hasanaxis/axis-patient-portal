// Secure Authentication Service for Healthcare Applications
// Implements multi-factor authentication, session management, and security monitoring

import crypto from 'crypto'
import speakeasy from 'speakeasy'
import qrcode from 'qrcode'
import { PrismaClient } from '@prisma/client'
import { RateLimiter } from 'limiter'
import EncryptionService from './encryption'
import { AuditLogger } from './audit-logger'
import { SecurityMonitor } from './security-monitor'

export class AuthenticationService {
  private readonly maxLoginAttempts = 5
  private readonly lockoutDuration = 30 * 60 * 1000 // 30 minutes
  private readonly sessionTimeout = 15 * 60 * 1000 // 15 minutes
  private readonly maxSessions = 3 // Maximum concurrent sessions per user
  
  // Rate limiters for different operations
  private readonly loginLimiter = new RateLimiter(5, 'minute') // 5 attempts per minute
  private readonly passwordResetLimiter = new RateLimiter(3, 'hour') // 3 resets per hour
  private readonly mfaLimiter = new RateLimiter(10, 'minute') // 10 MFA attempts per minute

  constructor(
    private readonly prisma: PrismaClient,
    private readonly encryption: EncryptionService,
    private readonly auditLogger: AuditLogger,
    private readonly securityMonitor: SecurityMonitor
  ) {}

  /**
   * Authenticate user with email and password
   */
  async authenticate(
    email: string, 
    password: string, 
    ipAddress: string, 
    userAgent: string,
    deviceFingerprint?: string
  ): Promise<AuthenticationResult> {
    // Rate limiting check
    if (!this.loginLimiter.tryRemoveTokens(1)) {
      await this.auditLogger.logSecurityEvent({
        event: 'RATE_LIMIT_EXCEEDED',
        userId: null,
        ipAddress,
        userAgent,
        details: { operation: 'login' }
      })
      throw new Error('Rate limit exceeded. Please try again later.')
    }

    // Check for account lockout
    const user = await this.getUserByEmail(email)
    if (user && await this.isAccountLocked(user.id)) {
      await this.auditLogger.logSecurityEvent({
        event: 'LOGIN_ATTEMPT_LOCKED_ACCOUNT',
        userId: user.id,
        ipAddress,
        userAgent,
        details: { email }
      })
      throw new Error('Account is temporarily locked due to multiple failed login attempts.')
    }

    // Verify credentials
    if (!user || !await this.encryption.verifyPassword(password, user.passwordHash)) {
      await this.handleFailedLogin(user?.id, email, ipAddress, userAgent)
      throw new Error('Invalid email or password.')
    }

    // Check if account is active
    if (!user.isActive) {
      await this.auditLogger.logSecurityEvent({
        event: 'LOGIN_ATTEMPT_INACTIVE_ACCOUNT',
        userId: user.id,
        ipAddress,
        userAgent,
        details: { email }
      })
      throw new Error('Account is inactive. Please contact support.')
    }

    // Reset failed login attempts on successful authentication
    await this.resetFailedLoginAttempts(user.id)

    // Check for suspicious activity
    await this.securityMonitor.checkSuspiciousActivity(user.id, ipAddress, userAgent, deviceFingerprint)

    // Generate session
    const session = await this.createSession(user.id, ipAddress, userAgent, deviceFingerprint)

    // Log successful login
    await this.auditLogger.logSecurityEvent({
      event: 'LOGIN_SUCCESS',
      userId: user.id,
      ipAddress,
      userAgent,
      details: { 
        sessionId: session.id,
        mfaRequired: user.mfaEnabled
      }
    })

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
        emailVerified: user.emailVerified
      },
      session: {
        id: session.id,
        token: session.token,
        expiresAt: session.expiresAt
      },
      requiresMFA: user.mfaEnabled,
      requiresEmailVerification: !user.emailVerified
    }
  }

  /**
   * Verify MFA token
   */
  async verifyMFA(
    userId: string,
    token: string,
    sessionId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<MFAVerificationResult> {
    // Rate limiting check
    if (!this.mfaLimiter.tryRemoveTokens(1)) {
      await this.auditLogger.logSecurityEvent({
        event: 'MFA_RATE_LIMIT_EXCEEDED',
        userId,
        ipAddress,
        userAgent,
        details: { sessionId }
      })
      throw new Error('Too many MFA attempts. Please try again later.')
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user || !user.mfaSecret) {
      throw new Error('MFA not configured for this user.')
    }

    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps before/after current
    })

    if (!isValid) {
      await this.auditLogger.logSecurityEvent({
        event: 'MFA_VERIFICATION_FAILED',
        userId,
        ipAddress,
        userAgent,
        details: { sessionId, token: token.substring(0, 2) + '****' }
      })
      throw new Error('Invalid MFA token.')
    }

    // Update session to mark MFA as verified
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { mfaVerified: true }
    })

    await this.auditLogger.logSecurityEvent({
      event: 'MFA_VERIFICATION_SUCCESS',
      userId,
      ipAddress,
      userAgent,
      details: { sessionId }
    })

    return {
      success: true,
      sessionId,
      expiresAt: new Date(Date.now() + this.sessionTimeout)
    }
  }

  /**
   * Setup MFA for user
   */
  async setupMFA(userId: string): Promise<MFASetupResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { patient: true }
    })

    if (!user) {
      throw new Error('User not found.')
    }

    const secret = speakeasy.generateSecret({
      name: `Axis Imaging (${user.email})`,
      issuer: 'Axis Imaging Patient Portal',
      length: 32
    })

    // Store the secret temporarily (will be confirmed when user verifies first token)
    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        mfaSecret: secret.base32,
        mfaEnabled: false // Will be enabled after verification
      }
    })

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!)

    await this.auditLogger.logSecurityEvent({
      event: 'MFA_SETUP_INITIATED',
      userId,
      details: { secretLength: secret.base32.length }
    })

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes: this.generateBackupCodes()
    }
  }

  /**
   * Confirm MFA setup
   */
  async confirmMFASetup(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user || !user.mfaSecret) {
      throw new Error('MFA setup not initiated.')
    }

    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 2
    })

    if (!isValid) {
      throw new Error('Invalid MFA token.')
    }

    // Enable MFA for the user
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true }
    })

    await this.auditLogger.logSecurityEvent({
      event: 'MFA_ENABLED',
      userId,
      details: { method: 'TOTP' }
    })

    return true
  }

  /**
   * Disable MFA (requires password confirmation)
   */
  async disableMFA(userId: string, password: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error('User not found.')
    }

    // Verify password before disabling MFA
    if (!await this.encryption.verifyPassword(password, user.passwordHash)) {
      throw new Error('Invalid password.')
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        mfaEnabled: false,
        mfaSecret: null
      }
    })

    await this.auditLogger.logSecurityEvent({
      event: 'MFA_DISABLED',
      userId,
      details: { method: 'password_confirmation' }
    })

    return true
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string, 
    currentPassword: string, 
    newPassword: string,
    ipAddress: string,
    userAgent: string
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error('User not found.')
    }

    // Verify current password
    if (!await this.encryption.verifyPassword(currentPassword, user.passwordHash)) {
      await this.auditLogger.logSecurityEvent({
        event: 'PASSWORD_CHANGE_FAILED',
        userId,
        ipAddress,
        userAgent,
        details: { reason: 'invalid_current_password' }
      })
      throw new Error('Current password is incorrect.')
    }

    // Validate new password strength
    this.validatePasswordStrength(newPassword)

    // Check if new password is different from current
    if (await this.encryption.verifyPassword(newPassword, user.passwordHash)) {
      throw new Error('New password must be different from current password.')
    }

    // Hash new password
    const newPasswordHash = await this.encryption.hashPassword(newPassword)

    // Update password and invalidate all sessions
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { 
          passwordHash: newPasswordHash,
          passwordChangedAt: new Date()
        }
      }),
      this.prisma.session.updateMany({
        where: { userId },
        data: { isActive: false }
      })
    ])

    await this.auditLogger.logSecurityEvent({
      event: 'PASSWORD_CHANGED',
      userId,
      ipAddress,
      userAgent,
      details: { sessionsInvalidated: true }
    })

    return true
  }

  /**
   * Initiate password reset
   */
  async initiatePasswordReset(email: string, ipAddress: string): Promise<boolean> {
    // Rate limiting check
    if (!this.passwordResetLimiter.tryRemoveTokens(1)) {
      await this.auditLogger.logSecurityEvent({
        event: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
        userId: null,
        ipAddress,
        details: { email }
      })
      throw new Error('Too many password reset attempts. Please try again later.')
    }

    const user = await this.getUserByEmail(email)
    
    // Always return success to prevent email enumeration
    if (!user) {
      await this.auditLogger.logSecurityEvent({
        event: 'PASSWORD_RESET_ATTEMPT_UNKNOWN_EMAIL',
        userId: null,
        ipAddress,
        details: { email }
      })
      return true
    }

    // Generate secure reset token
    const resetToken = this.encryption.generateSecureToken(32)
    const resetTokenHash = await this.encryption.hashForLookup(resetToken)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Store reset token
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: resetTokenHash,
        expiresAt,
        ipAddress
      }
    })

    // In a real implementation, send reset email here
    // await this.emailService.sendPasswordResetEmail(user.email, resetToken)

    await this.auditLogger.logSecurityEvent({
      event: 'PASSWORD_RESET_INITIATED',
      userId: user.id,
      ipAddress,
      details: { email }
    })

    return true
  }

  /**
   * Complete password reset
   */
  async completePasswordReset(
    token: string, 
    newPassword: string, 
    ipAddress: string,
    userAgent: string
  ): Promise<boolean> {
    const tokenHash = await this.encryption.hashForLookup(token)
    
    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        used: false,
        expiresAt: { gt: new Date() }
      },
      include: { user: true }
    })

    if (!resetToken) {
      await this.auditLogger.logSecurityEvent({
        event: 'PASSWORD_RESET_INVALID_TOKEN',
        userId: null,
        ipAddress,
        userAgent,
        details: { tokenPrefix: token.substring(0, 8) }
      })
      throw new Error('Invalid or expired reset token.')
    }

    // Validate new password strength
    this.validatePasswordStrength(newPassword)

    // Hash new password
    const newPasswordHash = await this.encryption.hashPassword(newPassword)

    // Update password and mark token as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { 
          passwordHash: newPasswordHash,
          passwordChangedAt: new Date()
        }
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true }
      }),
      this.prisma.session.updateMany({
        where: { userId: resetToken.userId },
        data: { isActive: false }
      })
    ])

    await this.auditLogger.logSecurityEvent({
      event: 'PASSWORD_RESET_COMPLETED',
      userId: resetToken.userId,
      ipAddress,
      userAgent,
      details: { sessionsInvalidated: true }
    })

    return true
  }

  /**
   * Validate session token
   */
  async validateSession(sessionToken: string, ipAddress: string, userAgent: string): Promise<SessionValidationResult> {
    try {
      const payload = this.encryption.verifyAuthToken(sessionToken)
      
      const session = await this.prisma.session.findUnique({
        where: { id: payload.sessionId },
        include: { user: { include: { patient: true } } }
      })

      if (!session || !session.isActive || session.expiresAt < new Date()) {
        throw new Error('Invalid session')
      }

      // Check if session requires MFA and it's not verified
      if (session.user.mfaEnabled && !session.mfaVerified) {
        return {
          valid: false,
          requiresMFA: true,
          userId: session.userId,
          sessionId: session.id
        }
      }

      // Update session activity
      await this.updateSessionActivity(session.id, ipAddress)

      return {
        valid: true,
        user: {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role,
          patientId: session.user.patient?.id
        },
        sessionId: session.id,
        expiresAt: session.expiresAt
      }
    } catch (error) {
      await this.auditLogger.logSecurityEvent({
        event: 'INVALID_SESSION_TOKEN',
        userId: null,
        ipAddress,
        userAgent,
        details: { error: error.message }
      })
      
      return { valid: false }
    }
  }

  /**
   * Logout user and invalidate session
   */
  async logout(sessionId: string, userId: string, ipAddress: string, userAgent: string): Promise<boolean> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { 
        isActive: false,
        loggedOutAt: new Date()
      }
    })

    await this.auditLogger.logSecurityEvent({
      event: 'LOGOUT',
      userId,
      ipAddress,
      userAgent,
      details: { sessionId }
    })

    return true
  }

  /**
   * Logout from all sessions
   */
  async logoutAllSessions(userId: string, currentSessionId: string, ipAddress: string, userAgent: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: { 
        userId,
        isActive: true,
        id: { not: currentSessionId }
      },
      data: { isActive: false }
    })

    await this.auditLogger.logSecurityEvent({
      event: 'LOGOUT_ALL_SESSIONS',
      userId,
      ipAddress,
      userAgent,
      details: { 
        sessionsTerminated: result.count,
        currentSessionId 
      }
    })

    return result.count
  }

  // Private helper methods

  private async getUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { patient: true }
    })
  }

  private async isAccountLocked(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) return false

    const lockoutEnd = new Date(user.lastFailedLoginAt.getTime() + this.lockoutDuration)
    return user.failedLoginAttempts >= this.maxLoginAttempts && new Date() < lockoutEnd
  }

  private async handleFailedLogin(userId: string | undefined, email: string, ipAddress: string, userAgent: string) {
    if (userId) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: { increment: 1 },
          lastFailedLoginAt: new Date()
        }
      })
    }

    await this.auditLogger.logSecurityEvent({
      event: 'LOGIN_FAILED',
      userId,
      ipAddress,
      userAgent,
      details: { email }
    })

    // Check for brute force attack
    await this.securityMonitor.checkBruteForceAttack(ipAddress, email)
  }

  private async resetFailedLoginAttempts(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lastFailedLoginAt: null
      }
    })
  }

  private async createSession(userId: string, ipAddress: string, userAgent: string, deviceFingerprint?: string) {
    // Check for maximum concurrent sessions
    const activeSessions = await this.prisma.session.count({
      where: { userId, isActive: true }
    })

    if (activeSessions >= this.maxSessions) {
      // Deactivate oldest session
      const oldestSession = await this.prisma.session.findFirst({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'asc' }
      })

      if (oldestSession) {
        await this.prisma.session.update({
          where: { id: oldestSession.id },
          data: { isActive: false }
        })
      }
    }

    const sessionId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + this.sessionTimeout)
    
    const session = await this.prisma.session.create({
      data: {
        id: sessionId,
        userId,
        ipAddress,
        userAgent,
        deviceFingerprint,
        expiresAt,
        isActive: true,
        mfaVerified: false
      }
    })

    // Generate JWT token
    const token = this.encryption.generateAuthToken({
      userId,
      role: 'patient', // Will be updated based on actual user role
      permissions: ['read:own_data'],
      sessionId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000)
    })

    return {
      ...session,
      token
    }
  }

  private async updateSessionActivity(sessionId: string, ipAddress: string) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { 
        lastActivityAt: new Date(),
        lastActivityIp: ipAddress
      }
    })
  }

  private validatePasswordStrength(password: string) {
    const minLength = 12
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
    const hasCommonPatterns = /password|123456|qwerty|admin/.test(password.toLowerCase())

    if (password.length < minLength) {
      throw new Error(`Password must be at least ${minLength} characters long.`)
    }

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      throw new Error('Password must contain uppercase, lowercase, numbers, and special characters.')
    }

    if (hasCommonPatterns) {
      throw new Error('Password contains common patterns and is not secure.')
    }
  }

  private generateBackupCodes(count: number = 10): string[] {
    const codes = []
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase())
    }
    return codes
  }
}

// Type definitions
export interface AuthenticationResult {
  success: boolean
  user: {
    id: string
    email: string
    role: string
    mfaEnabled: boolean
    emailVerified: boolean
  }
  session: {
    id: string
    token: string
    expiresAt: Date
  }
  requiresMFA: boolean
  requiresEmailVerification: boolean
}

export interface MFAVerificationResult {
  success: boolean
  sessionId: string
  expiresAt: Date
}

export interface MFASetupResult {
  secret: string
  qrCode: string
  backupCodes: string[]
}

export interface SessionValidationResult {
  valid: boolean
  user?: {
    id: string
    email: string
    role: string
    patientId?: string
  }
  sessionId?: string
  expiresAt?: Date
  requiresMFA?: boolean
  userId?: string
}

export default AuthenticationService