import { PrismaClient } from '@prisma/client'
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto'
import { AuditTrailService } from './AuditTrailService'

export interface SecurityValidationRequest {
  shareId?: string
  accessToken?: string
  ipAddress: string
  userAgent?: string
  requestedBy?: string
  accessType: 'VIEW' | 'DOWNLOAD' | 'PRINT' | 'SHARE'
}

export interface EncryptionConfig {
  algorithm: string
  keyLength: number
  ivLength: number
  tagLength: number
}

export interface ComplianceReport {
  patientId: string
  reportPeriod: {
    startDate: Date
    endDate: Date
  }
  metrics: {
    totalShares: number
    activeShares: number
    expiredShares: number
    revokedShares: number
    totalAccesses: number
    unauthorizedAttempts: number
    dataBreachIncidents: number
  }
  complianceStatus: {
    consentCompliance: boolean
    accessControlCompliance: boolean
    auditTrailCompliance: boolean
    encryptionCompliance: boolean
    retentionCompliance: boolean
  }
  violations: Array<{
    type: string
    description: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    occurrenceDate: Date
    resolutionStatus: 'PENDING' | 'RESOLVED' | 'ACKNOWLEDGED'
  }>
  recommendations: string[]
}

export class SecurityComplianceService {
  private prisma: PrismaClient
  private auditService: AuditTrailService
  private encryptionConfig: EncryptionConfig
  private masterKey: Buffer

  constructor(prisma: PrismaClient, auditService: AuditTrailService, masterKey?: string) {
    this.prisma = prisma
    this.auditService = auditService
    this.encryptionConfig = {
      algorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 16,
      tagLength: 16
    }
    this.masterKey = Buffer.from(masterKey || process.env.ENCRYPTION_MASTER_KEY || this.generateMasterKey(), 'hex')
  }

  async validateSecureAccess(request: SecurityValidationRequest): Promise<{
    authorized: boolean
    reason?: string
    securityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    requiresAdditionalAuth?: boolean
    violations?: string[]
  }> {
    try {
      const violations: string[] = []
      let securityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'

      // 1. Validate IP address against geo-blocking and known threats
      const ipValidation = await this.validateIPAddress(request.ipAddress)
      if (!ipValidation.isValid) {
        violations.push(`Suspicious IP address: ${ipValidation.reason}`)
        securityLevel = 'HIGH'
      }

      // 2. Validate user agent for known malicious patterns
      const userAgentValidation = this.validateUserAgent(request.userAgent)
      if (!userAgentValidation.isValid) {
        violations.push(`Suspicious user agent: ${userAgentValidation.reason}`)
        securityLevel = 'MEDIUM'
      }

      // 3. Check for rate limiting violations
      const rateLimitCheck = await this.checkRateLimit(request.ipAddress, request.accessType)
      if (!rateLimitCheck.allowed) {
        violations.push(`Rate limit exceeded: ${rateLimitCheck.reason}`)
        securityLevel = 'HIGH'
      }

      // 4. Validate access token if provided
      if (request.accessToken) {
        const tokenValidation = await this.validateAccessToken(request.accessToken)
        if (!tokenValidation.isValid) {
          violations.push(`Invalid access token: ${tokenValidation.reason}`)
          securityLevel = 'CRITICAL'
        }
      }

      // 5. Check for concurrent access patterns
      if (request.shareId) {
        const concurrentCheck = await this.checkConcurrentAccess(request.shareId, request.ipAddress)
        if (!concurrentCheck.allowed) {
          violations.push(`Suspicious concurrent access: ${concurrentCheck.reason}`)
          securityLevel = 'HIGH'
        }
      }

      // 6. Device fingerprinting and behavior analysis
      const behaviorAnalysis = await this.analyzeBehaviorPattern(request)
      if (behaviorAnalysis.suspicious) {
        violations.push(`Suspicious behavior pattern detected`)
        securityLevel = 'HIGH'
      }

      const authorized = violations.length === 0
      const requiresAdditionalAuth = securityLevel === 'HIGH' || securityLevel === 'CRITICAL'

      // Log security validation
      if (request.shareId) {
        await this.auditService.logAction({
          shareId: request.shareId,
          patientId: (await this.getSharePatientId(request.shareId))!,
          action: authorized ? 'SHARE_ACCESSED' : 'UNAUTHORIZED_ACCESS',
          entityType: 'STUDY_SHARE',
          entityId: request.shareId,
          details: authorized 
            ? `Secure access validated for ${request.accessType}` 
            : `Access denied: ${violations.join(', ')}`,
          metadata: {
            securityLevel,
            violations,
            ipAddress: request.ipAddress,
            userAgent: request.userAgent
          },
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
          severity: authorized ? 'LOW' : 'HIGH'
        })
      }

      return {
        authorized,
        reason: violations.length > 0 ? violations.join('; ') : undefined,
        securityLevel,
        requiresAdditionalAuth,
        violations: violations.length > 0 ? violations : undefined
      }
    } catch (error) {
      console.error('Error validating secure access:', error)
      return {
        authorized: false,
        reason: 'Security validation failed',
        securityLevel: 'CRITICAL'
      }
    }
  }

