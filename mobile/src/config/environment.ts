const isDev = __DEV__

export const config = {
  // API Configuration
  apiBaseUrl: isDev ? 'http://localhost:3005/api' : 'https://api.axisimaging.com.au/api',
  
  // Feature flags
  enableOfflineMode: true,
  enablePushNotifications: true,
  enableBiometrics: true,
  
  // Cache settings
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  maxCacheSize: 50 * 1024 * 1024, // 50MB
  
  // Network settings
  requestTimeout: 30000, // 30 seconds
  retryAttempts: 3,
  
  // Development settings
  enableLogging: isDev,
  enableMockData: isDev && false, // Set to true to use mock data in development
  
  // App information
  appVersion: '1.0.0',
  apiVersion: 'v1',
  
  // Clinic information
  clinicName: 'Axis Imaging',
  clinicPhone: '+61 3 9999 0000',
  clinicEmail: 'reception@axisimaging.com.au',
  clinicAddress: 'Mickleham, Victoria, Australia',
  
  // Emergency contact
  emergencyPhone: '000',
  emergencyMessage: 'For medical emergencies, call 000',
}

export default config