import { PrismaClient } from '@prisma/client'
import { StudySharingService, CreateShareRequest } from './StudySharingService'
import { SMSAutomationService } from '../sms/SMSAutomationService'

export interface GPReferralShareRequest {
  studyId: string
  patientId: string
  gpEmail: string
  gpName: string
  gpPractice?: string
  gpPhone?: string
  includeRecommendation?: boolean
  customMessage?: string
  urgency?: 'ROUTINE' | 'URGENT' | 'EMERGENCY' | 'CRITICAL'
  requestedBy: string
}

export interface GPContactIntegration {
  practiceId?: string
  doctorId?: string
  practiceName: string
  doctorName: string
  email: string
  phone?: string
  fax?: string
  address?: string
  preferredContact: 'EMAIL' | 'PHONE' | 'FAX' | 'SECURE_EMAIL'
}

export class GPReferralSharingService {
  private prisma: PrismaClient
  private studySharingService: StudySharingService
  private smsService?: SMSAutomationService

  constructor(
    prisma: PrismaClient,
    studySharingService: StudySharingService,
    smsService?: SMSAutomationService
  ) {
    this.prisma = prisma
    this.studySharingService = studySharingService
    this.smsService = smsService
  }

  async shareWithReferringGP(request: GPReferralShareRequest): Promise<{
    success: boolean
    shareId?: string
    accessUrl?: string
    message: string
    notificationSent?: boolean
  }> {
    try {
      // Get study and patient details
      const study = await this.prisma.study.findUnique({
        where: { id: request.studyId },
        include: {
          patient: true,
          report: true,
          appointment: {
            include: {
              referral: {
                include: {
                  referringGp: true
                }
              }
            }
          }
        }
      })

      if (!study) {
        return {
          success: false,
          message: 'Study not found'
        }
      }

      // Create custom message for GP
      const customMessage = this.generateGPMessage(study, request)

      // Create the share
      const shareRequest: CreateShareRequest = {
        studyId: request.studyId,
        patientId: request.patientId,
        shareType: 'GP_REFERRAL',
        recipientType: 'REFERRING_GP',
        recipientName: request.gpName,
        recipientEmail: request.gpEmail,
        recipientPhone: request.gpPhone,
        
        permissionLevel: 'VIEW_DOWNLOAD',
        includeStudy: true,
        includeReport: true,
        includeImages: false, // GPs typically don't need images
        
        accessWindow: 90, // 3 months for GP access
        maxAccesses: 10, // Allow multiple views
        
        purpose: 'GP Referral Follow-up',
        message: customMessage,
        urgency: request.urgency || 'ROUTINE',
        
        recommendFollowUp: true,
        followUpMessage: 'Please contact the patient to discuss these results and any recommended follow-up care.',
        gpContactDetails: this.formatGPContactDetails(request),
        
        createdBy: request.requestedBy
      }

      const result = await this.studySharingService.createShare(shareRequest)

      if (result.success) {
        // Send GP notification
        const notificationSent = await this.sendGPNotification({
          shareId: result.shareId!,
          accessUrl: result.accessUrl!,
          gpEmail: request.gpEmail,
          gpName: request.gpName,
          patient: study.patient,
          study: study,
          report: study.report,
          urgency: request.urgency || 'ROUTINE'
        })

        // Auto-share with referring GP if this is a known referral
        if (study.appointment?.referral?.referringGp) {
          await this.createGPReferralRecord(result.shareId!, study.appointment.referral.referringGp.id)
        }

        // Send patient notification about sharing
        await this.notifyPatientOfGPShare(request.patientId, request.gpName)

        return {
          success: true,
          shareId: result.shareId,
          accessUrl: result.accessUrl,
          message: `Study shared with ${request.gpName}. Notification sent to ${request.gpEmail}.`,
          notificationSent
        }
      }

      return result

    } catch (error) {
      console.error('Error sharing with referring GP:', error)
      return {
        success: false,
        message: 'Failed to share with GP. Please try again.'
      }
    }
  }

