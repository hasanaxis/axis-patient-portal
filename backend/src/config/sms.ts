interface SMSConfig {
  // Twilio Configuration
  twilio: {
    accountSid: string
    authToken: string
    fromNumber: string
    webhookUrl?: string
  }
  
  // Application URLs
  urls: {
    appBaseUrl: string
    registrationBaseUrl: string
    webAppBaseUrl: string
  }
  
  // Business Hours (Australian Eastern Time)
  businessHours: {
    weekdays: {
      start: string // "07:00"
      end: string   // "19:00"
    }
    saturday: {
      start: string // "08:00"
      end: string   // "16:00"
    }
    sunday: {
      enabled: boolean // false
    }
  }
  
  // SMS Limits and Rules
  limits: {
    maxRetries: number
    retryIntervalHours: number
    bulkSendLimit: number
    characterLimit: number
    dailyLimitPerPatient: number
  }
  
  // Template Configuration
  templates: {
    defaultLanguage: string
    enableCustomMessages: boolean
    requireApprovalFor: string[] // Template types requiring approval
  }
  
  // Emergency Override
  emergency: {
    bypassBusinessHours: boolean
    bypassOptOut: boolean
    escalationPhoneNumbers: string[]
  }
  
  // Compliance and Privacy
  compliance: {
    retentionPeriodDays: number
    enableOptOutKeywords: boolean
    optOutKeywords: string[]
    includeUnsubscribeLink: boolean
    gdprCompliant: boolean
  }
  
  // Monitoring and Alerts
  monitoring: {
    enableDeliveryTracking: boolean
    alertOnFailureRate: number // Percentage
    alertRecipients: string[]
    enableDailyReports: boolean
  }
}

export const defaultSMSConfig: SMSConfig = {
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_FROM_NUMBER || '+61412345678',
    webhookUrl: process.env.TWILIO_WEBHOOK_URL
  },
  
  urls: {
    appBaseUrl: process.env.APP_BASE_URL || 'https://app.axisimaging.com.au',
    registrationBaseUrl: process.env.REGISTRATION_BASE_URL || 'https://register.axisimaging.com.au',
    webAppBaseUrl: process.env.WEB_APP_BASE_URL || 'https://portal.axisimaging.com.au'
  },
  
  businessHours: {
    weekdays: {
      start: '07:00',
      end: '19:00'
    },
    saturday: {
      start: '08:00',
      end: '16:00'
    },
    sunday: {
      enabled: false
    }
  },
  
  limits: {
    maxRetries: 3,
    retryIntervalHours: 6,
    bulkSendLimit: 100,
    characterLimit: 480, // Conservative SMS limit
    dailyLimitPerPatient: 3
  },
  
  templates: {
    defaultLanguage: 'en',
    enableCustomMessages: true,
    requireApprovalFor: ['urgent_review_required', 'custom_message']
  },
  
  emergency: {
    bypassBusinessHours: true,
    bypassOptOut: false, // Still respect complete opt-out for emergency
    escalationPhoneNumbers: [
      process.env.EMERGENCY_ESCALATION_PHONE_1 || '+61412345679',
      process.env.EMERGENCY_ESCALATION_PHONE_2 || '+61412345680'
    ]
  },
  
  compliance: {
    retentionPeriodDays: 2555, // 7 years as per Australian healthcare standards
    enableOptOutKeywords: true,
    optOutKeywords: ['STOP', 'UNSUBSCRIBE', 'OPT OUT', 'OPTOUT', 'QUIT', 'CANCEL'],
    includeUnsubscribeLink: false, // SMS character limit considerations
    gdprCompliant: true
  },
  
  monitoring: {
    enableDeliveryTracking: true,
    alertOnFailureRate: 10, // Alert if >10% failure rate
    alertRecipients: [
      process.env.SMS_ALERT_EMAIL_1 || 'admin@axisimaging.com.au',
      process.env.SMS_ALERT_EMAIL_2 || 'it@axisimaging.com.au'
    ],
    enableDailyReports: true
  }
}

