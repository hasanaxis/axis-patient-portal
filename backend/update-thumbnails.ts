import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

async function updateThumbnails() {
  console.log('🔄 Updating thumbnail paths in database...');

  try {
    // Using PostgreSQL from environment

    // Check existing thumbnails
    const thumbnailDir = path.join(__dirname, 'uploads', 'thumbnails');
    const thumbnailFiles = fs.readdirSync(thumbnailDir).filter(f => f.endsWith('_thumb.jpg'));
    
    console.log('📁 Found thumbnail files:', thumbnailFiles);

    // Get all images from database
    const images = await prisma.image.findMany({
      include: {
        series: {
          include: {
            study: true
          }
        }
      }
    });

    console.log(`📊 Found ${images.length} images in database`);

    // Map the thumbnails to the correct images based on SOP Instance UID
    const thumbnailMappings = [
      { sopInstanceUID: '1.2.3.4.5.1.1', thumbnailFile: '1.2.3.4.5.1.1_thumb.jpg' },
      { sopInstanceUID: '1.2.3.4.5.6.7.8.9.10.1.1', thumbnailFile: '1.2.3.4.5.6.7.8.9.10.1.1_thumb.jpg' },
      { sopInstanceUID: '1.2.3.4.5.6.7.8.9.10.1.2', thumbnailFile: '1.2.3.4.5.6.7.8.9.10.1.2_thumb.jpg' }
    ];

    for (const mapping of thumbnailMappings) {
      const image = images.find(img => img.sopInstanceUID === mapping.sopInstanceUID);
      
      if (image) {
        // Update the thumbnail URL to point to the correct API endpoint
        await prisma.image.update({
          where: { id: image.id },
          data: {
            thumbnailUrl: `/api/thumbnails/${mapping.thumbnailFile}`
          }
        });
        console.log(`✅ Updated thumbnail for image ${image.sopInstanceUID} -> ${mapping.thumbnailFile}`);
      } else {
        console.log(`⚠️ No image found for SOP Instance UID: ${mapping.sopInstanceUID}`);
      }
    }

    // Verify the updates
    const updatedImages = await prisma.image.findMany({
      where: {
        thumbnailUrl: {
          not: null
        }
      },
      include: {
        series: {
          include: {
            study: {
              include: {
                patient: {
                  include: {
                    user: true
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log('\n📋 Updated images with thumbnails:');
    updatedImages.forEach(img => {
      console.log(`   - ${img.series.study.patient.user.firstName} ${img.series.study.patient.user.lastName}: ${img.series.study.studyDescription}`);
      console.log(`     Thumbnail: ${img.thumbnailUrl}`);
    });

    console.log('\n🎉 Thumbnail update completed successfully!');

  } catch (error) {
    console.error('❌ Error updating thumbnails:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateThumbnails();