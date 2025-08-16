import { 
  Modality, 
  Priority, 
  StudyStatus, 
  PrismaClient 
} from '@prisma/client';
import { 
  StudyViewStatus, 
  ShareStatus 
} from '../../../shared/src/types';

const prisma = new PrismaClient();

interface MockStudyConfig {
  patientId: string;
  numberOfStudies?: number;
  dateRange?: {
    from: Date;
    to: Date;
  };
  modalities?: Modality[];
  includeReports?: boolean;
  includeCritical?: boolean;
}

export class StudyMockDataService {
  private readonly axisImagingData = {
    institution: 'Axis Imaging Mickleham',
    address: '1234 Donnybrook Road, Mickleham, VIC 3064, Australia',
    phone: '03 9335 1234',
    fax: '03 9335 1235',
    email: 'info@axisimaging.com.au',
    abn: '12 345 678 901',
    providerNumber: 'AXI001'
  };

  private readonly radiologists = [
    {
      name: 'Dr. Sarah Mitchell',
      employeeNumber: 'RAD001',
      ahpraNumber: 'MED0001234567',
      specializations: ['Musculoskeletal', 'Chest Imaging'],
      qualifications: ['MBBS', 'FRANZCR']
    },
    {
      name: 'Dr. Michael Roberts',
      employeeNumber: 'RAD002',
      ahpraNumber: 'MED0002345678',
      specializations: ['Neuroradiology', 'Spine Imaging'],
      qualifications: ['MBBS', 'FRANZCR', 'MMed']
    },
    {
      name: 'Dr. Jennifer Park',
      employeeNumber: 'RAD003',
      ahpraNumber: 'MED0003456789',
      specializations: ['Abdominal Imaging', 'Oncology'],
      qualifications: ['MBBS', 'FRANZCR']
    },
    {
      name: 'Dr. Thomas Lee',
      employeeNumber: 'RAD004',
      ahpraNumber: 'MED0004567890',
      specializations: ['Cardiac Imaging', 'Vascular'],
      qualifications: ['MBBS', 'FRANZCR', 'PhD']
    },
    {
      name: 'Dr. Rachel Stone',
      employeeNumber: 'RAD005',
      ahpraNumber: 'MED0005678901',
      specializations: ['Breast Imaging', 'Women\'s Health'],
      qualifications: ['MBBS', 'FRANZCR']
    }
  ];

  private readonly technologists = [
    { name: 'Mark Stevens', employeeNumber: 'TECH001', modalities: ['DX', 'CR'] },
    { name: 'Lisa Cooper', employeeNumber: 'TECH002', modalities: ['MR'] },
    { name: 'David Kim', employeeNumber: 'TECH003', modalities: ['CT'] },
    { name: 'Sarah White', employeeNumber: 'TECH004', modalities: ['US'] },
    { name: 'James Wilson', employeeNumber: 'TECH005', modalities: ['DX', 'CT'] },
    { name: 'Maria Santos', employeeNumber: 'TECH006', modalities: ['US', 'MG'] },
    { name: 'Peter Chang', employeeNumber: 'TECH007', modalities: ['NM', 'PT'] }
  ];

  private readonly referringDoctors = [
    { name: 'Dr. David Peterson', providerNumber: 'GP001234A', practice: 'Mickleham Medical Centre' },
    { name: 'Dr. Emma Williams', providerNumber: 'GP002345B', practice: 'Craigieburn Family Practice' },
    { name: 'Dr. Robert Taylor', providerNumber: 'GP003456C', practice: 'Donnybrook Health Clinic' },
    { name: 'Dr. Sarah Johnson', providerNumber: 'GP004567D', practice: 'Roxburgh Park Medical' },
    { name: 'Dr. Michael Chen', providerNumber: 'GP005678E', practice: 'Greenvale Medical Centre' }
  ];

