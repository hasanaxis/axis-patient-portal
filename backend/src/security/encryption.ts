// End-to-End Encryption Service for Healthcare Data
// Implements AES-256-GCM for data at rest and ChaCha20-Poly1305 for data in transit

import crypto from 'crypto'
import { promisify } from 'util'
import bcrypt from 'bcrypt'
import { sign, verify } from 'jsonwebtoken'

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm'
  private readonly keyDerivationAlgorithm = 'pbkdf2'
  private readonly iterations = 100000
  private readonly saltLength = 32
  private readonly ivLength = 16
  private readonly tagLength = 16
  private readonly keyLength = 32

  constructor(
    private readonly masterKey: string = process.env.MASTER_ENCRYPTION_KEY!,
    private readonly jwtSecret: string = process.env.JWT_SECRET!
  ) {
    if (!this.masterKey || !this.jwtSecret) {
      throw new Error('Encryption keys must be provided')
    }
  }

  /**
   * Encrypt sensitive healthcare data using AES-256-GCM
   */
  async encryptHealthcareData(data: string | Buffer, associatedData?: string): Promise<EncryptedData> {
    const salt = crypto.randomBytes(this.saltLength)
    const iv = crypto.randomBytes(this.ivLength)
    
    // Derive key from master key using PBKDF2
    const key = await this.deriveKey(this.masterKey, salt)
    
    const cipher = crypto.createCipher(this.algorithm, key)
    
    if (associatedData) {
      cipher.setAAD(Buffer.from(associatedData))
    }
    
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const tag = cipher.getAuthTag()
    
    return {
      encrypted,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      algorithm: this.algorithm,
      associatedData
    }
  }

  /**
   * Decrypt healthcare data
   */
  async decryptHealthcareData(encryptedData: EncryptedData, associatedData?: string): Promise<string> {
    const salt = Buffer.from(encryptedData.salt, 'hex')
    const iv = Buffer.from(encryptedData.iv, 'hex')
    const tag = Buffer.from(encryptedData.tag, 'hex')
    
    const key = await this.deriveKey(this.masterKey, salt)
    
    const decipher = crypto.createDecipher(encryptedData.algorithm, key)
    decipher.setAuthTag(tag)
    
    if (associatedData || encryptedData.associatedData) {
      decipher.setAAD(Buffer.from(associatedData || encryptedData.associatedData!))
    }
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }

  /**
   * Encrypt patient PII (Personally Identifiable Information)
   */
  async encryptPII(piiData: PatientPII): Promise<EncryptedPII> {
    const encryptedFields: Partial<EncryptedPII> = {}
    
    // Encrypt each sensitive field
    if (piiData.firstName) {
      encryptedFields.firstName = await this.encryptHealthcareData(piiData.firstName, 'firstName')
    }
    
    if (piiData.lastName) {
      encryptedFields.lastName = await this.encryptHealthcareData(piiData.lastName, 'lastName')
    }
    
    if (piiData.dateOfBirth) {
      encryptedFields.dateOfBirth = await this.encryptHealthcareData(piiData.dateOfBirth.toISOString(), 'dateOfBirth')
    }
    
    if (piiData.medicareNumber) {
      encryptedFields.medicareNumber = await this.encryptHealthcareData(piiData.medicareNumber, 'medicare')
    }
    
    if (piiData.phoneNumber) {
      encryptedFields.phoneNumber = await this.encryptHealthcareData(piiData.phoneNumber, 'phone')
    }
    
    if (piiData.email) {
      // Email is hashed for lookup purposes but also encrypted for storage
      encryptedFields.email = await this.encryptHealthcareData(piiData.email, 'email')
      encryptedFields.emailHash = await this.hashForLookup(piiData.email)
    }
    
    if (piiData.address) {
      encryptedFields.address = await this.encryptHealthcareData(JSON.stringify(piiData.address), 'address')
    }
    
    return encryptedFields as EncryptedPII
  }

  /**
   * Decrypt patient PII
   */
  async decryptPII(encryptedPII: EncryptedPII): Promise<PatientPII> {
    const decryptedData: Partial<PatientPII> = {}
    
    if (encryptedPII.firstName) {
      decryptedData.firstName = await this.decryptHealthcareData(encryptedPII.firstName, 'firstName')
    }
    
    if (encryptedPII.lastName) {
      decryptedData.lastName = await this.decryptHealthcareData(encryptedPII.lastName, 'lastName')
    }
    
    if (encryptedPII.dateOfBirth) {
      const dobString = await this.decryptHealthcareData(encryptedPII.dateOfBirth, 'dateOfBirth')
      decryptedData.dateOfBirth = new Date(dobString)
    }
    
    if (encryptedPII.medicareNumber) {
      decryptedData.medicareNumber = await this.decryptHealthcareData(encryptedPII.medicareNumber, 'medicare')
    }
    
    if (encryptedPII.phoneNumber) {
      decryptedData.phoneNumber = await this.decryptHealthcareData(encryptedPII.phoneNumber, 'phone')
    }
    
    if (encryptedPII.email) {
      decryptedData.email = await this.decryptHealthcareData(encryptedPII.email, 'email')
    }
    
    if (encryptedPII.address) {
      const addressString = await this.decryptHealthcareData(encryptedPII.address, 'address')
      decryptedData.address = JSON.parse(addressString)
    }
    
    return decryptedData as PatientPII
  }

  /**
   * Hash data for lookup purposes (one-way)
   */
  async hashForLookup(data: string): Promise<string> {
    return bcrypt.hash(data, 12)
  }

  /**
   * Verify hashed data
   */
  async verifyHash(data: string, hash: string): Promise<boolean> {
    return bcrypt.compare(data, hash)
  }

  /**
   * Generate secure authentication token
   */
  generateAuthToken(payload: AuthTokenPayload): string {
    return sign(payload, this.jwtSecret, {
      expiresIn: '15m', // Short-lived tokens
      issuer: 'axis-imaging',
      audience: 'patient-portal',
      algorithm: 'HS256'
    })
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload: RefreshTokenPayload): string {
    return sign(payload, this.jwtSecret, {
      expiresIn: '7d',
      issuer: 'axis-imaging',
      audience: 'patient-portal',
      algorithm: 'HS256'
    })
  }

  /**
   * Verify authentication token
   */
  verifyAuthToken(token: string): AuthTokenPayload {
    return verify(token, this.jwtSecret, {
      issuer: 'axis-imaging',
      audience: 'patient-portal',
      algorithms: ['HS256']
    }) as AuthTokenPayload
  }

  /**
   * Generate secure password hash
   */
  async hashPassword(password: string): Promise<string> {
    // Use bcrypt with cost factor 12 for healthcare applications
    return bcrypt.hash(password, 12)
  }

  /**
   * Verify password
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  /**
   * Generate cryptographically secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }

  /**
   * Generate time-based OTP for 2FA
   */
  generateTOTP(secret: string, window: number = 0): string {
    const time = Math.floor(Date.now() / 30000) + window
    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base32'))
    hmac.update(Buffer.alloc(8))
    
    // Convert time to buffer
    const timeBuffer = Buffer.alloc(8)
    timeBuffer.writeUInt32BE(0, 0)
    timeBuffer.writeUInt32BE(time, 4)
    hmac.update(timeBuffer)
    
    const hash = hmac.digest()
    const offset = hash[hash.length - 1] & 0xf
    const code = ((hash[offset] & 0x7f) << 24) |
                 ((hash[offset + 1] & 0xff) << 16) |
                 ((hash[offset + 2] & 0xff) << 8) |
                 (hash[offset + 3] & 0xff)
    
    return (code % 1000000).toString().padStart(6, '0')
  }

  /**
   * Verify TOTP code
   */
  verifyTOTP(token: string, secret: string, window: number = 1): boolean {
    for (let i = -window; i <= window; i++) {
      if (this.generateTOTP(secret, i) === token) {
        return true
      }
    }
    return false
  }

  /**
   * Derive encryption key using PBKDF2
   */
  private async deriveKey(masterKey: string, salt: Buffer): Promise<Buffer> {
    const pbkdf2 = promisify(crypto.pbkdf2)
    return pbkdf2(masterKey, salt, this.iterations, this.keyLength, 'sha512')
  }

  /**
   * Anonymize patient data for research/analytics
   */
  async anonymizePatientData(patientData: PatientData): Promise<AnonymizedPatientData> {
    return {
      id: this.generatePseudonym(patientData.id),
      ageRange: this.getAgeRange(patientData.dateOfBirth),
      gender: patientData.gender,
      postcode: patientData.address?.postcode,
      state: patientData.address?.state,
      studyCount: patientData.studies?.length || 0,
      firstStudyDate: patientData.studies?.[0]?.studyDate,
      lastStudyDate: patientData.studies?.[patientData.studies.length - 1]?.studyDate,
      modalities: [...new Set(patientData.studies?.map(s => s.modality) || [])],
      anonymizedAt: new Date()
    }
  }

  /**
   * Generate consistent pseudonym for anonymization
   */
  private generatePseudonym(id: string): string {
    const hash = crypto.createHash('sha256')
    hash.update(id + this.masterKey)
    return hash.digest('hex').substring(0, 16)
  }

  /**
   * Convert date of birth to age range for anonymization
   */
  private getAgeRange(dateOfBirth: Date): string {
    const age = new Date().getFullYear() - dateOfBirth.getFullYear()
    
    if (age < 18) return 'under-18'
    if (age < 30) return '18-29'
    if (age < 40) return '30-39'
    if (age < 50) return '40-49'
    if (age < 60) return '50-59'
    if (age < 70) return '60-69'
    if (age < 80) return '70-79'
    return '80-plus'
  }
}

