import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/authMiddleware';
import { studyMockDataService } from '../services/studyMockDataService';
import { 
  StudyFilter, 
  StudySummary,
  StudyViewStatus,
  ShareStatus 
} from '../../../shared/src/types';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

router.get('/studies', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const filter: StudyFilter = req.query as any;
    
    const patient = await prisma.patient.findFirst({
      where: { userId }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: { code: 'PATIENT_NOT_FOUND', message: 'Patient record not found' }
      });
    }

    const where: any = {
      patientId: patient.id
    };

    if (filter.dateFrom || filter.dateTo) {
      where.studyDate = {};
      if (filter.dateFrom) where.studyDate.gte = new Date(filter.dateFrom);
      if (filter.dateTo) where.studyDate.lte = new Date(filter.dateTo);
    }

    if (filter.modality && filter.modality.length > 0) {
      where.modality = { in: filter.modality };
    }

    if (filter.bodyPart && filter.bodyPart.length > 0) {
      where.bodyPartExamined = { in: filter.bodyPart };
    }

    if (filter.status && filter.status.length > 0) {
      where.status = { in: filter.status };
    }

    if (filter.priority && filter.priority.length > 0) {
      where.priority = { in: filter.priority };
    }

    if (filter.hasReport !== undefined) {
      if (filter.hasReport) {
        where.report = { isNot: null };
      } else {
        where.report = { is: null };
      }
    }

    if (filter.searchTerm) {
      where.OR = [
        { studyDescription: { contains: filter.searchTerm, mode: 'insensitive' } },
        { bodyPartExamined: { contains: filter.searchTerm, mode: 'insensitive' } },
        { accessionNumber: { contains: filter.searchTerm, mode: 'insensitive' } },
        { studyId: { contains: filter.searchTerm, mode: 'insensitive' } }
      ];
    }

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const orderBy: any = {};
    if (filter.sortBy) {
      orderBy[filter.sortBy] = filter.sortOrder || 'desc';
    } else {
      orderBy.studyDate = 'desc';
    }

    const [studies, total] = await Promise.all([
      prisma.study.findMany({
        where,
        include: {
          report: {
            include: {
              radiologist: {
                include: {
                  user: true
                }
              }
            }
          },
          technologist: {
            include: {
              user: true
            }
          },
          radiologist: {
            include: {
              user: true
            }
          },
          series: {
            orderBy: { seriesNumber: 'asc' }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.study.count({ where })
    ]);

    const studiesWithViewStatus = studies.map(study => {
      const daysSince = (Date.now() - study.studyDate.getTime()) / (1000 * 60 * 60 * 24);
      let viewStatus: StudyViewStatus = StudyViewStatus.NEW;
      
      if (daysSince > 7) {
        viewStatus = StudyViewStatus.REVIEWED;
      } else if (daysSince > 1) {
        viewStatus = StudyViewStatus.VIEWED;
      }

      const shareStatus = study.report?.sentToReferrerAt ? 
        ShareStatus.SHARED_WITH_GP : 
        ShareStatus.NOT_SHARED;

      return {
        ...study,
        viewStatus,
        shareStatus,
        criticalFindings: study.report?.isCritical || false
      };
    });

    res.json({
      success: true,
      data: studiesWithViewStatus,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching studies:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch studies' }
    });
  }
});

router.get('/studies/summary', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const patient = await prisma.patient.findFirst({
      where: { userId }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: { code: 'PATIENT_NOT_FOUND', message: 'Patient record not found' }
      });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalStudies,
      recentStudies,
      studiesWithReports,
      criticalStudies,
      modalityStats
    ] = await Promise.all([
      prisma.study.count({ where: { patientId: patient.id } }),
      prisma.study.findMany({
        where: { 
          patientId: patient.id,
          studyDate: { gte: thirtyDaysAgo }
        },
        include: {
          report: true,
          series: true
        },
        orderBy: { studyDate: 'desc' },
        take: 5
      }),
      prisma.study.count({
        where: {
          patientId: patient.id,
          report: { isNot: null }
        }
      }),
      prisma.study.count({
        where: {
          patientId: patient.id,
          report: { isCritical: true }
        }
      }),
      prisma.study.groupBy({
        by: ['modality'],
        where: { patientId: patient.id },
        _count: true
      })
    ]);

    const newStudiesCount = recentStudies.filter(study => {
      const daysSince = (Date.now() - study.studyDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 7;
    }).length;

    const viewedStudiesCount = totalStudies - newStudiesCount;

    const modalityBreakdown = modalityStats.map(stat => ({
      modality: stat.modality,
      count: stat._count
    }));

    const summary: StudySummary = {
      totalStudies,
      newStudies: newStudiesCount,
      viewedStudies: viewedStudiesCount,
      studiesWithReports,
      criticalStudies,
      modalityBreakdown,
      recentStudies: recentStudies.map(study => ({
        ...study,
        viewStatus: StudyViewStatus.NEW,
        shareStatus: study.report?.sentToReferrerAt ? 
          ShareStatus.SHARED_WITH_GP : 
          ShareStatus.NOT_SHARED,
        criticalFindings: study.report?.isCritical || false
      }))
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching study summary:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch study summary' }
    });
  }
});

