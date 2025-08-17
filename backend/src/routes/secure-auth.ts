import { Router, Request, Response } from 'express';
import { secureAuthService } from '../services/secure-auth-service';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 attempts per minute
  message: 'Too many OTP attempts. Please wait before trying again.',
});

// ===== REGISTRATION FLOW =====

// Step 1: Verify patient exists in system
router.post('/register/verify-patient',
  authLimiter,
  [
    body('phoneNumber')
      .notEmpty().withMessage('Phone number is required')
      .matches(/^(\+?61|0)?4\d{8}$/).withMessage('Invalid Australian mobile number'),
    body('dateOfBirth')
      .notEmpty().withMessage('Date of birth is required')
      .isISO8601().withMessage('Invalid date format')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const result = await secureAuthService.verifyPatientExists(req.body);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in verify-patient:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred. Please try again.'
      });
    }
  }
);

// Step 2: Verify OTP
router.post('/register/verify-otp',
  otpLimiter,
  [
    body('otp')
      .notEmpty().withMessage('OTP is required')
      .matches(/^\d{6}$/).withMessage('OTP must be 6 digits'),
    body('verificationToken')
      .notEmpty().withMessage('Verification token is required')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const result = await secureAuthService.verifyOTP(
        req.body.otp,
        req.body.verificationToken
      );
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in verify-otp:', error);
      res.status(500).json({
        success: false,
        message: 'Verification failed. Please try again.'
      });
    }
  }
);

// Step 3: Create account
router.post('/register/create-account',
  [
    body('email')
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email address')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number and special character'),
    body('registrationToken')
      .notEmpty().withMessage('Registration token is required'),
    body('enableTwoFactor')
      .optional()
      .isBoolean(),
    body('twoFactorMethod')
      .optional()
      .isIn(['SMS', 'AUTHENTICATOR_APP'])
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const result = await secureAuthService.createAccount(
        req.body,
        req.body.registrationToken
      );
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in create-account:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create account. Please try again.'
      });
    }
  }
);

// ===== LOGIN FLOW =====

// Login with email/password
router.post('/login',
  authLimiter,
  [
    body('email')
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email address')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required'),
    body('twoFactorCode')
      .optional()
      .matches(/^\d{6}$/).withMessage('2FA code must be 6 digits')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const result = await secureAuthService.login(req.body);
      
      if (result.success) {
        res.json(result);
      } else if (result.requiresTwoFactor) {
        res.status(200).json(result); // 2FA required
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      console.error('Error in login:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed. Please try again.'
      });
    }
  }
);

// ===== LOGOUT =====

router.post('/logout',
  async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'No auth token provided'
        });
      }

      const token = authHeader.substring(7);
      const result = await secureAuthService.logout(token);
      
      res.json(result);
    } catch (error) {
      console.error('Error in logout:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed.'
      });
    }
  }
);

// ===== RIS WEBHOOK =====

// Webhook endpoint for RIS to create patient invitations
router.post('/webhook/ris/patient-invitation',
  [
    body('patientNumber').notEmpty(),
    body('firstName').notEmpty(),
    body('lastName').notEmpty(),
    body('phoneNumber').notEmpty(),
    body('dateOfBirth').notEmpty().isISO8601(),
    body('studyAccessionNumber').optional(),
    body('risMessageId').optional()
  ],
  async (req: Request, res: Response) => {
    try {
      // Verify webhook signature (implement based on RIS requirements)
      const signature = req.headers['x-ris-signature'];
      // TODO: Implement signature verification

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const result = await secureAuthService.createPatientInvitation(req.body);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in RIS webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process invitation.'
      });
    }
  }
);

// ===== CHECK AUTH STATUS =====

router.get('/status',
  async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.json({
          authenticated: false
        });
      }

      // Verify token and check session
      // Implementation depends on your JWT verification
      
      res.json({
        authenticated: true
      });
    } catch (error) {
      res.json({
        authenticated: false
      });
    }
  }
);

export default router;