  async encryptSensitiveData(data: string, additionalData?: string): Promise<{
    encryptedData: string
    iv: string
    tag: string
    keyId: string
  }> {
    try {
      const iv = randomBytes(this.encryptionConfig.ivLength)
      const cipher = createCipheriv(this.encryptionConfig.algorithm, this.masterKey, iv)
      
      if (additionalData) {
        cipher.setAAD(Buffer.from(additionalData))
      }

      let encrypted = cipher.update(data, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      const tag = cipher.getAuthTag()
      const keyId = this.generateKeyId()

      return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        keyId
      }
    } catch (error) {
      console.error('Error encrypting sensitive data:', error)
      throw new Error('Failed to encrypt sensitive data')
    }
  }

  async decryptSensitiveData(
    encryptedData: string, 
    iv: string, 
    tag: string, 
    keyId: string,
    additionalData?: string
  ): Promise<string> {
    try {
      const decipher = createDecipheriv(this.encryptionConfig.algorithm, this.masterKey, Buffer.from(iv, 'hex'))
      decipher.setAuthTag(Buffer.from(tag, 'hex'))
      
      if (additionalData) {
        decipher.setAAD(Buffer.from(additionalData))
      }

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      console.error('Error decrypting sensitive data:', error)
      throw new Error('Failed to decrypt sensitive data')
    }
  }

  async generateComplianceReport(patientId: string, startDate: Date, endDate: Date): Promise<ComplianceReport> {
    try {
      // Get all shares for the patient in the period
      const shares = await this.prisma.studyShare.findMany({
        where: {
          patientId,
          createdAt: { gte: startDate, lte: endDate }
        },
        include: {
          accesses: true,
          auditLogs: true
        }
      })

      // Get patient consents
      const consents = await this.prisma.shareConsent.findMany({
        where: {
          patientId,
          consentedAt: { gte: startDate, lte: endDate }
        }
      })

      // Calculate metrics
      const totalShares = shares.length
      const activeShares = shares.filter(s => s.status === 'ACTIVE').length
      const expiredShares = shares.filter(s => s.status === 'EXPIRED').length
      const revokedShares = shares.filter(s => s.status === 'REVOKED').length
      const totalAccesses = shares.reduce((sum, s) => sum + s.accesses.length, 0)

      // Get security incidents
      const unauthorizedAttempts = await this.prisma.shareAuditLog.count({
        where: {
          patientId,
          action: 'UNAUTHORIZED_ACCESS',
          timestamp: { gte: startDate, lte: endDate }
        }
      })

      // Check compliance status
      const complianceStatus = {
        consentCompliance: this.checkConsentCompliance(shares, consents),
        accessControlCompliance: this.checkAccessControlCompliance(shares),
        auditTrailCompliance: this.checkAuditTrailCompliance(shares),
        encryptionCompliance: this.checkEncryptionCompliance(shares),
        retentionCompliance: this.checkRetentionCompliance(shares)
      }

      // Identify violations
      const violations = await this.identifyComplianceViolations(patientId, startDate, endDate)

      // Generate recommendations
      const recommendations = this.generateComplianceRecommendations(complianceStatus, violations)

      return {
        patientId,
        reportPeriod: { startDate, endDate },
        metrics: {
          totalShares,
          activeShares,
          expiredShares,
          revokedShares,
          totalAccesses,
          unauthorizedAttempts,
          dataBreachIncidents: 0 // Would be calculated based on security incidents
        },
        complianceStatus,
        violations,
        recommendations
      }
    } catch (error) {
      console.error('Error generating compliance report:', error)
      throw new Error('Failed to generate compliance report')
    }
  }

