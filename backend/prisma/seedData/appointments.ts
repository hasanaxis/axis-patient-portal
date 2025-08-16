import { AppointmentStatus, ScanType, Priority } from '@prisma/client';

export interface AppointmentSeedData {
  appointmentNumber: string;
  patientNumber: string; // Links to patient
  scanType: ScanType;
  bodyPartExamined?: string;
  scheduledAt: Date;
  duration: number;
  status: AppointmentStatus;
  priority: Priority;
  referralNumber?: string; // Links to referral
  referringPhysician?: string;
  clinicalHistory?: string;
  room?: string;
  equipment?: string;
  contrastRequired: boolean;
  contrastAgent?: string;
  preparationInstructions?: string;
  interpreterRequired: boolean;
  interpreterLanguage?: string;
  wheelchairAccess: boolean;
  accompaniedByCaregiver: boolean;
  arrivedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  checkedOutAt?: Date;
  scheduledBy?: string;
  performedBy?: string;
  notes?: string;
  patientInstructions?: string;
  specialInstructions?: string;
  reminderSent: boolean;
  confirmationSent: boolean;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;
}

export const appointmentSeedData: AppointmentSeedData[] = [
  // Appointment 1: Chest X-Ray for Sarah Mitchell (COMPLETED)
  {
    appointmentNumber: 'APT20240101001',
    patientNumber: 'AXI001001',
    scanType: 'XRAY',
    bodyPartExamined: 'Chest',
    scheduledAt: new Date('2024-01-15T09:30:00'),
    duration: 30,
    status: 'COMPLETED',
    priority: 'ROUTINE',
    referralNumber: 'REF20240101001',
    referringPhysician: 'Dr. David Peterson',
    clinicalHistory: 'Annual health check, no respiratory symptoms',
    room: 'XR-ROOM-01',
    equipment: 'Philips DigitalDiagnost C90',
    contrastRequired: false,
    preparationInstructions: 'Remove all jewelry and clothing above the waist. Hospital gown will be provided.',
    interpreterRequired: false,
    wheelchairAccess: false,
    accompaniedByCaregiver: false,
    arrivedAt: new Date('2024-01-15T09:25:00'),
    startedAt: new Date('2024-01-15T09:30:00'),
    completedAt: new Date('2024-01-15T09:45:00'),
    checkedOutAt: new Date('2024-01-15T09:50:00'),
    scheduledBy: 'Reception_Staff_001',
    performedBy: 'Tech01 - Mark Stevens',
    notes: 'Patient cooperative. Good quality images obtained.',
    patientInstructions: 'Results will be available within 24 hours via patient portal.',
    reminderSent: true,
    confirmationSent: true,
  },

  // Appointment 2: MRI Lumbar Spine for James Thompson (COMPLETED)
  {
    appointmentNumber: 'APT20240102001',
    patientNumber: 'AXI001002',
    scanType: 'MRI',
    bodyPartExamined: 'Lumbar Spine',
    scheduledAt: new Date('2024-01-16T14:15:00'),
    duration: 60,
    status: 'COMPLETED',
    priority: 'ROUTINE',
    referralNumber: 'REF20240102001',
    referringPhysician: 'Dr. Sarah Johnson',
    clinicalHistory: 'Chronic lower back pain, previous L4-L5 surgery, ongoing symptoms',
    room: 'MR-ROOM-01',
    equipment: 'Siemens MAGNETOM Vida 3.0T',
    contrastRequired: false,
    preparationInstructions: 'Remove all metal objects. Complete MRI safety questionnaire. Arrive 30 minutes early.',
    interpreterRequired: false,
    wheelchairAccess: false,
    accompaniedByCaregiver: false,
    arrivedAt: new Date('2024-01-16T13:45:00'),
    startedAt: new Date('2024-01-16T14:15:00'),
    completedAt: new Date('2024-01-16T15:15:00'),
    checkedOutAt: new Date('2024-01-16T15:25:00'),
    scheduledBy: 'Reception_Staff_002',
    performedBy: 'Tech02 - Lisa Cooper',
    notes: 'Patient tolerated examination well despite chronic pain. No claustrophobia.',
    patientInstructions: 'Results typically available within 24-48 hours. Continue current pain medications as prescribed.',
    specialInstructions: 'Patient has metal implants from previous surgery - MRI compatible confirmed.',
    reminderSent: true,
    confirmationSent: true,
  },

  // Appointment 3: CT Abdomen Pelvis for Robert Wilson (COMPLETED)
  {
    appointmentNumber: 'APT20240103001',
    patientNumber: 'AXI001004',
    scanType: 'CT',
    bodyPartExamined: 'Abdomen and Pelvis',
    scheduledAt: new Date('2024-01-17T11:00:00'),
    duration: 45,
    status: 'COMPLETED',
    priority: 'ROUTINE',
    referralNumber: 'REF20240103001',
    referringPhysician: 'Dr. Michael Chen',
    clinicalHistory: 'Atrial fibrillation, checking for any abdominal pathology',
    room: 'CT-ROOM-01',
    equipment: 'GE Revolution CT 256',
    contrastRequired: true,
    contrastAgent: 'Iodinated contrast - 100ml',
    preparationInstructions: 'Fast for 4 hours prior to appointment. Drink oral contrast 1 hour before scan time. Bring list of current medications.',
    interpreterRequired: false,
    wheelchairAccess: false,
    accompaniedByCaregiver: false,
    arrivedAt: new Date('2024-01-17T10:30:00'),
    startedAt: new Date('2024-01-17T11:00:00'),
    completedAt: new Date('2024-01-17T11:35:00'),
    checkedOutAt: new Date('2024-01-17T11:45:00'),
    scheduledBy: 'Reception_Staff_003',
    performedBy: 'Tech03 - David Kim',
    notes: 'Oral contrast administered at 10:00. IV contrast given without reaction. Good study quality.',
    patientInstructions: 'Drink plenty of fluids to help eliminate contrast. Results available in 24 hours.',
    specialInstructions: 'Patient on warfarin - kidney function checked prior to contrast administration.',
    reminderSent: true,
    confirmationSent: true,
  },

  // Appointment 4: Breast Ultrasound for Jennifer Brown (COMPLETED)
  {
    appointmentNumber: 'APT20240104001',
    patientNumber: 'AXI001005',
    scanType: 'ULTRASOUND',
    bodyPartExamined: 'Breast (bilateral)',
    scheduledAt: new Date('2024-01-18T15:45:00'),
    duration: 45,
    status: 'COMPLETED',
    priority: 'ROUTINE',
    referralNumber: 'REF20240104001',
    referringPhysician: 'Dr. Emma Williams',
    clinicalHistory: 'Family history of breast cancer, routine screening',
    room: 'US-ROOM-02',
    equipment: 'Philips EPIQ Elite',
    contrastRequired: false,
    preparationInstructions: 'No special preparation required. Wear comfortable clothing that can be easily removed.',
    interpreterRequired: false,
    wheelchairAccess: false,
    accompaniedByCaregiver: false,
    arrivedAt: new Date('2024-01-18T15:30:00'),
    startedAt: new Date('2024-01-18T15:45:00'),
    completedAt: new Date('2024-01-18T16:30:00'),
    checkedOutAt: new Date('2024-01-18T16:35:00'),
    scheduledBy: 'Reception_Staff_001',
    performedBy: 'Tech04 - Sarah White',
    notes: 'Comprehensive bilateral breast ultrasound completed. Patient anxious due to family history but reassured.',
    patientInstructions: 'Normal screening results. Continue self-examination and regular screening as recommended.',
    reminderSent: true,
    confirmationSent: true,
  },

  // Appointment 5: Knee X-Ray for Lisa Anderson (COMPLETED - URGENT)
  {
    appointmentNumber: 'APT20240105001',
    patientNumber: 'AXI001007',
    scanType: 'XRAY',
    bodyPartExamined: 'Left Knee',
    scheduledAt: new Date('2024-01-19T10:20:00'),
    duration: 20,
    status: 'COMPLETED',
    priority: 'URGENT',
    referralNumber: 'REF20240105001',
    referringPhysician: 'Dr. Robert Taylor',
    clinicalHistory: 'Left knee pain after fall, rule out fracture',
    room: 'XR-ROOM-02',
    equipment: 'Siemens Ysio Max',
    contrastRequired: false,
    preparationInstructions: 'Remove clothing below the waist. Hospital gown provided.',
    interpreterRequired: false,
    wheelchairAccess: false,
    accompaniedByCaregiver: false,
    arrivedAt: new Date('2024-01-19T10:15:00'),
    startedAt: new Date('2024-01-19T10:20:00'),
    completedAt: new Date('2024-01-19T10:35:00'),
    checkedOutAt: new Date('2024-01-19T10:40:00'),
    scheduledBy: 'Reception_Staff_004',
    performedBy: 'Tech01 - Mark Stevens',
    notes: 'Urgent appointment accommodated. Patient in moderate pain but cooperative.',
    patientInstructions: 'Results will be sent to your GP immediately. Ice and elevation recommended.',
    specialInstructions: 'Urgent processing requested by referring GP.',
    reminderSent: false, // Urgent appointment
    confirmationSent: true,
  },

  // Appointment 6: Head CT for William Davis (COMPLETED - EMERGENCY)
  {
    appointmentNumber: 'APT20240106001',
    patientNumber: 'AXI001006',
    scanType: 'CT',
    bodyPartExamined: 'Head',
    scheduledAt: new Date('2024-01-20T02:15:00'),
    duration: 30,
    status: 'COMPLETED',
    priority: 'EMERGENCY',
    referringPhysician: 'Emergency Department',
    clinicalHistory: 'Fall at home, confusion, rule out intracranial bleed',
    room: 'CT-ROOM-02',
    equipment: 'Philips Brilliance 64',
    contrastRequired: false,
    preparationInstructions: 'None - emergency presentation',
    interpreterRequired: false,
    wheelchairAccess: true,
    accompaniedByCaregiver: true,
    arrivedAt: new Date('2024-01-20T02:10:00'),
    startedAt: new Date('2024-01-20T02:15:00'),
    completedAt: new Date('2024-01-20T02:30:00'),
    checkedOutAt: new Date('2024-01-20T02:35:00'),
    scheduledBy: 'Emergency_Staff',
    performedBy: 'Tech05 - Night Tech',
    notes: 'Emergency scan. Patient confused but cooperative. Family member present.',
    patientInstructions: 'Results communicated immediately to Emergency Department.',
    specialInstructions: 'STAT processing - critical findings communicated immediately.',
    reminderSent: false,
    confirmationSent: false,
  },

  // Appointment 7: Mammography for Maria Rodriguez (COMPLETED)
  {
    appointmentNumber: 'APT20240107001',
    patientNumber: 'AXI001003',
    scanType: 'MAMMOGRAPHY',
    bodyPartExamined: 'Breast (bilateral)',
    scheduledAt: new Date('2024-01-21T13:30:00'),
    duration: 30,
    status: 'COMPLETED',
    priority: 'ROUTINE',
    referralNumber: 'REF20240107001',
    referringPhysician: 'Dr. Sarah Johnson',
    clinicalHistory: 'No current breast symptoms, family history of breast cancer',
    room: 'MAMMO-ROOM-01',
    equipment: 'Hologic Selenia Dimensions 3D',
    contrastRequired: false,
    preparationInstructions: 'Do not use deodorant, powder, or lotion on the day of the exam. Schedule for first half of menstrual cycle if applicable.',
    interpreterRequired: false,
    wheelchairAccess: false,
    accompaniedByCaregiver: false,
    arrivedAt: new Date('2024-01-21T13:15:00'),
    startedAt: new Date('2024-01-21T13:30:00'),
    completedAt: new Date('2024-01-21T13:55:00'),
    checkedOutAt: new Date('2024-01-21T14:00:00'),
    scheduledBy: 'Reception_Staff_002',
    performedBy: 'Tech06 - Jenny Adams',
    notes: 'Screening mammography completed. Patient first time having mammogram - anxious but cooperative.',
    patientInstructions: 'Results will be mailed within 5 business days. Continue monthly self-examinations.',
    reminderSent: true,
    confirmationSent: true,
  },

  // Appointment 8: Abdominal Ultrasound for Antonio Giuseppe (COMPLETED)
  {
    appointmentNumber: 'APT20240108001',
    patientNumber: 'AXI001008',
    scanType: 'ULTRASOUND',
    bodyPartExamined: 'Abdomen',
    scheduledAt: new Date('2024-01-22T11:45:00'),
    duration: 45,
    status: 'COMPLETED',
    priority: 'ROUTINE',
    referralNumber: 'REF20240108001',
    referringPhysician: 'Dr. Michael Chen',
    clinicalHistory: 'Type 2 diabetes, peripheral vascular disease, check for complications',
    room: 'US-ROOM-01',
    equipment: 'GE Logiq E10',
    contrastRequired: false,
    preparationInstructions: 'Fast for 8 hours prior to examination. Water is permitted. Bring list of medications.',
    interpreterRequired: false,
    wheelchairAccess: false,
    accompaniedByCaregiver: true,
    arrivedAt: new Date('2024-01-22T11:30:00'),
    startedAt: new Date('2024-01-22T11:45:00'),
    completedAt: new Date('2024-01-22T12:30:00'),
    checkedOutAt: new Date('2024-01-22T12:40:00'),
    scheduledBy: 'Reception_Staff_001',
    performedBy: 'Tech07 - Maria Santos',
    notes: 'Patient accompanied by wife who assisted with translation. Comprehensive abdominal ultrasound completed.',
    patientInstructions: 'Resume normal diet after examination. Results available within 24-48 hours.',
    specialInstructions: 'Wife present to assist with communication - patient speaks limited English.',
    reminderSent: true,
    confirmationSent: true,
  },

  // Future Appointments (SCHEDULED, CONFIRMED)
  
  // Appointment 9: Follow-up MRI for Emily Clark (SCHEDULED)
  {
    appointmentNumber: 'APT20240115001',
    patientNumber: 'AXI001009',
    scanType: 'MRI',
    bodyPartExamined: 'Brain',
    scheduledAt: new Date('2024-08-15T10:00:00'), // Future date
    duration: 75,
    status: 'SCHEDULED',
    priority: 'ROUTINE',
    referralNumber: 'REF20240115001',
    referringPhysician: 'Dr. Emma Williams',
    clinicalHistory: 'Follow-up for previous headaches, monitor response to treatment',
    room: 'MR-ROOM-01',
    equipment: 'Siemens MAGNETOM Vida 3.0T',
    contrastRequired: true,
    contrastAgent: 'Gadolinium-based contrast',
    preparationInstructions: 'Remove all metal objects. Complete MRI safety questionnaire. Arrive 30 minutes early. Kidney function test required prior to contrast.',
    interpreterRequired: false,
    wheelchairAccess: false,
    accompaniedByCaregiver: false,
    scheduledBy: 'Reception_Staff_003',
    notes: 'Follow-up MRI with contrast to assess treatment response.',
    patientInstructions: 'Complete pre-contrast blood test 48 hours before appointment.',
    reminderSent: false,
    confirmationSent: true,
  },

  // Appointment 10: Chest CT for Mohammed Hassan (CONFIRMED)
  {
    appointmentNumber: 'APT20240116001',
    patientNumber: 'AXI001010',
    scanType: 'CT',
    bodyPartExamined: 'Chest',
    scheduledAt: new Date('2024-08-16T14:30:00'), // Future date
    duration: 30,
    status: 'CONFIRMED',
    priority: 'ROUTINE',
    referralNumber: 'REF20240116001',
    referringPhysician: 'Dr. David Peterson',
    clinicalHistory: 'Annual screening, previous smoker',
    room: 'CT-ROOM-01',
    equipment: 'GE Revolution CT 256',
    contrastRequired: false,
    preparationInstructions: 'No special preparation required. Wear comfortable clothing without metal.',
    interpreterRequired: false,
    wheelchairAccess: false,
    accompaniedByCaregiver: false,
    scheduledBy: 'Reception_Staff_004',
    notes: 'Routine chest screening CT.',
    patientInstructions: 'No fasting required. Results available within 24 hours.',
    reminderSent: true,
    confirmationSent: true,
  },

  // Appointment 11: Ultrasound for Grace Wong (CONFIRMED)
  {
    appointmentNumber: 'APT20240117001',
    patientNumber: 'AXI001011',
    scanType: 'ULTRASOUND',
    bodyPartExamined: 'Thyroid',
    scheduledAt: new Date('2024-08-17T09:15:00'), // Future date
    duration: 30,
    status: 'CONFIRMED',
    priority: 'ROUTINE',
    referralNumber: 'REF20240117001',
    referringPhysician: 'Dr. Sarah Johnson',
    clinicalHistory: 'Family history of thyroid disease, palpable nodule',
    room: 'US-ROOM-02',
    equipment: 'Philips EPIQ Elite',
    contrastRequired: false,
    preparationInstructions: 'No special preparation required. Wear clothing that allows easy access to neck area.',
    interpreterRequired: false,
    wheelchairAccess: false,
    accompaniedByCaregiver: false,
    scheduledBy: 'Reception_Staff_002',
    notes: 'Thyroid ultrasound to evaluate palpable nodule.',
    patientInstructions: 'Continue thyroid medications as normal.',
    reminderSent: true,
    confirmationSent: true,
  },

  // Appointment 12: Cardiac CT for Peter Kowalski (SCHEDULED)
  {
    appointmentNumber: 'APT20240118001',
    patientNumber: 'AXI001012',
    scanType: 'CT',
    bodyPartExamined: 'Heart',
    scheduledAt: new Date('2024-08-18T13:00:00'), // Future date
    duration: 60,
    status: 'SCHEDULED',
    priority: 'ROUTINE',
    referralNumber: 'REF20240118001',
    referringPhysician: 'Dr. Michael Chen',
    clinicalHistory: 'Post-CABG follow-up, chest pain',
    room: 'CT-ROOM-01',
    equipment: 'GE Revolution CT 256',
    contrastRequired: true,
    contrastAgent: 'Iodinated contrast',
    preparationInstructions: 'No caffeine for 24 hours. Heart rate control medication may be given. Fast for 4 hours.',
    interpreterRequired: false,
    wheelchairAccess: false,
    accompaniedByCaregiver: false,
    scheduledBy: 'Reception_Staff_001',
    notes: 'Cardiac CT angiogram to assess graft patency.',
    patientInstructions: 'Bring EpiPen due to allergy history. Heart rate needs to be <65 bpm for optimal images.',
    specialInstructions: 'Patient has severe bee sting allergy - EpiPen required on premises.',
    reminderSent: false,
    confirmationSent: false,
  },

  // Appointment 13: Cancelled appointment example
  {
    appointmentNumber: 'APT20240119001',
    patientNumber: 'AXI001005',
    scanType: 'MRI',
    bodyPartExamined: 'Pelvis',
    scheduledAt: new Date('2024-08-19T11:30:00'),
    duration: 60,
    status: 'CANCELLED',
    priority: 'ROUTINE',
    referralNumber: 'REF20240119001',
    referringPhysician: 'Dr. Emma Williams',
    clinicalHistory: 'Pelvic pain, rule out pathology',
    room: 'MR-ROOM-01',
    equipment: 'Siemens MAGNETOM Vida 3.0T',
    contrastRequired: false,
    preparationInstructions: 'Full bladder required. Complete MRI safety questionnaire.',
    interpreterRequired: false,
    wheelchairAccess: false,
    accompaniedByCaregiver: false,
    scheduledBy: 'Reception_Staff_003',
    cancelledAt: new Date('2024-08-14T15:30:00'),
    cancelledBy: 'Patient',
    cancellationReason: 'Personal reasons - requested reschedule',
    notes: 'Patient called to cancel due to work commitments.',
    reminderSent: true,
    confirmationSent: true,
  },

  // Appointment 14: Rescheduled appointment
  {
    appointmentNumber: 'APT20240120001',
    patientNumber: 'AXI001007',
    scanType: 'MRI',
    bodyPartExamined: 'Left Knee',
    scheduledAt: new Date('2024-08-20T15:45:00'),
    duration: 45,
    status: 'RESCHEDULED',
    priority: 'ROUTINE',
    referralNumber: 'REF20240120001',
    referringPhysician: 'Dr. Robert Taylor',
    clinicalHistory: 'Follow-up knee pain, previous X-ray normal',
    room: 'MR-ROOM-01',
    equipment: 'Siemens MAGNETOM Vida 3.0T',
    contrastRequired: false,
    preparationInstructions: 'Remove all metal objects. Complete MRI safety questionnaire.',
    interpreterRequired: false,
    wheelchairAccess: false,
    accompaniedByCaregiver: false,
    scheduledBy: 'Reception_Staff_001',
    notes: 'Rescheduled from earlier date due to equipment maintenance.',
    patientInstructions: 'Appointment moved from original time due to maintenance.',
    reminderSent: false,
    confirmationSent: true,
  },

  // Appointment 15: No-show example
  {
    appointmentNumber: 'APT20240121001',
    patientNumber: 'AXI001008',
    scanType: 'XRAY',
    bodyPartExamined: 'Foot',
    scheduledAt: new Date('2024-08-13T10:00:00'), // Recent past date
    duration: 20,
    status: 'NO_SHOW',
    priority: 'ROUTINE',
    referralNumber: 'REF20240121001',
    referringPhysician: 'Dr. Michael Chen',
    clinicalHistory: 'Foot pain, rule out fracture',
    room: 'XR-ROOM-01',
    equipment: 'Philips DigitalDiagnost C90',
    contrastRequired: false,
    preparationInstructions: 'Remove shoes and socks.',
    interpreterRequired: false,
    wheelchairAccess: false,
    accompaniedByCaregiver: false,
    scheduledBy: 'Reception_Staff_002',
    notes: 'Patient did not arrive for scheduled appointment. Multiple attempts to contact made.',
    reminderSent: true,
    confirmationSent: true,
  }
];

