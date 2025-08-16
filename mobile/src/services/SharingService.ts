import { AuthService } from './AuthService'

interface CreateShareRequest {
  studyId: string
  patientId: string
  shareType: string
  recipientType: string
  recipientName: string
  recipientEmail?: string
  recipientPhone?: string
  
  // Access Control
  permissionLevel?: string
  includeStudy?: boolean
  includeReport?: boolean
  includeImages?: boolean
  
  // Time Controls
  accessWindow?: number // Days
  maxAccesses?: number
  
  // Purpose and messaging
  purpose?: string
  message?: string
  urgency?: string
  
  // Creator
  createdBy: string
}

interface ShareResult {
  success: boolean
  shareId?: string
  accessUrl?: string
  accessToken?: string
  message: string
  errors?: string[]
}

interface ExportRequest {
  studyId: string
  patientId: string
  format: string
  purpose: string
  requestedBy: string
  includeReport?: boolean
  includeImages?: boolean
  watermark?: boolean
}

interface ExportResult {
  success: boolean
  exportId?: string
  downloadUrl?: string
  fileName?: string
  message: string
  errors?: string[]
}

interface ConsentRequest {
  consentType: string
  consentGiven: boolean
  
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
  
  consentMethod: string
  patientSignature?: string
  ipAddress?: string
  deviceInfo?: any
}

class SharingServiceClass {
  private baseURL = 'https://api.axisimaging.com.au'

  async createShare(request: CreateShareRequest): Promise<ShareResult> {
    try {
      const token = await AuthService.getStoredToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch(`${this.baseURL}/api/sharing/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create share')
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating share:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create share'
      }
    }
  }

  async getPatientShares(patientId: string, includeExpired: boolean = false): Promise<any[]> {
    try {
      const token = await AuthService.getStoredToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch(
        `${this.baseURL}/api/sharing/patient/${patientId}?includeExpired=${includeExpired}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch patient shares')
      }

      const data = await response.json()
      return data.shares || []
    } catch (error) {
      console.error('Error fetching patient shares:', error)
      return []
    }
  }

  async revokeShare(shareId: string, reason?: string): Promise<boolean> {
    try {
      const token = await AuthService.getStoredToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch(`${this.baseURL}/api/sharing/${shareId}/revoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      })

      return response.ok
    } catch (error) {
      console.error('Error revoking share:', error)
      return false
    }
  }

  async getShareActivity(shareId: string): Promise<any> {
    try {
      const token = await AuthService.getStoredToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch(`${this.baseURL}/api/sharing/${shareId}/activity`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch share activity')
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching share activity:', error)
      return null
    }
  }

  async exportReport(request: ExportRequest): Promise<ExportResult> {
    try {
      const token = await AuthService.getStoredToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch(`${this.baseURL}/api/sharing/export`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to export report')
      }

      return await response.json()
    } catch (error) {
      console.error('Error exporting report:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to export report'
      }
    }
  }

  async getPatientExports(patientId: string): Promise<any[]> {
    try {
      const token = await AuthService.getStoredToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch(`${this.baseURL}/api/sharing/exports/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch patient exports')
      }

      const data = await response.json()
      return data.exports || []
    } catch (error) {
      console.error('Error fetching patient exports:', error)
      return []
    }
  }

  async getPatientConsents(patientId: string): Promise<any[]> {
    try {
      const token = await AuthService.getStoredToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch(`${this.baseURL}/api/sharing/consents/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch patient consents')
      }

      const data = await response.json()
      return data.consents || []
    } catch (error) {
      console.error('Error fetching patient consents:', error)
      return []
    }
  }

  async createConsent(patientId: string, request: ConsentRequest): Promise<{
    success: boolean
    consentId?: string
    message: string
  }> {
    try {
      const token = await AuthService.getStoredToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch(`${this.baseURL}/api/sharing/consents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          ...request,
          consentText: this.generateConsentText(request.consentType),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create consent')
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating consent:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create consent'
      }
    }
  }

