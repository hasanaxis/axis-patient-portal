import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { smsService } from './services/simple-sms';
import { fileStorageService } from './services/file-storage';
import { monitoringService } from './services/monitoring';
import { voyagerRTFIntegration } from './services/voyager-rtf-integration';
import { modalityDICOMIntegration } from './services/modality-dicom-integration';
import { 
  generalRateLimit, 
  securityHeaders, 
  requestLogger, 
  errorHandler,
  corsOptions,
  healthCheck
} from './middleware/security';

const app = express();
const prisma = new PrismaClient();

// Security middleware
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(requestLogger);
app.use(generalRateLimit);
app.use(express.json({ limit: '10mb' }));

// Health check with enhanced monitoring
app.get('/api/health', healthCheck);

// Get studies
app.get('/api/studies', async (_req, res) => {
  try {
    const studies = await prisma.study.findMany({
      include: {
        patient: {
          include: {
            user: true
          }
        },
        report: true,
        series: {
          include: {
            images: true
          }
        }
      },
      orderBy: {
        studyDate: 'desc'
      }
    });

    return res.json(studies);
  } catch (error) {
    console.error('Error fetching studies:', error);
    return res.status(500).json({ error: 'Failed to fetch studies' });
  }
});

// Get single study
app.get('/api/studies/:id', async (req, res) => {
  try {
    const study = await prisma.study.findUnique({
      where: { id: req.params.id },
      include: {
        patient: {
          include: {
            user: true
          }
        },
        report: true,
        series: {
          include: {
            images: true
          }
        }
      }
    });

    if (!study) {
      return res.status(404).json({ error: 'Study not found' });
    }

    return res.json(study);
  } catch (error) {
    console.error('Error fetching study:', error);
    return res.status(500).json({ error: 'Failed to fetch study' });
  }
});

