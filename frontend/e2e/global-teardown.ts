import { FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  console.log('Cleaning up E2E test environment...')
  
  // Add any cleanup logic here
  // e.g., stop test servers, clean up test data, etc.
  
  console.log('E2E test environment cleanup complete')
}

export default globalTeardown