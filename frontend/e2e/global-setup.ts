import { FullConfig } from '@playwright/test'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/axis_test'
    }
  }
})

async function globalSetup(config: FullConfig) {
  console.log('Setting up E2E test environment...')

  try {
    // Reset test database
    await prisma.$executeRaw`DROP SCHEMA IF EXISTS public CASCADE`
    await prisma.$executeRaw`CREATE SCHEMA public`
    
    // Run migrations
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)
    
    await execAsync('npx prisma migrate deploy', {
      env: {
        ...process.env,
        DATABASE_URL: process.env.TEST_DATABASE_URL
      }
    })

    // Seed test data
    await seedTestData()
    
    console.log('E2E test environment setup complete')
  } catch (error) {
    console.error('Failed to setup E2E test environment:', error)
    process.exit(1)
  }
}

async function seedTestData() {
  // Create test users and patients
  const testUser = await prisma.user.create({
    data: {
      email: 'test@example.com',
      password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewreZKQReQjoIsfG', // password123
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+61400000000',
      isVerified: true
    }
  })

  const testPatient = await prisma.patient.create({
    data: {
      userId: testUser.id,
      patientNumber: 'AX001234',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'MALE',
      medicareNumber: '1234567890',
      address: '123 Test Street',
      suburb: 'Melbourne',
      state: 'VIC',
      postcode: '3000',
      emergencyContactName: 'Jane Doe',
      emergencyContactPhone: '+61400000001'
    }
  })

  // Create test studies
  const testStudy = await prisma.study.create({
    data: {
      patientId: testPatient.id,
      accessionNumber: 'ACC001',
      studyDate: new Date('2024-01-15'),
      modality: 'CT',
      studyDescription: 'CT Chest with Contrast',
      bodyPart: 'CHEST',
      status: 'COMPLETED',
      studyInstanceUID: 'SUID001',
      referringPhysician: 'Dr. Smith'
    }
  })

  // Create test report
  await prisma.report.create({
    data: {
      studyId: testStudy.id,
      radiologistId: testUser.id, // Using test user as radiologist for simplicity
      clinicalHistory: 'Patient presents with chest pain',
      technique: 'CT chest performed with IV contrast',
      findings: 'The lungs are clear bilaterally. No evidence of pulmonary embolism.',
      impression: 'Normal CT chest. No acute findings.',
      status: 'FINAL',
      isCritical: false,
      reportedAt: new Date(),
      approvedAt: new Date()
    }
  })

  // Create test appointment
  await prisma.appointment.create({
    data: {
      patientId: testPatient.id,
      appointmentDate: new Date('2024-02-01'),
      appointmentTime: new Date('2024-02-01T10:00:00'),
      modality: 'MRI',
      bodyPart: 'HEAD',
      reason: 'Follow-up scan',
      preparationInstructions: 'Remove all metal objects',
      status: 'SCHEDULED',
      locationId: 'location-1'
    }
  })

  console.log('Test data seeded successfully')
}

export default globalSetup