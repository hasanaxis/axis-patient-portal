import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { OptimizedImage } from '../../components/performance/OptimizedImage'
import { usePerformanceMonitoring } from '../../hooks/usePerformanceMonitoring'
import { OfflineStorageService } from '../../services/offline/OfflineStorageService'
import { NetworkService } from '../../services/network/NetworkService'

interface StudyViewScreenProps {
  route: {
    params: {
      studyId: string
      studyData?: any
    }
  }
  navigation: any
}

export const StudyViewScreen: React.FC<StudyViewScreenProps> = ({ route, navigation }) => {
  const { studyId, studyData: initialStudyData } = route.params
  
  // Performance monitoring
  const {
    trackInteraction,
    trackError,
    measureAsync,
    shouldOptimize,
    registerCleanup,
    getMetrics
  } = usePerformanceMonitoring({
    screenName: 'StudyView',
    trackMemory: true,
    trackInteractions: true,
    trackRenderTime: true
  })

  // State
  const [studyData, setStudyData] = useState(initialStudyData)
  const [reportData, setReportData] = useState(null)
  const [images, setImages] = useState<any[]>([])
  const [loading, setLoading] = useState(!initialStudyData)
  const [refreshing, setRefreshing] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [cacheStatus, setCacheStatus] = useState<'NONE' | 'PARTIAL' | 'COMPLETE'>('NONE')

  // Services
  const offlineStorage = OfflineStorageService.getInstance()
  const networkService = NetworkService.getInstance()

  // Get optimization settings
  const optimizations = shouldOptimize()
  const { width: screenWidth } = Dimensions.get('window')

  // Register cleanup callbacks
  useEffect(() => {
    const cleanupCallback = () => {
      // Clear any component-specific data
      setImages([])
      setReportData(null)
    }

    const unregister = registerCleanup(cleanupCallback)
    return unregister
  }, [registerCleanup])

  // Load study data on mount
  useEffect(() => {
    loadStudyData()
  }, [studyId])

  // Check offline status
  useEffect(() => {
    const checkOfflineStatus = async () => {
      const isOnline = networkService.isOnline()
      setIsOffline(!isOnline)

      if (!isOnline) {
        // Check if data is available offline
        const hasOfflineData = await offlineStorage.isOfflineDataAvailable(studyId)
        setCacheStatus(hasOfflineData ? 'COMPLETE' : 'NONE')
      }
    }

    checkOfflineStatus()
  }, [studyId])

  const loadStudyData = useCallback(async () => {
    try {
      await measureAsync('load_study_data', async () => {
        setLoading(true)

        // Check if data is available offline first
        const isOnline = networkService.isOnline()
        
        if (!isOnline) {
          await loadOfflineData()
          return
        }

        // Try to load from network with fallback to offline
        try {
          await loadFromNetwork()
        } catch (error) {
          console.error('Network load failed, trying offline:', error)
          await loadOfflineData()
        }
      })
    } catch (error: any) {
      trackError(error, 'load_study_data')
      Alert.alert('Error', 'Failed to load study data')
    } finally {
      setLoading(false)
    }
  }, [studyId])

  const loadFromNetwork = async () => {
    // Simulate API calls with performance tracking
    const studyResult = await networkService.request({
      url: `https://api.axisimaging.com.au/studies/${studyId}`,
      method: 'GET',
      requiresAuth: true,
      cacheResponse: true,
      cacheDuration: 5 * 60 * 1000 // 5 minutes
    })

    setStudyData(studyResult)

    // Load report if available
    if (studyResult.hasReport) {
      const reportResult = await networkService.request({
        url: `https://api.axisimaging.com.au/reports/${studyResult.reportId}`,
        method: 'GET',
        requiresAuth: true,
        cacheResponse: true
      })
      setReportData(reportResult)
    }

    // Load images with optimization
    if (studyResult.images && studyResult.images.length > 0) {
      const imageLimit = optimizations.limitNetwork ? 5 : 10
      const imagesToLoad = studyResult.images.slice(0, imageLimit)
      setImages(imagesToLoad)

      // Cache study data for offline use
      await offlineStorage.cacheStudy(studyResult, {
        includeImages: !optimizations.useLowQuality,
        quality: optimizations.useLowQuality ? 'LOW' : 'MEDIUM'
      })
      
      setCacheStatus('COMPLETE')
    }
  }

  const loadOfflineData = async () => {
    // Load from offline storage
    const offlineStudies = await offlineStorage.getOfflineStudies(studyData?.patientId || '')
    const study = offlineStudies.find(s => s.id === studyId)
    
    if (study) {
      setStudyData(study)
      setCacheStatus('COMPLETE')
      
      // Load offline report
      const offlineReport = await offlineStorage.getOfflineReport(studyId)
      if (offlineReport) {
        setReportData(offlineReport)
      }

      // Load offline images
      const offlineImages = await offlineStorage.getOfflineImages(studyId)
      setImages(offlineImages)
    } else {
      setCacheStatus('NONE')
      throw new Error('No offline data available')
    }
  }

  const onRefresh = useCallback(async () => {
    trackInteraction('refresh')
    setRefreshing(true)
    
    try {
      await loadStudyData()
    } finally {
      setRefreshing(false)
    }
  }, [loadStudyData, trackInteraction])

  const handleImagePress = useCallback((image: any, index: number) => {
    trackInteraction('image_tap', { imageIndex: index, imageId: image.id })
    
    navigation.navigate('ImageViewer', {
      images,
      initialIndex: index,
      studyId
    })
  }, [images, navigation, studyId, trackInteraction])

  const handleSharePress = useCallback(() => {
    trackInteraction('share_button')
    
    navigation.navigate('ShareScreen', {
      studyId,
      studyData
    })
  }, [navigation, studyId, studyData, trackInteraction])

  const handleDownloadPress = useCallback(async () => {
    trackInteraction('download_button')
    
    if (!studyData) return

    try {
      // Check if already cached
      if (cacheStatus === 'COMPLETE') {
        Alert.alert('Downloaded', 'This study is already available offline')
        return
      }

      // Check network conditions
      const canDownload = await networkService.checkBandwidthForDownload(50 * 1024 * 1024) // 50MB
      
      if (!canDownload.canDownload) {
        Alert.alert('Download Not Recommended', canDownload.recommendation || 'Cannot download at this time')
        return
      }

      if (canDownload.estimatedTime > 60000) {
        Alert.alert(
          'Large Download',
          `This download may take ${Math.round(canDownload.estimatedTime / 1000)} seconds. Continue?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Download', onPress: performDownload }
          ]
        )
        return
      }

      await performDownload()
    } catch (error: any) {
      trackError(error, 'download_study')
      Alert.alert('Error', 'Failed to download study')
    }
  }, [studyData, cacheStatus, trackInteraction, trackError])

  const performDownload = async () => {
    try {
      await measureAsync('download_study', async () => {
        const result = await offlineStorage.cacheStudy(studyData, {
          includeImages: true,
          quality: optimizations.useLowQuality ? 'LOW' : 'HIGH'
        })

        if (result.success) {
          setCacheStatus('COMPLETE')
          Alert.alert('Success', 'Study downloaded for offline viewing')
        } else {
          throw new Error('Download failed')
        }
      })
    } catch (error) {
      throw error
    }
  }

  // Memoized components for performance
  const renderHeader = useMemo(() => (
    <View style={styles.header}>
      <TouchableOpacity 
        onPress={() => {
          trackInteraction('back_button')
          navigation.goBack()
        }}
      >
        <Ionicons name="arrow-back" size={24} color="#374151" />
      </TouchableOpacity>
      
      <Text style={styles.title}>Study Details</Text>
      
      <View style={styles.headerActions}>
        {isOffline && (
          <Ionicons 
            name="cloud-offline" 
            size={20} 
            color="#dc2626" 
            style={{ marginRight: 8 }} 
          />
        )}
        
        <TouchableOpacity onPress={handleSharePress}>
          <Ionicons name="share" size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>
    </View>
  ), [isOffline, trackInteraction, navigation, handleSharePress])

  const renderStudyInfo = useMemo(() => {
    if (!studyData) return null

    return (
      <View style={styles.studyCard}>
        <View style={styles.studyHeader}>
          <Text style={styles.studyTitle}>
            {studyData.modality} - {studyData.studyDescription}
          </Text>
          
          <View style={styles.cacheIndicator}>
            <Ionicons 
              name={cacheStatus === 'COMPLETE' ? 'download' : 'cloud-download'} 
              size={16} 
              color={cacheStatus === 'COMPLETE' ? '#059669' : '#6b7280'} 
            />
            <Text style={[
              styles.cacheText,
              { color: cacheStatus === 'COMPLETE' ? '#059669' : '#6b7280' }
            ]}>
              {cacheStatus === 'COMPLETE' ? 'Offline' : 'Online Only'}
            </Text>
          </View>
        </View>
        
        <Text style={styles.studyDate}>
          {new Date(studyData.studyDate).toLocaleDateString()}
        </Text>
        
        <Text style={styles.patientInfo}>
          {studyData.patient?.firstName} {studyData.patient?.lastName}
        </Text>

        {cacheStatus !== 'COMPLETE' && (
          <TouchableOpacity 
            style={styles.downloadButton}
            onPress={handleDownloadPress}
          >
            <Ionicons name="download" size={16} color="#2563eb" />
            <Text style={styles.downloadText}>Download for Offline</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }, [studyData, cacheStatus, handleDownloadPress])

  const renderImages = useMemo(() => {
    if (images.length === 0) return null

    const imageSize = optimizations.useLowQuality ? 150 : 200
    
    return (
      <View style={styles.imagesSection}>
        <Text style={styles.sectionTitle}>Images ({images.length})</Text>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.imagesContainer}
        >
          {images.map((image, index) => (
            <TouchableOpacity
              key={image.id || index}
              style={[styles.imageContainer, { width: imageSize, height: imageSize }]}
              onPress={() => handleImagePress(image, index)}
            >
              <OptimizedImage
                source={{ uri: image.isOffline ? image.localPath : image.url }}
                style={styles.thumbnailImage}
                quality={optimizations.useLowQuality ? 'LOW' : 'MEDIUM'}
                progressive={!optimizations.reduceAnimations}
                onError={(error) => trackError(error, `image_load_${index}`)}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    )
  }, [images, optimizations, handleImagePress, trackError])

  const renderReport = useMemo(() => {
    if (!reportData) return null

    return (
      <View style={styles.reportSection}>
        <Text style={styles.sectionTitle}>Report</Text>
        
        <View style={styles.reportCard}>
          {reportData.impression && (
            <View style={styles.reportField}>
              <Text style={styles.reportLabel}>Impression:</Text>
              <Text style={styles.reportText}>{reportData.impression}</Text>
            </View>
          )}
          
          {reportData.findings && (
            <View style={styles.reportField}>
              <Text style={styles.reportLabel}>Findings:</Text>
              <Text style={styles.reportText}>{reportData.findings}</Text>
            </View>
          )}
          
          {reportData.recommendations && (
            <View style={styles.reportField}>
              <Text style={styles.reportLabel}>Recommendations:</Text>
              <Text style={styles.reportText}>{reportData.recommendations}</Text>
            </View>
          )}
        </View>
      </View>
    )
  }, [reportData])

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>
            {isOffline ? 'Loading offline data...' : 'Loading study...'}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!studyData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#dc2626" />
          <Text style={styles.errorText}>Study not found</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              trackInteraction('retry_button')
              loadStudyData()
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader}
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            enabled={!isOffline}
          />
        }
      >
        {renderStudyInfo}
        {renderImages}
        {renderReport}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    marginVertical: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  studyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  studyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  studyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginRight: 12,
  },
  cacheIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cacheText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  studyDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  patientInfo: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 16,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  downloadText: {
    marginLeft: 8,
    color: '#2563eb',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  imagesSection: {
    marginBottom: 24,
  },
  imagesContainer: {
    paddingRight: 20,
  },
  imageContainer: {
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  reportSection: {
    marginBottom: 24,
  },
  reportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reportField: {
    marginBottom: 16,
  },
  reportLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  reportText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 24,
  },
})