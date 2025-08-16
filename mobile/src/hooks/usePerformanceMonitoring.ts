import { useEffect, useRef, useCallback } from 'react'
import { InteractionManager } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { PerformanceMonitoringService } from '../services/performance/PerformanceMonitoringService'
import { ResourceOptimizationService } from '../services/performance/ResourceOptimizationService'

interface PerformanceHookOptions {
  screenName: string
  trackMemory?: boolean
  trackInteractions?: boolean
  trackRenderTime?: boolean
  autoCleanup?: boolean
}

interface PerformanceMetrics {
  renderTime: number
  memoryUsage: number
  interactionCount: number
  isOptimized: boolean
}

export function usePerformanceMonitoring(options: PerformanceHookOptions) {
  const {
    screenName,
    trackMemory = true,
    trackInteractions = true,
    trackRenderTime = true,
    autoCleanup = true
  } = options

  const performanceService = PerformanceMonitoringService.getInstance()
  const resourceService = ResourceOptimizationService.getInstance()
  const navigation = useNavigation()

  const renderStartTime = useRef<number>(0)
  const interactionCount = useRef<number>(0)
  const screenTracker = useRef<any>(null)
  const isScreenFocused = useRef<boolean>(false)

  // Initialize performance tracking when screen loads
  useEffect(() => {
    renderStartTime.current = Date.now()

    // Track screen view
    screenTracker.current = performanceService.trackScreenView(screenName, {
      timestamp: new Date(),
      navigationState: navigation.getState()
    })

    // Measure render time
    if (trackRenderTime) {
      InteractionManager.runAfterInteractions(() => {
        const renderTime = Date.now() - renderStartTime.current
        
        performanceService.recordMetric({
          name: 'screen_mount_time',
          value: renderTime,
          unit: 'ms',
          timestamp: new Date(),
          category: 'RENDER',
          metadata: {
            screenName,
            isInitialMount: true
          }
        })
      })
    }

    return () => {
      // Cleanup when component unmounts
      if (autoCleanup) {
        performCleanup()
      }
    }
  }, [screenName])

  // Track screen focus/blur
  useFocusEffect(
    useCallback(() => {
      isScreenFocused.current = true
      
      performanceService.recordMetric({
        name: 'screen_focus',
        value: 1,
        unit: 'count',
        timestamp: new Date(),
        category: 'CUSTOM',
        metadata: { screenName }
      })

      return () => {
        isScreenFocused.current = false
        
        performanceService.recordMetric({
          name: 'screen_blur',
          value: 1,
          unit: 'count',
          timestamp: new Date(),
          category: 'CUSTOM',
          metadata: { 
            screenName,
            timeSpent: Date.now() - renderStartTime.current,
            interactions: interactionCount.current
          }
        })
      }
    }, [screenName])
  )

  // Track memory usage periodically
  useEffect(() => {
    if (!trackMemory) return

    const memoryInterval = setInterval(() => {
      if (isScreenFocused.current) {
        resourceService.checkMemoryUsage?.()
      }
    }, 10000) // Every 10 seconds

    return () => clearInterval(memoryInterval)
  }, [trackMemory])

  // Track interaction function
  const trackInteraction = useCallback((interactionName: string, metadata?: any) => {
    if (!trackInteractions) return

    interactionCount.current++
    
    if (screenTracker.current?.trackInteraction) {
      screenTracker.current.trackInteraction(interactionName)
    }

    performanceService.recordMetric({
      name: 'user_interaction',
      value: 1,
      unit: 'count',
      timestamp: new Date(),
      category: 'CUSTOM',
      metadata: {
        screenName,
        interactionName,
        interactionCount: interactionCount.current,
        ...metadata
      }
    })
  }, [screenName, trackInteractions])

  // Track error function
  const trackError = useCallback((error: Error, context?: string) => {
    if (screenTracker.current?.trackError) {
      screenTracker.current.trackError(error)
    }

    performanceService.recordMetric({
      name: 'screen_error',
      value: 1,
      unit: 'count',
      timestamp: new Date(),
      category: 'CUSTOM',
      metadata: {
        screenName,
        context,
        errorMessage: error.message,
        errorStack: error.stack
      }
    })
  }, [screenName])

  // Measure async operation
  const measureAsync = useCallback(async <T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    return performanceService.measureAsync(
      `${screenName}_${operationName}`,
      operation
    )
  }, [screenName])

  // Measure sync operation
  const measureSync = useCallback(<T>(
    operationName: string,
    operation: () => T
  ): T => {
    return performanceService.measureSync(
      `${screenName}_${operationName}`,
      operation
    )
  }, [screenName])

  // Get current performance metrics
  const getMetrics = useCallback((): PerformanceMetrics => {
    const currentTime = Date.now()
    const renderTime = currentTime - renderStartTime.current
    const resourceMetrics = resourceService.getResourceMetrics()
    
    return {
      renderTime,
      memoryUsage: resourceMetrics.memory?.usedMemory || 0,
      interactionCount: interactionCount.current,
      isOptimized: resourceMetrics.optimization.reducedAnimations ||
                   resourceMetrics.optimization.lowQualityImages
    }
  }, [])

  // Check if optimizations should be applied
  const shouldOptimize = useCallback(() => {
    const strategy = resourceService.getOptimizationStrategy()
    return {
      reduceAnimations: strategy.reducedAnimations,
      useLowQuality: strategy.lowQualityImages,
      limitNetwork: strategy.reducedNetworkCalls,
      enableCaching: strategy.aggressiveCaching
    }
  }, [])

  // Register cleanup callback
  const registerCleanup = useCallback((callback: () => void) => {
    resourceService.registerCleanupCallback(callback)
    
    return () => {
      resourceService.unregisterCleanupCallback(callback)
    }
  }, [])

  // Perform manual cleanup
  const performCleanup = useCallback(() => {
    // Clear any component-specific caches or data
    interactionCount.current = 0
    
    performanceService.recordMetric({
      name: 'screen_cleanup',
      value: 1,
      unit: 'count',
      timestamp: new Date(),
      category: 'CUSTOM',
      metadata: { screenName }
    })
  }, [screenName])

  // Track component render (use with React.memo or useMemo)
  const trackRender = useCallback((component: string, props?: any) => {
    performanceService.recordMetric({
      name: 'component_render',
      value: 1,
      unit: 'count',
      timestamp: new Date(),
      category: 'RENDER',
      metadata: {
        screenName,
        component,
        props: props ? Object.keys(props) : []
      }
    })
  }, [screenName])

  return {
    // Tracking functions
    trackInteraction,
    trackError,
    trackRender,
    
    // Measurement functions
    measureAsync,
    measureSync,
    
    // Performance data
    getMetrics,
    shouldOptimize,
    
    // Resource management
    registerCleanup,
    performCleanup,
    
    // Current state
    isScreenFocused: isScreenFocused.current,
    renderTime: Date.now() - renderStartTime.current,
    interactionCount: interactionCount.current
  }
}