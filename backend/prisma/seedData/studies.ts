// PostgreSQL seed data with proper enums and types

import { Modality, Priority, StudyStatus } from '@prisma/client';

export interface StudySeedData {
  studyInstanceUID: string;
  studyId?: string;
  accessionNumber: string;
  studyDate: Date;
  studyTime?: string;
  studyDescription?: string;
  modality: Modality;
  bodyPartExamined?: string;
  studyComments?: string;
  clinicalHistory?: string;
  requestedProcedure: string;
  priority: Priority;
  status: StudyStatus;
  performingPhysician?: string;
  referringPhysician?: string;
  operatorName?: string;
  stationName?: string;
  manufacturerModel?: string;
  numberOfSeries: number;
  numberOfInstances: number;
  studySize?: bigint;
  patientNumber: string; // Reference to patient
  series: SeriesSeedData[];
  radiologistId?: string; // Employee number for lookup
  technologistId?: string; // Employee number for lookup
}

export interface SeriesSeedData {
  seriesInstanceUID: string;
  seriesNumber?: number;
  seriesDate?: Date;
  seriesTime?: string;
  seriesDescription?: string;
  modality: Modality;
  bodyPartExamined?: string;
  protocolName?: string;
  seriesComments?: string;
  sliceThickness?: number;
  pixelSpacing?: string;
  imageOrientation?: string;
  imagePosition?: string;
  acquisitionMatrix?: string;
  kvp?: number;
  exposureTime?: number;
  xrayTubeCurrent?: number;
  contrastAgent?: string;
  scanOptions?: string;
  numberOfInstances: number;
  seriesSize?: bigint;
  images: ImageSeedData[];
}

export interface ImageSeedData {
  sopInstanceUID: string;
  sopClassUID?: string;
  instanceNumber?: number;
  acquisitionDate?: Date;
  acquisitionTime?: string;
  imageComments?: string;
  rows?: number;
  columns?: number;
  bitsAllocated?: number;
  bitsStored?: number;
  pixelRepresentation?: number;
  photometricInterpretation?: string;
  windowCenter?: string;
  windowWidth?: string;
  windowCenterWidthExplanation?: string;
  pixelSpacing?: string;
  sliceLocation?: number;
  sliceThickness?: number;
  imagePosition?: string;
  imageOrientation?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  jpegUrl?: string;
  fileSize?: bigint;
  transferSyntax?: string;
  imageQuality?: string;
  lossy: boolean;
  lossyMethod?: string;
  metadata?: any;
}

