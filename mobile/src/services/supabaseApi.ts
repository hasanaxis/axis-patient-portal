import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://yageczmzfuuhlklctojc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZ2Vjem16ZnV1aGxrbGN0b2pjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0MjU5OTgsImV4cCI6MjA1MDAwMTk5OH0.MfZS3-Qo9Cz5WKjDRhD5e3SFLxMEW0zJxD7rQ9xLGvE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// API Base URL for Edge Functions
const API_BASE_URL = 'https://yageczmzfuuhlklctojc.supabase.co/functions/v1/api';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  createdAt: string;
}

export interface Study {
  id: string;
  patientId: string;
  studyDate: string;
  modality: string;
  bodyPart: string;
  description: string;
  status: 'pending' | 'completed' | 'reviewed';
  reportId?: string;
  thumbnailUrl?: string;
  isNew?: boolean;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  authToken?: string;
  patient?: Patient;
}

export interface DashboardData {
  patient: Patient;
  studies: Study[];
  stats: {
    totalScans: number;
    pendingResults: number;
    recentScans: number;
    upcomingAppointments: number;
  };
}

class SupabaseApiService {
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add auth token if available
    const authToken = await this.getStoredAuthToken();
    if (authToken) {
      defaultHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  private async getStoredAuthToken(): Promise<string | null> {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      return await AsyncStorage.getItem('authToken');
    } catch {
      return null;
    }
  }

  private async storeAuthToken(token: string): Promise<void> {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem('authToken', token);
    } catch (error) {
      console.error('Failed to store auth token:', error);
    }
  }

  private async removeAuthToken(): Promise<void> {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.removeItem('authToken');
    } catch (error) {
      console.error('Failed to remove auth token:', error);
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.makeRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.authToken) {
      await this.storeAuthToken(response.authToken);
    }

    return response;
  }

  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
    dateOfBirth: string;
    invitationToken?: string;
  }): Promise<AuthResponse> {
    const response = await this.makeRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.success && response.authToken) {
      await this.storeAuthToken(response.authToken);
    }

    return response;
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    return await this.makeRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async logout(): Promise<void> {
    await this.removeAuthToken();
  }

  // Dashboard
  async getDashboardData(): Promise<DashboardData> {
    return await this.makeRequest<DashboardData>('/dashboard');
  }

  // Studies
  async getStudies(): Promise<Study[]> {
    return await this.makeRequest<Study[]>('/studies');
  }

  async getStudy(studyId: string): Promise<Study> {
    return await this.makeRequest<Study>(`/studies/${studyId}`);
  }

  // Profile
  async getProfile(): Promise<Patient> {
    return await this.makeRequest<Patient>('/patients/profile');
  }

  async updateProfile(data: Partial<Patient>): Promise<Patient> {
    return await this.makeRequest<Patient>('/patients/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return await this.makeRequest('/health');
  }

  // Check authentication status
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getStoredAuthToken();
    if (!token) return false;

    try {
      await this.getProfile();
      return true;
    } catch {
      await this.removeAuthToken();
      return false;
    }
  }
}

export const apiService = new SupabaseApiService();
export default apiService;