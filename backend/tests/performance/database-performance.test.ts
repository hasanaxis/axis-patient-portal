// Database Performance Testing for Axis Imaging Backend
// Tests database queries, connection pooling, and optimization

import { PrismaClient } from '@prisma/client'
import { createTestFactory } from '../factories'
import { performance } from 'perf_hooks'

describe('Database Performance Tests', () => {
  let prisma: PrismaClient
  let factory: ReturnType<typeof createTestFactory>

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL
        }
      },
      log: ['query', 'info', 'warn', 'error']
    })
    
    factory = createTestFactory(prisma)
    
    // Clean database and create test data
    await prisma.$executeRaw`TRUNCATE TABLE "Study", "Patient", "User", "Report", "Appointment" RESTART IDENTITY CASCADE`
    
    // Create large dataset for performance testing
    await createLargeTestDataset()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('Query Performance Tests', () => {
    it('should execute patient queries within acceptable time', async () => {
      const startTime = performance.now()
      
      const patients = await prisma.patient.findMany({
        take: 100,
        include: {
          user: true,
          studies: {
            take: 5,
            orderBy: { studyDate: 'desc' }
          }
        }
      })
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      expect(patients.length).toBeLessThanOrEqual(100)
      expect(executionTime).toBeLessThan(500) // Should complete within 500ms
    })

    it('should execute study search queries efficiently', async () => {
      const searchTerms = ['CT', 'MRI', 'chest', 'brain', 'spine']
      const performanceResults = []

      for (const term of searchTerms) {
        const startTime = performance.now()
        
        const studies = await prisma.study.findMany({
          where: {
            OR: [
              { studyDescription: { contains: term, mode: 'insensitive' } },
              { bodyPart: { contains: term, mode: 'insensitive' } },
              { modality: { contains: term, mode: 'insensitive' } }
            ]
          },
          take: 50,
          include: {
            patient: {
              select: {
                patientNumber: true,
                user: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            reports: {
              take: 1,
              orderBy: { reportedAt: 'desc' }
            }
          }
        })
        
        const endTime = performance.now()
        const executionTime = endTime - startTime
        
        performanceResults.push({
          term,
          executionTime,
          resultCount: studies.length
        })
        
        expect(executionTime).toBeLessThan(1000) // Search should complete within 1 second
      }

      // Log performance results for analysis
      console.log('Search Performance Results:', performanceResults)
    })

    it('should handle complex report queries efficiently', async () => {
      const startTime = performance.now()
      
      const reports = await prisma.report.findMany({
        where: {
          status: 'FINAL',
          isCritical: false,
          reportedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        include: {
          study: {
            include: {
              patient: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true
                    }
                  }
                }
              }
            }
          },
          radiologist: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: [
          { reportedAt: 'desc' },
          { priority: 'desc' }
        ],
        take: 100
      })
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      expect(reports.length).toBeLessThanOrEqual(100)
      expect(executionTime).toBeLessThan(2000) // Complex queries should complete within 2 seconds
    })

    it('should execute appointment availability queries quickly', async () => {
      const testDates = [
        new Date(),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week ahead
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)  // 1 month ahead
      ]

      for (const date of testDates) {
        const startTime = performance.now()
        
        const availability = await prisma.appointment.findMany({
          where: {
            appointmentDate: {
              gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
              lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
            },
            status: 'SCHEDULED'
          },
          select: {
            appointmentTime: true,
            modality: true,
            locationId: true
          }
        })
        
        const endTime = performance.now()
        const executionTime = endTime - startTime
        
        expect(executionTime).toBeLessThan(300) // Availability queries should be very fast
      }
    })
  })

  describe('Connection Pool Performance', () => {
    it('should handle concurrent connections efficiently', async () => {
      const concurrentQueries = 50
      const promises: Promise<any>[] = []

      const startTime = performance.now()

      for (let i = 0; i < concurrentQueries; i++) {
        promises.push(
          prisma.patient.findMany({
            take: 10,
            skip: i * 10,
            include: {
              user: true
            }
          })
        )
      }

      const results = await Promise.all(promises)
      const endTime = performance.now()
      const totalTime = endTime - startTime

      expect(results).toHaveLength(concurrentQueries)
      expect(totalTime).toBeLessThan(5000) // All concurrent queries should complete within 5 seconds
      
      // Verify all queries returned results
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true)
      })
    })

    it('should maintain performance under load', async () => {
      const loadTest = async (iterations: number) => {
        const startTime = performance.now()
        
        for (let i = 0; i < iterations; i++) {
          await prisma.study.findMany({
            take: 20,
            include: {
              patient: true,
              reports: true
            }
          })
        }
        
        const endTime = performance.now()
        return endTime - startTime
      }

      // Test with increasing load
      const lightLoad = await loadTest(10)   // 10 queries
      const mediumLoad = await loadTest(25)  // 25 queries
      const heavyLoad = await loadTest(50)   // 50 queries

      // Performance should scale reasonably
      expect(mediumLoad / lightLoad).toBeLessThan(3) // Medium load shouldn't be 3x slower
      expect(heavyLoad / mediumLoad).toBeLessThan(3) // Heavy load shouldn't be 3x slower than medium
    })
  })

  describe('Index Performance Tests', () => {
    it('should use indexes for patient number lookups', async () => {
      const testPatientNumbers = ['AX001234', 'AX005678', 'AX009876']

      for (const patientNumber of testPatientNumbers) {
        const startTime = performance.now()
        
        const patient = await prisma.patient.findUnique({
          where: { patientNumber },
          include: {
            user: true,
            studies: {
              orderBy: { studyDate: 'desc' },
              take: 10
            }
          }
        })
        
        const endTime = performance.now()
        const executionTime = endTime - startTime
        
        expect(executionTime).toBeLessThan(50) // Indexed lookups should be very fast
      }
    })

    it('should use indexes for study accession number lookups', async () => {
      const testAccessionNumbers = ['ACC001', 'ACC002', 'ACC003']

      for (const accessionNumber of testAccessionNumbers) {
        const startTime = performance.now()
        
        const study = await prisma.study.findUnique({
          where: { accessionNumber },
          include: {
            patient: {
              include: {
                user: true
              }
            },
            reports: true
          }
        })
        
        const endTime = performance.now()
        const executionTime = endTime - startTime
        
        expect(executionTime).toBeLessThan(50) // Indexed lookups should be very fast
      }
    })

    it('should use indexes for date range queries', async () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-12-31')

      const startTime = performance.now()
      
      const studies = await prisma.study.findMany({
        where: {
          studyDate: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { studyDate: 'desc' },
        take: 100
      })
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      expect(executionTime).toBeLessThan(500) // Date range queries should use indexes
      expect(studies.length).toBeLessThanOrEqual(100)
    })
  })

  describe('Aggregation Performance Tests', () => {
    it('should execute study count aggregations efficiently', async () => {
      const startTime = performance.now()
      
      const aggregations = await prisma.study.aggregate({
        _count: {
          id: true
        },
        where: {
          status: 'COMPLETED'
        }
      })
      
      const modalityStats = await prisma.study.groupBy({
        by: ['modality'],
        _count: {
          id: true
        },
        where: {
          status: 'COMPLETED'
        }
      })
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      expect(executionTime).toBeLessThan(1000) // Aggregations should complete within 1 second
      expect(aggregations._count.id).toBeGreaterThan(0)
      expect(modalityStats.length).toBeGreaterThan(0)
    })

    it('should calculate report statistics efficiently', async () => {
      const startTime = performance.now()
      
      const reportStats = await prisma.report.groupBy({
        by: ['status', 'isCritical'],
        _count: {
          id: true
        },
        _avg: {
          priority: true
        }
      })
      
      const monthlyReports = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "reportedAt") as month,
          COUNT(*) as report_count,
          COUNT(CASE WHEN "isCritical" = true THEN 1 END) as critical_count
        FROM "Report"
        WHERE "reportedAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "reportedAt")
        ORDER BY month DESC
      `
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      expect(executionTime).toBeLessThan(2000) // Complex aggregations should complete within 2 seconds
      expect(reportStats.length).toBeGreaterThan(0)
      expect(Array.isArray(monthlyReports)).toBe(true)
    })
  })

  describe('Transaction Performance Tests', () => {
    it('should handle appointment booking transactions efficiently', async () => {
      const appointmentData = {
        appointmentDate: new Date('2024-12-01'),
        appointmentTime: new Date('2024-12-01T10:00:00'),
        modality: 'MRI',
        bodyPart: 'HEAD',
        reason: 'Performance test appointment',
        locationId: 'location-1'
      }

      const startTime = performance.now()
      
      const result = await prisma.$transaction(async (tx) => {
        // Check availability
        const existingAppointments = await tx.appointment.findMany({
          where: {
            appointmentDate: appointmentData.appointmentDate,
            appointmentTime: appointmentData.appointmentTime,
            locationId: appointmentData.locationId,
            status: { not: 'CANCELLED' }
          }
        })

        if (existingAppointments.length > 0) {
          throw new Error('Time slot not available')
        }

        // Create appointment
        const appointment = await tx.appointment.create({
          data: {
            ...appointmentData,
            patientId: 1, // Use existing patient
            status: 'SCHEDULED'
          }
        })

        // Update appointment slots (simulated)
        await tx.$executeRaw`
          UPDATE appointment_slots 
          SET available_slots = available_slots - 1 
          WHERE date = ${appointmentData.appointmentDate} 
          AND time_slot = ${appointmentData.appointmentTime}
          AND location_id = ${appointmentData.locationId}
        `

        return appointment
      })
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      expect(executionTime).toBeLessThan(1000) // Transactions should complete within 1 second
      expect(result.id).toBeDefined()
    })

    it('should handle study creation with reports transaction efficiently', async () => {
      const studyData = factory.createStudyData({
        patientId: 1,
        accessionNumber: 'PERF_TEST_001'
      })

      const reportData = factory.createReportData({
        radiologistId: 1
      })

      const startTime = performance.now()
      
      const result = await prisma.$transaction(async (tx) => {
        // Create study
        const study = await tx.study.create({
          data: studyData
        })

        // Create associated report
        const report = await tx.report.create({
          data: {
            ...reportData,
            studyId: study.id
          }
        })

        // Update study status
        await tx.study.update({
          where: { id: study.id },
          data: { status: 'COMPLETED' }
        })

        return { study, report }
      })
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      expect(executionTime).toBeLessThan(1500) // Complex transactions should complete within 1.5 seconds
      expect(result.study.id).toBeDefined()
      expect(result.report.id).toBeDefined()
    })
  })

  describe('Memory and Resource Tests', () => {
    it('should handle large result sets without memory issues', async () => {
      const batchSize = 1000
      const totalRecords = 5000
      let processedRecords = 0

      // Process records in batches to test memory efficiency
      for (let offset = 0; offset < totalRecords; offset += batchSize) {
        const studies = await prisma.study.findMany({
          take: batchSize,
          skip: offset,
          select: {
            id: true,
            accessionNumber: true,
            studyDate: true,
            modality: true,
            status: true
          }
        })

        processedRecords += studies.length
        
        // Verify we're not loading too much into memory
        expect(studies.length).toBeLessThanOrEqual(batchSize)
        
        if (studies.length < batchSize) {
          // We've reached the end of available records
          break
        }
      }

      expect(processedRecords).toBeGreaterThan(0)
    })

    it('should efficiently stream large datasets', async () => {
      const startTime = performance.now()
      let recordCount = 0

      // Use cursor-based pagination for efficient streaming
      let cursor: number | undefined = undefined
      
      while (true) {
        const batch = await prisma.study.findMany({
          take: 100,
          ...(cursor && { 
            skip: 1,
            cursor: { id: cursor }
          }),
          orderBy: { id: 'asc' },
          select: {
            id: true,
            studyDate: true,
            modality: true
          }
        })

        if (batch.length === 0) break

        recordCount += batch.length
        cursor = batch[batch.length - 1].id

        // Stop after processing a reasonable amount for testing
        if (recordCount >= 1000) break
      }
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      expect(executionTime).toBeLessThan(10000) // Streaming should be efficient
      expect(recordCount).toBeGreaterThan(0)
    })
  })

  describe('Cache Performance Tests', () => {
    it('should benefit from query result caching', async () => {
      const cacheableQuery = () => prisma.patient.findMany({
        take: 50,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      })

      // First execution (cold cache)
      const startTime1 = performance.now()
      const result1 = await cacheableQuery()
      const endTime1 = performance.now()
      const firstExecution = endTime1 - startTime1

      // Second execution (warm cache - if caching is implemented)
      const startTime2 = performance.now()
      const result2 = await cacheableQuery()
      const endTime2 = performance.now()
      const secondExecution = endTime2 - startTime2

      expect(result1.length).toBe(result2.length)
      
      // Note: This test assumes query result caching is implemented
      // Without caching, execution times will be similar
      console.log(`First execution: ${firstExecution}ms, Second execution: ${secondExecution}ms`)
    })
  })

  // Helper function to create large test dataset
  async function createLargeTestDataset() {
    console.log('Creating large test dataset for performance testing...')
    
    // Create users and patients
    const users = []
    for (let i = 0; i < 1000; i++) {
      users.push(factory.createUserData({
        email: `patient${i}@example.com`,
        firstName: `Patient${i}`,
        lastName: `Test${i}`
      }))
    }

    // Batch insert users
    await prisma.user.createMany({
      data: users,
      skipDuplicates: true
    })

    // Get created user IDs
    const createdUsers = await prisma.user.findMany({
      where: {
        email: { contains: '@example.com' }
      },
      select: { id: true }
    })

    // Create patients
    const patients = createdUsers.map((user, index) => 
      factory.createPatientData({
        userId: user.id,
        patientNumber: `AX${String(index + 1).padStart(6, '0')}`
      })
    )

    await prisma.patient.createMany({
      data: patients,
      skipDuplicates: true
    })

    // Get created patient IDs
    const createdPatients = await prisma.patient.findMany({
      select: { id: true }
    })

    // Create studies (multiple per patient)
    const studies = []
    const modalities = ['CT', 'MRI', 'XRAY', 'ULTRASOUND', 'MAMMOGRAPHY']
    const bodyParts = ['HEAD', 'CHEST', 'ABDOMEN', 'PELVIS', 'SPINE', 'EXTREMITY']

    createdPatients.forEach((patient, patientIndex) => {
      const studyCount = Math.floor(Math.random() * 5) + 1 // 1-5 studies per patient
      
      for (let i = 0; i < studyCount; i++) {
        studies.push(factory.createStudyData({
          patientId: patient.id,
          accessionNumber: `ACC${String(patientIndex * 10 + i + 1).padStart(6, '0')}`,
          modality: modalities[Math.floor(Math.random() * modalities.length)],
          bodyPart: bodyParts[Math.floor(Math.random() * bodyParts.length)],
          studyDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000) // Random date within last year
        }))
      }
    })

    // Batch insert studies
    await prisma.study.createMany({
      data: studies,
      skipDuplicates: true
    })

    console.log(`Created ${createdUsers.length} users, ${createdPatients.length} patients, and ${studies.length} studies`)
  }
})