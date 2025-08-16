import { faker } from '@faker-js/faker'

// Test data factories for creating mock data
export class TestDataFactory {
  static createUser(overrides = {}) {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phoneNumber: faker.phone.number(),
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }
  }

  static createPatient(overrides = {}) {
    return {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      patientNumber: faker.string.alphanumeric(8).toUpperCase(),
      dateOfBirth: faker.date.birthdate(),
      gender: faker.helpers.arrayElement(['MALE', 'FEMALE', 'OTHER']),
      medicareNumber: faker.string.numeric(10),
      address: faker.location.streetAddress(),
      suburb: faker.location.city(),
      state: faker.helpers.arrayElement(['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT']),
      postcode: faker.location.zipCode(),
      emergencyContactName: faker.person.fullName(),
      emergencyContactPhone: faker.phone.number(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }
  }

  static createStudy(overrides = {}) {
    return {
      id: faker.string.uuid(),
      patientId: faker.string.uuid(),
      accessionNumber: faker.string.alphanumeric(12).toUpperCase(),
      studyDate: faker.date.recent(),
      modality: faker.helpers.arrayElement(['CT', 'MRI', 'X-RAY', 'ULTRASOUND']),
      studyDescription: faker.lorem.sentence(),
      bodyPart: faker.helpers.arrayElement(['HEAD', 'CHEST', 'ABDOMEN', 'SPINE', 'EXTREMITY']),
      status: faker.helpers.arrayElement(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
      studyInstanceUID: faker.string.alphanumeric(20),
      referringPhysician: faker.person.fullName(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }
  }

  static createReport(overrides = {}) {
    return {
      id: faker.string.uuid(),
      studyId: faker.string.uuid(),
      radiologistId: faker.string.uuid(),
      clinicalHistory: faker.lorem.paragraph(),
      technique: faker.lorem.sentence(),
      findings: faker.lorem.paragraphs(2),
      impression: faker.lorem.paragraph(),
      recommendations: faker.lorem.sentence(),
      status: faker.helpers.arrayElement(['DRAFT', 'PRELIMINARY', 'FINAL', 'AMENDED']),
      isCritical: faker.datatype.boolean(),
      reportedAt: faker.date.recent(),
      approvedAt: faker.date.recent(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }
  }

  static createAppointment(overrides = {}) {
    return {
      id: faker.string.uuid(),
      patientId: faker.string.uuid(),
      appointmentDate: faker.date.future(),
      appointmentTime: faker.date.future(),
      modality: faker.helpers.arrayElement(['CT', 'MRI', 'X-RAY', 'ULTRASOUND']),
      bodyPart: faker.helpers.arrayElement(['HEAD', 'CHEST', 'ABDOMEN', 'SPINE']),
      reason: faker.lorem.sentence(),
      preparationInstructions: faker.lorem.paragraph(),
      status: faker.helpers.arrayElement(['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED']),
      locationId: faker.string.uuid(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }
  }

  static createShare(overrides = {}) {
    return {
      id: faker.string.uuid(),
      studyId: faker.string.uuid(),
      patientId: faker.string.uuid(),
      shareType: faker.helpers.arrayElement(['GP_REFERRAL', 'SPECIALIST', 'FAMILY_MEMBER']),
      recipientType: faker.helpers.arrayElement(['REFERRING_GP', 'SPECIALIST', 'FAMILY']),
      recipientName: faker.person.fullName(),
      recipientEmail: faker.internet.email(),
      recipientPhone: faker.phone.number(),
      accessToken: faker.string.alphanumeric(32),
      accessUrl: faker.internet.url(),
      permissionLevel: faker.helpers.arrayElement(['VIEW_ONLY', 'VIEW_DOWNLOAD']),
      expiresAt: faker.date.future(),
      maxAccesses: faker.number.int({ min: 1, max: 10 }),
      accessCount: 0,
      status: 'ACTIVE',
      createdBy: 'PATIENT',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }
  }

  static createSMSTemplate(overrides = {}) {
    return {
      id: faker.string.uuid(),
      name: faker.lorem.word(),
      templateType: faker.helpers.arrayElement(['APPOINTMENT_REMINDER', 'RESULTS_READY', 'APPOINTMENT_CONFIRMATION']),
      message: faker.lorem.sentence(),
      variables: ['patientName', 'appointmentDate'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }
  }

  static createGPPractice(overrides = {}) {
    return {
      id: faker.string.uuid(),
      practiceName: faker.company.name(),
      phone: faker.phone.number(),
      email: faker.internet.email(),
      address: faker.location.streetAddress(),
      suburb: faker.location.city(),
      state: faker.helpers.arrayElement(['VIC', 'NSW', 'QLD']),
      postcode: faker.location.zipCode(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }
  }

  static createConsent(overrides = {}) {
    return {
      id: faker.string.uuid(),
      patientId: faker.string.uuid(),
      consentType: faker.helpers.arrayElement(['GENERAL_SHARING', 'GP_SHARING', 'SPECIALIST_SHARING']),
      consentGiven: true,
      consentText: faker.lorem.paragraph(),
      allowGpSharing: true,
      allowSpecialistSharing: true,
      allowEmergencySharing: true,
      maxShareDuration: 90,
      requireNotification: true,
      consentMethod: 'DIGITAL_SIGNATURE',
      patientSignature: faker.string.alphanumeric(64),
      ipAddress: faker.internet.ip(),
      consentedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }
  }

  // Helper methods for creating related data
  static createPatientWithUser(overrides = {}) {
    const user = this.createUser()
    const patient = this.createPatient({ userId: user.id, ...overrides.patient })
    return { user, patient }
  }

  static createCompleteStudy(overrides = {}) {
    const { user, patient } = this.createPatientWithUser()
    const study = this.createStudy({ patientId: patient.id, ...overrides.study })
    const report = this.createReport({ studyId: study.id, ...overrides.report })
    return { user, patient, study, report }
  }

  // Create multiple records
  static createMultipleUsers(count: number, overrides = {}) {
    return Array.from({ length: count }, () => this.createUser(overrides))
  }

  static createMultiplePatients(count: number, overrides = {}) {
    return Array.from({ length: count }, () => this.createPatient(overrides))
  }

  static createMultipleStudies(count: number, overrides = {}) {
    return Array.from({ length: count }, () => this.createStudy(overrides))
  }

  // Utility functions for Australian-specific data
  static createAustralianPhoneNumber() {
    const areaCode = faker.helpers.arrayElement(['02', '03', '07', '08'])
    const number = faker.string.numeric(8)
    return `+61${areaCode}${number}`
  }

  static createMedicareNumber() {
    // Australian Medicare number format: 4 digits + space + 5 digits + space + 1 digit
    const first = faker.string.numeric(4)
    const second = faker.string.numeric(5)
    const checkDigit = faker.string.numeric(1)
    return `${first} ${second} ${checkDigit}`
  }

  static createAustralianAddress() {
    return {
      address: faker.location.streetAddress(),
      suburb: faker.location.city(),
      state: faker.helpers.arrayElement(['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT']),
      postcode: faker.location.zipCode('#####')
    }
  }
}