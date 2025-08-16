import AsyncStorage from '@react-native-async-storage/async-storage'
import * as FileSystem from 'expo-file-system'
import * as SQLite from 'expo-sqlite'
import NetInfo from '@react-native-community/netinfo'
import { Platform } from 'react-native'

interface CacheConfig {
  maxSizeBytes: number
  maxAge: number // in milliseconds
  compressionQuality: number
}

interface OfflineData {
  studies: any[]
  reports: any[]
  images: any[]
  metadata: any
  lastSync: Date
}

interface SyncQueueItem {
  id: string
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  entity: 'appointment' | 'share' | 'export' | 'consent'
  data: any
  timestamp: Date
  retryCount: number
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
}

export class OfflineStorageService {
  private static instance: OfflineStorageService
  private db: SQLite.SQLiteDatabase
  private cacheConfig: CacheConfig
  private syncQueue: SyncQueueItem[] = []
  private isOnline: boolean = true
  private syncInProgress: boolean = false

  private readonly STORAGE_KEYS = {
    OFFLINE_DATA: '@axis_offline_data',
    SYNC_QUEUE: '@axis_sync_queue',
    CACHE_METADATA: '@axis_cache_metadata',
    USER_PREFERENCES: '@axis_user_preferences',
    AUTH_STATE: '@axis_auth_state'
  }

  private readonly IMAGE_CACHE_DIR = `${FileSystem.documentDirectory}image_cache/`
  private readonly REPORT_CACHE_DIR = `${FileSystem.documentDirectory}report_cache/`
  private readonly TEMP_DIR = `${FileSystem.cacheDirectory}temp/`

  private constructor() {
    this.cacheConfig = {
      maxSizeBytes: 500 * 1024 * 1024, // 500MB
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      compressionQuality: 0.8
    }
    this.initializeDatabase()
    this.setupNetworkListener()
    this.ensureDirectories()
  }

  static getInstance(): OfflineStorageService {
    if (!OfflineStorageService.instance) {
      OfflineStorageService.instance = new OfflineStorageService()
    }
    return OfflineStorageService.instance
  }

  private async initializeDatabase() {
    this.db = await SQLite.openDatabaseAsync('axis_offline.db')
    
    // Create tables for offline storage
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS studies (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        study_date TEXT,
        modality TEXT,
        description TEXT,
        data TEXT,
        cached_at INTEGER,
        last_accessed INTEGER,
        size_bytes INTEGER
      );

      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        study_id TEXT,
        content TEXT,
        findings TEXT,
        impression TEXT,
        cached_at INTEGER,
        FOREIGN KEY (study_id) REFERENCES studies(id)
      );

      CREATE TABLE IF NOT EXISTS image_metadata (
        id TEXT PRIMARY KEY,
        study_id TEXT,
        series_id TEXT,
        file_path TEXT,
        thumbnail_path TEXT,
        size_bytes INTEGER,
        cached_at INTEGER,
        quality TEXT,
        FOREIGN KEY (study_id) REFERENCES studies(id)
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        type TEXT,
        entity TEXT,
        data TEXT,
        timestamp INTEGER,
        retry_count INTEGER DEFAULT 0,
        priority TEXT DEFAULT 'MEDIUM',
        status TEXT DEFAULT 'PENDING'
      );

