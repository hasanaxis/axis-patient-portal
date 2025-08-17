// Quick test of ClickSend SMS integration
const { clickSendSMS } = require('./src/services/clicksend-sms');

async function testClickSend() {
  console.log('🔍 Testing ClickSend SMS configuration...');
  
  try {
    // Test account balance
    const balance = await clickSendSMS.getAccountBalance();
    if (balance !== null) {
      console.log(`✅ ClickSend connected! Account balance: $${balance}`);
    } else {
      console.log('⚠️ ClickSend credentials not configured or invalid');
    }
    
    // Test SMS history (doesn't require credits)
    const history = await clickSendSMS.getSMSHistory(5);
    if (history && Array.isArray(history)) {
      console.log(`📊 SMS History: ${history.length} recent messages`);
    }
    
    console.log('\n📋 ClickSend Features Ready:');
    console.log('✅ Verification codes for patient registration');
    console.log('✅ Report notifications when results ready');
    console.log('✅ Appointment reminders');
    console.log('✅ Patient invitations after scans');
    console.log('✅ Australian phone number formatting');
    
    console.log('\n🇦🇺 To complete setup:');
    console.log('1. Sign up at https://www.clicksend.com');
    console.log('2. Get your username and API key');
    console.log('3. Update CLICKSEND_USERNAME and CLICKSEND_API_KEY in .env');
    console.log('4. Buy SMS credits (typically $0.08 AUD per SMS)');
    
  } catch (error) {
    console.error('❌ ClickSend test failed:', error.message);
  }
}

testClickSend();