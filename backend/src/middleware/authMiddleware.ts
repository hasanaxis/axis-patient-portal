import { Request, Response, NextFunction } from 'express';
import { User, Patient, UserRole } from '@prisma/client';
import { authService, JWTPayload } from '../services/authService';
import { logger, healthcareLogger } from '../utils/logger';
import { AuthenticationError, AuthorizationError, HIPAAViolationError, ValidationError, NotFoundError } from './errorHandler';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: User & { patient?: Patient };
      session?: {
        id: string;
        userId: string;
        sessionId: string;
      };
      jwtPayload?: JWTPayload;
    }
  }
}

// Interface for authentication options
interface AuthOptions {
  required?: boolean;
  roles?: UserRole[];
  requirePatientAccess?: boolean;
  patientResourceAccess?: boolean;
}

// Extract JWT token from request
export const extractToken = (req: Request): string | null => {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie (if using HTTP-only cookies for additional security)
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  // Check query parameter (for special cases like websocket upgrades)
  if (req.query.token && typeof req.query.token === 'string') {
    return req.query.token;
  }

  return null;
};

// Main authentication middleware
export const authenticate = (options: AuthOptions = { required: true }) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = extractToken(req);

      // If no token and authentication is not required, continue
      if (!token && !options.required) {
        return next();
      }

      // If no token and authentication is required, throw error
      if (!token) {
        throw new AuthenticationError('Authentication token required');
      }

      // Verify JWT token
      const payload = authService.verifyToken(token);
      req.jwtPayload = payload;

      // Validate session
      const user = await authService.validateSession(payload.sessionId);
      if (!user) {
        healthcareLogger.securityIncident('INVALID_SESSION_ACCESS', 'medium', {
          userId: payload.userId,
          sessionId: payload.sessionId,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        throw new AuthenticationError('Invalid or expired session');
      }

      // Check if user is active
      if (!user.isActive) {
        healthcareLogger.securityIncident('INACTIVE_USER_ACCESS', 'high', {
          userId: user.id,
          sessionId: payload.sessionId,
          ip: req.ip
        });
        throw new AuthenticationError('Account has been deactivated');
      }

      // Attach user to request
      req.user = user;
      req.session = {
        id: payload.sessionId,
        userId: user.id,
        sessionId: payload.sessionId
      };

      // Role-based authorization
      if (options.roles && options.roles.length > 0) {
        if (!options.roles.includes(user.role)) {
          healthcareLogger.securityIncident('UNAUTHORIZED_ROLE_ACCESS', 'high', {
            userId: user.id,
            userRole: user.role,
            requiredRoles: options.roles,
            path: req.path,
            ip: req.ip
          });
          throw new AuthorizationError(`Access denied. Required roles: ${options.roles.join(', ')}`);
        }
      }

      // Patient-specific access control
      if (options.requirePatientAccess) {
        if (user.role !== 'PATIENT' || !user.patient) {
          throw new AuthorizationError('Patient access required');
        }
      }

      // Log successful authentication
      logger.debug('User authenticated successfully', {
        userId: user.id,
        role: user.role,
        sessionId: payload.sessionId,
        path: req.path
      });

      next();

    } catch (error) {
      // Log authentication failure
      logger.warn('Authentication failed', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      next(error);
    }
  };
};

// Middleware to require specific patient access (HIPAA compliance)
export const requirePatientAccess = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user || !req.user.patient) {
    throw new AuthorizationError('Patient account required');
  }
  next();
};

// Middleware to check if user can access specific patient data
export const checkPatientDataAccess = (patientIdParam: string = 'patientId') => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const requestedPatientId = req.params[patientIdParam] || req.body[patientIdParam] || req.query[patientIdParam];
      
      if (!requestedPatientId) {
        throw new ValidationError('Patient ID is required');
      }

      // If user is not authenticated, deny access
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      // Allow healthcare staff to access any patient data
      if (['RADIOLOGIST', 'ADMIN', 'TECHNOLOGIST', 'SUPER_ADMIN'].includes(req.user.role)) {
        // Log healthcare staff accessing patient data (HIPAA compliance)
        healthcareLogger.patientAccess(requestedPatientId, req.user.id, 'STAFF_ACCESS', {
          staffRole: req.user.role,
          path: req.path,
          method: req.method
        });
        return next();
      }

      // For patients, only allow access to their own data
      if (req.user.role === 'PATIENT') {
        if (!req.user.patient) {
          throw new HIPAAViolationError('Patient record not found');
        }

        if (req.user.patient.id !== requestedPatientId) {
          // Log potential HIPAA violation attempt
          healthcareLogger.securityIncident('PATIENT_DATA_ACCESS_VIOLATION', 'critical', {
            userId: req.user.id,
            patientId: req.user.patient.id,
            requestedPatientId,
            path: req.path,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });

          throw new HIPAAViolationError('Access denied: You can only access your own medical information');
        }

        // Log patient accessing their own data
        healthcareLogger.patientAccess(requestedPatientId, req.user.id, 'SELF_ACCESS', {
          path: req.path,
          method: req.method
        });

        return next();
      }

      // All other roles are denied
      throw new AuthorizationError('Insufficient permissions to access patient data');

    } catch (error) {
      next(error);
    }
  };
};

