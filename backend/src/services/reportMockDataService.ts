import { 
  ReportStatus, 
  Priority, 
  Modality 
} from '../../../shared/src/types';

interface MockReportTemplate {
  modality: Modality;
  bodyPart: string;
  reportType: 'normal' | 'abnormal' | 'critical' | 'follow_up';
  template: {
    clinicalHistory: string;
    technique: string;
    findings: string;
    impression: string;
    recommendations?: string;
    comparison?: string;
    limitations?: string;
  };
}

export class ReportMockDataService {
  private readonly axisRadiologists = [
    {
      name: 'Dr. Sarah Mitchell',
      qualifications: 'MBBS FRANZCR',
      ahpraNumber: 'MED0001234567',
      specialization: 'Musculoskeletal Imaging'
    },
    {
      name: 'Dr. Michael Roberts', 
      qualifications: 'MBBS FRANZCR MMed',
      ahpraNumber: 'MED0002345678',
      specialization: 'Neuroradiology'
    },
    {
      name: 'Dr. Jennifer Park',
      qualifications: 'MBBS FRANZCR',
      ahpraNumber: 'MED0003456789', 
      specialization: 'Body Imaging'
    },
    {
      name: 'Dr. Thomas Lee',
      qualifications: 'MBBS FRANZCR PhD',
      ahpraNumber: 'MED0004567890',
      specialization: 'Cardiac and Vascular Imaging'
    },
    {
      name: 'Dr. Rachel Stone',
      qualifications: 'MBBS FRANZCR',
      ahpraNumber: 'MED0005678901',
      specialization: 'Breast Imaging'
    }
  ];

