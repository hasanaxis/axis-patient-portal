import * as SecureStore from 'expo-secure-store'
import config from '../config/environment'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  requiresAuth?: boolean
}

class ApiClientClass {
  private baseURL = config.apiBaseUrl

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      requiresAuth = true
    } = options

    try {
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers
      }

      // Add authentication token if required
      if (requiresAuth) {
        const token = await SecureStore.getItemAsync('auth_token')
        if (token) {
          requestHeaders['Authorization'] = `Bearer ${token}`
        } else {
          throw new Error('No authentication token available')
        }
      }

      const requestConfig: RequestInit = {
        method,
        headers: requestHeaders,
        timeout: config.requestTimeout,
      }

      if (body && method !== 'GET') {
        requestConfig.body = JSON.stringify(body)
      }

      if (config.enableLogging) {
        console.log(`API Request: ${method} ${this.baseURL}${endpoint}`, {
          headers: requestHeaders,
          body: body ? JSON.stringify(body, null, 2) : undefined
        })
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, requestConfig)

      if (config.enableLogging) {
        console.log(`API Response: ${response.status} ${response.statusText}`)
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Request failed with status ${response.status}`)
      }

      const data = await response.json()

      if (config.enableLogging) {
        console.log('API Response Data:', data)
      }

      return data
    } catch (error) {
      if (config.enableLogging) {
        console.error(`API Error: ${method} ${endpoint}`, error)
      }
      throw error
    }
  }

  // Convenience methods
  async get<T>(endpoint: string, requiresAuth: boolean = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', requiresAuth })
  }

  async post<T>(endpoint: string, body?: any, requiresAuth: boolean = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, requiresAuth })
  }

  async put<T>(endpoint: string, body?: any, requiresAuth: boolean = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, requiresAuth })
  }

  async delete<T>(endpoint: string, requiresAuth: boolean = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', requiresAuth })
  }

  async patch<T>(endpoint: string, body?: any, requiresAuth: boolean = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body, requiresAuth })
  }

  // Handle file uploads
  async uploadFile<T>(endpoint: string, file: any, additionalData?: Record<string, any>): Promise<T> {
    try {
      const token = await SecureStore.getItemAsync('auth_token')
      const formData = new FormData()

      // Add file
      formData.append('file', {
        uri: file.uri,
        type: file.type,
        name: file.name,
      } as any)

      // Add additional data
      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, value.toString())
        })
      }

      const headers: Record<string, string> = {
        'Content-Type': 'multipart/form-data',
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Upload failed with status ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      if (config.enableLogging) {
        console.error(`Upload Error: ${endpoint}`, error)
      }
      throw error
    }
  }
}

export const ApiClient = new ApiClientClass()
export default ApiClient