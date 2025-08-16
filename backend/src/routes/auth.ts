import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authService } from '../services/authService';
import { otpService } from '../services/otpService';
import { invitationService } from '../services/invitationService';
import { smsService } from '../services/smsService';
import { authenticate, requirePatient, auditRequest } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import { ValidationError, AuthenticationError, NotFoundError } from '../middleware/errorHandler';
import { logger, healthcareLogger } from '../utils/logger';
import { config } from '../config/config';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(errors.array().map(err => err.msg).join(', '));
  }
  next();
};

// Validation rules
const phoneValidation = body('phoneNumber')
  .notEmpty()
  .withMessage('Phone number is required')
  .matches(/^(\+61|0)[2-9]\d{8}$/)
  .withMessage('Please provide a valid Australian phone number');

const passwordValidation = body('password')
  .isLength({ min: config.PASSWORD_MIN_LENGTH })
  .withMessage(`Password must be at least ${config.PASSWORD_MIN_LENGTH} characters long`)
  .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
  .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');

const otpValidation = body('otp')
  .isLength({ min: 6, max: 6 })
  .isNumeric()
  .withMessage('OTP must be a 6-digit number');

// Apply audit logging to all auth routes
router.use(auditRequest);

// === INVITATION VALIDATION ===
/**
 * POST /api/auth/validate-invitation
 * Validate registration invitation token
 */
router.post('/validate-invitation',
  [
    body('token').notEmpty().withMessage('Invitation token is required'),
    body('code').optional().isLength({ min: 6, max: 6 }).isNumeric().withMessage('Code must be 6 digits')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { token, code } = req.body;

    const validation = await invitationService.validateInvitation(token, code);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }

    // Return patient information for registration form pre-fill
    const patientInfo = {
      firstName: validation.patient!.user.firstName,
      lastName: validation.patient!.user.lastName,
      dateOfBirth: validation.patient!.user.dateOfBirth,
      phoneNumber: validation.patient!.user.phoneNumber,
      email: validation.patient!.user.email,
      hasCompletedStudies: validation.patient!.studies.length > 0,
      recentStudies: validation.patient!.studies.map(study => ({
        id: study.id,
        studyDate: study.studyDate,
        modality: study.modality,
        bodyPartExamined: study.bodyPartExamined,
        studyDescription: study.studyDescription
      }))
    };

    res.json({
      success: true,
      message: 'Invitation is valid',
      patientInfo,
      facilityInfo: {
        name: config.FACILITY_NAME,
        phone: config.FACILITY_PHONE,
        email: config.FACILITY_EMAIL
      }
    });
  })
);

// === REGISTRATION ===
/**
 * POST /api/auth/register
 * Register new patient account (invitation-only)
 */
router.post('/register',
  [
    phoneValidation,
    passwordValidation,
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
    body('invitationToken').notEmpty().withMessage('Invitation token is required'),
    body('acceptedTerms').equals('true').withMessage('You must accept the terms of service'),
    body('acceptedPrivacy').equals('true').withMessage('You must accept the privacy policy'),
    body('deviceInfo').optional().isObject()
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { 
      phoneNumber, 
      password, 
      invitationToken, 
      acceptedTerms, 
      acceptedPrivacy, 
      deviceInfo 
    } = req.body;

    const userSession = await authService.registerPatient({
      phoneNumber,
      password,
      acceptedTerms: acceptedTerms === 'true',
      acceptedPrivacy: acceptedPrivacy === 'true',
      invitationToken,
      deviceInfo
    });

    // Send welcome SMS
    try {
      await smsService.sendWelcomeSMS(phoneNumber);
    } catch (error) {
      logger.warn('Failed to send welcome SMS', { error });
      // Don't fail registration if SMS fails
    }

    // Return success response with tokens
    res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to Axis Imaging Patient Portal.',
      user: {
        id: userSession.user.id,
        firstName: userSession.user.firstName,
        lastName: userSession.user.lastName,
        phoneNumber: userSession.user.phoneNumber,
        email: userSession.user.email,
        isVerified: userSession.user.isVerified,
        patient: userSession.user.patient ? {
          id: userSession.user.patient.id,
          patientNumber: userSession.user.patient.patientNumber
        } : null
      },
      tokens: {
        accessToken: userSession.token,
        refreshToken: userSession.refreshToken,
        expiresIn: config.JWT_EXPIRES_IN
      },
      sessionId: userSession.sessionId
    });
  })
);

// === LOGIN ===
/**
 * POST /api/auth/login
 * Patient login with phone number and password
 */
router.post('/login',
  [
    phoneValidation,
    body('password').notEmpty().withMessage('Password is required'),
    body('rememberMe').optional().isBoolean(),
    body('deviceInfo').optional().isObject()
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { phoneNumber, password, rememberMe, deviceInfo } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    const userSession = await authService.loginPatient(
      { phoneNumber, password, rememberMe, deviceInfo },
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: userSession.user.id,
        firstName: userSession.user.firstName,
        lastName: userSession.user.lastName,
        phoneNumber: userSession.user.phoneNumber,
        email: userSession.user.email,
        lastLoginAt: userSession.user.lastLoginAt,
        patient: userSession.user.patient ? {
          id: userSession.user.patient.id,
          patientNumber: userSession.user.patient.patientNumber
        } : null
      },
      tokens: {
        accessToken: userSession.token,
        refreshToken: userSession.refreshToken,
        expiresIn: config.JWT_EXPIRES_IN
      },
      sessionId: userSession.sessionId
    });
  })
);

// === LOGOUT ===
/**
 * POST /api/auth/logout
 * Logout current session
 */
router.post('/logout',
  authenticate({ required: true }),
  asyncHandler(async (req, res) => {
    const sessionId = req.session?.sessionId;
    const userId = req.user?.id;

    if (sessionId) {
      await authService.logoutPatient(sessionId, userId);
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });
  })
);

// === TOKEN REFRESH ===
/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    const tokens = await authService.refreshToken(refreshToken);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      tokens: {
        accessToken: tokens.token,
        refreshToken: tokens.refreshToken,
        expiresIn: config.JWT_EXPIRES_IN
      }
    });
  })
);

// === OTP OPERATIONS ===
/**
 * POST /api/auth/send-otp
 * Send OTP for phone verification or password reset
 */
router.post('/send-otp',
  [
    phoneValidation,
    body('purpose').isIn(['phone_verification', 'password_reset']).withMessage('Invalid OTP purpose')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { phoneNumber, purpose } = req.body;

    const success = await otpService.generateAndSendOTP({
      phoneNumber,
      purpose,
      userId: req.user?.id
    });

    if (success) {
      res.json({
        success: true,
        message: 'OTP sent successfully',
        expiresIn: config.OTP_EXPIRES_IN_MINUTES,
        attemptsRemaining: config.OTP_MAX_ATTEMPTS
      });
    } else {
      throw new Error('Failed to send OTP');
    }
  })
);

/**
 * POST /api/auth/verify-otp
 * Verify OTP for phone verification
 */
router.post('/verify-otp',
  [
    phoneValidation,
    otpValidation,
    body('purpose').isIn(['phone_verification', 'password_reset']).withMessage('Invalid OTP purpose')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { phoneNumber, otp, purpose } = req.body;

    const result = await otpService.verifyOTP({
      phoneNumber,
      otp,
      purpose,
      userId: req.user?.id
    });

    if (result.isValid) {
      res.json({
        success: true,
        message: 'OTP verified successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        isExpired: result.isExpired,
        attemptsRemaining: result.attemptsRemaining
      });
    }
  })
);

// === PASSWORD RESET ===
/**
 * POST /api/auth/reset-password
 * Reset password using verified OTP
 */
router.post('/reset-password',
  [
    phoneValidation,
    otpValidation,
    passwordValidation,
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { phoneNumber, otp, password } = req.body;

    // First verify the OTP
    const otpResult = await otpService.verifyOTP({
      phoneNumber,
      otp,
      purpose: 'password_reset'
    });

    if (!otpResult.isValid) {
      return res.status(400).json({
        success: false,
        error: otpResult.error,
        isExpired: otpResult.isExpired,
        attemptsRemaining: otpResult.attemptsRemaining
      });
    }

    // Find user and update password
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Clean phone number
    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    const formattedPhone = cleanedPhone.startsWith('61') ? `+${cleanedPhone}` :
                          cleanedPhone.startsWith('04') ? `+61${cleanedPhone.substring(1)}` :
                          cleanedPhone.length === 9 ? `+61${cleanedPhone}` : phoneNumber;

    const user = await prisma.user.findUnique({
      where: { phoneNumber: formattedPhone }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Hash new password
    const passwordHash = await authService.hashPassword(password);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    // Invalidate all existing sessions for security
    await prisma.session.updateMany({
      where: { userId: user.id },
      data: {
        isActive: false,
        terminatedAt: new Date(),
        terminationReason: 'PASSWORD_RESET'
      }
    });

    // Log password reset
    healthcareLogger.authEvent('PASSWORD_RESET', user.id, {
      phoneNumber: phoneNumber.substring(0, 4) + '***' + phoneNumber.substring(phoneNumber.length - 2)
    });

    res.json({
      success: true,
      message: 'Password reset successful. Please login with your new password.'
    });
  })
);

// === USER PROFILE ===
/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get('/profile',
  requirePatient,
  asyncHandler(async (req, res) => {
    const user = req.user!;

    res.json({
      success: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        isVerified: user.isVerified,
        lastLoginAt: user.lastLoginAt,
        preferredLanguage: user.preferredLanguage,
        culturalBackground: user.culturalBackground,
        patient: user.patient ? {
          id: user.patient.id,
          patientNumber: user.patient.patientNumber,
          mrn: user.patient.mrn,
          streetAddress: user.patient.streetAddress,
          suburb: user.patient.suburb,
          state: user.patient.state,
          postcode: user.patient.postcode,
          country: user.patient.country,
          preferredContactMethod: user.patient.preferredContactMethod,
          allergies: user.patient.allergies,
          medicalConditions: user.patient.medicalConditions,
          allowSmsReminders: user.patient.allowSmsReminders,
          allowEmailReminders: user.patient.allowEmailReminders
        } : null
      }
    });
  })
);

// === SESSION INFO ===
/**
 * GET /api/auth/session
 * Get current session information
 */
router.get('/session',
  authenticate({ required: true }),
  asyncHandler(async (req, res) => {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const session = await prisma.session.findUnique({
      where: { id: req.session!.sessionId },
      select: {
        id: true,
        createdAt: true,
        lastActivityAt: true,
        expiresAt: true,
        deviceInfo: true,
        ipAddress: true,
        userAgent: true,
        isActive: true
      }
    });

    res.json({
      success: true,
      session
    });
  })
);

// === CHECK AUTH STATUS ===
/**
 * GET /api/auth/check
 * Check if user is authenticated (for frontend auth state)
 */
router.get('/check',
  authenticate({ required: false }),
  asyncHandler(async (req, res) => {
    if (req.user) {
      res.json({
        authenticated: true,
        user: {
          id: req.user.id,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          role: req.user.role,
          isPatient: req.user.role === 'PATIENT',
          patientId: req.user.patient?.id
        }
      });
    } else {
      res.json({
        authenticated: false
      });
    }
  })
);

export default router;