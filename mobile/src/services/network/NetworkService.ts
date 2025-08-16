import NetInfo, { NetInfoState } from '@react-native-community/netinfo'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface RequestConfig {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  timeout?: number
  retryCount?: number
  retryDelay?: number
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  requiresAuth?: boolean
  cacheResponse?: boolean
  cacheDuration?: number
}

interface RetryPolicy {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryableStatuses: number[]
  retryableErrors: string[]
}

interface NetworkMetrics {
  requestCount: number
  failedRequests: number
  averageResponseTime: number
  totalBandwidth: number
  connectionType: string
  isConnected: boolean
  lastError?: string
}

interface QueuedRequest {
  id: string
  config: RequestConfig
  resolve: (value: any) => void
  reject: (error: any) => void
  timestamp: number
  retryAttempt: number
}

export class NetworkService {
  private static instance: NetworkService
  private connectionState: NetInfoState | null = null
  private requestQueue: QueuedRequest[] = []
  private activeRequests: Map<string, AbortController> = new Map()
  private metrics: NetworkMetrics
  private retryPolicy: RetryPolicy
  private isProcessingQueue: boolean = false
  private bandwidthEstimate: number = 0 // bytes per second
  private responseCache: Map<string, { data: any; expiry: number }> = new Map()

  private readonly LOW_DATA_MODE_KEY = '@axis_low_data_mode'
  private readonly METRICS_KEY = '@axis_network_metrics'

