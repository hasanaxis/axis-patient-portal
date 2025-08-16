// Core application types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  dateOfBirth: Date
  phoneNumber?: string
  address?: Address
  emergencyContact?: EmergencyContact
  preferences?: UserPreferences
  createdAt: Date
  updatedAt: Date
}

export interface Address {
  street: string
  suburb: string
  state: string
  postcode: string
  country: string
}

export interface EmergencyContact {
  name: string
  relationship: string
  phoneNumber: string
}

export interface UserPreferences {
  notifications: {
    email: boolean
    sms: boolean
    push: boolean
  }
  language: string
  timezone: string
}

// Medical types
export interface Patient extends User {
  medicareNumber?: string
  ihi?: string // Individual Healthcare Identifier
  dva?: string // Department of Veterans Affairs number
  allergies?: string[]
  medications?: string[]
  medicalHistory?: string[]
  referringPhysician?: string
  profilePicture?: string
}

export interface Study {
  id: string
  patientId: string
  studyInstanceUID: string
  accessionNumber: string
  studyDate: Date
  studyTime?: string
  studyDescription: string
  modality: Modality
  bodyPartExamined: string
  requestedProcedure: string
  priority: Priority
  status: StudyStatus
  numberOfSeries: number
  numberOfInstances: number
  referringPhysician?: string
  performingPhysician?: string
  institutionName?: string
  institutionAddress?: string
  stationName?: string
  createdAt: Date
  updatedAt: Date
  report?: Report
  isViewed?: boolean
  sharedWithGP?: boolean
}

export interface Report {
  id: string
  studyId: string
  reportNumber: string
  radiologistId: string
  radiologist?: Radiologist
  clinicalHistory?: string
  technique?: string
  comparison?: string
  limitations?: string
  findings: string
  impression: string
  recommendations?: string
  priority: Priority
  status: ReportStatus
  isAmended: boolean
  isCritical: boolean
  criticalFinding?: string
  dictatedAt?: Date
  verifiedAt?: Date
  approvedAt?: Date
  sentToReferrerAt?: Date
  qaRequired: boolean
  qaCompletedBy?: string
  qaCompletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface Radiologist {
  id: string
  firstName: string
  lastName: string
  title: string
  qualifications: string[]
  specializations: string[]
  ahpraNumber: string
  email?: string
  phoneNumber?: string
}

export interface Appointment {
  id: string
  patientId: string
  appointmentDate: Date
  appointmentTime: string
  duration: number // minutes
  type: AppointmentType
  modality: Modality
  bodyPart: string
  preparation?: string
  instructions?: string
  location: FacilityLocation
  status: AppointmentStatus
  referringPhysician?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface FacilityLocation {
  id: string
  name: string
  address: Address
  phoneNumber: string
  email?: string
  operatingHours: OperatingHours
  services: string[]
  parkingInfo?: string
  publicTransport?: string
}

export interface OperatingHours {
  monday?: TimeSlot
  tuesday?: TimeSlot
  wednesday?: TimeSlot
  thursday?: TimeSlot
  friday?: TimeSlot
  saturday?: TimeSlot
  sunday?: TimeSlot
}

export interface TimeSlot {
  open: string // HH:mm format
  close: string // HH:mm format
  closed?: boolean
}

// Enums
export enum Modality {
  CT = 'CT',
  MR = 'MR',
  DX = 'DX', // Digital Radiography
  US = 'US', // Ultrasound
  MG = 'MG', // Mammography
  NM = 'NM', // Nuclear Medicine
  PT = 'PT', // PET
  RF = 'RF', // Fluoroscopy
  XA = 'XA', // X-Ray Angiography
  OT = 'OT', // Other
}

export enum Priority {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  STAT = 'STAT',
  EMERGENCY = 'EMERGENCY',
}

export enum StudyStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  RESCHEDULED = 'RESCHEDULED',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  FINAL = 'FINAL',
  AMENDED = 'AMENDED',
  ADDENDUM = 'ADDENDUM',
}

export enum AppointmentType {
  DIAGNOSTIC = 'DIAGNOSTIC',
  SCREENING = 'SCREENING',
  FOLLOW_UP = 'FOLLOW_UP',
  CONSULTATION = 'CONSULTATION',
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  RESCHEDULED = 'RESCHEDULED',
}

// UI Types
export interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

export interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  current?: boolean
  badge?: string | number
}

export interface LoadingState {
  isLoading: boolean
  error?: string | null
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface FilterOptions {
  dateFrom?: Date
  dateTo?: Date
  modality?: Modality[]
  status?: StudyStatus[] | ReportStatus[]
  priority?: Priority[]
  searchTerm?: string
}

// API Response types
export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
  errors?: string[]
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationInfo
}