import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { ScanService } from '../../services/ScanService'

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

interface ScansState {
  scans: Scan[]
  selectedScan: Scan | null
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  lastUpdated: string | null
}

const initialState: ScansState = {
  scans: [],
  selectedScan: null,
  isLoading: false,
  isRefreshing: false,
  error: null,
  lastUpdated: null,
}

export const fetchScans = createAsyncThunk(
  'scans/fetchScans',
  async (refresh: boolean = false) => {
    const scans = await ScanService.getScans(refresh)
    return scans
  }
)

export const fetchScanDetails = createAsyncThunk(
  'scans/fetchScanDetails',
  async (scanId: string) => {
    const scan = await ScanService.getScanDetails(scanId)
    return scan
  }
)

export const downloadScan = createAsyncThunk(
  'scans/downloadScan',
  async (scanId: string) => {
    await ScanService.downloadScan(scanId)
    return scanId
  }
)

export const scansSlice = createSlice({
  name: 'scans',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setSelectedScan: (state, action: PayloadAction<Scan | null>) => {
      state.selectedScan = action.payload
    },
    markScanAsDownloaded: (state, action: PayloadAction<string>) => {
      const scan = state.scans.find(s => s.id === action.payload)
      if (scan) {
        scan.isDownloaded = true
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchScans.pending, (state, action) => {
        if (action.meta.arg) {
          state.isRefreshing = true
        } else {
          state.isLoading = true
        }
        state.error = null
      })
      .addCase(fetchScans.fulfilled, (state, action) => {
        state.isLoading = false
        state.isRefreshing = false
        state.scans = action.payload
        state.lastUpdated = new Date().toISOString()
      })
      .addCase(fetchScans.rejected, (state, action) => {
        state.isLoading = false
        state.isRefreshing = false
        state.error = action.error.message || 'Failed to fetch scans'
      })
      .addCase(fetchScanDetails.fulfilled, (state, action) => {
        state.selectedScan = action.payload
      })
      .addCase(downloadScan.fulfilled, (state, action) => {
        const scan = state.scans.find(s => s.id === action.payload)
        if (scan) {
          scan.isDownloaded = true
        }
      })
  },
})

export const { clearError, setSelectedScan, markScanAsDownloaded } = scansSlice.actions