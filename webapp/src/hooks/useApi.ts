// React Query hooks for API calls
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { 
  mockPatient, 
  mockStudies, 
  mockReports, 
  mockAppointments, 
  mockLocations,
  mockDashboardStats 
} from '@/api/mock-data'
import type { 
  Patient, 
  Study, 
  Report, 
  Appointment, 
  FacilityLocation,
  FilterOptions,
  PaginatedResponse 
} from '@/types'

// Query keys for React Query
export const queryKeys = {
  patient: ['patient'],
  studies: ['studies'],
  study: (id: string) => ['study', id],
  reports: ['reports'],
  report: (id: string) => ['report', id],
  appointments: ['appointments'],
  appointment: (id: string) => ['appointment', id],
  locations: ['locations'],
  dashboard: ['dashboard'],
} as const

// Patient hooks
export const usePatient = () => {
  return useQuery({
    queryKey: queryKeys.patient,
    queryFn: async (): Promise<Patient> => {
      try {
        return await apiClient.get<Patient>('/patients/profile')
      } catch (error) {
        console.warn('API call failed, using mock data:', error)
        
        // Check localStorage for saved profile data
        const savedProfile = localStorage.getItem('userProfile')
        if (savedProfile) {
          const parsedProfile = JSON.parse(savedProfile)
          // Merge with mock data to ensure all fields are present
          Object.assign(mockPatient, parsedProfile)
        }
        
        // Fallback to mock data if API fails
        return mockPatient
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useUpdatePatient = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (patient: Partial<Patient>): Promise<Patient> => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Update the mock patient data to persist changes
      Object.assign(mockPatient, patient)
      
      // Also save to localStorage for persistence across sessions
      localStorage.setItem('userProfile', JSON.stringify(mockPatient))
      
      return mockPatient
    },
    onSuccess: (updatedPatient) => {
      // Update the cache directly with the new data
      queryClient.setQueryData(queryKeys.patient, updatedPatient)
      queryClient.invalidateQueries({ queryKey: queryKeys.patient })
    },
  })
}

// Studies hooks
export const useStudies = (filters?: FilterOptions) => {
  return useQuery({
    queryKey: [...queryKeys.studies, filters],
    queryFn: async (): Promise<Study[]> => {
      try {
        const studies = await apiClient.get<Study[]>('/studies', filters)
        return studies.sort((a, b) => 
          new Date(b.studyDate).getTime() - new Date(a.studyDate).getTime()
        )
      } catch (error) {
        console.warn('API call failed, using mock data:', error)
        // Fallback to mock data with client-side filtering
        let filteredStudies = [...mockStudies]
        
        if (filters?.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase()
          filteredStudies = filteredStudies.filter(study =>
            study.studyDescription.toLowerCase().includes(searchLower) ||
            study.bodyPartExamined.toLowerCase().includes(searchLower) ||
            study.accessionNumber.toLowerCase().includes(searchLower)
          )
        }
        
        if (filters?.modality?.length) {
          filteredStudies = filteredStudies.filter(study =>
            filters.modality!.includes(study.modality)
          )
        }
        
        if (filters?.status?.length) {
          filteredStudies = filteredStudies.filter(study =>
            filters.status!.includes(study.status as any)
          )
        }
        
        if (filters?.dateFrom) {
          filteredStudies = filteredStudies.filter(study =>
            new Date(study.studyDate) >= filters.dateFrom!
          )
        }
        
        if (filters?.dateTo) {
          filteredStudies = filteredStudies.filter(study =>
            new Date(study.studyDate) <= filters.dateTo!
          )
        }
        
        return filteredStudies.sort((a, b) => 
          new Date(b.studyDate).getTime() - new Date(a.studyDate).getTime()
        )
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export const useStudy = (id: string) => {
  return useQuery({
    queryKey: queryKeys.study(id),
    queryFn: async (): Promise<Study | undefined> => {
      try {
        return await apiClient.get<Study>(`/studies/${id}`)
      } catch (error) {
        console.warn('API call failed, using mock data:', error)
        return mockStudies.find(study => study.id === id)
      }
    },
    enabled: !!id,
  })
}

// Reports hooks
export const useReports = (filters?: FilterOptions) => {
  return useQuery({
    queryKey: [...queryKeys.reports, filters],
    queryFn: async (): Promise<Report[]> => {
      await new Promise(resolve => setTimeout(resolve, 600))
      
      let filteredReports = [...mockReports]
      
      if (filters?.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase()
        filteredReports = filteredReports.filter(report =>
          report.findings.toLowerCase().includes(searchLower) ||
          report.impression.toLowerCase().includes(searchLower) ||
          report.reportNumber.toLowerCase().includes(searchLower)
        )
      }
      
      return filteredReports.sort((a, b) => 
        new Date(b.approvedAt || b.createdAt).getTime() - 
        new Date(a.approvedAt || a.createdAt).getTime()
      )
    },
    staleTime: 2 * 60 * 1000,
  })
}

export const useReport = (id: string) => {
  return useQuery({
    queryKey: queryKeys.report(id),
    queryFn: async (): Promise<Report | undefined> => {
      await new Promise(resolve => setTimeout(resolve, 500))
      return mockReports.find(report => report.id === id)
    },
    enabled: !!id,
  })
}

// Appointments hooks
export const useAppointments = () => {
  return useQuery({
    queryKey: queryKeys.appointments,
    queryFn: async (): Promise<Appointment[]> => {
      await new Promise(resolve => setTimeout(resolve, 600))
      return mockAppointments.sort((a, b) => 
        new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
      )
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

export const useCreateAppointment = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Appointment> => {
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const newAppointment: Appointment = {
        ...appointment,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      return newAppointment
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments })
    },
  })
}

export const useCancelAppointment = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (appointmentId: string): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      // Simulate cancellation
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments })
    },
  })
}

// Locations hooks
export const useLocations = () => {
  return useQuery({
    queryKey: queryKeys.locations,
    queryFn: async (): Promise<FacilityLocation[]> => {
      await new Promise(resolve => setTimeout(resolve, 300))
      return mockLocations
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - locations don't change often
  })
}

// Dashboard hooks
export const useDashboard = () => {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      try {
        return await apiClient.get('/dashboard')
      } catch (error) {
        console.warn('API call failed, using mock data:', error)
        return {
          stats: mockDashboardStats,
          recentStudies: mockStudies.slice(0, 3),
          upcomingAppointments: mockAppointments.slice(0, 2),
          pendingReports: mockReports.filter(r => r.status === 'PENDING').slice(0, 2)
        }
      }
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

// Mark study as viewed
export const useMarkStudyViewed = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (studyId: string): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 500))
      // Simulate marking as viewed
    },
    onSuccess: (_, studyId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.study(studyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.studies })
    },
  })
}

// Share with GP
export const useShareWithGP = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (studyId: string): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      // Simulate sharing with GP
    },
    onSuccess: (_, studyId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.study(studyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.studies })
    },
  })
}