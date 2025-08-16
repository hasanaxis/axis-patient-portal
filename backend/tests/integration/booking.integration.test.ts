import request from 'supertest';
import { app } from '../../src/index';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Booking API Integration Tests', () => {
  beforeAll(async () => {
    // Setup test database
    await prisma.$connect();
  });

  afterAll(async () => {
    // Cleanup test database
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up booking-related data before each test
    await prisma.appointmentRequest.deleteMany();
    await prisma.scanTypeConfiguration.deleteMany();
    
    // Create test scan type configuration
    await prisma.scanTypeConfiguration.create({
      data: {
        scanType: 'XRAY',
        displayName: 'X-Ray',
        description: 'Standard X-Ray imaging',
        isActive: true,
        requiresReferral: false,
        estimatedDurationMinutes: 30,
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        availableTimeSlots: ['09:00', '10:00', '11:00', '14:00', '15:00'],
        availableBodyParts: ['CHEST', 'ABDOMEN', 'LIMBS'],
        preparationInstructions: 'No special preparation required',
        bulkBillingAvailable: true,
        privatePrice: 150.00
      }
    });
  });

  describe('GET /api/booking/scan-types', () => {
    it('should return available scan types', async () => {
      const response = await request(app)
        .get('/api/booking/scan-types')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.scanTypes).toHaveLength(1);
      expect(response.body.scanTypes[0]).toMatchObject({
        value: 'XRAY',
        label: 'X-Ray',
        description: 'Standard X-Ray imaging',
        requiresReferral: false
      });
    });
  });

  describe('GET /api/booking/body-parts/:scanType', () => {
    it('should return body parts for valid scan type', async () => {
      const response = await request(app)
        .get('/api/booking/body-parts/XRAY')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.bodyParts).toHaveLength(3);
      expect(response.body.bodyParts[0]).toMatchObject({
        value: 'CHEST',
        label: 'CHEST'
      });
    });

    it('should return empty array for invalid scan type', async () => {
      const response = await request(app)
        .get('/api/booking/body-parts/INVALID')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.bodyParts).toHaveLength(0);
    });
  });

  describe('GET /api/booking/time-slots/:scanType/:date', () => {
    it('should return available time slots for valid date', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/booking/time-slots/XRAY/${dateStr}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.timeSlots).toContain('09:00');
    });

    it('should return 400 for invalid date format', async () => {
      await request(app)
        .get('/api/booking/time-slots/XRAY/invalid-date')
        .expect(400);
    });
  });

  describe('POST /api/booking/submit', () => {
    const validBookingData = {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      phoneNumber: '0412345678',
      email: 'john.doe@example.com',
      scanType: 'XRAY',
      bodyPartExamined: 'CHEST',
      hasReferral: 'false',
      termsAccepted: 'true',
      privacyAccepted: 'true'
    };

    it('should successfully submit booking request', async () => {
      const response = await request(app)
        .post('/api/booking/submit')
        .send(validBookingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.bookingReference).toBeDefined();
      expect(response.body.message).toContain('successfully');
    });

    it('should fail with missing required fields', async () => {
      const invalidData = { ...validBookingData };
      delete invalidData.firstName;

      await request(app)
        .post('/api/booking/submit')
        .send(invalidData)
        .expect(400);
    });

    it('should fail with invalid phone number', async () => {
      const invalidData = {
        ...validBookingData,
        phoneNumber: 'invalid-phone'
      };

      await request(app)
        .post('/api/booking/submit')
        .send(invalidData)
        .expect(400);
    });

    it('should fail when terms not accepted', async () => {
      const invalidData = {
        ...validBookingData,
        termsAccepted: 'false'
      };

      await request(app)
        .post('/api/booking/submit')
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /api/booking/status/:bookingReference', () => {
    let bookingReference: string;

    beforeEach(async () => {
      // Create a test booking
      const booking = await prisma.appointmentRequest.create({
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          dateOfBirth: new Date('1985-05-15'),
          phoneNumber: '+61412345678',
          scanType: 'XRAY',
          bodyPartExamined: 'CHEST',
          hasReferral: false,
          termsAccepted: true,
          privacyAccepted: true,
          bookingReference: 'TEST123456',
          status: 'SUBMITTED'
        }
      });
      bookingReference = booking.bookingReference;
    });

    it('should return booking status for valid reference', async () => {
      const response = await request(app)
        .get(`/api/booking/status/${bookingReference}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.bookingReference).toBe(bookingReference);
      expect(response.body.status).toBe('SUBMITTED');
      expect(response.body.patientName).toBe('Jane Smith');
    });

    it('should return 404 for invalid booking reference', async () => {
      await request(app)
        .get('/api/booking/status/INVALID123')
        .expect(404);
    });
  });
});