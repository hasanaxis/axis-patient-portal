import winston from 'winston';
import { config } from '../config/config';

// Define custom log levels for healthcare context
const customLevels = {
  levels: {
    error: 0,
    security: 1,
    warn: 2,
    audit: 3,
    info: 4,
    debug: 5
  },
  colors: {
    error: 'red',
    security: 'magenta',
    warn: 'yellow',
    audit: 'blue',
    info: 'green',
    debug: 'gray'
  }
};

// Add colors to winston
winston.addColors(customLevels.colors);

// Custom format for healthcare logging
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // Sanitize sensitive data from logs
    const sanitizedMeta = sanitizeSensitiveData(meta);
    
    return JSON.stringify({
      timestamp,
      level,
      message,
      service: 'axis-imaging-api',
      environment: config.NODE_ENV,
      ...sanitizedMeta
    });
  })
);

// Function to sanitize sensitive healthcare data from logs
function sanitizeSensitiveData(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  const sensitiveFields = [
    'password', 'passwordHash', 'token', 'jwt', 'authorization',
    'medicareNumber', 'ihiNumber', 'dvaNumber', 'dateOfBirth',
    'phoneNumber', 'email', 'ssn', 'socialSecurityNumber',
    'creditCard', 'bankAccount', 'secret', 'key', 'otp'
  ];

  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (sensitiveFields.some(field => 
      key.toLowerCase().includes(field.toLowerCase())
    )) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeSensitiveData(sanitized[key]);
    }
  }

  return sanitized;
}

// Create logger instance
export const logger = winston.createLogger({
  levels: customLevels.levels,
  level: config.LOG_LEVEL,
  format: customFormat,
  defaultMeta: {
    service: 'axis-imaging-patient-portal'
  },
  transports: [
    // Error log file - only errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
      tailable: true
    }),

    // Security log file - security events and audit logs
    new winston.transports.File({
      filename: 'logs/security.log',
      level: 'security',
      maxsize: 100 * 1024 * 1024, // 100MB
      maxFiles: 20,
      tailable: true
    }),

    // Audit log file - for compliance and healthcare audit trail
    new winston.transports.File({
      filename: 'logs/audit.log',
      level: 'audit',
      maxsize: 200 * 1024 * 1024, // 200MB
      maxFiles: 50, // Keep longer for healthcare compliance
      tailable: true
    }),

    // Combined log file - all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 100 * 1024 * 1024, // 100MB
      maxFiles: 15,
      tailable: true
    })
  ],

  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],

  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
});

// Add console transport for development
if (config.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
      })
    )
  }));
}

// Healthcare-specific logging functions
export const healthcareLogger = {
  // Patient access logging (HIPAA compliance)
  patientAccess: (patientId: string, userId: string, action: string, details?: any) => {
    logger.info('Patient data access', {
      level: 'audit',
      category: 'PATIENT_ACCESS',
      patientId,
      userId,
      action,
      details: sanitizeSensitiveData(details),
      timestamp: new Date().toISOString(),
      compliance: 'HIPAA'
    });
  },

  // Authentication events
  authEvent: (event: string, userId?: string, details?: any) => {
    logger.info('Authentication event', {
      level: 'security',
      category: 'AUTHENTICATION',
      event,
      userId,
      details: sanitizeSensitiveData(details),
      timestamp: new Date().toISOString()
    });
  },

  // Medical data access
  medicalDataAccess: (resourceType: string, resourceId: string, userId: string, action: string) => {
    logger.info('Medical data access', {
      level: 'audit',
      category: 'MEDICAL_DATA',
      resourceType,
      resourceId,
      userId,
      action,
      timestamp: new Date().toISOString(),
      compliance: 'HIPAA'
    });
  },

  // Security incidents
  securityIncident: (incident: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: any) => {
    logger.warn('Security incident', {
      level: 'security',
      category: 'SECURITY_INCIDENT',
      incident,
      severity,
      details: sanitizeSensitiveData(details),
      timestamp: new Date().toISOString(),
      requiresReview: severity === 'high' || severity === 'critical'
    });
  },

  // System access
  systemAccess: (action: string, userId?: string, resource?: string, details?: any) => {
    logger.info('System access', {
      level: 'audit',
      category: 'SYSTEM_ACCESS',
      action,
      userId,
      resource,
      details: sanitizeSensitiveData(details),
      timestamp: new Date().toISOString()
    });
  }
};

export default logger;