import { PrismaClient } from '@prisma/client'

export interface AuditLogRequest {
  shareId?: string
  patientId: string
  userId?: string
  action: AuditAction
  entityType: EntityType
  entityId: string
  details: string
  metadata?: any
  ipAddress?: string
  userAgent?: string
  location?: string
  severity?: LogSeverity
}

export interface ShareAccessLog {
  shareId: string
  accessorId?: string
  accessorName?: string
  accessorEmail?: string
  ipAddress: string
  userAgent?: string
  location?: string
  accessType: AccessType
  viewedReport?: boolean
  viewedImages?: boolean
  downloadedFiles?: string[]
  timeSpent?: number
  deviceInfo?: any
}

// Type definitions
type AuditAction = 
  | 'SHARE_CREATED' | 'SHARE_ACCESSED' | 'SHARE_REVOKED' | 'SHARE_EXPIRED'
  | 'CONSENT_GIVEN' | 'CONSENT_WITHDRAWN' | 'CONSENT_UPDATED'
  | 'EXPORT_CREATED' | 'EXPORT_DOWNLOADED' | 'EXPORT_EXPIRED'
  | 'GP_NOTIFIED' | 'PATIENT_NOTIFIED' | 'EMAIL_SENT' | 'SMS_SENT'
  | 'LOGIN_ATTEMPT' | 'PASSWORD_RESET' | 'DATA_MODIFIED' | 'UNAUTHORIZED_ACCESS'

type EntityType = 'STUDY_SHARE' | 'SHARE_CONSENT' | 'REPORT_EXPORT' | 'PATIENT' | 'STUDY' | 'REPORT' | 'USER'

type LogSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

type AccessType = 'VIEW' | 'DOWNLOAD' | 'PRINT' | 'SHARE' | 'MODIFY' | 'DELETE'

export class AuditTrailService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async logAction(request: AuditLogRequest): Promise<void> {
    try {
      await this.prisma.shareAuditLog.create({
        data: {
          shareId: request.shareId,
          patientId: request.patientId,
          userId: request.userId,
          action: request.action as any,
          entityType: request.entityType as any,
          entityId: request.entityId,
          details: request.details,
          metadata: request.metadata || {},
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
          location: request.location,
          severity: (request.severity || 'MEDIUM') as any,
          timestamp: new Date()
        }
      })
    } catch (error) {
      console.error('Error logging audit action:', error)
      // Ensure audit failures don't break main functionality
    }
  }

  async logShareAccess(accessLog: ShareAccessLog): Promise<void> {
    try {
      await this.prisma.shareAccess.create({
        data: {
          shareId: accessLog.shareId,
          accessorId: accessLog.accessorId,
          accessorName: accessLog.accessorName,
          accessorEmail: accessLog.accessorEmail,
          ipAddress: accessLog.ipAddress,
          userAgent: accessLog.userAgent,
          location: accessLog.location,
          accessType: accessLog.accessType as any,
          viewedReport: accessLog.viewedReport || false,
          viewedImages: accessLog.viewedImages || false,
          downloadedFiles: accessLog.downloadedFiles || [],
          timeSpent: accessLog.timeSpent,
          deviceInfo: accessLog.deviceInfo,
          accessedAt: new Date()
        }
      })

      // Log the access action
      await this.logAction({
        shareId: accessLog.shareId,
        patientId: (await this.getSharePatientId(accessLog.shareId))!,
        action: 'SHARE_ACCESSED',
        entityType: 'STUDY_SHARE',
        entityId: accessLog.shareId,
        details: `Share accessed by ${accessLog.accessorName || accessLog.accessorEmail || 'Unknown'} from ${accessLog.ipAddress}`,
        metadata: {
          accessType: accessLog.accessType,
          viewedReport: accessLog.viewedReport,
          viewedImages: accessLog.viewedImages,
          timeSpent: accessLog.timeSpent
        },
        ipAddress: accessLog.ipAddress,
        userAgent: accessLog.userAgent,
        location: accessLog.location,
        severity: 'MEDIUM'
      })
    } catch (error) {
      console.error('Error logging share access:', error)
    }
  }

  async getShareAuditTrail(shareId: string): Promise<any[]> {
    try {
      const auditLogs = await this.prisma.shareAuditLog.findMany({
        where: { shareId },
        orderBy: { timestamp: 'desc' }
      })

      const accessLogs = await this.prisma.shareAccess.findMany({
        where: { shareId },
        orderBy: { accessedAt: 'desc' }
      })

      // Combine and sort by timestamp
      const combinedLogs = [
        ...auditLogs.map(log => ({
          type: 'audit',
          timestamp: log.timestamp,
          action: log.action,
          details: log.details,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          severity: log.severity,
          metadata: log.metadata
        })),
        ...accessLogs.map(log => ({
          type: 'access',
          timestamp: log.accessedAt,
          action: `ACCESS_${log.accessType}`,
          details: `Accessed by ${log.accessorName || log.accessorEmail}`,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          accessorName: log.accessorName,
          accessorEmail: log.accessorEmail,
          viewedReport: log.viewedReport,
          viewedImages: log.viewedImages,
          timeSpent: log.timeSpent
        }))
      ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

      return combinedLogs
    } catch (error) {
      console.error('Error getting share audit trail:', error)
      return []
    }
  }

  async getPatientAuditTrail(
    patientId: string, 
    options: {
      startDate?: Date
      endDate?: Date
      actions?: AuditAction[]
      severity?: LogSeverity[]
      limit?: number
    } = {}
  ): Promise<any[]> {
    try {
      const whereClause: any = { patientId }

      if (options.startDate || options.endDate) {
        whereClause.timestamp = {}
        if (options.startDate) whereClause.timestamp.gte = options.startDate
        if (options.endDate) whereClause.timestamp.lte = options.endDate
      }

      if (options.actions && options.actions.length > 0) {
        whereClause.action = { in: options.actions }
      }

      if (options.severity && options.severity.length > 0) {
        whereClause.severity = { in: options.severity }
      }

      const auditLogs = await this.prisma.shareAuditLog.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        take: options.limit || 100,
        include: {
          share: {
            select: {
              recipientName: true,
              recipientEmail: true,
              shareType: true
            }
          }
        }
      })

      return auditLogs.map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        action: log.action,
        entityType: log.entityType,
        details: log.details,
        severity: log.severity,
        ipAddress: log.ipAddress,
        location: log.location,
        share: log.share,
        metadata: log.metadata
      }))
    } catch (error) {
      console.error('Error getting patient audit trail:', error)
      return []
    }
  }

  async getSystemAuditSummary(options: {
    startDate?: Date
    endDate?: Date
    groupBy?: 'day' | 'week' | 'month'
  } = {}): Promise<{
    totalActions: number
    actionsByType: Record<string, number>
    securityEvents: number
    criticalEvents: number
    topPatients: Array<{ patientId: string, actionCount: number }>
    topShares: Array<{ shareId: string, accessCount: number }>
  }> {
    try {
      const whereClause: any = {}

      if (options.startDate || options.endDate) {
        whereClause.timestamp = {}
        if (options.startDate) whereClause.timestamp.gte = options.startDate
        if (options.endDate) whereClause.timestamp.lte = options.endDate
      }

      // Get total actions
      const totalActions = await this.prisma.shareAuditLog.count({ where: whereClause })

      // Get actions by type
      const actionGroups = await this.prisma.shareAuditLog.groupBy({
        by: ['action'],
        where: whereClause,
        _count: { action: true }
      })

      const actionsByType = actionGroups.reduce((acc, group) => {
        acc[group.action] = group._count.action
        return acc
      }, {} as Record<string, number>)

      // Get security events (unauthorized access, failed logins, etc.)
      const securityEvents = await this.prisma.shareAuditLog.count({
        where: {
          ...whereClause,
          action: { in: ['UNAUTHORIZED_ACCESS', 'LOGIN_ATTEMPT'] }
        }
      })

      // Get critical events
      const criticalEvents = await this.prisma.shareAuditLog.count({
        where: {
          ...whereClause,
          severity: 'CRITICAL'
        }
      })

      // Get top patients by activity
      const patientGroups = await this.prisma.shareAuditLog.groupBy({
        by: ['patientId'],
        where: whereClause,
        _count: { patientId: true },
        orderBy: { _count: { patientId: 'desc' } },
        take: 10
      })

      const topPatients = patientGroups.map(group => ({
        patientId: group.patientId,
        actionCount: group._count.patientId
      }))

      // Get top shares by access count
      const shareGroups = await this.prisma.shareAccess.groupBy({
        by: ['shareId'],
        _count: { shareId: true },
        orderBy: { _count: { shareId: 'desc' } },
        take: 10
      })

      const topShares = shareGroups.map(group => ({
        shareId: group.shareId,
        accessCount: group._count.shareId
      }))

      return {
        totalActions,
        actionsByType,
        securityEvents,
        criticalEvents,
        topPatients,
        topShares
      }
    } catch (error) {
      console.error('Error getting system audit summary:', error)
      return {
        totalActions: 0,
        actionsByType: {},
        securityEvents: 0,
        criticalEvents: 0,
        topPatients: [],
        topShares: []
      }
    }
  }

  async detectSuspiciousActivity(patientId?: string): Promise<{
    suspiciousActivities: Array<{
      type: string
      description: string
      severity: LogSeverity
      occurrences: number
      lastOccurrence: Date
      details: any
    }>
  }> {
    try {
      const suspiciousActivities = []
      const now = new Date()
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

      const whereClause: any = {
        timestamp: { gte: oneDayAgo }
      }

      if (patientId) {
        whereClause.patientId = patientId
      }

      // Check for multiple failed access attempts
      const failedAccesses = await this.prisma.shareAuditLog.groupBy({
        by: ['ipAddress'],
        where: {
          ...whereClause,
          action: 'UNAUTHORIZED_ACCESS'
        },
        _count: { ipAddress: true },
        having: {
          ipAddress: { _count: { gt: 5 } }
        }
      })

      for (const failed of failedAccesses) {
        suspiciousActivities.push({
          type: 'MULTIPLE_FAILED_ACCESS',
          description: `Multiple failed access attempts from IP ${failed.ipAddress}`,
          severity: 'HIGH' as LogSeverity,
          occurrences: failed._count.ipAddress,
          lastOccurrence: now,
          details: { ipAddress: failed.ipAddress }
        })
      }

      // Check for unusual access patterns (same share accessed from multiple IPs)
      const multipleIpAccess = await this.prisma.shareAccess.groupBy({
        by: ['shareId'],
        where: {
          accessedAt: { gte: oneHourAgo }
        },
        _count: { ipAddress: true },
        having: {
          ipAddress: { _count: { gt: 3 } }
        }
      })

      for (const access of multipleIpAccess) {
        const shareDetails = await this.prisma.studyShare.findUnique({
          where: { id: access.shareId },
          select: { recipientName: true, recipientEmail: true }
        })

        suspiciousActivities.push({
          type: 'MULTIPLE_IP_ACCESS',
          description: `Share accessed from multiple IP addresses within one hour`,
          severity: 'MEDIUM' as LogSeverity,
          occurrences: access._count.ipAddress,
          lastOccurrence: now,
          details: { 
            shareId: access.shareId,
            recipient: shareDetails?.recipientName
          }
        })
      }

      // Check for downloads from expired shares
      const expiredShareAccess = await this.prisma.shareAccess.findMany({
        where: {
          accessedAt: { gte: oneDayAgo },
          share: {
            expiresAt: { lt: now }
          }
        },
        include: {
          share: {
            select: { recipientName: true, expiresAt: true }
          }
        }
      })

      if (expiredShareAccess.length > 0) {
        suspiciousActivities.push({
          type: 'EXPIRED_SHARE_ACCESS',
          description: 'Attempts to access expired shares detected',
          severity: 'HIGH' as LogSeverity,
          occurrences: expiredShareAccess.length,
          lastOccurrence: expiredShareAccess[0].accessedAt,
          details: {
            shares: expiredShareAccess.map(access => ({
              shareId: access.shareId,
              recipient: access.share.recipientName,
              expiredAt: access.share.expiresAt
            }))
          }
        })
      }

      return { suspiciousActivities }
    } catch (error) {
      console.error('Error detecting suspicious activity:', error)
      return { suspiciousActivities: [] }
    }
  }

  async exportAuditReport(
    patientId: string,
    options: {
      startDate?: Date
      endDate?: Date
      format: 'CSV' | 'PDF' | 'JSON'
      includeAccess?: boolean
    }
  ): Promise<{
    success: boolean
    filePath?: string
    fileName?: string
    message: string
  }> {
    try {
      const auditLogs = await this.getPatientAuditTrail(patientId, {
        startDate: options.startDate,
        endDate: options.endDate
      })

      let accessLogs: any[] = []
      if (options.includeAccess) {
        accessLogs = await this.prisma.shareAccess.findMany({
          where: {
            share: { patientId },
            accessedAt: {
              gte: options.startDate,
              lte: options.endDate
            }
          },
          include: {
            share: {
              select: {
                recipientName: true,
                shareType: true,
                createdAt: true
              }
            }
          },
          orderBy: { accessedAt: 'desc' }
        })
      }

      const fileName = `audit_report_${patientId}_${new Date().toISOString().split('T')[0]}.${options.format.toLowerCase()}`
      const filePath = `/var/exports/audit/${fileName}`

      // Generate the report based on format
      switch (options.format) {
        case 'JSON':
          await this.generateJSONReport(filePath, { auditLogs, accessLogs })
          break
        case 'CSV':
          await this.generateCSVReport(filePath, { auditLogs, accessLogs })
          break
        case 'PDF':
          await this.generatePDFReport(filePath, { auditLogs, accessLogs }, patientId)
          break
      }

      return {
        success: true,
        filePath,
        fileName,
        message: `Audit report generated successfully`
      }
    } catch (error) {
      console.error('Error exporting audit report:', error)
      return {
        success: false,
        message: 'Failed to generate audit report'
      }
    }
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

  private async generateJSONReport(filePath: string, data: any): Promise<void> {
    const fs = require('fs').promises
    await fs.writeFile(filePath, JSON.stringify(data, null, 2))
  }

  private async generateCSVReport(filePath: string, data: any): Promise<void> {
    // Implementation for CSV generation
    const fs = require('fs').promises
    let csvContent = 'Timestamp,Action,Details,IP Address,Severity\n'
    
    for (const log of data.auditLogs) {
      csvContent += `${log.timestamp},${log.action},${log.details},${log.ipAddress || ''},${log.severity}\n`
    }

    await fs.writeFile(filePath, csvContent)
  }

  private async generatePDFReport(filePath: string, data: any, patientId: string): Promise<void> {
    // Implementation for PDF generation using PDFKit
    // This would be similar to the ReportExportService PDF generation
    console.log(`PDF audit report generation not yet implemented for patient ${patientId}`)
  }
}