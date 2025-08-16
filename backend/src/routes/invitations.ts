import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { invitationService } from '../services/invitationService';
import { requireStaff, requireAdmin, auditRequest } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import { ValidationError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(errors.array().map(err => err.msg).join(', '));
  }
  next();
};

// Apply audit logging to all invitation routes
router.use(auditRequest);

// === CREATE INVITATION ===
/**
 * POST /api/invitations
 * Create a new patient invitation (staff only)
 */
router.post('/',
  requireStaff,
  [
    body('patientId').notEmpty().isUUID().withMessage('Valid patient ID is required'),
    body('studyId').optional().isUUID().withMessage('Study ID must be a valid UUID'),
    body('customMessage').optional().isString().isLength({ max: 500 }).withMessage('Custom message too long'),
    body('sendImmediately').optional().isBoolean()
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { patientId, studyId, customMessage, sendImmediately = true } = req.body;
    const sentBy = req.user!.id;

    // Create invitation
    const invitation = await invitationService.createInvitation({
      patientId,
      studyId,
      sentBy,
      customMessage
    });

    // Send SMS invitation if requested
    let smsSuccess = false;
    if (sendImmediately) {
      try {
        smsSuccess = await invitationService.sendInvitationSMS(invitation.id);
      } catch (error) {
        logger.warn('Failed to send invitation SMS', { 
          invitationId: invitation.id, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Don't fail the invitation creation if SMS fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Invitation created successfully',
      invitation: {
        id: invitation.id,
        patientId: invitation.patientId,
        token: invitation.token.substring(0, 8) + '...', // Partial token for verification
        shortCode: invitation.shortCode,
        expiresAt: invitation.expiresAt,
        sentAt: invitation.sentAt,
        smsSent: smsSuccess
      },
      registrationLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?token=${invitation.token}&code=${invitation.shortCode}`
    });
  })
);

// === SEND INVITATION SMS ===
/**
 * POST /api/invitations/:id/send
 * Send or resend invitation SMS
 */
router.post('/:id/send',
  requireStaff,
  [
    param('id').isUUID().withMessage('Valid invitation ID is required')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const smsSuccess = await invitationService.sendInvitationSMS(id);

    res.json({
      success: true,
      message: smsSuccess ? 'Invitation SMS sent successfully' : 'Failed to send SMS',
      smsSent: smsSuccess
    });
  })
);

// === GET INVITATION DETAILS ===
/**
 * GET /api/invitations/:id
 * Get invitation details (staff only)
 */
router.get('/:id',
  requireStaff,
  [
    param('id').isUUID().withMessage('Valid invitation ID is required')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const invitation = await prisma.invitation.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                email: true,
                dateOfBirth: true,
                isVerified: true
              }
            }
          }
        }
      }
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found'
      });
    }

    res.json({
      success: true,
      invitation: {
        id: invitation.id,
        invitationType: invitation.invitationType,
        phoneNumber: invitation.phoneNumber,
        email: invitation.email,
        token: invitation.token.substring(0, 8) + '...', // Partial token
        shortCode: invitation.shortCode,
        expiresAt: invitation.expiresAt,
        isUsed: invitation.isUsed,
        usedAt: invitation.usedAt,
        sentAt: invitation.sentAt,
        reminderSentAt: invitation.reminderSentAt,
        attemptCount: invitation.attemptCount,
        maxAttempts: invitation.maxAttempts,
        sentBy: invitation.sentBy,
        purpose: invitation.purpose,
        metadata: invitation.metadata,
        patient: {
          id: invitation.patient.id,
          patientNumber: invitation.patient.patientNumber,
          user: invitation.patient.user
        },
        createdAt: invitation.createdAt
      }
    });
  })
);

// === LIST INVITATIONS ===
/**
 * GET /api/invitations
 * List invitations with filtering and pagination (staff only)
 */
router.get('/',
  requireStaff,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn(['active', 'used', 'expired', 'all']).withMessage('Invalid status filter'),
    query('patientId').optional().isUUID().withMessage('Patient ID must be valid UUID'),
    query('search').optional().isString().isLength({ max: 100 }).withMessage('Search term too long')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string || 'all';
    const patientId = req.query.patientId as string;
    const search = req.query.search as string;

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Build where clause
    const where: any = {};

    // Filter by status
    if (status === 'active') {
      where.isUsed = false;
      where.expiresAt = { gt: new Date() };
    } else if (status === 'used') {
      where.isUsed = true;
    } else if (status === 'expired') {
      where.isUsed = false;
      where.expiresAt = { lte: new Date() };
    }

    // Filter by patient
    if (patientId) {
      where.patientId = patientId;
    }

    // Search functionality
    if (search) {
      where.OR = [
        { phoneNumber: { contains: search } },
        { email: { contains: search } },
        { patient: {
          user: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } }
            ]
          }
        }}
      ];
    }

    // Get invitations with pagination
    const [invitations, total] = await Promise.all([
      prisma.invitation.findMany({
        where,
        include: {
          patient: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phoneNumber: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.invitation.count({ where })
    ]);

    // Format response
    const formattedInvitations = invitations.map(invitation => ({
      id: invitation.id,
      patientId: invitation.patientId,
      phoneNumber: invitation.phoneNumber,
      email: invitation.email,
      invitationType: invitation.invitationType,
      expiresAt: invitation.expiresAt,
      isUsed: invitation.isUsed,
      usedAt: invitation.usedAt,
      sentAt: invitation.sentAt,
      reminderSentAt: invitation.reminderSentAt,
      attemptCount: invitation.attemptCount,
      purpose: invitation.purpose,
      createdAt: invitation.createdAt,
      patient: {
        id: invitation.patient.id,
        patientNumber: invitation.patient.patientNumber,
        user: {
          firstName: invitation.patient.user.firstName,
          lastName: invitation.patient.user.lastName,
          phoneNumber: invitation.patient.user.phoneNumber,
          email: invitation.patient.user.email
        }
      },
      status: invitation.isUsed ? 'used' : 
              invitation.expiresAt < new Date() ? 'expired' : 'active'
    }));

    res.json({
      success: true,
      invitations: formattedInvitations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  })
);

// === INVITATION STATISTICS ===
/**
 * GET /api/invitations/stats
 * Get invitation statistics (admin only)
 */
router.get('/stats',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const stats = await invitationService.getInvitationStats();

    // Get additional statistics
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const [recentInvitations, usageByDay] = await Promise.all([
      // Recent invitations (last 7 days)
      prisma.invitation.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Usage by day (last 30 days)
      prisma.invitation.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        _count: { id: true }
      })
    ]);

    res.json({
      success: true,
      statistics: {
        ...stats,
        recentInvitations,
        dailyUsage: usageByDay.map(item => ({
          date: item.createdAt.toISOString().split('T')[0],
          count: item._count.id
        }))
      }
    });
  })
);

// === BULK OPERATIONS ===
/**
 * POST /api/invitations/bulk-create
 * Create invitations for multiple patients (admin only)
 */
router.post('/bulk-create',
  requireAdmin,
  [
    body('patientIds').isArray().withMessage('Patient IDs must be an array'),
    body('patientIds.*').isUUID().withMessage('Each patient ID must be valid'),
    body('studyId').optional().isUUID().withMessage('Study ID must be valid'),
    body('customMessage').optional().isString().isLength({ max: 500 }),
    body('sendImmediately').optional().isBoolean()
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { patientIds, studyId, customMessage, sendImmediately = false } = req.body;
    const sentBy = req.user!.id;

    const results = [];
    const errors = [];

    for (const patientId of patientIds) {
      try {
        const invitation = await invitationService.createInvitation({
          patientId,
          studyId,
          sentBy,
          customMessage
        });

        let smsSuccess = false;
        if (sendImmediately) {
          try {
            smsSuccess = await invitationService.sendInvitationSMS(invitation.id);
          } catch (smsError) {
            logger.warn('Failed to send bulk invitation SMS', { 
              invitationId: invitation.id,
              patientId,
              error: smsError instanceof Error ? smsError.message : 'Unknown error'
            });
          }
        }

        results.push({
          patientId,
          invitationId: invitation.id,
          success: true,
          smsSent: smsSuccess
        });

      } catch (error) {
        errors.push({
          patientId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.json({
      success: true,
      message: `Created ${results.length} invitations successfully`,
      results,
      errors,
      summary: {
        total: patientIds.length,
        successful: results.length,
        failed: errors.length,
        smsSent: results.filter(r => r.smsSent).length
      }
    });
  })
);

// === SEND REMINDERS ===
/**
 * POST /api/invitations/send-reminders
 * Send reminder SMS for unused invitations (admin only)
 */
router.post('/send-reminders',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await invitationService.sendInvitationReminders();

    res.json({
      success: true,
      message: 'Invitation reminders sent successfully'
    });
  })
);

// === CLEANUP EXPIRED ===
/**
 * DELETE /api/invitations/expired
 * Clean up expired invitations (admin only)
 */
router.delete('/expired',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await invitationService.cleanupExpiredInvitations();

    res.json({
      success: true,
      message: 'Expired invitations cleaned up successfully'
    });
  })
);

export default router;