// Referral seed data to support appointments
export interface ReferralSeedData {
  referralNumber: string;
  referringGpProviderNumber: string; // Links to referring GP
  patientName: string;
  patientDob: Date;
  patientPhone: string;
  patientMedicare?: string;
  patientAddress?: string;
  scanType: ScanType;
  bodyPartExamined?: string;
  clinicalHistory: string;
  clinicalIndication?: string;
  previousImaging?: string;
  currentMedications?: string;
  relevantHistory?: string;
  priority: Priority;
  urgency: Priority;
  urgentReason?: string;
  medicareEligible: boolean;
  itemNumbers: string[];
  bulkBilled: boolean;
  referralDate: Date;
  expiryDate: Date;
  validUntilDate?: Date;
  documentUrl?: string;
  originalDocumentName?: string;
  isUsed: boolean;
  usedAt?: Date;
  isExpired: boolean;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
}

export const referralSeedData: ReferralSeedData[] = [
  {
    referralNumber: 'REF20240101001',
    referringGpProviderNumber: '123456AU',
    patientName: 'Sarah Jane Mitchell',
    patientDob: new Date('1985-03-15'),
    patientPhone: '+61412345001',
    patientMedicare: '2428123456',
    patientAddress: '42 Collins Street, Mickleham VIC 3064',
    scanType: 'XRAY',
    bodyPartExamined: 'Chest',
    clinicalHistory: 'Annual health check, no respiratory symptoms',
    clinicalIndication: 'Routine screening',
    currentMedications: 'Metformin, Amlodipine',
    priority: 'ROUTINE',
    urgency: Priority.ROUTINE,
    medicareEligible: true,
    itemNumbers: ['58503'],
    bulkBilled: true,
    referralDate: new Date('2024-01-10'),
    expiryDate: new Date('2024-07-10'),
    isUsed: true,
    usedAt: new Date('2024-01-15T09:30:00'),
    isExpired: false,
    isVerified: true,
    verifiedBy: 'Reception_Staff_001',
    verifiedAt: new Date('2024-01-15T09:00:00'),
  },
  
  {
    referralNumber: 'REF20240102001',
    referringGpProviderNumber: '234567AU',
    patientName: 'James Thompson',
    patientDob: new Date('1978-11-22'),
    patientPhone: '+61412345003',
    patientMedicare: '2428123457',
    scanType: 'MRI',
    bodyPartExamined: 'Lumbar Spine',
    clinicalHistory: 'Chronic lower back pain, previous L4-L5 surgery, ongoing symptoms',
    clinicalIndication: 'Post-surgical assessment, recurrent symptoms',
    previousImaging: 'Post-operative MRI 2020',
    currentMedications: 'Paracetamol PRN',
    relevantHistory: 'L4-L5 discectomy 2020, work-related injury',
    priority: 'ROUTINE',
    urgency: Priority.ROUTINE,
    medicareEligible: true,
    itemNumbers: ['63560'],
    bulkBilled: false,
    referralDate: new Date('2024-01-12'),
    expiryDate: new Date('2024-07-12'),
    isUsed: true,
    usedAt: new Date('2024-01-16T14:15:00'),
    isExpired: false,
    isVerified: true,
    verifiedBy: 'Reception_Staff_002',
    verifiedAt: new Date('2024-01-16T13:30:00'),
  },

  {
    referralNumber: 'REF20240103001',
    referringGpProviderNumber: '345678AU',
    patientName: 'Robert Wilson',
    patientDob: new Date('1965-01-30'),
    patientPhone: '+61412345007',
    patientMedicare: '2428123459',
    scanType: 'CT',
    bodyPartExamined: 'Abdomen and Pelvis',
    clinicalHistory: 'Atrial fibrillation, checking for any abdominal pathology',
    clinicalIndication: 'Routine surveillance, exclude pathology',
    currentMedications: 'Warfarin, Digoxin',
    priority: 'ROUTINE',
    urgency: Priority.ROUTINE,
    medicareEligible: true,
    itemNumbers: ['56001'],
    bulkBilled: true,
    referralDate: new Date('2024-01-14'),
    expiryDate: new Date('2024-07-14'),
    isUsed: true,
    usedAt: new Date('2024-01-17T11:00:00'),
    isExpired: false,
    isVerified: true,
    verifiedBy: 'Reception_Staff_003',
    verifiedAt: new Date('2024-01-17T10:30:00'),
  },

  {
    referralNumber: 'REF20240104001',
    referringGpProviderNumber: '456789AU',
    patientName: 'Jennifer Brown',
    patientDob: new Date('1988-09-12'),
    patientPhone: '+61412345009',
    patientMedicare: '2428123460',
    scanType: 'ULTRASOUND',
    bodyPartExamined: 'Breast',
    clinicalHistory: 'Family history of breast cancer, routine screening',
    clinicalIndication: 'Family history, screening',
    relevantHistory: 'Sister with breast cancer, mother with depression',
    priority: 'ROUTINE',
    urgency: Priority.ROUTINE,
    medicareEligible: true,
    itemNumbers: ['55603'],
    bulkBilled: false,
    referralDate: new Date('2024-01-16'),
    expiryDate: new Date('2024-07-16'),
    isUsed: true,
    usedAt: new Date('2024-01-18T15:45:00'),
    isExpired: false,
    isVerified: true,
    verifiedBy: 'Reception_Staff_001',
    verifiedAt: new Date('2024-01-18T15:30:00'),
  },

  {
    referralNumber: 'REF20240105001',
    referringGpProviderNumber: '567890AU',
    patientName: 'Lisa Anderson',
    patientDob: new Date('1995-05-20'),
    patientPhone: '+61412345013',
    patientMedicare: '2428123462',
    scanType: 'XRAY',
    bodyPartExamined: 'Left Knee',
    clinicalHistory: 'Left knee pain after fall, rule out fracture',
    clinicalIndication: 'Trauma, exclude fracture',
    priority: 'URGENT',
    urgency: Priority.URGENT,
    urgentReason: 'Acute trauma, significant pain',
    medicareEligible: true,
    itemNumbers: ['58703'],
    bulkBilled: true,
    referralDate: new Date('2024-01-19'),
    expiryDate: new Date('2024-07-19'),
    isUsed: true,
    usedAt: new Date('2024-01-19T10:20:00'),
    isExpired: false,
    isVerified: true,
    verifiedBy: 'Reception_Staff_004',
    verifiedAt: new Date('2024-01-19T10:10:00'),
  }
];

