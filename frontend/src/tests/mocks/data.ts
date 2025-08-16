// Mock data for testing
export const mockData = {
  users: {
    testUser: {
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+61400000000',
      isVerified: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    newUser: {
      id: 'user-2',
      email: 'new@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      phoneNumber: '+61400000001',
      isVerified: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  },

  patients: {
    testPatient: {
      id: 'patient-1',
      userId: 'user-1',
      patientNumber: 'AX001234',
      dateOfBirth: '1990-01-01',
      gender: 'MALE',
      medicareNumber: '1234567890',
      address: '123 Test Street',
      suburb: 'Melbourne',
      state: 'VIC',
      postcode: '3000',
      emergencyContactName: 'Jane Doe',
      emergencyContactPhone: '+61400000001',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  },

  studies: {
    list: [
      {
        id: 'study-1',
        patientId: 'patient-1',
        accessionNumber: 'ACC001',
        studyDate: '2024-01-15T10:00:00Z',
        modality: 'CT',
        studyDescription: 'CT Chest with Contrast',
        bodyPart: 'CHEST',
        status: 'COMPLETED',
        studyInstanceUID: 'SUID001',
        referringPhysician: 'Dr. Smith',
        hasReport: true,
        reportId: 'report-1',
        imageCount: 145,
        seriesCount: 3
      },
      {
        id: 'study-2',
        patientId: 'patient-1',
        accessionNumber: 'ACC002',
        studyDate: '2024-01-10T14:30:00Z',
        modality: 'MRI',
        studyDescription: 'MRI Brain without Contrast',
        bodyPart: 'HEAD',
        status: 'COMPLETED',
        studyInstanceUID: 'SUID002',
        referringPhysician: 'Dr. Johnson',
        hasReport: true,
        reportId: 'report-2',
        imageCount: 256,
        seriesCount: 4
      }
    ]
  },

  reports: {
    'study-1': {
      id: 'report-1',
      studyId: 'study-1',
      radiologistId: 'radiologist-1',
      clinicalHistory: 'Patient presents with chest pain and shortness of breath',
      technique: 'CT chest performed with IV contrast',
      findings: 'The lungs are clear bilaterally. No evidence of pulmonary embolism. Heart size is normal.',
      impression: 'Normal CT chest. No acute findings.',
      recommendations: 'Clinical correlation recommended.',
      status: 'FINAL',
      isCritical: false,
      reportedAt: '2024-01-15T16:00:00Z',
      approvedAt: '2024-01-15T16:30:00Z',
      radiologist: {
        firstName: 'Dr. Sarah',
        lastName: 'Wilson',
        licenseNumber: 'RAD001'
      }
    },
    'study-2': {
      id: 'report-2',
      studyId: 'study-2',
      radiologistId: 'radiologist-2',
      clinicalHistory: 'Headaches, rule out mass lesion',
      technique: 'MRI brain without contrast',
      findings: 'Normal brain MRI. No evidence of mass lesion or hemorrhage.',
      impression: 'Normal MRI brain.',
      recommendations: 'No further imaging required.',
      status: 'FINAL',
      isCritical: false,
      reportedAt: '2024-01-10T18:00:00Z',
      approvedAt: '2024-01-10T18:15:00Z',
      radiologist: {
        firstName: 'Dr. Michael',
        lastName: 'Brown',
        licenseNumber: 'RAD002'
      }
    }
  },

  appointments: {
    list: [
      {
        id: 'appointment-1',
        patientId: 'patient-1',
        appointmentDate: '2024-02-01',
        appointmentTime: '10:00',
        modality: 'CT',
        bodyPart: 'ABDOMEN',
        reason: 'Follow-up scan',
        preparationInstructions: 'NPO 4 hours prior to exam',
        status: 'SCHEDULED',
        locationId: 'location-1',
        location: {
          name: 'Axis Imaging Mickleham',
          address: 'Level 1, 107/21 Cityside Drive, Mickleham VIC 3064',
          phone: '(03) 8746 4200'
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 'appointment-2',
        patientId: 'patient-1',
        appointmentDate: '2024-01-20',
        appointmentTime: '14:30',
        modality: 'MRI',
        bodyPart: 'SPINE',
        reason: 'Lower back pain',
        preparationInstructions: 'Remove all metal objects',
        status: 'COMPLETED',
        locationId: 'location-1',
        location: {
          name: 'Axis Imaging Mickleham',
          address: 'Level 1, 107/21 Cityside Drive, Mickleham VIC 3064',
          phone: '(03) 8746 4200'
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-20T15:00:00Z'
      }
    ]
  },

  shares: {
    list: [
      {
        id: 'share-1',
        studyId: 'study-1',
        patientId: 'patient-1',
        shareType: 'GP_REFERRAL',
        recipientType: 'REFERRING_GP',
        recipientName: 'Dr. Smith',
        recipientEmail: 'dr.smith@clinic.com.au',
        recipientPhone: '+61312345678',
        accessToken: 'token-123',
        accessUrl: 'https://portal.axisimaging.com.au/shared/token-123',
        permissionLevel: 'VIEW_DOWNLOAD',
        expiresAt: '2024-04-15T00:00:00Z',
        maxAccesses: 10,
        accessCount: 2,
        status: 'ACTIVE',
        createdBy: 'PATIENT',
        createdAt: '2024-01-16T00:00:00Z',
        lastAccessedAt: '2024-01-17T10:30:00Z'
      }
    ]
  },

  notifications: [
    {
      id: 'notification-1',
      type: 'REPORT_READY',
      title: 'Report Ready',
      message: 'Your CT chest report is now available',
      read: false,
      createdAt: '2024-01-15T16:30:00Z'
    },
    {
      id: 'notification-2',
      type: 'APPOINTMENT_REMINDER',
      title: 'Appointment Reminder',
      message: 'Your appointment is tomorrow at 10:00 AM',
      read: true,
      createdAt: '2024-01-31T09:00:00Z'
    }
  ]
}