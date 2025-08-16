import request from 'supertest'
import { app } from '../../src/app'
import { PrismaClient } from '@prisma/client'
import { TestDataFactory } from '../factories'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

describe('Authentication Integration Tests', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await prisma.sMSLog.deleteMany()
    await prisma.patient.deleteMany()
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+61400000000'
      }

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)

      // Assert
      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.user.email).toBe(userData.email)
      expect(response.body.user.password).toBeUndefined() // Password should not be returned

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: userData.email }
      })
      expect(user).toBeTruthy()
      expect(user?.isVerified).toBe(false) // Should require verification
    })

    it('should reject registration with existing email', async () => {
      // Arrange
      const userData = TestDataFactory.createUser()
      await prisma.user.create({ data: userData })

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: userData.email,
          password: 'Password123!',
          firstName: 'Jane',
          lastName: 'Doe',
          phoneNumber: '+61400000001'
        })

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('User already exists')
    })

    it('should validate required fields', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'weak'
        })

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.errors).toContain('Invalid email format')
      expect(response.body.errors).toContain('Password must be at least 8 characters long')
    })
  })

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      // Arrange
      const password = 'Password123!'
      const hashedPassword = await bcrypt.hash(password, 12)
      const userData = TestDataFactory.createUser({
        password: hashedPassword,
        isVerified: true
      })
      await prisma.user.create({ data: userData })

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password
        })

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.token).toBeDefined()
      expect(response.body.user.email).toBe(userData.email)
      expect(response.body.user.password).toBeUndefined()
    })

    it('should reject login with invalid credentials', async () => {
      // Arrange
      const userData = TestDataFactory.createUser({ isVerified: true })
      await prisma.user.create({ data: userData })

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'wrongpassword'
        })

      // Assert
      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Invalid credentials')
    })

    it('should reject login for unverified users', async () => {
      // Arrange
      const password = 'Password123!'
      const hashedPassword = await bcrypt.hash(password, 12)
      const userData = TestDataFactory.createUser({
        password: hashedPassword,
        isVerified: false
      })
      await prisma.user.create({ data: userData })

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password
        })

      // Assert
      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Account not verified')
    })
  })

  describe('GET /api/auth/verify', () => {
    it('should verify valid token', async () => {
      // Arrange
      const userData = TestDataFactory.createUser({ isVerified: true })
      const user = await prisma.user.create({ data: userData })

      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })

      const token = loginResponse.body.token

      // Act
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`)

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.user.id).toBe(user.id)
    })

    it('should reject invalid token', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token')

      // Assert
      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Invalid token')
    })

    it('should reject missing token', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/verify')

      // Assert
      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('No token provided')
    })
  })

  describe('POST /api/auth/forgot-password', () => {
    it('should initiate password reset for existing user', async () => {
      // Arrange
      const userData = TestDataFactory.createUser({ isVerified: true })
      await prisma.user.create({ data: userData })

      // Act
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: userData.email })

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Password reset email sent')
    })

    it('should handle non-existent email gracefully', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })

      // Assert
      expect(response.status).toBe(200) // Don't reveal if email exists
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('If the email exists, a reset link has been sent')
    })
  })

  describe('Patient Registration Flow', () => {
    it('should complete patient registration after user creation', async () => {
      // Arrange - Create user first
      const userData = {
        email: 'patient@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+61400000000'
      }

      const userResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)

      const userId = userResponse.body.user.id

      // Act - Complete patient registration
      const patientData = {
        dateOfBirth: '1990-01-01',
        gender: 'MALE',
        medicareNumber: '1234567890',
        address: '123 Test St',
        suburb: 'Melbourne',
        state: 'VIC',
        postcode: '3000',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+61400000001'
      }

      const patientResponse = await request(app)
        .post('/api/patients/complete-registration')
        .set('Authorization', `Bearer ${userResponse.body.token}`)
        .send(patientData)

      // Assert
      expect(patientResponse.status).toBe(201)
      expect(patientResponse.body.success).toBe(true)
      expect(patientResponse.body.patient.userId).toBe(userId)

      // Verify patient was created in database
      const patient = await prisma.patient.findFirst({
        where: { userId }
      })
      expect(patient).toBeTruthy()
      expect(patient?.medicareNumber).toBe(patientData.medicareNumber)
    })
  })

  describe('Rate Limiting', () => {
    it('should apply rate limiting to login attempts', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      }

      // Act - Make multiple failed login attempts
      const promises = Array.from({ length: 6 }, () =>
        request(app)
          .post('/api/auth/login')
          .send(loginData)
      )

      const responses = await Promise.all(promises)

      // Assert - Should be rate limited after 5 attempts
      const rateLimitedResponse = responses[5]
      expect(rateLimitedResponse.status).toBe(429)
      expect(rateLimitedResponse.body.message).toBe('Too many login attempts')
    })
  })
})