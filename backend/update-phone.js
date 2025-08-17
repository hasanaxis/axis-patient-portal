const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updatePhone() {
  try {
    await prisma.user.update({
      where: { email: 'arwa.may@example.com' },
      data: { phoneNumber: '+61401091789' }
    });
    console.log('✅ Updated phone number to +61401091789');
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
  }
}
updatePhone();