export const studySeedData: StudySeedData[] = [
  // Study 1: Chest X-Ray for Sarah Mitchell
  {
    studyInstanceUID: '1.2.840.10008.5.1.4.1.1.1.1',
    studyId: 'STU001001',
    accessionNumber: 'ACC20240101001',
    studyDate: new Date('2024-01-15T09:30:00'),
    studyTime: '09:30:00',
    studyDescription: 'CHEST PA AND LATERAL',
    modality: Modality.DX,
    bodyPartExamined: 'CHEST',
    studyComments: 'Routine chest examination',
    clinicalHistory: 'Annual health check, no respiratory symptoms',
    requestedProcedure: 'Chest X-Ray PA and Lateral',
    priority: Priority.ROUTINE,
    status: StudyStatus.FINAL,
    performingPhysician: 'Dr. Amanda Richards',
    referringPhysician: 'Dr. David Peterson',
    operatorName: 'Tech01 - Mark Stevens',
    stationName: 'XR-ROOM-01',
    manufacturerModel: 'Philips DigitalDiagnost C90',
    numberOfSeries: 2,
    numberOfInstances: 2,
    studySize: BigInt('25600000'), // ~25MB
    patientNumber: 'AXI001001',
    series: [
      {
        seriesInstanceUID: '1.2.840.10008.5.1.4.1.1.1.1.1',
        seriesNumber: 1,
        seriesDate: new Date('2024-01-15T09:30:00'),
        seriesTime: '09:30:00',
        seriesDescription: 'PA CHEST',
        modality: Modality.DX,
        bodyPartExamined: 'CHEST',
        protocolName: 'CHEST PA',
        kvp: 120,
        exposureTime: 10,
        xrayTubeCurrent: 320,
        acquisitionMatrix: '2880\\2880',
        numberOfInstances: 1,
        seriesSize: BigInt('12800000'),
        images: [
          {
            sopInstanceUID: '1.2.840.10008.5.1.4.1.1.1.1.1.1',
            sopClassUID: '1.2.840.113619.2.55.3.198',
            instanceNumber: 1,
            acquisitionDate: new Date('2024-01-15T09:30:00'),
            acquisitionTime: '09:30:15',
            rows: 2880,
            columns: 2880,
            bitsAllocated: 16,
            bitsStored: 14,
            pixelRepresentation: 0,
            photometricInterpretation: 'MONOCHROME2',
            windowCenter: '2048',
            windowWidth: '4096',
            windowCenterWidthExplanation: 'NORMAL',
            pixelSpacing: '0.143\\0.143',
            imageUrl: '/dicom/images/chest-pa-001.dcm',
            thumbnailUrl: '/images/thumbnails/chest-pa-001-thumb.jpg',
            jpegUrl: '/images/chest-pa-001.jpg',
            fileSize: BigInt('12800000'),
            transferSyntax: '1.2.840.10008.1.2.1',
            imageQuality: 'ORIGINAL\\PRIMARY',
            lossy: false,
            metadata: {
              PatientPosition: 'PA',
              ViewPosition: 'PA',
              ImageLaterality: '',
              DistanceSourceToDetector: 1800,
              DistanceSourceToPatient: 1500
            }
          }
        ]
      },
      {
        seriesInstanceUID: '1.2.840.10008.5.1.4.1.1.1.1.2',
        seriesNumber: 2,
        seriesDate: new Date('2024-01-15T09:32:00'),
        seriesTime: '09:32:00',
        seriesDescription: 'LATERAL CHEST',
        modality: Modality.DX,
        bodyPartExamined: 'CHEST',
        protocolName: 'CHEST LATERAL',
        kvp: 120,
        exposureTime: 15,
        xrayTubeCurrent: 400,
        acquisitionMatrix: '2880\\2880',
        numberOfInstances: 1,
        seriesSize: BigInt('12800000'),
        images: [
          {
            sopInstanceUID: '1.2.840.10008.5.1.4.1.1.1.1.2.1',
            sopClassUID: '1.2.840.113619.2.55.3.198',
            instanceNumber: 1,
            acquisitionDate: new Date('2024-01-15T09:32:00'),
            acquisitionTime: '09:32:20',
            rows: 2880,
            columns: 2880,
            bitsAllocated: 16,
            bitsStored: 14,
            pixelRepresentation: 0,
            photometricInterpretation: 'MONOCHROME2',
            windowCenter: '2048',
            windowWidth: '4096',
            windowCenterWidthExplanation: 'NORMAL',
            pixelSpacing: '0.143\\0.143',
            imageUrl: '/dicom/images/chest-lat-001.dcm',
            thumbnailUrl: '/images/thumbnails/chest-lat-001-thumb.jpg',
            jpegUrl: '/images/chest-lat-001.jpg',
            fileSize: BigInt('12800000'),
            transferSyntax: '1.2.840.10008.1.2.1',
            imageQuality: 'ORIGINAL\\PRIMARY',
            lossy: false,
            metadata: {
              PatientPosition: 'LAT',
              ViewPosition: 'LAT',
              ImageLaterality: '',
              DistanceSourceToDetector: 1800,
              DistanceSourceToPatient: 1500
            }
          }
        ]
      }
    ]
  },

  // Study 2: Lumbar Spine MRI for James Thompson
  {
    studyInstanceUID: '1.2.840.10008.5.1.4.1.1.4.1',
    studyId: 'STU001002',
    accessionNumber: 'ACC20240102001',
    studyDate: new Date('2024-01-16T14:15:00'),
    studyTime: '14:15:00',
    studyDescription: 'MRI LUMBAR SPINE',
    modality: Modality.MR,
    bodyPartExamined: 'LUMBAR SPINE',
    studyComments: 'Chronic back pain assessment',
    clinicalHistory: 'Chronic lower back pain, previous L4-L5 surgery, ongoing symptoms',
    requestedProcedure: 'MRI Lumbar Spine without contrast',
    priority: Priority.ROUTINE,
    status: StudyStatus.FINAL,
    performingPhysician: 'Dr. Michael Roberts',
    referringPhysician: 'Dr. Sarah Johnson',
    operatorName: 'Tech02 - Lisa Cooper',
    stationName: 'MR-ROOM-01',
    manufacturerModel: 'Siemens MAGNETOM Vida 3.0T',
    numberOfSeries: 5,
    numberOfInstances: 125,
    studySize: BigInt('250000000'), // ~250MB
    patientNumber: 'AXI001002',
    series: [
      {
        seriesInstanceUID: '1.2.840.10008.5.1.4.1.1.4.1.1',
        seriesNumber: 1,
        seriesDate: new Date('2024-01-16T14:15:00'),
        seriesTime: '14:15:00',
        seriesDescription: 'T1 SAG',
        modality: Modality.MR,
        bodyPartExamined: 'LUMBAR SPINE',
        protocolName: 'T1_SE_SAG',
        seriesComments: 'T1 weighted sagittal images',
        sliceThickness: 4.0,
        pixelSpacing: '0.78125\\0.78125',
        imageOrientation: '0\\1\\0\\0\\0\\-1',
        acquisitionMatrix: '256\\256',
        numberOfInstances: 25,
        seriesSize: BigInt('50000000'),
        images: Array.from({ length: 25 }, (_, i) => ({
          sopInstanceUID: `1.2.840.10008.5.1.4.1.1.4.1.1.${i + 1}`,
          sopClassUID: '1.2.840.10008.5.1.4.1.1.4',
          instanceNumber: i + 1,
          acquisitionDate: new Date('2024-01-16T14:15:00'),
          acquisitionTime: `14:${15 + Math.floor(i / 10)}:${(i * 2) % 60}`,
          rows: 256,
          columns: 256,
          bitsAllocated: 16,
          bitsStored: 12,
          pixelRepresentation: 0,
          photometricInterpretation: 'MONOCHROME2',
          windowCenter: '600',
          windowWidth: '1200',
          pixelSpacing: '0.78125\\0.78125',
          sliceLocation: -60 + (i * 4),
          sliceThickness: 4.0,
          imagePosition: `0\\${-60 + (i * 4)}\\0`,
          imageOrientation: '0\\1\\0\\0\\0\\-1',
          imageUrl: `/dicom/images/lumbar-t1-sag-${String(i + 1).padStart(3, '0')}.dcm`,
          thumbnailUrl: `/images/thumbnails/lumbar-t1-sag-${String(i + 1).padStart(3, '0')}-thumb.jpg`,
          jpegUrl: `/images/lumbar-t1-sag-${String(i + 1).padStart(3, '0')}.jpg`,
          fileSize: BigInt('2000000'),
          transferSyntax: '1.2.840.10008.1.2.1',
          imageQuality: 'ORIGINAL\\PRIMARY\\T1\\SAG',
          lossy: false,
          metadata: {
            MagneticFieldStrength: 3.0,
            RepetitionTime: 500,
            EchoTime: 12,
            FlipAngle: 90,
            SlicePosition: -60 + (i * 4)
          }
        }))
      }
      // Additional series would follow similar pattern for T2 SAG, T2 AX, STIR, etc.
    ]
  },

  // Study 3: Abdominal CT for Robert Wilson
  {
    studyInstanceUID: '1.2.840.10008.5.1.4.1.1.2.1',
    studyId: 'STU001003',
    accessionNumber: 'ACC20240103001',
    studyDate: new Date('2024-01-17T11:00:00'),
    studyTime: '11:00:00',
    studyDescription: 'CT ABDOMEN PELVIS WITH CONTRAST',
    modality: Modality.CT,
    bodyPartExamined: 'ABDOMEN PELVIS',
    studyComments: 'Routine surveillance',
    clinicalHistory: 'Atrial fibrillation, checking for any abdominal pathology',
    requestedProcedure: 'CT Abdomen and Pelvis with IV contrast',
    priority: Priority.ROUTINE,
    status: StudyStatus.FINAL,
    performingPhysician: 'Dr. Jennifer Park',
    referringPhysician: 'Dr. Michael Chen',
    operatorName: 'Tech03 - David Kim',
    stationName: 'CT-ROOM-01',
    manufacturerModel: 'GE Revolution CT 256',
    numberOfSeries: 3,
    numberOfInstances: 450,
    studySize: BigInt('675000000'), // ~675MB
    patientNumber: 'AXI001004',
    series: [
      {
        seriesInstanceUID: '1.2.840.10008.5.1.4.1.1.2.1.1',
        seriesNumber: 1,
        seriesDate: new Date('2024-01-17T11:00:00'),
        seriesTime: '11:00:00',
        seriesDescription: 'AXIAL NONCON',
        modality: Modality.CT,
        bodyPartExamined: 'ABDOMEN PELVIS',
        protocolName: 'ABD_PEL_NONCON',
        seriesComments: 'Pre-contrast axial images',
        sliceThickness: 2.5,
        pixelSpacing: '0.625\\0.625',
        kvp: 120,
        exposureTime: 500,
        xrayTubeCurrent: 200,
        acquisitionMatrix: '512\\512',
        numberOfInstances: 150,
        seriesSize: BigInt('225000000'),
        images: Array.from({ length: 150 }, (_, i) => ({
          sopInstanceUID: `1.2.840.10008.5.1.4.1.1.2.1.1.${i + 1}`,
          sopClassUID: '1.2.840.10008.5.1.4.1.1.2',
          instanceNumber: i + 1,
          acquisitionDate: new Date('2024-01-17T11:00:00'),
          acquisitionTime: `11:00:${String(i * 2).padStart(2, '0')}`,
          rows: 512,
          columns: 512,
          bitsAllocated: 16,
          bitsStored: 12,
          pixelRepresentation: 0,
          photometricInterpretation: 'MONOCHROME2',
          windowCenter: '50',
          windowWidth: '350',
          windowCenterWidthExplanation: 'SOFT_TISSUE',
          pixelSpacing: '0.625\\0.625',
          sliceLocation: -375 + (i * 2.5),
          sliceThickness: 2.5,
          imagePosition: `0\\0\\${-375 + (i * 2.5)}`,
          imageOrientation: '1\\0\\0\\0\\1\\0',
          imageUrl: `/dicom/images/ct-abd-noncon-${String(i + 1).padStart(3, '0')}.dcm`,
          thumbnailUrl: `/images/thumbnails/ct-abd-noncon-${String(i + 1).padStart(3, '0')}-thumb.jpg`,
          jpegUrl: `/images/ct-abd-noncon-${String(i + 1).padStart(3, '0')}.jpg`,
          fileSize: BigInt('1500000'),
          transferSyntax: '1.2.840.10008.1.2.1',
          imageQuality: 'ORIGINAL\\PRIMARY\\AXIAL',
          lossy: false,
          metadata: {
            KVP: 120,
            DataCollectionDiameter: 500,
            ReconstructionDiameter: 350,
            ConvolutionKernel: 'STANDARD',
            SlicePosition: -375 + (i * 2.5)
          }
        }))
      }
    ]
  },

  // Study 4: Breast Ultrasound for Jennifer Brown
  {
    studyInstanceUID: '1.2.840.10008.5.1.4.1.1.6.1',
    studyId: 'STU001004',
    accessionNumber: 'ACC20240104001',
    studyDate: new Date('2024-01-18T15:45:00'),
    studyTime: '15:45:00',
    studyDescription: 'US BREAST BILATERAL',
    modality: Modality.US,
    bodyPartExamined: 'BREAST',
    studyComments: 'Bilateral breast screening',
    clinicalHistory: 'Family history of breast cancer, routine screening',
    requestedProcedure: 'Bilateral breast ultrasound',
    priority: Priority.ROUTINE,
    status: StudyStatus.FINAL,
    performingPhysician: 'Dr. Rachel Stone',
    referringPhysician: 'Dr. Emma Williams',
    operatorName: 'Tech04 - Sarah White',
    stationName: 'US-ROOM-02',
    manufacturerModel: 'Philips EPIQ Elite',
    numberOfSeries: 4,
    numberOfInstances: 24,
    studySize: BigInt('48000000'), // ~48MB
    patientNumber: 'AXI001005',
    series: [
      {
        seriesInstanceUID: '1.2.840.10008.5.1.4.1.1.6.1.1',
        seriesNumber: 1,
        seriesDate: new Date('2024-01-18T15:45:00'),
        seriesTime: '15:45:00',
        seriesDescription: 'RIGHT BREAST',
        modality: Modality.US,
        bodyPartExamined: 'BREAST',
        protocolName: 'BREAST_SCREENING',
        seriesComments: 'Right breast examination',
        numberOfInstances: 12,
        seriesSize: BigInt('24000000'),
        images: Array.from({ length: 12 }, (_, i) => ({
          sopInstanceUID: `1.2.840.10008.5.1.4.1.1.6.1.1.${i + 1}`,
          sopClassUID: '1.2.840.10008.5.1.4.1.1.6.1',
          instanceNumber: i + 1,
          acquisitionDate: new Date('2024-01-18T15:45:00'),
          acquisitionTime: `15:${45 + Math.floor(i / 6)}:${(i * 5) % 60}`,
          rows: 480,
          columns: 640,
          bitsAllocated: 8,
          bitsStored: 8,
          pixelRepresentation: 0,
          photometricInterpretation: 'MONOCHROME2',
          windowCenter: '128',
          windowWidth: '256',
          pixelSpacing: '0.1\\0.1',
          imageUrl: `/dicom/images/us-breast-right-${String(i + 1).padStart(2, '0')}.dcm`,
          thumbnailUrl: `/images/thumbnails/us-breast-right-${String(i + 1).padStart(2, '0')}-thumb.jpg`,
          jpegUrl: `/images/us-breast-right-${String(i + 1).padStart(2, '0')}.jpg`,
          fileSize: BigInt('2000000'),
          transferSyntax: '1.2.840.10008.1.2',
          imageQuality: 'ORIGINAL\\PRIMARY',
          lossy: false,
          metadata: {
            UltrasoundColorDataPresent: 0,
            MechanicalIndex: 1.2,
            ThermalIndex: 0.8,
            TransducerFrequency: 12.0
          }
        }))
      }
    ]
  },

  // Study 5: Knee X-Ray for Lisa Anderson
  {
    studyInstanceUID: '1.2.840.10008.5.1.4.1.1.1.2',
    studyId: 'STU001005',
    accessionNumber: 'ACC20240105001',
    studyDate: new Date('2024-01-19T10:20:00'),
    studyTime: '10:20:00',
    studyDescription: 'XRAY KNEE LEFT',
    modality: Modality.DX,
    bodyPartExamined: 'KNEE',
    studyComments: 'Sports injury assessment',
    clinicalHistory: 'Left knee pain after fall, rule out fracture',
    requestedProcedure: 'Left knee X-ray AP and lateral',
    priority: Priority.URGENT,
    status: StudyStatus.FINAL,
    performingPhysician: 'Dr. Thomas Lee',
    referringPhysician: 'Dr. Robert Taylor',
    operatorName: 'Tech01 - Mark Stevens',
    stationName: 'XR-ROOM-02',
    manufacturerModel: 'Siemens Ysio Max',
    numberOfSeries: 2,
    numberOfInstances: 2,
    studySize: BigInt('20000000'), // ~20MB
    patientNumber: 'AXI001007',
    series: [
      {
        seriesInstanceUID: '1.2.840.10008.5.1.4.1.1.1.2.1',
        seriesNumber: 1,
        seriesDescription: 'AP KNEE LEFT',
        modality: Modality.DX,
        bodyPartExamined: 'KNEE',
        protocolName: 'KNEE_AP',
        kvp: 70,
        exposureTime: 8,
        xrayTubeCurrent: 100,
        numberOfInstances: 1,
        images: [
          {
            sopInstanceUID: '1.2.840.10008.5.1.4.1.1.1.2.1.1',
            instanceNumber: 1,
            rows: 2048,
            columns: 2048,
            bitsAllocated: 16,
            bitsStored: 14,
            photometricInterpretation: 'MONOCHROME2',
            imageUrl: '/dicom/images/knee-ap-left.dcm',
            thumbnailUrl: '/images/thumbnails/knee-ap-left-thumb.jpg',
            jpegUrl: '/images/knee-ap-left.jpg',
            lossy: false,
            metadata: {
              PatientPosition: 'AP',
              ViewPosition: 'AP',
              ImageLaterality: 'L'
            }
          }
        ]
      }
    ]
  },

  // Study 6: Head CT for William Davis (urgent)
  {
    studyInstanceUID: '1.2.840.10008.5.1.4.1.1.2.2',
    studyId: 'STU001006',
    accessionNumber: 'ACC20240106001',
    studyDate: new Date('2024-01-20T02:15:00'),
    studyTime: '02:15:00',
    studyDescription: 'CT HEAD WITHOUT CONTRAST',
    modality: Modality.CT,
    bodyPartExamined: 'HEAD',
    studyComments: 'Emergency presentation',
    clinicalHistory: 'Fall at home, confusion, rule out intracranial bleed',
    requestedProcedure: 'Urgent CT head without contrast',
    priority: Priority.EMERGENCY,
    status: StudyStatus.FINAL,
    performingPhysician: 'Dr. Sarah Mitchell',
    referringPhysician: 'Emergency Department',
    operatorName: 'Tech05 - Night Tech',
    stationName: 'CT-ROOM-02',
    manufacturerModel: 'Philips Brilliance 64',
    numberOfSeries: 2,
    numberOfInstances: 40,
    studySize: BigInt('80000000'), // ~80MB
    patientNumber: 'AXI001006',
    series: [
      {
        seriesInstanceUID: '1.2.840.10008.5.1.4.1.1.2.2.1',
        seriesNumber: 1,
        seriesDescription: 'AXIAL',
        modality: Modality.CT,
        bodyPartExamined: 'HEAD',
        protocolName: 'HEAD_NONCON',
        sliceThickness: 5.0,
        kvp: 120,
        exposureTime: 1000,
        numberOfInstances: 20,
        images: Array.from({ length: 20 }, (_, i) => ({
          sopInstanceUID: `1.2.840.10008.5.1.4.1.1.2.2.1.${i + 1}`,
          instanceNumber: i + 1,
          rows: 512,
          columns: 512,
          bitsAllocated: 16,
          photometricInterpretation: 'MONOCHROME2',
          windowCenter: '35',
          windowWidth: '80',
          sliceThickness: 5.0,
          imageUrl: `/dicom/images/ct-head-${String(i + 1).padStart(2, '0')}.dcm`,
          thumbnailUrl: `/images/thumbnails/ct-head-${String(i + 1).padStart(2, '0')}-thumb.jpg`,
          jpegUrl: `/images/ct-head-${String(i + 1).padStart(2, '0')}.jpg`,
          lossy: false,
          metadata: {
            WindowCenterWidthExplanation: 'BRAIN',
            ConvolutionKernel: 'BRAIN'
          }
        }))
      }
    ]
  },

  // Study 7: Mammography for Maria Rodriguez
  {
    studyInstanceUID: '1.2.840.10008.5.1.4.1.1.1.3',
    studyId: 'STU001007',
    accessionNumber: 'ACC20240107001',
    studyDate: new Date('2024-01-21T13:30:00'),
    studyTime: '13:30:00',
    studyDescription: 'MAMMOGRAPHY BILATERAL SCREENING',
    modality: Modality.MG,
    bodyPartExamined: 'BREAST',
    studyComments: 'Annual screening mammography',
    clinicalHistory: 'No current breast symptoms, family history of breast cancer',
    requestedProcedure: 'Bilateral screening mammography',
    priority: Priority.ROUTINE,
    status: StudyStatus.FINAL,
    performingPhysician: 'Dr. Helen Morrison',
    referringPhysician: 'Dr. Sarah Johnson',
    operatorName: 'Tech06 - Jenny Adams',
    stationName: 'MAMMO-ROOM-01',
    manufacturerModel: 'Hologic Selenia Dimensions 3D',
    numberOfSeries: 4,
    numberOfInstances: 8,
    studySize: BigInt('120000000'), // ~120MB
    patientNumber: 'AXI001003',
    series: [
      {
        seriesInstanceUID: '1.2.840.10008.5.1.4.1.1.1.3.1',
        seriesNumber: 1,
        seriesDescription: 'R CC',
        modality: Modality.MG,
        bodyPartExamined: 'BREAST',
        protocolName: 'SCREENING_MAMMO',
        seriesComments: 'Right craniocaudal view',
        kvp: 28,
        exposureTime: 1500,
        numberOfInstances: 2,
        images: [
          {
            sopInstanceUID: '1.2.840.10008.5.1.4.1.1.1.3.1.1',
            instanceNumber: 1,
            rows: 3328,
            columns: 2560,
            bitsAllocated: 16,
            photometricInterpretation: 'MONOCHROME2',
            windowCenter: '2000',
            windowWidth: '4000',
            imageUrl: '/dicom/images/mammo-r-cc.dcm',
            thumbnailUrl: '/images/thumbnails/mammo-r-cc-thumb.jpg',
            jpegUrl: '/images/mammo-r-cc.jpg',
            lossy: false,
            metadata: {
              ViewPosition: 'CC',
              ImageLaterality: 'R',
              CompressionForce: 120,
              BreastThickness: 45
            }
          }
        ]
      }
    ]
  },

  // Study 8: Abdominal Ultrasound for Antonio Giuseppe
  {
    studyInstanceUID: '1.2.840.10008.5.1.4.1.1.6.2',
    studyId: 'STU001008',
    accessionNumber: 'ACC20240108001',
    studyDate: new Date('2024-01-22T11:45:00'),
    studyTime: '11:45:00',
    studyDescription: 'US ABDOMEN COMPLETE',
    modality: Modality.US,
    bodyPartExamined: 'ABDOMEN',
    studyComments: 'Diabetes follow-up',
    clinicalHistory: 'Type 2 diabetes, peripheral vascular disease, check for complications',
    requestedProcedure: 'Complete abdominal ultrasound',
    priority: Priority.ROUTINE,
    status: StudyStatus.FINAL,
    performingPhysician: 'Dr. Paul Anderson',
    referringPhysician: 'Dr. Michael Chen',
    operatorName: 'Tech07 - Maria Santos',
    stationName: 'US-ROOM-01',
    manufacturerModel: 'GE Logiq E10',
    numberOfSeries: 6,
    numberOfInstances: 30,
    studySize: BigInt('60000000'), // ~60MB
    patientNumber: 'AXI001008',
    series: [
      {
        seriesInstanceUID: '1.2.840.10008.5.1.4.1.1.6.2.1',
        seriesNumber: 1,
        seriesDescription: 'LIVER',
        modality: Modality.US,
        bodyPartExamined: 'ABDOMEN',
        protocolName: 'ABDOMINAL_US',
        numberOfInstances: 8,
        images: Array.from({ length: 8 }, (_, i) => ({
          sopInstanceUID: `1.2.840.10008.5.1.4.1.1.6.2.1.${i + 1}`,
          instanceNumber: i + 1,
          rows: 480,
          columns: 640,
          photometricInterpretation: 'MONOCHROME2',
          imageUrl: `/dicom/images/us-liver-${String(i + 1).padStart(2, '0')}.dcm`,
          thumbnailUrl: `/images/thumbnails/us-liver-${String(i + 1).padStart(2, '0')}-thumb.jpg`,
          jpegUrl: `/images/us-liver-${String(i + 1).padStart(2, '0')}.jpg`,
          lossy: false,
          metadata: {
            AnatomicRegion: 'LIVER',
            TransducerFrequency: 3.5
          }
        }))
      }
    ]
  }
];

