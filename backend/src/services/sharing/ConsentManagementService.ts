import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'

export interface ConsentRequest {
  patientId: string
  consentType: ShareConsentType
  consentGiven: boolean
  consentText: string
  
  // Specific Permissions
  allowGpSharing?: boolean
  allowSpecialistSharing?: boolean
  allowEmergencySharing?: boolean
  allowFamilySharing?: boolean
  allowResearchSharing?: boolean
  
  // Restrictions
  maxShareDuration?: number
  requireNotification?: boolean
  allowPrintExport?: boolean
  allowImageDownload?: boolean
  
  // Automatic Sharing Settings
  autoShareWithGp?: boolean
  autoShareReports?: boolean
  autoShareImages?: boolean
  
  // Legal and Digital Signature
  consentMethod: ConsentMethod
  consentLocation?: string
  witnessName?: string
  witnessSignature?: string
  patientSignature?: string
  
  // Digital context
  ipAddress?: string
  deviceInfo?: any
  
  // Metadata
  consentVersion?: string
  expiresAt?: Date
}

export interface ConsentUpdateRequest {
  consentId: string
  updatedBy: string
  changes: Partial<ConsentRequest>
  updateReason: string
}

export interface ConsentWithdrawalRequest {
  consentId: string
  patientId: string
  withdrawReason: string
  withdrawnBy: string
  effectiveDate?: Date
}

// Type definitions
type ShareConsentType = 'GENERAL_SHARING' | 'GP_SHARING' | 'SPECIALIST_SHARING' | 'FAMILY_SHARING' | 'EMERGENCY_SHARING' | 'RESEARCH_SHARING' | 'MARKETING_SHARING'
type ConsentMethod = 'DIGITAL_SIGNATURE' | 'VERBAL_WITNESSED' | 'WRITTEN_FORM' | 'ELECTRONIC_CONSENT' | 'PHONE_CONSENT'

export class ConsentManagementService {
  private prisma: PrismaClient
  private currentConsentVersion: string = '2024.1'

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async createConsent(request: ConsentRequest): Promise<{
    success: boolean
    consentId?: string
    message: string
    errors?: string[]
  }> {
    try {
      // Validate the consent request
      const validation = this.validateConsentRequest(request)
      if (!validation.isValid) {
        return {
          success: false,
          message: 'Consent validation failed',
          errors: validation.errors
        }
      }

      // Check for existing active consent of the same type
      const existingConsent = await this.prisma.shareConsent.findFirst({
        where: {
          patientId: request.patientId,
          consentType: request.consentType as any,
          consentGiven: true,
          withdrawnAt: null
        }
      })

      let newConsent

      if (existingConsent) {
        // Update existing consent (create new version)
        newConsent = await this.prisma.shareConsent.create({
          data: {
            ...this.mapConsentRequest(request),
            previousConsentId: existingConsent.id,
            consentVersion: request.consentVersion || this.currentConsentVersion
          }
        })

        // Mark previous consent as superseded
        await this.prisma.shareConsent.update({
          where: { id: existingConsent.id },
          data: { withdrawnAt: new Date(), withdrawReason: 'Superseded by new consent' }
        })
      } else {
        // Create new consent
        newConsent = await this.prisma.shareConsent.create({
          data: {
            ...this.mapConsentRequest(request),
            consentVersion: request.consentVersion || this.currentConsentVersion
          }
        })
      }

      // Create audit log
      await this.createConsentAuditLog(newConsent.id, 'CONSENT_GIVEN', request.patientId, 'Patient provided consent', {
        consentType: request.consentType,
        method: request.consentMethod,
        ipAddress: request.ipAddress
      })

      return {
        success: true,
        consentId: newConsent.id,
        message: 'Consent recorded successfully'
      }

    } catch (error) {
      console.error('Error creating consent:', error)
      return {
        success: false,
        message: 'Failed to record consent. Please try again.'
      }
    }
  }

  async withdrawConsent(request: ConsentWithdrawalRequest): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const consent = await this.prisma.shareConsent.findUnique({
        where: { id: request.consentId }
      })

      if (!consent) {
        return {
          success: false,
          message: 'Consent record not found'
        }
      }

      if (consent.patientId !== request.patientId) {
        return {
          success: false,
          message: 'Unauthorized to withdraw this consent'
        }
      }

      if (consent.withdrawnAt) {
        return {
          success: false,
          message: 'Consent has already been withdrawn'
        }
      }

      // Update consent record
      await this.prisma.shareConsent.update({
        where: { id: request.consentId },
        data: {
          withdrawnAt: request.effectiveDate || new Date(),
          withdrawReason: request.withdrawReason
        }
      })

      // Create audit log
      await this.createConsentAuditLog(request.consentId, 'CONSENT_WITHDRAWN', request.patientId, 'Consent withdrawn', {
        reason: request.withdrawReason,
        withdrawnBy: request.withdrawnBy
      })

      // Revoke any active shares that depend on this consent
      await this.revokeSharesBasedOnConsent(request.patientId, consent.consentType)

      return {
        success: true,
        message: 'Consent withdrawn successfully'
      }

    } catch (error) {
      console.error('Error withdrawing consent:', error)
      return {
        success: false,
        message: 'Failed to withdraw consent. Please try again.'
      }
    }
  }

  async getPatientConsents(patientId: string, includeWithdrawn: boolean = false): Promise<any[]> {
    try {
      const whereClause: any = { patientId }
      
      if (!includeWithdrawn) {
        whereClause.withdrawnAt = null
      }

      const consents = await this.prisma.shareConsent.findMany({
        where: whereClause,
        orderBy: { consentedAt: 'desc' }
      })

      return consents.map(consent => ({
        id: consent.id,
        consentType: consent.consentType,
        consentGiven: consent.consentGiven,
        allowGpSharing: consent.allowGpSharing,
        allowSpecialistSharing: consent.allowSpecialistSharing,
        allowEmergencySharing: consent.allowEmergencySharing,
        allowFamilySharing: consent.allowFamilySharing,
        allowResearchSharing: consent.allowResearchSharing,
        maxShareDuration: consent.maxShareDuration,
        requireNotification: consent.requireNotification,
        allowPrintExport: consent.allowPrintExport,
        allowImageDownload: consent.allowImageDownload,
        autoShareWithGp: consent.autoShareWithGp,
        autoShareReports: consent.autoShareReports,
        autoShareImages: consent.autoShareImages,
        consentMethod: consent.consentMethod,
        consentedAt: consent.consentedAt,
        expiresAt: consent.expiresAt,
        withdrawnAt: consent.withdrawnAt,
        withdrawReason: consent.withdrawReason,
        consentVersion: consent.consentVersion,
        isActive: !consent.withdrawnAt && (!consent.expiresAt || consent.expiresAt > new Date())
      }))
    } catch (error) {
      console.error('Error getting patient consents:', error)
      return []
    }
  }

  async checkSharingPermission(
    patientId: string, 
    shareType: string,
    recipientType: string
  ): Promise<{
    allowed: boolean
    reason?: string
    restrictions?: any
  }> {
    try {
      // Get relevant consents
      const relevantConsentTypes = this.getRelevantConsentTypes(shareType, recipientType)
      
      const consents = await this.prisma.shareConsent.findMany({
        where: {
          patientId,
          consentType: { in: relevantConsentTypes as any[] },
          consentGiven: true,
          withdrawnAt: null,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        orderBy: { consentedAt: 'desc' }
      })

      if (consents.length === 0) {
        return {
          allowed: false,
          reason: 'No valid consent found for this type of sharing'
        }
      }

      // Check specific permissions based on share and recipient type
      const relevantConsent = consents[0] // Most recent valid consent
      const permission = this.evaluateSpecificPermissions(relevantConsent, shareType, recipientType)

      if (!permission.allowed) {
        return permission
      }

      // Return permissions with restrictions
      return {
        allowed: true,
        restrictions: {
          maxShareDuration: relevantConsent.maxShareDuration,
          requireNotification: relevantConsent.requireNotification,
          allowPrintExport: relevantConsent.allowPrintExport,
          allowImageDownload: relevantConsent.allowImageDownload,
          autoShare: {
            withGp: relevantConsent.autoShareWithGp,
            includeReports: relevantConsent.autoShareReports,
            includeImages: relevantConsent.autoShareImages
          }
        }
      }

    } catch (error) {
      console.error('Error checking sharing permission:', error)
      return {
        allowed: false,
        reason: 'Error checking permissions'
      }
    }
  }

  async getConsentRequirements(): Promise<{
    consentTypes: Array<{
      type: ShareConsentType
      name: string
      description: string
      required: boolean
      defaultSettings: any
    }>
    currentVersion: string
    legalText: Record<ShareConsentType, string>
  }> {
    return {
      consentTypes: [
        {
          type: 'GENERAL_SHARING',
          name: 'General Sharing Consent',
          description: 'Allows sharing of medical information with healthcare providers',
          required: true,
          defaultSettings: {
            allowGpSharing: true,
            allowSpecialistSharing: true,
            allowEmergencySharing: true,
            maxShareDuration: 90,
            requireNotification: true
          }
        },
        {
          type: 'GP_SHARING',
          name: 'GP Sharing Consent',
          description: 'Specific consent for sharing with General Practitioners',
          required: false,
          defaultSettings: {
            allowGpSharing: true,
            autoShareWithGp: false,
            autoShareReports: true,
            maxShareDuration: 90
          }
        },
        {
          type: 'SPECIALIST_SHARING',
          name: 'Specialist Sharing Consent',
          description: 'Consent for sharing with medical specialists',
          required: false,
          defaultSettings: {
            allowSpecialistSharing: true,
            maxShareDuration: 60
          }
        },
        {
          type: 'FAMILY_SHARING',
          name: 'Family Sharing Consent',
          description: 'Consent for sharing with authorized family members',
          required: false,
          defaultSettings: {
            allowFamilySharing: false,
            maxShareDuration: 30
          }
        },
        {
          type: 'EMERGENCY_SHARING',
          name: 'Emergency Sharing Consent',
          description: 'Consent for emergency medical situations',
          required: true,
          defaultSettings: {
            allowEmergencySharing: true,
            maxShareDuration: 7
          }
        },
        {
          type: 'RESEARCH_SHARING',
          name: 'Research Sharing Consent',
          description: 'Consent for anonymized research purposes',
          required: false,
          defaultSettings: {
            allowResearchSharing: false,
            maxShareDuration: 365
          }
        }
      ],
      currentVersion: this.currentConsentVersion,
      legalText: this.getConsentLegalText()
    }
  }

  async generateConsentForm(patientId: string, consentType: ShareConsentType): Promise<{
    formId: string
    consentText: string
    requiresWitness: boolean
    validFor: number // days
  }> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: { user: true }
    })

    if (!patient) {
      throw new Error('Patient not found')
    }

    const formId = createHash('sha256').update(`${patientId}-${consentType}-${Date.now()}`).digest('hex')
    const consentText = this.generatePersonalizedConsentText(patient, consentType)
    
    return {
      formId,
      consentText,
      requiresWitness: ['RESEARCH_SHARING', 'FAMILY_SHARING'].includes(consentType),
      validFor: 30 // Form valid for 30 days
    }
  }

  private validateConsentRequest(request: ConsentRequest): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!request.patientId) {
      errors.push('Patient ID is required')
    }

    if (!request.consentType) {
      errors.push('Consent type is required')
    }

    if (!request.consentText) {
      errors.push('Consent text is required')
    }

    if (!request.consentMethod) {
      errors.push('Consent method is required')
    }

    if (request.consentMethod === 'DIGITAL_SIGNATURE' && !request.patientSignature) {
      errors.push('Digital signature is required for digital signature method')
    }

    if (request.consentMethod === 'VERBAL_WITNESSED' && !request.witnessName) {
      errors.push('Witness name is required for verbal witnessed consent')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  private mapConsentRequest(request: ConsentRequest): any {
    return {
      patientId: request.patientId,
      consentType: request.consentType as any,
      consentGiven: request.consentGiven,
      consentText: request.consentText,
      allowGpSharing: request.allowGpSharing ?? false,
      allowSpecialistSharing: request.allowSpecialistSharing ?? false,
      allowEmergencySharing: request.allowEmergencySharing ?? true,
      allowFamilySharing: request.allowFamilySharing ?? false,
      allowResearchSharing: request.allowResearchSharing ?? false,
      maxShareDuration: request.maxShareDuration ?? 30,
      requireNotification: request.requireNotification ?? true,
      allowPrintExport: request.allowPrintExport ?? true,
      allowImageDownload: request.allowImageDownload ?? false,
      autoShareWithGp: request.autoShareWithGp ?? false,
      autoShareReports: request.autoShareReports ?? true,
      autoShareImages: request.autoShareImages ?? false,
      consentMethod: request.consentMethod as any,
      consentLocation: request.consentLocation,
      witnessName: request.witnessName,
      witnessSignature: request.witnessSignature,
      patientSignature: request.patientSignature,
      ipAddress: request.ipAddress,
      deviceInfo: request.deviceInfo,
      expiresAt: request.expiresAt
    }
  }

  private getRelevantConsentTypes(shareType: string, recipientType: string): string[] {
    const consentTypes = ['GENERAL_SHARING']

    switch (shareType) {
      case 'GP_REFERRAL':
        consentTypes.push('GP_SHARING')
        break
      case 'SPECIALIST':
        consentTypes.push('SPECIALIST_SHARING')
        break
      case 'FAMILY_MEMBER':
        consentTypes.push('FAMILY_SHARING')
        break
      case 'EMERGENCY':
        consentTypes.push('EMERGENCY_SHARING')
        break
      case 'RESEARCH':
        consentTypes.push('RESEARCH_SHARING')
        break
    }

    return consentTypes
  }

  private evaluateSpecificPermissions(consent: any, shareType: string, recipientType: string): {
    allowed: boolean
    reason?: string
  } {
    switch (shareType) {
      case 'GP_REFERRAL':
        if (!consent.allowGpSharing) {
          return { allowed: false, reason: 'Patient has not consented to GP sharing' }
        }
        break
      case 'SPECIALIST':
        if (!consent.allowSpecialistSharing) {
          return { allowed: false, reason: 'Patient has not consented to specialist sharing' }
        }
        break
      case 'FAMILY_MEMBER':
        if (!consent.allowFamilySharing) {
          return { allowed: false, reason: 'Patient has not consented to family sharing' }
        }
        break
      case 'EMERGENCY':
        if (!consent.allowEmergencySharing) {
          return { allowed: false, reason: 'Patient has not consented to emergency sharing' }
        }
        break
      case 'RESEARCH':
        if (!consent.allowResearchSharing) {
          return { allowed: false, reason: 'Patient has not consented to research sharing' }
        }
        break
    }

    return { allowed: true }
  }

  private async createConsentAuditLog(
    consentId: string,
    action: string,
    patientId: string,
    description: string,
    metadata?: any
  ): Promise<void> {
    try {
      // This would integrate with the main audit log system
      console.log(`Consent audit: ${action} for consent ${consentId} by patient ${patientId}`)
    } catch (error) {
      console.error('Error creating consent audit log:', error)
    }
  }

  private async revokeSharesBasedOnConsent(patientId: string, consentType: any): Promise<void> {
    try {
      // Find active shares that depend on this consent type
      const relatedShareTypes = this.getRelatedShareTypes(consentType)
      
      await this.prisma.studyShare.updateMany({
        where: {
          patientId,
          shareType: { in: relatedShareTypes as any[] },
          status: 'ACTIVE'
        },
        data: {
          status: 'REVOKED',
          isRevoked: true,
          revokedAt: new Date(),
          revokeReason: 'Consent withdrawn by patient'
        }
      })
    } catch (error) {
      console.error('Error revoking shares based on consent:', error)
    }
  }

  private getRelatedShareTypes(consentType: any): string[] {
    switch (consentType) {
      case 'GP_SHARING':
        return ['GP_REFERRAL']
      case 'SPECIALIST_SHARING':
        return ['SPECIALIST', 'SECOND_OPINION']
      case 'FAMILY_SHARING':
        return ['FAMILY_MEMBER']
      case 'RESEARCH_SHARING':
        return ['RESEARCH']
      case 'GENERAL_SHARING':
        return ['GP_REFERRAL', 'SPECIALIST', 'SECOND_OPINION']
      default:
        return []
    }
  }

  private getConsentLegalText(): Record<ShareConsentType, string> {
    return {
      GENERAL_SHARING: `I consent to Axis Imaging sharing my medical information with healthcare providers for the purpose of providing medical care. This includes sharing reports, images, and study information with referring doctors, specialists, and other healthcare professionals involved in my care.`,
      
      GP_SHARING: `I specifically consent to sharing my medical imaging information with General Practitioners (GPs) for the purpose of continuing care and treatment planning.`,
      
      SPECIALIST_SHARING: `I consent to sharing my medical imaging information with medical specialists for the purpose of specialized medical consultation and treatment.`,
      
      FAMILY_SHARING: `I consent to sharing my medical information with authorized family members or caregivers as specified by me.`,
      
      EMERGENCY_SHARING: `I consent to sharing my medical information in emergency situations where such sharing is necessary for my immediate medical care.`,
      
      RESEARCH_SHARING: `I consent to the use of my anonymized medical information for legitimate medical research purposes, with the understanding that my identity will be protected.`,
      
      MARKETING_SHARING: `I consent to receiving marketing communications and sharing of my information for marketing purposes related to healthcare services.`
    }
  }

  private generatePersonalizedConsentText(patient: any, consentType: ShareConsentType): string {
    const baseText = this.getConsentLegalText()[consentType]
    const personalizedText = `
CONSENT FOR MEDICAL INFORMATION SHARING

Patient Name: ${patient.firstName} ${patient.lastName}
Date of Birth: ${patient.dateOfBirth.toLocaleDateString()}
Patient Number: ${patient.patientNumber}

${baseText}

I understand that:
- This consent is voluntary and I may withdraw it at any time
- My medical information will be handled in accordance with Australian Privacy Laws
- Only authorized healthcare providers will have access to my information
- All sharing will be logged and auditable
- I have the right to access and correct my medical information

Date: ${new Date().toLocaleDateString()}
Version: ${this.currentConsentVersion}

Axis Imaging
Level 1, 107/21 Cityside Drive, Mickleham VIC 3064
Phone: (03) 8746 4200
`
    return personalizedText
  }
}