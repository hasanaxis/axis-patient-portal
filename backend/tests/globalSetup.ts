import { setupTestDatabase } from './setup'

export default async () => {
  console.log('Setting up test environment...')
  
  // Set test environment
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/axis_test'
  
  try {
    await setupTestDatabase()
    console.log('Test database setup complete')
  } catch (error) {
    console.error('Failed to setup test environment:', error)
    process.exit(1)
  }
}