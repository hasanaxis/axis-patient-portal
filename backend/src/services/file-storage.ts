import fs from 'fs/promises'
import path from 'path'
import { config } from '../config/config'

export class FileStorageService {
  private baseStoragePath: string
  private imagesPath: string
  private thumbnailsPath: string
  private uploadsPath: string

  constructor() {
    this.baseStoragePath = path.resolve(config.UPLOAD_PATH || './storage')
    this.imagesPath = path.join(this.baseStoragePath, 'images')
    this.thumbnailsPath = path.join(this.baseStoragePath, 'thumbnails')
    this.uploadsPath = path.join(this.baseStoragePath, 'uploads')
    this.initializeDirectories()
  }

  private async initializeDirectories() {
    try {
      await fs.mkdir(this.baseStoragePath, { recursive: true })
      await fs.mkdir(this.imagesPath, { recursive: true })
      await fs.mkdir(this.thumbnailsPath, { recursive: true })
      await fs.mkdir(this.uploadsPath, { recursive: true })
      console.log('✅ File storage directories initialized')
    } catch (error) {
      console.error('❌ Failed to initialize storage directories:', error)
    }
  }

  // Store DICOM image file
  async storeDicomImage(
    sopInstanceUID: string, 
    buffer: Buffer, 
    metadata?: any
  ): Promise<string> {
    try {
      const filename = `${sopInstanceUID}.dcm`
      const filePath = path.join(this.imagesPath, filename)
      
      await fs.writeFile(filePath, buffer)
      
      // Store metadata if provided
      if (metadata) {
        const metadataPath = path.join(this.imagesPath, `${sopInstanceUID}.json`)
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2))
      }
      
      console.log(`✅ DICOM image stored: ${filename}`)
      return `/api/images/${filename}`
    } catch (error) {
      console.error('❌ Failed to store DICOM image:', error)
      throw new Error('Failed to store DICOM image')
    }
  }

  // Store thumbnail image
  async storeThumbnail(
    sopInstanceUID: string, 
    buffer: Buffer, 
    format: 'jpg' | 'png' = 'jpg'
  ): Promise<string> {
    try {
      const filename = `${sopInstanceUID}_thumb.${format}`
      const filePath = path.join(this.thumbnailsPath, filename)
      
      await fs.writeFile(filePath, buffer)
      
      console.log(`✅ Thumbnail stored: ${filename}`)
      return `/api/thumbnails/${filename}`
    } catch (error) {
      console.error('❌ Failed to store thumbnail:', error)
      throw new Error('Failed to store thumbnail')
    }
  }

  // Get image file
  async getImageFile(filename: string): Promise<Buffer | null> {
    try {
      const filePath = path.join(this.imagesPath, filename)
      const buffer = await fs.readFile(filePath)
      return buffer
    } catch (error) {
      console.error(`❌ Failed to get image file ${filename}:`, error)
      return null
    }
  }

  // Get thumbnail file
  async getThumbnailFile(filename: string): Promise<Buffer | null> {
    try {
      const filePath = path.join(this.thumbnailsPath, filename)
      const buffer = await fs.readFile(filePath)
      return buffer
    } catch (error) {
      console.error(`❌ Failed to get thumbnail file ${filename}:`, error)
      return null
    }
  }

  // Store uploaded file (general purpose)
  async storeUploadedFile(
    originalName: string,
    buffer: Buffer,
    _mimeType?: string
  ): Promise<string> {
    try {
      const timestamp = Date.now()
      const extension = path.extname(originalName)
      const baseName = path.basename(originalName, extension)
      const filename = `${baseName}_${timestamp}${extension}`
      const filePath = path.join(this.uploadsPath, filename)
      
      await fs.writeFile(filePath, buffer)
      
      console.log(`✅ File uploaded: ${filename}`)
      return `/api/uploads/${filename}`
    } catch (error) {
      console.error('❌ Failed to store uploaded file:', error)
      throw new Error('Failed to store uploaded file')
    }
  }

  // Delete file
  async deleteFile(relativePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.baseStoragePath, relativePath.replace('/api/', ''))
      await fs.unlink(fullPath)
      console.log(`✅ File deleted: ${relativePath}`)
      return true
    } catch (error) {
      console.error(`❌ Failed to delete file ${relativePath}:`, error)
      return false
    }
  }

  // Check if file exists
  async fileExists(relativePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.baseStoragePath, relativePath.replace('/api/', ''))
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  }

  // Get file info
  async getFileInfo(relativePath: string): Promise<any> {
    try {
      const fullPath = path.join(this.baseStoragePath, relativePath.replace('/api/', ''))
      const stats = await fs.stat(fullPath)
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      }
    } catch (error) {
      console.error(`❌ Failed to get file info for ${relativePath}:`, error)
      return null
    }
  }

  // Create sample DICOM files for testing
  async createSampleFiles(): Promise<void> {
    try {
      // Create sample DICOM files (mock data)
      const sampleDicomContent = Buffer.from('DICM' + 'Sample DICOM file content for development')
      await this.storeDicomImage('1.2.3.4.5.6.7.8.9.10.1.1', sampleDicomContent, {
        studyInstanceUID: '1.2.3.4.5.6.7.8.9.10',
        seriesInstanceUID: '1.2.3.4.5.6.7.8.9.10.1',
        sopInstanceUID: '1.2.3.4.5.6.7.8.9.10.1.1',
        modality: 'XR',
        bodyPart: 'CHEST',
        viewPosition: 'PA'
      })

      await this.storeDicomImage('1.2.3.4.5.6.7.8.9.10.1.2', sampleDicomContent, {
        studyInstanceUID: '1.2.3.4.5.6.7.8.9.10',
        seriesInstanceUID: '1.2.3.4.5.6.7.8.9.10.1',
        sopInstanceUID: '1.2.3.4.5.6.7.8.9.10.1.2',
        modality: 'XR',
        bodyPart: 'CHEST',
        viewPosition: 'LAT'
      })

      // Create sample thumbnails (mock image data)
      const sampleThumbnail = Buffer.from('SAMPLE_THUMBNAIL_DATA')
      await this.storeThumbnail('1.2.3.4.5.6.7.8.9.10.1.1', sampleThumbnail)
      await this.storeThumbnail('1.2.3.4.5.6.7.8.9.10.1.2', sampleThumbnail)

      console.log('✅ Sample DICOM files and thumbnails created')
    } catch (error) {
      console.error('❌ Failed to create sample files:', error)
    }
  }

  // Get storage stats
  async getStorageStats(): Promise<any> {
    try {
      const imagesCount = (await fs.readdir(this.imagesPath)).filter(f => f.endsWith('.dcm')).length
      const thumbnailsCount = (await fs.readdir(this.thumbnailsPath)).filter(f => f.includes('_thumb.')).length
      const uploadsCount = (await fs.readdir(this.uploadsPath)).length

      return {
        images: imagesCount,
        thumbnails: thumbnailsCount,
        uploads: uploadsCount,
        paths: {
          base: this.baseStoragePath,
          images: this.imagesPath,
          thumbnails: this.thumbnailsPath,
          uploads: this.uploadsPath
        }
      }
    } catch (error) {
      console.error('❌ Failed to get storage stats:', error)
      return null
    }
  }
}

// Create singleton instance
export const fileStorageService = new FileStorageService()
export default fileStorageService