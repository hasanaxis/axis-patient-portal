import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // Create a test user and patient
    const user = await prisma.user.create({
      data: {
        email: 'arwa.may@example.com',
        firstName: 'Arwa',
        lastName: 'May',
        phoneNumber: '+61412345679',
        passwordHash: '',
        role: 'PATIENT',
        isVerified: true
      }
    });

    const patient = await prisma.patient.create({
      data: {
        userId: user.id,
        patientNumber: 'AXI0001',
        medicareNumber: '1234567890',
        dateOfBirth: new Date('1990-05-15'),
        country: 'Australia',
        streetAddress: '123 Collins Street',
        suburb: 'Melbourne',
        state: 'VIC',
        postcode: '3000'
      }
    });

    console.log('✅ Created patient:', patient.patientNumber);

    // Create sample studies
    const studies = [
      {
        studyInstanceUID: '1.2.840.113619.2.1.1.1.1',
        accessionNumber: 'ACC001',
        studyDate: new Date('2025-01-15'),
        modality: 'XR',
        studyDescription: 'Chest X-Ray PA and Lateral',
        bodyPartExamined: 'Chest',
        status: 'COMPLETED',
        priority: 'ROUTINE',
        patientId: patient.id,
        institutionName: 'Axis Imaging Mickleham',
        referringPhysician: 'Dr. Smith',
        numberOfSeries: 1,
        numberOfInstances: 2
      },
      {
        studyInstanceUID: '1.2.840.113619.2.1.1.1.2',
        accessionNumber: 'ACC002',
        studyDate: new Date('2025-01-10'),
        modality: 'CT',
        studyDescription: 'CT Abdomen and Pelvis with Contrast',
        bodyPartExamined: 'Abdomen/Pelvis',
        status: 'COMPLETED',
        priority: 'ROUTINE',
        patientId: patient.id,
        institutionName: 'Axis Imaging Mickleham',
        referringPhysician: 'Dr. Brown',
        numberOfSeries: 1,
        numberOfInstances: 150
      },
      {
        studyInstanceUID: '1.2.840.113619.2.1.1.1.3',
        accessionNumber: 'ACC003',
        studyDate: new Date('2025-01-08'),
        modality: 'US',
        studyDescription: 'Ultrasound Upper Abdomen',
        bodyPartExamined: 'Upper Abdomen',
        status: 'COMPLETED',
        priority: 'ROUTINE',
        patientId: patient.id,
        institutionName: 'Axis Imaging Mickleham',
        referringPhysician: 'Dr. Wilson',
        numberOfSeries: 1,
        numberOfInstances: 25
      },
      {
        studyInstanceUID: '1.2.840.113619.2.1.1.1.4',
        accessionNumber: 'ACC004',
        studyDate: new Date('2025-01-12'),
        modality: 'XR',
        studyDescription: 'Left Knee X-Ray AP and Lateral',
        bodyPartExamined: 'Left Knee',
        status: 'COMPLETED',
        priority: 'ROUTINE',
        patientId: patient.id,
        institutionName: 'Axis Imaging Mickleham',
        referringPhysician: 'Dr. Davis',
        numberOfSeries: 1,
        numberOfInstances: 2
      },
      {
        studyInstanceUID: '1.2.840.113619.2.1.1.1.5',
        accessionNumber: 'ACC005',
        studyDate: new Date('2025-01-14'),
        modality: 'XR',
        studyDescription: 'Lumbar Spine X-Ray AP and Lateral',
        bodyPartExamined: 'Lumbar Spine',
        status: 'COMPLETED',
        priority: 'ROUTINE',
        patientId: patient.id,
        institutionName: 'Axis Imaging Mickleham',
        referringPhysician: 'Dr. Johnson',
        numberOfSeries: 1,
        numberOfInstances: 2
      }
    ];

    const createdStudies = [];
    for (const studyData of studies) {
      const study = await prisma.study.create({
        data: studyData
      });
      createdStudies.push(study);
      console.log(`✅ Created study: ${study.accessionNumber} - ${study.studyDescription}`);
    }

    // Create sample series and images for each study
    for (const study of createdStudies) {
      const series = await prisma.series.create({
        data: {
          seriesInstanceUID: `${study.studyInstanceUID}.1`,
          seriesNumber: 1,
          modality: study.modality,
          seriesDescription: `${study.modality} Images`,
          studyId: study.id,
          numberOfInstances: study.numberOfInstances
        }
      });

      // Create sample images
      const imageCount = study.numberOfInstances;
      for (let i = 1; i <= imageCount; i++) {
        await prisma.image.create({
          data: {
            sopInstanceUID: `${series.seriesInstanceUID}.${i}`,
            instanceNumber: i,
            seriesId: series.id,
            imageUrl: `/api/images/${study.accessionNumber}_${i.toString().padStart(3, '0')}.dcm`,
            thumbnailUrl: `/api/thumbnails/${study.accessionNumber}_${i.toString().padStart(3, '0')}.jpg`
          }
        });
      }

      console.log(`✅ Created ${imageCount} images for series: ${series.seriesDescription}`);
    }

    // Create sample reports for some studies
    const reportsData = [
      {
        studyId: createdStudies[0].id, // Chest X-Ray
        reportNumber: 'RPT001',
        status: 'FINAL',
        clinicalHistory: 'Shortness of breath, rule out pneumonia',
        technique: 'PA and lateral chest radiographs were obtained',
        findings: 'The lungs are clear bilaterally with no evidence of consolidation, pneumothorax, or pleural effusion. The cardiac silhouette is normal in size and configuration. The mediastium is unremarkable.',
        impression: 'Normal chest radiograph. No acute cardiopulmonary process.',
        recommendations: 'No further imaging required at this time.',
        approvedAt: new Date('2025-01-15T11:15:00')
      },
      {
        studyId: createdStudies[1].id, // CT Abdomen
        reportNumber: 'RPT002',
        status: 'FINAL',
        clinicalHistory: 'Abdominal pain, rule out appendicitis',
        technique: 'Axial CT images of the abdomen and pelvis were obtained with IV contrast',
        findings: 'The appendix appears normal. No evidence of appendicitis. Liver, gallbladder, pancreas, spleen, and kidneys appear unremarkable. No free fluid or abnormal masses identified.',
        impression: 'No evidence of appendicitis or other acute abdominal pathology.',
        recommendations: 'Clinical correlation recommended.',
        approvedAt: new Date('2025-01-10T16:30:00')
      },
      {
        studyId: createdStudies[2].id, // Ultrasound
        reportNumber: 'RPT003',
        status: 'FINAL',
        clinicalHistory: 'Right upper quadrant pain, rule out gallstones',
        technique: 'Real-time ultrasound examination of the upper abdomen',
        findings: 'The gallbladder contains multiple small echogenic foci consistent with gallstones. No gallbladder wall thickening or pericholecystic fluid. Liver appears normal in echotexture.',
        impression: 'Cholelithiasis (gallstones). No evidence of acute cholecystitis.',
        recommendations: 'Clinical correlation and surgical consultation as indicated.',
        approvedAt: new Date('2025-01-08T10:20:00')
      }
    ];

    for (const reportData of reportsData) {
      const report = await prisma.report.create({
        data: reportData
      });
      console.log(`✅ Created report: ${report.reportNumber} - ${report.impression.substring(0, 50)}...`);
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log(`📊 Created: 1 patient, ${createdStudies.length} studies, ${reportsData.length} reports`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();