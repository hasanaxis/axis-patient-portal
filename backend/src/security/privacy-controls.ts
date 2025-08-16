// Privacy Controls Service for Australian Healthcare Compliance
// Implements Privacy Act 1988 and patient rights management

import { PrismaClient } from '@prisma/client'
import EncryptionService from './encryption'
import { AuditLogger } from './audit-logger'
import archiver from 'archiver'
import { Readable } from 'stream'

export class PrivacyControlsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly encryption: EncryptionService,
    private readonly auditLogger: AuditLogger
  ) {}

  /**
   * Grant patient consent for data processing
   */
  async grantConsent(request: ConsentRequest): Promise<ConsentResult> {
    const consentId = crypto.randomUUID()
    
    try {
      // Create consent record
      const consent = await this.prisma.consent.create({
        data: {
          id: consentId,
          patientId: request.patientId,
          purpose: request.purpose,
          dataTypes: request.dataTypes,
          processingActivities: request.processingActivities,
          consentGiven: true,
          consentDate: new Date(),
          expiryDate: request.expiryDate,
          withdrawable: request.withdrawable ?? true,
          granular: request.granular ?? true,
          legalBasis: request.legalBasis || 'CONSENT',
          ipAddress: request.ipAddress,
          userAgent: request.userAgent
        }
      })

      // Log consent event
      await this.auditLogger.logConsentEvent({
        userId: request.userId,
        patientId: request.patientId,
        action: 'CONSENT_GRANTED',
        consentType: request.purpose,
        consentGiven: true,
        purpose: request.purpose,
        dataTypes: request.dataTypes,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent
      })

      return {
        success: true,
        consentId,
        expiryDate: consent.expiryDate,
        withdrawalRights: {
          canWithdraw: consent.withdrawable,
          withdrawalPeriod: '30 days',
          withdrawalMethod: 'Online portal or written request'
        }
      }
    } catch (error) {
      await this.auditLogger.logSecurityEvent({
        userId: request.userId,
        event: 'CONSENT_GRANT_FAILED',
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        details: { error: error.message, purpose: request.purpose }
      })
      throw new Error('Failed to grant consent')
    }
  }

  /**
   * Withdraw patient consent
   */
  async withdrawConsent(request: ConsentWithdrawalRequest): Promise<ConsentWithdrawalResult> {
    try {
      // Find active consent
      const consent = await this.prisma.consent.findFirst({
        where: {
          id: request.consentId,
          patientId: request.patientId,
          consentGiven: true,
          withdrawable: true
        }
      })

      if (!consent) {
        throw new Error('Consent not found or cannot be withdrawn')
      }

      // Withdraw consent
      await this.prisma.consent.update({
        where: { id: consent.id },
        data: {
          consentGiven: false,
          withdrawalDate: new Date(),
          withdrawalReason: request.reason,
          withdrawalMethod: request.method
        }
      })

      // Handle data processing cessation based on consent withdrawal
      await this.handleConsentWithdrawal(consent.patientId, consent.purpose, consent.dataTypes)

      // Log withdrawal event
      await this.auditLogger.logConsentEvent({
        userId: request.userId,
        patientId: request.patientId,
        action: 'CONSENT_WITHDRAWN',
        consentType: consent.purpose,
        consentGiven: false,
        purpose: consent.purpose,
        dataTypes: consent.dataTypes,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent
      })

      return {
        success: true,
        withdrawalDate: new Date(),
        dataProcessingCeased: true,
        retentionPeriod: await this.getRetentionPeriod(consent.purpose),
        rightsNotice: 'Your data will be processed only as required by law. You may request deletion after the retention period.'
      }
    } catch (error) {
      await this.auditLogger.logSecurityEvent({
        userId: request.userId,
        event: 'CONSENT_WITHDRAWAL_FAILED',
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        details: { error: error.message, consentId: request.consentId }
      })
      throw new Error('Failed to withdraw consent')
    }
  }

  /**
   * Get patient consent status and history
   */
  async getConsentStatus(patientId: string, userId: string): Promise<ConsentStatus> {
    const consents = await this.prisma.consent.findMany({
      where: { patientId },
      orderBy: { consentDate: 'desc' }
    })

    const activeConsents = consents.filter(c => c.consentGiven && (!c.expiryDate || c.expiryDate > new Date()))
    const withdrawnConsents = consents.filter(c => !c.consentGiven && c.withdrawalDate)
    const expiredConsents = consents.filter(c => c.expiryDate && c.expiryDate <= new Date())

    // Log consent status access
    await this.auditLogger.logDataAccess({
      userId,
      patientId,
      action: 'VIEW_CONSENT_STATUS',
      resource: 'consent',
      resourceId: patientId,
      ipAddress: 'system',
      userAgent: 'system',
      success: true
    })

    return {
      patientId,
      activeConsents: activeConsents.map(this.mapConsentToPublic),
      withdrawnConsents: withdrawnConsents.map(this.mapConsentToPublic),
      expiredConsents: expiredConsents.map(this.mapConsentToPublic),
      consentSummary: {
        totalConsents: consents.length,
        activeConsents: activeConsents.length,
        dataProcessingAllowed: activeConsents.length > 0,
            marketingAllowed: activeConsents.some(c => c.purpose.includes('marketing')),
        researchAllowed: activeConsents.some(c => c.purpose.includes('research'))
      },
      rightsInformation: {
        canWithdraw: true,
        canAccess: true,
        canCorrect: true,
        canDelete: true,
        canPortability: true,
        complaintProcess: 'Contact Privacy Officer or Australian Privacy Commissioner'
      }
    }
  }

  /**
   * Handle data subject access request (Privacy Act 1988 - APP 12)
   */
  async handleAccessRequest(request: DataAccessRequest): Promise<DataAccessResult> {
    try {
      // Verify patient identity and authorization
      await this.verifyPatientAccess(request.patientId, request.userId)

      // Collect all patient data
      const patientData = await this.collectPatientData(request.patientId)

      // Log access request
      await this.auditLogger.logDataAccess({
        userId: request.userId,
        patientId: request.patientId,
        action: 'DATA_ACCESS_REQUEST',
        resource: 'patient_data',
        resourceId: request.patientId,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        success: true,
        details: { requestType: 'FULL_ACCESS', format: request.format }
      })

      // Generate data export
      const exportData = await this.generateDataExport(patientData, request.format)

      return {
        success: true,
        requestId: crypto.randomUUID(),
        data: exportData,
        format: request.format,
        generatedAt: new Date(),
        dataTypes: Object.keys(patientData),
        retentionNotice: 'This data export is valid for 30 days from generation date',
        rightsReminder: 'You have the right to correct, delete, or restrict processing of this data'
      }
    } catch (error) {
      await this.auditLogger.logSecurityEvent({
        userId: request.userId,
        event: 'DATA_ACCESS_REQUEST_FAILED',
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        details: { error: error.message, patientId: request.patientId }
      })
      throw new Error('Failed to process data access request')
    }
  }

  /**
   * Handle data correction request (Privacy Act 1988 - APP 13)
   */
  async handleCorrectionRequest(request: DataCorrectionRequest): Promise<DataCorrectionResult> {
    try {
      // Verify patient identity and authorization
      await this.verifyPatientAccess(request.patientId, request.userId)

      // Validate correction request
      const validationResult = await this.validateCorrectionRequest(request)
      if (!validationResult.valid) {
        throw new Error(validationResult.reason)
      }

      // Create correction record for audit trail
      const correctionId = crypto.randomUUID()
      
      await this.prisma.dataCorrection.create({
        data: {
          id: correctionId,
          patientId: request.patientId,
          requestedBy: request.userId,
          fieldName: request.fieldName,
          oldValue: await this.encryption.encryptHealthcareData(request.oldValue),
          newValue: await this.encryption.encryptHealthcareData(request.newValue),
          reason: request.reason,
          status: 'PENDING',
          requestDate: new Date()
        }
      })

      // Apply correction if auto-approvable
      let applied = false
      if (await this.isAutoApprovableCorrection(request)) {
        applied = await this.applyCorrectionRequest(correctionId, request)
      }

      // Log correction request
      await this.auditLogger.logDataAccess({
        userId: request.userId,
        patientId: request.patientId,
        action: 'DATA_CORRECTION_REQUEST',
        resource: request.fieldName,
        resourceId: request.patientId,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        success: true,
        details: { 
          correctionId, 
          fieldName: request.fieldName,
          autoApproved: applied
        }
      })

      return {
        success: true,
        correctionId,
        status: applied ? 'APPLIED' : 'PENDING_REVIEW',
        appliedImmediately: applied,
        reviewPeriod: applied ? null : '5 business days',
        notificationMethod: 'Email and portal notification'
      }
    } catch (error) {
      await this.auditLogger.logSecurityEvent({
        userId: request.userId,
        event: 'DATA_CORRECTION_REQUEST_FAILED',
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        details: { error: error.message, patientId: request.patientId }
      })
      throw new Error('Failed to process data correction request')
    }
  }

  /**
   * Handle data deletion request (Right to be forgotten)
   */
  async handleDeletionRequest(request: DataDeletionRequest): Promise<DataDeletionResult> {
    try {
      // Verify patient identity and authorization
      await this.verifyPatientAccess(request.patientId, request.userId)

      // Check legal obligations and retention requirements
      const retentionCheck = await this.checkRetentionRequirements(request.patientId)
      
      if (retentionCheck.hasLegalObligation) {
        return {
          success: false,
          canDelete: false,
          reason: 'Legal retention requirements prevent deletion',
          retentionReason: retentionCheck.reasons,
          retentionPeriod: retentionCheck.retentionUntil,
          alternativeRights: [
            'Data processing restriction',
            'Data portability',
            'Correction of inaccurate data'
          ]
        }
      }

      // Create deletion request record
      const deletionId = crypto.randomUUID()
      
      await this.prisma.dataDeletion.create({
        data: {
          id: deletionId,
          patientId: request.patientId,
          requestedBy: request.userId,
          reason: request.reason,
          dataTypes: request.dataTypes,
          status: 'PENDING',
          requestDate: new Date(),
          confirmationRequired: true
        }
      })

      // Log deletion request
      await this.auditLogger.logDataAccess({
        userId: request.userId,
        patientId: request.patientId,
        action: 'DATA_DELETION_REQUEST',
        resource: 'patient_data',
        resourceId: request.patientId,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        success: true,
        details: { 
          deletionId, 
          dataTypes: request.dataTypes,
          reason: request.reason
        }
      })

      return {
        success: true,
        canDelete: true,
        deletionId,
        confirmationRequired: true,
        confirmationPeriod: '7 days',
        dataToBeDeleted: request.dataTypes,
        effectiveDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        warning: 'This action cannot be undone. Ensure you have exported any data you wish to keep.'
      }
    } catch (error) {
      await this.auditLogger.logSecurityEvent({
        userId: request.userId,
        event: 'DATA_DELETION_REQUEST_FAILED',
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        details: { error: error.message, patientId: request.patientId }
      })
      throw new Error('Failed to process data deletion request')
    }
  }

  /**
   * Confirm data deletion
   */
  async confirmDeletion(deletionId: string, confirmationCode: string, userId: string): Promise<boolean> {
    try {
      const deletion = await this.prisma.dataDeletion.findUnique({
        where: { id: deletionId }
      })

      if (!deletion || deletion.status !== 'PENDING') {
        throw new Error('Deletion request not found or already processed')
      }

      // Verify confirmation code (would be sent via email/SMS)
      const isValidCode = await this.verifyConfirmationCode(deletionId, confirmationCode)
      if (!isValidCode) {
        throw new Error('Invalid confirmation code')
      }

      // Execute deletion
      await this.executeDataDeletion(deletion.patientId, deletion.dataTypes)

      // Update deletion record
      await this.prisma.dataDeletion.update({
        where: { id: deletionId },
        data: {
          status: 'COMPLETED',
          completedDate: new Date(),
          confirmedBy: userId
        }
      })

      // Log deletion completion
      await this.auditLogger.logDataAccess({
        userId,
        patientId: deletion.patientId,
        action: 'DATA_DELETION_COMPLETED',
        resource: 'patient_data',
        resourceId: deletion.patientId,
        ipAddress: 'system',
        userAgent: 'system',
        success: true,
        details: { deletionId, dataTypes: deletion.dataTypes }
      })

      return true
    } catch (error) {
      await this.auditLogger.logSecurityEvent({
        userId,
        event: 'DATA_DELETION_CONFIRMATION_FAILED',
        details: { error: error.message, deletionId }
      })
      throw new Error('Failed to confirm data deletion')
    }
  }

  /**
   * Generate data portability export (Privacy Act 1988 - APP 13)
   */
  async generatePortabilityExport(request: DataPortabilityRequest): Promise<DataPortabilityResult> {
    try {
      // Verify patient identity and authorization
      await this.verifyPatientAccess(request.patientId, request.userId)

      // Collect portable data (structured, commonly used formats)
      const portableData = await this.collectPortableData(request.patientId, request.dataTypes)

      // Generate export in requested format
      const exportResult = await this.generatePortableExport(portableData, request.format)

      // Log portability request
      await this.auditLogger.logDataAccess({
        userId: request.userId,
        patientId: request.patientId,
        action: 'DATA_PORTABILITY_REQUEST',
        resource: 'patient_data',
        resourceId: request.patientId,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        success: true,
        details: { 
          format: request.format,
          dataTypes: request.dataTypes,
          size: exportResult.size
        }
      })

      return {
        success: true,
        exportId: crypto.randomUUID(),
        format: request.format,
        data: exportResult.data,
        metadata: exportResult.metadata,
        size: exportResult.size,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        downloadInstructions: 'Data export available for 30 days. Use industry-standard tools to import.'
      }
    } catch (error) {
      await this.auditLogger.logSecurityEvent({
        userId: request.userId,
        event: 'DATA_PORTABILITY_REQUEST_FAILED',
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        details: { error: error.message, patientId: request.patientId }
      })
      throw new Error('Failed to generate data portability export')
    }
  }

  /**
   * Manage privacy settings
   */
  async updatePrivacySettings(request: PrivacySettingsRequest): Promise<PrivacySettingsResult> {
    try {
      // Verify patient identity and authorization
      await this.verifyPatientAccess(request.patientId, request.userId)

      // Update privacy settings
      await this.prisma.privacySettings.upsert({
        where: { patientId: request.patientId },
        update: {
          marketingOptIn: request.settings.marketingOptIn,
          researchOptIn: request.settings.researchOptIn,
          dataAnalyticsOptIn: request.settings.dataAnalyticsOptIn,
          thirdPartySharing: request.settings.thirdPartySharing,
          notificationPreferences: request.settings.notificationPreferences,
          dataRetentionPreference: request.settings.dataRetentionPreference,
          updatedAt: new Date()
        },
        create: {
          patientId: request.patientId,
          ...request.settings,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      // Log privacy settings update
      await this.auditLogger.logDataAccess({
        userId: request.userId,
        patientId: request.patientId,
        action: 'PRIVACY_SETTINGS_UPDATED',
        resource: 'privacy_settings',
        resourceId: request.patientId,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        success: true,
        details: { settingsChanged: Object.keys(request.settings) }
      })

      return {
        success: true,
        updatedAt: new Date(),
        effectiveImmediately: true,
        settingsApplied: request.settings,
        rightsReminder: 'You can change these settings at any time through your privacy dashboard'
      }
    } catch (error) {
      await this.auditLogger.logSecurityEvent({
        userId: request.userId,
        event: 'PRIVACY_SETTINGS_UPDATE_FAILED',
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        details: { error: error.message, patientId: request.patientId }
      })
      throw new Error('Failed to update privacy settings')
    }
  }

  // Private helper methods

  private async verifyPatientAccess(patientId: string, userId: string): Promise<void> {
    const patient = await this.prisma.patient.findFirst({
      where: { 
        id: patientId,
        userId: userId
      }
    })

    if (!patient) {
      throw new Error('Unauthorized access to patient data')
    }
  }

  private async collectPatientData(patientId: string) {
    const [patient, studies, appointments, reports, consents] = await Promise.all([
      this.prisma.patient.findUnique({
        where: { id: patientId },
        include: { user: true }
      }),
      this.prisma.study.findMany({
        where: { patientId },
        include: { reports: true }
      }),
      this.prisma.appointment.findMany({
        where: { patientId }
      }),
      this.prisma.report.findMany({
        where: { study: { patientId } }
      }),
      this.prisma.consent.findMany({
        where: { patientId }
      })
    ])

    return {
      personal: patient,
      studies,
      appointments,
      reports,
      consents,
      auditTrail: await this.getPatientAuditTrail(patientId)
    }
  }

  private async generateDataExport(data: any, format: 'JSON' | 'XML' | 'CSV') {
    switch (format) {
      case 'JSON':
        return JSON.stringify(data, null, 2)
      case 'XML':
        return this.convertToXML(data)
      case 'CSV':
        return this.convertToCSV(data)
      default:
        throw new Error('Unsupported export format')
    }
  }

  private async getPatientAuditTrail(patientId: string) {
    return this.prisma.auditLog.findMany({
      where: { patientId },
      orderBy: { timestamp: 'desc' },
      take: 100 // Limit for export
    })
  }

  private async handleConsentWithdrawal(patientId: string, purpose: string, dataTypes: string[]) {
    // Implement specific data processing cessation based on consent type
    if (purpose.includes('marketing')) {
      await this.prisma.patient.update({
        where: { id: patientId },
        data: { marketingOptOut: true }
      })
    }

    if (purpose.includes('research')) {
      await this.prisma.patient.update({
        where: { id: patientId },
        data: { researchOptOut: true }
      })
    }
  }

  private async getRetentionPeriod(purpose: string): Promise<string> {
    const retentionPeriods = {
      'healthcare_delivery': '7 years',
      'billing': '7 years', 
      'research': '15 years',
      'marketing': 'Until withdrawal',
      'legal_compliance': '7 years'
    }

    return retentionPeriods[purpose] || '7 years'
  }

  private mapConsentToPublic(consent: any) {
    return {
      id: consent.id,
      purpose: consent.purpose,
      dataTypes: consent.dataTypes,
      consentDate: consent.consentDate,
      expiryDate: consent.expiryDate,
      status: consent.consentGiven ? 'ACTIVE' : 'WITHDRAWN',
      withdrawable: consent.withdrawable
    }
  }

  private async validateCorrectionRequest(request: DataCorrectionRequest): Promise<{ valid: boolean; reason?: string }> {
    // Validate field name is correctable
    const correctableFields = ['firstName', 'lastName', 'email', 'phoneNumber', 'address']
    
    if (!correctableFields.includes(request.fieldName)) {
      return { valid: false, reason: 'Field is not user-correctable' }
    }

    // Validate new value format
    // Add specific validation logic based on field type
    
    return { valid: true }
  }

  private async isAutoApprovableCorrection(request: DataCorrectionRequest): Promise<boolean> {
    // Auto-approve simple contact information corrections
    const autoApprovableFields = ['email', 'phoneNumber', 'address']
    return autoApprovableFields.includes(request.fieldName)
  }

  private async applyCorrectionRequest(correctionId: string, request: DataCorrectionRequest): Promise<boolean> {
    try {
      // Apply the correction to the actual data
      const updateData = { [request.fieldName]: request.newValue }
      
      await this.prisma.patient.update({
        where: { id: request.patientId },
        data: updateData
      })

      // Update correction status
      await this.prisma.dataCorrection.update({
        where: { id: correctionId },
        data: {
          status: 'APPLIED',
          appliedDate: new Date()
        }
      })

      return true
    } catch (error) {
      return false
    }
  }

  private async checkRetentionRequirements(patientId: string) {
    // Check for legal obligations that prevent deletion
    const activeStudies = await this.prisma.study.count({
      where: { 
        patientId,
        studyDate: { gte: new Date(Date.now() - 7 * 365 * 24 * 60 * 60 * 1000) } // 7 years
      }
    })

    const hasLegalObligation = activeStudies > 0

    return {
      hasLegalObligation,
      reasons: hasLegalObligation ? ['Healthcare records retention - 7 years'] : [],
      retentionUntil: hasLegalObligation ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null
    }
  }

  private async executeDataDeletion(patientId: string, dataTypes: string[]): Promise<void> {
    // Implement careful deletion based on data types and legal requirements
    // This is a simplified implementation
    
    if (dataTypes.includes('personal_information')) {
      // Anonymize rather than delete if legally required
      await this.anonymizePatientData(patientId)
    }

    if (dataTypes.includes('communication_history')) {
      await this.prisma.notification.deleteMany({
        where: { patientId }
      })
    }

    // Note: Medical records may need to be retained for legal compliance
  }

  private async anonymizePatientData(patientId: string): Promise<void> {
    const anonymizedData = {
      firstName: 'ANONYMIZED',
      lastName: 'PATIENT',
      email: `anonymized-${patientId}@deleted.local`,
      phoneNumber: null,
      dateOfBirth: null
    }

    await this.prisma.patient.update({
      where: { id: patientId },
      data: anonymizedData
    })
  }

  private async verifyConfirmationCode(deletionId: string, code: string): Promise<boolean> {
    // In production, verify against stored confirmation code
    // For now, accept any 6-digit code
    return /^\d{6}$/.test(code)
  }

  private async collectPortableData(patientId: string, dataTypes: string[]) {
    const data: any = {}

    if (dataTypes.includes('personal')) {
      data.personal = await this.prisma.patient.findUnique({
        where: { id: patientId },
        include: { user: true }
      })
    }

    if (dataTypes.includes('studies')) {
      data.studies = await this.prisma.study.findMany({
        where: { patientId }
      })
    }

    if (dataTypes.includes('appointments')) {
      data.appointments = await this.prisma.appointment.findMany({
        where: { patientId }
      })
    }

    return data
  }

  private async generatePortableExport(data: any, format: string) {
    let exportData: Buffer
    let metadata: any = {}

    switch (format) {
      case 'JSON':
        exportData = Buffer.from(JSON.stringify(data, null, 2))
        metadata.mimeType = 'application/json'
        break
      case 'XML':
        const xmlData = this.convertToXML(data)
        exportData = Buffer.from(xmlData)
        metadata.mimeType = 'application/xml'
        break
      case 'CSV':
        const csvData = this.convertToCSV(data)
        exportData = csvData
        metadata.mimeType = 'text/csv'
        break
      default:
        throw new Error('Unsupported export format')
    }

    return {
      data: exportData,
      metadata,
      size: exportData.length
    }
  }

  private convertToXML(data: any): string {
    // Simplified XML conversion
    return `<?xml version="1.0" encoding="UTF-8"?>
<patientData>
  ${this.objectToXML(data)}
</patientData>`
  }

  private objectToXML(obj: any, depth = 0): string {
    const indent = '  '.repeat(depth)
    let xml = ''

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        xml += `${indent}<${key}>\n${this.objectToXML(value, depth + 1)}${indent}</${key}>\n`
      } else {
        xml += `${indent}<${key}>${value}</${key}>\n`
      }
    }

    return xml
  }

  private convertToCSV(data: any): Buffer {
    // Flatten complex data structure for CSV export
    const flattened = this.flattenObject(data)
    
    if (Array.isArray(flattened)) {
      const headers = Object.keys(flattened[0] || {}).join(',')
      const rows = flattened.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
        ).join(',')
      )
      return Buffer.from([headers, ...rows].join('\n'))
    } else {
      const headers = Object.keys(flattened).join(',')
      const values = Object.values(flattened).map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      ).join(',')
      return Buffer.from([headers, values].join('\n'))
    }
  }

  private flattenObject(obj: any, prefix = ''): any {
    const flattened: any = {}

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}_${key}` : key

        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(flattened, this.flattenObject(obj[key], newKey))
        } else {
          flattened[newKey] = obj[key]
        }
      }
    }

    return flattened
  }
}

// Type definitions
export interface ConsentRequest {
  userId: string
  patientId: string
  purpose: string
  dataTypes: string[]
  processingActivities: string[]
  expiryDate?: Date
  withdrawable?: boolean
  granular?: boolean
  legalBasis?: string
  ipAddress: string
  userAgent: string
}

export interface ConsentResult {
  success: boolean
  consentId: string
  expiryDate?: Date
  withdrawalRights: {
    canWithdraw: boolean
    withdrawalPeriod: string
    withdrawalMethod: string
  }
}

export interface ConsentWithdrawalRequest {
  userId: string
  patientId: string
  consentId: string
  reason: string
  method: string
  ipAddress: string
  userAgent: string
}

export interface ConsentWithdrawalResult {
  success: boolean
  withdrawalDate: Date
  dataProcessingCeased: boolean
  retentionPeriod: string
  rightsNotice: string
}

export interface ConsentStatus {
  patientId: string
  activeConsents: any[]
  withdrawnConsents: any[]
  expiredConsents: any[]
  consentSummary: {
    totalConsents: number
    activeConsents: number
    dataProcessingAllowed: boolean
    marketingAllowed: boolean
    researchAllowed: boolean
  }
  rightsInformation: {
    canWithdraw: boolean
    canAccess: boolean
    canCorrect: boolean
    canDelete: boolean
    canPortability: boolean
    complaintProcess: string
  }
}

export interface DataAccessRequest {
  userId: string
  patientId: string
  format: 'JSON' | 'XML' | 'CSV'
  ipAddress: string
  userAgent: string
}

export interface DataAccessResult {
  success: boolean
  requestId: string
  data: any
  format: string
  generatedAt: Date
  dataTypes: string[]
  retentionNotice: string
  rightsReminder: string
}

export interface DataCorrectionRequest {
  userId: string
  patientId: string
  fieldName: string
  oldValue: string
  newValue: string
  reason: string
  ipAddress: string
  userAgent: string
}

export interface DataCorrectionResult {
  success: boolean
  correctionId: string
  status: string
  appliedImmediately: boolean
  reviewPeriod?: string
  notificationMethod: string
}

export interface DataDeletionRequest {
  userId: string
  patientId: string
  reason: string
  dataTypes: string[]
  ipAddress: string
  userAgent: string
}

export interface DataDeletionResult {
  success: boolean
  canDelete: boolean
  reason?: string
  deletionId?: string
  confirmationRequired?: boolean
  confirmationPeriod?: string
  dataToBeDeleted?: string[]
  effectiveDate?: Date
  warning?: string
  retentionReason?: string[]
  retentionPeriod?: Date
  alternativeRights?: string[]
}

export interface DataPortabilityRequest {
  userId: string
  patientId: string
  dataTypes: string[]
  format: 'JSON' | 'XML' | 'CSV'
  ipAddress: string
  userAgent: string
}

export interface DataPortabilityResult {
  success: boolean
  exportId: string
  format: string
  data: Buffer
  metadata: any
  size: number
  generatedAt: Date
  expiresAt: Date
  downloadInstructions: string
}

export interface PrivacySettingsRequest {
  userId: string
  patientId: string
  settings: {
    marketingOptIn: boolean
    researchOptIn: boolean
    dataAnalyticsOptIn: boolean
    thirdPartySharing: boolean
    notificationPreferences: any
    dataRetentionPreference: string
  }
  ipAddress: string
  userAgent: string
}

export interface PrivacySettingsResult {
  success: boolean
  updatedAt: Date
  effectiveImmediately: boolean
  settingsApplied: any
  rightsReminder: string
}

export default PrivacyControlsService