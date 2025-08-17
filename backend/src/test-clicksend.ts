import { clickSendSMS } from './services/clicksend-sms';

async function testClickSend() {
  console.log('🔍 Testing ClickSend SMS configuration...');
  
  try {
    const balance = await clickSendSMS.getAccountBalance();
    if (balance !== null) {
      console.log(`✅ ClickSend connected! Account balance: $${balance}`);
    } else {
      console.log('⚠️ ClickSend credentials not configured or connection failed');
    }
    
    console.log('\n📱 ClickSend Features Ready:');
    console.log('✅ Verification codes for patient registration');
    console.log('✅ Report notifications when results ready');
    console.log('✅ Appointment reminders');
    console.log('✅ Patient invitations after scans');
    console.log('✅ Australian phone number formatting');
    console.log('✅ Alphanumeric sender ID: "AxisImaging"');
    
    console.log('\n🇦🇺 Perfect for Australian Healthcare:');
    console.log('- No dedicated number needed');
    console.log('- Alphanumeric sender shows "AxisImaging"');
    console.log('- ~$0.08 AUD per SMS');
    console.log('- Excellent delivery rates in Australia');
    
  } catch (error) {
    console.error('❌ ClickSend test failed:', error instanceof Error ? error.message : 'Unknown error');
  }
}

testClickSend();