  private readonly reportTemplates: MockReportTemplate[] = [
    // Chest X-Ray Reports
    {
      modality: Modality.DX,
      bodyPart: 'CHEST',
      reportType: 'normal',
      template: {
        clinicalHistory: 'Annual health check, no respiratory symptoms.',
        technique: 'PA and lateral chest radiographs performed.',
        findings: `The heart size and configuration are within normal limits. The mediastinal contours are unremarkable. Both lungs are well expanded and clear with no focal consolidation, pleural effusion or pneumothorax. The bony thorax demonstrates no acute abnormality. The visualised upper abdomen is unremarkable.`,
        impression: 'Normal chest radiograph.',
        recommendations: 'No further imaging required at this time.'
      }
    },
    {
      modality: Modality.DX,
      bodyPart: 'CHEST', 
      reportType: 'abnormal',
      template: {
        clinicalHistory: 'Cough and shortness of breath, ?pneumonia.',
        technique: 'PA and lateral chest radiographs performed.',
        findings: `There is patchy consolidation in the right lower lobe consistent with pneumonia. The heart size is normal. The left lung is clear. No pleural effusion or pneumothorax is identified. The bony thorax appears intact.`,
        impression: 'Right lower lobe pneumonia.',
        recommendations: `Clinical correlation recommended. Consider follow-up chest radiograph in 6-8 weeks post treatment to ensure resolution.`,
        comparison: 'No prior studies available for comparison.'
      }
    },
    {
      modality: Modality.DX,
      bodyPart: 'CHEST',
      reportType: 'critical',
      template: {
        clinicalHistory: 'Acute chest pain and dyspnoea.',
        technique: 'Portable AP chest radiograph performed.',
        findings: `There is a large right-sided pneumothorax with significant mediastinal shift to the left. The right lung is almost completely collapsed. The heart and left lung appear compressed. No obvious rib fractures are identified on this projection.`,
        impression: 'Large right-sided pneumothorax with tension physiology.',
        recommendations: `URGENT: This is a large pneumothorax requiring immediate clinical attention and likely chest tube insertion. The referring team has been contacted directly.`
      }
    },

    // CT Reports
    {
      modality: Modality.CT,
      bodyPart: 'HEAD',
      reportType: 'normal',
      template: {
        clinicalHistory: 'Headaches, rule out intracranial pathology.',
        technique: 'Axial CT images of the brain without contrast.',
        findings: `No acute intracranial abnormality is identified. There is no evidence of intracranial haemorrhage, mass lesion, or midline shift. The grey-white matter differentiation is preserved. The ventricular system is normal in size and configuration. The basal cisterns are patent. No skull fracture is seen. The paranasal sinuses show mild mucosal thickening consistent with sinusitis.`,
        impression: 'No acute intracranial abnormality. Mild sinusitis.',
        recommendations: 'Clinical correlation recommended for ongoing headaches. Consider MRI if symptoms persist.'
      }
    },
    {
      modality: Modality.CT,
      bodyPart: 'ABDOMEN',
      reportType: 'abnormal',
      template: {
        clinicalHistory: 'Right upper quadrant pain, ?gallbladder pathology.',
        technique: 'Axial CT images of the abdomen and pelvis with IV contrast.',
        findings: `The gallbladder is distended and thick-walled (wall thickness 6mm) with multiple gallstones. There is surrounding fat stranding consistent with acute cholecystitis. The common bile duct measures 4mm (normal). The liver enhances homogeneously without focal lesion. The pancreas, spleen, and adrenals are normal. Both kidneys enhance symmetrically without hydronephrosis. No free fluid or pneumoperitoneum.`,
        impression: 'Acute cholecystitis with cholelithiasis.',
        recommendations: 'Surgical consultation recommended for cholecystectomy. Clinical correlation with laboratory parameters (FBC, LFTs, lipase).'
      }
    },

    // MRI Reports  
    {
      modality: Modality.MR,
      bodyPart: 'LUMBAR SPINE',
      reportType: 'abnormal',
      template: {
        clinicalHistory: 'Chronic lower back pain with left leg radiation, previous L4-L5 surgery.',
        technique: 'Sagittal and axial MRI of the lumbar spine. T1, T2, and STIR sequences performed.',
        findings: `The lumbar lordosis is preserved. Vertebral body heights and alignment are maintained. At L4-L5, there is evidence of previous posterior discectomy with residual disc protrusion extending into the left lateral recess, causing mild compression of the left L5 nerve root. At L5-S1, there is a broad-based disc protrusion with bilateral facet joint arthropathy and ligamentum flavum hypertrophy, resulting in moderate central canal stenosis. The remaining levels show age-appropriate degenerative changes without significant stenosis.`,
        impression: `1. Post-surgical changes at L4-L5 with residual disc protrusion and mild left L5 nerve root compression.\n2. L5-S1 disc protrusion with moderate central canal stenosis.\n3. Degenerative changes throughout the lumbar spine.`,
        recommendations: 'Clinical correlation recommended. Consider referral to neurosurgery or orthopaedic spine service for assessment.',
        comparison: 'Compared to MRI from 18 months ago, there is interval progression of L5-S1 degenerative changes.'
      }
    },
    {
      modality: Modality.MR,
      bodyPart: 'BRAIN',
      reportType: 'critical',
      template: {
        clinicalHistory: 'Acute onset left-sided weakness and speech difficulty.',
        technique: 'Multiplanar MRI of the brain including DWI, FLAIR, T1, and T2 sequences.',
        findings: `There is an area of restricted diffusion in the right middle cerebral artery territory involving the right frontoparietal region, consistent with acute infarction. There is associated subtle FLAIR hyperintensity and loss of grey-white matter differentiation. No haemorrhagic transformation is identified. The ventricular system is normal. No midline shift. The major cerebral vessels show no flow voids to suggest occlusion, though dedicated vascular imaging would be more definitive.`,
        impression: 'Acute right middle cerebral artery territory infarction.',
        recommendations: `URGENT: Findings consistent with acute stroke. Immediate neurological assessment required. Consider urgent neurology consultation and assessment for thrombolysis if within therapeutic window. The referring team and stroke unit have been contacted.`
      }
    },

    // Ultrasound Reports
    {
      modality: Modality.US,
      bodyPart: 'ABDOMEN',
      reportType: 'normal',
      template: {
        clinicalHistory: 'Diabetes follow-up, assess for complications.',
        technique: 'Real-time ultrasound examination of the abdomen.',
        findings: `The liver demonstrates homogeneous echogenicity with smooth contour. No focal lesions identified. The intrahepatic ducts are not dilated. The gallbladder is of normal size with no gallstones or wall thickening. The common bile duct measures 4mm. The pancreatic head is visualised and appears normal. Both kidneys are normal in size and echogenicity with no hydronephrosis or calculi. The aorta is of normal calibre without aneurysmal dilatation.`,
        impression: 'Normal abdominal ultrasound.',
        recommendations: 'Continue routine diabetic monitoring as clinically indicated.'
      }
    },
    {
      modality: Modality.US,
      bodyPart: 'BREAST',
      reportType: 'follow_up',
      template: {
        clinicalHistory: 'Palpable lump in left breast, family history of breast cancer.',
        technique: 'Bilateral breast ultrasound examination.',
        findings: `In the left breast at 2 o'clock position, 4cm from the nipple, there is a well-defined hypoechoic lesion measuring 12 x 8 x 10mm. The lesion demonstrates posterior acoustic enhancement and appears solid. No internal vascularity is demonstrated on colour Doppler. The surrounding breast tissue is heterogeneously dense. The right breast demonstrates no focal abnormality. Both axillae appear normal with no enlarged lymph nodes.`,
        impression: `BI-RADS 4A: Suspicious solid lesion in the left breast requiring tissue sampling.`,
        recommendations: `Recommend ultrasound-guided core biopsy for histological diagnosis. Multidisciplinary team discussion if malignancy confirmed. Patient counselling regarding biopsy procedure recommended.`
      }
    },

    // Mammography Reports
    {
      modality: Modality.MG,
      bodyPart: 'BREAST',
      reportType: 'normal',
      template: {
        clinicalHistory: 'Screening mammography, no current symptoms.',
        technique: 'Digital mammography including bilateral CC and MLO views.',
        findings: `The breast tissue demonstrates scattered fibroglandular density (ACR B). There are no suspicious masses, architectural distortion, or malignant-type microcalcifications. A few benign-appearing scattered microcalcifications are noted bilaterally. The skin and nipples appear normal. No axillary adenopathy is identified.`,
        impression: 'BI-RADS 1: Negative screening mammogram.',
        recommendations: 'Continue routine screening mammography in 2 years as per BreastScreen Australia guidelines.'
      }
    },
    {
      modality: Modality.MG,
      bodyPart: 'BREAST',
      reportType: 'critical',
      template: {
        clinicalHistory: 'New palpable mass in right breast.',
        technique: 'Diagnostic mammography and targeted ultrasound of the right breast.',
        findings: `There is an irregular spiculated mass in the right breast upper outer quadrant measuring approximately 25mm. The mass is associated with pleomorphic microcalcifications extending over a 35mm area. There is also subtle skin thickening overlying the lesion. The left breast demonstrates heterogeneously dense tissue without suspicious findings.`,
        impression: `BI-RADS 5: Highly suspicious for malignancy - invasive carcinoma.`,
        recommendations: `Urgent referral to breast surgeon for multidisciplinary assessment. Core biopsy required for tissue diagnosis prior to definitive management. The referring GP has been contacted regarding these urgent findings.`
      }
    },

    // Nuclear Medicine Reports
    {
      modality: Modality.NM,
      bodyPart: 'BONE',
      reportType: 'abnormal',
      template: {
        clinicalHistory: 'Prostate cancer staging, assess for skeletal metastases.',
        technique: 'Whole body bone scan performed 3 hours post-injection of 740 MBq Tc-99m MDP.',
        findings: `There are multiple areas of increased tracer uptake in the axial skeleton including the thoracic and lumbar vertebrae, ribs, and pelvis. The pattern and distribution are consistent with skeletal metastases. Additional uptake is noted in the right proximal femur. The appendicular skeleton otherwise shows normal symmetrical uptake. The kidneys demonstrate normal tracer excretion.`,
        impression: 'Widespread skeletal metastases consistent with known prostate carcinoma.',
        recommendations: 'Clinical correlation with PSA levels and other staging investigations. Oncology follow-up for palliative management planning.'
      }
    }
  ];

