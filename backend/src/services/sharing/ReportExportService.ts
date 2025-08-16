import { PrismaClient } from '@prisma/client'
import PDFDocument from 'pdfkit'
import { createHash, randomBytes } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'

export interface ReportExportRequest {
  studyId: string
  reportId?: string
  patientId: string
  exportType: ExportType
  format: ExportFormat
  quality?: ExportQuality
  
  // Content Selection
  includeImages?: boolean
  includeReport?: boolean
  watermark?: boolean
  
  // Purpose and Access
  purpose: ExportPurpose
  requestedBy: string
  requestReason?: string
  
  // Security
  isEncrypted?: boolean
  password?: string
  maxDownloads?: number
  expiresAt?: Date
}

export interface ExportResult {
  success: boolean
  exportId?: string
  downloadUrl?: string
  fileName?: string
  message: string
  errors?: string[]
}

// Type definitions for enums
type ExportType = 'PATIENT_COPY' | 'GP_REFERRAL' | 'SPECIALIST_REFERRAL' | 'LEGAL_COPY' | 'INSURANCE_CLAIM' | 'RESEARCH_DATA' | 'BACKUP_COPY' | 'PRINT_COPY'
type ExportFormat = 'PDF' | 'DICOM' | 'JPEG' | 'PNG' | 'TIFF' | 'ZIP' | 'ENCRYPTED_PDF'
type ExportQuality = 'LOW' | 'MEDIUM' | 'HIGH' | 'DIAGNOSTIC'
type ExportPurpose = 'MEDICAL_CONSULTATION' | 'PATIENT_RECORDS' | 'LEGAL_PROCEEDINGS' | 'INSURANCE_CLAIM' | 'RESEARCH' | 'SECOND_OPINION' | 'CONTINUING_CARE' | 'PATIENT_REQUEST'

export class ReportExportService {
  private prisma: PrismaClient
  private exportDir: string
  private baseUrl: string

  constructor(
    prisma: PrismaClient, 
    exportDir: string = '/var/exports',
    baseUrl: string = 'https://portal.axisimaging.com.au'
  ) {
    this.prisma = prisma
    this.exportDir = exportDir
    this.baseUrl = baseUrl
  }

  async createExport(request: ReportExportRequest): Promise<ExportResult> {
    try {
      // Validate the request
      const validation = await this.validateExportRequest(request)
      if (!validation.isValid) {
        return {
          success: false,
          message: 'Export request validation failed',
          errors: validation.errors
        }
      }

      // Get study and report data
      const studyData = await this.getStudyData(request.studyId, request.reportId)
      if (!studyData) {
        return {
          success: false,
          message: 'Study or report not found'
        }
      }

      // Generate filename and paths
      const fileName = this.generateFileName(studyData, request)
      const filePath = path.join(this.exportDir, fileName)
      
      // Create the export record
      const exportRecord = await this.prisma.reportExport.create({
        data: {
          studyId: request.studyId,
          reportId: request.reportId,
          patientId: request.patientId,
          exportType: request.exportType as any,
          format: request.format as any,
          quality: (request.quality || 'HIGH') as any,
          includeImages: request.includeImages || false,
          includeReport: request.includeReport ?? true,
          watermark: request.watermark ?? true,
          fileName,
          filePath,
          mimeType: this.getMimeType(request.format),
          purpose: request.purpose as any,
          requestedBy: request.requestedBy,
          requestReason: request.requestReason,
          isEncrypted: request.isEncrypted || false,
          password: request.password,
          maxDownloads: request.maxDownloads || 1,
          expiresAt: request.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
          status: 'PROCESSING'
        }
      })

      // Generate the export file
      let fileGenerated = false
      let fileSize = 0

      switch (request.format) {
        case 'PDF':
        case 'ENCRYPTED_PDF':
          fileGenerated = await this.generatePDFReport(studyData, filePath, request)
          break
        case 'DICOM':
          fileGenerated = await this.generateDICOMExport(studyData, filePath, request)
          break
        case 'JPEG':
        case 'PNG':
          fileGenerated = await this.generateImageExport(studyData, filePath, request)
          break
        case 'ZIP':
          fileGenerated = await this.generateZipExport(studyData, filePath, request)
          break
        default:
          throw new Error(`Unsupported export format: ${request.format}`)
      }

      if (fileGenerated) {
        // Get file size
        const stats = await fs.stat(filePath)
        fileSize = stats.size

        // Generate access token and download URL
        const accessToken = randomBytes(32).toString('hex')
        const downloadUrl = `${this.baseUrl}/api/exports/download/${accessToken}`

        // Update export record
        await this.prisma.reportExport.update({
          where: { id: exportRecord.id },
          data: {
            status: 'COMPLETED',
            processedAt: new Date(),
            fileSize: BigInt(fileSize),
            accessToken,
            downloadUrl,
            checksum: await this.calculateChecksum(filePath)
          }
        })

        return {
          success: true,
          exportId: exportRecord.id,
          downloadUrl,
          fileName,
          message: `${request.format} export created successfully. File size: ${this.formatFileSize(fileSize)}`
        }
      } else {
        // Update export record with failure
        await this.prisma.reportExport.update({
          where: { id: exportRecord.id },
          data: {
            status: 'FAILED',
            error: 'Failed to generate export file'
          }
        })

        return {
          success: false,
          message: 'Failed to generate export file'
        }
      }

    } catch (error) {
      console.error('Error creating export:', error)
      return {
        success: false,
        message: 'Failed to create export. Please try again.'
      }
    }
  }