      CREATE TABLE IF NOT EXISTS cache_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total_size_bytes INTEGER DEFAULT 0,
        study_count INTEGER DEFAULT 0,
        image_count INTEGER DEFAULT 0,
        report_count INTEGER DEFAULT 0,
        last_cleanup INTEGER,
        last_sync INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_studies_patient ON studies(patient_id);
      CREATE INDEX IF NOT EXISTS idx_studies_date ON studies(study_date);
      CREATE INDEX IF NOT EXISTS idx_reports_study ON reports(study_id);
      CREATE INDEX IF NOT EXISTS idx_images_study ON image_metadata(study_id);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
    `)
  }

  private async ensureDirectories() {
    const dirs = [this.IMAGE_CACHE_DIR, this.REPORT_CACHE_DIR, this.TEMP_DIR]
    
    for (const dir of dirs) {
      const info = await FileSystem.getInfoAsync(dir)
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true })
      }
    }
  }

  private setupNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline
      this.isOnline = state.isConnected ?? false

      if (wasOffline && this.isOnline) {
        // Connection restored - trigger sync
        this.performBackgroundSync()
      }
    })
  }

  // ==================== OFFLINE DATA STORAGE ====================

  async cacheStudy(study: any, options: { includeImages?: boolean; quality?: 'LOW' | 'MEDIUM' | 'HIGH' } = {}) {
    try {
      const { includeImages = false, quality = 'MEDIUM' } = options
      
      // Store study metadata in SQLite
      await this.db.runAsync(
        `INSERT OR REPLACE INTO studies (id, patient_id, study_date, modality, description, data, cached_at, last_accessed, size_bytes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          study.id,
          study.patientId,
          study.studyDate,
          study.modality,
          study.studyDescription,
          JSON.stringify(study),
          Date.now(),
          Date.now(),
          JSON.stringify(study).length
        ]
      )

      // Cache report if available
      if (study.report) {
        await this.cacheReport(study.id, study.report)
      }

      // Cache images if requested
      if (includeImages && study.images) {
        await this.cacheStudyImages(study.id, study.images, quality)
      }

      // Update cache statistics
      await this.updateCacheStats()

      return { success: true, studyId: study.id }
    } catch (error) {
      console.error('Error caching study:', error)
      return { success: false, error: error.message }
    }
  }

  async cacheReport(studyId: string, report: any) {
    try {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO reports (id, study_id, content, findings, impression, cached_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          report.id,
          studyId,
          JSON.stringify(report),
          report.findings,
          report.impression,
          Date.now()
        ]
      )

      // Also save as PDF if available
      if (report.pdfUrl) {
        const pdfPath = `${this.REPORT_CACHE_DIR}${report.id}.pdf`
        await FileSystem.downloadAsync(report.pdfUrl, pdfPath)
      }

      return { success: true }
    } catch (error) {
      console.error('Error caching report:', error)
      return { success: false, error: error.message }
    }
  }

  async cacheStudyImages(studyId: string, images: any[], quality: 'LOW' | 'MEDIUM' | 'HIGH') {
    try {
      const qualitySettings = {
        LOW: { resolution: 512, quality: 0.6 },
        MEDIUM: { resolution: 1024, quality: 0.8 },
        HIGH: { resolution: 2048, quality: 0.9 }
      }

      const settings = qualitySettings[quality]
      const imageCachePromises = []

      for (const image of images) {
        const imagePath = `${this.IMAGE_CACHE_DIR}${studyId}/${image.id}.jpg`
        const thumbnailPath = `${this.IMAGE_CACHE_DIR}${studyId}/thumb_${image.id}.jpg`

        imageCachePromises.push(
          this.downloadAndCompressImage(image.url, imagePath, settings.resolution, settings.quality)
            .then(async (size) => {
              // Store metadata in database
              await this.db.runAsync(
                `INSERT OR REPLACE INTO image_metadata 
                 (id, study_id, series_id, file_path, thumbnail_path, size_bytes, cached_at, quality)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  image.id,
                  studyId,
                  image.seriesId,
                  imagePath,
                  thumbnailPath,
                  size,
                  Date.now(),
                  quality
                ]
              )
            })
        )
      }

      await Promise.all(imageCachePromises)
      return { success: true, imageCount: images.length }
    } catch (error) {
      console.error('Error caching images:', error)
      return { success: false, error: error.message }
    }
  }

  private async downloadAndCompressImage(
    url: string, 
    destinationPath: string, 
    maxResolution: number, 
    quality: number
  ): Promise<number> {
    try {
      // Ensure directory exists
      const dir = destinationPath.substring(0, destinationPath.lastIndexOf('/'))
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true })

      // Download image
      const downloadResult = await FileSystem.downloadAsync(url, destinationPath)
      
      // Get file size
      const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri)
      
      // TODO: Implement image compression using native module
      // For now, return the original size
      return fileInfo.size || 0
    } catch (error) {
      console.error('Error downloading/compressing image:', error)
      throw error
    }
  }

  // ==================== OFFLINE DATA RETRIEVAL ====================

  async getOfflineStudies(patientId: string): Promise<any[]> {
    try {
      const result = await this.db.getAllAsync(
        `SELECT * FROM studies WHERE patient_id = ? ORDER BY study_date DESC`,
        [patientId]
      )

      return result.map(row => ({
        ...JSON.parse(row.data as string),
        isOffline: true,
        cachedAt: new Date(row.cached_at as number)
      }))
    } catch (error) {
      console.error('Error getting offline studies:', error)
      return []
    }
  }

  async getOfflineReport(studyId: string): Promise<any> {
    try {
      const result = await this.db.getFirstAsync(
        `SELECT * FROM reports WHERE study_id = ?`,
        [studyId]
      )

      if (result) {
        return {
          ...JSON.parse(result.content as string),
          isOffline: true,
          cachedAt: new Date(result.cached_at as number)
        }
      }

      return null
    } catch (error) {
      console.error('Error getting offline report:', error)
      return null
    }
  }

  async getOfflineImages(studyId: string): Promise<any[]> {
    try {
      const result = await this.db.getAllAsync(
        `SELECT * FROM image_metadata WHERE study_id = ? ORDER BY id`,
        [studyId]
      )

      return result.map(row => ({
        id: row.id,
        studyId: row.study_id,
        seriesId: row.series_id,
        localPath: row.file_path,
        thumbnailPath: row.thumbnail_path,
        isOffline: true,
        quality: row.quality,
        cachedAt: new Date(row.cached_at as number)
      }))
    } catch (error) {
      console.error('Error getting offline images:', error)
      return []
    }
  }

  // ==================== SYNC QUEUE MANAGEMENT ====================

  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>) {
    try {
      const queueItem: SyncQueueItem = {
        ...item,
        id: this.generateId(),
        timestamp: new Date(),
        retryCount: 0
      }

      await this.db.runAsync(
        `INSERT INTO sync_queue (id, type, entity, data, timestamp, retry_count, priority, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          queueItem.id,
          queueItem.type,
          queueItem.entity,
          JSON.stringify(queueItem.data),
          queueItem.timestamp.getTime(),
          queueItem.retryCount,
          queueItem.priority,
          'PENDING'
        ]
      )

      this.syncQueue.push(queueItem)
      
      // Trigger sync if online
      if (this.isOnline && !this.syncInProgress) {
        this.performBackgroundSync()
      }

      return { success: true, queueId: queueItem.id }
    } catch (error) {
      console.error('Error adding to sync queue:', error)
      return { success: false, error: error.message }
    }
  }

  async performBackgroundSync() {
    if (this.syncInProgress || !this.isOnline) {
      return
    }

    try {
      this.syncInProgress = true

      // Get pending items from database
      const pendingItems = await this.db.getAllAsync(
        `SELECT * FROM sync_queue WHERE status = 'PENDING' ORDER BY priority DESC, timestamp ASC`
      )

      for (const item of pendingItems) {
        const success = await this.processSyncItem({
          id: item.id as string,
          type: item.type as any,
          entity: item.entity as any,
          data: JSON.parse(item.data as string),
          timestamp: new Date(item.timestamp as number),
          retryCount: item.retry_count as number,
          priority: item.priority as any
        })

        if (success) {
          // Mark as completed
          await this.db.runAsync(
            `UPDATE sync_queue SET status = 'COMPLETED' WHERE id = ?`,
            [item.id]
          )
        } else {
          // Increment retry count
          await this.db.runAsync(
            `UPDATE sync_queue SET retry_count = retry_count + 1, status = CASE WHEN retry_count >= 5 THEN 'FAILED' ELSE 'PENDING' END WHERE id = ?`,
            [item.id]
          )
        }
      }

      // Update last sync timestamp
      await this.db.runAsync(
        `UPDATE cache_stats SET last_sync = ?`,
        [Date.now()]
      )

    } catch (error) {
      console.error('Error during background sync:', error)
    } finally {
      this.syncInProgress = false
    }
  }

  private async processSyncItem(item: SyncQueueItem): Promise<boolean> {
    try {
      // Import the appropriate service based on entity type
      switch (item.entity) {
        case 'appointment':
          const { BookingService } = await import('../BookingService')
          return await this.syncAppointment(item, BookingService)
        
        case 'share':
          const { SharingService } = await import('../SharingService')
          return await this.syncShare(item, SharingService)
        
        case 'export':
          const { SharingService: ExportService } = await import('../SharingService')
          return await this.syncExport(item, ExportService)
        
        case 'consent':
          const { SharingService: ConsentService } = await import('../SharingService')
          return await this.syncConsent(item, ConsentService)
        
        default:
          console.warn('Unknown entity type:', item.entity)
          return false
      }
    } catch (error) {
      console.error('Error processing sync item:', error)
      return false
    }
  }

  private async syncAppointment(item: SyncQueueItem, service: any): Promise<boolean> {
    try {
      switch (item.type) {
        case 'CREATE':
          const result = await service.createAppointment(item.data)
          return result.success
        case 'UPDATE':
          const updateResult = await service.updateAppointment(item.data.id, item.data)
          return updateResult.success
        case 'DELETE':
          const deleteResult = await service.cancelAppointment(item.data.id)
          return deleteResult.success
        default:
          return false
      }
    } catch (error) {
      console.error('Error syncing appointment:', error)
      return false
    }
  }

  private async syncShare(item: SyncQueueItem, service: any): Promise<boolean> {
    try {
      switch (item.type) {
        case 'CREATE':
          const result = await service.createShare(item.data)
          return result.success
        case 'DELETE':
          return await service.revokeShare(item.data.shareId, item.data.reason)
        default:
          return false
      }
    } catch (error) {
      console.error('Error syncing share:', error)
      return false
    }
  }

  private async syncExport(item: SyncQueueItem, service: any): Promise<boolean> {
    try {
      if (item.type === 'CREATE') {
        const result = await service.exportReport(item.data)
        return result.success
      }
      return false
    } catch (error) {
      console.error('Error syncing export:', error)
      return false
    }
  }

  private async syncConsent(item: SyncQueueItem, service: any): Promise<boolean> {
    try {
      switch (item.type) {
        case 'CREATE':
        case 'UPDATE':
          const result = await service.createConsent(item.data.patientId, item.data)
          return result.success
        case 'DELETE':
          return await service.withdrawConsent(item.data.consentId, item.data.reason)
        default:
          return false
      }
    } catch (error) {
      console.error('Error syncing consent:', error)
      return false
    }
  }

  // ==================== CACHE MANAGEMENT ====================

  async getCacheSize(): Promise<number> {
    try {
      const stats = await this.db.getFirstAsync(`SELECT total_size_bytes FROM cache_stats`)
      return (stats?.total_size_bytes as number) || 0
    } catch (error) {
      console.error('Error getting cache size:', error)
      return 0
    }
  }

  async clearCache(options: { keepRecent?: boolean; daysToKeep?: number } = {}) {
    try {
      const { keepRecent = false, daysToKeep = 7 } = options

      if (keepRecent) {
        const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000)
        
        // Delete old studies
        await this.db.runAsync(
          `DELETE FROM studies WHERE cached_at < ?`,
          [cutoffDate]
        )
        
        // Delete orphaned reports
        await this.db.runAsync(
          `DELETE FROM reports WHERE study_id NOT IN (SELECT id FROM studies)`
        )
        
        // Delete orphaned images
        const oldImages = await this.db.getAllAsync(
          `SELECT file_path, thumbnail_path FROM image_metadata WHERE cached_at < ?`,
          [cutoffDate]
        )
        
        for (const image of oldImages) {
          await FileSystem.deleteAsync(image.file_path as string, { idempotent: true })
          await FileSystem.deleteAsync(image.thumbnail_path as string, { idempotent: true })
        }
        
        await this.db.runAsync(
          `DELETE FROM image_metadata WHERE cached_at < ?`,
          [cutoffDate]
        )
      } else {
        // Clear all cache
        await this.db.execAsync(`
          DELETE FROM studies;
          DELETE FROM reports;
          DELETE FROM image_metadata;
        `)
        
        // Delete all cached files
        await FileSystem.deleteAsync(this.IMAGE_CACHE_DIR, { idempotent: true })
        await FileSystem.deleteAsync(this.REPORT_CACHE_DIR, { idempotent: true })
        await this.ensureDirectories()
      }

      // Update cache stats
      await this.updateCacheStats()
      
      return { success: true }
    } catch (error) {
      console.error('Error clearing cache:', error)
      return { success: false, error: error.message }
    }
  }

  private async updateCacheStats() {
    try {
      const studyCount = await this.db.getFirstAsync(`SELECT COUNT(*) as count FROM studies`)
      const imageCount = await this.db.getFirstAsync(`SELECT COUNT(*) as count FROM image_metadata`)
      const reportCount = await this.db.getFirstAsync(`SELECT COUNT(*) as count FROM reports`)
      
      const totalSize = await this.db.getFirstAsync(`
        SELECT 
          COALESCE(SUM(size_bytes), 0) as studies_size,
          (SELECT COALESCE(SUM(size_bytes), 0) FROM image_metadata) as images_size
        FROM studies
      `)

      const totalSizeBytes = (totalSize?.studies_size as number || 0) + (totalSize?.images_size as number || 0)

      await this.db.runAsync(
        `INSERT OR REPLACE INTO cache_stats (id, total_size_bytes, study_count, image_count, report_count, last_cleanup)
         VALUES (1, ?, ?, ?, ?, ?)`,
        [
          totalSizeBytes,
          studyCount?.count || 0,
          imageCount?.count || 0,
          reportCount?.count || 0,
          Date.now()
        ]
      )
    } catch (error) {
      console.error('Error updating cache stats:', error)
    }
  }

  // ==================== AUTH STATE MANAGEMENT ====================

  async saveAuthState(authData: any) {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.AUTH_STATE, JSON.stringify({
        ...authData,
        savedAt: Date.now()
      }))
      return { success: true }
    } catch (error) {
      console.error('Error saving auth state:', error)
      return { success: false }
    }
  }

  async getAuthState(): Promise<any> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEYS.AUTH_STATE)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Error getting auth state:', error)
      return null
    }
  }

  async clearAuthState() {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEYS.AUTH_STATE)
      return { success: true }
    } catch (error) {
      console.error('Error clearing auth state:', error)
      return { success: false }
    }
  }

  // ==================== UTILITIES ====================

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  async isOfflineDataAvailable(studyId: string): Promise<boolean> {
    try {
      const result = await this.db.getFirstAsync(
        `SELECT id FROM studies WHERE id = ?`,
        [studyId]
      )
      return !!result
    } catch (error) {
      return false
    }
  }

  getConnectionStatus(): boolean {
    return this.isOnline
  }

  async getOfflineCapabilities(): Promise<{
    storageUsed: number
    storageLimit: number
    studiesCached: number
    reportsCached: number
    imagesCached: number
    syncQueueSize: number
    lastSync: Date | null
  }> {
    try {
      const stats = await this.db.getFirstAsync(`SELECT * FROM cache_stats`)
      const syncQueueSize = await this.db.getFirstAsync(`SELECT COUNT(*) as count FROM sync_queue WHERE status = 'PENDING'`)

      return {
        storageUsed: (stats?.total_size_bytes as number) || 0,
        storageLimit: this.cacheConfig.maxSizeBytes,
        studiesCached: (stats?.study_count as number) || 0,
        reportsCached: (stats?.report_count as number) || 0,
        imagesCached: (stats?.image_count as number) || 0,
        syncQueueSize: (syncQueueSize?.count as number) || 0,
        lastSync: stats?.last_sync ? new Date(stats.last_sync as number) : null
      }
    } catch (error) {
      console.error('Error getting offline capabilities:', error)
      return {
        storageUsed: 0,
        storageLimit: this.cacheConfig.maxSizeBytes,
        studiesCached: 0,
        reportsCached: 0,
        imagesCached: 0,
        syncQueueSize: 0,
        lastSync: null
      }
    }
  }
}