  private constructor() {
    this.metrics = {
      requestCount: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalBandwidth: 0,
      connectionType: 'unknown',
      isConnected: false
    }

    this.retryPolicy = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      retryableStatuses: [408, 429, 500, 502, 503, 504],
      retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'CONNECTION_LOST']
    }

    this.setupNetworkListener()
    this.loadMetrics()
    this.startMetricsPersistence()
  }

  static getInstance(): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService()
    }
    return NetworkService.instance
  }

  private setupNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.connectionState?.isConnected
      this.connectionState = state
      this.metrics.isConnected = state.isConnected ?? false
      this.metrics.connectionType = state.type

      // Update bandwidth estimate based on connection type
      this.updateBandwidthEstimate(state)

      if (wasOffline && state.isConnected) {
        // Connection restored - process queued requests
        this.processRequestQueue()
      }
    })

    // Get initial state
    NetInfo.fetch().then(state => {
      this.connectionState = state
      this.metrics.isConnected = state.isConnected ?? false
      this.metrics.connectionType = state.type
      this.updateBandwidthEstimate(state)
    })
  }

  private updateBandwidthEstimate(state: NetInfoState) {
    // Estimate bandwidth based on connection type
    const bandwidthMap: Record<string, number> = {
      'wifi': 10 * 1024 * 1024, // 10 MB/s
      '4g': 5 * 1024 * 1024,    // 5 MB/s
      '3g': 1 * 1024 * 1024,    // 1 MB/s
      '2g': 128 * 1024,         // 128 KB/s
      'unknown': 512 * 1024     // 512 KB/s
    }

    if (state.type === 'cellular') {
      const cellularGen = (state.details as any)?.cellularGeneration
      this.bandwidthEstimate = bandwidthMap[cellularGen] || bandwidthMap['3g']
    } else {
      this.bandwidthEstimate = bandwidthMap[state.type] || bandwidthMap['unknown']
    }
  }

  // ==================== REQUEST HANDLING ====================

  async request<T>(config: RequestConfig): Promise<T> {
    // Check cache first if enabled
    if (config.cacheResponse && config.method === 'GET') {
      const cached = this.getCachedResponse(config.url)
      if (cached) {
        return cached
      }
    }

    // Check if we're in low data mode
    const isLowDataMode = await this.isLowDataModeEnabled()
    if (isLowDataMode) {
      config = this.adjustForLowDataMode(config)
    }

    // If offline and request can't be queued, throw error
    if (!this.metrics.isConnected && !this.canQueueRequest(config)) {
      throw new Error('No internet connection')
    }

    // If offline but can queue, add to queue
    if (!this.metrics.isConnected) {
      return this.queueRequest(config)
    }

    // Perform request with retry logic
    return this.performRequestWithRetry<T>(config)
  }

  private async performRequestWithRetry<T>(
    config: RequestConfig,
    retryAttempt: number = 0
  ): Promise<T> {
    const requestId = this.generateRequestId()
    const abortController = new AbortController()
    this.activeRequests.set(requestId, abortController)

    const startTime = Date.now()

    try {
      // Add auth token if required
      if (config.requiresAuth) {
        const token = await this.getAuthToken()
        if (token) {
          config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${token}`
          }
        }
      }

      // Set timeout
      const timeout = config.timeout || 30000
      const timeoutId = setTimeout(() => abortController.abort(), timeout)

      const response = await fetch(config.url, {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: abortController.signal
      })

      clearTimeout(timeoutId)

      // Update metrics
      const responseTime = Date.now() - startTime
      this.updateMetrics(true, responseTime, response.headers.get('content-length'))

      // Handle non-OK responses
      if (!response.ok) {
        if (this.shouldRetry(response.status, retryAttempt)) {
          return this.retryRequest(config, retryAttempt + 1)
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Cache response if enabled
      if (config.cacheResponse && config.method === 'GET') {
        this.cacheResponse(config.url, data, config.cacheDuration)
      }

      return data as T
    } catch (error: any) {
      // Update metrics
      this.updateMetrics(false, Date.now() - startTime)

      // Check if we should retry
      if (this.shouldRetryError(error, retryAttempt)) {
        return this.retryRequest(config, retryAttempt + 1)
      }

      // If network error and can queue, add to queue
      if (error.name === 'AbortError' || error.message.includes('Network')) {
        if (this.canQueueRequest(config)) {
          return this.queueRequest(config)
        }
      }

      throw error
    } finally {
      this.activeRequests.delete(requestId)
    }
  }

  private shouldRetry(status: number, retryAttempt: number): boolean {
    return (
      retryAttempt < this.retryPolicy.maxRetries &&
      this.retryPolicy.retryableStatuses.includes(status)
    )
  }

  private shouldRetryError(error: any, retryAttempt: number): boolean {
    if (retryAttempt >= this.retryPolicy.maxRetries) {
      return false
    }

    const errorMessage = error.message || error.name || ''
    return this.retryPolicy.retryableErrors.some(retryableError =>
      errorMessage.includes(retryableError)
    )
  }

  private async retryRequest<T>(config: RequestConfig, retryAttempt: number): Promise<T> {
    const delay = this.calculateRetryDelay(retryAttempt)
    
    console.log(`Retrying request (attempt ${retryAttempt}/${this.retryPolicy.maxRetries}) after ${delay}ms`)
    
    await new Promise(resolve => setTimeout(resolve, delay))
    
    return this.performRequestWithRetry<T>(config, retryAttempt)
  }

  private calculateRetryDelay(retryAttempt: number): number {
    const exponentialDelay = this.retryPolicy.baseDelay * Math.pow(this.retryPolicy.backoffMultiplier, retryAttempt - 1)
    const jitteredDelay = exponentialDelay * (0.5 + Math.random() * 0.5) // Add jitter
    return Math.min(jitteredDelay, this.retryPolicy.maxDelay)
  }

  // ==================== REQUEST QUEUE ====================

  private canQueueRequest(config: RequestConfig): boolean {
    // Only queue POST, PUT, PATCH, DELETE requests (mutations)
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method)
  }

  private queueRequest<T>(config: RequestConfig): Promise<T> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: this.generateRequestId(),
        config,
        resolve,
        reject,
        timestamp: Date.now(),
        retryAttempt: 0
      }

      // Add to queue based on priority
      if (config.priority === 'HIGH') {
        this.requestQueue.unshift(queuedRequest)
      } else {
        this.requestQueue.push(queuedRequest)
      }

      // Save queue to storage
      this.persistQueue()

      // Try to process queue if online
      if (this.metrics.isConnected) {
        this.processRequestQueue()
      }
    })
  }

  private async processRequestQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return
    }

    if (!this.metrics.isConnected) {
      console.log('Cannot process queue - no connection')
      return
    }

    this.isProcessingQueue = true

    while (this.requestQueue.length > 0 && this.metrics.isConnected) {
      const request = this.requestQueue.shift()!
      
      try {
        const result = await this.performRequestWithRetry(request.config, request.retryAttempt)
        request.resolve(result)
      } catch (error) {
        if (request.retryAttempt < this.retryPolicy.maxRetries) {
          // Re-queue with incremented retry count
          request.retryAttempt++
          this.requestQueue.unshift(request)
        } else {
          request.reject(error)
        }
      }

      // Save updated queue
      await this.persistQueue()
      
      // Small delay between queued requests
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    this.isProcessingQueue = false
  }

  private async persistQueue() {
    try {
      const queueData = this.requestQueue.map(req => ({
        id: req.id,
        config: req.config,
        timestamp: req.timestamp,
        retryAttempt: req.retryAttempt
      }))
      
      await AsyncStorage.setItem('@axis_request_queue', JSON.stringify(queueData))
    } catch (error) {
      console.error('Error persisting request queue:', error)
    }
  }

  async loadPersistedQueue() {
    try {
      const queueData = await AsyncStorage.getItem('@axis_request_queue')
      if (queueData) {
        const parsedQueue = JSON.parse(queueData)
        
        // Re-create queued requests (without promises)
        parsedQueue.forEach((item: any) => {
          this.request(item.config).catch(error => {
            console.error('Error processing persisted request:', error)
          })
        })
      }
    } catch (error) {
      console.error('Error loading persisted queue:', error)
    }
  }

  // ==================== CACHING ====================

  private getCachedResponse(url: string): any | null {
    const cached = this.responseCache.get(url)
    
    if (cached && cached.expiry > Date.now()) {
      console.log('Returning cached response for:', url)
      return cached.data
    }

    // Remove expired cache
    if (cached) {
      this.responseCache.delete(url)
    }

    return null
  }

  private cacheResponse(url: string, data: any, duration?: number) {
    const cacheDuration = duration || 5 * 60 * 1000 // Default 5 minutes
    
    this.responseCache.set(url, {
      data,
      expiry: Date.now() + cacheDuration
    })

    // Limit cache size
    if (this.responseCache.size > 100) {
      const firstKey = this.responseCache.keys().next().value
      this.responseCache.delete(firstKey)
    }
  }

  clearCache() {
    this.responseCache.clear()
  }

  // ==================== LOW DATA MODE ====================

  private async isLowDataModeEnabled(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(this.LOW_DATA_MODE_KEY)
      return value === 'true'
    } catch {
      return false
    }
  }

  async setLowDataMode(enabled: boolean) {
    try {
      await AsyncStorage.setItem(this.LOW_DATA_MODE_KEY, enabled.toString())
    } catch (error) {
      console.error('Error setting low data mode:', error)
    }
  }

  private adjustForLowDataMode(config: RequestConfig): RequestConfig {
    // Add headers to request compressed/optimized content
    return {
      ...config,
      headers: {
        ...config.headers,
        'Accept-Encoding': 'gzip, deflate',
        'X-Low-Data-Mode': 'true',
        'X-Requested-Quality': 'low'
      }
    }
  }

  // ==================== BANDWIDTH MONITORING ====================

  estimateDownloadTime(sizeBytes: number): number {
    if (this.bandwidthEstimate === 0) {
      return 0
    }
    return (sizeBytes / this.bandwidthEstimate) * 1000 // Return in milliseconds
  }

  async checkBandwidthForDownload(sizeBytes: number): Promise<{
    canDownload: boolean
    estimatedTime: number
    recommendation?: string
  }> {
    const estimatedTime = this.estimateDownloadTime(sizeBytes)
    const isLowData = await this.isLowDataModeEnabled()

    // Don't download large files on slow connections or in low data mode
    if (isLowData && sizeBytes > 5 * 1024 * 1024) { // 5MB
      return {
        canDownload: false,
        estimatedTime,
        recommendation: 'File too large for low data mode. Connect to Wi-Fi or disable low data mode.'
      }
    }

    if (this.metrics.connectionType === 'cellular' && sizeBytes > 50 * 1024 * 1024) { // 50MB
      return {
        canDownload: false,
        estimatedTime,
        recommendation: 'File too large for cellular connection. Connect to Wi-Fi to download.'
      }
    }

    if (estimatedTime > 60000) { // More than 1 minute
      return {
        canDownload: true,
        estimatedTime,
        recommendation: 'This download may take a while on your current connection.'
      }
    }

    return {
      canDownload: true,
      estimatedTime
    }
  }

  // ==================== METRICS & MONITORING ====================

  private updateMetrics(success: boolean, responseTime: number, contentLength?: string | null) {
    this.metrics.requestCount++
    
    if (!success) {
      this.metrics.failedRequests++
    }

    // Update average response time
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.requestCount - 1) + responseTime) / 
      this.metrics.requestCount

    // Update bandwidth usage
    if (contentLength) {
      const bytes = parseInt(contentLength, 10)
      if (!isNaN(bytes)) {
        this.metrics.totalBandwidth += bytes
      }
    }
  }

  private async loadMetrics() {
    try {
      const saved = await AsyncStorage.getItem(this.METRICS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        this.metrics = { ...this.metrics, ...parsed }
      }
    } catch (error) {
      console.error('Error loading metrics:', error)
    }
  }

  private startMetricsPersistence() {
    // Save metrics every 5 minutes
    setInterval(() => {
      this.saveMetrics()
    }, 5 * 60 * 1000)
  }

  private async saveMetrics() {
    try {
      await AsyncStorage.setItem(this.METRICS_KEY, JSON.stringify(this.metrics))
    } catch (error) {
      console.error('Error saving metrics:', error)
    }
  }

  getMetrics(): NetworkMetrics {
    return { ...this.metrics }
  }

  resetMetrics() {
    this.metrics = {
      requestCount: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalBandwidth: 0,
      connectionType: this.metrics.connectionType,
      isConnected: this.metrics.isConnected
    }
    this.saveMetrics()
  }

  // ==================== CONNECTION STATUS ====================

  isOnline(): boolean {
    return this.metrics.isConnected
  }

  getConnectionType(): string {
    return this.metrics.connectionType
  }

  getConnectionQuality(): 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT' {
    if (!this.metrics.isConnected) return 'POOR'

    const avgResponseTime = this.metrics.averageResponseTime
    const failureRate = this.metrics.failedRequests / Math.max(this.metrics.requestCount, 1)

    if (failureRate > 0.2 || avgResponseTime > 5000) return 'POOR'
    if (failureRate > 0.1 || avgResponseTime > 2000) return 'FAIR'
    if (failureRate > 0.05 || avgResponseTime > 1000) return 'GOOD'
    return 'EXCELLENT'
  }

  // ==================== REQUEST CANCELLATION ====================

  cancelAllRequests() {
    this.activeRequests.forEach(controller => controller.abort())
    this.activeRequests.clear()
  }

  cancelRequest(requestId: string) {
    const controller = this.activeRequests.get(requestId)
    if (controller) {
      controller.abort()
      this.activeRequests.delete(requestId)
    }
  }

  // ==================== UTILITIES ====================

  private generateRequestId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('@axis_auth_token')
      return token
    } catch {
      return null
    }
  }

  setRetryPolicy(policy: Partial<RetryPolicy>) {
    this.retryPolicy = { ...this.retryPolicy, ...policy }
  }

  getQueueSize(): number {
    return this.requestQueue.length
  }

  clearQueue() {
    this.requestQueue = []
    this.persistQueue()
  }
}