  async downloadExport(accessToken: string, downloadInfo: {
    ipAddress: string
    userAgent?: string
  }): Promise<{
    success: boolean
    filePath?: string
    fileName?: string
    mimeType?: string
    message: string
  }> {
    try {
      const exportRecord = await this.prisma.reportExport.findUnique({
        where: { accessToken },
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      })

      if (!exportRecord) {
        return {
          success: false,
          message: 'Invalid or expired download link'
        }
      }

      // Check if expired
      if (exportRecord.expiresAt && exportRecord.expiresAt < new Date()) {
        return {
          success: false,
          message: 'Download link has expired'
        }
      }

      // Check download limits
      if (exportRecord.maxDownloads && exportRecord.downloadCount >= exportRecord.maxDownloads) {
        return {
          success: false,
          message: 'Maximum number of downloads reached'
        }
      }

      // Check if file exists
      try {
        await fs.access(exportRecord.filePath)
      } catch {
        return {
          success: false,
          message: 'Export file not found'
        }
      }

      // Update download count
      await this.prisma.reportExport.update({
        where: { id: exportRecord.id },
        data: {
          downloadCount: { increment: 1 }
        }
      })

      return {
        success: true,
        filePath: exportRecord.filePath,
        fileName: exportRecord.fileName,
        mimeType: exportRecord.mimeType,
        message: 'Download authorized'
      }

    } catch (error) {
      console.error('Error processing download:', error)
      return {
        success: false,
        message: 'Failed to process download request'
      }
    }
  }

