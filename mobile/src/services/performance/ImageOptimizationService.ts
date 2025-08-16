import * as FileSystem from 'expo-file-system'
import * as ImageManipulator from 'expo-image-manipulator'
import { Image } from 'react-native'
import NetInfo from '@react-native-community/netinfo'

interface ImageLoadConfig {
  quality: 'LOW' | 'MEDIUM' | 'HIGH' | 'ORIGINAL'
  progressive: boolean
  cacheEnabled: boolean
  lazyLoad: boolean
  placeholder?: string
}

interface ImageDimensions {
  width: number
  height: number
}

interface OptimizedImage {
  uri: string
  width: number
  height: number
  size: number
  quality: string
  cached: boolean
}

interface ProgressiveLoadStage {
  stage: 'PLACEHOLDER' | 'THUMBNAIL' | 'PREVIEW' | 'FULL'
  uri: string
  quality: number
  dimensions: ImageDimensions
}

export class ImageOptimizationService {
  private static instance: ImageOptimizationService
  private imageCache: Map<string, OptimizedImage> = new Map()
  private loadingQueue: Map<string, Promise<OptimizedImage>> = new Map()
  private networkQuality: 'SLOW' | 'MEDIUM' | 'FAST' = 'MEDIUM'
  
  private readonly CACHE_DIR = `${FileSystem.cacheDirectory}optimized_images/`
  private readonly THUMBNAIL_DIR = `${FileSystem.cacheDirectory}thumbnails/`
  
  private readonly QUALITY_PRESETS = {
    LOW: { 
      maxWidth: 512, 
      maxHeight: 512, 
      quality: 0.6,
      format: ImageManipulator.SaveFormat.JPEG
    },
    MEDIUM: { 
      maxWidth: 1024, 
      maxHeight: 1024, 
      quality: 0.75,
      format: ImageManipulator.SaveFormat.JPEG
    },
    HIGH: { 
      maxWidth: 2048, 
      maxHeight: 2048, 
      quality: 0.85,
      format: ImageManipulator.SaveFormat.JPEG
    },
    ORIGINAL: { 
      maxWidth: 4096, 
      maxHeight: 4096, 
      quality: 0.95,
      format: ImageManipulator.SaveFormat.PNG
    }
  }

  private readonly PROGRESSIVE_STAGES = [
    { name: 'PLACEHOLDER', scale: 0.02, quality: 0.1, blur: 20 },
    { name: 'THUMBNAIL', scale: 0.1, quality: 0.3, blur: 10 },
    { name: 'PREVIEW', scale: 0.5, quality: 0.6, blur: 0 },
    { name: 'FULL', scale: 1.0, quality: 0.85, blur: 0 }
  ]

  private constructor() {
    this.ensureDirectories()
    this.setupNetworkQualityMonitor()
    this.startCacheCleanup()
  }

  static getInstance(): ImageOptimizationService {
    if (!ImageOptimizationService.instance) {
      ImageOptimizationService.instance = new ImageOptimizationService()
    }
    return ImageOptimizationService.instance
  }

