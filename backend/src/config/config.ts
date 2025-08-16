import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server configuration
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3001',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Database
  DATABASE_URL: process.env.DATABASE_URL,

  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'axis-imaging-jwt-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // SMS/Twilio Configuration
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  SMS_ENABLED: process.env.SMS_ENABLED === 'true',

  // OTP Configuration
  OTP_EXPIRES_IN_MINUTES: parseInt(process.env.OTP_EXPIRES_IN_MINUTES || '10', 10),
  OTP_MAX_ATTEMPTS: parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10),
  
  // Invitation Configuration
  INVITATION_EXPIRES_IN_DAYS: parseInt(process.env.INVITATION_EXPIRES_IN_DAYS || '30', 10),
  REGISTRATION_BASE_URL: process.env.REGISTRATION_BASE_URL || 'http://localhost:3000/register',

  // Security Configuration
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  PASSWORD_MIN_LENGTH: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
  SESSION_TIMEOUT_HOURS: parseInt(process.env.SESSION_TIMEOUT_HOURS || '24', 10),

  // File Upload
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
  UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10),

  // Axis Imaging Specific
  FACILITY_NAME: 'Axis Imaging Mickleham',
  FACILITY_PHONE: '+61 3 8765 1000',
  FACILITY_EMAIL: 'info@axisimaging.com.au',
  FACILITY_ABN: '12 345 678 901',

  // Australian Healthcare
  MEDICARE_VALIDATION_ENABLED: process.env.MEDICARE_VALIDATION_ENABLED === 'true',
  PRIVACY_POLICY_VERSION: process.env.PRIVACY_POLICY_VERSION || 'v2.1',
  TERMS_VERSION: process.env.TERMS_VERSION || 'v1.2',

  // Development/Testing
  SKIP_SMS_IN_TEST: process.env.NODE_ENV === 'test',
  LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // Security Headers
  CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  TRUST_PROXY: process.env.TRUST_PROXY === 'true',

  // Data Retention (Australian healthcare compliance)
  DATA_RETENTION_YEARS: parseInt(process.env.DATA_RETENTION_YEARS || '7', 10),
  AUDIT_LOG_RETENTION_YEARS: parseInt(process.env.AUDIT_LOG_RETENTION_YEARS || '10', 10),

  // Feature Flags
  BIOMETRIC_AUTH_ENABLED: process.env.BIOMETRIC_AUTH_ENABLED === 'true',
  TWO_FACTOR_REQUIRED: process.env.TWO_FACTOR_REQUIRED === 'true',
  REGISTRATION_REQUIRES_APPROVAL: process.env.REGISTRATION_REQUIRES_APPROVAL === 'true',
} as const;

// Validation of required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0 && process.env.NODE_ENV !== 'test') {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(envVar => console.error(`   - ${envVar}`));
  process.exit(1);
}

// SMS validation (warn if SMS is enabled but Twilio not configured)
if (config.SMS_ENABLED && (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN)) {
  console.warn('⚠️ SMS is enabled but Twilio credentials are not configured');
}

export default config;