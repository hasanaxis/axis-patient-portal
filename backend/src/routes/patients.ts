import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { 
  requirePatient, 
  requireStaff, 
  checkPatientDataAccess, 
  checkStudyAccess, 
  auditRequest 
} from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { healthcareLogger } from '../utils/logger';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(errors.array().map(err => err.msg).join(', '));
  }
  next();
};

// Apply audit logging to all patient routes
router.use(auditRequest);

// === PATIENT DASHBOARD ===
/**
 * GET /api/patients/dashboard
 * Get patient dashboard data (own data only)
 */
router.get('/dashboard',
  requirePatient,
  asyncHandler(async (req, res) => {
    const patient = req.user!.patient!;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Get patient dashboard data
    const [recentStudies, recentReports, upcomingAppointments, notifications] = await Promise.all([
      // Recent studies (last 6 months)
      prisma.study.findMany({
        where: {
          patientId: patient.id,
          studyDate: {
            gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { studyDate: 'desc' },
        take: 10,
        include: {
          report: {
            select: {
              id: true,
              status: true,
              isCritical: true,
              approvedAt: true
            }
          },
          series: {
            select: {
              id: true,
              numberOfInstances: true
            }
          }
        }
      }),

      // Recent reports
      prisma.report.findMany({
        where: { patientId: patient.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          study: {
            select: {
              id: true,
              studyDate: true,
              modality: true,
              bodyPartExamined: true,
              studyDescription: true
            }
          },
          radiologist: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      }),

      // Upcoming appointments
      prisma.appointment.findMany({
        where: {
          patientId: patient.id,
          scheduledAt: { gte: new Date() },
          status: { in: ['SCHEDULED', 'CONFIRMED'] }
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5
      }),

      // Recent notifications
      prisma.notification.findMany({
        where: { userId: req.user!.id },
        orderBy: { sentAt: 'desc' },
        take: 10
      })
    ]);

    // Calculate statistics
    const totalStudies = await prisma.study.count({
      where: { patientId: patient.id }
    });

    const totalImages = await prisma.image.count({
      where: {
        series: {
          study: {
            patientId: patient.id
          }
        }
      }
    });

    const pendingReports = await prisma.report.count({
      where: {
        patientId: patient.id,
        status: { in: ['PENDING', 'IN_REVIEW', 'PRELIMINARY'] }
      }
    });

    // Log dashboard access
    healthcareLogger.patientAccess(patient.id, req.user!.id, 'DASHBOARD_VIEW');

    res.json({
      success: true,
      dashboard: {
        patient: {
          id: patient.id,
          patientNumber: patient.patientNumber,
          firstName: req.user!.firstName,
          lastName: req.user!.lastName,
          dateOfBirth: req.user!.dateOfBirth
        },
        statistics: {
          totalStudies,
          totalImages,
          pendingReports,
          unreadNotifications: notifications.filter(n => !n.isRead).length
        },
        recentStudies: recentStudies.map(study => ({
          id: study.id,
          studyDate: study.studyDate,
          modality: study.modality,
          bodyPartExamined: study.bodyPartExamined,
          studyDescription: study.studyDescription,
          status: study.status,
          numberOfSeries: study.numberOfSeries,
          numberOfInstances: study.numberOfInstances,
          totalImages: study.series.reduce((sum, series) => sum + series.numberOfInstances, 0),
          hasReport: !!study.report,
          reportStatus: study.report?.status,
          isCritical: study.report?.isCritical || false,
          reportApproved: !!study.report?.approvedAt
        })),
        recentReports: recentReports.map(report => ({
          id: report.id,
          status: report.status,
          isCritical: report.isCritical,
          createdAt: report.createdAt,
          approvedAt: report.approvedAt,
          study: {
            id: report.study.id,
            studyDate: report.study.studyDate,
            modality: report.study.modality,
            bodyPartExamined: report.study.bodyPartExamined,
            studyDescription: report.study.studyDescription
          },
          radiologist: {
            name: `Dr. ${report.radiologist.user.firstName} ${report.radiologist.user.lastName}`
          }
        })),
        upcomingAppointments: upcomingAppointments.map(apt => ({
          id: apt.id,
          appointmentNumber: apt.appointmentNumber,
          scheduledAt: apt.scheduledAt,
          duration: apt.duration,
          scanType: apt.scanType,
          bodyPartExamined: apt.bodyPartExamined,
          status: apt.status,
          room: apt.room,
          preparationInstructions: apt.preparationInstructions
        })),
        notifications: notifications.map(notif => ({
          id: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          isRead: notif.isRead,
          isCritical: notif.isCritical,
          sentAt: notif.sentAt,
          actionUrl: notif.actionUrl,
          actionText: notif.actionText
        }))
      }
    });
  })
);

// === GET PATIENT STUDIES ===
/**
 * GET /api/patients/studies
 * Get all studies for the authenticated patient
 */
router.get('/studies',
  requirePatient,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('modality').optional().isString(),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601()
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const patient = req.user!.patient!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const modality = req.query.modality as string;
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Build where clause
    const where: any = { patientId: patient.id };

    if (modality) {
      where.modality = modality;
    }

    if (dateFrom || dateTo) {
      where.studyDate = {};
      if (dateFrom) where.studyDate.gte = dateFrom;
      if (dateTo) where.studyDate.lte = dateTo;
    }

    // Get studies with pagination
    const [studies, total] = await Promise.all([
      prisma.study.findMany({
        where,
        include: {
          series: {
            select: {
              id: true,
              seriesDescription: true,
              numberOfInstances: true,
              modality: true
            }
          },
          report: {
            select: {
              id: true,
              status: true,
              isCritical: true,
              approvedAt: true
            }
          },
          appointment: {
            select: {
              id: true,
              appointmentNumber: true,
              scheduledAt: true
            }
          }
        },
        orderBy: { studyDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.study.count({ where })
    ]);

    // Log studies access
    healthcareLogger.patientAccess(patient.id, req.user!.id, 'STUDIES_LIST_VIEW', {
      studyCount: studies.length,
      filters: { modality, dateFrom, dateTo }
    });

    res.json({
      success: true,
      studies: studies.map(study => ({
        id: study.id,
        studyInstanceUID: study.studyInstanceUID,
        accessionNumber: study.accessionNumber,
        studyDate: study.studyDate,
        studyDescription: study.studyDescription,
        modality: study.modality,
        bodyPartExamined: study.bodyPartExamined,
        status: study.status,
        numberOfSeries: study.numberOfSeries,
        numberOfInstances: study.numberOfInstances,
        studySize: study.studySize?.toString(),
        clinicalHistory: study.clinicalHistory,
        requestedProcedure: study.requestedProcedure,
        priority: study.priority,
        series: study.series,
        hasReport: !!study.report,
        reportStatus: study.report?.status,
        isCritical: study.report?.isCritical || false,
        reportApproved: !!study.report?.approvedAt,
        appointment: study.appointment ? {
          id: study.appointment.id,
          appointmentNumber: study.appointment.appointmentNumber,
          scheduledAt: study.appointment.scheduledAt
        } : null,
        createdAt: study.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// === GET SPECIFIC STUDY ===
/**
 * GET /api/patients/studies/:studyId
 * Get detailed study information
 */
router.get('/studies/:studyId',
  requirePatient,
  checkStudyAccess('studyId'),
  [
    param('studyId').isUUID().withMessage('Valid study ID required')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { studyId } = req.params;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const study = await prisma.study.findUnique({
      where: { id: studyId },
      include: {
        series: {
          include: {
            images: {
              select: {
                id: true,
                sopInstanceUID: true,
                instanceNumber: true,
                rows: true,
                columns: true,
                imageUrl: true,
                thumbnailUrl: true,
                jpegUrl: true,
                windowCenter: true,
                windowWidth: true,
                sliceLocation: true,
                acquisitionDate: true,
                acquisitionTime: true
              },
              orderBy: { instanceNumber: 'asc' }
            }
          },
          orderBy: { seriesNumber: 'asc' }
        },
        report: {
          include: {
            radiologist: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        },
        appointment: true,
        patient: {
          select: {
            id: true,
            patientNumber: true
          }
        }
      }
    });

    if (!study) {
      throw new NotFoundError('Study not found');
    }

    // Log study access
    healthcareLogger.medicalDataAccess('STUDY', studyId, req.user!.id, 'DETAILED_VIEW');

    res.json({
      success: true,
      study: {
        id: study.id,
        studyInstanceUID: study.studyInstanceUID,
        accessionNumber: study.accessionNumber,
        studyDate: study.studyDate,
        studyTime: study.studyTime,
        studyDescription: study.studyDescription,
        modality: study.modality,
        bodyPartExamined: study.bodyPartExamined,
        studyComments: study.studyComments,
        clinicalHistory: study.clinicalHistory,
        requestedProcedure: study.requestedProcedure,
        priority: study.priority,
        status: study.status,
        performingPhysician: study.performingPhysician,
        referringPhysician: study.referringPhysician,
        operatorName: study.operatorName,
        stationName: study.stationName,
        manufacturerModel: study.manufacturerModel,
        institutionName: study.institutionName,
        numberOfSeries: study.numberOfSeries,
        numberOfInstances: study.numberOfInstances,
        studySize: study.studySize?.toString(),
        series: study.series.map(series => ({
          id: series.id,
          seriesInstanceUID: series.seriesInstanceUID,
          seriesNumber: series.seriesNumber,
          seriesDate: series.seriesDate,
          seriesTime: series.seriesTime,
          seriesDescription: series.seriesDescription,
          modality: series.modality,
          bodyPartExamined: series.bodyPartExamined,
          protocolName: series.protocolName,
          numberOfInstances: series.numberOfInstances,
          sliceThickness: series.sliceThickness,
          pixelSpacing: series.pixelSpacing,
          images: series.images
        })),
        report: study.report ? {
          id: study.report.id,
          findings: study.report.findings,
          impression: study.report.impression,
          recommendations: study.report.recommendations,
          comparison: study.report.comparison,
          limitations: study.report.limitations,
          status: study.report.status,
          isCritical: study.report.isCritical,
          criticalFinding: study.report.criticalFinding,
          dictatedAt: study.report.dictatedAt,
          verifiedAt: study.report.verifiedAt,
          approvedAt: study.report.approvedAt,
          pdfUrl: study.report.pdfUrl,
          radiologist: {
            name: `Dr. ${study.report.radiologist.user.firstName} ${study.report.radiologist.user.lastName}`,
            specializations: study.report.radiologist.specializations
          }
        } : null,
        appointment: study.appointment,
        createdAt: study.createdAt,
        updatedAt: study.updatedAt
      }
    });
  })
);

// === GET PATIENT REPORTS ===
/**
 * GET /api/patients/reports
 * Get all reports for the authenticated patient
 */
router.get('/reports',
  requirePatient,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('status').optional().isString()
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const patient = req.user!.patient!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Build where clause
    const where: any = { patientId: patient.id };
    if (status) {
      where.status = status;
    }

    // Get reports with pagination
    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          study: {
            select: {
              id: true,
              studyDate: true,
              modality: true,
              bodyPartExamined: true,
              studyDescription: true,
              accessionNumber: true
            }
          },
          radiologist: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.report.count({ where })
    ]);

    // Log reports access
    healthcareLogger.patientAccess(patient.id, req.user!.id, 'REPORTS_LIST_VIEW', {
      reportCount: reports.length
    });

    res.json({
      success: true,
      reports: reports.map(report => ({
        id: report.id,
        reportNumber: report.reportNumber,
        findings: report.findings,
        impression: report.impression,
        recommendations: report.recommendations,
        status: report.status,
        isCritical: report.isCritical,
        criticalFinding: report.criticalFinding,
        dictatedAt: report.dictatedAt,
        verifiedAt: report.verifiedAt,
        approvedAt: report.approvedAt,
        pdfUrl: report.pdfUrl,
        study: report.study,
        radiologist: {
          name: `Dr. ${report.radiologist.user.firstName} ${report.radiologist.user.lastName}`,
          specializations: report.radiologist.specializations
        },
        createdAt: report.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// === GET SPECIFIC REPORT ===
/**
 * GET /api/patients/reports/:reportId
 * Get detailed report information
 */
router.get('/reports/:reportId',
  requirePatient,
  [
    param('reportId').isUUID().withMessage('Valid report ID required')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    const patient = req.user!.patient!;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const report = await prisma.report.findFirst({
      where: {
        id: reportId,
        patientId: patient.id // Ensure patient can only access their own reports
      },
      include: {
        study: true,
        radiologist: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    // Log report access
    healthcareLogger.medicalDataAccess('REPORT', reportId, req.user!.id, 'DETAILED_VIEW');

    res.json({
      success: true,
      report: {
        id: report.id,
        reportNumber: report.reportNumber,
        clinicalHistory: report.clinicalHistory,
        technique: report.technique,
        findings: report.findings,
        impression: report.impression,
        recommendations: report.recommendations,
        comparison: report.comparison,
        limitations: report.limitations,
        status: report.status,
        isCritical: report.isCritical,
        criticalFinding: report.criticalFinding,
        criticalNotifiedAt: report.criticalNotifiedAt,
        dictatedAt: report.dictatedAt,
        transcribedAt: report.transcribedAt,
        verifiedAt: report.verifiedAt,
        approvedAt: report.approvedAt,
        pdfUrl: report.pdfUrl,
        xmlUrl: report.xmlUrl,
        study: {
          id: report.study.id,
          studyDate: report.study.studyDate,
          modality: report.study.modality,
          bodyPartExamined: report.study.bodyPartExamined,
          studyDescription: report.study.studyDescription,
          accessionNumber: report.study.accessionNumber
        },
        radiologist: {
          name: `Dr. ${report.radiologist.user.firstName} ${report.radiologist.user.lastName}`,
          specializations: report.radiologist.specializations,
          qualifications: report.radiologist.qualifications
        },
        createdAt: report.createdAt,
        updatedAt: report.updatedAt
      }
    });
  })
);

// === GET PATIENT APPOINTMENTS ===
/**
 * GET /api/patients/appointments
 * Get all appointments for the authenticated patient
 */
router.get('/appointments',
  requirePatient,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('upcoming').optional().isBoolean()
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const patient = req.user!.patient!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const upcoming = req.query.upcoming === 'true';

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Build where clause
    const where: any = { patientId: patient.id };
    if (upcoming) {
      where.scheduledAt = { gte: new Date() };
      where.status = { in: ['SCHEDULED', 'CONFIRMED'] };
    }

    // Get appointments with pagination
    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          studies: {
            select: {
              id: true,
              studyDate: true,
              modality: true,
              status: true
            }
          }
        },
        orderBy: { scheduledAt: upcoming ? 'asc' : 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.appointment.count({ where })
    ]);

    res.json({
      success: true,
      appointments: appointments.map(apt => ({
        id: apt.id,
        appointmentNumber: apt.appointmentNumber,
        scanType: apt.scanType,
        bodyPartExamined: apt.bodyPartExamined,
        scheduledAt: apt.scheduledAt,
        duration: apt.duration,
        status: apt.status,
        priority: apt.priority,
        room: apt.room,
        equipment: apt.equipment,
        contrastRequired: apt.contrastRequired,
        contrastAgent: apt.contrastAgent,
        preparationInstructions: apt.preparationInstructions,
        specialInstructions: apt.specialInstructions,
        interpreterRequired: apt.interpreterRequired,
        interpreterLanguage: apt.interpreterLanguage,
        wheelchairAccess: apt.wheelchairAccess,
        arrivedAt: apt.arrivedAt,
        startedAt: apt.startedAt,
        completedAt: apt.completedAt,
        studies: apt.studies,
        createdAt: apt.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// === UPDATE PATIENT PREFERENCES ===
/**
 * PATCH /api/patients/preferences
 * Update patient communication preferences
 */
router.patch('/preferences',
  requirePatient,
  [
    body('allowSmsReminders').optional().isBoolean(),
    body('allowEmailReminders').optional().isBoolean(),
    body('allowPostalMail').optional().isBoolean(),
    body('preferredContactMethod').optional().isIn(['SMS', 'EMAIL', 'PHONE', 'POSTAL_MAIL']),
    body('preferredLanguage').optional().isString().isLength({ min: 2, max: 10 })
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const patient = req.user!.patient!;
    const updates = req.body;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Update patient preferences
    const updatedPatient = await prisma.patient.update({
      where: { id: patient.id },
      data: updates
    });

    // Update user preferences if provided
    const userUpdates: any = {};
    if (updates.preferredLanguage) {
      userUpdates.preferredLanguage = updates.preferredLanguage;
    }

    if (Object.keys(userUpdates).length > 0) {
      await prisma.user.update({
        where: { id: req.user!.id },
        data: userUpdates
      });
    }

    // Log preference update
    healthcareLogger.patientAccess(patient.id, req.user!.id, 'PREFERENCES_UPDATE', {
      updates: Object.keys(updates)
    });

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: {
        allowSmsReminders: updatedPatient.allowSmsReminders,
        allowEmailReminders: updatedPatient.allowEmailReminders,
        allowPostalMail: updatedPatient.allowPostalMail,
        preferredContactMethod: updatedPatient.preferredContactMethod,
        preferredLanguage: req.user!.preferredLanguage
      }
    });
  })
);

export default router;