  async withdrawConsent(consentId: string, reason: string): Promise<boolean> {
    try {
      const token = await AuthService.getStoredToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch(`${this.baseURL}/api/sharing/consents/${consentId}/withdraw`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      })

      return response.ok
    } catch (error) {
      console.error('Error withdrawing consent:', error)
      return false
    }
  }

  async checkSharingPermission(patientId: string, shareType: string, recipientType: string): Promise<{
    allowed: boolean
    reason?: string
    restrictions?: any
  }> {
    try {
      const token = await AuthService.getStoredToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch(
        `${this.baseURL}/api/sharing/permissions/${patientId}?shareType=${shareType}&recipientType=${recipientType}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to check sharing permission')
      }

      return await response.json()
    } catch (error) {
      console.error('Error checking sharing permission:', error)
      return {
        allowed: false,
        reason: 'Error checking permissions'
      }
    }
  }

  async shareWithGP(studyId: string, patientId: string, gpDetails: {
    name: string
    email: string
    practice?: string
    phone?: string
    message?: string
    urgency?: string
  }): Promise<ShareResult> {
    return this.createShare({
      studyId,
      patientId,
      shareType: 'GP_REFERRAL',
      recipientType: 'REFERRING_GP',
      recipientName: gpDetails.name,
      recipientEmail: gpDetails.email,
      recipientPhone: gpDetails.phone,
      message: gpDetails.message,
      urgency: gpDetails.urgency || 'ROUTINE',
      permissionLevel: 'VIEW_DOWNLOAD',
      includeReport: true,
      includeImages: false,
      accessWindow: 90, // 3 months
      createdBy: 'PATIENT'
    })
  }

  private generateConsentText(consentType: string): string {
    const baseText = {
      'GENERAL_SHARING': 'I consent to Axis Imaging sharing my medical information with healthcare providers for the purpose of providing medical care.',
      'GP_SHARING': 'I specifically consent to sharing my medical imaging information with General Practitioners (GPs) for the purpose of continuing care and treatment planning.',
      'SPECIALIST_SHARING': 'I consent to sharing my medical imaging information with medical specialists for the purpose of specialized medical consultation and treatment.',
      'FAMILY_SHARING': 'I consent to sharing my medical information with authorized family members or caregivers as specified by me.',
      'EMERGENCY_SHARING': 'I consent to sharing my medical information in emergency situations where such sharing is necessary for my immediate medical care.',
      'RESEARCH_SHARING': 'I consent to the use of my anonymized medical information for legitimate medical research purposes.',
    }

    return baseText[consentType as keyof typeof baseText] || baseText['GENERAL_SHARING']
  }

  // Utility methods for mobile app
  async hasValidConsent(patientId: string, shareType: string): Promise<boolean> {
    try {
      const consents = await this.getPatientConsents(patientId)
      return consents.some(consent => 
        consent.isActive && 
        (consent.consentType === 'GENERAL_SHARING' || 
         consent.consentType === this.mapShareTypeToConsent(shareType))
      )
    } catch {
      return false
    }
  }

  private mapShareTypeToConsent(shareType: string): string {
    const mapping: Record<string, string> = {
      'GP_REFERRAL': 'GP_SHARING',
      'SPECIALIST': 'SPECIALIST_SHARING',
      'FAMILY_MEMBER': 'FAMILY_SHARING',
      'EMERGENCY': 'EMERGENCY_SHARING',
      'RESEARCH': 'RESEARCH_SHARING'
    }

    return mapping[shareType] || 'GENERAL_SHARING'
  }

  async getShareStatistics(patientId: string): Promise<{
    totalShares: number
    activeShares: number
    expiredShares: number
    accessCount: number
    mostRecentShare?: any
  }> {
    try {
      const shares = await this.getPatientShares(patientId, true)
      
      const activeShares = shares.filter(share => share.status === 'ACTIVE' && new Date(share.expiresAt) > new Date())
      const expiredShares = shares.filter(share => share.status === 'EXPIRED' || new Date(share.expiresAt) <= new Date())
      const totalAccesses = shares.reduce((sum, share) => sum + (share.accessCount || 0), 0)
      
      return {
        totalShares: shares.length,
        activeShares: activeShares.length,
        expiredShares: expiredShares.length,
        accessCount: totalAccesses,
        mostRecentShare: shares.length > 0 ? shares[0] : undefined
      }
    } catch {
      return {
        totalShares: 0,
        activeShares: 0,
        expiredShares: 0,
        accessCount: 0
      }
    }
  }
}

export const SharingService = new SharingServiceClass()