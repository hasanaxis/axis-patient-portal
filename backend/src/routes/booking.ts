import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { AppointmentBookingService } from '../services/booking/AppointmentBookingService';
import { asyncHandler } from '../middleware/errorHandler';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';

const router = express.Router();
const prisma = new PrismaClient();
const bookingService = new AppointmentBookingService(prisma);

// Set up multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPEG, and PNG files are allowed'));
    }
  }
});

// Validation middleware
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(errors.array().map(err => err.msg).join(', '));
  }
  next();
};

/**
 * GET /api/booking/scan-types
 * Get all available scan types
 */
router.get('/scan-types',
  asyncHandler(async (req, res) => {
    const scanTypes = await bookingService.getAllScanTypes();
    
    res.json({
      success: true,
      scanTypes: scanTypes.map(type => ({
        value: type.scanType,
        label: type.displayName,
        description: type.description,
        duration: type.estimatedDurationMinutes,
        requiresReferral: type.requiresReferral,
        requiresFasting: type.requiresFasting,
        fastingHours: type.fastingHours,
        contrastAvailable: type.contrastAvailable,
        wheelchairAccessible: type.wheelchairAccessible,
        pregnancyRestrictions: type.pregnancyRestrictions,
        ageRestrictions: type.ageRestrictions,
        availableDays: type.availableDays,
        availableTimeSlots: type.availableTimeSlots,
        bulkBillingAvailable: type.bulkBillingAvailable,
        privatePrice: type.privatePrice
      }))
    });
  })
);

/**
 * GET /api/booking/body-parts/:scanType
 * Get available body parts for a specific scan type
 */
router.get('/body-parts/:scanType',
  [
    param('scanType').notEmpty().withMessage('Scan type is required')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { scanType } = req.params;
    
    const bodyParts = await bookingService.getBodyPartsForScanType(scanType);
    
    res.json({
      success: true,
      bodyParts: bodyParts.map(part => ({
        value: part,
        label: part,
        description: `${scanType} scan of ${part}`,
        contrastRequired: false // This would be determined by scan type and body part combination
      }))
    });
  })
);

/**
 * GET /api/booking/preparation/:scanType
 * Get preparation instructions for a scan type
 */
router.get('/preparation/:scanType',
  [
    param('scanType').notEmpty().withMessage('Scan type is required'),
    query('bodyPart').optional().isString()
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { scanType } = req.params;
    const { bodyPart } = req.query;
    
    const config = await bookingService.getScanTypeConfiguration(scanType);
    
    if (!config) {
      throw new NotFoundError('Scan type not found');
    }
    
    let specificInstructions = '';
    if (bodyPart && config.bodyPartSpecificInstructions) {
      specificInstructions = config.bodyPartSpecificInstructions[bodyPart as string] || '';
    }
    
    res.json({
      success: true,
      instructions: {
        general: config.preparationInstructions || 'Please arrive 15 minutes early for your appointment.',
        specific: specificInstructions,
        arrival: 'Please arrive 15 minutes before your appointment time for check-in.',
        aftercare: config.aftercareInstructions || 'You may resume normal activities unless otherwise instructed.'
      }
    });
  })
);

/**
 * GET /api/booking/cost/:scanType
 * Get cost information for a scan type
 */
router.get('/cost/:scanType',
  [
    param('scanType').notEmpty().withMessage('Scan type is required'),
    query('bulkBilled').optional().isBoolean()
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { scanType } = req.params;
    const bulkBilled = req.query.bulkBilled === 'true';
    
    const config = await bookingService.getScanTypeConfiguration(scanType);
    
    if (!config) {
      throw new NotFoundError('Scan type not found');
    }
    
    res.json({
      success: true,
      costInfo: {
        medicareItemNumbers: config.medicareItemNumbers || [],
        estimatedCost: bulkBilled ? 0 : (config.privatePrice || 0),
        bulkBillingAvailable: config.bulkBillingAvailable,
        privatePrice: config.privatePrice
      }
    });
  })
);