  generateReport(
    modality: Modality,
    bodyPart: string,
    patientInfo: any,
    studyInfo: any,
    options: {
      reportType?: 'normal' | 'abnormal' | 'critical' | 'follow_up';
      includePriorComparison?: boolean;
      includeRecommendations?: boolean;
    } = {}
  ) {
    const {
      reportType = this.getRandomReportType(),
      includePriorComparison = Math.random() > 0.6,
      includeRecommendations = true
    } = options;

    // Find matching template
    const template = this.reportTemplates.find(t => 
      t.modality === modality && 
      t.bodyPart === bodyPart && 
      t.reportType === reportType
    ) || this.reportTemplates.find(t => 
      t.modality === modality && 
      t.bodyPart === bodyPart
    ) || this.reportTemplates[0];

    const radiologist = this.getRandomRadiologist();
    const reportNumber = this.generateReportNumber();

    const report = {
      reportNumber,
      clinicalHistory: template.template.clinicalHistory,
      technique: template.template.technique,
      findings: template.template.findings,
      impression: template.template.impression,
      recommendations: includeRecommendations ? template.template.recommendations : undefined,
      comparison: includePriorComparison ? template.template.comparison : undefined,
      limitations: template.template.limitations,
      
      // Report metadata
      priority: reportType === 'critical' ? Priority.EMERGENCY : Priority.ROUTINE,
      status: ReportStatus.FINAL,
      isAmended: false,
      isCritical: reportType === 'critical',
      
      // Critical findings
      criticalFinding: reportType === 'critical' ? 'Critical finding identified and communicated' : undefined,
      criticalNotifiedAt: reportType === 'critical' ? new Date() : undefined,
      criticalNotifiedBy: reportType === 'critical' ? radiologist.name : undefined,
      criticalNotifiedTo: reportType === 'critical' ? 'Referring physician' : undefined,
      
      // Timestamps
      dictatedAt: new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000), // 0-2 hours ago
      transcribedAt: new Date(Date.now() - Math.random() * 60 * 60 * 1000), // 0-1 hour ago
      verifiedAt: new Date(Date.now() - Math.random() * 30 * 60 * 1000), // 0-30 mins ago
      approvedAt: new Date(),
      sentToReferrerAt: new Date(),
      
      // Radiologist information
      radiologistName: radiologist.name,
      radiologistQualifications: radiologist.qualifications,
      radiologistAHPRA: radiologist.ahpraNumber,
      radiologistSpecialization: radiologist.specialization,
      
      // Additional metadata
      wordCount: this.calculateWordCount(template.template),
      complexityScore: this.calculateComplexityScore(reportType, modality),
      qaRequired: reportType === 'critical',
      qaCompletedAt: reportType === 'critical' ? new Date() : undefined,
      qaCompletedBy: reportType === 'critical' ? 'Dr. Senior Radiologist' : undefined,
      
      // Template used
      templateUsed: `${modality}_${bodyPart}_${reportType}`,
      
      // Institution details
      institutionName: 'Axis Imaging Mickleham',
      institutionAddress: '1234 Donnybrook Road, Mickleham, VIC 3064',
      institutionPhone: '03 9335 1234',
      institutionEmail: 'reports@axisimaging.com.au'
    };

