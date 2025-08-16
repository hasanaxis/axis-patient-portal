export const APP_NAME = 'Axis Imaging Patient Portal';
export const COMPANY_NAME = 'Axis Imaging';
export const CLINIC_ADDRESS = 'Mickleham, Victoria, Australia';

export const API_VERSION = 'v1';
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';

export const TOKEN_EXPIRY = {
  ACCESS: 15 * 60 * 1000, // 15 minutes
  REFRESH: 7 * 24 * 60 * 60 * 1000, // 7 days
  VERIFICATION: 10 * 60 * 1000, // 10 minutes
  INVITATION: 72 * 60 * 60 * 1000 // 72 hours
};

export const SMS_TEMPLATES = {
  INVITATION: `Welcome to ${COMPANY_NAME}! Your scan results are ready to view. Register now: {{link}}`,
  VERIFICATION: `Your ${APP_NAME} verification code is: {{code}}. Valid for 10 minutes.`,
  REPORT_READY: `Your radiology report from ${COMPANY_NAME} is ready to view. Log in to your patient portal to access it.`,
  APPOINTMENT_REMINDER: `Reminder: You have a {{scanType}} appointment at ${COMPANY_NAME} on {{date}} at {{time}}.`,
  APPOINTMENT_CONFIRMED: `Your {{scanType}} appointment at ${COMPANY_NAME} has been confirmed for {{date}} at {{time}}.`
};

export const SCAN_TYPE_LABELS = {
  XRAY: 'X-Ray',
  CT: 'CT Scan',
  MRI: 'MRI',
  ULTRASOUND: 'Ultrasound',
  DEXA: 'DEXA Scan',
  MAMMOGRAPHY: 'Mammography'
};

export const APPOINTMENT_DURATIONS = {
  XRAY: 15,
  CT: 30,
  MRI: 45,
  ULTRASOUND: 30,
  DEXA: 20,
  MAMMOGRAPHY: 30
};

export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  INVALID_TOKEN: 'INVALID_TOKEN',
  EXPIRED_TOKEN: 'EXPIRED_TOKEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  PHONE_NOT_VERIFIED: 'PHONE_NOT_VERIFIED'
};

export const SUPPORTED_IMAGE_FORMATS = [
  'image/jpeg',
  'image/png',
  'image/dicom',
  'application/dicom'
];

export const MAX_FILE_SIZES = {
  IMAGE: 50 * 1024 * 1024, // 50MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  REPORT: 5 * 1024 * 1024 // 5MB
};

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100
};

export const RATE_LIMITS = {
  LOGIN_ATTEMPTS: 5,
  SMS_PER_HOUR: 3,
  API_CALLS_PER_MINUTE: 60
};

export const REGEX_PATTERNS = {
  PHONE_AU: /^(\+61|0)[2-478][\d]{8}$/,
  MEDICARE: /^[\d]{10}[\d]?$/,
  PROVIDER_NUMBER: /^[\d]{6}[A-Z]{2}$/
};