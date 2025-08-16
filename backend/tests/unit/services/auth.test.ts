import { AuthService } from '../../../src/services/AuthService'
import { PrismaClient } from '@prisma/client'
import { TestDataFactory } from '../../factories'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// Mock dependencies
jest.mock('../../../src/lib/prisma')
jest.mock('bcryptjs')
jest.mock('jsonwebtoken')

const mockPrisma = jest.mocked(require('../../../src/lib/prisma').default as PrismaClient)
const mockBcrypt = jest.mocked(bcrypt)
const mockJwt = jest.mocked(jwt)

describe('AuthService', () => {
  let authService: AuthService

  beforeEach(() => {
    authService = new AuthService()
    jest.clearAllMocks()
  })

  describe('register', () => {
    it('should successfully register a new user', async () => {
      // Arrange
      const userData = TestDataFactory.createUser()
      const hashedPassword = 'hashed-password'
      
      mockPrisma.user.findUnique.mockResolvedValue(null) // User doesn't exist
      mockBcrypt.hash.mockResolvedValue(hashedPassword)
      mockPrisma.user.create.mockResolvedValue(userData)

      // Act
      const result = await authService.register({
        email: userData.email,
        password: 'password123',
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.user).toEqual(userData)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: userData.email }
      })
      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 12)
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phoneNumber: userData.phoneNumber
        }
      })
    })

    it('should fail if user already exists', async () => {
      // Arrange
      const existingUser = TestDataFactory.createUser()
      mockPrisma.user.findUnique.mockResolvedValue(existingUser)

      // Act
      const result = await authService.register({
        email: existingUser.email,
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '+61400000000'
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toBe('User already exists')
      expect(mockPrisma.user.create).not.toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockBcrypt.hash.mockResolvedValue('hashed-password')
      mockPrisma.user.create.mockRejectedValue(new Error('Database error'))

      // Act
      const result = await authService.register({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '+61400000000'
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toBe('Registration failed')
    })
  })

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      // Arrange
      const user = TestDataFactory.createUser()
      const token = 'jwt-token'
      
      mockPrisma.user.findUnique.mockResolvedValue(user)
      mockBcrypt.compare.mockResolvedValue(true)
      mockJwt.sign.mockReturnValue(token)

      // Act
      const result = await authService.login(user.email, 'password123')

      // Assert
      expect(result.success).toBe(true)
      expect(result.token).toBe(token)
      expect(result.user).toEqual(user)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: user.email }
      })
      expect(mockBcrypt.compare).toHaveBeenCalledWith('password123', user.password)
      expect(mockJwt.sign).toHaveBeenCalledWith(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      )
    })

    it('should fail with invalid email', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null)

      // Act
      const result = await authService.login('invalid@example.com', 'password123')

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid credentials')
      expect(mockBcrypt.compare).not.toHaveBeenCalled()
    })

    it('should fail with invalid password', async () => {
      // Arrange
      const user = TestDataFactory.createUser()
      mockPrisma.user.findUnique.mockResolvedValue(user)
      mockBcrypt.compare.mockResolvedValue(false)

      // Act
      const result = await authService.login(user.email, 'wrongpassword')

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid credentials')
      expect(mockJwt.sign).not.toHaveBeenCalled()
    })

    it('should fail for unverified users', async () => {
      // Arrange
      const user = TestDataFactory.createUser({ isVerified: false })
      mockPrisma.user.findUnique.mockResolvedValue(user)
      mockBcrypt.compare.mockResolvedValue(true)

      // Act
      const result = await authService.login(user.email, 'password123')

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toBe('Account not verified')
    })
  })

  describe('verifyToken', () => {
    it('should successfully verify valid token', async () => {
      // Arrange
      const user = TestDataFactory.createUser()
      const decodedToken = { userId: user.id, email: user.email }
      
      mockJwt.verify.mockReturnValue(decodedToken)
      mockPrisma.user.findUnique.mockResolvedValue(user)

      // Act
      const result = await authService.verifyToken('valid-token')

      // Assert
      expect(result.success).toBe(true)
      expect(result.user).toEqual(user)
      expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET)
    })

    it('should fail with invalid token', async () => {
      // Arrange
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      // Act
      const result = await authService.verifyToken('invalid-token')

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid token')
    })

    it('should fail if user not found', async () => {
      // Arrange
      const decodedToken = { userId: 'non-existent-id', email: 'test@example.com' }
      mockJwt.verify.mockReturnValue(decodedToken)
      mockPrisma.user.findUnique.mockResolvedValue(null)

      // Act
      const result = await authService.verifyToken('valid-token')

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toBe('User not found')
    })
  })

  describe('resetPassword', () => {
    it('should successfully reset password', async () => {
      // Arrange
      const user = TestDataFactory.createUser()
      const hashedPassword = 'new-hashed-password'
      
      mockPrisma.user.findUnique.mockResolvedValue(user)
      mockBcrypt.hash.mockResolvedValue(hashedPassword)
      mockPrisma.user.update.mockResolvedValue({ ...user, password: hashedPassword })

      // Act
      const result = await authService.resetPassword(user.email, 'newpassword123')

      // Assert
      expect(result.success).toBe(true)
      expect(mockBcrypt.hash).toHaveBeenCalledWith('newpassword123', 12)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { email: user.email },
        data: { password: hashedPassword }
      })
    })

    it('should fail if user not found', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null)

      // Act
      const result = await authService.resetPassword('nonexistent@example.com', 'newpassword')

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toBe('User not found')
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })
  })

  describe('validatePassword', () => {
    it('should validate strong password', () => {
      const result = authService.validatePassword('Password123!')
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should reject weak passwords', () => {
      const result = authService.validatePassword('weak')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
      expect(result.errors).toContain('Password must contain at least one number')
    })
  })
})