import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import ApiClient from './ApiClient'

interface LoginResponse {
  token: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    dateOfBirth: string
    medicareNumber?: string
  }
}

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  dateOfBirth: string
  medicareNumber?: string
  phone: string
}

class AuthServiceClass {
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const data = await ApiClient.post<LoginResponse>('/auth/login', {
        email,
        password
      }, false) // No auth required for login
      
      // Store token securely
      if (data.token) {
        await SecureStore.setItemAsync('auth_token', data.token)
      }
      
      return data
    } catch (error) {
      throw new Error('Login failed. Please check your credentials.')
    }
  }

  async register(userData: RegisterData): Promise<{ message: string }> {
    try {
      return await ApiClient.post<{ message: string }>('/auth/register', userData, false)
    } catch (error) {
      throw new Error('Registration failed. Please try again.')
    }
  }

  async verifyOTP(email: string, otp: string): Promise<LoginResponse> {
    try {
      const data = await ApiClient.post<LoginResponse>('/auth/verify-otp', {
        email,
        otp
      }, false)
      
      // Store token securely
      if (data.token) {
        await SecureStore.setItemAsync('auth_token', data.token)
      }
      
      return data
    } catch (error) {
      throw new Error('OTP verification failed')
    }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      return await ApiClient.post<{ message: string }>('/auth/forgot-password', { email }, false)
    } catch (error) {
      throw new Error('Password reset failed')
    }
  }

  async validateToken(): Promise<LoginResponse['user']> {
    try {
      const data = await ApiClient.get<{ user: LoginResponse['user'] }>('/auth/validate')
      return data.user
    } catch (error) {
      throw new Error('Token validation failed')
    }
  }

  async logout(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('auth_token')
      await AsyncStorage.removeItem('user_preferences')
      await AsyncStorage.removeItem('cached_scans')
      await AsyncStorage.removeItem('cached_reports')
    } catch (error) {
      console.error('Logout cleanup failed:', error)
    }
  }

  async getStoredToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('auth_token')
    } catch (error) {
      return null
    }
  }
}

export const AuthService = new AuthServiceClass()