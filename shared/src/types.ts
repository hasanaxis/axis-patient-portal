export enum UserRole {
  PATIENT = 'PATIENT',
  RADIOLOGIST = 'RADIOLOGIST',
  ADMIN = 'ADMIN',
  REFERRING_GP = 'REFERRING_GP',
  TECHNOLOGIST = 'TECHNOLOGIST',
  CLERK = 'CLERK',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  RESCHEDULED = 'RESCHEDULED'
}

export enum ScanType {
  XRAY = 'XRAY',
  CT = 'CT',
  MRI = 'MRI',
  ULTRASOUND = 'ULTRASOUND',
  DEXA = 'DEXA',
  MAMMOGRAPHY = 'MAMMOGRAPHY',
  FLUOROSCOPY = 'FLUOROSCOPY',
  NUCLEAR_MEDICINE = 'NUCLEAR_MEDICINE',
  PET_CT = 'PET_CT',
  ANGIOGRAPHY = 'ANGIOGRAPHY',
  CARDIAC_CT = 'CARDIAC_CT',
  CARDIAC_MRI = 'CARDIAC_MRI'
}

export enum Modality {
  CR = 'CR',
  CT = 'CT',
  DX = 'DX',
  MG = 'MG',
  MR = 'MR',
  NM = 'NM',
  PT = 'PT',
  RF = 'RF',
  SC = 'SC',
  US = 'US',
  XA = 'XA',
  XR = 'XR'
}

export enum Priority {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  STAT = 'STAT',
  EMERGENCY = 'EMERGENCY'
}

export enum StudyStatus {
  SCHEDULED = 'SCHEDULED',
  ARRIVED = 'ARRIVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  PRELIMINARY = 'PRELIMINARY',
  FINAL = 'FINAL',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED'
}

export enum StudyViewStatus {
  NEW = 'NEW',
  VIEWED = 'VIEWED',
  REVIEWED = 'REVIEWED'
}

export enum ReportStatus {
  PENDING = 'PENDING',
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  PRELIMINARY = 'PRELIMINARY',
  FINAL = 'FINAL',
  ADDENDUM = 'ADDENDUM',
  CORRECTED = 'CORRECTED',
  SENT = 'SENT',
  ARCHIVED = 'ARCHIVED'
}

export enum ShareStatus {
  NOT_SHARED = 'NOT_SHARED',
  SHARED_WITH_GP = 'SHARED_WITH_GP',
  SHARED_WITH_PATIENT = 'SHARED_WITH_PATIENT',
  SHARED_WITH_SPECIALIST = 'SHARED_WITH_SPECIALIST'
}