  async findGPPractice(searchTerm: string): Promise<GPContactIntegration[]> {
    try {
      // Search GP practices and doctors
      const practices = await this.prisma.gPPractice.findMany({
        where: {
          OR: [
            { practiceName: { contains: searchTerm, mode: 'insensitive' } },
            { doctors: { some: { lastName: { contains: searchTerm, mode: 'insensitive' } } } }
          ],
          isActive: true
        },
        include: {
          doctors: {
            where: { isActive: true },
            orderBy: { lastName: 'asc' }
          }
        },
        take: 10
      })

      const results: GPContactIntegration[] = []

      for (const practice of practices) {
        for (const doctor of practice.doctors) {
          results.push({
            practiceId: practice.id,
            doctorId: doctor.id,
            practiceName: practice.practiceName,
            doctorName: `${doctor.title || 'Dr'} ${doctor.firstName} ${doctor.lastName}`,
            email: doctor.email || practice.email || '',
            phone: doctor.directPhone || practice.phone,
            fax: practice.fax,
            address: `${practice.address}, ${practice.suburb}, ${practice.state} ${practice.postcode}`,
            preferredContact: doctor.preferredContactMethod as any || practice.preferredNotificationMethod as any
          })
        }
      }

      return results
    } catch (error) {
      console.error('Error finding GP practice:', error)
      return []
    }
  }