router.get('/studies/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const patient = await prisma.patient.findFirst({
      where: { userId }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: { code: 'PATIENT_NOT_FOUND', message: 'Patient record not found' }
      });
    }

    const study = await prisma.study.findFirst({
      where: {
        id,
        patientId: patient.id
      },
      include: {
        report: {
          include: {
            radiologist: {
              include: {
                user: true
              }
            }
          }
        },
        technologist: {
          include: {
            user: true
          }
        },
        radiologist: {
          include: {
            user: true
          }
        },
        series: {
          include: {
            images: {
              orderBy: { instanceNumber: 'asc' }
            }
          },
          orderBy: { seriesNumber: 'asc' }
        },
        appointment: true
      }
    });

    if (!study) {
      return res.status(404).json({
        success: false,
        error: { code: 'STUDY_NOT_FOUND', message: 'Study not found' }
      });
    }

    const daysSince = (Date.now() - study.studyDate.getTime()) / (1000 * 60 * 60 * 24);
    let viewStatus: StudyViewStatus = StudyViewStatus.NEW;
    
    if (daysSince > 7) {
      viewStatus = StudyViewStatus.REVIEWED;
    } else if (daysSince > 1) {
      viewStatus = StudyViewStatus.VIEWED;
    }

    const shareStatus = study.report?.sentToReferrerAt ? 
      ShareStatus.SHARED_WITH_GP : 
      ShareStatus.NOT_SHARED;

    const studyWithStatus = {
      ...study,
      viewStatus,
      shareStatus,
      criticalFindings: study.report?.isCritical || false,
      lastViewedAt: new Date(),
      lastViewedBy: `${(req as any).user.firstName} ${(req as any).user.lastName}`
    };

    res.json({
      success: true,
      data: studyWithStatus
    });
  } catch (error) {
    console.error('Error fetching study:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch study' }
    });
  }
});

router.post('/studies/:id/mark-viewed', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const patient = await prisma.patient.findFirst({
      where: { userId }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: { code: 'PATIENT_NOT_FOUND', message: 'Patient record not found' }
      });
    }

    const study = await prisma.study.findFirst({
      where: {
        id,
        patientId: patient.id
      }
    });

    if (!study) {
      return res.status(404).json({
        success: false,
        error: { code: 'STUDY_NOT_FOUND', message: 'Study not found' }
      });
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'VIEW',
        entity: 'STUDY',
        entityId: id,
        entityName: study.studyDescription || 'Study',
        description: `Viewed study ${study.accessionNumber}`,
        category: 'DATA_ACCESS',
        severity: 'INFO',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      success: true,
      data: { message: 'Study marked as viewed' }
    });
  } catch (error) {
    console.error('Error marking study as viewed:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to mark study as viewed' }
    });
  }
});

router.post('/studies/:id/share-with-gp', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { gpId, message } = req.body;

    const patient = await prisma.patient.findFirst({
      where: { userId },
      include: { referringGp: true }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: { code: 'PATIENT_NOT_FOUND', message: 'Patient record not found' }
      });
    }

    const study = await prisma.study.findFirst({
      where: {
        id,
        patientId: patient.id
      },
      include: {
        report: true
      }
    });

    if (!study) {
      return res.status(404).json({
        success: false,
        error: { code: 'STUDY_NOT_FOUND', message: 'Study not found' }
      });
    }

    const targetGpId = gpId || patient.referringGpId;
    if (!targetGpId) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_GP_SPECIFIED', message: 'No GP specified for sharing' }
      });
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'SHARE',
        entity: 'STUDY',
        entityId: id,
        entityName: study.studyDescription || 'Study',
        description: `Shared study ${study.accessionNumber} with GP`,
        category: 'DATA_ACCESS',
        severity: 'INFO',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: {
          gpId: targetGpId,
          message,
          includesReport: !!study.report
        }
      }
    });

    res.json({
      success: true,
      data: { 
        message: 'Study shared with GP successfully',
        sharedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error sharing study with GP:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to share study with GP' }
    });
  }
});

router.post('/studies/generate-mock-data', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { numberOfStudies = 10, includeCritical = false } = req.body;

    const patient = await prisma.patient.findFirst({
      where: { userId }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: { code: 'PATIENT_NOT_FOUND', message: 'Patient record not found' }
      });
    }

    const mockStudies = await studyMockDataService.generateStudiesForPatient({
      patientId: patient.id,
      numberOfStudies,
      includeReports: true,
      includeCritical
    });

    res.json({
      success: true,
      data: {
        message: `Generated ${mockStudies.length} mock studies`,
        studies: mockStudies
      }
    });
  } catch (error) {
    console.error('Error generating mock studies:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to generate mock studies' }
    });
  }
});

export default router;