import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateDicomFiles() {
  console.log('🔄 Updating database with real DICOM files...');

  try {
    // Define the real DICOM files
    const dicomFiles = [
      {
        sopInstanceUID: '1.2.3.4.5.1.1',
        fileName: '1.2.3.4.5.1.1.dcm',
        instanceNumber: 1
      },
      {
        sopInstanceUID: '1.2.3.4.5.6.7.8.9.10.1.1',
        fileName: '1.2.3.4.5.6.7.8.9.10.1.1.dcm',
        instanceNumber: 2
      },
      {
        sopInstanceUID: '1.2.3.4.5.6.7.8.9.10.1.2',
        fileName: '1.2.3.4.5.6.7.8.9.10.1.2.dcm',
        instanceNumber: 3
      }
    ];

    // Get the first study (Chest X-Ray)
    const study = await prisma.study.findFirst({
      include: {
        series: {
          include: {
            images: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    if (!study || !study.series[0]) {
      throw new Error('No study or series found');
    }

    const series = study.series[0];
    console.log(`📊 Found study: ${study.studyDescription}`);
    console.log(`📋 Series: ${series.seriesDescription} with ${series.images.length} existing images`);

    // Update existing images with real DICOM file paths
    for (let i = 0; i < Math.min(dicomFiles.length, series.images.length); i++) {
      const image = series.images[i];
      const dicomFile = dicomFiles[i];
      
      await prisma.image.update({
        where: { id: image.id },
        data: {
          sopInstanceUID: dicomFile.sopInstanceUID,
          instanceNumber: dicomFile.instanceNumber,
          imageUrl: `/api/images/${dicomFile.fileName}`,
          thumbnailUrl: `/api/thumbnails/${dicomFile.fileName.replace('.dcm', '.jpg')}`
        }
      });

      console.log(`✅ Updated image ${i + 1}: ${dicomFile.fileName}`);
    }

    // If we have more DICOM files than existing images, create new ones
    if (dicomFiles.length > series.images.length) {
      for (let i = series.images.length; i < dicomFiles.length; i++) {
        const dicomFile = dicomFiles[i];
        
        await prisma.image.create({
          data: {
            seriesId: series.id,
            sopInstanceUID: dicomFile.sopInstanceUID,
            instanceNumber: dicomFile.instanceNumber,
            imageUrl: `/api/images/${dicomFile.fileName}`,
            thumbnailUrl: `/api/thumbnails/${dicomFile.fileName.replace('.dcm', '.jpg')}`
          }
        });

        console.log(`✅ Created new image: ${dicomFile.fileName}`);
      }
    }

    // Update the series instance count
    await prisma.series.update({
      where: { id: series.id },
      data: {
        numberOfInstances: dicomFiles.length
      }
    });

    // Update the study instance count
    await prisma.study.update({
      where: { id: study.id },
      data: {
        numberOfInstances: dicomFiles.length
      }
    });

    console.log('🎉 Successfully updated database with real DICOM files!');
    console.log(`📊 Study: ${study.studyDescription}`);
    console.log(`📁 Files: ${dicomFiles.map(f => f.fileName).join(', ')}`);

  } catch (error) {
    console.error('❌ Error updating DICOM files:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateDicomFiles();