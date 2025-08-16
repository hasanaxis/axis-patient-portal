// Mock data for development and demonstration
import { 
  Patient, 
  Study, 
  Report, 
  Appointment, 
  FacilityLocation,
  Modality, 
  Priority, 
  StudyStatus, 
  ReportStatus,
  AppointmentStatus,
  AppointmentType 
} from '@/types'

// Mock patient data
export const mockPatient: Patient = {
  id: '1',
  email: 'arwa.may@email.com',
  firstName: 'Arwa',
  lastName: 'May',
  dateOfBirth: new Date('1985-03-15'),
  phoneNumber: '0412 345 678',
  medicareNumber: '2234567890',
  ihi: '8003608833357361',
  address: {
    street: '123 Collins Street',
    suburb: 'Melbourne',
    state: 'VIC',
    postcode: '3000',
    country: 'Australia'
  },
  emergencyContact: {
    name: 'John Johnson',
    relationship: 'Spouse',
    phoneNumber: '0423 456 789'
  },
  allergies: ['Iodine contrast'],
  medications: ['Paracetamol as needed'],
  medicalHistory: ['Hypertension'],
  referringPhysician: 'Dr. Michael Chen',
  preferences: {
    notifications: {
      email: true,
      sms: true,
      push: true
    },
    language: 'en-AU',
    timezone: 'Australia/Melbourne'
  },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15')
}

// Mock studies data
export const mockStudies: Study[] = [
  {
    id: '1',
    patientId: '1',
    studyInstanceUID: '1.2.840.10008.5.1.4.1.1.1.1',
    accessionNumber: 'ACC20240115001',
    studyDate: new Date('2024-01-15T09:30:00'),
    studyDescription: 'CHEST PA AND LATERAL',
    modality: Modality.DX,
    bodyPartExamined: 'CHEST',
    requestedProcedure: 'Chest X-Ray PA and Lateral',
    priority: Priority.ROUTINE,
    status: StudyStatus.COMPLETED,
    numberOfSeries: 2,
    numberOfInstances: 2,
    referringPhysician: 'Dr. Michael Chen',
    performingPhysician: 'Dr. Lisa Wong',
    institutionName: 'Axis Imaging Mickleham',
    institutionAddress: 'Level 1, 107/21 Cityside Drive, Mickleham, VIC 3064',
    createdAt: new Date('2024-01-15T09:30:00'),
    updatedAt: new Date('2024-01-15T11:20:00'),
    isViewed: true,
    sharedWithGP: true
  },
  {
    id: '2',
    patientId: '1',
    studyInstanceUID: '1.2.840.10008.5.1.4.1.1.4.1',
    accessionNumber: 'ACC20240110001',
    studyDate: new Date('2024-01-10T14:15:00'),
    studyDescription: 'MRI LUMBAR SPINE',
    modality: Modality.MR,
    bodyPartExamined: 'LUMBAR SPINE',
    requestedProcedure: 'MRI Lumbar Spine without contrast',
    priority: Priority.URGENT,
    status: StudyStatus.COMPLETED,
    numberOfSeries: 5,
    numberOfInstances: 125,
    referringPhysician: 'Dr. Sarah Williams',
    performingPhysician: 'Dr. James Thompson',
    institutionName: 'Axis Imaging Mickleham',
    institutionAddress: 'Level 1, 107/21 Cityside Drive, Mickleham, VIC 3064',
    createdAt: new Date('2024-01-10T14:15:00'),
    updatedAt: new Date('2024-01-10T16:20:00'),
    isViewed: false,
    sharedWithGP: false
  },
  {
    id: '3',
    patientId: '1',
    studyInstanceUID: '1.2.840.10008.5.1.4.1.1.2.1',
    accessionNumber: 'ACC20240105001',
    studyDate: new Date('2024-01-05T10:00:00'),
    studyDescription: 'CT ABDOMEN AND PELVIS WITH CONTRAST',
    modality: Modality.CT,
    bodyPartExamined: 'ABDOMEN AND PELVIS',
    requestedProcedure: 'CT Abdomen and Pelvis with IV contrast',
    priority: Priority.ROUTINE,
    status: StudyStatus.COMPLETED,
    numberOfSeries: 3,
    numberOfInstances: 45,
    referringPhysician: 'Dr. Michael Chen',
    performingPhysician: 'Dr. Emma Davis',
    institutionName: 'Axis Imaging Mickleham',
    institutionAddress: 'Level 1, 107/21 Cityside Drive, Mickleham, VIC 3064',
    createdAt: new Date('2024-01-05T10:00:00'),
    updatedAt: new Date('2024-01-05T11:30:00'),
    isViewed: true,
    sharedWithGP: true
  }
]