  private readonly equipment = {
    DX: ['Philips DigitalDiagnost C90', 'Siemens Ysio Max'],
    CT: ['GE Revolution CT 256', 'Philips Brilliance 64', 'Siemens SOMATOM Force'],
    MR: ['Siemens MAGNETOM Vida 3.0T', 'Philips Ingenia 1.5T', 'GE SIGNA Premier 3.0T'],
    US: ['Philips EPIQ Elite', 'GE Logiq E10', 'Siemens ACUSON Sequoia'],
    MG: ['Hologic Selenia Dimensions 3D', 'Siemens MAMMOMAT Revelation'],
    NM: ['GE Discovery NM/CT 670', 'Siemens Symbia Intevo'],
    PT: ['Siemens Biograph Vision', 'GE Discovery MI']
  };

  private readonly bodyParts = {
    DX: ['CHEST', 'ABDOMEN', 'SPINE', 'EXTREMITY', 'SKULL', 'PELVIS'],
    CT: ['HEAD', 'CHEST', 'ABDOMEN', 'PELVIS', 'SPINE', 'EXTREMITY', 'NECK'],
    MR: ['BRAIN', 'SPINE', 'ABDOMEN', 'PELVIS', 'EXTREMITY', 'CARDIAC', 'BREAST'],
    US: ['ABDOMEN', 'PELVIS', 'BREAST', 'THYROID', 'VASCULAR', 'MUSCULOSKELETAL'],
    MG: ['BREAST'],
    NM: ['BONE', 'CARDIAC', 'THYROID', 'LUNG', 'RENAL'],
    PT: ['WHOLEBODY', 'BRAIN', 'CARDIAC']
  };

  private readonly studyDescriptions = {
    DX: {
      CHEST: ['CHEST PA AND LATERAL', 'CHEST PA', 'CHEST PORTABLE'],
      SPINE: ['LUMBAR SPINE AP/LAT', 'CERVICAL SPINE', 'THORACIC SPINE'],
      EXTREMITY: ['KNEE AP/LAT', 'ANKLE AP/LAT/OBLIQUE', 'SHOULDER AP/Y VIEW', 'WRIST PA/LAT'],
      ABDOMEN: ['ABDOMEN AP', 'KUB (KIDNEYS, URETERS, BLADDER)'],
      SKULL: ['SKULL AP/LAT', 'FACIAL BONES', 'MANDIBLE'],
      PELVIS: ['PELVIS AP', 'HIP AP/LAT']
    },
    CT: {
      HEAD: ['CT HEAD WITHOUT CONTRAST', 'CT HEAD WITH CONTRAST', 'CTA HEAD'],
      CHEST: ['CT CHEST WITH CONTRAST', 'HRCT CHEST', 'CTPA'],
      ABDOMEN: ['CT ABDOMEN PELVIS WITH CONTRAST', 'CT ABDOMEN WITHOUT CONTRAST'],
      SPINE: ['CT LUMBAR SPINE', 'CT CERVICAL SPINE'],
      NECK: ['CT NECK WITH CONTRAST', 'CTA NECK']
    },
    MR: {
      BRAIN: ['MRI BRAIN WITH CONTRAST', 'MRI BRAIN WITHOUT CONTRAST', 'MRA BRAIN'],
      SPINE: ['MRI LUMBAR SPINE', 'MRI CERVICAL SPINE', 'MRI WHOLE SPINE'],
      ABDOMEN: ['MRI ABDOMEN WITH CONTRAST', 'MRCP'],
      PELVIS: ['MRI PELVIS', 'MRI PROSTATE'],
      CARDIAC: ['CARDIAC MRI', 'CARDIAC MRI WITH STRESS']
    },
    US: {
      ABDOMEN: ['US ABDOMEN COMPLETE', 'US LIVER', 'US GALLBLADDER'],
      PELVIS: ['US PELVIS TRANSVAGINAL', 'US PELVIS TRANSABDOMINAL'],
      BREAST: ['US BREAST BILATERAL', 'US BREAST TARGETED'],
      THYROID: ['US THYROID', 'US THYROID WITH DOPPLER'],
      VASCULAR: ['US CAROTID DOPPLER', 'US LOWER EXTREMITY VENOUS']
    },
    MG: {
      BREAST: ['MAMMOGRAPHY BILATERAL SCREENING', 'MAMMOGRAPHY DIAGNOSTIC', 'TOMOSYNTHESIS']
    },
    NM: {
      BONE: ['BONE SCAN WHOLE BODY', 'BONE SCAN THREE PHASE'],
      CARDIAC: ['MYOCARDIAL PERFUSION SCAN', 'MUGA SCAN'],
      THYROID: ['THYROID SCAN', 'THYROID UPTAKE']
    },
    PT: {
      WHOLEBODY: ['PET CT WHOLE BODY', 'FDG PET-CT'],
      BRAIN: ['BRAIN PET', 'AMYLOID PET'],
      CARDIAC: ['CARDIAC PET']
    }
  };