export interface User {
  id: string;
  phoneNumber: string;
  email?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  medicareNumber?: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface Patient {
  id: string;
  userId: string;
  user?: User;
  address?: string;
  emergencyContact?: string;
  allergies?: string;
  medicalHistory?: any;
  referringGpId?: string;
  referringGp?: ReferringGP;
}

export interface ReferringGP {
  id: string;
  firstName: string;
  lastName: string;
  practiceName: string;
  providerNumber: string;
  phoneNumber: string;
  email: string;
  address: string;
}

export interface Study {
  id: string;
  patientId: string;
  patient?: Patient;
  studyInstanceUID: string;
  studyId?: string;
  accessionNumber: string;
  studyDate: Date;
  studyTime?: string;
  studyDescription?: string;
  modality: Modality;
  bodyPartExamined?: string;
  studyComments?: string;
  clinicalHistory?: string;
  requestedProcedure: string;
  priority: Priority;
  status: StudyStatus;
  viewStatus?: StudyViewStatus;
  shareStatus?: ShareStatus;
  performingPhysician?: string;
  referringPhysician?: string;
  operatorName?: string;
  technologistId?: string;
  technologist?: Technologist;
  radiologistId?: string;
  radiologist?: Radiologist;
  stationName?: string;
  manufacturerModel?: string;
  institutionName?: string;
  institutionAddress?: string;
  numberOfSeries: number;
  numberOfInstances: number;
  studySize?: bigint | number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
  series?: Series[];
  report?: Report;
  appointmentId?: string;
  appointment?: Appointment;
  lastViewedAt?: Date;
  lastViewedBy?: string;
  sharedWithGpAt?: Date;
  criticalFindings?: boolean;
}

export interface Series {
  id: string;
  studyId: string;
  study?: Study;
  seriesInstanceUID: string;
  seriesNumber?: number;
  seriesDate?: Date;
  seriesTime?: string;
  seriesDescription?: string;
  modality: Modality;
  bodyPartExamined?: string;
  protocolName?: string;
  seriesComments?: string;
  sliceThickness?: number;
  pixelSpacing?: string;
  imageOrientation?: string;
  imagePosition?: string;
  acquisitionMatrix?: string;
  kvp?: number;
  exposureTime?: number;
  xrayTubeCurrent?: number;
  contrastAgent?: string;
  scanOptions?: string;
  numberOfInstances: number;
  seriesSize?: bigint | number;
  createdAt: Date;
  updatedAt: Date;
  images?: DICOMImage[];
}

export interface DICOMImage {
  id: string;
  seriesId: string;
  series?: Series;
  sopInstanceUID: string;
  sopClassUID?: string;
  instanceNumber?: number;
  acquisitionDate?: Date;
  acquisitionTime?: string;
  imageComments?: string;
  rows?: number;
  columns?: number;
  bitsAllocated?: number;
  bitsStored?: number;
  pixelRepresentation?: number;
  photometricInterpretation?: string;
  windowCenter?: string;
  windowWidth?: string;
  windowCenterWidthExplanation?: string;
  pixelSpacing?: string;
  sliceLocation?: number;
  sliceThickness?: number;
  imagePosition?: string;
  imageOrientation?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  jpegUrl?: string;
  fileSize?: bigint | number;
  transferSyntax?: string;
  imageQuality?: string;
  lossy: boolean;
  lossyMethod?: string;
  metadata?: DICOMMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface DICOMMetadata {
  PatientPosition?: string;
  ViewPosition?: string;
  ImageLaterality?: string;
  DistanceSourceToDetector?: number;
  DistanceSourceToPatient?: number;
  MagneticFieldStrength?: number;
  RepetitionTime?: number;
  EchoTime?: number;
  FlipAngle?: number;
  SlicePosition?: number;
  KVP?: number;
  DataCollectionDiameter?: number;
  ReconstructionDiameter?: number;
  ConvolutionKernel?: string;
  UltrasoundColorDataPresent?: number;
  MechanicalIndex?: number;
  ThermalIndex?: number;
  TransducerFrequency?: number;
  CompressionForce?: number;
  BreastThickness?: number;
  AnatomicRegion?: string;
  [key: string]: any;
}

export interface StudyFilter {
  patientId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  modality?: Modality[];
  bodyPart?: string[];
  status?: StudyStatus[];
  viewStatus?: StudyViewStatus[];
  priority?: Priority[];
  hasReport?: boolean;
  criticalFindings?: boolean;
  searchTerm?: string;
  sortBy?: 'studyDate' | 'modality' | 'status' | 'priority';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface StudySummary {
  totalStudies: number;
  newStudies: number;
  viewedStudies: number;
  studiesWithReports: number;
  criticalStudies: number;
  modalityBreakdown: { modality: Modality; count: number }[];
  recentStudies: Study[];
}

export interface Report {
  id: string;
  studyId: string;
  study?: Study;
  patientId: string;
  patient?: Patient;
  radiologistId: string;
  radiologist?: Radiologist;
  clinicalHistory?: string;
  technique?: string;
  findings: string;
  impression: string;
  recommendations?: string;
  comparison?: string;
  limitations?: string;
  reportNumber: string;
  templateUsed?: string;
  priority: Priority;
  status: ReportStatus;
  isAmended: boolean;
  amendmentReason?: string;
  previousVersionId?: string;
  isCritical: boolean;
  criticalFinding?: string;
  criticalNotifiedAt?: Date;
  criticalNotifiedBy?: string;
  criticalNotifiedTo?: string;
  dictatedAt?: Date;
  transcribedAt?: Date;
  verifiedAt?: Date;
  approvedAt?: Date;
  sentToReferrerAt?: Date;
  pdfUrl?: string;
  xmlUrl?: string;
  audioUrl?: string;
  wordCount?: number;
  complexityScore?: number;
  qaRequired: boolean;
  qaCompletedAt?: Date;
  qaCompletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Radiologist {
  id: string;
  userId: string;
  user?: User;
  employeeNumber: string;
  licenseNumber: string;
  specializations: string[];
  qualifications?: string[];
  yearsExperience?: number;
  subspecialties?: string[];
  consultingRooms?: string[];
  workDays?: string[];
  startTime?: string;
  endTime?: string;
  isActive: boolean;
  joinedDate?: Date;
}

export interface Technologist {
  id: string;
  userId: string;
  user?: User;
  employeeNumber: string;
  licenseNumber?: string;
  modalities: string[];
  certifications?: string[];
  workDays?: string[];
  startTime?: string;
  endTime?: string;
  isActive: boolean;
  joinedDate?: Date;
}

export interface Appointment {
  id: string;
  patientId: string;
  patient?: Patient;
  scanType: ScanType;
  scheduledAt: Date;
  duration: number;
  status: AppointmentStatus;
  referralId?: string;
  referral?: Referral;
  notes?: string;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Referral {
  id: string;
  referringGpId: string;
  referringGp?: ReferringGP;
  patientName: string;
  patientPhone: string;
  scanType: ScanType;
  clinicalHistory: string;
  urgency: string;
  referralDate: Date;
  expiryDate: Date;
  documentUrl?: string;
  isUsed: boolean;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  user?: User;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: any;
  sentAt: Date;
  readAt?: Date;
}

export interface Session {
  id: string;
  userId: string;
  user?: User;
  token: string;
  deviceInfo?: any;
  ipAddress?: string;
  expiresAt: Date;
  createdAt: Date;
  lastActivityAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}