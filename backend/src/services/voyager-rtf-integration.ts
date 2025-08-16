import fs from 'fs/promises'
import path from 'path'
import { PrismaClient } from '@prisma/client'
// import { fileStorageService } from './file-storage' // Not used in current implementation
import { smsService } from './simple-sms'
import { monitoringService } from './monitoring'

// interface VoyagerRTFReport {
//   studyInstanceUID: string
//   accessionNumber: string
//   patientId: string
//   reportContent: string
//   reportDate: Date
//   radiologist: string
//   status: 'PRELIMINARY' | 'FINAL' | 'ADDENDUM'
//   modality: string
//   studyDescription: string
// }

interface RTFProcessingResult {
  success: boolean
  reportId?: string
  error?: string
  plainText?: string
}

export class VoyagerRTFIntegrationService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Process incoming RTF report from Voyager RIS
   * This would typically be called via webhook or polling service
   */
  async processIncomingRTFReport(
    rtfContent: string,
    studyInstanceUID: string,
    accessionNumber: string
  ): Promise<RTFProcessingResult> {
    try {
      console.log(`📄 Processing RTF report for study: ${studyInstanceUID}`)
      
      // Convert RTF to plain text for storage and display
      const plainText = await this.convertRTFToPlainText(rtfContent)
      
      // Find the study in our database
      const study = await this.prisma.study.findUnique({
        where: { studyInstanceUID },
        include: { 
          patient: { 
            include: { user: true } 
          } 
        }
      })

      if (!study) {
        throw new Error(`Study not found: ${studyInstanceUID}`)
      }

      // Store the RTF report
      const report = await this.prisma.report.upsert({
        where: { studyId: study.id },
        update: {
          findings: plainText,
          status: 'FINAL',
          approvedAt: new Date(),
          updatedAt: new Date()
        },
        create: {
          studyId: study.id,
          reportNumber: `RPT-${accessionNumber}`,
          findings: plainText,
          impression: await this.extractImpressionFromRTF(plainText),
          technique: await this.extractTechniqueFromRTF(plainText),
          clinicalHistory: await this.extractClinicalHistoryFromRTF(plainText),
          status: 'FINAL',
          priority: study.priority,
          approvedAt: new Date()
        }
      })

      // Store original RTF file for audit purposes
      await this.storeOriginalRTFFile(rtfContent, studyInstanceUID)

      // Send SMS notification to patient
      if (study.patient?.user) {
        await this.notifyPatientReportReady(study.patient.user, study)
      }

      // Log the event for compliance
      await monitoringService.logPatientAccess(
        study.patientId,
        'SYSTEM',
        'REPORT_RECEIVED',
        { 
          studyInstanceUID,
          accessionNumber,
          source: 'VOYAGER_RIS',
          format: 'RTF'
        }
      )

      console.log(`✅ RTF report processed successfully for study: ${studyInstanceUID}`)
      
      return {
        success: true,
        reportId: report.id,
        plainText
      }

    } catch (error) {
      console.error(`❌ Failed to process RTF report: ${error}`)
      
      await monitoringService.logError(error as Error, {
        context: 'RTF_REPORT_PROCESSING',
        studyInstanceUID,
        accessionNumber
      })

      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * Convert RTF content to plain text
   * In production, you might use a library like 'rtf-parser' or 'node-rtf-parser'
   */
  private async convertRTFToPlainText(rtfContent: string): Promise<string> {
    try {
      // Basic RTF to plain text conversion
      // Remove RTF control codes and formatting
      let plainText = rtfContent
        .replace(/\\[a-z]+\d*/gi, '') // Remove RTF control words
        .replace(/[{}]/g, '') // Remove braces
        .replace(/\\\\/g, '\\') // Unescape backslashes
        .replace(/\\'/g, "'") // Unescape quotes
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()

      // For production, consider using a proper RTF parser:
      // const rtfParser = require('rtf-parser');
      // const doc = await rtfParser.parseRtf(rtfContent);
      // plainText = doc.content.map(item => item.text).join('');

      return plainText
    } catch (error) {
      console.error('RTF conversion error:', error)
      return rtfContent // Fallback to original content
    }
  }

  /**
   * Extract impression section from report text
   */
  private async extractImpressionFromRTF(plainText: string): Promise<string> {
    const impressionMatch = plainText.match(/IMPRESSION:?\s*(.*?)(?:RECOMMENDATION|$)/is)
    return impressionMatch ? impressionMatch[1].trim() : 'Impression not found'
  }

  /**
   * Extract technique section from report text
   */
  private async extractTechniqueFromRTF(plainText: string): Promise<string> {
    const techniqueMatch = plainText.match(/TECHNIQUE:?\s*(.*?)(?:FINDINGS|IMPRESSION|$)/is)
    return techniqueMatch ? techniqueMatch[1].trim() : ''
  }

  /**
   * Extract clinical history section from report text
   */
  private async extractClinicalHistoryFromRTF(plainText: string): Promise<string> {
    const historyMatch = plainText.match(/(?:CLINICAL HISTORY|HISTORY):?\s*(.*?)(?:TECHNIQUE|FINDINGS|$)/is)
    return historyMatch ? historyMatch[1].trim() : ''
  }

  /**
   * Store original RTF file for audit and compliance
   */
  private async storeOriginalRTFFile(rtfContent: string, studyInstanceUID: string): Promise<void> {
    try {
      const reportsDir = path.resolve('./storage/reports')
      await fs.mkdir(reportsDir, { recursive: true })
      
      const filename = `${studyInstanceUID}_report.rtf`
      const filePath = path.join(reportsDir, filename)
      
      await fs.writeFile(filePath, rtfContent, 'utf8')
      console.log(`📄 Original RTF stored: ${filename}`)
    } catch (error) {
      console.error('Failed to store RTF file:', error)
    }
  }

  /**
   * Send SMS notification when report is ready
   */
  private async notifyPatientReportReady(user: any, study: any): Promise<void> {
    try {
      await smsService.sendReportReadySMS(
        user.phoneNumber,
        user.firstName,
        study.studyDescription
      )
    } catch (error) {
      console.error('Failed to send report ready SMS:', error)
    }
  }

  /**
   * Webhook endpoint handler for Voyager RIS
   * This would be called when Voyager has a new report ready
   */
  async handleVoyagerWebhook(payload: any): Promise<any> {
    try {
      console.log('📡 Received Voyager RIS webhook:', payload)

      const { 
        studyInstanceUID, 
        accessionNumber, 
        reportContent, 
        reportFormat 
      } = payload

      if (!studyInstanceUID || !accessionNumber || !reportContent) {
        throw new Error('Invalid webhook payload: missing required fields')
      }

      if (reportFormat !== 'RTF') {
        throw new Error(`Unsupported report format: ${reportFormat}`)
      }

      // Process the RTF report
      const result = await this.processIncomingRTFReport(
        reportContent,
        studyInstanceUID,
        accessionNumber
      )

      return {
        success: result.success,
        message: result.success ? 'Report processed successfully' : result.error,
        timestamp: new Date().toISOString()
      }

    } catch (error) {
      console.error('Voyager webhook error:', error)
      return {
        success: false,
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Polling service to check for new reports from Voyager
   * Alternative to webhook if real-time integration is not available
   */
  async pollForNewReports(): Promise<void> {
    try {
      console.log('🔄 Polling Voyager RIS for new reports...')

      // Get pending studies (those without reports)
      const pendingStudies = await this.prisma.study.findMany({
        where: { report: null },
        select: { studyInstanceUID: true, accessionNumber: true }
      })

      for (const study of pendingStudies) {
        try {
          // Call Voyager API to check for report
          const report = await this.fetchReportFromVoyager(
            study.studyInstanceUID,
            study.accessionNumber
          )

          if (report) {
            await this.processIncomingRTFReport(
              report.content,
              study.studyInstanceUID,
              study.accessionNumber
            )
          }
        } catch (error) {
          console.error(`Failed to fetch report for ${study.studyInstanceUID}:`, error)
        }
      }

    } catch (error) {
      console.error('Report polling error:', error)
    }
  }

  /**
   * Fetch report from Voyager RIS API
   */
  private async fetchReportFromVoyager(
    studyInstanceUID: string, 
    _accessionNumber: string
  ): Promise<{ content: string } | null> {
    // Implementation would depend on Voyager API specifications
    // This is a placeholder for the actual API integration
    
    console.log(`📞 Checking Voyager for report: ${studyInstanceUID}`)
    
    // Example API call (adjust based on actual Voyager API):
    // const response = await fetch(`${VOYAGER_API_URL}/reports/${accessionNumber}`, {
    //   headers: {
    //     'Authorization': `Bearer ${VOYAGER_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   }
    // });
    
    // if (response.ok) {
    //   const data = await response.json();
    //   return { content: data.rtfContent };
    // }
    
    return null // No report available yet
  }

  /**
   * Start automated polling service
   */
  startPollingService(intervalMinutes: number = 5): void {
    const intervalMs = intervalMinutes * 60 * 1000
    
    setInterval(async () => {
      await this.pollForNewReports()
    }, intervalMs)

    console.log(`🔄 Voyager polling service started (checking every ${intervalMinutes} minutes)`)
  }
}

// Create singleton instance
export const voyagerRTFIntegration = new VoyagerRTFIntegrationService(
  new PrismaClient()
)

export default voyagerRTFIntegration