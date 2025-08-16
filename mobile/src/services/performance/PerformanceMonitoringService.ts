import { InteractionManager, AppState, AppStateStatus, NativeModules, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Device from 'expo-device'
import * as Application from 'expo-application'

interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: Date
  category: 'NETWORK' | 'RENDER' | 'STORAGE' | 'MEMORY' | 'BATTERY' | 'CUSTOM'
  metadata?: any
}

interface ScreenMetrics {
  screenName: string
  renderTime: number
  interactionTime: number
  memoryUsage: number
  viewCount: number
  errorCount: number
}

interface NetworkMetrics {
  endpoint: string
  method: string
  duration: number
  statusCode: number
  requestSize: number
  responseSize: number
  timestamp: Date
  success: boolean
}

interface SessionMetrics {
  sessionId: string
  startTime: Date
  endTime?: Date
  duration?: number
  screens: string[]
  interactions: number
  errors: number
  crashes: number
  memoryPeaks: number[]
  batteryUsage?: number
}

interface DeviceInfo {
  deviceId: string
  deviceName: string
  deviceModel: string
  osName: string
  osVersion: string
  appVersion: string
  buildNumber: string
  isDevice: boolean
  totalMemory?: number
  freeMemory?: number
}

export class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService
  private metrics: PerformanceMetric[] = []
  private screenMetrics: Map<string, ScreenMetrics> = new Map()
  private networkMetrics: NetworkMetrics[] = []
  private currentSession: SessionMetrics | null = null
  private appState: AppStateStatus = 'active'
  private deviceInfo: DeviceInfo | null = null
  private metricsBuffer: PerformanceMetric[] = []
  private flushInterval: NodeJS.Timeout | null = null

  private readonly METRICS_KEY = '@axis_performance_metrics'
  private readonly SESSION_KEY = '@axis_session_metrics'
  private readonly BUFFER_SIZE = 100
  private readonly FLUSH_INTERVAL = 30000 // 30 seconds

  private performanceObserver: any = null
  private memoryWarningListener: any = null

  private constructor() {
    this.initializeDeviceInfo()
    this.setupAppStateListener()
    this.setupMemoryWarning()
    this.startSession()
    this.startMetricsFlush()
  }

  static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService()
    }
    return PerformanceMonitoringService.instance
  }

  // ==================== INITIALIZATION ====================

  private async initializeDeviceInfo() {
    try {
      this.deviceInfo = {
        deviceId: Application.androidId || Device.osBuildId || 'unknown',
        deviceName: Device.deviceName || 'Unknown Device',
        deviceModel: Device.modelName || 'Unknown Model',
        osName: Device.osName || Platform.OS,
        osVersion: Device.osVersion || 'Unknown',
        appVersion: Application.nativeApplicationVersion || '1.0.0',
        buildNumber: Application.nativeBuildVersion || '1',
        isDevice: Device.isDevice ?? true,
        totalMemory: Device.totalMemory,
        freeMemory: await this.getAvailableMemory()
      }
    } catch (error) {
      console.error('Error initializing device info:', error)
    }
  }

  private setupAppStateListener() {
    AppState.addEventListener('change', this.handleAppStateChange)
  }

  private setupMemoryWarning() {
    if (Platform.OS === 'ios' && NativeModules.RCTDeviceEventEmitter) {
      this.memoryWarningListener = NativeModules.RCTDeviceEventEmitter.addListener(
        'memoryWarning',
        this.handleMemoryWarning
      )
    }
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (this.appState.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to foreground
      this.startSession()
    } else if (this.appState === 'active' && nextAppState.match(/inactive|background/)) {
      // App has gone to background
      this.endSession()
    }
    this.appState = nextAppState
  }

  private handleMemoryWarning = () => {
    this.recordMetric({
      name: 'memory_warning',
      value: 1,
      unit: 'count',
      timestamp: new Date(),
      category: 'MEMORY',
      metadata: {
        currentMemory: this.getCurrentMemoryUsage()
      }
    })

    // Trigger cleanup
    this.cleanupMemory()
  }

  // ==================== SESSION MANAGEMENT ====================

  private startSession() {
    this.currentSession = {
      sessionId: this.generateSessionId(),
      startTime: new Date(),
      screens: [],
      interactions: 0,
      errors: 0,
      crashes: 0,
      memoryPeaks: []
    }

    this.recordMetric({
      name: 'session_start',
      value: 1,
      unit: 'count',
      timestamp: new Date(),
      category: 'CUSTOM',
      metadata: { sessionId: this.currentSession.sessionId }
    })
  }

  private async endSession() {
    if (!this.currentSession) return

    this.currentSession.endTime = new Date()
    this.currentSession.duration = 
      this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime()

    // Save session metrics
    await this.saveSessionMetrics(this.currentSession)

    this.recordMetric({
      name: 'session_end',
      value: this.currentSession.duration,
      unit: 'ms',
      timestamp: new Date(),
      category: 'CUSTOM',
      metadata: {
        sessionId: this.currentSession.sessionId,
        screens: this.currentSession.screens.length,
        interactions: this.currentSession.interactions
      }
    })

    this.currentSession = null
  }

  // ==================== SCREEN TRACKING ====================

  trackScreenView(screenName: string, metadata?: any) {
    const startTime = Date.now()

    if (this.currentSession) {
      this.currentSession.screens.push(screenName)
    }

    // Initialize screen metrics if not exists
    if (!this.screenMetrics.has(screenName)) {
      this.screenMetrics.set(screenName, {
        screenName,
        renderTime: 0,
        interactionTime: 0,
        memoryUsage: 0,
        viewCount: 0,
        errorCount: 0
      })
    }

    const metrics = this.screenMetrics.get(screenName)!
    metrics.viewCount++

    // Measure render time
    InteractionManager.runAfterInteractions(() => {
      const renderTime = Date.now() - startTime
      metrics.renderTime = (metrics.renderTime + renderTime) / metrics.viewCount

      this.recordMetric({
        name: 'screen_render',
        value: renderTime,
        unit: 'ms',
        timestamp: new Date(),
        category: 'RENDER',
        metadata: { screenName, ...metadata }
      })

      // Check for slow renders
      if (renderTime > 1000) {
        this.recordMetric({
          name: 'slow_render',
          value: renderTime,
          unit: 'ms',
          timestamp: new Date(),
          category: 'RENDER',
          metadata: { screenName, threshold: 1000 }
        })
      }
    })

    // Track memory usage
    const memoryUsage = this.getCurrentMemoryUsage()
    metrics.memoryUsage = memoryUsage

    return {
      trackInteraction: (interactionName: string) => {
        this.trackInteraction(screenName, interactionName)
      },
      trackError: (error: Error) => {
        this.trackScreenError(screenName, error)
      }
    }
  }

  private trackInteraction(screenName: string, interactionName: string) {
    if (this.currentSession) {
      this.currentSession.interactions++
    }

    const metrics = this.screenMetrics.get(screenName)
    if (metrics) {
      metrics.interactionTime = Date.now()
    }

    this.recordMetric({
      name: 'user_interaction',
      value: 1,
      unit: 'count',
      timestamp: new Date(),
      category: 'CUSTOM',
      metadata: { screenName, interactionName }
    })
  }

  private trackScreenError(screenName: string, error: Error) {
    const metrics = this.screenMetrics.get(screenName)
    if (metrics) {
      metrics.errorCount++
    }

    if (this.currentSession) {
      this.currentSession.errors++
    }

    this.recordMetric({
      name: 'screen_error',
      value: 1,
      unit: 'count',
      timestamp: new Date(),
      category: 'CUSTOM',
      metadata: {
        screenName,
        errorMessage: error.message,
        errorStack: error.stack
      }
    })
  }

  // ==================== NETWORK TRACKING ====================

  trackNetworkRequest(request: {
    url: string
    method: string
    startTime: number
    endTime: number
    statusCode: number
    requestSize?: number
    responseSize?: number
    error?: Error
  }) {
    const duration = request.endTime - request.startTime
    const success = request.statusCode >= 200 && request.statusCode < 300

    const networkMetric: NetworkMetrics = {
      endpoint: this.sanitizeUrl(request.url),
      method: request.method,
      duration,
      statusCode: request.statusCode,
      requestSize: request.requestSize || 0,
      responseSize: request.responseSize || 0,
      timestamp: new Date(),
      success
    }

    this.networkMetrics.push(networkMetric)

    this.recordMetric({
      name: 'network_request',
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      category: 'NETWORK',
      metadata: {
        endpoint: networkMetric.endpoint,
        method: networkMetric.method,
        statusCode: networkMetric.statusCode,
        success
      }
    })

    // Track slow requests
    if (duration > 3000) {
      this.recordMetric({
        name: 'slow_network_request',
        value: duration,
        unit: 'ms',
        timestamp: new Date(),
        category: 'NETWORK',
        metadata: {
          endpoint: networkMetric.endpoint,
          threshold: 3000
        }
      })
    }

    // Trim network metrics if too many
    if (this.networkMetrics.length > 100) {
      this.networkMetrics = this.networkMetrics.slice(-50)
    }
  }

  // ==================== CUSTOM METRICS ====================

  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric)
    this.metricsBuffer.push(metric)

    // Check memory peaks
    if (metric.category === 'MEMORY' && this.currentSession) {
      this.currentSession.memoryPeaks.push(metric.value)
    }

    // Flush buffer if full
    if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
      this.flushMetrics()
    }
  }

  measureAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now()
    const startMemory = this.getCurrentMemoryUsage()

    return operation()
      .then(result => {
        const duration = Date.now() - startTime
        const memoryDelta = this.getCurrentMemoryUsage() - startMemory

        this.recordMetric({
          name: `async_operation_${name}`,
          value: duration,
          unit: 'ms',
          timestamp: new Date(),
          category: 'CUSTOM',
          metadata: {
            operation: name,
            memoryDelta,
            success: true
          }
        })

        return result
      })
      .catch(error => {
        const duration = Date.now() - startTime

        this.recordMetric({
          name: `async_operation_${name}`,
          value: duration,
          unit: 'ms',
          timestamp: new Date(),
          category: 'CUSTOM',
          metadata: {
            operation: name,
            success: false,
            error: error.message
          }
        })

        throw error
      })
  }

  measureSync<T>(name: string, operation: () => T): T {
    const startTime = Date.now()
    const startMemory = this.getCurrentMemoryUsage()

    try {
      const result = operation()
      const duration = Date.now() - startTime
      const memoryDelta = this.getCurrentMemoryUsage() - startMemory

      this.recordMetric({
        name: `sync_operation_${name}`,
        value: duration,
        unit: 'ms',
        timestamp: new Date(),
        category: 'CUSTOM',
        metadata: {
          operation: name,
          memoryDelta,
          success: true
        }
      })

      return result
    } catch (error: any) {
      const duration = Date.now() - startTime

      this.recordMetric({
        name: `sync_operation_${name}`,
        value: duration,
        unit: 'ms',
        timestamp: new Date(),
        category: 'CUSTOM',
        metadata: {
          operation: name,
          success: false,
          error: error.message
        }
      })

      throw error
    }
  }

  // ==================== MEMORY MONITORING ====================

  private getCurrentMemoryUsage(): number {
    // This is a simplified implementation
    // In a real app, you'd use a native module for accurate memory measurement
    if (global.performance && global.performance.memory) {
      return (global.performance.memory as any).usedJSHeapSize || 0
    }
    return 0
  }

  private async getAvailableMemory(): Promise<number> {
    // Platform-specific implementation would go here
    // This would require a native module
    return 0
  }

  trackMemoryUsage() {
    const memoryUsage = this.getCurrentMemoryUsage()

    this.recordMetric({
      name: 'memory_usage',
      value: memoryUsage,
      unit: 'bytes',
      timestamp: new Date(),
      category: 'MEMORY'
    })

    // Check for memory leaks (simplified)
    if (memoryUsage > 100 * 1024 * 1024) { // 100MB threshold
      this.recordMetric({
        name: 'high_memory_usage',
        value: memoryUsage,
        unit: 'bytes',
        timestamp: new Date(),
        category: 'MEMORY',
        metadata: {
          threshold: 100 * 1024 * 1024,
          screens: this.currentSession?.screens || []
        }
      })
    }
  }

  private cleanupMemory() {
    // Trigger garbage collection if available
    if (global.gc) {
      global.gc()
    }

    // Clear old metrics
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    this.metrics = this.metrics.filter(m => m.timestamp.getTime() > oneHourAgo)
    
    // Clear old network metrics
    this.networkMetrics = this.networkMetrics.slice(-50)
  }

  // ==================== ANALYTICS & REPORTING ====================

  async generatePerformanceReport(): Promise<{
    summary: any
    details: any
    recommendations: string[]
  }> {
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000

    const recentMetrics = this.metrics.filter(m => m.timestamp.getTime() > oneHourAgo)

    // Calculate averages and aggregates
    const summary = {
      device: this.deviceInfo,
      session: this.currentSession ? {
        duration: now - this.currentSession.startTime.getTime(),
        screens: this.currentSession.screens.length,
        interactions: this.currentSession.interactions,
        errors: this.currentSession.errors
      } : null,
      performance: {
        averageRenderTime: this.calculateAverage(recentMetrics.filter(m => m.name === 'screen_render')),
        averageNetworkTime: this.calculateAverage(recentMetrics.filter(m => m.name === 'network_request')),
        memoryUsage: this.getCurrentMemoryUsage(),
        errorRate: this.calculateErrorRate(recentMetrics),
        slowRenders: recentMetrics.filter(m => m.name === 'slow_render').length,
        slowNetworkRequests: recentMetrics.filter(m => m.name === 'slow_network_request').length
      }
    }

    const details = {
      screenMetrics: Array.from(this.screenMetrics.values()),
      networkMetrics: this.getNetworkSummary(),
      memoryPeaks: this.currentSession?.memoryPeaks || [],
      topErrors: this.getTopErrors(recentMetrics)
    }

    const recommendations = this.generateRecommendations(summary, details)

    return { summary, details, recommendations }
  }

  private calculateAverage(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0
    const sum = metrics.reduce((acc, m) => acc + m.value, 0)
    return sum / metrics.length
  }

  private calculateErrorRate(metrics: PerformanceMetric[]): number {
    const errors = metrics.filter(m => m.name.includes('error')).length
    const total = metrics.length
    return total > 0 ? (errors / total) * 100 : 0
  }

  private getNetworkSummary() {
    const summary = {
      totalRequests: this.networkMetrics.length,
      successfulRequests: this.networkMetrics.filter(m => m.success).length,
      failedRequests: this.networkMetrics.filter(m => !m.success).length,
      averageDuration: this.networkMetrics.reduce((acc, m) => acc + m.duration, 0) / this.networkMetrics.length || 0,
      totalDataTransferred: this.networkMetrics.reduce((acc, m) => acc + m.requestSize + m.responseSize, 0)
    }

    return summary
  }

  private getTopErrors(metrics: PerformanceMetric[]): any[] {
    const errors = metrics
      .filter(m => m.name.includes('error'))
      .reduce((acc, m) => {
        const key = m.metadata?.errorMessage || 'Unknown'
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    return Object.entries(errors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([message, count]) => ({ message, count }))
  }

  private generateRecommendations(summary: any, details: any): string[] {
    const recommendations: string[] = []

    // Check render performance
    if (summary.performance.averageRenderTime > 500) {
      recommendations.push('Consider optimizing screen render times - average is above 500ms')
    }

    // Check network performance
    if (summary.performance.averageNetworkTime > 2000) {
      recommendations.push('Network requests are slow - consider implementing caching or optimizing API calls')
    }

    // Check memory usage
    if (summary.performance.memoryUsage > 50 * 1024 * 1024) {
      recommendations.push('High memory usage detected - review image loading and data caching strategies')
    }

    // Check error rate
    if (summary.performance.errorRate > 5) {
      recommendations.push('High error rate detected - investigate and fix common errors')
    }

    // Check slow renders
    if (summary.performance.slowRenders > 5) {
      recommendations.push('Multiple slow renders detected - consider using React.memo or useMemo for optimization')
    }

    return recommendations
  }

  // ==================== PERSISTENCE ====================

  private startMetricsFlush() {
    this.flushInterval = setInterval(() => {
      this.flushMetrics()
    }, this.FLUSH_INTERVAL)
  }

  private async flushMetrics() {
    if (this.metricsBuffer.length === 0) return

    try {
      // Save metrics to storage
      const existingMetrics = await this.loadMetrics()
      const combinedMetrics = [...existingMetrics, ...this.metricsBuffer]

      // Keep only last 1000 metrics
      const metricsToSave = combinedMetrics.slice(-1000)

      await AsyncStorage.setItem(this.METRICS_KEY, JSON.stringify(metricsToSave))

      // Clear buffer after successful save
      this.metricsBuffer = []

      // Optional: Send to analytics service
      // await this.sendToAnalytics(metricsToSave)
    } catch (error) {
      console.error('Error flushing metrics:', error)
    }
  }

  private async loadMetrics(): Promise<PerformanceMetric[]> {
    try {
      const saved = await AsyncStorage.getItem(this.METRICS_KEY)
      return saved ? JSON.parse(saved) : []
    } catch (error) {
      console.error('Error loading metrics:', error)
      return []
    }
  }

  private async saveSessionMetrics(session: SessionMetrics) {
    try {
      const sessions = await this.loadSessions()
      sessions.push(session)

      // Keep only last 10 sessions
      const sessionsToSave = sessions.slice(-10)

      await AsyncStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionsToSave))
    } catch (error) {
      console.error('Error saving session metrics:', error)
    }
  }

  private async loadSessions(): Promise<SessionMetrics[]> {
    try {
      const saved = await AsyncStorage.getItem(this.SESSION_KEY)
      return saved ? JSON.parse(saved) : []
    } catch (error) {
      console.error('Error loading sessions:', error)
      return []
    }
  }

  // ==================== UTILITIES ====================

  private generateSessionId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private sanitizeUrl(url: string): string {
    // Remove sensitive information from URLs
    try {
      const urlObj = new URL(url)
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`
    } catch {
      return url.split('?')[0] // Remove query params as fallback
    }
  }

  // ==================== CLEANUP ====================

  cleanup() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }

    if (this.memoryWarningListener) {
      this.memoryWarningListener.remove()
    }

    AppState.removeEventListener('change', this.handleAppStateChange)

    // Final flush
    this.flushMetrics()
  }
}