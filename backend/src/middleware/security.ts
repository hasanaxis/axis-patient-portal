import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { config } from '../config/config'

// Rate limiting middleware
export const createRateLimiter = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: message || 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn(`Rate limit exceeded for IP: ${req.ip}, endpoint: ${req.path}`)
      res.status(429).json({ 
        error: 'Too many requests', 
        retryAfter: Math.ceil(windowMs / 1000) 
      })
    }
  })
}

// General rate limiter
export const generalRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window
  'Too many requests from this IP, please try again later.'
)

// Strict rate limiter for auth endpoints
export const authRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  10, // 10 requests per window
  'Too many authentication attempts, please try again later.'
)

// API rate limiter
export const apiRateLimit = createRateLimiter(
  1 * 60 * 1000, // 1 minute
  60, // 60 requests per minute
  'API rate limit exceeded, please slow down.'
)

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow DICOM image embedding
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
})

// Request logging middleware
export const requestLogger = (req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const start = Date.now()
  
  // Log request
  console.log(`${new Date().toISOString()} ${req.method} ${req.path} - IP: ${req.ip}`)
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`${new Date().toISOString()} ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`)
    
    // Log slow requests
    if (duration > 5000) {
      console.warn(`Slow request detected: ${req.method} ${req.path} took ${duration}ms`)
    }
    
    // Log errors
    if (res.statusCode >= 400) {
      console.error(`Error response: ${req.method} ${req.path} - ${res.statusCode}`)
    }
  })
  
  _next()
}

// Audit logging for healthcare compliance
export const auditLogger = (action: string, userId?: string, resourceId?: string, details?: any) => {
  const auditLog = {
    timestamp: new Date().toISOString(),
    action,
    userId: userId || 'anonymous',
    resourceId,
    details,
    ip: 'logged_separately', // IP logged separately for privacy
    compliance: 'HIPAA_EQUIVALENT'
  }
  
  console.log('AUDIT:', JSON.stringify(auditLog))
  
  // In production, this would be sent to a secure audit logging service
  // that meets healthcare compliance requirements
}

// Error handling middleware
export const errorHandler = (
  error: any, 
  req: express.Request, 
  res: express.Response, 
  _next: express.NextFunction
) => {
  console.error('Application error:', error)
  
  // Audit log the error
  auditLogger('ERROR', (req as any).user?.id, undefined, {
    error: error.message,
    path: req.path,
    method: req.method
  })
  
  // Don't leak error details in production
  const isDevelopment = config.NODE_ENV === 'development'
  
  res.status(error.statusCode || 500).json({
    error: 'Internal server error',
    message: isDevelopment ? error.message : 'An error occurred',
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { stack: error.stack })
  })
}

// CORS configuration
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = config.NODE_ENV === 'production' 
      ? ['https://portal.axisimaging.com.au', 'https://app.axisimaging.com.au']
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:8081']
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      console.warn(`CORS blocked origin: ${origin}`)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
}

// Health check middleware
export const healthCheck = async (_req: express.Request, res: express.Response) => {
  try {
    // Check database connectivity (you would add actual health checks here)
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Axis Imaging Patient Portal API',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: config.NODE_ENV
    }
    
    res.json(healthStatus)
  } catch (error) {
    console.error('Health check failed:', error)
    res.status(503).json({
      status: 'unhealthy',
      error: 'Service unavailable',
      timestamp: new Date().toISOString()
    })
  }
}

export default {
  generalRateLimit,
  authRateLimit,
  apiRateLimit,
  securityHeaders,
  requestLogger,
  auditLogger,
  errorHandler,
  corsOptions,
  healthCheck
}