  private readonly clinicalHistories = [
    'Annual health check, no symptoms',
    'Chronic pain, evaluate for underlying pathology',
    'Follow-up examination post-treatment',
    'Screening examination, family history positive',
    'Acute presentation, rule out serious pathology',
    'Pre-operative assessment',
    'Post-operative follow-up',
    'Trauma, assess for injury',
    'Chronic disease monitoring',
    'Suspicious findings on previous imaging',
    'Clinical symptoms, investigate cause',
    'Routine surveillance',
    'Emergency presentation',
    'GP referral for investigation',
    'Specialist referral for further evaluation'
  ];

  private generateStudyInstanceUID(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 999999);
    return `1.2.840.113619.2.55.3.${timestamp}.${random}`;
  }

  private generateAccessionNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 999999);
    return `ACC${year}${String(random).padStart(6, '0')}`;
  }

  private selectRandom<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private generateSeriesData(modality: Modality, bodyPart: string, studyInstanceUID: string) {
    const seriesCount = this.getSeriesCount(modality);
    const series = [];

    for (let i = 0; i < seriesCount; i++) {
      const seriesInstanceUID = `${studyInstanceUID}.${i + 1}`;
      const imageCount = this.getImageCount(modality);
      
      series.push({
        seriesInstanceUID,
        seriesNumber: i + 1,
        seriesDescription: this.getSeriesDescription(modality, bodyPart, i),
        modality,
        bodyPartExamined: bodyPart,
        numberOfInstances: imageCount,
        seriesSize: BigInt(imageCount * 2000000),
        images: this.generateImageData(seriesInstanceUID, imageCount, modality)
      });
    }

    return series;
  }

  private getSeriesCount(modality: Modality): number {
    const counts: Record<string, number> = {
      DX: 2,
      CT: 3,
      MR: 5,
      US: 4,
      MG: 4,
      NM: 2,
      PT: 3
    };
    return counts[modality] || 2;
  }

  private getImageCount(modality: Modality): number {
    const counts: Record<string, number> = {
      DX: 1,
      CT: Math.floor(Math.random() * 100) + 50,
      MR: Math.floor(Math.random() * 30) + 20,
      US: Math.floor(Math.random() * 10) + 5,
      MG: 2,
      NM: Math.floor(Math.random() * 20) + 10,
      PT: Math.floor(Math.random() * 150) + 100
    };
    return counts[modality] || 10;
  }

  private getSeriesDescription(modality: Modality, bodyPart: string, index: number): string {
    const descriptions: Record<string, string[]> = {
      DX: ['AP VIEW', 'LATERAL VIEW', 'OBLIQUE VIEW'],
      CT: ['AXIAL', 'CORONAL REFORMAT', 'SAGITTAL REFORMAT', 'MIP', '3D RECONSTRUCTION'],
      MR: ['T1 AXIAL', 'T2 AXIAL', 'FLAIR', 'DWI', 'T1 POST CONTRAST', 'T2 SAGITTAL', 'T2 CORONAL'],
      US: ['GRAYSCALE', 'COLOR DOPPLER', 'POWER DOPPLER', 'SPECTRAL DOPPLER'],
      MG: ['R CC', 'R MLO', 'L CC', 'L MLO'],
      NM: ['ANTERIOR', 'POSTERIOR', 'LATERAL', 'OBLIQUE'],
      PT: ['PET', 'CT', 'FUSION']
    };
    
    const modalityDescriptions = descriptions[modality] || ['SERIES'];
    return modalityDescriptions[index % modalityDescriptions.length];
  }

  private generateImageData(seriesInstanceUID: string, count: number, modality: Modality) {
    const images = [];
    
    for (let i = 0; i < count; i++) {
      const sopInstanceUID = `${seriesInstanceUID}.${i + 1}`;
      images.push({
        sopInstanceUID,
        instanceNumber: i + 1,
        imageUrl: `/mock-dicom/${modality.toLowerCase()}/${sopInstanceUID}.dcm`,
        thumbnailUrl: `/mock-thumbnails/${modality.toLowerCase()}/${sopInstanceUID}_thumb.jpg`,
        jpegUrl: `/mock-images/${modality.toLowerCase()}/${sopInstanceUID}.jpg`,
        fileSize: BigInt(Math.floor(Math.random() * 3000000) + 1000000),
        lossy: false,
        metadata: this.generateImageMetadata(modality)
      });
    }
    
    return images;
  }

  private generateImageMetadata(modality: Modality) {
    const baseMetadata = {
      ImageQuality: 'ORIGINAL\\PRIMARY',
      TransferSyntax: '1.2.840.10008.1.2.1'
    };

    const modalitySpecific: Record<string, any> = {
      DX: {
        KVP: 120,
        ExposureTime: 10,
        XRayTubeCurrent: 320,
        DistanceSourceToDetector: 1800,
        DistanceSourceToPatient: 1500
      },
      CT: {
        KVP: 120,
        DataCollectionDiameter: 500,
        ReconstructionDiameter: 350,
        ConvolutionKernel: 'STANDARD',
        CTDIvol: 12.5
      },
      MR: {
        MagneticFieldStrength: 3.0,
        RepetitionTime: 500,
        EchoTime: 12,
        FlipAngle: 90,
        SequenceName: 'T1_SE'
      },
      US: {
        MechanicalIndex: 1.2,
        ThermalIndex: 0.8,
        TransducerFrequency: 12.0,
        DepthOfField: 10
      },
      MG: {
        CompressionForce: 120,
        BreastThickness: 45,
        ExposureTime: 1500,
        AnodeTargetMaterial: 'TUNGSTEN'
      }
    };

    return { ...baseMetadata, ...(modalitySpecific[modality] || {}) };
  }

  async generateStudiesForPatient(config: MockStudyConfig) {
    const {
      patientId,
      numberOfStudies = 10,
      dateRange = {
        from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        to: new Date()
      },
      modalities = Object.values(Modality).filter(m => 
        ['DX', 'CT', 'MR', 'US', 'MG'].includes(m)
      ),
      includeReports = true,
      includeCritical = false
    } = config;

    const studies = [];
    
    for (let i = 0; i < numberOfStudies; i++) {
      const modality = this.selectRandom(modalities);
      const bodyPart = this.selectRandom(this.bodyParts[modality] || ['UNSPECIFIED']);
      const studyDescriptions = this.studyDescriptions[modality]?.[bodyPart] || ['STANDARD EXAMINATION'];
      const studyDescription = this.selectRandom(studyDescriptions);
      
      const studyDate = new Date(
        dateRange.from.getTime() + 
        Math.random() * (dateRange.to.getTime() - dateRange.from.getTime())
      );
      
      const radiologist = this.selectRandom(this.radiologists);
      const technologist = this.selectRandom(
        this.technologists.filter(t => t.modalities.includes(modality))
      );
      const referringDoctor = this.selectRandom(this.referringDoctors);
      const equipment = this.selectRandom(this.equipment[modality] || ['Generic Scanner']);
      
      const priority = Math.random() > 0.8 ? Priority.URGENT : Priority.ROUTINE;
      const status = this.getStudyStatus(studyDate);
      const viewStatus = this.getViewStatus(studyDate);
      const shareStatus = Math.random() > 0.7 ? ShareStatus.SHARED_WITH_GP : ShareStatus.NOT_SHARED;
      
      const studyInstanceUID = this.generateStudyInstanceUID();
      const accessionNumber = this.generateAccessionNumber();
      
      const isCritical = includeCritical && Math.random() > 0.95;
      
      const study = {
        patientId,
        studyInstanceUID,
        studyId: `STU${String(i + 1).padStart(6, '0')}`,
        accessionNumber,
        studyDate,
        studyTime: studyDate.toTimeString().slice(0, 8),
        studyDescription,
        modality,
        bodyPartExamined: bodyPart,
        studyComments: `Performed at ${this.axisImagingData.institution}`,
        clinicalHistory: this.selectRandom(this.clinicalHistories),
        requestedProcedure: studyDescription,
        priority,
        status,
        viewStatus,
        shareStatus,
        performingPhysician: radiologist.name,
        referringPhysician: `${referringDoctor.name} (${referringDoctor.practice})`,
        operatorName: technologist.name,
        stationName: `ROOM-${Math.floor(Math.random() * 5) + 1}`,
        manufacturerModel: equipment,
        institutionName: this.axisImagingData.institution,
        institutionAddress: this.axisImagingData.address,
        numberOfSeries: this.getSeriesCount(modality),
        numberOfInstances: 0,
        studySize: BigInt(0),
        criticalFindings: isCritical,
        series: this.generateSeriesData(modality, bodyPart, studyInstanceUID)
      };
      
      study.numberOfInstances = study.series.reduce((sum, s) => sum + s.numberOfInstances, 0);
      study.studySize = study.series.reduce((sum, s) => sum + Number(s.seriesSize), 0);
      
      if (includeReports && status === StudyStatus.FINAL) {
        study['report'] = this.generateReport(
          study, 
          radiologist, 
          isCritical
        );
      }
      
      studies.push(study);
    }
    
    return studies.sort((a, b) => b.studyDate.getTime() - a.studyDate.getTime());
  }

  private getStudyStatus(studyDate: Date): StudyStatus {
    const hoursSince = (Date.now() - studyDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursSince < 1) return StudyStatus.IN_PROGRESS;
    if (hoursSince < 4) return StudyStatus.COMPLETED;
    if (hoursSince < 24) return StudyStatus.PRELIMINARY;
    return StudyStatus.FINAL;
  }

  private getViewStatus(studyDate: Date): StudyViewStatus {
    const daysSince = (Date.now() - studyDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSince < 1) return StudyViewStatus.NEW;
    if (daysSince < 7) return Math.random() > 0.5 ? StudyViewStatus.VIEWED : StudyViewStatus.NEW;
    return StudyViewStatus.REVIEWED;
  }

  private generateReport(study: any, radiologist: any, isCritical: boolean) {
    const findings = this.generateFindings(study.modality, study.bodyPartExamined, isCritical);
    const impression = this.generateImpression(isCritical);
    
    return {
      reportNumber: `RPT${study.accessionNumber.slice(3)}`,
      clinicalHistory: study.clinicalHistory,
      technique: `${study.studyDescription} performed on ${study.manufacturerModel}`,
      findings,
      impression,
      recommendations: isCritical ? 
        'Urgent clinical correlation recommended. Please contact referring physician.' :
        'Clinical correlation recommended.',
      comparison: Math.random() > 0.5 ? 'Comparison made with prior study dated...' : null,
      priority: study.priority,
      status: 'FINAL',
      isAmended: false,
      isCritical,
      criticalFinding: isCritical ? 'Critical finding identified and communicated' : null,
      criticalNotifiedAt: isCritical ? new Date() : null,
      criticalNotifiedBy: isCritical ? radiologist.name : null,
      criticalNotifiedTo: isCritical ? study.referringPhysician : null,
      dictatedAt: new Date(study.studyDate.getTime() + 60 * 60 * 1000),
      verifiedAt: new Date(study.studyDate.getTime() + 2 * 60 * 60 * 1000),
      approvedAt: new Date(study.studyDate.getTime() + 3 * 60 * 60 * 1000),
      sentToReferrerAt: new Date(study.studyDate.getTime() + 4 * 60 * 60 * 1000),
      radiologistName: radiologist.name,
      radiologistAHPRA: radiologist.ahpraNumber,
      radiologistQualifications: radiologist.qualifications.join(', ')
    };
  }

  private generateFindings(modality: Modality, bodyPart: string, isCritical: boolean): string {
    const normalFindings = {
      CHEST: 'The lungs are clear. No focal consolidation, pleural effusion or pneumothorax. Heart size is normal. Mediastinal contours are unremarkable. No acute bony abnormality.',
      HEAD: 'No acute intracranial abnormality. No intracranial hemorrhage, mass effect, or midline shift. Gray-white matter differentiation is preserved. Ventricles and sulci are normal in size and configuration.',
      ABDOMEN: 'The liver, spleen, pancreas, and adrenal glands are normal in size and attenuation. No focal hepatic lesion. The gallbladder is unremarkable. The kidneys enhance symmetrically without hydronephrosis.',
      SPINE: 'Vertebral body heights and alignment are maintained. No acute fracture or subluxation. Disc spaces are preserved. No significant canal or foraminal stenosis.',
      EXTREMITY: 'No acute fracture or dislocation. Joint spaces are preserved. Soft tissues are unremarkable. No aggressive bone lesion.',
      BREAST: 'Breast tissue demonstrates normal fibroglandular pattern. No suspicious mass, architectural distortion, or microcalcifications. Axillary regions are clear.'
    };

    const criticalFindings = {
      CHEST: 'Large right-sided pneumothorax with mediastinal shift. Immediate clinical attention required.',
      HEAD: 'Acute subarachnoid hemorrhage identified in the basilar cisterns. Urgent neurosurgical consultation recommended.',
      ABDOMEN: 'Free intraperitoneal air consistent with perforation. Urgent surgical consultation recommended.',
      SPINE: 'Acute compression fracture at L2 with retropulsion of bone fragment into spinal canal.',
      EXTREMITY: 'Complex comminuted fracture with intra-articular extension.',
      BREAST: 'Irregular spiculated mass in the upper outer quadrant measuring 2.5cm with associated microcalcifications. BI-RADS 5.'
    };

    if (isCritical) {
      return criticalFindings[bodyPart] || 'Critical finding identified requiring urgent clinical attention.';
    }

    return normalFindings[bodyPart] || 'No acute abnormality identified. Study is within normal limits.';
  }

  private generateImpression(isCritical: boolean): string {
    if (isCritical) {
      return 'CRITICAL FINDING: Abnormality requiring immediate clinical attention. Referring physician has been contacted.';
    }

    const impressions = [
      'No acute pathology identified.',
      'Study within normal limits.',
      'No significant interval change from prior examination.',
      'Stable appearance compared to previous study.',
      'Minor degenerative changes only.',
      'Age-appropriate findings.'
    ];

    return this.selectRandom(impressions);
  }
}

export const studyMockDataService = new StudyMockDataService();