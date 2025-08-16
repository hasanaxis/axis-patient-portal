import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean database
  await prisma.image.deleteMany();
  await prisma.series.deleteMany();
  await prisma.report.deleteMany();
  await prisma.study.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // Create a test user and patient
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const user = await prisma.user.create({
    data: {
      email: 'test@axisimaging.com.au',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+61400123456',
      passwordHash: hashedPassword,
      isVerified: true,
      role: 'PATIENT'
    }
  });

  const patient = await prisma.patient.create({
    data: {
      userId: user.id,
      patientNumber: 'AX001',
      dateOfBirth: new Date('1985-06-15'),
      gender: 'Male',
      medicareNumber: '1234567890',
      streetAddress: '123 Main St',
      suburb: 'Mickleham',
      state: 'VIC',
      postcode: '3064',
      country: 'Australia'
    }
  });

  // Create a test study
  const study = await prisma.study.create({
    data: {
      patientId: patient.id,
      studyInstanceUID: '1.2.3.4.5.6.7.8.9.10',
      accessionNumber: 'ACC001',
      studyDate: new Date(),
      studyDescription: 'Chest X-Ray',
      modality: 'XR',
      bodyPartExamined: 'CHEST',
      status: 'COMPLETED',
      priority: 'ROUTINE',
      referringPhysician: 'Dr. Smith',
      institutionName: 'Axis Imaging Mickleham',
      numberOfSeries: 1,
      numberOfInstances: 2
    }
  });

  // Create series
  const series = await prisma.series.create({
    data: {
      studyId: study.id,
      seriesInstanceUID: '1.2.3.4.5.6.7.8.9.10.1',
      seriesNumber: 1,
      seriesDescription: 'PA/LAT Chest',
      modality: 'XR',
      numberOfInstances: 2
    }
  });

  // Create images
  await prisma.image.createMany({
    data: [
      {
        seriesId: series.id,
        sopInstanceUID: '1.2.3.4.5.6.7.8.9.10.1.1',
        instanceNumber: 1,
        imageUrl: '/mock-images/chest-pa.dcm',
        thumbnailUrl: '/mock-images/chest-pa-thumb.jpg'
      },
      {
        seriesId: series.id,
        sopInstanceUID: '1.2.3.4.5.6.7.8.9.10.1.2',
        instanceNumber: 2,
        imageUrl: '/mock-images/chest-lat.dcm',
        thumbnailUrl: '/mock-images/chest-lat-thumb.jpg'
      }
    ]
  });

  // Create report
  await prisma.report.create({
    data: {
      studyId: study.id,
      reportNumber: 'RPT001',
      radiologistId: 'dr-jones',
      clinicalHistory: 'Cough and shortness of breath',
      technique: 'PA and lateral chest radiographs',
      findings: 'The lungs appear clear with no focal consolidation, pleural effusion, or pneumothorax. The cardiac silhouette is normal in size and configuration. The mediastinal contours are unremarkable.',
      impression: 'Normal chest radiograph.',
      recommendations: 'No further imaging required at this time.',
      status: 'FINAL',
      priority: 'ROUTINE',
      isCritical: false,
      approvedAt: new Date()
    }
  });

  console.log('✅ Database seeding completed successfully!');
  console.log(`📊 Created:`);
  console.log(`   - 1 user (email: test@axisimaging.com.au, password: password123)`);
  console.log(`   - 1 patient (John Doe)`);
  console.log(`   - 1 study (Chest X-Ray)`);
  console.log(`   - 1 series with 2 images`);
  console.log(`   - 1 completed report`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });