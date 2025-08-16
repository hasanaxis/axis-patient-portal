import { PrismaClient } from '@prisma/client'
import { randomBytes, createHash } from 'crypto'
import { addDays, addMinutes } from 'date-fns'

export interface CreateShareRequest {
  studyId: string
  patientId: string
  shareType: ShareType
  recipientType: RecipientType
  recipientName: string
  recipientEmail?: string
  recipientPhone?: string
  recipientId?: string
  
  // Access Control
  permissionLevel?: SharePermissionLevel
  includeStudy?: boolean
  includeReport?: boolean
  includeImages?: boolean
  specificSeries?: string[]
  
  // Time Controls
  accessWindow?: number // Days
  maxAccesses?: number
  
  // Purpose and messaging
  purpose?: string
  message?: string
  urgency?: ShareUrgency
  
  // GP Workflow
  recommendFollowUp?: boolean
  followUpMessage?: string
  gpContactDetails?: string
  
  // Security
  ipWhitelist?: string[]
  deviceFingerprint?: string
  
  // Creator
  createdBy: string
}

export interface ShareResult {
  success: boolean
  shareId?: string
  accessUrl?: string
  accessToken?: string
  message: string
  errors?: string[]
}

export interface ShareValidation {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

// Type imports for enums
type ShareType = 'GP_REFERRAL' | 'SPECIALIST' | 'SECOND_OPINION' | 'EMERGENCY' | 'FAMILY_MEMBER' | 'EXTERNAL_DOCTOR' | 'RESEARCH' | 'LEGAL' | 'INSURANCE' | 'PATIENT_COPY'
type RecipientType = 'REFERRING_GP' | 'SPECIALIST' | 'EXTERNAL_DOCTOR' | 'FAMILY_MEMBER' | 'PATIENT' | 'LEGAL_REPRESENTATIVE' | 'INSURANCE_COMPANY' | 'RESEARCH_INSTITUTION' | 'HEALTHCARE_PROVIDER'
type SharePermissionLevel = 'VIEW_ONLY' | 'VIEW_DOWNLOAD' | 'FULL_ACCESS'
type ShareUrgency = 'ROUTINE' | 'URGENT' | 'EMERGENCY' | 'CRITICAL'
type ShareStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'SUSPENDED' | 'PENDING'

export class StudySharingService {
  private prisma: PrismaClient
  private baseUrl: string

  constructor(prisma: PrismaClient, baseUrl: string = 'https://portal.axisimaging.com.au') {
    this.prisma = prisma
    this.baseUrl = baseUrl
  }

  async createShare(request: CreateShareRequest): Promise<ShareResult> {
    try {
      // Validate the request
      const validation = await this.validateShareRequest(request)
      if (!validation.isValid) {
        return {
          success: false,
          message: 'Share request validation failed',
          errors: validation.errors
        }
      }

      // Check patient consent
      const hasConsent = await this.checkPatientConsent(request.patientId, request.shareType)
      if (!hasConsent) {
        return {
          success: false,
          message: 'Patient has not consented to this type of sharing'
        }
      }

      // Generate secure access token and URL
      const accessToken = this.generateSecureToken()
      const accessUrl = this.generateAccessUrl(accessToken)

      // Calculate expiry date
      const accessWindow = request.accessWindow || 30
      const expiresAt = addDays(new Date(), accessWindow)

      // Create the share record
      const studyShare = await this.prisma.studyShare.create({
        data: {
          studyId: request.studyId,
          patientId: request.patientId,
          shareType: request.shareType as any,
          recipientType: request.recipientType as any,
          recipientName: request.recipientName,
          recipientEmail: request.recipientEmail,
          recipientPhone: request.recipientPhone,
          recipientId: request.recipientId,
          
          accessToken,
          accessUrl,
          permissionLevel: (request.permissionLevel || 'VIEW_ONLY') as any,
          
          includeStudy: request.includeStudy ?? true,
          includeReport: request.includeReport ?? true,
          includeImages: request.includeImages ?? false,
          specificSeries: request.specificSeries || [],
          
          expiresAt,
          accessWindow,
          maxAccesses: request.maxAccesses,
          
          purpose: request.purpose,
          message: request.message,
          urgency: (request.urgency || 'ROUTINE') as any,
          
          recommendFollowUp: request.recommendFollowUp ?? true,
          followUpMessage: request.followUpMessage,
          gpContactDetails: request.gpContactDetails,
          
          ipWhitelist: request.ipWhitelist || [],
          deviceFingerprint: request.deviceFingerprint,
          
          createdBy: request.createdBy
        }
      })

      // Create audit log
      await this.createShareAuditLog(studyShare.id, 'CREATED', 'STAFF', request.createdBy, 'Share created', {
        shareType: request.shareType,
        recipientType: request.recipientType,
        recipientName: request.recipientName
      })

      // Send notification if email provided
      if (request.recipientEmail) {
        await this.sendShareNotification(studyShare.id)
      }

      return {
        success: true,
        shareId: studyShare.id,
        accessUrl: accessUrl,
        accessToken: accessToken,
        message: `Share created successfully. Access will expire on ${expiresAt.toLocaleDateString()}.`
      }

    } catch (error) {
      console.error('Error creating share:', error)
      return {
        success: false,
        message: 'Failed to create share. Please try again.'
      }
    }
  }

  async accessShare(accessToken: string, accessorInfo: {
    ipAddress: string
    userAgent?: string
    location?: any
    deviceInfo?: any
    accessMethod: 'DIRECT_LINK' | 'EMAIL_LINK' | 'SMS_LINK' | 'QR_CODE' | 'SECURE_PORTAL'
  }): Promise<{
    success: boolean
    share?: any
    study?: any
    report?: any
    message: string
    remainingAccesses?: number
  }> {
    try {
      // Find the share
      const share = await this.prisma.studyShare.findUnique({
        where: { accessToken },
        include: {
          study: {
            include: {
              series: true,
              report: true,
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  dateOfBirth: true,
                  patientNumber: true
                }
              }
            }
          }
        }
      })

      if (!share) {
        return {
          success: false,
          message: 'Invalid or expired share link'
        }
      }

      // Check if share is still active
      if (share.status !== 'ACTIVE') {
        return {
          success: false,
          message: 'This share is no longer available'
        }
      }

      // Check if expired
      if (share.expiresAt < new Date()) {
        await this.expireShare(share.id)
        return {
          success: false,
          message: 'This share has expired'
        }
      }

      // Check access count limits
      if (share.maxAccesses && share.accessCount >= share.maxAccesses) {
        return {
          success: false,
          message: 'Maximum number of accesses reached'
        }
      }

      // Check IP whitelist if configured
      if (share.ipWhitelist.length > 0 && !share.ipWhitelist.includes(accessorInfo.ipAddress)) {
        await this.createShareAuditLog(share.id, 'ACCESSED', 'RECIPIENT', null, 'Access denied - IP not in whitelist', {
          ipAddress: accessorInfo.ipAddress,
          denied: true
        })
        return {
          success: false,
          message: 'Access denied from this location'
        }
      }

      // Record the access
      const shareAccess = await this.prisma.shareAccess.create({
        data: {
          studyShareId: share.id,
          ipAddress: accessorInfo.ipAddress,
          userAgent: accessorInfo.userAgent,
          location: accessorInfo.location,
          accessMethod: accessorInfo.accessMethod as any,
          deviceInfo: accessorInfo.deviceInfo,
          viewedStudy: true
        }
      })

      // Update access count and last accessed
      await this.prisma.studyShare.update({
        where: { id: share.id },
        data: {
          accessCount: { increment: 1 },
          lastAccessedAt: new Date(),
          lastAccessedBy: share.recipientEmail || 'Unknown',
          lastAccessedIp: accessorInfo.ipAddress
        }
      })

      // Create audit log
      await this.createShareAuditLog(share.id, 'ACCESSED', 'RECIPIENT', null, 'Share accessed successfully', {
        ipAddress: accessorInfo.ipAddress,
        accessMethod: accessorInfo.accessMethod
      })

      const remainingAccesses = share.maxAccesses ? share.maxAccesses - (share.accessCount + 1) : undefined

      return {
        success: true,
        share: {
          id: share.id,
          shareType: share.shareType,
          permissionLevel: share.permissionLevel,
          includeStudy: share.includeStudy,
          includeReport: share.includeReport,
          includeImages: share.includeImages,
          message: share.message,
          recommendFollowUp: share.recommendFollowUp,
          followUpMessage: share.followUpMessage,
          gpContactDetails: share.gpContactDetails,
          expiresAt: share.expiresAt
        },
        study: share.study,
        report: share.includeReport ? share.study.report : null,
        message: 'Access granted',
        remainingAccesses
      }

    } catch (error) {
      console.error('Error accessing share:', error)
      return {
        success: false,
        message: 'Failed to access share'
      }
    }
  }

  async revokeShare(shareId: string, revokedBy: string, reason?: string): Promise<boolean> {
    try {
      await this.prisma.studyShare.update({
        where: { id: shareId },
        data: {
          status: 'REVOKED',
          isRevoked: true,
          revokedAt: new Date(),
          revokedBy,
          revokeReason: reason
        }
      })

      await this.createShareAuditLog(shareId, 'REVOKED', 'STAFF', revokedBy, 'Share revoked', {
        reason
      })

      return true
    } catch (error) {
      console.error('Error revoking share:', error)
      return false
    }
  }

  async getShareActivity(shareId: string): Promise<{
    share: any
    accesses: any[]
    auditLogs: any[]
  } | null> {
    try {
      const share = await this.prisma.studyShare.findUnique({
        where: { id: shareId },
        include: {
          accesses: {
            orderBy: { accessedAt: 'desc' }
          },
          auditLogs: {
            orderBy: { createdAt: 'desc' }
          },
          study: {
            select: {
              studyInstanceUID: true,
              studyDate: true,
              modality: true,
              patient: {
                select: {
                  firstName: true,
                  lastName: true,
                  patientNumber: true
                }
              }
            }
          }
        }
      })

      return share
    } catch (error) {
      console.error('Error getting share activity:', error)
      return null
    }
  }

  async getPatientShares(patientId: string, includeExpired: boolean = false): Promise<any[]> {
    try {
      const whereClause: any = { patientId }
      
      if (!includeExpired) {
        whereClause.AND = [
          { status: 'ACTIVE' },
          { expiresAt: { gt: new Date() } }
        ]
      }

      const shares = await this.prisma.studyShare.findMany({
        where: whereClause,
        include: {
          study: {
            select: {
              studyInstanceUID: true,
              studyDate: true,
              modality: true
            }
          },
          accesses: {
            select: {
              accessedAt: true,
              ipAddress: true
            },
            take: 1,
            orderBy: { accessedAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return shares
    } catch (error) {
      console.error('Error getting patient shares:', error)
      return []
    }
  }

  private async validateShareRequest(request: CreateShareRequest): Promise<ShareValidation> {
    const errors: string[] = []

    // Check if study exists
    const study = await this.prisma.study.findUnique({
      where: { id: request.studyId },
      select: { patientId: true, status: true }
    })

    if (!study) {
      errors.push('Study not found')
    } else if (study.patientId !== request.patientId) {
      errors.push('Patient ID does not match study')
    }

    // Validate required fields
    if (!request.recipientName?.trim()) {
      errors.push('Recipient name is required')
    }

    if (request.shareType === 'GP_REFERRAL' && !request.recipientEmail) {
      errors.push('Email is required for GP referral shares')
    }

    // Validate access window
    if (request.accessWindow && (request.accessWindow < 1 || request.accessWindow > 365)) {
      errors.push('Access window must be between 1 and 365 days')
    }

    // Validate max accesses
    if (request.maxAccesses && request.maxAccesses < 1) {
      errors.push('Maximum accesses must be at least 1')
    }

    // Validate email format if provided
    if (request.recipientEmail && !this.isValidEmail(request.recipientEmail)) {
      errors.push('Invalid email format')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  private async checkPatientConsent(patientId: string, shareType: ShareType): Promise<boolean> {
    try {
      const consent = await this.prisma.shareConsent.findFirst({
        where: {
          patientId,
          consentGiven: true,
          OR: [
            { consentType: 'GENERAL_SHARING' },
            { consentType: shareType === 'GP_REFERRAL' ? 'GP_SHARING' : 'SPECIALIST_SHARING' }
          ]
        }
      })

      return !!consent
    } catch (error) {
      console.error('Error checking patient consent:', error)
      return false
    }
  }

  private generateSecureToken(): string {
    return randomBytes(32).toString('hex')
  }

  private generateAccessUrl(token: string): string {
    return `${this.baseUrl}/share/${token}`
  }

  private async expireShare(shareId: string): Promise<void> {
    await this.prisma.studyShare.update({
      where: { id: shareId },
      data: { status: 'EXPIRED' }
    })

    await this.createShareAuditLog(shareId, 'EXPIRED', 'SYSTEM', null, 'Share expired automatically')
  }

  private async createShareAuditLog(
    shareId: string,
    action: string,
    actorType: string,
    actorId?: string | null,
    description?: string,
    metadata?: any
  ): Promise<void> {
    try {
      await this.prisma.shareAuditLog.create({
        data: {
          studyShareId: shareId,
          action: action as any,
          actorType: actorType as any,
          actorId,
          description,
          oldValues: metadata?.oldValues,
          newValues: metadata?.newValues,
          gdprBasis: 'Legitimate interest - healthcare provision',
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent
        }
      })
    } catch (error) {
      console.error('Error creating share audit log:', error)
    }
  }

  private async sendShareNotification(shareId: string): Promise<void> {
    // This would integrate with email service
    // For now, just mark that notification was sent
    await this.prisma.studyShare.update({
      where: { id: shareId },
      data: {
        notificationSent: true,
        emailSentAt: new Date()
      }
    })
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Cleanup expired shares (run as scheduled job)
  async cleanupExpiredShares(): Promise<number> {
    try {
      const result = await this.prisma.studyShare.updateMany({
        where: {
          status: 'ACTIVE',
          expiresAt: { lt: new Date() }
        },
        data: {
          status: 'EXPIRED'
        }
      })

      console.log(`Expired ${result.count} shares`)
      return result.count
    } catch (error) {
      console.error('Error cleaning up expired shares:', error)
      return 0
    }
  }
}