// Additional seed data for different appointment scenarios
export const appointmentStatusExamples = {
  SCHEDULED: 'Appointment booked but not yet confirmed by patient',
  CONFIRMED: 'Patient has confirmed attendance',
  IN_PROGRESS: 'Patient has arrived and examination is underway',
  COMPLETED: 'Examination completed successfully',
  CANCELLED: 'Appointment cancelled by patient or facility',
  NO_SHOW: 'Patient did not attend scheduled appointment',
  RESCHEDULED: 'Appointment moved to different date/time'
};

export const preparationInstructions = {
  CT_CONTRAST: 'Fast for 4 hours. Drink oral contrast 1 hour before scan. Bring medication list.',
  MRI_GENERAL: 'Remove all metal objects. Complete safety questionnaire. Arrive 30 minutes early.',
  MRI_CONTRAST: 'Remove all metal objects. Complete safety questionnaire. Kidney function test required.',
  ULTRASOUND_ABDOMINAL: 'Fast for 8 hours. Water permitted. Bring medication list.',
  ULTRASOUND_PELVIC: 'Full bladder required. Drink 1 liter water 1 hour before appointment.',
  XRAY_GENERAL: 'Remove clothing and jewelry from examination area. Hospital gown provided.',
  MAMMOGRAPHY: 'No deodorant, powder, or lotion. Schedule in first half of menstrual cycle.',
  NUCLEAR_MEDICINE: 'Specific preparation will be provided based on examination type.'
};