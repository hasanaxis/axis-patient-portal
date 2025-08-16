import fs from 'fs/promises'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { fileStorageService } from './file-storage'
import { monitoringService } from './monitoring'

interface DICOMMetadata {
  studyInstanceUID: string
  seriesInstanceUID: string
  sopInstanceUID: string
  accessionNumber: string
  patientID: string
  patientName: string
  studyDate: string
  modality: string
  bodyPartExamined: string
  studyDescription: string
  seriesDescription?: string
  instanceNumber: number
  imageComments?: string
}

interface ModalityDICOMResult {
  success: boolean
  imageId?: string
  error?: string
  studyCreated?: boolean
}

export class ModalityDICOMIntegrationService {
  private prisma: PrismaClient
  private receivedImagesDir: string

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.receivedImagesDir = path.resolve('./storage/received-images')
    this.initializeDirectories()
  }

  private async initializeDirectories() {
    try {
      await fs.mkdir(this.receivedImagesDir, { recursive: true })
      console.log('✅ DICOM receiving directories initialized')
    } catch (error) {
      console.error('❌ Failed to initialize DICOM directories:', error)
    }
  }

  /**
   * Process incoming DICOM image directly from modality
   * This handles the complete workflow from receiving to storing
   */
  async processIncomingDICOMImage(
    dicomBuffer: Buffer,
    metadata: DICOMMetadata
  ): Promise<ModalityDICOMResult> {
    try {
      console.log(`📡 Processing DICOM from modality: ${metadata.modality} - ${metadata.studyInstanceUID}`)

      // 1. Validate DICOM metadata
      if (!this.validateDICOMMetadata(metadata)) {
        throw new Error('Invalid DICOM metadata')
      }

      // 2. Create or find patient
      const patient = await this.createOrFindPatient(metadata)

      // 3. Create or find study
      const study = await this.createOrFindStudy(metadata, patient.id)

      // 4. Create or find series
      const series = await this.createOrFindSeries(metadata, study.id)

      // 5. Store DICOM image
      const imageUrl = await fileStorageService.storeDicomImage(
        metadata.sopInstanceUID,
        dicomBuffer,
        metadata
      )

      // 6. Generate thumbnail (simplified - in production use DICOM processing library)
      const thumbnailUrl = await this.generateDICOMThumbnail(
        dicomBuffer,
        metadata.sopInstanceUID
      )

      // 7. Create image record in database
      const image = await this.prisma.image.create({
        data: {
          seriesId: series.id,
          sopInstanceUID: metadata.sopInstanceUID,
          instanceNumber: metadata.instanceNumber,
          imageUrl,
          thumbnailUrl
        }
      })

      // 8. Update study/series counts
      await this.updateImageCounts(series.id, study.id)

      // 9. Log the event for compliance
      await monitoringService.logPatientAccess(
        patient.id,
        'MODALITY_SYSTEM',
        'IMAGE_RECEIVED',
        {
          studyInstanceUID: metadata.studyInstanceUID,
          sopInstanceUID: metadata.sopInstanceUID,
          modality: metadata.modality,
          source: 'DIRECT_MODALITY'
        }
      )

      console.log(`✅ DICOM image processed: ${metadata.sopInstanceUID}`)

      return {
        success: true,
        imageId: image.id,
        studyCreated: false // Study likely already existed
      }

    } catch (error) {
      console.error(`❌ Failed to process DICOM image: ${error}`)
      
      await monitoringService.logError(error as Error, {
        context: 'DICOM_MODALITY_PROCESSING',
        studyInstanceUID: metadata.studyInstanceUID,
        sopInstanceUID: metadata.sopInstanceUID
      })

      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * Validate DICOM metadata before processing
   */
  private validateDICOMMetadata(metadata: DICOMMetadata): boolean {
    const required = [
      'studyInstanceUID',
      'seriesInstanceUID', 
      'sopInstanceUID',
      'patientID',
      'studyDate',
      'modality'
    ]

    for (const field of required) {
      if (!metadata[field as keyof DICOMMetadata]) {
        console.error(`Missing required DICOM field: ${field}`)
        return false
      }
    }

    return true
  }

  /**
   * Create or find patient based on DICOM metadata
   */
  private async createOrFindPatient(metadata: DICOMMetadata) {
    try {
      // Try to find existing patient
      let patient = await this.prisma.patient.findFirst({
        where: {
          OR: [
            { patientNumber: metadata.patientID },
            { user: { email: `${metadata.patientID}@temp.axisimaging.com.au` } }
          ]
        },
        include: { user: true }
      })

      if (!patient) {
        // Create new patient record
        // Parse patient name (usually in format: "Last^First^Middle")
        const nameParts = metadata.patientName.split('^')
        const lastName = nameParts[0] || 'Unknown'
        const firstName = nameParts[1] || 'Patient'

        // Create user first
        const user = await this.prisma.user.create({
          data: {
            email: `${metadata.patientID}@temp.axisimaging.com.au`,
            firstName,
            lastName,
            phoneNumber: '+61400000000', // Placeholder - will be updated during registration
            passwordHash: 'TEMP_HASH', // Will be set during registration
            isVerified: false,
            role: 'PATIENT'
          }
        })

        // Create patient
        patient = await this.prisma.patient.create({
          data: {
            userId: user.id,
            patientNumber: metadata.patientID,
            dateOfBirth: new Date('1900-01-01'), // Placeholder - will be updated
            gender: 'Unknown' // Will be updated during registration
          },
          include: { user: true }
        })

        console.log(`👤 Created new patient: ${metadata.patientID}`)
      }

      return patient
    } catch (error) {
      console.error('Patient creation error:', error)
      throw error
    }
  }

  /**
   * Create or find study based on DICOM metadata
   */
  private async createOrFindStudy(metadata: DICOMMetadata, patientId: string) {
    try {
      let study = await this.prisma.study.findUnique({
        where: { studyInstanceUID: metadata.studyInstanceUID }
      })

      if (!study) {
        // Parse study date
        const studyDate = this.parseDICOMDate(metadata.studyDate)

        study = await this.prisma.study.create({
          data: {
            patientId,
            studyInstanceUID: metadata.studyInstanceUID,
            accessionNumber: metadata.accessionNumber,
            studyDate,
            studyDescription: metadata.studyDescription || `${metadata.modality} Study`,
            modality: metadata.modality,
            bodyPartExamined: metadata.bodyPartExamined || 'Unknown',
            status: 'COMPLETED',
            priority: 'ROUTINE',
            institutionName: 'Axis Imaging Mickleham',
            numberOfSeries: 1,
            numberOfInstances: 1
          }
        })

        console.log(`📊 Created new study: ${metadata.studyInstanceUID}`)
      }

      return study
    } catch (error) {
      console.error('Study creation error:', error)
      throw error
    }
  }

  /**
   * Create or find series based on DICOM metadata
   */
  private async createOrFindSeries(metadata: DICOMMetadata, studyId: string) {
    try {
      let series = await this.prisma.series.findUnique({
        where: { seriesInstanceUID: metadata.seriesInstanceUID }
      })

      if (!series) {
        series = await this.prisma.series.create({
          data: {
            studyId,
            seriesInstanceUID: metadata.seriesInstanceUID,
            seriesNumber: 1, // Could be extracted from DICOM if available
            seriesDescription: metadata.seriesDescription || metadata.modality,
            modality: metadata.modality,
            numberOfInstances: 1
          }
        })

        console.log(`📷 Created new series: ${metadata.seriesInstanceUID}`)
      }

      return series
    } catch (error) {
      console.error('Series creation error:', error)
      throw error
    }
  }

  /**
   * Generate thumbnail from DICOM image
   * In production, use a DICOM processing library like dcmjs or dicom-parser
   */
  private async generateDICOMThumbnail(
    _dicomBuffer: Buffer,
    sopInstanceUID: string
  ): Promise<string> {
    try {
      // Placeholder thumbnail generation
      // In production, you would:
      // 1. Parse DICOM pixel data
      // 2. Apply windowing/leveling
      // 3. Convert to JPEG/PNG
      // 4. Resize to thumbnail dimensions

      // For now, create a simple placeholder thumbnail
      const placeholderThumbnail = Buffer.from('PLACEHOLDER_THUMBNAIL_DATA')
      
      return await fileStorageService.storeThumbnail(
        sopInstanceUID,
        placeholderThumbnail,
        'jpg'
      )
    } catch (error) {
      console.error('Thumbnail generation error:', error)
      return '/api/thumbnails/placeholder.jpg'
    }
  }

  /**
   * Update image counts in series and study
   */
  private async updateImageCounts(seriesId: string, studyId: string): Promise<void> {
    try {
      // Count images in series
      const seriesImageCount = await this.prisma.image.count({
        where: { seriesId }
      })

      // Update series
      await this.prisma.series.update({
        where: { id: seriesId },
        data: { numberOfInstances: seriesImageCount }
      })

      // Count total images in study
      const studyImageCount = await this.prisma.image.count({
        where: { series: { studyId } }
      })

      // Count series in study
      const seriesCount = await this.prisma.series.count({
        where: { studyId }
      })

      // Update study
      await this.prisma.study.update({
        where: { id: studyId },
        data: { 
          numberOfInstances: studyImageCount,
          numberOfSeries: seriesCount
        }
      })

    } catch (error) {
      console.error('Failed to update image counts:', error)
    }
  }

  /**
   * Parse DICOM date format (YYYYMMDD) to JavaScript Date
   */
  private parseDICOMDate(dicomDate: string): Date {
    try {
      if (dicomDate.length === 8) {
        const year = parseInt(dicomDate.substring(0, 4))
        const month = parseInt(dicomDate.substring(4, 6)) - 1 // JS months are 0-based
        const day = parseInt(dicomDate.substring(6, 8))
        return new Date(year, month, day)
      }
    } catch (error) {
      console.error('Date parsing error:', error)
    }
    
    return new Date() // Fallback to current date
  }

  /**
   * Handle DICOM C-STORE request from modality
   * This would be called by a DICOM receiver service
   */
  async handleDICOMCStore(
    dicomBuffer: Buffer,
    _transferSyntax: string
  ): Promise<ModalityDICOMResult> {
    try {
      // Parse DICOM header to extract metadata
      const metadata = await this.extractDICOMMetadata(dicomBuffer)
      
      if (!metadata) {
        throw new Error('Failed to extract DICOM metadata')
      }

      // Process the DICOM image
      return await this.processIncomingDICOMImage(dicomBuffer, metadata)

    } catch (error) {
      console.error('DICOM C-STORE error:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * Extract metadata from DICOM buffer
   * In production, use dcmjs or similar DICOM parsing library
   */
  private async extractDICOMMetadata(_dicomBuffer: Buffer): Promise<DICOMMetadata | null> {
    try {
      // Placeholder metadata extraction
      // In production, use proper DICOM parsing:
      // const dcmjs = require('dcmjs');
      // const dataset = dcmjs.data.DicomMessage.readFile(dicomBuffer);
      // const metadata = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dataset.dict);

      // For demo purposes, return mock metadata
      return {
        studyInstanceUID: '1.2.3.4.5.6.7.8.9.10',
        seriesInstanceUID: '1.2.3.4.5.6.7.8.9.10.1',
        sopInstanceUID: `1.2.3.4.5.6.7.8.9.10.1.${Date.now()}`,
        accessionNumber: `ACC${Date.now()}`,
        patientID: 'PATIENT001',
        patientName: 'Doe^John^',
        studyDate: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
        modality: 'XR',
        bodyPartExamined: 'CHEST',
        studyDescription: 'Chest X-Ray',
        seriesDescription: 'PA/LAT',
        instanceNumber: 1,
        imageComments: 'Direct from modality'
      }
    } catch (error) {
      console.error('DICOM metadata extraction error:', error)
      return null
    }
  }

  /**
   * Get integration statistics
   */
  async getIntegrationStats(): Promise<any> {
    try {
      const totalImages = await this.prisma.image.count()
      const totalStudies = await this.prisma.study.count()
      const totalSeries = await this.prisma.series.count()
      
      const recentImages = await this.prisma.image.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      })

      return {
        totalImages,
        totalStudies,
        totalSeries,
        recentImages,
        status: 'active',
        lastUpdated: new Date().toISOString()
      }
    } catch (error) {
      console.error('Stats error:', error)
      return { error: 'Failed to get stats' }
    }
  }
}

// Create singleton instance
export const modalityDICOMIntegration = new ModalityDICOMIntegrationService(
  new PrismaClient()
)

export default modalityDICOMIntegration