  async getPatientExports(patientId: string): Promise<any[]> {
    try {
      const exports = await this.prisma.reportExport.findMany({
        where: { patientId },
        include: {
          study: {
            select: {
              studyDate: true,
              modality: true,
              studyDescription: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      })

      return exports.map(exp => ({
        id: exp.id,
        fileName: exp.fileName,
        format: exp.format,
        purpose: exp.purpose,
        createdAt: exp.createdAt,
        expiresAt: exp.expiresAt,
        downloadCount: exp.downloadCount,
        maxDownloads: exp.maxDownloads,
        status: exp.status,
        study: exp.study,
        downloadUrl: exp.downloadUrl,
        fileSize: exp.fileSize ? Number(exp.fileSize) : null
      }))
    } catch (error) {
      console.error('Error getting patient exports:', error)
      return []
    }
  }

  private async generatePDFReport(studyData: any, filePath: string, request: ReportExportRequest): Promise<boolean> {
    try {
      const doc = new PDFDocument({ margin: 50 })
      const stream = doc.pipe(require('fs').createWriteStream(filePath))

      // Add Axis Imaging header
      this.addPDFHeader(doc, studyData, request.watermark)

      // Add patient information
      this.addPatientInfo(doc, studyData.patient)

      // Add study information
      this.addStudyInfo(doc, studyData.study)

      // Add report content if included
      if (request.includeReport && studyData.report) {
        this.addReportContent(doc, studyData.report)
      }

      // Add images if requested
      if (request.includeImages && studyData.images) {
        await this.addImagesToPDF(doc, studyData.images, request.quality)
      }

      // Add footer with security information
      this.addPDFFooter(doc, request)

      doc.end()

      // Wait for the PDF to be written
      await new Promise((resolve, reject) => {
        stream.on('finish', resolve)
        stream.on('error', reject)
      })

      return true
    } catch (error) {
      console.error('Error generating PDF report:', error)
      return false
    }
  }

  private addPDFHeader(doc: PDFKit.PDFDocument, studyData: any, watermark?: boolean): void {
    // Add Axis Imaging logo and header
    doc.fontSize(20).text('AXIS IMAGING', { align: 'center' })
    doc.fontSize(12).text('Level 1, 107/21 Cityside Drive, Mickleham VIC 3064', { align: 'center' })
    doc.text('Phone: (03) 8746 4200 | Email: info@axisimaging.com.au', { align: 'center' })
    doc.moveDown()

    // Add watermark if requested
    if (watermark) {
      doc.fontSize(40)
         .fillColor('#CCCCCC')
         .text('CONFIDENTIAL', 200, 300, { 
           align: 'center',
           angle: 45,
           opacity: 0.3
         })
         .fillColor('#000000')
         .fontSize(12)
    }

    doc.text('MEDICAL IMAGING REPORT', { align: 'center', underline: true })
    doc.moveDown()
  }

  private addPatientInfo(doc: PDFKit.PDFDocument, patient: any): void {
    doc.fontSize(14).text('PATIENT INFORMATION', { underline: true })
    doc.fontSize(11)
    doc.text(`Name: ${patient.firstName} ${patient.lastName}`)
    doc.text(`Date of Birth: ${patient.dateOfBirth.toLocaleDateString()}`)
    doc.text(`Patient Number: ${patient.patientNumber}`)
    if (patient.medicareNumber) {
      doc.text(`Medicare Number: ${patient.medicareNumber}`)
    }
    doc.moveDown()
  }

  private addStudyInfo(doc: PDFKit.PDFDocument, study: any): void {
    doc.fontSize(14).text('STUDY INFORMATION', { underline: true })
    doc.fontSize(11)
    doc.text(`Study Date: ${study.studyDate.toLocaleDateString()}`)
    doc.text(`Modality: ${study.modality}`)
    doc.text(`Study Description: ${study.studyDescription || 'N/A'}`)
    doc.text(`Accession Number: ${study.accessionNumber}`)
    if (study.referringPhysician) {
      doc.text(`Referring Physician: ${study.referringPhysician}`)
    }
    doc.moveDown()
  }

  private addReportContent(doc: PDFKit.PDFDocument, report: any): void {
    doc.addPage()
    doc.fontSize(14).text('RADIOLOGIST REPORT', { underline: true })
    doc.fontSize(11)

    if (report.clinicalHistory) {
      doc.text('CLINICAL HISTORY:', { underline: true })
      doc.text(report.clinicalHistory)
      doc.moveDown()
    }

    if (report.technique) {
      doc.text('TECHNIQUE:', { underline: true })
      doc.text(report.technique)
      doc.moveDown()
    }

    doc.text('FINDINGS:', { underline: true })
    doc.text(report.findings)
    doc.moveDown()

    doc.text('IMPRESSION:', { underline: true })
    doc.text(report.impression)
    doc.moveDown()

    if (report.recommendations) {
      doc.text('RECOMMENDATIONS:', { underline: true })
      doc.text(report.recommendations)
      doc.moveDown()
    }

    // Add radiologist information
    doc.text(`Report Date: ${report.approvedAt?.toLocaleDateString() || 'Pending'}`)
    doc.text(`Radiologist: ${report.radiologist?.firstName} ${report.radiologist?.lastName}`)
    doc.text(`License: ${report.radiologist?.licenseNumber}`)
  }

  private async addImagesToPDF(doc: PDFKit.PDFDocument, images: any[], quality?: ExportQuality): Promise<void> {
    // This would add selected DICOM images to the PDF
    // Implementation would depend on DICOM to image conversion
    doc.addPage()
    doc.fontSize(14).text('STUDY IMAGES', { underline: true })
    doc.text('Images would be included here based on the selected quality and format.')
  }

  private addPDFFooter(doc: PDFKit.PDFDocument, request: ReportExportRequest): void {
    const pages = doc.bufferedPageRange()
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i)
      
      // Add page number
      doc.fontSize(10)
         .text(`Page ${i + 1} of ${pages.count}`, 
               doc.page.margins.left, 
               doc.page.height - doc.page.margins.bottom,
               { align: 'center' })

      // Add generation info
      doc.text(`Generated: ${new Date().toLocaleString()} | Purpose: ${request.purpose}`,
               doc.page.margins.left,
               doc.page.height - doc.page.margins.bottom + 15,
               { align: 'center' })
    }
  }

  private async generateDICOMExport(studyData: any, filePath: string, request: ReportExportRequest): Promise<boolean> {
    // Implementation for DICOM export
    // This would package DICOM files into a zip or keep original format
    console.log('DICOM export not yet implemented')
    return false
  }

  private async generateImageExport(studyData: any, filePath: string, request: ReportExportRequest): Promise<boolean> {
    // Implementation for image export (JPEG/PNG)
    // This would convert DICOM to standard image formats
    console.log('Image export not yet implemented')
    return false
  }

  private async generateZipExport(studyData: any, filePath: string, request: ReportExportRequest): Promise<boolean> {
    // Implementation for ZIP export
    // This would package all files into a ZIP archive
    console.log('ZIP export not yet implemented')
    return false
  }

  private async getStudyData(studyId: string, reportId?: string): Promise<any> {
    try {
      const study = await this.prisma.study.findUnique({
        where: { id: studyId },
        include: {
          patient: true,
          report: reportId ? { where: { id: reportId } } : true,
          series: {
            include: {
              images: {
                take: 10 // Limit images for export
              }
            }
          },
          radiologist: true
        }
      })

      if (!study) return null

      return {
        study,
        patient: study.patient,
        report: Array.isArray(study.report) ? study.report[0] : study.report,
        images: study.series.flatMap(s => s.images)
      }
    } catch (error) {
      console.error('Error getting study data:', error)
      return null
    }
  }

  private generateFileName(studyData: any, request: ReportExportRequest): string {
    const patient = studyData.patient
    const study = studyData.study
    const date = new Date().toISOString().split('T')[0]
    const extension = this.getFileExtension(request.format)
    
    const patientName = `${patient.lastName}_${patient.firstName}`.replace(/\s/g, '_')
    const modalityDate = study.studyDate.toISOString().split('T')[0]
    
    return `${patientName}_${study.modality}_${modalityDate}_${date}${extension}`
  }

  private getFileExtension(format: ExportFormat): string {
    switch (format) {
      case 'PDF':
      case 'ENCRYPTED_PDF':
        return '.pdf'
      case 'JPEG':
        return '.jpg'
      case 'PNG':
        return '.png'
      case 'TIFF':
        return '.tiff'
      case 'ZIP':
        return '.zip'
      case 'DICOM':
        return '.dcm'
      default:
        return '.pdf'
    }
  }

  private getMimeType(format: ExportFormat): string {
    switch (format) {
      case 'PDF':
      case 'ENCRYPTED_PDF':
        return 'application/pdf'
      case 'JPEG':
        return 'image/jpeg'
      case 'PNG':
        return 'image/png'
      case 'TIFF':
        return 'image/tiff'
      case 'ZIP':
        return 'application/zip'
      case 'DICOM':
        return 'application/dicom'
      default:
        return 'application/pdf'
    }
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    try {
      const fileBuffer = await fs.readFile(filePath)
      return createHash('sha256').update(fileBuffer).digest('hex')
    } catch (error) {
      console.error('Error calculating checksum:', error)
      return ''
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  private async validateExportRequest(request: ReportExportRequest): Promise<{
    isValid: boolean
    errors: string[]
  }> {
    const errors: string[] = []

    // Check if study exists
    const study = await this.prisma.study.findUnique({
      where: { id: request.studyId }
    })

    if (!study) {
      errors.push('Study not found')
    }

    // Validate required fields
    if (!request.requestedBy) {
      errors.push('Requested by is required')
    }

    // Validate export format
    const validFormats = ['PDF', 'DICOM', 'JPEG', 'PNG', 'TIFF', 'ZIP', 'ENCRYPTED_PDF']
    if (!validFormats.includes(request.format)) {
      errors.push('Invalid export format')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Cleanup old exports (run as scheduled job)
  async cleanupExpiredExports(): Promise<number> {
    try {
      const expiredExports = await this.prisma.reportExport.findMany({
        where: {
          expiresAt: { lt: new Date() },
          deletedAt: null
        }
      })

      let deletedCount = 0

      for (const exp of expiredExports) {
        try {
          // Delete the physical file
          await fs.unlink(exp.filePath)
        } catch (error) {
          console.error(`Error deleting file ${exp.filePath}:`, error)
        }

        // Mark as deleted in database
        await this.prisma.reportExport.update({
          where: { id: exp.id },
          data: { deletedAt: new Date() }
        })

        deletedCount++
      }

      console.log(`Cleaned up ${deletedCount} expired exports`)
      return deletedCount
    } catch (error) {
      console.error('Error cleaning up expired exports:', error)
      return 0
    }
  }
}