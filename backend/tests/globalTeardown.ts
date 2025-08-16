import { cleanupTestDatabase } from './setup'

export default async () => {
  console.log('Cleaning up test environment...')
  
  try {
    await cleanupTestDatabase()
    console.log('Test cleanup complete')
  } catch (error) {
    console.error('Failed to cleanup test environment:', error)
  }
}