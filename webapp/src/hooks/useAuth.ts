import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

// Auth types
interface AuthResponse {
  success: boolean;
  message: string;
  patient?: {
    id: string;
    patientNumber: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
    authToken: string;
  };
  token?: string;
}

interface VerificationResponse {
  success: boolean;
  message: string;
  token?: string;
}

interface RegisterData {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  medicareNumber?: string;
  email?: string;
  verificationToken: string;
}

// Send SMS verification code
export const useSendVerification = () => {
  return useMutation({
    mutationFn: async (phoneNumber: string): Promise<AuthResponse> => {
      return await apiClient.post<AuthResponse>('/auth/send-verification', { phoneNumber });
    }
  });
};

// Verify SMS code
export const useVerifyCode = () => {
  return useMutation({
    mutationFn: async ({ phoneNumber, code }: { phoneNumber: string; code: string }): Promise<VerificationResponse> => {
      return await apiClient.post<VerificationResponse>('/auth/verify-code', { phoneNumber, code });
    }
  });
};

// Register new patient
export const useRegister = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (registerData: RegisterData): Promise<AuthResponse> => {
      return await apiClient.post<AuthResponse>('/auth/register', registerData);
    },
    onSuccess: (data) => {
      if (data.success && data.patient?.authToken) {
        // Store auth token
        localStorage.setItem('auth_token', data.patient.authToken);
        // Store user data
        localStorage.setItem('user_data', JSON.stringify(data.patient));
        // Invalidate queries to refetch with new auth
        queryClient.invalidateQueries();
      }
    }
  });
};

// Login with phone number
export const useLogin = () => {
  return useMutation({
    mutationFn: async (phoneNumber: string): Promise<AuthResponse> => {
      return await apiClient.post<AuthResponse>('/auth/login', { phoneNumber });
    }
  });
};

// Complete login with verification code
export const useCompleteLogin = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ phoneNumber, code }: { phoneNumber: string; code: string }): Promise<AuthResponse> => {
      return await apiClient.post<AuthResponse>('/auth/complete-login', { phoneNumber, code });
    },
    onSuccess: (data) => {
      if (data.success && data.patient?.authToken) {
        // Store auth token
        localStorage.setItem('auth_token', data.patient.authToken);
        // Store user data
        localStorage.setItem('user_data', JSON.stringify(data.patient));
        // Invalidate queries to refetch with new auth
        queryClient.invalidateQueries();
      }
    }
  });
};

// Logout
export const useLogout = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (): Promise<AuthResponse> => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No auth token found');
      }
      return await apiClient.post<AuthResponse>('/auth/logout', {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    },
    onSuccess: () => {
      // Clear stored data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      // Clear query cache
      queryClient.clear();
    }
  });
};

// Check if user is authenticated
export const useIsAuthenticated = (): boolean => {
  const token = localStorage.getItem('auth_token');
  const userData = localStorage.getItem('user_data');
  return !!(token && userData);
};

// Get current user data
export const useCurrentUser = () => {
  const userData = localStorage.getItem('user_data');
  return userData ? JSON.parse(userData) : null;
};