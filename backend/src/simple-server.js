const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data
const mockScans = [
  {
    id: '1',
    patientName: 'Lorem Ipsum Dolor Sit',
    studyDate: '2024-08-15',
    modality: 'X-Ray',
    bodyPart: 'Chest',
    status: 'new',
    radiologist: 'Dr Smith',
    findings: 'Clear chest X-ray with no acute findings',
    studyInstanceUID: 'STUDY123',
    series: [
      {
        id: 'series1',
        seriesInstanceUID: 'SERIES123',
        modality: 'XR',
        seriesDescription: 'Chest PA',
        images: [
          {
            id: 'image1',
            sopInstanceUID: 'IMAGE123',
            imageUrl: '/api/images/chest-xray.jpg'
          }
        ]
      }
    ]
  },
  {
    id: '2',
    patientName: 'Lorem Ipsum',
    studyDate: '2024-08-10',
    modality: 'CT',
    bodyPart: 'Abdomen',
    status: 'viewed',
    radiologist: 'Dr Johnson',
    findings: 'Normal abdominal CT scan',
    studyInstanceUID: 'STUDY456',
    series: [
      {
        id: 'series2',
        seriesInstanceUID: 'SERIES456',
        modality: 'CT',
        seriesDescription: 'Abdomen with contrast',
        images: [
          {
            id: 'image2',
            sopInstanceUID: 'IMAGE456',
            imageUrl: '/api/images/ct-scan.jpg'
          }
        ]
      }
    ]
  },
  {
    id: '3',
    patientName: 'Lorem Ipsum Dolor',
    studyDate: '2024-08-05',
    modality: 'Ultrasound',
    bodyPart: 'Abdomen',
    status: 'shared',
    radiologist: 'Dr Williams',
    findings: 'Normal ultrasound examination',
    studyInstanceUID: 'STUDY789',
    series: [
      {
        id: 'series3',
        seriesInstanceUID: 'SERIES789',
        modality: 'US',
        seriesDescription: 'Abdominal ultrasound',
        images: [
          {
            id: 'image3',
            sopInstanceUID: 'IMAGE789',
            imageUrl: '/api/images/ultrasound.jpg'
          }
        ]
      }
    ]
  }
];

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Mock authentication
  if (email === 'demo@axis.com' && password === 'demo123') {
    res.json({
      success: true,
      token: 'mock-jwt-token-123',
      user: {
        id: 'patient-1',
        name: 'John Smith',
        email: 'demo@axis.com',
        patientId: 'PAT001'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Studies endpoints
app.get('/api/studies/my-studies', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  res.json(mockScans);
});

app.get('/api/studies/:studyId', (req, res) => {
  const { studyId } = req.params;
  const study = mockScans.find(s => s.id === studyId);
  
  if (!study) {
    return res.status(404).json({
      success: false,
      message: 'Study not found'
    });
  }
  
  res.json(study);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Axis Imaging Patient Portal API'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Axis Imaging Patient Portal API running on port ${PORT}`);
  console.log(`📱 Ready for mobile app connections!`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});