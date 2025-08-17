// Quick test of Supabase database connection
const { PrismaClient } = require('@prisma/client');

async function testDatabaseConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing Supabase database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully!');
    
    // Test table creation by counting records
    const userCount = await prisma.user.count();
    console.log(`📊 Users table: ${userCount} records`);
    
    const patientCount = await prisma.patient.count();
    console.log(`👥 Patients table: ${patientCount} records`);
    
    const studyCount = await prisma.study.count();
    console.log(`🏥 Studies table: ${studyCount} records`);
    
    // Test creating a sample admin user
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@axisimaging.com.au' },
      update: {},
      create: {
        email: 'admin@axisimaging.com.au',
        firstName: 'System',
        lastName: 'Administrator',
        phoneNumber: '+61412345678',
        passwordHash: 'temp_hash_will_be_replaced',
        role: 'ADMIN',
        isVerified: true
      }
    });
    
    console.log(`✅ Admin user created/found: ${adminUser.email}`);
    
    console.log('\n🎉 Database setup complete! Ready for healthcare application.');
    console.log('\n📋 Next steps:');
    console.log('1. Run the RLS setup SQL in Supabase dashboard');
    console.log('2. Configure SMS authentication');
    console.log('3. Connect frontend to live backend');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();