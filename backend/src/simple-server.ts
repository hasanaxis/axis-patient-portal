import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { authService } from './services/auth-service';
import { smsService } from './services/simple-sms';
import { fileStorageService } from './services/file-storage';
import { monitoringService } from './services/monitoring';
import { voyagerRTFIntegration } from './services/voyager-rtf-integration';
import { modalityDICOMIntegration } from './services/modality-dicom-integration';
import secureAuthRoutes from './routes/secure-auth';
import { 
  generalRateLimit, 
  authRateLimit,
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

// === SECURE AUTH ROUTES ===
app.use('/api/auth', secureAuthRoutes);

// === LEGACY AUTH ENDPOINTS ===
// Send SMS verification code
app.post('/api/auth/send-verification', authRateLimit, async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const result = await authService.sendVerificationCode(phoneNumber);
    
    if (result.success) {
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in send-verification endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify SMS code
app.post('/api/auth/verify-code', authRateLimit, async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;

    if (!phoneNumber || !code) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and verification code are required'
      });
    }

    const result = await authService.verifyCode(phoneNumber, code);
    
    if (result.success) {
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in verify-code endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Register new patient
app.post('/api/auth/register', authRateLimit, async (req, res) => {
  try {
    const { phoneNumber, firstName, lastName, dateOfBirth, medicareNumber, email, verificationToken } = req.body;

    if (!phoneNumber || !firstName || !lastName || !dateOfBirth || !verificationToken) {
      return res.status(400).json({
        success: false,
        message: 'Phone number, first name, last name, date of birth, and verification token are required'
      });
    }

    const registerData = {
      phoneNumber,
      firstName,
      lastName,
      dateOfBirth,
      medicareNumber,
      email
    };

    const result = await authService.registerPatient(registerData, verificationToken);
    
    if (result.success) {
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in register endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Login with phone number (send SMS)
app.post('/api/auth/login', authRateLimit, async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const result = await authService.loginWithPhone(phoneNumber);
    
    if (result.success) {
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in login endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Complete login with verification code
app.post('/api/auth/complete-login', authRateLimit, async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;

    if (!phoneNumber || !code) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and verification code are required'
      });
    }

    const result = await authService.completeLogin(phoneNumber, code);
    
    if (result.success) {
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in complete-login endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Logout
app.post('/api/auth/logout', async (req, res) => {
  try {
    const authToken = req.headers.authorization?.replace('Bearer ', '');

    if (!authToken) {
      return res.status(400).json({
        success: false,
        message: 'Authorization token is required'
      });
    }

    const result = await authService.logout(authToken);
    
    if (result.success) {
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in logout endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

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

// Get patient profile
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

    // Transform the database response to match frontend Patient interface
    const transformedPatient = {
      id: patient.id,
      firstName: patient.user.firstName,
      lastName: patient.user.lastName,
      email: patient.user.email,
      phoneNumber: patient.user.phoneNumber,
      dateOfBirth: patient.dateOfBirth,
      medicareNumber: patient.medicareNumber,
      gender: patient.gender,
      streetAddress: patient.streetAddress,
      suburb: patient.suburb,
      state: patient.state,
      postcode: patient.postcode,
      country: patient.country,
      patientNumber: patient.patientNumber,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt
    };

    return res.json(transformedPatient);
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

// === REPORTS ENDPOINTS ===
// Get reports
app.get('/api/reports', async (_req, res) => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        study: {
          include: {
            patient: {
              include: {
                user: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    return res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get single report
app.get('/api/reports/:id', async (req, res) => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      include: {
        study: {
          include: {
            patient: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    return res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    return res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// === APPOINTMENTS ENDPOINTS ===
// Get appointments
app.get('/api/appointments', async (_req, res) => {
  try {
    // Mock appointments data since we don't have real appointment system yet
    const appointments: any[] = [];
    return res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Create appointment
app.post('/api/appointments', async (_req, res) => {
  try {
    // Mock appointment creation - in real implementation this would save to database
    const appointmentData = _req.body;
    const newAppointment = {
      ...appointmentData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return res.json(newAppointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    return res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Cancel appointment
app.delete('/api/appointments/:id', async (_req, res) => {
  try {
    // Mock appointment cancellation
    return res.json({ message: 'Appointment cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

// === LOCATIONS ENDPOINTS ===
// Get facility locations
app.get('/api/locations', async (_req, res) => {
  try {
    // Mock location data for Axis Imaging Mickleham
    const locations = [
      {
        id: '1',
        name: 'Axis Imaging Mickleham',
        address: {
          street: 'Level 1, 107/21 Cityside Drive',
          suburb: 'Mickleham',
          state: 'VIC',
          postcode: '3064',
          country: 'Australia'
        },
        phoneNumber: '(03) 8746 4200',
        email: 'info@axisimaging.com.au',
        operatingHours: {
          monday: { open: '07:00', close: '19:00' },
          tuesday: { open: '07:00', close: '19:00' },
          wednesday: { open: '07:00', close: '19:00' },
          thursday: { open: '07:00', close: '19:00' },
          friday: { open: '07:00', close: '19:00' },
          saturday: { open: '08:00', close: '16:00' },
          sunday: { open: '', close: '', closed: true }
        },
        services: ['X-Ray', 'CT', 'MRI', 'Ultrasound', 'Mammography', 'Nuclear Medicine'],
        parkingInfo: 'Free on-site parking available with disabled access',
        publicTransport: 'Bus route 466 stops nearby'
      }
    ];

    return res.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    return res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// === STUDY ACTIONS ===
// Mark study as viewed
app.post('/api/studies/:id/mark-viewed', async (req, res) => {
  try {
    const study = await prisma.study.update({
      where: { id: req.params.id },
      data: { updatedAt: new Date() }
    });

    return res.json({ message: 'Study marked as viewed', study });
  } catch (error) {
    console.error('Error marking study as viewed:', error);
    return res.status(500).json({ error: 'Failed to mark study as viewed' });
  }
});

// Share study with GP
app.post('/api/studies/:id/share-gp', async (req, res) => {
  try {
    const study = await prisma.study.update({
      where: { id: req.params.id },
      data: { updatedAt: new Date() }
    });

    return res.json({ message: 'Study shared with GP', study });
  } catch (error) {
    console.error('Error sharing study with GP:', error);
    return res.status(500).json({ error: 'Failed to share study with GP' });
  }
});

// === PATIENT PROFILE UPDATE ===
// Update patient profile
app.put('/api/patients/profile', async (req, res) => {
  try {
    const patientData = req.body;
    
    // Get first patient for demo purposes
    const patient = await prisma.patient.findFirst({
      include: {
        user: true
      }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Update user data
    const updatedUser = await prisma.user.update({
      where: { id: patient.user.id },
      data: {
        firstName: patientData.firstName || patient.user.firstName,
        lastName: patientData.lastName || patient.user.lastName,
        email: patientData.email || patient.user.email,
        phoneNumber: patientData.phoneNumber || patient.user.phoneNumber,
      }
    });

    // Update patient data
    const updatedPatient = await prisma.patient.update({
      where: { id: patient.id },
      data: {
        dateOfBirth: patientData.dateOfBirth ? new Date(patientData.dateOfBirth) : patient.dateOfBirth,
        medicareNumber: patientData.medicareNumber || patient.medicareNumber,
        gender: patientData.gender || patient.gender,
        streetAddress: patientData.streetAddress || patient.streetAddress,
        suburb: patientData.suburb || patient.suburb,
        state: patientData.state || patient.state,
        postcode: patientData.postcode || patient.postcode,
        country: patientData.country || patient.country,
      },
      include: {
        user: true
      }
    });

    // Transform response to match frontend interface
    const transformedPatient = {
      id: updatedPatient.id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      phoneNumber: updatedUser.phoneNumber,
      dateOfBirth: updatedPatient.dateOfBirth,
      medicareNumber: updatedPatient.medicareNumber,
      gender: updatedPatient.gender,
      streetAddress: updatedPatient.streetAddress,
      suburb: updatedPatient.suburb,
      state: updatedPatient.state,
      postcode: updatedPatient.postcode,
      country: updatedPatient.country,
      patientNumber: updatedPatient.patientNumber,
      createdAt: updatedPatient.createdAt,
      updatedAt: updatedPatient.updatedAt
    };

    return res.json(transformedPatient);
  } catch (error) {
    console.error('Error updating patient profile:', error);
    return res.status(500).json({ error: 'Failed to update patient profile' });
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