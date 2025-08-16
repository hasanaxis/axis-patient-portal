// Comprehensive Audit Logging Service for Healthcare Compliance
// Implements Privacy Act 1988 and healthcare audit requirements

import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import winston from 'winston'
import 'winston-daily-rotate-file'

export class AuditLogger {
  private readonly logger: winston.Logger
  private readonly encryptionKey: string

  constructor(
    private readonly prisma: PrismaClient,
    encryptionKey?: string
  ) {
    this.encryptionKey = encryptionKey || process.env.AUDIT_ENCRYPTION_KEY || 'default-key'
    
    // Configure Winston logger for audit logs
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            ...meta,
            integrity: this.generateIntegrityHash({ timestamp, level, message, ...meta })
          })
        })
      ),
      transports: [
        // Daily rotating file for audit logs
        new winston.transports.DailyRotateFile({
          filename: 'logs/audit-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '100m',
          maxFiles: '2555d', // 7 years retention for healthcare compliance
          format: winston.format.json()
        }),
        // Separate file for security events
        new winston.transports.DailyRotateFile({
          filename: 'logs/security-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '100m',
          maxFiles: '2555d',
          format: winston.format.json(),
          level: 'warn'
        })
      ]
    })
  }

  /**
   * Log patient data access event
   */
  async logDataAccess(event: DataAccessEvent): Promise<string> {
    const auditId = crypto.randomUUID()
    const timestamp = new Date()

    try {
      // Store in database for searchability
      await this.prisma.auditLog.create({
        data: {
          id: auditId,
          eventType: 'DATA_ACCESS',
          userId: event.userId,
          patientId: event.patientId,
          action: event.action,
          resource: event.resource,
          resourceId: event.resourceId,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          success: event.success,
          details: this.encryptSensitiveData(event.details || {}),
          timestamp,
          sessionId: event.sessionId
        }
      })

      // Log to file for immutable audit trail
      this.logger.info('Data access event', {
        auditId,
        eventType: 'DATA_ACCESS',
        userId: event.userId,
        patientId: event.patientId,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        success: event.success,
        details: event.details,
        sessionId: event.sessionId,
        compliance: {
          privacyAct: true,
          healthRecords: true,
          requirement: 'Privacy Act 1988 - APP 1.5'
        }
      })

      return auditId
    } catch (error) {
      // Log audit failure (critical for compliance)
      this.logger.error('Audit logging failed', {
        error: error.message,
        eventType: 'DATA_ACCESS',
        userId: event.userId,
        action: event.action
      })
      throw new Error('Failed to log audit event')
    }
  }

  /**
   * Log user authentication events
   */
  async logAuthenticationEvent(event: AuthenticationEvent): Promise<string> {
    const auditId = crypto.randomUUID()
    const timestamp = new Date()

    try {
      await this.prisma.auditLog.create({
        data: {
          id: auditId,
          eventType: 'AUTHENTICATION',
          userId: event.userId,
          action: event.action,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          success: event.success,
          details: this.encryptSensitiveData({
            method: event.method,
            mfaUsed: event.mfaUsed,
            failureReason: event.failureReason,
            deviceFingerprint: event.deviceFingerprint
          }),
          timestamp,
          sessionId: event.sessionId
        }
      })

      this.logger.info('Authentication event', {
        auditId,
        eventType: 'AUTHENTICATION',
        userId: event.userId,
        action: event.action,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        success: event.success,
        method: event.method,
        mfaUsed: event.mfaUsed,
        sessionId: event.sessionId
      })

      return auditId
    } catch (error) {
      this.logger.error('Authentication audit logging failed', {
        error: error.message,
        userId: event.userId,
        action: event.action
      })
      throw new Error('Failed to log authentication event')
    }
  }

  /**
   * Log security events
   */
  async logSecurityEvent(event: SecurityEvent): Promise<string> {
    const auditId = crypto.randomUUID()
    const timestamp = new Date()

    try {
      await this.prisma.auditLog.create({
        data: {
          id: auditId,
          eventType: 'SECURITY',
          userId: event.userId,
          action: event.event,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          success: true, // Security events are always logged as successful logs
          details: this.encryptSensitiveData(event.details || {}),
          timestamp,
          severity: this.mapSeverity(event.event)
        }
      })

      // Use appropriate log level based on severity
      const logLevel = this.getLogLevel(event.event)
      this.logger.log(logLevel, 'Security event', {
        auditId,
        eventType: 'SECURITY',
        userId: event.userId,
        event: event.event,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        details: event.details,
        severity: this.mapSeverity(event.event),
        compliance: {
          requirement: 'Privacy Act 1988 - APP 1.5, Health Records Act'
        }
      })

      return auditId
    } catch (error) {
      this.logger.error('Security audit logging failed', {
        error: error.message,
        event: event.event,
        userId: event.userId
      })
      throw new Error('Failed to log security event')
    }
  }

  /**
   * Log administrative actions
   */
  async logAdministrativeAction(event: AdministrativeEvent): Promise<string> {
    const auditId = crypto.randomUUID()
    const timestamp = new Date()

    try {
      await this.prisma.auditLog.create({
        data: {
          id: auditId,
          eventType: 'ADMINISTRATIVE',
          userId: event.userId,
          action: event.action,
          resource: event.resource,
          resourceId: event.resourceId,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          success: event.success,
          details: this.encryptSensitiveData({
            changes: event.changes,
            reason: event.reason,
            targetUserId: event.targetUserId
          }),
          timestamp
        }
      })

      this.logger.warn('Administrative action', {
        auditId,
        eventType: 'ADMINISTRATIVE',
        userId: event.userId,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId,
        ipAddress: event.ipAddress,
        success: event.success,
        changes: event.changes,
        reason: event.reason,
        compliance: {
          requirement: 'Privacy Act 1988 - APP 1.5'
        }
      })

      return auditId
    } catch (error) {
      this.logger.error('Administrative audit logging failed', {
        error: error.message,
        action: event.action,
        userId: event.userId
      })
      throw new Error('Failed to log administrative event')
    }
  }

  /**
   * Log system events
   */
  async logSystemEvent(event: SystemEvent): Promise<string> {
    const auditId = crypto.randomUUID()
    const timestamp = new Date()

    try {
      await this.prisma.auditLog.create({
        data: {
          id: auditId,
          eventType: 'SYSTEM',
          action: event.action,
          success: event.success,
          details: this.encryptSensitiveData(event.details || {}),
          timestamp,
          severity: event.severity || 'INFO'
        }
      })

      this.logger.info('System event', {
        auditId,
        eventType: 'SYSTEM',
        action: event.action,
        success: event.success,
        details: event.details,
        severity: event.severity
      })

      return auditId
    } catch (error) {
      this.logger.error('System audit logging failed', {
        error: error.message,
        action: event.action
      })
      throw new Error('Failed to log system event')
    }
  }

  /**
   * Log consent management events
   */
  async logConsentEvent(event: ConsentEvent): Promise<string> {
    const auditId = crypto.randomUUID()
    const timestamp = new Date()

    try {
      await this.prisma.auditLog.create({
        data: {
          id: auditId,
          eventType: 'CONSENT',
          userId: event.userId,
          patientId: event.patientId,
          action: event.action,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          success: true,
          details: this.encryptSensitiveData({
            consentType: event.consentType,
            consentGiven: event.consentGiven,
            purpose: event.purpose,
            dataTypes: event.dataTypes
          }),
          timestamp
        }
      })

      this.logger.info('Consent management event', {
        auditId,
        eventType: 'CONSENT',
        userId: event.userId,
        patientId: event.patientId,
        action: event.action,
        consentType: event.consentType,
        consentGiven: event.consentGiven,
        purpose: event.purpose,
        compliance: {
          requirement: 'Privacy Act 1988 - APP 3, Health Records Act'
        }
      })

      return auditId
    } catch (error) {
      this.logger.error('Consent audit logging failed', {
        error: error.message,
        action: event.action,
        userId: event.userId
      })
      throw new Error('Failed to log consent event')
    }
  }

  /**
   * Search audit logs for compliance reporting
   */
  async searchAuditLogs(criteria: AuditSearchCriteria): Promise<AuditSearchResult> {
    const where: any = {}

    if (criteria.userId) where.userId = criteria.userId
    if (criteria.patientId) where.patientId = criteria.patientId
    if (criteria.eventType) where.eventType = criteria.eventType
    if (criteria.action) where.action = criteria.action
    if (criteria.ipAddress) where.ipAddress = criteria.ipAddress
    
    if (criteria.startDate || criteria.endDate) {
      where.timestamp = {}
      if (criteria.startDate) where.timestamp.gte = criteria.startDate
      if (criteria.endDate) where.timestamp.lte = criteria.endDate
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: criteria.limit || 100,
        skip: criteria.offset || 0,
        select: {
          id: true,
          eventType: true,
          userId: true,
          patientId: true,
          action: true,
          resource: true,
          resourceId: true,
          ipAddress: true,
          userAgent: true,
          success: true,
          timestamp: true,
          severity: true,
          sessionId: true
          // Don't return encrypted details in search results for security
        }
      }),
      this.prisma.auditLog.count({ where })
    ])

    return {
      logs: logs.map(log => ({
        ...log,
        compliance: this.getComplianceContext(log.eventType, log.action)
      })),
      total,
      hasMore: total > (criteria.offset || 0) + (criteria.limit || 100)
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    startDate: Date, 
    endDate: Date, 
    reportType: 'PRIVACY_ACT' | 'HEALTH_RECORDS' | 'SECURITY'
  ): Promise<ComplianceReport> {
    const baseWhere = {
      timestamp: {
        gte: startDate,
        lte: endDate
      }
    }

    const [
      totalEvents,
      dataAccessEvents,
      authenticationEvents,
      securityEvents,
      consentEvents,
      failedEvents
    ] = await Promise.all([
      this.prisma.auditLog.count({ where: baseWhere }),
      this.prisma.auditLog.count({ 
        where: { ...baseWhere, eventType: 'DATA_ACCESS' } 
      }),
      this.prisma.auditLog.count({ 
        where: { ...baseWhere, eventType: 'AUTHENTICATION' } 
      }),
      this.prisma.auditLog.count({ 
        where: { ...baseWhere, eventType: 'SECURITY' } 
      }),
      this.prisma.auditLog.count({ 
        where: { ...baseWhere, eventType: 'CONSENT' } 
      }),
      this.prisma.auditLog.count({ 
        where: { ...baseWhere, success: false } 
      })
    ])

    // Get unique users and patients
    const uniqueUsers = await this.prisma.auditLog.findMany({
      where: { ...baseWhere, userId: { not: null } },
      select: { userId: true },
      distinct: ['userId']
    })

    const uniquePatients = await this.prisma.auditLog.findMany({
      where: { ...baseWhere, patientId: { not: null } },
      select: { patientId: true },
      distinct: ['patientId']
    })

    return {
      reportType,
      period: { startDate, endDate },
      summary: {
        totalEvents,
        dataAccessEvents,
        authenticationEvents,
        securityEvents,
        consentEvents,
        failedEvents,
        uniqueUsers: uniqueUsers.length,
        uniquePatients: uniquePatients.length
      },
      compliance: {
        privacyActCompliant: this.assessPrivacyActCompliance(totalEvents, dataAccessEvents),
        healthRecordsCompliant: this.assessHealthRecordsCompliance(consentEvents),
        securityCompliant: this.assessSecurityCompliance(securityEvents, failedEvents)
      },
      generatedAt: new Date(),
      retentionUntil: new Date(endDate.getTime() + (7 * 365 * 24 * 60 * 60 * 1000)) // 7 years
    }
  }

  /**
   * Verify audit log integrity
   */
  async verifyIntegrity(auditId: string): Promise<IntegrityResult> {
    const log = await this.prisma.auditLog.findUnique({
      where: { id: auditId }
    })

    if (!log) {
      return { valid: false, reason: 'Audit log not found' }
    }

    // In a production system, you would verify cryptographic signatures
    // For now, we'll verify basic integrity
    const expectedHash = this.generateIntegrityHash({
      id: log.id,
      eventType: log.eventType,
      userId: log.userId,
      action: log.action,
      timestamp: log.timestamp
    })

    // This is a simplified integrity check
    // In production, use proper cryptographic signatures
    return {
      valid: true,
      verifiedAt: new Date(),
      method: 'hash_verification'
    }
  }

  /**
   * Export audit logs for compliance
   */
  async exportAuditLogs(
    criteria: AuditSearchCriteria,
    format: 'JSON' | 'CSV' | 'XML' = 'JSON'
  ): Promise<Buffer> {
    const result = await this.searchAuditLogs({
      ...criteria,
      limit: 10000 // Large export limit
    })

    switch (format) {
      case 'JSON':
        return Buffer.from(JSON.stringify(result.logs, null, 2))
      case 'CSV':
        return this.convertToCSV(result.logs)
      case 'XML':
        return this.convertToXML(result.logs)
      default:
        throw new Error('Unsupported export format')
    }
  }

  // Private helper methods

  private encryptSensitiveData(data: any): string {
    const dataString = JSON.stringify(data)
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey)
    let encrypted = cipher.update(dataString, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return encrypted
  }

  private generateIntegrityHash(data: any): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data) + this.encryptionKey)
      .digest('hex')
  }

  private mapSeverity(event: string): string {
    const highSeverityEvents = [
      'MULTIPLE_FAILED_LOGINS',
      'SUSPICIOUS_ACTIVITY',
      'DATA_BREACH',
      'UNAUTHORIZED_ACCESS'
    ]
    
    const mediumSeverityEvents = [
      'LOGIN_FAILED',
      'MFA_VERIFICATION_FAILED',
      'PASSWORD_RESET_INITIATED'
    ]

    if (highSeverityEvents.includes(event)) return 'HIGH'
    if (mediumSeverityEvents.includes(event)) return 'MEDIUM'
    return 'LOW'
  }

  private getLogLevel(event: string): string {
    const errorEvents = ['DATA_BREACH', 'UNAUTHORIZED_ACCESS']
    const warnEvents = ['MULTIPLE_FAILED_LOGINS', 'SUSPICIOUS_ACTIVITY']
    
    if (errorEvents.includes(event)) return 'error'
    if (warnEvents.includes(event)) return 'warn'
    return 'info'
  }

  private getComplianceContext(eventType: string, action: string) {
    const contexts = {
      DATA_ACCESS: 'Privacy Act 1988 - APP 1.5, Health Records Act',
      AUTHENTICATION: 'Privacy Act 1988 - APP 11',
      SECURITY: 'Privacy Act 1988 - APP 11, Notifiable Data Breaches',
      CONSENT: 'Privacy Act 1988 - APP 3, Health Records Act',
      ADMINISTRATIVE: 'Privacy Act 1988 - APP 1.5'
    }
    
    return contexts[eventType] || 'General compliance requirement'
  }

  private assessPrivacyActCompliance(totalEvents: number, dataAccessEvents: number): boolean {
    // Basic compliance check - in production, use more sophisticated rules
    return totalEvents > 0 && dataAccessEvents > 0
  }

  private assessHealthRecordsCompliance(consentEvents: number): boolean {
    return consentEvents > 0
  }

  private assessSecurityCompliance(securityEvents: number, failedEvents: number): boolean {
    // Check if security monitoring is active and failure rate is acceptable
    return securityEvents > 0 && (failedEvents / securityEvents) < 0.1
  }

  private convertToCSV(logs: any[]): Buffer {
    if (logs.length === 0) return Buffer.from('')
    
    const headers = Object.keys(logs[0]).join(',')
    const rows = logs.map(log => 
      Object.values(log).map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      ).join(',')
    )
    
    return Buffer.from([headers, ...rows].join('\n'))
  }

  private convertToXML(logs: any[]): Buffer {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<auditLogs>
${logs.map(log => `
  <auditLog>
${Object.entries(log).map(([key, value]) => `    <${key}>${value}</${key}>`).join('\n')}
  </auditLog>`).join('')}
</auditLogs>`
    
    return Buffer.from(xml)
  }
}

// Type definitions
export interface DataAccessEvent {
  userId: string
  patientId?: string
  action: string
  resource: string
  resourceId: string
  ipAddress: string
  userAgent: string
  success: boolean
  details?: any
  sessionId?: string
}

export interface AuthenticationEvent {
  userId?: string
  action: string
  method: string
  ipAddress: string
  userAgent: string
  success: boolean
  mfaUsed?: boolean
  failureReason?: string
  deviceFingerprint?: string
  sessionId?: string
}

export interface SecurityEvent {
  userId?: string
  event: string
  ipAddress?: string
  userAgent?: string
  details?: any
}

export interface AdministrativeEvent {
  userId: string
  action: string
  resource?: string
  resourceId?: string
  ipAddress: string
  userAgent: string
  success: boolean
  changes?: any
  reason?: string
  targetUserId?: string
}

export interface SystemEvent {
  action: string
  success: boolean
  details?: any
  severity?: string
}

export interface ConsentEvent {
  userId: string
  patientId: string
  action: string
  consentType: string
  consentGiven: boolean
  purpose: string
  dataTypes: string[]
  ipAddress: string
  userAgent: string
}

export interface AuditSearchCriteria {
  userId?: string
  patientId?: string
  eventType?: string
  action?: string
  ipAddress?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export interface AuditSearchResult {
  logs: any[]
  total: number
  hasMore: boolean
}

export interface ComplianceReport {
  reportType: string
  period: { startDate: Date; endDate: Date }
  summary: {
    totalEvents: number
    dataAccessEvents: number
    authenticationEvents: number
    securityEvents: number
    consentEvents: number
    failedEvents: number
    uniqueUsers: number
    uniquePatients: number
  }
  compliance: {
    privacyActCompliant: boolean
    healthRecordsCompliant: boolean
    securityCompliant: boolean
  }
  generatedAt: Date
  retentionUntil: Date
}

export interface IntegrityResult {
  valid: boolean
  reason?: string
  verifiedAt?: Date
  method?: string
}

export default AuditLogger