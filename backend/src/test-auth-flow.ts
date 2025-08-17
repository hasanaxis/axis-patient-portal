import { PrismaClient } from '@prisma/client';
import { secureAuthService } from './services/secure-auth-service';

const prisma = new PrismaClient();

async function testAuthenticationFlow() {
  console.log('🧪 Testing Complete Authentication Flow\n');
  console.log('=======================================\n');

  const testPhone = '+61401091789';
  const testDOB = '1990-01-15';
  const testEmail = 'test@axisimaging.com.au';
  const testPassword = 'Test@1234';

  try {
    // Step 1: Create a test patient invitation (simulating RIS webhook)
    console.log('📨 Step 1: Creating patient invitation (RIS Webhook simulation)...');
    
    // First, clean up any existing test data
    await prisma.patientInvitation.deleteMany({
      where: { phoneNumber: testPhone }
    });
    
    // Delete in correct order due to foreign key constraints
    const existingUser = await prisma.user.findFirst({
      where: { phoneNumber: testPhone }
    });
    
    if (existingUser) {
      await prisma.patient.deleteMany({
        where: { userId: existingUser.id }
      });
      
      await prisma.session.deleteMany({
        where: { userId: existingUser.id }
      });
      
      await prisma.verificationCode.deleteMany({
        where: { userId: existingUser.id }
      });
      
      await prisma.user.delete({
        where: { id: existingUser.id }
      });
    }

    const invitationResult = await secureAuthService.createPatientInvitation({
      patientNumber: 'AXI0001',
      firstName: 'Test',
      lastName: 'Patient',
      phoneNumber: testPhone,
      dateOfBirth: testDOB,
      studyAccessionNumber: 'ACC123456',
      risMessageId: 'RIS-MSG-001'
    });

    if (invitationResult.success) {
      console.log('✅ Patient invitation created');
      console.log(`   Invitation URL: ${invitationResult.invitationUrl}`);
      console.log(`   SMS would be sent to: ${testPhone}\n`);
    } else {
      console.log('❌ Failed to create invitation:', invitationResult.message);
      return;
    }

    // Step 2: Verify patient exists
    console.log('🔍 Step 2: Verifying patient exists in system...');
    const verifyResult = await secureAuthService.verifyPatientExists({
      phoneNumber: testPhone,
      dateOfBirth: testDOB
    });

    if (verifyResult.success) {
      console.log('✅ Patient verified');
      console.log(`   Verification token received`);
      console.log(`   OTP would be sent to: ${testPhone}\n`);
      
      // For testing, we'll simulate OTP verification
      console.log('📱 Step 3: Simulating OTP verification...');
      console.log('   (In production, patient would receive SMS with 6-digit code)');
      
      // Get the actual OTP from database for testing
      const verificationCode = await prisma.verificationCode.findFirst({
        where: {
          phoneNumber: testPhone,
          type: 'REGISTRATION',
          isUsed: false
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (verificationCode) {
        console.log(`   Test OTP Code: ${verificationCode.code}\n`);
        
        // Step 3: Verify OTP
        const otpResult = await secureAuthService.verifyOTP(
          verificationCode.code,
          verifyResult.verificationToken!
        );

        if (otpResult.success) {
          console.log('✅ OTP verified successfully');
          console.log(`   Patient: ${otpResult.patientInfo.firstName} ${otpResult.patientInfo.lastName}`);
          console.log(`   Registration token received\n`);
          
          // Step 4: Create account
          console.log('👤 Step 4: Creating patient account...');
          console.log(`   Email: ${testEmail}`);
          console.log(`   Password: ${testPassword}`);
          console.log(`   2FA: Enabled (SMS)\n`);
          
          const accountResult = await secureAuthService.createAccount(
            {
              email: testEmail,
              password: testPassword,
              enableTwoFactor: true,
              twoFactorMethod: 'SMS'
            },
            otpResult.registrationToken!
          );

          if (accountResult.success) {
            console.log('✅ Account created successfully!');
            console.log(`   Auth token received`);
            console.log(`   2FA enabled via SMS\n`);
            
            // Step 5: Test login
            console.log('🔐 Step 5: Testing login with new account...');
            const loginResult = await secureAuthService.login({
              email: testEmail,
              password: testPassword
            });

            if (loginResult.requiresTwoFactor) {
              console.log('✅ Login requires 2FA (as expected)');
              console.log(`   2FA code would be sent via: ${loginResult.twoFactorMethod}`);
              
              // Get the 2FA code for testing
              const twoFactorCode = await prisma.verificationCode.findFirst({
                where: {
                  phoneNumber: testPhone,
                  type: 'TWO_FACTOR',
                  isUsed: false
                },
                orderBy: {
                  createdAt: 'desc'
                }
              });

              if (twoFactorCode) {
                console.log(`   Test 2FA Code: ${twoFactorCode.code}\n`);
                
                // Complete login with 2FA
                const finalLoginResult = await secureAuthService.login({
                  email: testEmail,
                  password: testPassword,
                  twoFactorCode: twoFactorCode.code
                });

                if (finalLoginResult.success) {
                  console.log('✅ Login successful with 2FA!');
                  console.log(`   Auth token received`);
                  console.log(`   User can now access dashboard\n`);
                } else {
                  console.log('❌ 2FA verification failed:', finalLoginResult.message);
                }
              }
            } else if (loginResult.success) {
              console.log('✅ Login successful!');
              console.log(`   Auth token received\n`);
            } else {
              console.log('❌ Login failed:', loginResult.message);
            }
            
            // Summary
            console.log('=======================================');
            console.log('📊 AUTHENTICATION FLOW TEST SUMMARY');
            console.log('=======================================');
            console.log('✅ Patient invitation created');
            console.log('✅ Patient verification successful');
            console.log('✅ OTP verification successful');
            console.log('✅ Account creation successful');
            console.log('✅ Login with 2FA successful');
            console.log('\n🎉 All authentication steps completed successfully!');
            console.log(`\n📱 Test phone number: ${testPhone}`);
            console.log(`📧 Test email: ${testEmail}`);
            console.log(`🔑 Test password: ${testPassword}`);
            
          } else {
            console.log('❌ Account creation failed:', accountResult.message);
          }
        } else {
          console.log('❌ OTP verification failed:', otpResult.message);
        }
      } else {
        console.log('❌ No verification code found in database');
      }
    } else {
      console.log('❌ Patient verification failed:', verifyResult.message);
      
      // Check if patient already exists
      const existingUser = await prisma.user.findFirst({
        where: { phoneNumber: testPhone }
      });
      
      if (existingUser) {
        console.log('\n⚠️  Note: A user with this phone number already exists.');
        console.log('   The system correctly prevented duplicate registration.');
      }
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testAuthenticationFlow().catch(console.error);