  async sanitizeData(data: any, sanitizationLevel: 'BASIC' | 'MODERATE' | 'STRICT' = 'MODERATE'): Promise<any> {
    try {
      if (typeof data !== 'object' || data === null) {
        return data
      }

      const sanitized = { ...data }
      const sensitiveFields = this.getSensitiveFields(sanitizationLevel)

      for (const field of sensitiveFields) {
        if (sanitized[field]) {
          sanitized[field] = this.maskSensitiveField(sanitized[field], field)
        }
      }

      // Recursively sanitize nested objects
      for (const [key, value] of Object.entries(sanitized)) {
        if (typeof value === 'object' && value !== null) {
          sanitized[key] = await this.sanitizeData(value, sanitizationLevel)
        }
      }

      return sanitized
    } catch (error) {
      console.error('Error sanitizing data:', error)
      return data
    }
  }

  private async validateIPAddress(ipAddress: string): Promise<{ isValid: boolean; reason?: string }> {
    try {
      // Check against known malicious IP lists
      const isBlacklisted = await this.checkIPBlacklist(ipAddress)
      if (isBlacklisted) {
        return { isValid: false, reason: 'IP address is blacklisted' }
      }

      // Check for VPN/Proxy/Tor usage
      const isProxy = await this.checkProxyUsage(ipAddress)
      if (isProxy) {
        return { isValid: false, reason: 'Proxy/VPN usage detected' }
      }

      // Geo-blocking checks for countries with restrictions
      const geoCheck = await this.checkGeoRestrictions(ipAddress)
      if (!geoCheck.allowed) {
        return { isValid: false, reason: `Access restricted from ${geoCheck.country}` }
      }

      return { isValid: true }
    } catch (error) {
      return { isValid: false, reason: 'IP validation failed' }
    }
  }

  private validateUserAgent(userAgent?: string): { isValid: boolean; reason?: string } {
    if (!userAgent) {
      return { isValid: false, reason: 'Missing user agent' }
    }

    // Check for known malicious user agents
    const maliciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /automated/i
    ]

    for (const pattern of maliciousPatterns) {
      if (pattern.test(userAgent)) {
        return { isValid: false, reason: 'Automated access detected' }
      }
    }

