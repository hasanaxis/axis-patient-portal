import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedUserData() {
  console.log('🌱 Starting user data seeding...');

  try {
    // Create a user with your phone number
    const user = await prisma.user.create({
      data: {
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '+61401091789',
        passwordHash: '',
        role: 'PATIENT',
        isVerified: true
      }
    });

    const patient = await prisma.patient.create({
      data: {
        userId: user.id,
        patientNumber: 'AXI0002',
        medicareNumber: '9876543210',
        dateOfBirth: new Date('1985-03-20'),
        country: 'Australia',
        streetAddress: '456 Main Street',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000'
      }
    });

    console.log('✅ Created patient:', patient.patientNumber);

    // Create sample studies for the user
    const studies = [
      {
        studyInstanceUID: '1.2.840.113619.2.1.1.2.1',
        accessionNumber: 'ACC101',
        studyDate: new Date('2025-01-16'),
        modality: 'XR',
        studyDescription: 'Chest X-Ray PA and Lateral',
        bodyPartExamined: 'Chest',
        status: 'COMPLETED',
        priority: 'ROUTINE',
        patientId: patient.id,
        institutionName: 'Axis Imaging Mickleham',
        referringPhysician: 'Dr. Williams',
        numberOfSeries: 1,
        numberOfInstances: 3
      },
      {
        studyInstanceUID: '1.2.840.113619.2.1.1.2.2',
        accessionNumber: 'ACC102',
        studyDate: new Date('2025-01-14'),
        modality: 'CT',
        studyDescription: 'CT Head without Contrast',
        bodyPartExamined: 'Head',
        status: 'COMPLETED',
        priority: 'ROUTINE',
        patientId: patient.id,
        institutionName: 'Axis Imaging Mickleham',
        referringPhysician: 'Dr. Thompson',
        numberOfSeries: 1,
        numberOfInstances: 45
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

      // Create sample images with thumbnail paths to your actual files
      if (study.accessionNumber === 'ACC101') {
        // Use your actual thumbnail files for the chest X-ray
        const imageData = [
          { sopUID: '2.3.4.5.6.1.1', instanceNum: 1, thumbFile: '1.2.3.4.5.1.1_thumb.jpg' },
          { sopUID: '2.3.4.5.6.7.8.9.10.1.1', instanceNum: 2, thumbFile: '1.2.3.4.5.6.7.8.9.10.1.1_thumb.jpg' },
          { sopUID: '2.3.4.5.6.7.8.9.10.1.2', instanceNum: 3, thumbFile: '1.2.3.4.5.6.7.8.9.10.1.2_thumb.jpg' }
        ];

        for (const img of imageData) {
          await prisma.image.create({
            data: {
              sopInstanceUID: img.sopUID,
              instanceNumber: img.instanceNum,
              seriesId: series.id,
              imageUrl: `/api/images/${img.sopUID}.dcm`,
              thumbnailUrl: `/api/thumbnails/${img.thumbFile}`
            }
          });
        }
      } else {
        // Create regular sample images for other studies
        for (let i = 1; i <= study.numberOfInstances; i++) {
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
      }

      console.log(`✅ Created images for series: ${series.seriesDescription}`);
    }

    // Create sample reports
    const reportsData = [
      {
        studyId: createdStudies[0].id, // Chest X-Ray
        reportNumber: 'RPT101',
        status: 'FINAL',
        clinicalHistory: 'Routine chest screening',
        technique: 'PA and lateral chest radiographs were obtained',
        findings: 'The lungs are clear bilaterally with no evidence of consolidation, pneumothorax, or pleural effusion. The cardiac silhouette is normal in size and configuration.',
        impression: 'Normal chest radiograph. No acute findings.',
        recommendations: 'No further imaging required at this time.',
        approvedAt: new Date('2025-01-16T14:30:00')
      }
    ];

    for (const reportData of reportsData) {
      const report = await prisma.report.create({
        data: reportData
      });
      console.log(`✅ Created report: ${report.reportNumber}`);
    }

    console.log('\n🎉 User data seeding completed successfully!');
    console.log(`📊 Created: 1 patient, ${createdStudies.length} studies, ${reportsData.length} reports`);
    console.log(`📱 Phone: +61401091789`);

  } catch (error) {
    console.error('❌ Error seeding user data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedUserData();