import { AuthService } from './AuthService'

interface Appointment {
  id: string
  patientId: string
  dateTime: string
  duration: number
  type: string
  location: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
  preparationInstructions?: string
}

interface ScanType {
  value: string
  label: string
  description: string
  duration: number
  requiresReferral: boolean
  requiresFasting: boolean
  fastingHours?: number
  contrastAvailable: boolean
  wheelchairAccessible: boolean
  pregnancyRestrictions?: string
  ageRestrictions?: string
  availableDays: string[]
  availableTimeSlots: string[]
  bulkBillingAvailable: boolean
  privatePrice?: number
}

interface BodyPart {
  value: string
  label: string
  description?: string
  specificInstructions?: string
  contrastRequired: boolean
}

interface PreparationInstructions {
  general: string
  specific?: string
  arrival: string
  aftercare: string
}

interface CostInfo {
  medicareItemNumbers: string[]
  estimatedCost: number
  bulkBillingAvailable: boolean
  privatePrice?: number
}

interface BookingRequest {
  firstName: string
  lastName: string
  dateOfBirth: string
  phoneNumber: string
  email?: string
  medicareNumber?: string
  scanType: string
  bodyPartExamined: string
  preferredDate?: string
  preferredTime?: 'morning' | 'afternoon' | 'evening'
  specialRequirements?: string
  notes?: string
  hasReferral: boolean
  referralSource?: string
  contrastRequired?: boolean
  contrastAllergies?: string
  currentMedications?: string
  allergies?: string
  wheelchairAccess?: boolean
  interpreterRequired?: boolean
  interpreterLanguage?: string
  accompaniedByCaregiver?: boolean
  termsAccepted: boolean
  privacyAccepted: boolean
  marketingConsent?: boolean
}

interface BookingResult {
  success: boolean
  bookingReference?: string
  appointmentRequestId?: string
  message: string
  errors?: string[]
  requiresReferral?: boolean
  estimatedProcessingTime?: string
}

interface BookingStatus {
  bookingReference: string
  status: string
  scanType: string
  bodyPartExamined: string
  submittedAt: string
  lastUpdated: string
  patientName: string
  statusHistory: Array<{
    status: string
    changedAt: string
    reason?: string
  }>
}

class AppointmentServiceClass {
  private baseURL = __DEV__ ? 'http://localhost:3001/api' : 'https://api.axisimaging.com.au/api'

  async getAppointments(): Promise<Appointment[]> {
    try {
      const token = await AuthService.getStoredToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch(`${this.baseURL}/appointments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch appointments')
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching appointments:', error)
      throw error
    }
  }

  async getAvailableSlots(date: string, type: string): Promise<string[]> {
    try {
      const token = await AuthService.getStoredToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch(
        `${this.baseURL}/appointments/available-slots?date=${date}&type=${type}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch available slots')
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching available slots:', error)
      throw error
    }
  }

  async bookAppointment(
    appointmentData: Omit<Appointment, 'id' | 'status'>
  ): Promise<Appointment> {
    try {
      const token = await AuthService.getStoredToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch(`${this.baseURL}/appointments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData),
      })

      if (!response.ok) {
        throw new Error('Failed to book appointment')
      }

      return await response.json()
    } catch (error) {
      console.error('Error booking appointment:', error)
      throw error
    }
  }

  async cancelAppointment(appointmentId: string): Promise<void> {
    try {
      const token = await AuthService.getStoredToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch(`${this.baseURL}/appointments/${appointmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to cancel appointment')
      }
    } catch (error) {
      console.error('Error canceling appointment:', error)
      throw error
    }
  }

  // New booking endpoints

  async getScanTypes(): Promise<ScanType[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/booking/scan-types`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch scan types')
      }

      const data = await response.json()
      return data.scanTypes
    } catch (error) {
      console.error('Error fetching scan types:', error)
      throw error
    }
  }

  async getBodyParts(scanType: string): Promise<BodyPart[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/booking/body-parts/${scanType}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch body parts')
      }

      const data = await response.json()
      return data.bodyParts
    } catch (error) {
      console.error('Error fetching body parts:', error)
      throw error
    }
  }

  async getPreparationInstructions(scanType: string, bodyPart?: string): Promise<PreparationInstructions> {
    try {
      const url = bodyPart 
        ? `${this.baseURL}/api/booking/preparation/${scanType}?bodyPart=${encodeURIComponent(bodyPart)}`
        : `${this.baseURL}/api/booking/preparation/${scanType}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to fetch preparation instructions')
      }

      const data = await response.json()
      return data.instructions
    } catch (error) {
      console.error('Error fetching preparation instructions:', error)
      throw error
    }
  }

  async getEstimatedCost(scanType: string, bulkBilled: boolean = true): Promise<CostInfo> {
    try {
      const response = await fetch(
        `${this.baseURL}/api/booking/cost/${scanType}?bulkBilled=${bulkBilled}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch cost information')
      }

      const data = await response.json()
      return data.costInfo
    } catch (error) {
      console.error('Error fetching cost information:', error)
      throw error
    }
  }

  async getAvailableTimeSlots(scanType: string, date: string): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/api/booking/time-slots/${scanType}/${date}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch available time slots')
      }

      const data = await response.json()
      return data.timeSlots
    } catch (error) {
      console.error('Error fetching available time slots:', error)
      throw error
    }
  }

  async submitBookingRequest(booking: BookingRequest, referralFile?: any): Promise<BookingResult> {
    try {
      const formData = new FormData()
      
      // Add booking data
      Object.entries(booking).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString())
        }
      })

      // Add referral file if provided
      if (referralFile) {
        formData.append('referral', {
          uri: referralFile.uri,
          type: referralFile.type,
          name: referralFile.name,
        } as any)
      }

      const response = await fetch(`${this.baseURL}/api/booking/submit`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to submit booking')
      }

      return await response.json()
    } catch (error) {
      console.error('Error submitting booking:', error)
      throw error
    }
  }

  async getBookingStatus(bookingReference: string): Promise<BookingStatus> {
    try {
      const response = await fetch(`${this.baseURL}/api/booking/status/${bookingReference}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch booking status')
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching booking status:', error)
      throw error
    }
  }

  async uploadReferral(bookingReference: string, referralFile: any): Promise<{ success: boolean; referralUrl: string }> {
    try {
      const formData = new FormData()
      formData.append('referral', {
        uri: referralFile.uri,
        type: referralFile.type,
        name: referralFile.name,
      } as any)

      const response = await fetch(`${this.baseURL}/api/booking/upload-referral/${bookingReference}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to upload referral')
      }

      return await response.json()
    } catch (error) {
      console.error('Error uploading referral:', error)
      throw error
    }
  }
}

export const AppointmentService = new AppointmentServiceClass()