// Middleware to check study access permissions
export const checkStudyAccess = (studyIdParam: string = 'studyId') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studyId = req.params[studyIdParam] || req.body[studyIdParam] || req.query[studyIdParam];
      
      if (!studyId) {
        throw new ValidationError('Study ID is required');
      }

      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      // Import prisma here to avoid circular dependency
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      // Get study with patient information
      const study = await prisma.study.findUnique({
        where: { id: studyId },
        include: { patient: true }
      });

      if (!study) {
        throw new NotFoundError('Study not found');
      }

      // Healthcare staff can access any study
      if (['RADIOLOGIST', 'ADMIN', 'TECHNOLOGIST', 'SUPER_ADMIN'].includes(req.user.role)) {
        healthcareLogger.medicalDataAccess('STUDY', studyId, req.user.id, 'STAFF_ACCESS');
        return next();
      }

      // Patients can only access their own studies
      if (req.user.role === 'PATIENT') {
        if (!req.user.patient || req.user.patient.id !== study.patientId) {
          healthcareLogger.securityIncident('STUDY_ACCESS_VIOLATION', 'critical', {
            userId: req.user.id,
            patientId: req.user.patient?.id,
            studyPatientId: study.patientId,
            studyId,
            path: req.path,
            ip: req.ip
          });

          throw new HIPAAViolationError('Access denied: You can only access your own medical studies');
        }

        healthcareLogger.medicalDataAccess('STUDY', studyId, req.user.id, 'SELF_ACCESS');
        return next();
      }

      throw new AuthorizationError('Insufficient permissions to access study data');

    } catch (error) {
      next(error);
    }
  };
};

// Middleware for optional authentication (for public endpoints that benefit from user context)
export const optionalAuth = authenticate({ required: false });

// Middleware for patient-only routes
export const requirePatient = authenticate({ 
  required: true, 
  roles: ['PATIENT'],
  requirePatientAccess: true 
});

// Middleware for healthcare staff routes
export const requireStaff = authenticate({ 
  required: true, 
  roles: ['RADIOLOGIST', 'ADMIN', 'TECHNOLOGIST', 'SUPER_ADMIN'] 
});

// Middleware for admin routes
export const requireAdmin = authenticate({ 
  required: true, 
  roles: ['ADMIN', 'SUPER_ADMIN'] 
});

// Middleware to log all authenticated requests (for audit compliance)
export const auditRequest = (req: Request, res: Response, next: NextFunction) => {
  if (req.user) {
    healthcareLogger.systemAccess(
      `${req.method} ${req.path}`,
      req.user.id,
      'API_ACCESS',
      {
        method: req.method,
        path: req.path,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    );
  }
  next();
};

// Middleware to ensure HTTPS in production (HIPAA requirement)
export const requireHTTPS = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    healthcareLogger.securityIncident('HTTP_ACCESS_ATTEMPT', 'medium', {
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(403).json({
      error: 'HTTPS required',
      message: 'All requests must use HTTPS for security compliance'
    });
  }
  next();
};

// Middleware to validate session IP consistency (basic session hijacking protection)
export const validateSessionIP = async (req: Request, res: Response, next: NextFunction) => {
  if (req.session && req.user) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const session = await prisma.session.findUnique({
        where: { id: req.session.sessionId }
      });

      if (session && session.ipAddress && session.ipAddress !== req.ip) {
        healthcareLogger.securityIncident('SESSION_IP_MISMATCH', 'high', {
          userId: req.user.id,
          sessionId: req.session.sessionId,
          originalIP: session.ipAddress,
          currentIP: req.ip,
          userAgent: req.get('User-Agent')
        });

        // Optionally terminate session for security
        await prisma.session.update({
          where: { id: req.session.sessionId },
          data: {
            isActive: false,
            terminatedAt: new Date(),
            terminationReason: 'SECURITY'
          }
        });

        throw new AuthenticationError('Session security validation failed');
      }
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      // Log error but don't fail the request for database issues
      logger.error('Session IP validation failed', { error });
    }
  }
  next();
};

export default {
  authenticate,
  requirePatientAccess,
  checkPatientDataAccess,
  checkStudyAccess,
  optionalAuth,
  requirePatient,
  requireStaff,
  requireAdmin,
  auditRequest,
  requireHTTPS,
  validateSessionIP
};