    return { isValid: true }
  }

  private async checkRateLimit(ipAddress: string, accessType: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const oneHour = new Date(Date.now() - 60 * 60 * 1000)
      
      const recentAccesses = await this.prisma.shareAccess.count({
        where: {
          ipAddress,
          accessType: accessType as any,
          accessedAt: { gte: oneHour }
        }
      })

      const limit = this.getRateLimit(accessType)
      if (recentAccesses >= limit) {
        return { allowed: false, reason: `Rate limit exceeded: ${recentAccesses}/${limit} requests in the last hour` }
      }

      return { allowed: true }
    } catch (error) {
      return { allowed: false, reason: 'Rate limit check failed' }
    }
  }

  private async validateAccessToken(accessToken: string): Promise<{ isValid: boolean; reason?: string }> {
    try {
      const share = await this.prisma.studyShare.findUnique({
        where: { accessToken }
      })

      if (!share) {
        return { isValid: false, reason: 'Token not found' }
      }

      if (share.isRevoked) {
        return { isValid: false, reason: 'Token has been revoked' }
      }

      if (share.expiresAt && share.expiresAt < new Date()) {
        return { isValid: false, reason: 'Token has expired' }
      }

      if (share.maxAccesses && share.accessCount >= share.maxAccesses) {
        return { isValid: false, reason: 'Maximum access count reached' }
      }

      return { isValid: true }
    } catch (error) {
      return { isValid: false, reason: 'Token validation failed' }
    }
  }

  private async checkConcurrentAccess(shareId: string, ipAddress: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      
      const recentAccesses = await this.prisma.shareAccess.findMany({
        where: {
          shareId,
          accessedAt: { gte: fiveMinutesAgo }
        },
        select: { ipAddress: true }
      })

      const uniqueIPs = new Set(recentAccesses.map(a => a.ipAddress))
      
      if (uniqueIPs.size > 2) {
        return { allowed: false, reason: `Multiple concurrent access from ${uniqueIPs.size} different IPs` }
      }

      return { allowed: true }
    } catch (error) {
      return { allowed: false, reason: 'Concurrent access check failed' }
    }
  }

  private async analyzeBehaviorPattern(request: SecurityValidationRequest): Promise<{ suspicious: boolean; reasons?: string[] }> {
    // Implement behavior analysis based on access patterns
    // This is a placeholder for more sophisticated ML-based analysis
    return { suspicious: false }
  }

  private async getSharePatientId(shareId: string): Promise<string | null> {
    try {
      const share = await this.prisma.studyShare.findUnique({
        where: { id: shareId },
        select: { patientId: true }
      })
      return share?.patientId || null
    } catch {
      return null
    }
  }

  private generateMasterKey(): string {
    return randomBytes(32).toString('hex')
  }

  private generateKeyId(): string {
    return createHash('sha256').update(this.masterKey).digest('hex').substring(0, 16)
  }

  private getRateLimit(accessType: string): number {
    const limits = {
      'VIEW': 50,
      'DOWNLOAD': 10,
      'PRINT': 5,
      'SHARE': 3
    }
    return limits[accessType as keyof typeof limits] || 20
  }

  private async checkIPBlacklist(ipAddress: string): Promise<boolean> {
    // Implementation would check against threat intelligence feeds
    return false
  }

  private async checkProxyUsage(ipAddress: string): Promise<boolean> {
    // Implementation would check against proxy detection services
    return false
  }

  private async checkGeoRestrictions(ipAddress: string): Promise<{ allowed: boolean; country?: string }> {
    // Implementation would use IP geolocation services
    return { allowed: true }
  }

  private checkConsentCompliance(shares: any[], consents: any[]): boolean {
    // Check if all shares have valid consent
    return shares.every(share => 
      consents.some(consent => 
        consent.consentGiven && 
        !consent.withdrawnAt &&
        this.isConsentValidForShare(consent, share)
      )
    )
  }

  private checkAccessControlCompliance(shares: any[]): boolean {
    // Check if access controls are properly implemented
    return shares.every(share => 
      share.accessToken && 
      share.expiresAt && 
      share.permissionLevel
    )
  }

  private checkAuditTrailCompliance(shares: any[]): boolean {
    // Check if audit trails are complete
    return shares.every(share => share.auditLogs && share.auditLogs.length > 0)
  }

  private checkEncryptionCompliance(shares: any[]): boolean {
    // Check if sensitive data is encrypted
    return true // Would check encryption status of stored data
  }

  private checkRetentionCompliance(shares: any[]): boolean {
    // Check if data retention policies are followed
    return true // Would check against retention schedules
  }

  private async identifyComplianceViolations(patientId: string, startDate: Date, endDate: Date): Promise<any[]> {
    // Identify specific compliance violations
    return []
  }

  private generateComplianceRecommendations(complianceStatus: any, violations: any[]): string[] {
    const recommendations: string[] = []

    if (!complianceStatus.consentCompliance) {
      recommendations.push('Review and update patient consent management procedures')
    }

    if (!complianceStatus.accessControlCompliance) {
      recommendations.push('Implement stronger access control mechanisms')
    }

    if (!complianceStatus.auditTrailCompliance) {
      recommendations.push('Ensure comprehensive audit logging for all access events')
    }

    if (violations.length > 0) {
      recommendations.push('Address identified compliance violations promptly')
      recommendations.push('Implement additional security monitoring')
    }

    return recommendations
  }

  private getSensitiveFields(level: 'BASIC' | 'MODERATE' | 'STRICT'): string[] {
    const basicFields = ['ssn', 'medicareNumber', 'dateOfBirth']
    const moderateFields = [...basicFields, 'phone', 'email', 'address']
    const strictFields = [...moderateFields, 'firstName', 'lastName', 'patientNumber']

    switch (level) {
      case 'BASIC': return basicFields
      case 'MODERATE': return moderateFields
      case 'STRICT': return strictFields
      default: return moderateFields
    }
  }

  private maskSensitiveField(value: string, fieldType: string): string {
    switch (fieldType) {
      case 'ssn':
      case 'medicareNumber':
        return value.length > 4 ? '***-**-' + value.slice(-4) : '****'
      case 'email':
        const atIndex = value.indexOf('@')
        return atIndex > 1 ? value[0] + '***' + value.slice(atIndex) : '***'
      case 'phone':
        return value.length > 4 ? '***-***-' + value.slice(-4) : '****'
      case 'firstName':
      case 'lastName':
        return value.length > 1 ? value[0] + '*'.repeat(value.length - 1) : '*'
      default:
        return '***'
    }
  }

  private isConsentValidForShare(consent: any, share: any): boolean {
    // Check if specific consent covers the share type
    const shareTypeMapping = {
      'GP_REFERRAL': 'allowGpSharing',
      'SPECIALIST': 'allowSpecialistSharing',
      'FAMILY_MEMBER': 'allowFamilySharing',
      'EMERGENCY': 'allowEmergencySharing'
    }

    const consentField = shareTypeMapping[share.shareType as keyof typeof shareTypeMapping]
    return consentField ? consent[consentField] : consent.consentGiven
  }
}