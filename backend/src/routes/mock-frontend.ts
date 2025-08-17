import { Router } from 'express';

const router = Router();

// Mock patient profile for frontend testing
router.get('/patients/profile', (req, res) => {
  res.json({
    id: 'patient-123',
    firstName: 'Arwa',
    lastName: 'May',
    email: 'arwa.may@example.com',
    phoneNumber: '+61412345678',
    dateOfBirth: '1990-05-15',
    medicareNumber: '1234567890',
    address: {
      street: '123 Collins Street',
      suburb: 'Melbourne', 
      state: 'VIC',
      postcode: '3000',
      country: 'Australia'
    },
    profilePicture: null,
    emergencyContact: {
      name: 'John May',
      relationship: 'Spouse',
      phoneNumber: '+61412345679'
    }
  });
});

// Mock dashboard stats
router.get('/dashboard/stats', (req, res) => {
  res.json({
    totalScans: 5,
    pendingResults: 1, 
    recentScans: 2,
    upcomingAppointments: 1
  });
});

// Mock dashboard data  
router.get('/dashboard', (req, res) => {
  res.json({
    patient: {
      firstName: 'Arwa',
      lastName: 'May'
    },
    stats: {
      totalScans: 5,
      pendingResults: 1,
      recentScans: 2, 
      upcomingAppointments: 1
    },
    recentScans: [
      {
        id: '1',
        title: 'Chest X-Ray',
        date: '2024-08-15',
        modality: 'X-Ray',
        status: 'Completed',
        hasReport: true,
        isViewed: false,
        thumbnail: '/mock-images/chest-xray-thumb.jpg'
      },
      {
        id: '2', 
        title: 'Abdominal Ultrasound',
        date: '2024-08-10',
        modality: 'Ultrasound',
        status: 'Completed', 
        hasReport: true,
        isViewed: true,
        thumbnail: '/mock-images/ultrasound-thumb.jpg'
      }
    ],
    upcomingAppointments: [
      {
        id: '1',
        type: 'CT Scan',
        date: '2024-08-20',
        time: '10:30 AM',
        location: 'Axis Imaging Mickleham',
        preparation: 'Fast for 4 hours before scan'
      }
    ]
  });
});

// Mock studies with pagination
router.get('/studies', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;
  
  const mockStudies = [
    {
      id: '1',
      title: 'Chest X-Ray', 
      date: '2024-08-15',
      modality: 'X-Ray',
      bodyPart: 'Chest',
      status: 'Completed',
      priority: 'Routine',
      hasReport: true,
      isViewed: false,
      thumbnail: '/mock-images/chest-xray-thumb.jpg',
      images: 2,
      reportStatus: 'Signed'
    },
    {
      id: '2',
      title: 'Abdominal Ultrasound',
      date: '2024-08-10', 
      modality: 'Ultrasound',
      bodyPart: 'Abdomen',
      status: 'Completed',
      priority: 'Routine', 
      hasReport: true,
      isViewed: true,
      thumbnail: '/mock-images/ultrasound-thumb.jpg',
      images: 15,
      reportStatus: 'Signed'
    },
    {
      id: '3',
      title: 'Brain MRI',
      date: '2024-08-05',
      modality: 'MRI',
      bodyPart: 'Brain', 
      status: 'Completed',
      priority: 'Urgent',
      hasReport: true,
      isViewed: true,
      thumbnail: '/mock-images/brain-mri-thumb.jpg',
      images: 50,
      reportStatus: 'Signed'
    },
    {
      id: '4', 
      title: 'Knee X-Ray',
      date: '2024-07-28',
      modality: 'X-Ray',
      bodyPart: 'Knee',
      status: 'Completed',
      priority: 'Routine',
      hasReport: true, 
      isViewed: true,
      thumbnail: '/mock-images/knee-xray-thumb.jpg',
      images: 3,
      reportStatus: 'Signed'
    },
    {
      id: '5',
      title: 'Cardiac CT',
      date: '2024-07-20',
      modality: 'CT',
      bodyPart: 'Heart', 
      status: 'Completed',
      priority: 'Routine',
      hasReport: false,
      isViewed: false,
      thumbnail: '/mock-images/ct-scan-thumb.jpg',
      images: 120,
      reportStatus: 'Pending'
    }
  ];

  const total = mockStudies.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const studies = mockStudies.slice(start, end);

  res.json({
    studies,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  });
});

// Mock study detail
router.get('/studies/:id', (req, res) => {
  const { id } = req.params;
  
  const mockStudyDetails = {
    '1': {
      id: '1',
      title: 'Chest X-Ray',
      date: '2024-08-15',
      modality: 'X-Ray', 
      bodyPart: 'Chest',
      status: 'Completed',
      hasReport: true,
      report: {
        technique: 'Frontal and lateral chest radiographs',
        clinicalHistory: 'Cough and chest pain for 2 weeks',
        findings: 'The lungs are clear bilaterally. No acute cardiopulmonary abnormality. Heart size and mediastinal contours are normal.',
        impression: 'Normal chest X-ray. No acute findings.',
        recommendations: 'No further imaging required at this time.'
      },
      images: [
        { id: '1', url: '/mock-images/chest-xray-1.jpg', thumbnail: '/mock-images/chest-xray-1-thumb.jpg' },
        { id: '2', url: '/mock-images/chest-xray-2.jpg', thumbnail: '/mock-images/chest-xray-2-thumb.jpg' }
      ]
    },
    '5': {
      id: '5',
      title: 'Cardiac CT',
      date: '2024-07-20', 
      modality: 'CT',
      bodyPart: 'Heart',
      status: 'Completed',
      hasReport: false,
      reportStatus: 'Pending',
      images: [
        { id: '1', url: '/mock-images/ct-scan-1.jpg', thumbnail: '/mock-images/ct-scan-1-thumb.jpg' }
      ]
    }
  };

  const study = mockStudyDetails[id as keyof typeof mockStudyDetails];
  if (!study) {
    return res.status(404).json({ error: 'Study not found' });
  }

  res.json(study);
});

// Mock appointments
router.get('/appointments', (req, res) => {
  res.json([
    {
      id: '1',
      type: 'CT Scan',
      date: '2024-08-20',
      time: '10:30 AM',
      location: 'Axis Imaging Mickleham',
      status: 'Confirmed',
      preparation: 'Fast for 4 hours before scan. Drink water only.',
      bodyPart: 'Abdomen',
      referringDoctor: 'Dr. Smith'
    }
  ]);
});

// Mock locations for booking
router.get('/locations', (req, res) => {
  res.json([
    {
      id: '1',
      name: 'Axis Imaging Mickleham',
      address: '123 Mickleham Drive, Mickleham VIC 3064',
      phone: '+61 3 7036 1709',
      services: ['X-Ray', 'CT', 'Ultrasound', 'DEXA']
    }
  ]);
});

export default router;