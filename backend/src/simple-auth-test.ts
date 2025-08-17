import { PrismaClient } from '@prisma/client';
import { secureAuthService } from './services/secure-auth-service';

const prisma = new PrismaClient();

async function simpleAuthTest() {
  console.log('🧪 Simple Authentication Test\n');
  console.log('===============================\n');

  const testPhone = '+61401091789';
  const testDOB = '1990-01-15';
  const testEmail = `test_${Date.now()}@axisimaging.com.au`; // Unique email
  const testPassword = 'Test@1234';

  try {
    // Step 1: Create patient invitation
    console.log('📨 Creating patient invitation...');
    
    const invitationResult = await secureAuthService.createPatientInvitation({
      patientNumber: `AXI${Date.now()}`, // Unique patient number
      firstName: 'Test',
      lastName: 'Patient',
      phoneNumber: testPhone,
      dateOfBirth: testDOB,
      studyAccessionNumber: `ACC${Date.now()}`,
      risMessageId: `RIS-${Date.now()}`
    });

    if (invitationResult.success) {
      console.log('✅ Patient invitation created');
      console.log(`   Invitation URL: ${invitationResult.invitationUrl}`);
      console.log(`   SMS would be sent to: ${testPhone}\n`);
    } else {
      console.log('❌ Failed to create invitation:', invitationResult.message);
      return;
    }

    // Step 2: Test patient verification
    console.log('🔍 Testing patient verification...');
    const verifyResult = await secureAuthService.verifyPatientExists({
      phoneNumber: testPhone,
      dateOfBirth: testDOB
    });

    if (verifyResult.success) {
      console.log('✅ Patient verification successful');
      console.log('   OTP would be sent via SMS\n');
      
      // Get the verification code from database for testing
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
        console.log(`📱 Test OTP Code: ${verificationCode.code}\n`);
        
        // Step 3: Test OTP verification
        console.log('✓ Testing OTP verification...');
        const otpResult = await secureAuthService.verifyOTP(
          verificationCode.code,
          verifyResult.verificationToken!
        );

        if (otpResult.success) {
          console.log('✅ OTP verification successful');
          console.log(`   Patient: ${otpResult.patientInfo.firstName} ${otpResult.patientInfo.lastName}\n`);
          
          // Step 4: Test account creation
          console.log('👤 Testing account creation...');
          const accountResult = await secureAuthService.createAccount(
            {
              email: testEmail,
              password: testPassword,
              enableTwoFactor: false // Disable 2FA for simpler test
            },
            otpResult.registrationToken!
          );

          if (accountResult.success) {
            console.log('✅ Account creation successful!');
            console.log(`   Auth token received\n`);
            
            // Step 5: Test login
            console.log('🔐 Testing login...');
            const loginResult = await secureAuthService.login({
              email: testEmail,
              password: testPassword
            });

            if (loginResult.success) {
              console.log('✅ Login successful!');
              console.log(`   Auth token received\n`);
              
              // Summary
              console.log('===============================');
              console.log('✅ ALL TESTS PASSED!');
              console.log('===============================');
              console.log('✓ Patient invitation');
              console.log('✓ Patient verification');
              console.log('✓ OTP verification');
              console.log('✓ Account creation');
              console.log('✓ Login');
              console.log('\n🎉 Authentication system is working!');
              
            } else {
              console.log('❌ Login failed:', loginResult.message);
            }
          } else {
            console.log('❌ Account creation failed:', accountResult.message);
          }
        } else {
          console.log('❌ OTP verification failed:', otpResult.message);
        }
      } else {
        console.log('❌ No verification code found');
      }
    } else {
      console.log('❌ Patient verification failed:', verifyResult.message);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Test the RIS webhook endpoint separately
async function testRISWebhook() {
  console.log('\n📡 Testing RIS Webhook Endpoint\n');
  console.log('================================\n');
  
  try {
    const webhookData = {
      patientNumber: `AXI${Date.now()}`,
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+61401091789',
      dateOfBirth: '1985-06-15',
      studyAccessionNumber: `STUDY${Date.now()}`,
      risMessageId: `RIS${Date.now()}`
    };

    console.log('📨 Simulating RIS webhook call...');
    console.log(`   Patient: ${webhookData.firstName} ${webhookData.lastName}`);
    console.log(`   Phone: ${webhookData.phoneNumber}`);
    console.log(`   DOB: ${webhookData.dateOfBirth}\n`);

    const result = await secureAuthService.createPatientInvitation(webhookData);

    if (result.success) {
      console.log('✅ RIS Webhook processed successfully');
      console.log(`   Invitation URL: ${result.invitationUrl}`);
      console.log('   SMS invitation would be sent to patient\n');
    } else {
      console.log('❌ RIS Webhook failed:', result.message);
    }

  } catch (error) {
    console.error('❌ RIS Webhook test failed:', error);
  }
}

// Run tests
async function runAllTests() {
  await simpleAuthTest();
  await testRISWebhook();
  await prisma.$disconnect();
}

runAllTests().catch(console.error);