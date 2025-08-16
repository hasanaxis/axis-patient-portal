import { PrismaClient } from '@prisma/client'

export interface ScanTypeInfo {
  scanType: string
  displayName: string
  description: string
  duration: number
  requiresReferral: boolean
  requiresFasting: boolean
  fastingHours?: number
  contrastAvailable: boolean
  contrastRequired: boolean
  contrastInstructions?: string
  preparationInstructions?: string
  arrivalInstructions?: string
  afterCareInstructions?: string
  wheelchairAccessible: boolean
  pregnancyRestrictions?: string
  ageRestrictions?: string
  availableBodyParts: string[]
  medicareItemNumbers: string[]
  privatePrice?: number
  bulkBillingAvailable: boolean
  availableDays: string[]
  availableTimeSlots: string[]
  equipmentRequired?: string
  roomRequirements?: string
}

export class ScanTypeConfigurationService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async initializeDefaultScanTypes(): Promise<void> {
    const defaultConfigurations: Omit<ScanTypeInfo, 'id' | 'createdAt' | 'updatedAt'>[] = [
      // X-RAY Configuration
      {
        scanType: 'XRAY',
        displayName: 'X-ray',
        description: 'Digital X-ray imaging for bones, joints, chest, and abdomen. Quick and non-invasive diagnostic imaging.',
        duration: 15,
        requiresReferral: true,
        requiresFasting: false,
        contrastAvailable: false,
        contrastRequired: false,
        preparationInstructions: 'No special preparation required. Remove jewelry and metal objects from the area being examined.',
        arrivalInstructions: 'Please arrive 15 minutes early. Bring your referral and Medicare card.',
        afterCareInstructions: 'No special aftercare required. Results will be available within 24-48 hours.',
        wheelchairAccessible: true,
        pregnancyRestrictions: 'Please inform staff if you are or may be pregnant. X-rays are generally avoided during pregnancy.',
        availableBodyParts: [
          'Chest', 'Abdomen', 'Spine (Cervical)', 'Spine (Thoracic)', 'Spine (Lumbar)',
          'Shoulder', 'Arm', 'Elbow', 'Wrist', 'Hand', 'Fingers',
          'Hip', 'Pelvis', 'Thigh', 'Knee', 'Leg', 'Ankle', 'Foot', 'Toes'
        ],
        medicareItemNumbers: ['58112', '58115', '58118', '58121'],
        privatePrice: 120,
        bulkBillingAvailable: true,
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        availableTimeSlots: ['morning', 'afternoon', 'evening'],
        equipmentRequired: 'Digital X-ray machine',
        roomRequirements: 'Lead-lined X-ray room'
      },

      // CT SCAN Configuration
      {
        scanType: 'CT',
        displayName: 'CT Scan',
        description: 'Computed Tomography provides detailed cross-sectional images of internal structures. May require contrast injection.',
        duration: 30,
        requiresReferral: true,
        requiresFasting: true,
        fastingHours: 4,
        contrastAvailable: true,
        contrastRequired: false,
        contrastInstructions: 'If contrast is required, you will need to fast for 4 hours and stay hydrated. Please inform staff of any allergies.',
        preparationInstructions: 'Fast for 4 hours before your appointment. Remove all metal objects. Wear comfortable, loose-fitting clothing.',
        arrivalInstructions: 'Arrive 30 minutes early for registration and preparation. Bring referral, Medicare card, and list of current medications.',
        afterCareInstructions: 'If contrast was used, drink plenty of water. Resume normal diet after the scan.',
        wheelchairAccessible: true,
        pregnancyRestrictions: 'CT scans are generally avoided during pregnancy. Please inform staff if you are or may be pregnant.',
        ageRestrictions: 'Pediatric patients may require special preparation and sedation.',
        availableBodyParts: [
          'Head/Brain', 'Neck', 'Chest', 'Abdomen', 'Pelvis',
          'Spine (Cervical)', 'Spine (Thoracic)', 'Spine (Lumbar)',
          'Extremities', 'CT Angiography'
        ],
        medicareItemNumbers: ['56001', '56007', '56013', '56019'],
        privatePrice: 450,
        bulkBillingAvailable: true,
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        availableTimeSlots: ['morning', 'afternoon'],
        equipmentRequired: 'CT Scanner',
        roomRequirements: 'CT suite with contrast injection capabilities'
      },

      // ULTRASOUND Configuration
      {
        scanType: 'ULTRASOUND',
        displayName: 'Ultrasound',
        description: 'Safe, non-invasive imaging using sound waves. No radiation exposure. Real-time imaging of soft tissues.',
        duration: 30,
        requiresReferral: true,
        requiresFasting: false,
        contrastAvailable: false,
        contrastRequired: false,
        preparationInstructions: 'Preparation varies by scan type. For abdominal scans: fast for 6 hours. For pelvic scans: drink 1L water 1 hour before.',
        arrivalInstructions: 'Arrive 15 minutes early. Bring referral and Medicare card. Wear comfortable, loose-fitting clothing.',
        afterCareInstructions: 'No special aftercare required. Resume normal activities immediately.',
        wheelchairAccessible: true,
        pregnancyRestrictions: 'Ultrasound is safe during pregnancy and often used for prenatal care.',
        availableBodyParts: [
          'Abdomen', 'Pelvis', 'Obstetric (Pregnancy)', 'Thyroid', 'Breast',
          'Carotid Arteries', 'Leg Vessels', 'Echocardiogram',
          'Kidneys', 'Gallbladder', 'Liver', 'Ovaries', 'Prostate'
        ],
        medicareItemNumbers: ['55054', '55057', '55060', '55063'],
        privatePrice: 220,
        bulkBillingAvailable: true,
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        availableTimeSlots: ['morning', 'afternoon'],
        equipmentRequired: 'Ultrasound machine with various probes',
        roomRequirements: 'Ultrasound suite with examination bed'
      },

      // DEXA Configuration
      {
        scanType: 'DEXA',
        displayName: 'DEXA Scan',
        description: 'Bone density scan to assess bone health and osteoporosis risk. Low-dose X-ray examination.',
        duration: 20,
        requiresReferral: true,
        requiresFasting: false,
        contrastAvailable: false,
        contrastRequired: false,
        preparationInstructions: 'No special preparation required. Avoid calcium supplements 24 hours before scan. Wear comfortable clothing without metal.',
        arrivalInstructions: 'Arrive 15 minutes early. Bring referral and Medicare card. Remove jewelry and metal objects.',
        afterCareInstructions: 'No special aftercare required. Resume normal activities immediately.',
        wheelchairAccessible: true,
        pregnancyRestrictions: 'DEXA scans are not performed during pregnancy due to radiation exposure.',
        ageRestrictions: 'Typically performed on adults over 50 or those at risk of osteoporosis.',
        availableBodyParts: [
          'Lumbar Spine', 'Hip (Femoral Neck)', 'Forearm', 'Whole Body Composition'
        ],
        medicareItemNumbers: ['12306', '12309'],
        privatePrice: 160,
        bulkBillingAvailable: true,
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        availableTimeSlots: ['morning', 'afternoon'],
        equipmentRequired: 'DEXA Scanner',
        roomRequirements: 'DEXA suite with specialized examination table'
      },

      // MAMMOGRAPHY Configuration
      {
        scanType: 'MAMMOGRAPHY',
        displayName: 'Mammogram',
        description: 'Specialized breast imaging for early detection of breast cancer. Digital mammography with 3D tomosynthesis available.',
        duration: 20,
        requiresReferral: true,
        requiresFasting: false,
        contrastAvailable: false,
        contrastRequired: false,
        preparationInstructions: 'Schedule for week after menstrual period. Avoid deodorants, perfumes, or powders on chest area.',
        arrivalInstructions: 'Arrive 15 minutes early. Bring referral, Medicare card, and any previous mammogram images.',
        afterCareInstructions: 'Resume normal activities. Some breast tenderness is normal for 24 hours.',
        wheelchairAccessible: true,
        pregnancyRestrictions: 'Mammograms are generally avoided during pregnancy and breastfeeding.',
        ageRestrictions: 'Recommended for women over 40 or as directed by physician.',
        availableBodyParts: ['Bilateral Breast', 'Unilateral Breast', 'Diagnostic Views'],
        medicareItemNumbers: ['59300', '59303', '59306'],
        privatePrice: 280,
        bulkBillingAvailable: true,
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        availableTimeSlots: ['morning', 'afternoon'],
        equipmentRequired: 'Digital Mammography unit with 3D tomosynthesis',
        roomRequirements: 'Mammography suite with privacy screening'
      }
    ]

