const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUser() {
  try {
    // Delete any user with your phone number (from failed seed)
    await prisma.user.deleteMany({
      where: { phoneNumber: '+61401091789' }
    });
    console.log('✅ Cleaned up existing users with your phone number');

    // Update Arwa's record to use your phone number
    await prisma.user.update({
      where: { email: 'arwa.may@example.com' },
      data: { phoneNumber: '+61401091789' }
    });
    console.log('✅ Updated Arwa\'s phone number to +61401091789');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
  }
}
fixUser();