// Environment-specific overrides
export function getSMSConfig(): SMSConfig {
  const env = process.env.NODE_ENV || 'development'
  
  switch (env) {
    case 'development':
      return {
        ...defaultSMSConfig,
        twilio: {
          ...defaultSMSConfig.twilio,
          fromNumber: '+15005550006' // Twilio magic number for testing
        },
        urls: {
          appBaseUrl: 'http://localhost:3001',
          registrationBaseUrl: 'http://localhost:3001/register',
          webAppBaseUrl: 'http://localhost:3000'
        },
        limits: {
          ...defaultSMSConfig.limits,
          dailyLimitPerPatient: 10 // Higher limit for testing
        }
      }
      
    case 'staging':
      return {
        ...defaultSMSConfig,
        urls: {
          appBaseUrl: 'https://staging-app.axisimaging.com.au',
          registrationBaseUrl: 'https://staging-register.axisimaging.com.au',
          webAppBaseUrl: 'https://staging-portal.axisimaging.com.au'
        },
        monitoring: {
          ...defaultSMSConfig.monitoring,
          enableDailyReports: false // Reduce noise in staging
        }
      }
      
    case 'production':
    default:
      return defaultSMSConfig
  }
}

// Validate SMS configuration
export function validateSMSConfig(config: SMSConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Required Twilio configuration
  if (!config.twilio.accountSid) {
    errors.push('TWILIO_ACCOUNT_SID is required')
  }
  
  if (!config.twilio.authToken) {
    errors.push('TWILIO_AUTH_TOKEN is required')
  }
  
  if (!config.twilio.fromNumber) {
    errors.push('TWILIO_FROM_NUMBER is required')
  } else if (!config.twilio.fromNumber.match(/^\+\d{10,15}$/)) {
    errors.push('TWILIO_FROM_NUMBER must be in international format (+61412345678)')
  }
  
  // Required URLs
  if (!config.urls.appBaseUrl) {
    errors.push('APP_BASE_URL is required')
  }
  
  if (!config.urls.registrationBaseUrl) {
    errors.push('REGISTRATION_BASE_URL is required')
  }
  
  // Business hours validation
  const timeRegex = /^\d{2}:\d{2}$/
  if (!timeRegex.test(config.businessHours.weekdays.start)) {
    errors.push('Invalid weekday start time format (use HH:MM)')
  }
  
  if (!timeRegex.test(config.businessHours.weekdays.end)) {
    errors.push('Invalid weekday end time format (use HH:MM)')
  }
  
  // Limits validation
  if (config.limits.maxRetries < 0 || config.limits.maxRetries > 5) {
    errors.push('maxRetries must be between 0 and 5')
  }
  
  if (config.limits.bulkSendLimit > 1000) {
    errors.push('bulkSendLimit cannot exceed 1000')
  }
  
  if (config.limits.characterLimit > 1600) {
    errors.push('characterLimit cannot exceed 1600 (SMS concatenation limit)')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// SMS template categories with descriptions
export const SMS_TEMPLATE_CATEGORIES = {
  report_ready: {
    name: 'Report Ready',
    description: 'Notifications when scan reports become available',
    userFacing: true,
    requiresApproval: false
  },
  appointment: {
    name: 'Appointments',
    description: 'Appointment confirmations and reminders',
    userFacing: true,
    requiresApproval: false
  },
  registration: {
    name: 'Registration',
    description: 'Patient portal registration and welcome messages',
    userFacing: true,
    requiresApproval: false
  },
  information: {
    name: 'Information',
    description: 'General information and instructions',
    userFacing: true,
    requiresApproval: false
  },
  emergency: {
    name: 'Emergency',
    description: 'Critical findings requiring immediate attention',
    userFacing: false,
    requiresApproval: true
  }
} as const

// Default SMS signatures and footers
export const SMS_SIGNATURES = {
  standard: '- Axis Imaging',
  formal: '- Axis Imaging Mickleham\nLevel 1, 107/21 Cityside Drive\n(03) 8746 4200',
  minimal: '',
  emergency: '- URGENT: Axis Imaging\nCall (03) 8746 4200 IMMEDIATELY'
} as const