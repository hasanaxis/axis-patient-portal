/**
 * Axis Imaging Radiologist Configuration
 * Manages radiologist assignments and information
 */

export interface Radiologist {
  id: string;
  name: string;
  title: string;
  specialty?: string;
  licenseNumber?: string;
  isActive: boolean;
}

export const AXIS_RADIOLOGISTS: Radiologist[] = [
  {
    id: 'farhan-ahmed',
    name: 'Dr. Farhan Ahmed',
    title: 'Dr. Farhan Ahmed, Axis Imaging',
    specialty: 'Diagnostic Radiology',
    licenseNumber: 'RAD12345', // Example
    isActive: true
  },
  // Add more Axis radiologists here as needed
  {
    id: 'radiologist-2',
    name: 'Dr. Example Radiologist',
    title: 'Dr. Example Radiologist, Axis Imaging',
    specialty: 'Diagnostic Radiology',
    isActive: true
  }
];

export class RadiologistService {
  /**
   * Get default radiologist for Axis Imaging
   */
  static getDefaultRadiologist(): Radiologist {
    return AXIS_RADIOLOGISTS.find(r => r.isActive) || AXIS_RADIOLOGISTS[0];
  }

  /**
   * Find radiologist by name pattern in report text
   */
  static findRadiologistByName(reportText: string): Radiologist | null {
    const normalizedText = reportText.toLowerCase();
    
    for (const radiologist of AXIS_RADIOLOGISTS) {
      if (!radiologist.isActive) continue;
      
      const nameVariations = [
        radiologist.name.toLowerCase(),
        radiologist.name.replace('Dr. ', '').toLowerCase(),
        radiologist.name.split(' ').slice(-2).join(' ').toLowerCase() // Last two names
      ];
      
      for (const variation of nameVariations) {
        if (normalizedText.includes(variation)) {
          return radiologist;
        }
      }
    }
    
    return null;
  }

  /**
   * Assign radiologist to study based on modality, date, or rotation
   */
  static assignRadiologist(studyDate: Date, modality: string): Radiologist {
    // In production, this could implement:
    // - Rotation schedules
    // - Specialty-based assignment (CT specialist, MRI specialist, etc.)
    // - Workload balancing
    // - On-call schedules
    
    // For now, return default
    return this.getDefaultRadiologist();
  }

  /**
   * Get radiologist display name for reports
   */
  static getDisplayName(radiologist: Radiologist): string {
    return radiologist.title;
  }
}