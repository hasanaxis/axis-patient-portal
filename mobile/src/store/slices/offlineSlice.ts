import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface OfflineData {
  scans: any[]
  reports: any[]
  images: { [key: string]: string }
  lastSync: string | null
}

interface OfflineState {
  isOnline: boolean
  data: OfflineData
  syncInProgress: boolean
  pendingActions: any[]
}

const initialState: OfflineState = {
  isOnline: true,
  data: {
    scans: [],
    reports: [],
    images: {},
    lastSync: null,
  },
  syncInProgress: false,
  pendingActions: [],
}

export const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload
    },
    
    cacheScans: (state, action: PayloadAction<any[]>) => {
      state.data.scans = action.payload
      AsyncStorage.setItem('cached_scans', JSON.stringify(action.payload))
    },
    
    cacheReports: (state, action: PayloadAction<any[]>) => {
      state.data.reports = action.payload
      AsyncStorage.setItem('cached_reports', JSON.stringify(action.payload))
    },
    
    cacheImage: (state, action: PayloadAction<{ id: string; data: string }>) => {
      state.data.images[action.payload.id] = action.payload.data
      AsyncStorage.setItem(`cached_image_${action.payload.id}`, action.payload.data)
    },
    
    addPendingAction: (state, action: PayloadAction<any>) => {
      state.pendingActions.push(action.payload)
      AsyncStorage.setItem('pending_actions', JSON.stringify(state.pendingActions))
    },
    
    removePendingAction: (state, action: PayloadAction<string>) => {
      state.pendingActions = state.pendingActions.filter(
        item => item.id !== action.payload
      )
      AsyncStorage.setItem('pending_actions', JSON.stringify(state.pendingActions))
    },
    
    setSyncInProgress: (state, action: PayloadAction<boolean>) => {
      state.syncInProgress = action.payload
    },
    
    updateLastSync: (state) => {
      const now = new Date().toISOString()
      state.data.lastSync = now
      AsyncStorage.setItem('last_sync', now)
    },
    
    loadOfflineData: (state, action: PayloadAction<OfflineData>) => {
      state.data = action.payload
    },
  },
})

export const {
  setOnlineStatus,
  cacheScans,
  cacheReports,
  cacheImage,
  addPendingAction,
  removePendingAction,
  setSyncInProgress,
  updateLastSync,
  loadOfflineData,
} = offlineSlice.actions