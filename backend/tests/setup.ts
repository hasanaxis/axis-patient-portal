import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'
import { exec } from 'child_process'
import { promisify } from 'util'

// Mock Prisma
jest.mock('../src/lib/prisma', () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>()
}))

// Mock SMS service
jest.mock('../src/services/sms/SMSAutomationService')

// Mock file system operations
jest.mock('fs/promises')

// Mock crypto for deterministic tests
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: jest.fn(() => Buffer.from('test-random-bytes')),
  randomUUID: jest.fn(() => 'test-uuid-1234'),
}))

const execAsync = promisify(exec)

// Database setup for integration tests
export const setupTestDatabase = async () => {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl || !databaseUrl.includes('test')) {
    throw new Error('TEST_DATABASE_URL must be set and contain "test"')
  }

  try {
    // Reset test database
    await execAsync('npx prisma migrate reset --force --skip-generate')
    await execAsync('npx prisma migrate deploy')
    await execAsync('npx prisma generate')
  } catch (error) {
    console.error('Failed to setup test database:', error)
    throw error
  }
}

export const cleanupTestDatabase = async () => {
  try {
    await execAsync('npx prisma migrate reset --force --skip-generate')
  } catch (error) {
    console.warn('Failed to cleanup test database:', error)
  }
}

// Reset mocks before each test
beforeEach(() => {
  mockReset(require('../src/lib/prisma').default)
})

// Global test utilities
global.createMockRequest = (overrides = {}) => ({
  body: {},
  query: {},
  params: {},
  headers: {},
  user: null,
  ...overrides
})

global.createMockResponse = () => {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  res.send = jest.fn().mockReturnValue(res)
  res.end = jest.fn().mockReturnValue(res)
  res.setHeader = jest.fn().mockReturnValue(res)
  return res
}

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.TWILIO_ACCOUNT_SID = 'test-twilio-sid'
process.env.TWILIO_AUTH_TOKEN = 'test-twilio-token'
process.env.TWILIO_PHONE_NUMBER = '+61400000000'
process.env.ENCRYPTION_MASTER_KEY = 'test-encryption-key-32-characters'