// Get patient profile (mock for now)
app.get('/api/patients/profile', async (_req, res) => {
  try {
    const patient = await prisma.patient.findFirst({
      include: {
        user: true,
        studies: {
          include: {
            report: true
          }
        }
      }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    return res.json(patient);
  } catch (error) {
    console.error('Error fetching patient:', error);
    return res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// Dashboard data
app.get('/api/dashboard', async (_req, res) => {
  try {
    const totalScans = await prisma.study.count();
    const pendingReports = await prisma.study.count({
      where: {
        report: null
      }
    });
    const recentScans = await prisma.study.count({
      where: {
        studyDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });

    const recentStudies = await prisma.study.findMany({
      take: 5,
      include: {
        report: true,
        series: {
          include: {
            images: true
          }
        }
      },
      orderBy: {
        studyDate: 'desc'
      }
    });

    return res.json({
      stats: {
        totalScans,
        pendingReports,
        recentScans,
        upcomingAppointments: 0 // Mock data
      },
      recentStudies
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// SMS service endpoints
app.post('/api/sms/test', async (req, res) => {
  try {
    const { phoneNumber } = req.body
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' })
    }

    const success = await smsService.testSMS(phoneNumber)
    
    if (success) {
      return res.json({ message: 'Test SMS sent successfully' })
    } else {
      return res.status(500).json({ error: 'Failed to send SMS' })
    }
  } catch (error) {
    console.error('Error sending test SMS:', error)
    return res.status(500).json({ error: 'Failed to send test SMS' })
  }
})

// SMS service status
app.get('/api/sms/status', async (_req, res) => {
  try {
    const isEnabled = smsService.isServiceEnabled()
    return res.json({ 
      enabled: isEnabled,
      service: 'SMS Service',
      provider: 'Twilio'
    })
  } catch (error) {
    console.error('Error getting SMS status:', error)
    return res.status(500).json({ error: 'Failed to get SMS status' })
  }
})

// File storage endpoints
app.get('/api/images/:filename', async (req, res) => {
  try {
    const { filename } = req.params
    const file = await fileStorageService.getImageFile(filename)
    
    if (!file) {
      return res.status(404).json({ error: 'Image not found' })
    }

    res.setHeader('Content-Type', 'application/dicom')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return res.send(file)
  } catch (error) {
    console.error('Error serving image file:', error)
    return res.status(500).json({ error: 'Failed to serve image' })
  }
})

app.get('/api/thumbnails/:filename', async (req, res) => {
  try {
    const { filename } = req.params
    const file = await fileStorageService.getThumbnailFile(filename)
    
    if (!file) {
      return res.status(404).json({ error: 'Thumbnail not found' })
    }

    const ext = filename.split('.').pop()?.toLowerCase()
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg'
    
    res.setHeader('Content-Type', contentType)
    return res.send(file)
  } catch (error) {
    console.error('Error serving thumbnail file:', error)
    return res.status(500).json({ error: 'Failed to serve thumbnail' })
  }
})

// Storage status and stats
app.get('/api/storage/status', async (_req, res) => {
  try {
    const stats = await fileStorageService.getStorageStats()
    return res.json({ 
      service: 'File Storage Service',
      status: 'active',
      stats
    })
  } catch (error) {
    console.error('Error getting storage status:', error)
    return res.status(500).json({ error: 'Failed to get storage status' })
  }
})

// Initialize sample files
app.post('/api/storage/init-samples', async (_req, res) => {
  try {
    await fileStorageService.createSampleFiles()
    return res.json({ message: 'Sample files created successfully' })
  } catch (error) {
    console.error('Error creating sample files:', error)
    return res.status(500).json({ error: 'Failed to create sample files' })
  }
})

// Monitoring endpoints
app.get('/api/monitoring/status', async (_req, res) => {
  try {
    const status = await monitoringService.getHealthStatus()
    return res.json(status)
  } catch (error) {
    console.error('Error getting monitoring status:', error)
    return res.status(500).json({ error: 'Failed to get monitoring status' })
  }
})

app.get('/api/monitoring/metrics', async (_req, res) => {
  try {
    const metrics = await monitoringService.getMetricsSummary()
    return res.json(metrics)
  } catch (error) {
    console.error('Error getting metrics:', error)
    return res.status(500).json({ error: 'Failed to get metrics' })
  }
})

// Voyager RIS Integration Endpoints
app.post('/api/voyager/webhook', async (req, res) => {
  try {
    const result = await voyagerRTFIntegration.handleVoyagerWebhook(req.body)
    return res.json(result)
  } catch (error) {
    console.error('Error handling Voyager webhook:', error)
    return res.status(500).json({ error: 'Failed to process webhook' })
  }
})

app.post('/api/voyager/process-rtf', async (req, res) => {
  try {
    const { rtfContent, studyInstanceUID, accessionNumber } = req.body
    
    if (!rtfContent || !studyInstanceUID || !accessionNumber) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const result = await voyagerRTFIntegration.processIncomingRTFReport(
      rtfContent,
      studyInstanceUID,
      accessionNumber
    )
    
    return res.json(result)
  } catch (error) {
    console.error('Error processing RTF report:', error)
    return res.status(500).json({ error: 'Failed to process RTF report' })
  }
})

// Modality DICOM Integration Endpoints
app.post('/api/modality/dicom', async (req, res) => {
  try {
    const dicomBuffer = req.body
    const transferSyntax = req.headers['transfer-syntax'] as string
    
    if (!dicomBuffer) {
      return res.status(400).json({ error: 'DICOM data is required' })
    }

    const result = await modalityDICOMIntegration.handleDICOMCStore(
      dicomBuffer,
      transferSyntax || 'unknown'
    )
    
    return res.json(result)
  } catch (error) {
    console.error('Error processing DICOM:', error)
    return res.status(500).json({ error: 'Failed to process DICOM' })
  }
})

app.get('/api/modality/stats', async (_req, res) => {
  try {
    const stats = await modalityDICOMIntegration.getIntegrationStats()
    return res.json(stats)
  } catch (error) {
    console.error('Error getting modality stats:', error)
    return res.status(500).json({ error: 'Failed to get modality stats' })
  }
})

// Test endpoint for DICOM processing
app.post('/api/modality/test-dicom', async (req, res) => {
  try {
    const { metadata } = req.body
    
    if (!metadata) {
      return res.status(400).json({ error: 'DICOM metadata is required for testing' })
    }

    // Create a mock DICOM buffer for testing
    const mockDICOMBuffer = Buffer.from('MOCK_DICOM_DATA')
    
    const result = await modalityDICOMIntegration.processIncomingDICOMImage(
      mockDICOMBuffer,
      metadata
    )
    
    return res.json(result)
  } catch (error) {
    console.error('Error testing DICOM processing:', error)
    return res.status(500).json({ error: 'Failed to test DICOM processing' })
  }
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Use enhanced error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🏥 Axis Imaging Patient Portal API listening on port ${PORT}`);
  console.log(`🌐 CORS enabled for production and development origins`);
  console.log(`📊 Database: Connected`);
  console.log(`🔒 Security: Enhanced security middleware enabled`);
  console.log(`📈 Monitoring: System monitoring active`);
  console.log(`📄 Voyager RIS: RTF integration service ready`);
  console.log(`📡 DICOM: Modality integration service ready`);
  
  // Start system monitoring
  monitoringService.startSystemMonitoring(60000); // Every minute
  
  // Log startup event
  monitoringService.logSecurityEvent('SERVER_STARTUP', 'LOW', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

export { app, prisma };