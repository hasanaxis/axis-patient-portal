import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { AppointmentService } from '../../services/AppointmentService'

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

interface AppointmentsState {
  appointments: Appointment[]
  availableSlots: string[]
  isLoading: boolean
  error: string | null
}

const initialState: AppointmentsState = {
  appointments: [],
  availableSlots: [],
  isLoading: false,
  error: null,
}

export const fetchAppointments = createAsyncThunk(
  'appointments/fetchAppointments',
  async () => {
    const appointments = await AppointmentService.getAppointments()
    return appointments
  }
)

export const fetchAvailableSlots = createAsyncThunk(
  'appointments/fetchAvailableSlots',
  async ({ date, type }: { date: string; type: string }) => {
    const slots = await AppointmentService.getAvailableSlots(date, type)
    return slots
  }
)

export const bookAppointment = createAsyncThunk(
  'appointments/bookAppointment',
  async (appointmentData: Omit<Appointment, 'id' | 'status'>) => {
    const appointment = await AppointmentService.bookAppointment(appointmentData)
    return appointment
  }
)

export const cancelAppointment = createAsyncThunk(
  'appointments/cancelAppointment',
  async (appointmentId: string) => {
    await AppointmentService.cancelAppointment(appointmentId)
    return appointmentId
  }
)

export const appointmentsSlice = createSlice({
  name: 'appointments',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    clearAvailableSlots: (state) => {
      state.availableSlots = []
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAppointments.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchAppointments.fulfilled, (state, action) => {
        state.isLoading = false
        state.appointments = action.payload
      })
      .addCase(fetchAppointments.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Failed to fetch appointments'
      })
      .addCase(fetchAvailableSlots.fulfilled, (state, action) => {
        state.availableSlots = action.payload
      })
      .addCase(bookAppointment.fulfilled, (state, action) => {
        state.appointments.push(action.payload)
      })
      .addCase(cancelAppointment.fulfilled, (state, action) => {
        state.appointments = state.appointments.filter(
          appointment => appointment.id !== action.payload
        )
      })
  },
})

export const { clearError, clearAvailableSlots } = appointmentsSlice.actions