    // Insert configurations if they don't exist
    for (const config of defaultConfigurations) {
      await this.prisma.scanTypeConfiguration.upsert({
        where: { scanType: config.scanType as any },
        update: config,
        create: {
          ...config,
          scanType: config.scanType as any,
          isActive: true
        }
      })
    }

    console.log('✓ Default scan type configurations initialized')
  }

  async getScanTypeConfiguration(scanType: string) {
    return this.prisma.scanTypeConfiguration.findUnique({
      where: { scanType: scanType as any }
    })
  }

  async getAllActiveScanTypes() {
    return this.prisma.scanTypeConfiguration.findMany({
      where: { isActive: true },
      orderBy: { displayName: 'asc' }
    })
  }

  async updateScanTypeConfiguration(
    scanType: string,
    updates: Partial<ScanTypeInfo>
  ) {
    return this.prisma.scanTypeConfiguration.update({
      where: { scanType: scanType as any },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    })
  }

  async getPreparationInstructions(scanType: string, bodyPart?: string): Promise<{
    general: string
    specific?: string
    arrival: string
    aftercare: string
  } | null> {
    const config = await this.getScanTypeConfiguration(scanType)
    if (!config) {
      return null
    }

    let specificInstructions: string | undefined

    // Get body part specific instructions if available
    if (bodyPart) {
      const bodyPartConfig = await this.prisma.bodyPartConfiguration.findUnique({
        where: {
          scanType_bodyPart: {
            scanType: scanType as any,
            bodyPart: bodyPart
          }
        }
      })
      specificInstructions = bodyPartConfig?.specificInstructions || undefined
    }

    return {
      general: config.preparationInstructions || '',
      specific: specificInstructions,
      arrival: config.arrivalInstructions || '',
      aftercare: config.afterCareInstructions || ''
    }
  }

  async getEstimatedCost(scanType: string, isBulkBilled: boolean = true): Promise<{
    medicareItemNumbers: string[]
    estimatedCost: number
    bulkBillingAvailable: boolean
    privatePrice?: number
  } | null> {
    const config = await this.getScanTypeConfiguration(scanType)
    if (!config) {
      return null
    }

    return {
      medicareItemNumbers: config.medicareItemNumbers,
      estimatedCost: isBulkBilled && config.bulkBillingAvailable ? 0 : (config.privatePrice || 0),
      bulkBillingAvailable: config.bulkBillingAvailable,
      privatePrice: config.privatePrice || undefined
    }
  }

  async getAvailabilityInfo(scanType: string): Promise<{
    availableDays: string[]
    availableTimeSlots: string[]
    estimatedDuration: number
    wheelchairAccessible: boolean
  } | null> {
    const config = await this.getScanTypeConfiguration(scanType)
    if (!config) {
      return null
    }

    return {
      availableDays: config.availableDays,
      availableTimeSlots: config.availableTimeSlots,
      estimatedDuration: config.duration,
      wheelchairAccessible: config.wheelchairAccessible
    }
  }

  async initializeBodyPartConfigurations(): Promise<void> {
    const bodyPartConfigs = [
      // X-ray body part specific configurations
      {
        scanType: 'XRAY',
        bodyPart: 'Chest',
        displayName: 'Chest X-ray',
        description: 'Frontal and lateral views of chest, lungs, and heart',
        specificInstructions: 'Remove clothing from waist up. You may be asked to hold your breath during the scan.'
      },
      {
        scanType: 'XRAY',
        bodyPart: 'Spine (Lumbar)',
        displayName: 'Lumbar Spine X-ray',
        description: 'Multiple views of lower back spine',
        specificInstructions: 'Wear comfortable clothing. You may need to bend or move into different positions.'
      },

      // CT specific configurations
      {
        scanType: 'CT',
        bodyPart: 'Abdomen',
        displayName: 'CT Abdomen',
        description: 'Detailed imaging of abdominal organs',
        specificInstructions: 'Fast for 4 hours. Oral contrast may be required 1-2 hours before scan.',
        contrastRequired: true
      },
      {
        scanType: 'CT',
        bodyPart: 'Head/Brain',
        displayName: 'CT Head',
        description: 'Detailed brain and skull imaging',
        specificInstructions: 'Remove all metal objects from head and neck area.'
      },

      // Ultrasound specific configurations
      {
        scanType: 'ULTRASOUND',
        bodyPart: 'Abdomen',
        displayName: 'Abdominal Ultrasound',
        description: 'Imaging of liver, gallbladder, kidneys, and other abdominal organs',
        specificInstructions: 'Fast for 6 hours before the scan. Do not drink fluids 2 hours before.'
      },
      {
        scanType: 'ULTRASOUND',
        bodyPart: 'Pelvis',
        displayName: 'Pelvic Ultrasound',
        description: 'Imaging of pelvic organs including bladder, uterus, and ovaries',
        specificInstructions: 'Drink 1 liter of water 1 hour before scan. Do not empty bladder before scan.'
      },
      {
        scanType: 'ULTRASOUND',
        bodyPart: 'Obstetric (Pregnancy)',
        displayName: 'Pregnancy Ultrasound',
        description: 'Monitoring fetal development and maternal health',
        specificInstructions: 'Drink 2-3 glasses of water 1 hour before scan for early pregnancy. No preparation needed after 20 weeks.'
      }
    ]

    for (const config of bodyPartConfigs) {
      await this.prisma.bodyPartConfiguration.upsert({
        where: {
          scanType_bodyPart: {
            scanType: config.scanType as any,
            bodyPart: config.bodyPart
          }
        },
        update: config,
        create: {
          ...config,
          scanType: config.scanType as any,
          isActive: true
        }
      })
    }

    console.log('✓ Body part configurations initialized')
  }

  async getBodyPartConfiguration(scanType: string, bodyPart: string) {
    return this.prisma.bodyPartConfiguration.findUnique({
      where: {
        scanType_bodyPart: {
          scanType: scanType as any,
          bodyPart: bodyPart
        }
      }
    })
  }

  async getBodyPartsForScanType(scanType: string) {
    const config = await this.getScanTypeConfiguration(scanType)
    if (!config) {
      return []
    }

    // Get body parts with their configurations
    const bodyPartConfigs = await this.prisma.bodyPartConfiguration.findMany({
      where: {
        scanType: scanType as any,
        isActive: true
      },
      orderBy: { displayName: 'asc' }
    })

    // Combine scan type body parts with detailed configurations
    const result = config.availableBodyParts.map(bodyPart => {
      const detailedConfig = bodyPartConfigs.find(bpc => bpc.bodyPart === bodyPart)
      return {
        value: bodyPart,
        label: detailedConfig?.displayName || bodyPart,
        description: detailedConfig?.description,
        specificInstructions: detailedConfig?.specificInstructions,
        contrastRequired: detailedConfig?.contrastRequired || false
      }
    })

    return result
  }
}