  private async ensureDirectories() {
    const dirs = [this.CACHE_DIR, this.THUMBNAIL_DIR]
    for (const dir of dirs) {
      const info = await FileSystem.getInfoAsync(dir)
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true })
      }
    }
  }

  private setupNetworkQualityMonitor() {
    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        // Determine network quality based on connection type and effective type
        if (state.type === 'wifi') {
          this.networkQuality = 'FAST'
        } else if (state.type === 'cellular') {
          const effectiveType = (state.details as any)?.cellularGeneration
          if (effectiveType === '4g' || effectiveType === '5g') {
            this.networkQuality = 'MEDIUM'
          } else {
            this.networkQuality = 'SLOW'
          }
        } else {
          this.networkQuality = 'SLOW'
        }
      }
    })
  }

  // ==================== PROGRESSIVE LOADING ====================

  async loadImageProgressive(
    imageUrl: string,
    onProgress?: (stage: ProgressiveLoadStage) => void
  ): Promise<OptimizedImage[]> {
    const stages: OptimizedImage[] = []

    try {
      // Get original image dimensions
      const dimensions = await this.getImageDimensions(imageUrl)

      for (const stage of this.PROGRESSIVE_STAGES) {
        // Skip stages based on network quality
        if (this.networkQuality === 'SLOW' && stage.name === 'PREVIEW') {
          continue
        }

        const stageImage = await this.generateProgressiveStage(
          imageUrl,
          dimensions,
          stage
        )

        stages.push(stageImage)

        if (onProgress) {
          onProgress({
            stage: stage.name as any,
            uri: stageImage.uri,
            quality: stage.quality,
            dimensions: { width: stageImage.width, height: stageImage.height }
          })
        }

        // Add delay for smooth transition
        if (stage.name !== 'FULL') {
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }

      return stages
    } catch (error) {
      console.error('Error in progressive loading:', error)
      throw error
    }
  }

  private async generateProgressiveStage(
    imageUrl: string,
    originalDimensions: ImageDimensions,
    stage: any
  ): Promise<OptimizedImage> {
    const cacheKey = `${imageUrl}_${stage.name}`
    
    // Check if already cached
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!
    }

    const targetWidth = Math.floor(originalDimensions.width * stage.scale)
    const targetHeight = Math.floor(originalDimensions.height * stage.scale)

    const manipulations: ImageManipulator.Action[] = [
      {
        resize: {
          width: targetWidth,
          height: targetHeight
        }
      }
    ]

    if (stage.blur > 0) {
      // Note: expo-image-manipulator doesn't support blur directly
      // This would need a custom native module or post-processing
    }

    const result = await ImageManipulator.manipulateAsync(
      imageUrl,
      manipulations,
      {
        compress: stage.quality,
        format: ImageManipulator.SaveFormat.JPEG
      }
    )

    const fileInfo = await FileSystem.getInfoAsync(result.uri)

    const optimizedImage: OptimizedImage = {
      uri: result.uri,
      width: result.width,
      height: result.height,
      size: fileInfo.size || 0,
      quality: stage.name,
      cached: true
    }

    this.imageCache.set(cacheKey, optimizedImage)
    return optimizedImage
  }

  // ==================== IMAGE OPTIMIZATION ====================

  async optimizeImage(
    imageUrl: string,
    config: ImageLoadConfig = { quality: 'MEDIUM', progressive: false, cacheEnabled: true, lazyLoad: false }
  ): Promise<OptimizedImage> {
    const cacheKey = `${imageUrl}_${config.quality}`

    // Return from cache if available
    if (config.cacheEnabled && this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!
    }

    // Return existing loading promise if image is already being processed
    if (this.loadingQueue.has(cacheKey)) {
      return this.loadingQueue.get(cacheKey)!
    }

    const loadingPromise = this.performOptimization(imageUrl, config)
    this.loadingQueue.set(cacheKey, loadingPromise)

    try {
      const result = await loadingPromise
      this.loadingQueue.delete(cacheKey)
      return result
    } catch (error) {
      this.loadingQueue.delete(cacheKey)
      throw error
    }
  }

  private async performOptimization(
    imageUrl: string,
    config: ImageLoadConfig
  ): Promise<OptimizedImage> {
    try {
      const preset = this.QUALITY_PRESETS[config.quality]
      const outputPath = `${this.CACHE_DIR}${this.generateFileName(imageUrl, config.quality)}`

      // Check if optimized version exists on disk
      const fileInfo = await FileSystem.getInfoAsync(outputPath)
      if (fileInfo.exists) {
        const dimensions = await this.getImageDimensions(outputPath)
        return {
          uri: outputPath,
          width: dimensions.width,
          height: dimensions.height,
          size: fileInfo.size || 0,
          quality: config.quality,
          cached: true
        }
      }

      // Download and optimize
      const downloadPath = `${FileSystem.cacheDirectory}temp_${Date.now()}.jpg`
      await FileSystem.downloadAsync(imageUrl, downloadPath)

      const result = await ImageManipulator.manipulateAsync(
        downloadPath,
        [
          {
            resize: {
              width: preset.maxWidth,
              height: preset.maxHeight
            }
          }
        ],
        {
          compress: preset.quality,
          format: preset.format
        }
      )

      // Move to cache directory
      await FileSystem.moveAsync({
        from: result.uri,
        to: outputPath
      })

      // Clean up temp file
      await FileSystem.deleteAsync(downloadPath, { idempotent: true })

      const finalInfo = await FileSystem.getInfoAsync(outputPath)

      const optimizedImage: OptimizedImage = {
        uri: outputPath,
        width: result.width,
        height: result.height,
        size: finalInfo.size || 0,
        quality: config.quality,
        cached: true
      }

      if (config.cacheEnabled) {
        this.imageCache.set(`${imageUrl}_${config.quality}`, optimizedImage)
      }

      return optimizedImage
    } catch (error) {
      console.error('Error optimizing image:', error)
      throw error
    }
  }

  // ==================== ADAPTIVE LOADING ====================

  async loadImageAdaptive(imageUrl: string): Promise<OptimizedImage> {
    // Determine quality based on network conditions
    const quality = this.determineQualityForNetwork()
    
    return this.optimizeImage(imageUrl, {
      quality,
      progressive: this.networkQuality !== 'FAST',
      cacheEnabled: true,
      lazyLoad: this.networkQuality === 'SLOW'
    })
  }

  private determineQualityForNetwork(): 'LOW' | 'MEDIUM' | 'HIGH' | 'ORIGINAL' {
    switch (this.networkQuality) {
      case 'SLOW':
        return 'LOW'
      case 'MEDIUM':
        return 'MEDIUM'
      case 'FAST':
        return 'HIGH'
      default:
        return 'MEDIUM'
    }
  }

  // ==================== BATCH PROCESSING ====================

  async optimizeBatch(
    imageUrls: string[],
    config: ImageLoadConfig,
    onProgress?: (completed: number, total: number) => void
  ): Promise<OptimizedImage[]> {
    const results: OptimizedImage[] = []
    const batchSize = this.networkQuality === 'FAST' ? 5 : 2

    for (let i = 0; i < imageUrls.length; i += batchSize) {
      const batch = imageUrls.slice(i, Math.min(i + batchSize, imageUrls.length))
      
      const batchResults = await Promise.all(
        batch.map(url => this.optimizeImage(url, config))
      )
      
      results.push(...batchResults)
      
      if (onProgress) {
        onProgress(Math.min(i + batchSize, imageUrls.length), imageUrls.length)
      }
    }

    return results
  }

  // ==================== MEMORY MANAGEMENT ====================

  async preloadImages(imageUrls: string[], priority: 'HIGH' | 'LOW' = 'LOW') {
    const quality = priority === 'HIGH' ? 'MEDIUM' : 'LOW'
    
    for (const url of imageUrls) {
      // Preload into React Native's image cache
      Image.prefetch(url)
      
      // Also optimize and cache
      this.optimizeImage(url, {
        quality,
        progressive: false,
        cacheEnabled: true,
        lazyLoad: false
      }).catch(error => {
        console.warn('Failed to preload image:', url, error)
      })
    }
  }

  clearMemoryCache() {
    this.imageCache.clear()
    this.loadingQueue.clear()
  }

  async clearDiskCache() {
    try {
      await FileSystem.deleteAsync(this.CACHE_DIR, { idempotent: true })
      await FileSystem.deleteAsync(this.THUMBNAIL_DIR, { idempotent: true })
      await this.ensureDirectories()
      this.clearMemoryCache()
    } catch (error) {
      console.error('Error clearing disk cache:', error)
    }
  }

  // ==================== CACHE MANAGEMENT ====================

  private startCacheCleanup() {
    // Run cleanup every hour
    setInterval(() => {
      this.cleanupOldCache()
    }, 60 * 60 * 1000)
  }

  private async cleanupOldCache() {
    try {
      const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days
      const now = Date.now()

      const files = await FileSystem.readDirectoryAsync(this.CACHE_DIR)
      
      for (const file of files) {
        const filePath = `${this.CACHE_DIR}${file}`
        const info = await FileSystem.getInfoAsync(filePath)
        
        if (info.modificationTime && (now - info.modificationTime * 1000) > maxAge) {
          await FileSystem.deleteAsync(filePath, { idempotent: true })
        }
      }

      // Also clean memory cache
      const memCacheLimit = 50 // Keep only 50 most recent images in memory
      if (this.imageCache.size > memCacheLimit) {
        const entries = Array.from(this.imageCache.entries())
        const toRemove = entries.slice(0, entries.length - memCacheLimit)
        toRemove.forEach(([key]) => this.imageCache.delete(key))
      }
    } catch (error) {
      console.error('Error cleaning up cache:', error)
    }
  }

  async getCacheStats(): Promise<{
    memoryCacheSize: number
    diskCacheSize: number
    cachedImages: number
    networkQuality: string
  }> {
    try {
      let diskSize = 0
      
      const cacheFiles = await FileSystem.readDirectoryAsync(this.CACHE_DIR)
      for (const file of cacheFiles) {
        const info = await FileSystem.getInfoAsync(`${this.CACHE_DIR}${file}`)
        diskSize += info.size || 0
      }

      const thumbFiles = await FileSystem.readDirectoryAsync(this.THUMBNAIL_DIR)
      for (const file of thumbFiles) {
        const info = await FileSystem.getInfoAsync(`${this.THUMBNAIL_DIR}${file}`)
        diskSize += info.size || 0
      }

      return {
        memoryCacheSize: this.imageCache.size,
        diskCacheSize: diskSize,
        cachedImages: cacheFiles.length + thumbFiles.length,
        networkQuality: this.networkQuality
      }
    } catch (error) {
      console.error('Error getting cache stats:', error)
      return {
        memoryCacheSize: 0,
        diskCacheSize: 0,
        cachedImages: 0,
        networkQuality: this.networkQuality
      }
    }
  }

  // ==================== UTILITIES ====================

  private async getImageDimensions(uri: string): Promise<ImageDimensions> {
    return new Promise((resolve, reject) => {
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        reject
      )
    })
  }

  private generateFileName(url: string, quality: string): string {
    const hash = this.hashString(url)
    return `${hash}_${quality}.jpg`
  }

  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  getNetworkQuality(): 'SLOW' | 'MEDIUM' | 'FAST' {
    return this.networkQuality
  }

  async estimateLoadTime(imageUrl: string, quality: 'LOW' | 'MEDIUM' | 'HIGH'): Promise<number> {
    try {
      // Get expected file size based on quality
      const preset = this.QUALITY_PRESETS[quality]
      const estimatedSize = preset.maxWidth * preset.maxHeight * preset.quality * 0.1 // Rough estimate in KB
      
      // Estimate based on network quality
      const speeds = {
        'SLOW': 50, // 50 KB/s
        'MEDIUM': 200, // 200 KB/s
        'FAST': 1000 // 1000 KB/s
      }
      
      const speed = speeds[this.networkQuality]
      return (estimatedSize / speed) * 1000 // Return in milliseconds
    } catch (error) {
      return 3000 // Default 3 seconds
    }
  }
}