    return report;
  }

  private getRandomReportType(): 'normal' | 'abnormal' | 'critical' | 'follow_up' {
    const rand = Math.random();
    if (rand < 0.6) return 'normal';
    if (rand < 0.85) return 'abnormal';
    if (rand < 0.95) return 'follow_up';
    return 'critical';
  }

  private getRandomRadiologist() {
    return this.axisRadiologists[Math.floor(Math.random() * this.axisRadiologists.length)];
  }

  private generateReportNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 999999);
    return `RPT${year}${String(random).padStart(6, '0')}`;
  }

  private calculateWordCount(template: any): number {
    const text = Object.values(template).join(' ');
    return text.split(/\s+/).length;
  }

  private calculateComplexityScore(reportType: string, modality: Modality): number {
    let baseScore = 1.0;
    
    // Modality complexity
    const modalityScores: Record<Modality, number> = {
      [Modality.DX]: 1.0,
      [Modality.CT]: 1.5,
      [Modality.MR]: 2.0,
      [Modality.US]: 1.2,
      [Modality.MG]: 1.3,
      [Modality.NM]: 1.4,
      [Modality.PT]: 1.8,
      [Modality.CR]: 1.0,
      [Modality.RF]: 1.1,
      [Modality.SC]: 1.0,
      [Modality.XA]: 1.6,
      [Modality.XR]: 1.0
    };
    
    baseScore *= modalityScores[modality] || 1.0;
    
    // Report type complexity
    switch (reportType) {
      case 'normal': baseScore *= 1.0; break;
      case 'abnormal': baseScore *= 1.5; break;
      case 'follow_up': baseScore *= 1.3; break;
      case 'critical': baseScore *= 2.0; break;
    }
    
    return Math.round(baseScore * 100) / 100;
  }

  // Generate amendment report
  generateAmendment(originalReport: any, amendmentReason: string) {
    return {
      ...originalReport,
      isAmended: true,
      amendmentReason,
      previousVersionId: originalReport.id,
      reportNumber: `${originalReport.reportNumber}-A1`,
      dictatedAt: new Date(),
      verifiedAt: new Date(),
      approvedAt: new Date(),
      amendmentNote: `This report has been amended. Reason: ${amendmentReason}. Original report issued: ${originalReport.approvedAt?.toLocaleDateString('en-AU')}.`
    };
  }

  // Generate addendum report
  generateAddendum(originalReport: any, addendumContent: string) {
    return {
      ...originalReport,
      status: ReportStatus.ADDENDUM,
      addendumContent,
      reportNumber: `${originalReport.reportNumber}-ADD1`,
      dictatedAt: new Date(),
      verifiedAt: new Date(),
      approvedAt: new Date(),
      addendumNote: `Addendum to report ${originalReport.reportNumber} issued ${originalReport.approvedAt?.toLocaleDateString('en-AU')}.`
    };
  }

  // Australian medical terminology and formatting helpers
  formatAustralianDate(date: Date): string {
    return date.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  }

  formatAustralianTime(date: Date): string {
    return date.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  // Common Australian medical abbreviations and terms
  readonly medicalTerminology = {
    abbreviations: {
      'GP': 'General Practitioner',
      'ED': 'Emergency Department',
      'ICU': 'Intensive Care Unit',
      'CCU': 'Coronary Care Unit',
      'OPD': 'Outpatient Department',
      'A&E': 'Accident and Emergency',
      'MDT': 'Multidisciplinary Team',
      'AHPRA': 'Australian Health Practitioner Regulation Agency',
      'PBS': 'Pharmaceutical Benefits Scheme',
      'MBS': 'Medicare Benefits Schedule',
      'DVA': 'Department of Veterans Affairs'
    },
    measurements: {
      'temperature': '°C',
      'weight': 'kg',
      'height': 'cm',
      'distance': 'mm'
    },
    institutions: {
      'privateHospital': 'Private Hospital',
      'publicHospital': 'Public Hospital', 
      'medicalCentre': 'Medical Centre',
      'dayHospital': 'Day Hospital'
    }
  };
}

export const reportMockDataService = new ReportMockDataService();