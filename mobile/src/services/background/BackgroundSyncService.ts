import * as BackgroundFetch from 'expo-background-fetch'
import * as TaskManager from 'expo-task-manager'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { OfflineStorageService } from '../offline/OfflineStorageService'
import { NetworkService } from '../network/NetworkService'

const BACKGROUND_SYNC_TASK = 'AXIS_BACKGROUND_SYNC'
const DATA_SYNC_TASK = 'AXIS_DATA_SYNC'
const IMAGE_PREFETCH_TASK = 'AXIS_IMAGE_PREFETCH'

interface SyncConfig {
  enabled: boolean
  wifiOnly: boolean
  interval: number // minutes
  maxDataSize: number // bytes
  syncTypes: string[]
  lastSync?: Date
}

interface SyncResult {
  success: boolean
  syncedItems: number
  errors: string[]
  duration: number
  dataTransferred: number
}

interface DataSyncStrategy {
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  batchSize: number
  maxRetries: number
  conflictResolution: 'SERVER_WINS' | 'CLIENT_WINS' | 'MERGE'
}

export class BackgroundSyncService {
  private static instance: BackgroundSyncService
  private syncConfig: SyncConfig
  private isSyncing: boolean = false
  private syncQueue: Map<string, any> = new Map()
  private conflictQueue: any[] = []
  private offlineStorage: OfflineStorageService
  private networkService: NetworkService

  private readonly SYNC_CONFIG_KEY = '@axis_sync_config'
  private readonly SYNC_HISTORY_KEY = '@axis_sync_history'
  private readonly CONFLICT_QUEUE_KEY = '@axis_conflict_queue'

  private constructor() {
    this.syncConfig = {
      enabled: true,
      wifiOnly: false,
      interval: 30, // 30 minutes
      maxDataSize: 50 * 1024 * 1024, // 50MB
      syncTypes: ['studies', 'reports', 'appointments', 'shares']
    }

    this.offlineStorage = OfflineStorageService.getInstance()
    this.networkService = NetworkService.getInstance()

    this.loadSyncConfig()
    this.registerBackgroundTasks()
  }

  static getInstance(): BackgroundSyncService {
    if (!BackgroundSyncService.instance) {
      BackgroundSyncService.instance = new BackgroundSyncService()
    }
    return BackgroundSyncService.instance
  }

  // ==================== BACKGROUND TASK REGISTRATION ====================

  private async registerBackgroundTasks() {
    try {
      // Register main sync task
      await TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
        try {
          const result = await this.performBackgroundSync()
          return result.success
            ? BackgroundFetch.BackgroundFetchResult.NewData
            : BackgroundFetch.BackgroundFetchResult.NoData
        } catch (error) {
          console.error('Background sync error:', error)
          return BackgroundFetch.BackgroundFetchResult.Failed
        }
      })

      // Register data sync task
      await TaskManager.defineTask(DATA_SYNC_TASK, async () => {
        try {
          const result = await this.syncDataWithServer()
          return result.success
            ? BackgroundFetch.BackgroundFetchResult.NewData
            : BackgroundFetch.BackgroundFetchResult.NoData
        } catch (error) {
          console.error('Data sync error:', error)
          return BackgroundFetch.BackgroundFetchResult.Failed
        }
      })

      // Register image prefetch task
      await TaskManager.defineTask(IMAGE_PREFETCH_TASK, async () => {
        try {
          await this.prefetchUpcomingImages()
          return BackgroundFetch.BackgroundFetchResult.NewData
        } catch (error) {
          console.error('Image prefetch error:', error)
          return BackgroundFetch.BackgroundFetchResult.Failed
        }
      })

      // Schedule background fetch
      await this.scheduleBackgroundSync()
    } catch (error) {
      console.error('Error registering background tasks:', error)
    }
  }

  async scheduleBackgroundSync() {
    try {
      // Cancel existing tasks
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK).catch(() => {})

      if (this.syncConfig.enabled) {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
          minimumInterval: this.syncConfig.interval * 60, // Convert to seconds
          stopOnTerminate: false,
          startOnBoot: true
        })
      }
    } catch (error) {
      console.error('Error scheduling background sync:', error)
    }
  }

  // ==================== SYNC OPERATIONS ====================

  async performBackgroundSync(): Promise<SyncResult> {
    const startTime = Date.now()
    const result: SyncResult = {
      success: false,
      syncedItems: 0,
      errors: [],
      duration: 0,
      dataTransferred: 0
    }

    if (this.isSyncing) {
      console.log('Sync already in progress')
      return result
    }

    try {
      this.isSyncing = true

      // Check network conditions
      if (!await this.checkSyncConditions()) {
        result.errors.push('Sync conditions not met')
        return result
      }

      // Sync different data types based on priority
      const syncTasks = [
        { type: 'appointments', priority: 'HIGH' },
        { type: 'reports', priority: 'HIGH' },
        { type: 'studies', priority: 'MEDIUM' },
        { type: 'shares', priority: 'MEDIUM' },
        { type: 'images', priority: 'LOW' }
      ]

      for (const task of syncTasks) {
        if (this.syncConfig.syncTypes.includes(task.type)) {
          try {
            const taskResult = await this.syncDataType(task.type, task.priority as any)
            result.syncedItems += taskResult.itemsSynced
            result.dataTransferred += taskResult.dataSize
          } catch (error: any) {
            result.errors.push(`${task.type}: ${error.message}`)
          }
        }
      }

      // Process offline queue
      await this.offlineStorage.performBackgroundSync()

      // Handle conflicts
      await this.resolveConflicts()

      // Update sync config
      this.syncConfig.lastSync = new Date()
      await this.saveSyncConfig()

      result.success = result.errors.length === 0
      result.duration = Date.now() - startTime

      // Save sync history
      await this.saveSyncHistory(result)

      // Send notification if significant updates
      if (result.syncedItems > 0) {
        await this.sendSyncNotification(result)
      }

    } catch (error: any) {
      console.error('Background sync error:', error)
      result.errors.push(error.message)
    } finally {
      this.isSyncing = false
    }

    return result
  }

  private async syncDataType(
    type: string,
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
  ): Promise<{ itemsSynced: number; dataSize: number }> {
    const strategy: DataSyncStrategy = {
      priority,
      batchSize: priority === 'HIGH' ? 10 : 5,
      maxRetries: 3,
      conflictResolution: 'SERVER_WINS'
    }

    switch (type) {
      case 'studies':
        return this.syncStudies(strategy)
      case 'reports':
        return this.syncReports(strategy)
      case 'appointments':
        return this.syncAppointments(strategy)
      case 'shares':
        return this.syncShares(strategy)
      case 'images':
        return this.syncImages(strategy)
      default:
        return { itemsSynced: 0, dataSize: 0 }
    }
  }

  private async syncStudies(strategy: DataSyncStrategy): Promise<{ itemsSynced: number; dataSize: number }> {
    try {
      // Import necessary services
      const { StudyService } = await import('../StudyService')
      
      // Get patient ID from auth
      const authState = await this.offlineStorage.getAuthState()
      if (!authState?.patientId) {
        throw new Error('No patient ID available')
      }

      // Fetch latest studies from server
      const studies = await StudyService.getPatientStudies(authState.patientId)
      
      let itemsSynced = 0
      let dataSize = 0

      // Process in batches
      for (let i = 0; i < studies.length; i += strategy.batchSize) {
        const batch = studies.slice(i, i + strategy.batchSize)
        
        for (const study of batch) {
          // Check if study is already cached
          const isOffline = await this.offlineStorage.isOfflineDataAvailable(study.id)
          
          if (!isOffline || study.updatedAt > study.cachedAt) {
            // Cache the study
            await this.offlineStorage.cacheStudy(study, {
              includeImages: strategy.priority === 'HIGH',
              quality: strategy.priority === 'HIGH' ? 'MEDIUM' : 'LOW'
            })
            
            itemsSynced++
            dataSize += JSON.stringify(study).length
          }
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      return { itemsSynced, dataSize }
    } catch (error) {
      console.error('Error syncing studies:', error)
      throw error
    }
  }

  private async syncReports(strategy: DataSyncStrategy): Promise<{ itemsSynced: number; dataSize: number }> {
    try {
      const authState = await this.offlineStorage.getAuthState()
      if (!authState?.patientId) {
        throw new Error('No patient ID available')
      }

      // Get offline studies
      const offlineStudies = await this.offlineStorage.getOfflineStudies(authState.patientId)
      
      let itemsSynced = 0
      let dataSize = 0

      for (const study of offlineStudies) {
        // Check if report needs updating
        const offlineReport = await this.offlineStorage.getOfflineReport(study.id)
        
        if (!offlineReport || !offlineReport.cachedAt || 
            new Date(study.report?.updatedAt) > new Date(offlineReport.cachedAt)) {
          
          // Fetch and cache updated report
          const { ReportService } = await import('../ReportService')
          const report = await ReportService.getReport(study.id)
          
          if (report) {
            await this.offlineStorage.cacheReport(study.id, report)
            itemsSynced++
            dataSize += JSON.stringify(report).length
          }
        }
      }

      return { itemsSynced, dataSize }
    } catch (error) {
      console.error('Error syncing reports:', error)
      throw error
    }
  }

  private async syncAppointments(strategy: DataSyncStrategy): Promise<{ itemsSynced: number; dataSize: number }> {
    // Implementation for syncing appointments
    return { itemsSynced: 0, dataSize: 0 }
  }

  private async syncShares(strategy: DataSyncStrategy): Promise<{ itemsSynced: number; dataSize: number }> {
    // Implementation for syncing shares
    return { itemsSynced: 0, dataSize: 0 }
  }

  private async syncImages(strategy: DataSyncStrategy): Promise<{ itemsSynced: number; dataSize: number }> {
    try {
      const authState = await this.offlineStorage.getAuthState()
      if (!authState?.patientId) {
        throw new Error('No patient ID available')
      }

      // Get studies that need image sync
      const offlineStudies = await this.offlineStorage.getOfflineStudies(authState.patientId)
      
      let itemsSynced = 0
      let dataSize = 0

      // Only sync images for recent studies on WiFi
      const connectionType = this.networkService.getConnectionType()
      if (connectionType !== 'wifi' && !strategy.priority === 'HIGH') {
        return { itemsSynced: 0, dataSize: 0 }
      }

      const recentStudies = offlineStudies
        .filter(study => {
          const studyDate = new Date(study.studyDate)
          const daysSinceStudy = (Date.now() - studyDate.getTime()) / (1000 * 60 * 60 * 24)
          return daysSinceStudy < 30 // Only sync images from last 30 days
        })
        .slice(0, strategy.batchSize)

      for (const study of recentStudies) {
        const offlineImages = await this.offlineStorage.getOfflineImages(study.id)
        
        if (offlineImages.length === 0 && study.images?.length > 0) {
          // Cache study images
          const quality = connectionType === 'wifi' ? 'MEDIUM' : 'LOW'
          const result = await this.offlineStorage.cacheStudyImages(
            study.id,
            study.images.slice(0, 10), // Limit to first 10 images
            quality
          )
          
          if (result.success) {
            itemsSynced += result.imageCount || 0
            dataSize += result.imageCount * 100 * 1024 // Estimate 100KB per image
          }
        }
      }

      return { itemsSynced, dataSize }
    } catch (error) {
      console.error('Error syncing images:', error)
      throw error
    }
  }

  // ==================== DATA SYNC WITH SERVER ====================

  async syncDataWithServer(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      syncedItems: 0,
      errors: [],
      duration: 0,
      dataTransferred: 0
    }

    try {
      const startTime = Date.now()

      // Get pending changes from offline storage
      const pendingChanges = await this.getPendingChanges()

      for (const change of pendingChanges) {
        try {
          const syncResult = await this.syncChange(change)
          if (syncResult.success) {
            result.syncedItems++
            result.dataTransferred += syncResult.dataSize
            
            // Remove from pending after successful sync
            await this.removePendingChange(change.id)
          } else if (syncResult.conflict) {
            // Add to conflict queue
            this.conflictQueue.push({
              ...change,
              serverData: syncResult.serverData,
              conflictTime: new Date()
            })
          }
        } catch (error: any) {
          result.errors.push(`Failed to sync ${change.type}: ${error.message}`)
        }
      }

      result.duration = Date.now() - startTime
      result.success = result.errors.length === 0

      // Save conflict queue
      if (this.conflictQueue.length > 0) {
        await this.saveConflictQueue()
      }

    } catch (error: any) {
      console.error('Error syncing with server:', error)
      result.errors.push(error.message)
    }

    return result
  }

  private async syncChange(change: any): Promise<{ success: boolean; conflict?: boolean; serverData?: any; dataSize: number }> {
    // Implementation would sync individual changes with server
    // This is a placeholder for the actual implementation
    return { success: true, dataSize: JSON.stringify(change).length }
  }

  // ==================== CONFLICT RESOLUTION ====================

  async resolveConflicts() {
    if (this.conflictQueue.length === 0) {
      return
    }

    try {
      const conflicts = [...this.conflictQueue]
      this.conflictQueue = []

      for (const conflict of conflicts) {
        const resolution = await this.resolveConflict(conflict)
        
        if (!resolution.resolved) {
          // Re-add to queue if not resolved
          this.conflictQueue.push(conflict)
        }
      }

      // Save remaining conflicts
      if (this.conflictQueue.length > 0) {
        await this.saveConflictQueue()
      }
    } catch (error) {
      console.error('Error resolving conflicts:', error)
    }
  }

  private async resolveConflict(conflict: any): Promise<{ resolved: boolean; resolution?: string }> {
    const strategy = this.syncConfig.conflictResolution || 'SERVER_WINS'

    switch (strategy) {
      case 'SERVER_WINS':
        // Server data takes precedence
        return { resolved: true, resolution: 'server_wins' }
      
      case 'CLIENT_WINS':
        // Client data takes precedence
        return { resolved: true, resolution: 'client_wins' }
      
      case 'MERGE':
        // Attempt to merge changes
        try {
          const merged = this.mergeConflict(conflict.clientData, conflict.serverData)
          return { resolved: true, resolution: 'merged' }
        } catch {
          return { resolved: false }
        }
      
      default:
        return { resolved: false }
    }
  }

  private mergeConflict(clientData: any, serverData: any): any {
    // Simple merge strategy - combine non-conflicting fields
    const merged = { ...serverData }
    
    for (const key in clientData) {
      if (clientData[key] !== serverData[key]) {
        // Use newer timestamp if available
        if (clientData.updatedAt && serverData.updatedAt) {
          if (new Date(clientData.updatedAt) > new Date(serverData.updatedAt)) {
            merged[key] = clientData[key]
          }
        }
      }
    }
    
    return merged
  }

  // ==================== IMAGE PREFETCHING ====================

  async prefetchUpcomingImages() {
    try {
      const authState = await this.offlineStorage.getAuthState()
      if (!authState?.patientId) {
        return
      }

      // Get upcoming appointments
      const { BookingService } = await import('../BookingService')
      const appointments = await BookingService.getUpcomingAppointments(authState.patientId)

      // Prefetch images for appointments in next 7 days
      const upcomingAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.appointmentDate)
        const daysUntil = (aptDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        return daysUntil >= 0 && daysUntil <= 7
      })

      // Get recent studies that might be referenced
      const studies = await this.offlineStorage.getOfflineStudies(authState.patientId)
      const recentStudies = studies
        .sort((a, b) => new Date(b.studyDate).getTime() - new Date(a.studyDate).getTime())
        .slice(0, 5)

      // Prefetch thumbnails for recent studies
      for (const study of recentStudies) {
        if (study.thumbnailUrl) {
          const { ImageOptimizationService } = await import('../performance/ImageOptimizationService')
          const imageService = ImageOptimizationService.getInstance()
          
          await imageService.optimizeImage(study.thumbnailUrl, {
            quality: 'LOW',
            progressive: false,
            cacheEnabled: true,
            lazyLoad: false
          })
        }
      }
    } catch (error) {
      console.error('Error prefetching images:', error)
    }
  }

  // ==================== SYNC CONDITIONS ====================

  private async checkSyncConditions(): Promise<boolean> {
    // Check if sync is enabled
    if (!this.syncConfig.enabled) {
      return false
    }

    // Check network connection
    if (!this.networkService.isOnline()) {
      return false
    }

    // Check if WiFi only mode is enabled
    if (this.syncConfig.wifiOnly) {
      const connectionType = this.networkService.getConnectionType()
      if (connectionType !== 'wifi') {
        return false
      }
    }

    // Check battery level (if available)
    // This would require expo-battery
    // const batteryLevel = await Battery.getBatteryLevelAsync()
    // if (batteryLevel < 0.2) return false

    // Check available storage
    const capabilities = await this.offlineStorage.getOfflineCapabilities()
    if (capabilities.storageUsed > capabilities.storageLimit * 0.9) {
      // Storage almost full
      return false
    }

    return true
  }

  // ==================== NOTIFICATIONS ====================

  private async sendSyncNotification(result: SyncResult) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Data Synced',
          body: `Successfully synced ${result.syncedItems} items`,
          data: { syncResult: result }
        },
        trigger: null // Show immediately
      })
    } catch (error) {
      console.error('Error sending sync notification:', error)
    }
  }

  // ==================== CONFIGURATION ====================

  async setSyncConfig(config: Partial<SyncConfig>) {
    this.syncConfig = { ...this.syncConfig, ...config }
    await this.saveSyncConfig()
    
    // Reschedule if interval changed
    if (config.interval || config.enabled !== undefined) {
      await this.scheduleBackgroundSync()
    }
  }

  getSyncConfig(): SyncConfig {
    return { ...this.syncConfig }
  }

  private async loadSyncConfig() {
    try {
      const saved = await AsyncStorage.getItem(this.SYNC_CONFIG_KEY)
      if (saved) {
        this.syncConfig = { ...this.syncConfig, ...JSON.parse(saved) }
      }
    } catch (error) {
      console.error('Error loading sync config:', error)
    }
  }

  private async saveSyncConfig() {
    try {
      await AsyncStorage.setItem(this.SYNC_CONFIG_KEY, JSON.stringify(this.syncConfig))
    } catch (error) {
      console.error('Error saving sync config:', error)
    }
  }

  // ==================== PERSISTENCE ====================

  private async getPendingChanges(): Promise<any[]> {
    // Get pending changes from offline storage
    // This would be implemented based on your specific needs
    return []
  }

  private async removePendingChange(changeId: string) {
    // Remove a pending change after successful sync
    // Implementation depends on your storage strategy
  }

  private async saveConflictQueue() {
    try {
      await AsyncStorage.setItem(this.CONFLICT_QUEUE_KEY, JSON.stringify(this.conflictQueue))
    } catch (error) {
      console.error('Error saving conflict queue:', error)
    }
  }

  private async loadConflictQueue() {
    try {
      const saved = await AsyncStorage.getItem(this.CONFLICT_QUEUE_KEY)
      if (saved) {
        this.conflictQueue = JSON.parse(saved)
      }
    } catch (error) {
      console.error('Error loading conflict queue:', error)
    }
  }

  private async saveSyncHistory(result: SyncResult) {
    try {
      const history = await AsyncStorage.getItem(this.SYNC_HISTORY_KEY)
      const historyArray = history ? JSON.parse(history) : []
      
      historyArray.push({
        ...result,
        timestamp: new Date().toISOString()
      })

      // Keep only last 50 sync results
      if (historyArray.length > 50) {
        historyArray.shift()
      }

      await AsyncStorage.setItem(this.SYNC_HISTORY_KEY, JSON.stringify(historyArray))
    } catch (error) {
      console.error('Error saving sync history:', error)
    }
  }

  async getSyncHistory(): Promise<any[]> {
    try {
      const history = await AsyncStorage.getItem(this.SYNC_HISTORY_KEY)
      return history ? JSON.parse(history) : []
    } catch (error) {
      console.error('Error getting sync history:', error)
      return []
    }
  }

  // ==================== MANUAL SYNC ====================

  async triggerManualSync(): Promise<SyncResult> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress')
    }

    return this.performBackgroundSync()
  }

  isSyncInProgress(): boolean {
    return this.isSyncing
  }

  getLastSyncTime(): Date | undefined {
    return this.syncConfig.lastSync
  }
}