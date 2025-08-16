import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import * as SecureStore from 'expo-secure-store'
import * as LocalAuthentication from 'expo-local-authentication'
import { AuthService } from '../../services/AuthService'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  dateOfBirth: string
  medicareNumber?: string
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  biometricsEnabled: boolean
  isLoading: boolean
  error: string | null
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  biometricsEnabled: false,
  isLoading: false,
  error: null,
}

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }) => {
    const response = await AuthService.login(email, password)
    await SecureStore.setItemAsync('auth_token', response.token)
    return response
  }
)

export const loginWithBiometrics = createAsyncThunk(
  'auth/loginWithBiometrics',
  async () => {
    const isAvailable = await LocalAuthentication.hasHardwareAsync()
    if (!isAvailable) {
      throw new Error('Biometric authentication not available')
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access Axis Imaging',
      fallbackLabel: 'Use passcode',
    })

    if (!result.success) {
      throw new Error('Biometric authentication failed')
    }

    const token = await SecureStore.getItemAsync('auth_token')
    if (!token) {
      throw new Error('No stored authentication token')
    }

    const user = await AuthService.validateToken(token)
    return { token, user }
  }
)

export const logout = createAsyncThunk('auth/logout', async () => {
  await SecureStore.deleteItemAsync('auth_token')
  await AuthService.logout()
})

export const enableBiometrics = createAsyncThunk(
  'auth/enableBiometrics',
  async () => {
    const isAvailable = await LocalAuthentication.hasHardwareAsync()
    if (!isAvailable) {
      throw new Error('Biometric authentication not available')
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Enable biometric authentication for Axis Imaging',
    })

    if (!result.success) {
      throw new Error('Biometric setup failed')
    }

    await SecureStore.setItemAsync('biometrics_enabled', 'true')
    return true
  }
)

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.token = action.payload.token
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Login failed'
      })
      .addCase(loginWithBiometrics.fulfilled, (state, action) => {
        state.isAuthenticated = true
        state.user = action.payload.user
        state.token = action.payload.token
      })
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false
        state.user = null
        state.token = null
      })
      .addCase(enableBiometrics.fulfilled, (state) => {
        state.biometricsEnabled = true
      })
  },
})

export const { clearError, setUser } = authSlice.actions