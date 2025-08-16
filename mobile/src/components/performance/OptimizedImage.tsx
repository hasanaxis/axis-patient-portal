import React, { useState, useEffect, useRef } from 'react'
import { View, Image, StyleSheet, ActivityIndicator, Text, Animated } from 'react-native'
import { ImageOptimizationService } from '../../services/performance/ImageOptimizationService'
import { ResourceOptimizationService } from '../../services/performance/ResourceOptimizationService'
import { PerformanceMonitoringService } from '../../services/performance/PerformanceMonitoringService'

interface OptimizedImageProps {
  source: { uri: string }
  style?: any
  progressive?: boolean
  placeholder?: string
  onLoadStart?: () => void
  onLoadEnd?: () => void
  onError?: (error: any) => void
  quality?: 'LOW' | 'MEDIUM' | 'HIGH' | 'ADAPTIVE'
  lazyLoad?: boolean
  preload?: boolean
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center'
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  style,
  progressive = true,
  placeholder,
  onLoadStart,
  onLoadEnd,
  onError,
  quality = 'ADAPTIVE',
  lazyLoad = false,
  preload = false,
  resizeMode = 'cover'
}) => {
  const [imageStages, setImageStages] = useState<any[]>([])
  const [currentStage, setCurrentStage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const fadeAnim = useRef(new Animated.Value(0)).current
  const imageService = ImageOptimizationService.getInstance()
  const resourceService = ResourceOptimizationService.getInstance()
  const performanceService = PerformanceMonitoringService.getInstance()
  
  const loadStartTime = useRef<number>(0)
  const componentRef = useRef<any>(null)

  useEffect(() => {
    if (preload) {
      preloadImage()
    } else {
      loadImage()
    }
  }, [source.uri, quality])

  const preloadImage = async () => {
    try {
      const actualQuality = getActualQuality()
      await imageService.optimizeImage(source.uri, {
        quality: actualQuality,
        progressive: false,
        cacheEnabled: true,
        lazyLoad: false
      })
    } catch (error) {
      console.warn('Failed to preload image:', error)
    }
  }

  const loadImage = async () => {
    try {
      loadStartTime.current = Date.now()
      setLoading(true)
      setError(null)
      onLoadStart?.()

      const actualQuality = getActualQuality()

      if (progressive && resourceService.shouldEnableAnimation()) {
        // Load progressively
        await loadProgressively(actualQuality)
      } else {
        // Load single image
        await loadSingleImage(actualQuality)
      }
    } catch (err: any) {
      console.error('Error loading image:', err)
      setError(err.message)
      onError?.(err)
      
      // Track error
      performanceService.recordMetric({
        name: 'image_load_error',
        value: Date.now() - loadStartTime.current,
        unit: 'ms',
        timestamp: new Date(),
        category: 'RENDER',
        metadata: {
          url: source.uri,
          quality: actualQuality,
          error: err.message
        }
      })
    } finally {
      setLoading(false)
      onLoadEnd?.()
    }
  }

  const getActualQuality = (): 'LOW' | 'MEDIUM' | 'HIGH' => {
    if (quality === 'ADAPTIVE') {
      return resourceService.getRecommendedImageQuality()
    }
    return quality as 'LOW' | 'MEDIUM' | 'HIGH'
  }

  const loadProgressively = async (imageQuality: 'LOW' | 'MEDIUM' | 'HIGH') => {
    const stages = await imageService.loadImageProgressive(
      source.uri,
      (stage) => {
        setImageStages(prev => [...prev, stage])
        setCurrentStage(prev => prev + 1)
        
        // Animate transition between stages
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        }).start()
      }
    )

    // Track progressive loading performance
    performanceService.recordMetric({
      name: 'progressive_image_load',
      value: Date.now() - loadStartTime.current,
      unit: 'ms',
      timestamp: new Date(),
      category: 'RENDER',
      metadata: {
        url: source.uri,
        stages: stages.length,
        finalQuality: imageQuality
      }
    })
  }

  const loadSingleImage = async (imageQuality: 'LOW' | 'MEDIUM' | 'HIGH') => {
    const optimizedImage = await imageService.optimizeImage(source.uri, {
      quality: imageQuality,
      progressive: false,
      cacheEnabled: true,
      lazyLoad: lazyLoad
    })

    setImageStages([{
      uri: optimizedImage.uri,
      width: optimizedImage.width,
      height: optimizedImage.height
    }])
    setCurrentStage(1)

    // Animate appearance
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true
    }).start()

    // Track loading performance
    performanceService.recordMetric({
      name: 'single_image_load',
      value: Date.now() - loadStartTime.current,
      unit: 'ms',
      timestamp: new Date(),
      category: 'RENDER',
      metadata: {
        url: source.uri,
        quality: imageQuality,
        cached: optimizedImage.cached,
        size: optimizedImage.size
      }
    })
  }

  const getCurrentImage = () => {
    if (imageStages.length === 0) return null
    return imageStages[Math.min(currentStage - 1, imageStages.length - 1)]
  }

  const renderPlaceholder = () => {
    if (placeholder) {
      return (
        <Image
          source={{ uri: placeholder }}
          style={[styles.image, style]}
          resizeMode={resizeMode}
        />
      )
    }

    return (
      <View style={[styles.placeholder, style]}>
        <ActivityIndicator size="small" color="#666" />
      </View>
    )
  }

  const renderError = () => (
    <View style={[styles.errorContainer, style]}>
      <Text style={styles.errorText}>Failed to load image</Text>
    </View>
  )

  const renderImage = () => {
    const currentImage = getCurrentImage()
    if (!currentImage) return null

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <Image
          ref={componentRef}
          source={{ uri: currentImage.uri }}
          style={[styles.image, style]}
          resizeMode={resizeMode}
          onLoad={() => {
            // Track successful load
            const loadTime = Date.now() - loadStartTime.current
            performanceService.recordMetric({
              name: 'image_render_complete',
              value: loadTime,
              unit: 'ms',
              timestamp: new Date(),
              category: 'RENDER',
              metadata: {
                url: source.uri,
                progressive: progressive,
                stage: currentStage
              }
            })
          }}
          onError={(err) => {
            setError('Image failed to render')
            onError?.(err)
          }}
        />
      </Animated.View>
    )
  }

  if (error) {
    return renderError()
  }

  return (
    <View style={[styles.container, style]}>
      {loading && renderPlaceholder()}
      {imageStages.length > 0 && renderImage()}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    minHeight: 100,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    minHeight: 100,
  },
  errorText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
})