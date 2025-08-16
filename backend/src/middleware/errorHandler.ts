import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logger, healthcareLogger } from '../utils/logger';

export class AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
  
  constructor(message: string, statusCode?: number, isOperational?: boolean) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
  }
}

// Custom error classes
export class ValidationError extends Error {
  statusCode = 400;
  isOperational = true;
  
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  statusCode = 401;
  isOperational = true;
  
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  statusCode = 403;
  isOperational = true;
  
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  isOperational = true;
  
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  statusCode = 409;
  isOperational = true;
  
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class TooManyRequestsError extends Error {
  statusCode = 429;
  isOperational = true;
  
  constructor(message: string = 'Too many requests') {
    super(message);
    this.name = 'TooManyRequestsError';
  }
}

// Healthcare-specific errors
export class HIPAAViolationError extends Error {
  statusCode = 403;
  isOperational = true;
  
  constructor(message: string = 'HIPAA compliance violation detected') {
    super(message);
    this.name = 'HIPAAViolationError';
  }
}

export class PatientNotFoundError extends Error {
  statusCode = 404;
  isOperational = true;
  
  constructor(message: string = 'Patient not found in Axis Imaging system') {
    super(message);
    this.name = 'PatientNotFoundError';
  }
}

export class RegistrationNotAllowedError extends Error {
  statusCode = 403;
  isOperational = true;
  
  constructor(message: string = 'Registration not allowed - patient must have completed scan at Axis Imaging') {
    super(message);
    this.name = 'RegistrationNotAllowedError';
  }
}

// Handle different types of errors
const handlePrismaError = (error: any): AppError => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return new ConflictError('A record with this information already exists');
      case 'P2014':
        return new ValidationError('Invalid data provided');
      case 'P2003':
        return new ValidationError('Referenced record does not exist');
      case 'P2025':
        return new NotFoundError('Record not found');
      default:
        return new AppError(`Database error: ${error.message}`);
    }
  }
  
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return new AppError('Database connection error');
  }
  
  if (error instanceof Prisma.PrismaClientValidationError) {
    return new ValidationError('Invalid data format');
  }
  
  return new AppError('Database error occurred');
};

// Determine if error is operational (expected) or programming error
const isOperationalError = (error: AppError): boolean => {
  if (error.isOperational !== undefined) {
    return error.isOperational;
  }
  
  // Consider certain error types as operational
  const operationalErrors = [
    'ValidationError',
    'AuthenticationError',
    'AuthorizationError',
    'NotFoundError',
    'ConflictError',
    'TooManyRequestsError',
    'HIPAAViolationError',
    'PatientNotFoundError',
    'RegistrationNotAllowedError'
  ];
  
  return operationalErrors.includes(error.name);
};

// Main error handler middleware
export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let appError = error;

  // Convert Prisma errors to AppError
  if (error.name?.startsWith('Prisma')) {
    appError = handlePrismaError(error);
  }

  // Set default values
  const statusCode = appError.statusCode || 500;
  const isOperational = isOperationalError(appError);

  // Log the error
  const logData = {
    error: {
      name: appError.name,
      message: appError.message,
      stack: appError.stack,
      statusCode,
      isOperational
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || null
    }
  };

  if (isOperational) {
    logger.warn('Operational error occurred', logData);
  } else {
    logger.error('Programming error occurred', logData);
  }

  // Log security incidents
  if (appError.name === 'AuthenticationError' || 
      appError.name === 'AuthorizationError' ||
      appError.name === 'HIPAAViolationError') {
    healthcareLogger.securityIncident(
      `${appError.name}: ${appError.message}`,
      appError.name === 'HIPAAViolationError' ? 'critical' : 'medium',
      {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id
      }
    );
  }

  // Prepare error response
  const errorResponse: any = {
    error: true,
    message: appError.message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // Add additional details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = appError.stack;
    errorResponse.name = appError.name;
    if (appError.code) {
      errorResponse.code = appError.code;
    }
  }

  // Don't expose internal errors in production
  if (!isOperational && process.env.NODE_ENV === 'production') {
    errorResponse.message = 'Internal server error';
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler for undefined routes
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

export default errorHandler;