// Mock reports data
export const mockReports: Report[] = [
  {
    id: '1',
    studyId: '1',
    reportNumber: 'RPT20240115001',
    radiologistId: 'rad1',
    clinicalHistory: 'Annual health check. No respiratory symptoms.',
    technique: 'Frontal and lateral chest radiographs were obtained.',
    findings: 'The heart size and configuration are within normal limits. The mediastinal contours are unremarkable. Both lungs are well expanded and clear with no focal consolidation, pleural effusion or pneumothorax. The bony thorax appears intact.',
    impression: 'Normal chest radiograph.',
    recommendations: 'No further imaging required at this time.',
    priority: Priority.ROUTINE,
    status: ReportStatus.FINAL,
    isAmended: false,
    isCritical: false,
    dictatedAt: new Date('2024-01-15T10:30:00'),
    verifiedAt: new Date('2024-01-15T11:00:00'),
    approvedAt: new Date('2024-01-15T11:15:00'),
    sentToReferrerAt: new Date('2024-01-15T11:20:00'),
    qaRequired: false,
    createdAt: new Date('2024-01-15T10:30:00'),
    updatedAt: new Date('2024-01-15T11:20:00')
  },
  {
    id: '2',
    studyId: '2',
    reportNumber: 'RPT20240110001',
    radiologistId: 'rad2',
    clinicalHistory: 'Chronic lower back pain with left leg radiation.',
    technique: 'Sagittal and axial T1 and T2-weighted images of the lumbar spine were obtained without contrast.',
    findings: 'There is good alignment of the lumbar vertebrae. At L4-L5, there is a large central disc protrusion extending into the spinal canal. The disc material compresses the thecal sac and causes bilateral lateral recess stenosis. The neural foramina are severely compromised bilaterally. At L5-S1, there is mild disc bulging without significant canal compromise.',
    impression: 'L4-L5 large central disc protrusion with significant spinal canal stenosis and bilateral neural foraminal compromise.',
    recommendations: 'Neurosurgical consultation recommended for assessment and possible surgical intervention.',
    priority: Priority.URGENT,
    status: ReportStatus.FINAL,
    isAmended: false,
    isCritical: false,
    dictatedAt: new Date('2024-01-10T15:30:00'),
    verifiedAt: new Date('2024-01-10T16:00:00'),
    approvedAt: new Date('2024-01-10T16:15:00'),
    sentToReferrerAt: new Date('2024-01-10T16:20:00'),
    qaRequired: false,
    createdAt: new Date('2024-01-10T15:30:00'),
    updatedAt: new Date('2024-01-10T16:20:00')
  }
]

// Mock appointments data
export const mockAppointments: Appointment[] = [
  {
    id: '1',
    patientId: '1',
    appointmentDate: new Date('2024-02-15T10:00:00'),
    appointmentTime: '10:00',
    duration: 30,
    type: AppointmentType.DIAGNOSTIC,
    modality: Modality.US,
    bodyPart: 'Abdomen',
    preparation: 'Fast for 6 hours before appointment. Drink water 1 hour before.',
    instructions: 'Please arrive 15 minutes early for check-in.',
    location: {
      id: '1',
      name: 'Axis Imaging Mickleham',
      address: {
        street: 'Level 1, 107/21 Cityside Drive',
        suburb: 'Mickleham',
        state: 'VIC',
        postcode: '3064',
        country: 'Australia'
      },
      phoneNumber: '(03) 8746 4200',
      email: 'info@axisimaging.com.au',
      operatingHours: {
        monday: { open: '07:00', close: '19:00' },
        tuesday: { open: '07:00', close: '19:00' },
        wednesday: { open: '07:00', close: '19:00' },
        thursday: { open: '07:00', close: '19:00' },
        friday: { open: '07:00', close: '19:00' },
        saturday: { open: '08:00', close: '16:00' },
        sunday: { open: '', close: '', closed: true }
      },
      services: ['X-Ray', 'CT', 'MRI', 'Ultrasound', 'Mammography'],
      parkingInfo: 'Free on-site parking available',
      publicTransport: 'Bus route 466 stops nearby'
    },
    status: AppointmentStatus.SCHEDULED,
    referringPhysician: 'Dr. Michael Chen',
    notes: 'Routine follow-up scan',
    createdAt: new Date('2024-01-20T09:00:00'),
    updatedAt: new Date('2024-01-20T09:00:00')
  }
]

// Mock facility locations
export const mockLocations: FacilityLocation[] = [
  {
    id: '1',
    name: 'Axis Imaging Mickleham',
    address: {
      street: 'Level 1, 107/21 Cityside Drive',
      suburb: 'Mickleham',
      state: 'VIC',
      postcode: '3064',
      country: 'Australia'
    },
    phoneNumber: '(03) 8746 4200',
    email: 'info@axisimaging.com.au',
    operatingHours: {
      monday: { open: '07:00', close: '19:00' },
      tuesday: { open: '07:00', close: '19:00' },
      wednesday: { open: '07:00', close: '19:00' },
      thursday: { open: '07:00', close: '19:00' },
      friday: { open: '07:00', close: '19:00' },
      saturday: { open: '08:00', close: '16:00' },
      sunday: { open: '', close: '', closed: true }
    },
    services: ['X-Ray', 'CT', 'MRI', 'Ultrasound', 'Mammography', 'Nuclear Medicine'],
    parkingInfo: 'Free on-site parking available with disabled access',
    publicTransport: 'Bus route 466 stops nearby'
  }
]

// Dashboard statistics
export const mockDashboardStats = {
  totalScans: 12,
  pendingResults: 1,
  recentScans: 3,
  upcomingAppointments: 1,
  criticalFindings: 0,
  unreadReports: 1
}