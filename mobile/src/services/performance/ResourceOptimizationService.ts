import { AppState, AppStateStatus, Platform, NativeModules } from 'react-native'
import * as Battery from 'expo-battery'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface ResourceConfig {
  memoryThreshold: number // MB
  batteryThreshold: number // percentage
  autoCleanup: boolean
  lowPowerMode: boolean
  adaptiveQuality: boolean
}

interface MemorySnapshot {
  timestamp: Date
  usedMemory: number
  totalMemory: number
  percentage: number
  screens: string[]
  cacheSize: number
}

interface BatteryStatus {
  level: number
  state: Battery.BatteryState
  lowPowerMode: boolean
  isCharging: boolean
}

interface OptimizationStrategy {
  reducedAnimations: boolean
  lowQualityImages: boolean
  limitedBackgroundSync: boolean
  aggressiveCaching: boolean
  reducedNetworkCalls: boolean
}

export class ResourceOptimizationService {
  private static instance: ResourceOptimizationService
  private config: ResourceConfig
  private currentMemoryUsage: number = 0
  private batteryStatus: BatteryStatus | null = null
  private optimizationStrategy: OptimizationStrategy
  private memorySnapshots: MemorySnapshot[] = []
  private cleanupInProgress: boolean = false
  private appState: AppStateStatus = 'active'
  private memoryWarningCount: number = 0
  private lastCleanupTime: Date | null = null

  private readonly CONFIG_KEY = '@axis_resource_config'
  private readonly MEMORY_SNAPSHOTS_KEY = '@axis_memory_snapshots'
  private readonly MAX_MEMORY_SNAPSHOTS = 50

  // Optimization thresholds
  private readonly CRITICAL_MEMORY_THRESHOLD = 0.9 // 90% memory usage
  private readonly WARNING_MEMORY_THRESHOLD = 0.75 // 75% memory usage
  private readonly LOW_BATTERY_THRESHOLD = 0.2 // 20% battery
  private readonly CRITICAL_BATTERY_THRESHOLD = 0.1 // 10% battery

  private memoryCheckInterval: NodeJS.Timeout | null = null
  private batteryCheckInterval: NodeJS.Timeout | null = null
  private cleanupCallbacks: Set<() => void> = new Set()

  private constructor() {
    this.config = {
      memoryThreshold: 100, // 100MB
      batteryThreshold: 20, // 20%
      autoCleanup: true,
      lowPowerMode: false,
      adaptiveQuality: true
    }

    this.optimizationStrategy = {
      reducedAnimations: false,
      lowQualityImages: false,
      limitedBackgroundSync: false,
      aggressiveCaching: false,
      reducedNetworkCalls: false
    }

    this.initialize()
  }

  static getInstance(): ResourceOptimizationService {
    if (!ResourceOptimizationService.instance) {
      ResourceOptimizationService.instance = new ResourceOptimizationService()
    }
    return ResourceOptimizationService.instance
  }

  private async initialize() {
    await this.loadConfig()
    this.setupAppStateListener()
    this.startMonitoring()
    await this.checkBatteryStatus()
  }

  // ==================== MONITORING ====================

  private startMonitoring() {
    // Monitor memory every 30 seconds
    this.memoryCheckInterval = setInterval(() => {
      this.checkMemoryUsage()
    }, 30000)

    // Monitor battery every minute
    this.batteryCheckInterval = setInterval(() => {
      this.checkBatteryStatus()
    }, 60000)

    // Initial checks
    this.checkMemoryUsage()
  }

  private setupAppStateListener() {
    AppState.addEventListener('change', this.handleAppStateChange)
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    const wasBackground = this.appState.match(/inactive|background/)
    const isBackground = nextAppState.match(/inactive|background/)

    if (wasBackground && !isBackground) {
      // App came to foreground
      this.resumeMonitoring()
    } else if (!wasBackground && isBackground) {
      // App went to background
      this.pauseMonitoring()
      this.performBackgroundCleanup()
    }

    this.appState = nextAppState
  }

  private pauseMonitoring() {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval)
      this.memoryCheckInterval = null
    }
  }

  private resumeMonitoring() {
    if (!this.memoryCheckInterval) {
      this.startMonitoring()
    }
  }

  // ==================== MEMORY MANAGEMENT ====================

  private async checkMemoryUsage() {
    const memoryInfo = await this.getMemoryInfo()
    this.currentMemoryUsage = memoryInfo.usedMemory

    const memoryPercentage = memoryInfo.usedMemory / memoryInfo.totalMemory

    // Create snapshot
    const snapshot: MemorySnapshot = {
      timestamp: new Date(),
      usedMemory: memoryInfo.usedMemory,
      totalMemory: memoryInfo.totalMemory,
      percentage: memoryPercentage,
      screens: [], // Would be populated from navigation state
      cacheSize: await this.getCacheSize()
    }

    this.memorySnapshots.push(snapshot)
    if (this.memorySnapshots.length > this.MAX_MEMORY_SNAPSHOTS) {
      this.memorySnapshots.shift()
    }

    // Check thresholds
    if (memoryPercentage > this.CRITICAL_MEMORY_THRESHOLD) {
      await this.handleCriticalMemory()
    } else if (memoryPercentage > this.WARNING_MEMORY_THRESHOLD) {
      await this.handleMemoryWarning()
    }

    // Auto cleanup if enabled
    if (this.config.autoCleanup && memoryInfo.usedMemory > this.config.memoryThreshold * 1024 * 1024) {
      await this.performMemoryCleanup()
    }
  }

  private async getMemoryInfo(): Promise<{ usedMemory: number; totalMemory: number }> {
    // This would use a native module for accurate memory info
    // For now, return estimated values
    const totalMemory = 2 * 1024 * 1024 * 1024 // 2GB
    const usedMemory = this.estimateMemoryUsage()

    return { usedMemory, totalMemory }
  }

  private estimateMemoryUsage(): number {
    // Simplified estimation
    if (global.performance && global.performance.memory) {
      return (global.performance.memory as any).usedJSHeapSize || 0
    }
    return 100 * 1024 * 1024 // Default 100MB
  }

  private async handleCriticalMemory() {
    console.warn('Critical memory usage detected')
    this.memoryWarningCount++

    // Apply aggressive optimization
    this.optimizationStrategy = {
      reducedAnimations: true,
      lowQualityImages: true,
      limitedBackgroundSync: true,
      aggressiveCaching: false, // Disable caching to save memory
      reducedNetworkCalls: true
    }

    // Perform immediate cleanup
    await this.performMemoryCleanup('AGGRESSIVE')

    // Notify app to reduce memory usage
    this.notifyMemoryPressure('CRITICAL')
  }

  private async handleMemoryWarning() {
    console.warn('Memory warning detected')

    // Apply moderate optimization
    this.optimizationStrategy = {
      ...this.optimizationStrategy,
      lowQualityImages: true,
      limitedBackgroundSync: true
    }

    // Perform cleanup if not done recently
    const now = Date.now()
    const lastCleanup = this.lastCleanupTime?.getTime() || 0
    if (now - lastCleanup > 60000) { // 1 minute
      await this.performMemoryCleanup('MODERATE')
    }

    this.notifyMemoryPressure('WARNING')
  }

  async performMemoryCleanup(level: 'LIGHT' | 'MODERATE' | 'AGGRESSIVE' = 'MODERATE') {
    if (this.cleanupInProgress) {
      return
    }

    try {
      this.cleanupInProgress = true
      this.lastCleanupTime = new Date()

      const cleanupTasks: Promise<void>[] = []

      // Clear image cache
      if (level !== 'LIGHT') {
        cleanupTasks.push(this.clearImageCache(level === 'AGGRESSIVE'))
      }

      // Clear old data
      cleanupTasks.push(this.clearOldData(level))

      // Clear network cache
      if (level === 'AGGRESSIVE') {
        cleanupTasks.push(this.clearNetworkCache())
      }

      // Run cleanup callbacks
      this.cleanupCallbacks.forEach(callback => callback())

      // Trigger garbage collection if available
      if (global.gc) {
        global.gc()
      }

      await Promise.all(cleanupTasks)

      // Check memory after cleanup
      const memoryAfter = await this.getMemoryInfo()
      console.log(`Memory cleanup completed. Current usage: ${memoryAfter.usedMemory / 1024 / 1024}MB`)

    } finally {
      this.cleanupInProgress = false
    }
  }

  private async clearImageCache(aggressive: boolean) {
    const { ImageOptimizationService } = await import('./ImageOptimizationService')
    const imageService = ImageOptimizationService.getInstance()

    if (aggressive) {
      await imageService.clearDiskCache()
    }
    imageService.clearMemoryCache()
  }

  private async clearOldData(level: string) {
    const { OfflineStorageService } = await import('../offline/OfflineStorageService')
    const offlineService = OfflineStorageService.getInstance()

    const daysToKeep = level === 'AGGRESSIVE' ? 3 : level === 'MODERATE' ? 7 : 14
    await offlineService.clearCache({ keepRecent: true, daysToKeep })
  }

  private async clearNetworkCache() {
    const { NetworkService } = await import('../network/NetworkService')
    const networkService = NetworkService.getInstance()
    networkService.clearCache()
  }

  private async getCacheSize(): Promise<number> {
    const { OfflineStorageService } = await import('../offline/OfflineStorageService')
    const { ImageOptimizationService } = await import('./ImageOptimizationService')

    const offlineService = OfflineStorageService.getInstance()
    const imageService = ImageOptimizationService.getInstance()

    const offlineCacheSize = await offlineService.getCacheSize()
    const imageCacheStats = await imageService.getCacheStats()

    return offlineCacheSize + imageCacheStats.diskCacheSize
  }

  // ==================== BATTERY MANAGEMENT ====================

  private async checkBatteryStatus() {
    try {
      const batteryLevel = await Battery.getBatteryLevelAsync()
      const batteryState = await Battery.getBatteryStateAsync()
      const lowPowerMode = await Battery.isLowPowerModeEnabledAsync()

      this.batteryStatus = {
        level: batteryLevel,
        state: batteryState,
        lowPowerMode,
        isCharging: batteryState === Battery.BatteryState.CHARGING || 
                   batteryState === Battery.BatteryState.FULL
      }

      // Update optimization strategy based on battery
      if (batteryLevel < this.CRITICAL_BATTERY_THRESHOLD && !this.batteryStatus.isCharging) {
        await this.enablePowerSavingMode('CRITICAL')
      } else if (batteryLevel < this.LOW_BATTERY_THRESHOLD && !this.batteryStatus.isCharging) {
        await this.enablePowerSavingMode('LOW')
      } else if (lowPowerMode) {
        await this.enablePowerSavingMode('SYSTEM')
      } else {
        await this.disablePowerSavingMode()
      }
    } catch (error) {
      console.error('Error checking battery status:', error)
    }
  }

  private async enablePowerSavingMode(level: 'SYSTEM' | 'LOW' | 'CRITICAL') {
    this.config.lowPowerMode = true

    switch (level) {
      case 'CRITICAL':
        this.optimizationStrategy = {
          reducedAnimations: true,
          lowQualityImages: true,
          limitedBackgroundSync: true,
          aggressiveCaching: true,
          reducedNetworkCalls: true
        }
        break

      case 'LOW':
        this.optimizationStrategy = {
          reducedAnimations: true,
          lowQualityImages: true,
          limitedBackgroundSync: true,
          aggressiveCaching: true,
          reducedNetworkCalls: false
        }
        break

      case 'SYSTEM':
        this.optimizationStrategy = {
          reducedAnimations: true,
          lowQualityImages: false,
          limitedBackgroundSync: true,
          aggressiveCaching: true,
          reducedNetworkCalls: false
        }
        break
    }

    await this.applyOptimizations()
  }

  private async disablePowerSavingMode() {
    this.config.lowPowerMode = false

    this.optimizationStrategy = {
      reducedAnimations: false,
      lowQualityImages: false,
      limitedBackgroundSync: false,
      aggressiveCaching: false,
      reducedNetworkCalls: false
    }

    await this.applyOptimizations()
  }

  // ==================== OPTIMIZATION STRATEGIES ====================

  private async applyOptimizations() {
    // Apply animation optimizations
    if (this.optimizationStrategy.reducedAnimations) {
      // Would update animation config globally
    }

    // Apply image quality optimizations
    if (this.config.adaptiveQuality) {
      const { ImageOptimizationService } = await import('./ImageOptimizationService')
      const imageService = ImageOptimizationService.getInstance()
      // Image service automatically adapts based on network
    }

    // Apply background sync optimizations
    if (this.optimizationStrategy.limitedBackgroundSync) {
      const { BackgroundSyncService } = await import('../background/BackgroundSyncService')
      const syncService = BackgroundSyncService.getInstance()
      await syncService.setSyncConfig({
        wifiOnly: true,
        interval: 60 // Reduce frequency
      })
    }

    // Apply network optimizations
    if (this.optimizationStrategy.reducedNetworkCalls) {
      const { NetworkService } = await import('../network/NetworkService')
      const networkService = NetworkService.getInstance()
      await networkService.setLowDataMode(true)
    }

    await this.saveConfig()
  }

  // ==================== BACKGROUND OPERATIONS ====================

  private async performBackgroundCleanup() {
    // Cleanup when app goes to background
    await this.performMemoryCleanup('LIGHT')
    
    // Save memory snapshots
    await this.saveMemorySnapshots()
  }

  // ==================== ADAPTIVE QUALITY ====================

  getRecommendedImageQuality(): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (this.optimizationStrategy.lowQualityImages) {
      return 'LOW'
    }

    if (this.batteryStatus && this.batteryStatus.level < 0.3 && !this.batteryStatus.isCharging) {
      return 'LOW'
    }

    const memoryPercentage = this.currentMemoryUsage / (2 * 1024 * 1024 * 1024) // Assume 2GB total
    if (memoryPercentage > 0.7) {
      return 'LOW'
    }

    return 'MEDIUM'
  }

  shouldEnableAnimation(): boolean {
    return !this.optimizationStrategy.reducedAnimations
  }

  shouldPrefetchData(): boolean {
    if (this.optimizationStrategy.reducedNetworkCalls) {
      return false
    }

    if (this.batteryStatus && this.batteryStatus.level < 0.3 && !this.batteryStatus.isCharging) {
      return false
    }

    return true
  }

  getNetworkBatchSize(): number {
    if (this.optimizationStrategy.reducedNetworkCalls) {
      return 1
    }

    if (this.config.lowPowerMode) {
      return 3
    }

    return 10
  }

  // ==================== CALLBACKS & NOTIFICATIONS ====================

  registerCleanupCallback(callback: () => void) {
    this.cleanupCallbacks.add(callback)
  }

  unregisterCleanupCallback(callback: () => void) {
    this.cleanupCallbacks.delete(callback)
  }

  private notifyMemoryPressure(level: 'WARNING' | 'CRITICAL') {
    // Emit event or call callbacks to notify app components
    console.log(`Memory pressure: ${level}`)
  }

  // ==================== ANALYTICS ====================

  getResourceMetrics(): {
    memory: MemorySnapshot | null
    battery: BatteryStatus | null
    optimization: OptimizationStrategy
    stats: {
      memoryWarnings: number
      cleanupCount: number
      averageMemoryUsage: number
    }
  } {
    const latestSnapshot = this.memorySnapshots[this.memorySnapshots.length - 1] || null
    
    const averageMemoryUsage = this.memorySnapshots.length > 0
      ? this.memorySnapshots.reduce((acc, s) => acc + s.usedMemory, 0) / this.memorySnapshots.length
      : 0

    return {
      memory: latestSnapshot,
      battery: this.batteryStatus,
      optimization: { ...this.optimizationStrategy },
      stats: {
        memoryWarnings: this.memoryWarningCount,
        cleanupCount: this.memorySnapshots.filter(s => s.cacheSize === 0).length,
        averageMemoryUsage
      }
    }
  }

  getMemoryTrend(): 'INCREASING' | 'STABLE' | 'DECREASING' {
    if (this.memorySnapshots.length < 3) {
      return 'STABLE'
    }

    const recent = this.memorySnapshots.slice(-3)
    const trend = recent[2].usedMemory - recent[0].usedMemory

    if (trend > 10 * 1024 * 1024) { // 10MB increase
      return 'INCREASING'
    } else if (trend < -10 * 1024 * 1024) { // 10MB decrease
      return 'DECREASING'
    }

    return 'STABLE'
  }

  // ==================== CONFIGURATION ====================

  async setConfig(config: Partial<ResourceConfig>) {
    this.config = { ...this.config, ...config }
    await this.saveConfig()
    
    if (config.adaptiveQuality !== undefined || config.lowPowerMode !== undefined) {
      await this.applyOptimizations()
    }
  }

  getConfig(): ResourceConfig {
    return { ...this.config }
  }

  getOptimizationStrategy(): OptimizationStrategy {
    return { ...this.optimizationStrategy }
  }

  private async loadConfig() {
    try {
      const saved = await AsyncStorage.getItem(this.CONFIG_KEY)
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) }
      }
    } catch (error) {
      console.error('Error loading resource config:', error)
    }
  }

  private async saveConfig() {
    try {
      await AsyncStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config))
    } catch (error) {
      console.error('Error saving resource config:', error)
    }
  }

  private async saveMemorySnapshots() {
    try {
      await AsyncStorage.setItem(this.MEMORY_SNAPSHOTS_KEY, JSON.stringify(this.memorySnapshots))
    } catch (error) {
      console.error('Error saving memory snapshots:', error)
    }
  }

  // ==================== CLEANUP ====================

  cleanup() {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval)
    }

    if (this.batteryCheckInterval) {
      clearInterval(this.batteryCheckInterval)
    }

    AppState.removeEventListener('change', this.handleAppStateChange)
    
    this.cleanupCallbacks.clear()
  }
}