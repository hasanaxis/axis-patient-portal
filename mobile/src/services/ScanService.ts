import AsyncStorage from '@react-native-async-storage/async-storage'
import * as FileSystem from 'expo-file-system'
import { AuthService } from './AuthService'

interface Scan {
  id: string
  studyInstanceUID: string
  patientId: string
  studyDate: string
  studyTime: string
  studyDescription: string
  modality: string
  accessionNumber: string
  referringPhysician: string
  numberOfImages: number
  status: 'pending' | 'completed' | 'reported'
  reportAvailable: boolean
  thumbnailUrl?: string
  isDownloaded: boolean
}

class ScanServiceClass {
  private baseURL = __DEV__ ? 'http://localhost:3001/api' : 'https://api.axisimaging.com.au/api'
  private cacheKey = 'cached_scans'

  async getScans(refresh: boolean = false): Promise<Scan[]> {
    try {
      if (!refresh) {
        // Try to get from cache first
        const cached = await AsyncStorage.getItem(this.cacheKey)
        if (cached) {
          return JSON.parse(cached)
        }
      }

      const token = await AuthService.getStoredToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch(`${this.baseURL}/studies`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch scans')
      }

      const scans = await response.json()
      
      // Cache the results
      await AsyncStorage.setItem(this.cacheKey, JSON.stringify(scans))
      
      return scans
    } catch (error) {
      console.error('Error fetching scans:', error)
      // Fall back to cache if available
      const cached = await AsyncStorage.getItem(this.cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }
      throw error
    }
  }

  async getScanDetails(scanId: string): Promise<Scan> {
    try {
      const token = await AuthService.getStoredToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch(`${this.baseURL}/studies/${scanId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch scan details')
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching scan details:', error)
      throw error
    }
  }

  async downloadScan(scanId: string): Promise<void> {
    try {
      const token = await AuthService.getStoredToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch(`${this.baseURL}/studies/${scanId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to download scan')
      }

      const blob = await response.blob()
      const fileUri = `${FileSystem.documentDirectory}scans/${scanId}.zip`
      
      // Ensure directory exists
      await FileSystem.makeDirectoryAsync(
        `${FileSystem.documentDirectory}scans/`,
        { intermediates: true }
      )

      // Save file
      const reader = new FileReader()
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1]
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        })
      }
      reader.readAsDataURL(blob)

      // Update cache to mark as downloaded
      const cached = await AsyncStorage.getItem(this.cacheKey)
      if (cached) {
        const scans = JSON.parse(cached)
        const scanIndex = scans.findIndex((s: Scan) => s.id === scanId)
        if (scanIndex !== -1) {
          scans[scanIndex].isDownloaded = true
          await AsyncStorage.setItem(this.cacheKey, JSON.stringify(scans))
        }
      }
    } catch (error) {
      console.error('Error downloading scan:', error)
      throw error
    }
  }

  async getOfflineScans(): Promise<Scan[]> {
    try {
      const cached = await AsyncStorage.getItem(this.cacheKey)
      if (!cached) {
        return []
      }
      
      const scans = JSON.parse(cached)
      return scans.filter((scan: Scan) => scan.isDownloaded)
    } catch (error) {
      console.error('Error getting offline scans:', error)
      return []
    }
  }
}

export const ScanService = new ScanServiceClass()