// Additional studies for comprehensive coverage
export const additionalStudySeedData: Partial<StudySeedData>[] = [
  {
    studyInstanceUID: '1.2.840.10008.5.1.4.1.1.4.2',
    accessionNumber: 'ACC20240109001',
    studyDate: new Date('2024-01-23T09:00:00'),
    studyDescription: 'MRI BRAIN WITH CONTRAST',
    modality: Modality.MR,
    bodyPartExamined: 'BRAIN',
    clinicalHistory: 'Headaches, rule out mass lesion',
    requestedProcedure: 'MRI brain with and without contrast',
    priority: Priority.ROUTINE,
    status: StudyStatus.FINAL,
    patientNumber: 'AXI001009',
    numberOfSeries: 8,
    numberOfInstances: 200,
    studySize: BigInt('400000000')
  },
  {
    studyInstanceUID: '1.2.840.10008.5.1.4.1.1.128.1',
    accessionNumber: 'ACC20240110001',
    studyDate: new Date('2024-01-24T14:30:00'),
    studyDescription: 'PET CT WHOLE BODY',
    modality: Modality.PT,
    bodyPartExamined: 'WHOLEBODY',
    clinicalHistory: 'Staging study',
    requestedProcedure: 'FDG PET-CT whole body',
    priority: Priority.URGENT,
    status: StudyStatus.PRELIMINARY,
    patientNumber: 'AXI001010',
    numberOfSeries: 12,
    numberOfInstances: 300,
    studySize: BigInt('600000000')
  },
  {
    studyInstanceUID: '1.2.840.10008.5.1.4.1.1.2.3',
    accessionNumber: 'ACC20240111001',
    studyDate: new Date('2024-01-25T16:00:00'),
    studyDescription: 'CT CHEST WITH CONTRAST',
    modality: Modality.CT,
    bodyPartExamined: 'CHEST',
    clinicalHistory: 'Shortness of breath, rule out pulmonary embolism',
    requestedProcedure: 'CTPA - CT pulmonary angiogram',
    priority: Priority.URGENT,
    status: StudyStatus.FINAL,
    patientNumber: 'AXI001011',
    numberOfSeries: 3,
    numberOfInstances: 180,
    studySize: BigInt('360000000')
  }
];