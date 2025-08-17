// React Query hooks for API calls
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
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
      return await apiClient.get<Patient>('/patients/profile')
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useUpdatePatient = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (patient: Partial<Patient>): Promise<Patient> => {
      return await apiClient.put<Patient>('/patients/profile', patient)
    },
    onSuccess: (updatedPatient) => {
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
      const studies = await apiClient.get<Study[]>('/studies', filters)
      return studies.sort((a, b) => 
        new Date(b.studyDate).getTime() - new Date(a.studyDate).getTime()
      )
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export const useStudy = (id: string) => {
  return useQuery({
    queryKey: queryKeys.study(id),
    queryFn: async (): Promise<Study | undefined> => {
      return await apiClient.get<Study>(`/studies/${id}`)
    },
    enabled: !!id,
  })
}

// Reports hooks
export const useReports = (filters?: FilterOptions) => {
  return useQuery({
    queryKey: [...queryKeys.reports, filters],
    queryFn: async (): Promise<Report[]> => {
      const reports = await apiClient.get<Report[]>('/reports', filters)
      return reports.sort((a, b) => 
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
      return await apiClient.get<Report>(`/reports/${id}`)
    },
    enabled: !!id,
  })
}

// Appointments hooks
export const useAppointments = () => {
  return useQuery({
    queryKey: queryKeys.appointments,
    queryFn: async (): Promise<Appointment[]> => {
      const appointments = await apiClient.get<Appointment[]>('/appointments')
      return appointments.sort((a, b) => 
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
      return await apiClient.post<Appointment>('/appointments', appointment)
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
      await apiClient.delete(`/appointments/${appointmentId}`)
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
      return await apiClient.get<FacilityLocation[]>('/locations')
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - locations don't change often
  })
}

// Dashboard hooks
export const useDashboard = () => {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      return await apiClient.get('/dashboard')
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

// Mark study as viewed
export const useMarkStudyViewed = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (studyId: string): Promise<void> => {
      await apiClient.post(`/studies/${studyId}/mark-viewed`)
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
      await apiClient.post(`/studies/${studyId}/share-gp`)
    },
    onSuccess: (_, studyId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.study(studyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.studies })
    },
  })
}