  async getGPSharingHistory(patientId: string): Promise<any[]> {
    try {
      const shares = await this.prisma.studyShare.findMany({
        where: {
          patientId,
          shareType: 'GP_REFERRAL'
        },
        include: {
          study: {
            select: {
              studyDate: true,
              modality: true,
              studyDescription: true
            }
          },
          accesses: {
            select: {
              accessedAt: true,
              viewedReport: true
            },
            orderBy: { accessedAt: 'desc' },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return shares.map(share => ({
        id: share.id,
        sharedAt: share.createdAt,
        gpName: share.recipientName,
        gpEmail: share.recipientEmail,
        study: share.study,
        status: share.status,
        lastAccessed: share.accesses[0]?.accessedAt,
        wasViewed: share.accesses.length > 0,
        reportViewed: share.accesses[0]?.viewedReport || false,
        expiresAt: share.expiresAt,
        message: share.message
      }))
    } catch (error) {
      console.error('Error getting GP sharing history:', error)
      return []
    }
  }

  async autoShareWithReferringGP(studyId: string): Promise<boolean> {
    try {
      // Get study with referral information
      const study = await this.prisma.study.findUnique({
        where: { id: studyId },
        include: {
          patient: {
            include: {
              shareConsents: {
                where: {
                  consentGiven: true,
                  consentType: 'GP_SHARING'
                }
              }
            }
          },
          report: true,
          appointment: {
            include: {
              referral: {
                include: {
                  referringGp: true
                }
              }
            }
          }
        }
      })

      if (!study || !study.appointment?.referral?.referringGp) {
        return false
      }

      // Check if patient has consented to auto-sharing
      const hasConsent = study.patient.shareConsents.some(consent => 
        consent.autoShareWithGp && consent.consentGiven
      )

      if (!hasConsent) {
        return false
      }

      // Check if report is finalized
      if (!study.report || study.report.status !== 'APPROVED') {
        return false
      }

      const gp = study.appointment.referral.referringGp

      // Auto-share with referring GP
      const result = await this.shareWithReferringGP({
        studyId: study.id,
        patientId: study.patientId,
        gpEmail: gp.email,
        gpName: `${gp.firstName} ${gp.lastName}`,
        gpPractice: gp.practiceName,
        gpPhone: gp.phone,
        includeRecommendation: true,
        urgency: study.report.isCritical ? 'URGENT' : 'ROUTINE',
        requestedBy: 'SYSTEM_AUTO_SHARE'
      })

      return result.success
    } catch (error) {
      console.error('Error auto-sharing with referring GP:', error)
      return false
    }
  }

  private generateGPMessage(study: any, request: GPReferralShareRequest): string {
    const patient = study.patient
    const report = study.report
    
    let message = `Dear ${request.gpName},\n\n`
    message += `Please find attached the ${study.modality} results for your patient:\n\n`
    message += `Patient: ${patient.firstName} ${patient.lastName}\n`
    message += `DOB: ${patient.dateOfBirth.toLocaleDateString()}\n`
    message += `Study Date: ${study.studyDate.toLocaleDateString()}\n`
    message += `Study: ${study.studyDescription || study.modality}\n\n`

    if (report) {
      if (report.isCritical) {
        message += `⚠️ URGENT: This report contains findings that may require immediate attention.\n\n`
      }

      if (report.impression) {
        message += `Impression: ${report.impression}\n\n`
      }

      if (report.recommendations) {
        message += `Recommendations: ${report.recommendations}\n\n`
      }
    }

    if (request.customMessage) {
      message += `Additional Notes: ${request.customMessage}\n\n`
    }

    message += `We recommend discussing these results with your patient and arranging any necessary follow-up care.\n\n`
    message += `If you have any questions about these results, please don't hesitate to contact us.\n\n`
    message += `Kind regards,\n`
    message += `Axis Imaging Team\n`
    message += `Phone: (03) 8746 4200\n`
    message += `Email: reports@axisimaging.com.au`

    return message
  }

  private formatGPContactDetails(request: GPReferralShareRequest): string {
    let details = `GP: ${request.gpName}\n`
    details += `Email: ${request.gpEmail}\n`
    
    if (request.gpPractice) {
      details += `Practice: ${request.gpPractice}\n`
    }
    
    if (request.gpPhone) {
      details += `Phone: ${request.gpPhone}\n`
    }

    return details
  }

  private async sendGPNotification(params: {
    shareId: string
    accessUrl: string
    gpEmail: string
    gpName: string
    patient: any
    study: any
    report: any
    urgency: string
  }): Promise<boolean> {
    try {
      // This would integrate with email service
      // For now, simulate email sending
      
      const subject = params.urgency === 'URGENT' || params.urgency === 'EMERGENCY' 
        ? `🚨 URGENT: Medical Results - ${params.patient.firstName} ${params.patient.lastName}`
        : `Medical Results Available - ${params.patient.firstName} ${params.patient.lastName}`

      const emailContent = this.generateGPEmailContent(params)

      // TODO: Integrate with actual email service
      console.log(`Sending GP notification to ${params.gpEmail}:`)
      console.log(`Subject: ${subject}`)
      console.log(`Content: ${emailContent}`)

      // Record the notification attempt
      await this.prisma.studyShare.update({
        where: { id: params.shareId },
        data: {
          notificationSent: true,
          emailSentAt: new Date()
        }
      })

      return true
    } catch (error) {
      console.error('Error sending GP notification:', error)
      return false
    }
  }

  private generateGPEmailContent(params: any): string {
    const { gpName, patient, study, report, accessUrl, urgency } = params

    let content = `Dear ${gpName},\n\n`
    
    if (urgency === 'URGENT' || urgency === 'EMERGENCY') {
      content += `🚨 URGENT MEDICAL RESULTS 🚨\n\n`
      content += `This report contains findings that may require immediate attention.\n\n`
    }

    content += `New medical imaging results are available for your patient:\n\n`
    content += `Patient: ${patient.firstName} ${patient.lastName}\n`
    content += `DOB: ${patient.dateOfBirth.toLocaleDateString()}\n`
    content += `MRN: ${patient.patientNumber}\n`
    content += `Study: ${study.modality} - ${study.studyDescription || ''}\n`
    content += `Date: ${study.studyDate.toLocaleDateString()}\n\n`

    if (report && report.impression) {
      content += `Clinical Impression:\n${report.impression}\n\n`
    }

    content += `To view the complete report and any recommendations, please access the secure link below:\n\n`
    content += `🔗 ${accessUrl}\n\n`
    content += `This link will expire in 90 days and can be accessed up to 10 times.\n\n`
    
    content += `Please discuss these results with your patient and arrange any necessary follow-up care.\n\n`
    
    if (urgency === 'URGENT' || urgency === 'EMERGENCY') {
      content += `⚠️ Given the urgent nature of these findings, please prioritize contacting your patient.\n\n`
    }

    content += `If you have any questions about these results, please contact us:\n`
    content += `Phone: (03) 8746 4200\n`
    content += `Email: reports@axisimaging.com.au\n\n`
    content += `Thank you for your continued partnership in patient care.\n\n`
    content += `Best regards,\n`
    content += `Axis Imaging Team\n`
    content += `Level 1, 107/21 Cityside Drive, Mickleham VIC 3064`

    return content
  }

  private async createGPReferralRecord(shareId: string, referringGpId: string): Promise<void> {
    try {
      // Link the share to the referring GP for tracking
      await this.prisma.studyShare.update({
        where: { id: shareId },
        data: { recipientId: referringGpId }
      })
    } catch (error) {
      console.error('Error creating GP referral record:', error)
    }
  }

  private async notifyPatientOfGPShare(patientId: string, gpName: string): Promise<void> {
    try {
      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          smsPreferences: true,
          user: { select: { phoneNumber: true } }
        }
      })

      if (!patient || !patient.user.phoneNumber) return

      // Check if patient wants to be notified of shares
      if (patient.smsPreferences?.requireNotification === false) return

      const message = `Hi ${patient.firstName}, your recent scan results have been securely shared with ${gpName}. Please contact them to discuss your results. - Axis Imaging`

      if (this.smsService) {
        await this.smsService.sendSMS({
          to: patient.user.phoneNumber,
          templateType: 'custom_message',
          variables: {
            patientName: patient.firstName,
            message: message
          },
          patientId: patient.id,
          priority: 'normal'
        })
      }
    } catch (error) {
      console.error('Error notifying patient of GP share:', error)
    }
  }
}