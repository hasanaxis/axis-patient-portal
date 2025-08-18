import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import apiService, { Patient } from '../services/supabaseApi';

interface AuthContextType {
  isAuthenticated: boolean;
  patient: Patient | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  dateOfBirth: string;
  invitationToken?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authenticated = await apiService.isAuthenticated();
      if (authenticated) {
        const profile = await apiService.getProfile();
        setPatient(profile);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setPatient(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login(email, password);
      if (response.success && response.patient) {
        setPatient(response.patient);
        setIsAuthenticated(true);
        return { success: true };
      } else {
        return { success: false, message: response.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Login failed' };
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await apiService.register(data);
      if (response.success && response.patient) {
        setPatient(response.patient);
        setIsAuthenticated(true);
        return { success: true };
      } else {
        return { success: false, message: response.message || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Registration failed' };
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
      setIsAuthenticated(false);
      setPatient(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    patient,
    login,
    register,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};