/**
 * GET /api/booking/time-slots/:scanType/:date
 * Get available time slots for a specific scan type and date
 */
router.get('/time-slots/:scanType/:date',
  [
    param('scanType').notEmpty().withMessage('Scan type is required'),
    param('date').isISO8601().withMessage('Invalid date format')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { scanType, date } = req.params;
    
    const timeSlots = await bookingService.getAvailableTimeSlots(scanType, date);
    
    res.json({
      success: true,
      timeSlots
    });
  })
);

/**
 * POST /api/booking/submit
 * Submit a new booking request
 */
router.post('/submit',
  upload.single('referral'),
  [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
    body('phoneNumber').matches(/^(\+61|0)[2-9]\d{8}$/).withMessage('Valid Australian phone number is required'),
    body('email').optional().isEmail().withMessage('Valid email address required'),
    body('scanType').notEmpty().withMessage('Scan type is required'),
    body('bodyPartExamined').notEmpty().withMessage('Body part to be examined is required'),
    body('hasReferral').isBoolean().withMessage('Referral status is required'),
    body('termsAccepted').equals('true').withMessage('Terms of service must be accepted'),
    body('privacyAccepted').equals('true').withMessage('Privacy policy must be accepted')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const bookingData = req.body;
    
    // Handle referral file if uploaded
    let referralFile;
    if (req.file) {
      referralFile = {
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype
      };
    }
    
    const result = await bookingService.submitBookingRequest({
      ...bookingData,
      hasReferral: bookingData.hasReferral === 'true',
      termsAccepted: bookingData.termsAccepted === 'true',
      privacyAccepted: bookingData.privacyAccepted === 'true',
      marketingConsent: bookingData.marketingConsent === 'true',
      contrastRequired: bookingData.contrastRequired === 'true',
      wheelchairAccess: bookingData.wheelchairAccess === 'true',
      interpreterRequired: bookingData.interpreterRequired === 'true',
      accompaniedByCaregiver: bookingData.accompaniedByCaregiver === 'true',
      referralFile
    });
    
    res.status(result.success ? 201 : 400).json(result);
  })
);

/**
 * GET /api/booking/status/:bookingReference
 * Get booking status by reference
 */
router.get('/status/:bookingReference',
  [
    param('bookingReference').notEmpty().withMessage('Booking reference is required')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { bookingReference } = req.params;
    
    const booking = await bookingService.getBookingByReference(bookingReference);
    
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }
    
    res.json({
      success: true,
      bookingReference: booking.bookingReference,
      status: booking.status,
      scanType: booking.scanType,
      bodyPartExamined: booking.bodyPartExamined,
      submittedAt: booking.submittedAt,
      lastUpdated: booking.updatedAt,
      patientName: `${booking.firstName} ${booking.lastName}`,
      statusHistory: booking.statusHistory.map(history => ({
        status: history.toStatus,
        changedAt: history.createdAt,
        reason: history.reason
      }))
    });
  })
);

/**
 * POST /api/booking/upload-referral/:bookingReference
 * Upload referral file for existing booking
 */
router.post('/upload-referral/:bookingReference',
  upload.single('referral'),
  [
    param('bookingReference').notEmpty().withMessage('Booking reference is required')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { bookingReference } = req.params;
    
    if (!req.file) {
      throw new ValidationError('Referral file is required');
    }
    
    const booking = await bookingService.getBookingByReference(bookingReference);
    
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }
    
    // Handle file upload (this would normally upload to cloud storage)
    const referralUrl = `https://storage.axisimaging.com.au/referrals/${bookingReference}/${Date.now()}.${req.file.originalname.split('.').pop()}`;
    
    // Update booking with referral information
    await prisma.appointmentRequest.update({
      where: { bookingReference },
      data: {
        referralUploadUrl: referralUrl,
        referralOriginalName: req.file.originalname,
        status: booking.status === 'REFERRAL_REQUIRED' ? 'SUBMITTED' : booking.status
      }
    });
    
    res.json({
      success: true,
      referralUrl,
      message: 'Referral uploaded successfully'
    });
  })
);

export default router;