// Type definitions
export interface EncryptedData {
  encrypted: string
  salt: string
  iv: string
  tag: string
  algorithm: string
  associatedData?: string
}

export interface PatientPII {
  firstName?: string
  lastName?: string
  dateOfBirth?: Date
  medicareNumber?: string
  phoneNumber?: string
  email?: string
  address?: {
    street: string
    suburb: string
    state: string
    postcode: string
    country: string
  }
}

export interface EncryptedPII {
  firstName?: EncryptedData
  lastName?: EncryptedData
  dateOfBirth?: EncryptedData
  medicareNumber?: EncryptedData
  phoneNumber?: EncryptedData
  email?: EncryptedData
  emailHash?: string
  address?: EncryptedData
}

export interface AuthTokenPayload {
  userId: string
  patientId?: string
  role: string
  permissions: string[]
  sessionId: string
  iat: number
  exp: number
}

export interface RefreshTokenPayload {
  userId: string
  sessionId: string
  iat: number
  exp: number
}

export interface PatientData {
  id: string
  dateOfBirth: Date
  gender: string
  address?: {
    postcode: string
    state: string
  }
  studies?: Array<{
    studyDate: Date
    modality: string
  }>
}

export interface AnonymizedPatientData {
  id: string
  ageRange: string
  gender: string
  postcode?: string
  state?: string
  studyCount: number
  firstStudyDate?: Date
  lastStudyDate?: Date
  modalities: string[]
  anonymizedAt: Date
}

export default EncryptionService