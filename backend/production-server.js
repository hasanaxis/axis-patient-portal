// Production API server with Supabase database integration
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

const app = express();
const PORT = process.env.PORT || 8080;

console.log('🚀 Starting Axis Imaging Patient Portal API (Production)...');
console.log('Port:', PORT);
console.log('Environment:', process.env.NODE_ENV || 'production');
console.log('Database URL:', process.env.DATABASE_URL ? 'configured' : 'missing');

// Enable CORS for frontend
app.use(cors({
  origin: [
    'https://happy-river-0cbbe5100.1.azurestaticapps.net',
    'https://portal.axisimaging.com.au',
    'http://localhost:3002',
    'http://localhost:5173'
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  console.log('Health check requested');
  
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'healthy',
      message: 'Axis Imaging Patient Portal API is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      version: '1.0.0',
      server: 'Azure App Service',
      database: 'connected',
      features: {
        supabase: true,
        prisma: true,
        sms: process.env.CLICKSEND_API_KEY ? true : false
      }
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API info endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    name: 'Axis Imaging Patient Portal API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    database: 'Supabase PostgreSQL',
    endpoints: {
      health: 'GET /api/health',
      studies: 'GET /api/studies',
      dashboard: 'GET /api/dashboard',
      auth: 'POST /api/auth/login',
      profile: 'GET /api/patients/profile'
    }
  });
});

// Dashboard data from database
app.get('/api/dashboard', async (req, res) => {
  try {
    console.log('Dashboard request - fetching from database');
    
    // Get patient data
    const patient = await prisma.patient.findFirst({
      where: { email: 'test@axisimaging.com.au' }
    });
    
    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found',
        message: 'No patient data available'
      });
    }
    
    // Get studies count
    const totalStudies = await prisma.study.count({
      where: { patientId: patient.id }
    });
    
    // Get recent studies
    const recentStudies = await prisma.study.findMany({
      where: { patientId: patient.id },
      include: {
        report: true,
        images: {
          take: 1
        }
      },
      orderBy: { studyDate: 'desc' },
      take: 5
    });
    
    // Get pending reports count
    const pendingReports = await prisma.study.count({
      where: {
        patientId: patient.id,
        report: null
      }
    });
    
    const dashboardData = {
      patient: {
        name: `${patient.firstName} ${patient.lastName}`,
        id: patient.id,
        email: patient.email
      },
      stats: {
        totalScans: totalStudies,
        pendingResults: pendingReports,
        recentScans: Math.min(totalStudies, 5),
        upcomingAppointments: 0 // TODO: Add appointments table
      },
      recentStudies: recentStudies.map(study => ({
        id: study.id,
        date: study.studyDate.toISOString().split('T')[0],
        modality: study.modality,
        description: study.studyDescription,
        status: study.status,
        reportAvailable: !!study.report,
        imageCount: study.numberOfImages || 0,
        bodyPart: study.bodyPartExamined
      }))
    };
    
    console.log('Dashboard data sent:', JSON.stringify(dashboardData, null, 2));
    res.status(200).json(dashboardData);
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      error: 'Database error',
      message: 'Failed to fetch dashboard data',
      details: error.message
    });
  }
});

// Studies endpoint from database
app.get('/api/studies', async (req, res) => {
  try {
    console.log('Studies request - fetching from database');
    
    // Get patient
    const patient = await prisma.patient.findFirst({
      where: { email: 'test@axisimaging.com.au' }
    });
    
    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found',
        studies: []
      });
    }
    
    // Get all studies for patient
    const studies = await prisma.study.findMany({
      where: { patientId: patient.id },
      include: {
        report: true,
        images: true,
        series: {
          include: {
            images: true
          }
        }
      },
      orderBy: { studyDate: 'desc' }
    });
    
    const studiesData = {
      studies: studies.map(study => ({
        id: study.id,
        patientId: study.patientId,
        studyDate: study.studyDate.toISOString(),
        modality: study.modality,
        studyDescription: study.studyDescription,
        bodyPartExamined: study.bodyPartExamined,
        status: study.status,
        priority: study.priority || 'NORMAL',
        accessionNumber: study.accessionNumber,
        studyInstanceUID: study.studyInstanceUID,
        reportStatus: study.report ? 'FINAL' : 'PENDING',
        imageCount: study.numberOfImages || study.images.length,
        report: study.report ? {
          id: study.report.id,
          impression: study.report.impression,
          findings: study.report.findings,
          technique: study.report.technique,
          clinicalHistory: study.report.clinicalHistory,
          radiologist: study.report.radiologist,
          reportDate: study.report.reportDate
        } : null,
        images: study.images.map(image => ({
          id: image.id,
          sopInstanceUID: image.sopInstanceUID,
          instanceNumber: image.instanceNumber,
          imageUrl: image.imageUrl,
          thumbnailUrl: image.thumbnailUrl
        }))
      }))
    };
    
    console.log(`Studies data sent: ${studies.length} studies`);
    res.status(200).json(studiesData);
    
  } catch (error) {
    console.error('Studies error:', error);
    res.status(500).json({
      error: 'Database error',
      message: 'Failed to fetch studies data',
      details: error.message,
      studies: []
    });
  }
});

// Authentication endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  console.log('Login attempt:', { email: email || 'none', hasPassword: !!password });
  
  try {
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password required'
      });
    }
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        patient: true
      }
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // In production, you would verify password hash here
    // For now, accept any password for demo purposes
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.patient?.firstName || 'User',
        lastName: user.patient?.lastName || '',
        phoneNumber: user.patient?.phoneNumber || ''
      },
      token: 'jwt-token-' + Date.now() // In production, generate real JWT
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// Patient profile from database
app.get('/api/patients/profile', async (req, res) => {
  try {
    console.log('Profile request - fetching from database');
    
    const patient = await prisma.patient.findFirst({
      where: { email: 'test@axisimaging.com.au' }
    });
    
    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found'
      });
    }
    
    const profileData = {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
      phoneNumber: patient.phoneNumber,
      dateOfBirth: patient.dateOfBirth?.toISOString().split('T')[0],
      address: {
        street: patient.addressLine1 || '',
        suburb: patient.suburb || '',
        state: patient.state || '',
        postcode: patient.postcode || '',
        country: patient.country || 'Australia'
      }
    };
    
    console.log('Profile data sent:', JSON.stringify(profileData, null, 2));
    res.status(200).json(profileData);
    
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      error: 'Database error',
      message: 'Failed to fetch profile data',
      details: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Axis Imaging Patient Portal API (Production)',
    status: 'running',
    version: '1.0.0',
    database: 'Supabase PostgreSQL',
    endpoints: '/api'
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('404 - Not found:', req.method, req.originalUrl);
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /api/health',
      'GET /api',
      'GET /api/dashboard',
      'GET /api/studies',
      'POST /api/auth/login',
      'GET /api/patients/profile'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong',
    timestamp: new Date().toISOString(),
    details: err.message
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Axis Imaging Patient Portal API (Production) running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/api/dashboard`);
  console.log(`🏥 Studies: http://localhost:${PORT}/api/studies`);
  console.log(`💾 Database: Supabase PostgreSQL`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Process terminated');
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;