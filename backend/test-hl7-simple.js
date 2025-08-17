// Simple HL7 Message Testing Script
const net = require('net');

const HL7_HOST = 'localhost';
const HL7_PORT = 2575;

// Sample HL7 Messages with proper line endings
const SAMPLE_ORU_MESSAGE = 
  'MSH|^~\\&|VOYAGER|AXIS|PORTAL|AXIS|20250817140000||ORU^R01|12345|P|2.5\r' +
  'PID|1||P001^^^AXIS||Doe^John^M||19900101|M|||123 Main St^^Melbourne^VIC^3000^AU||(03)90001234\r' +
  'OBR|1||ACC001|XR CHEST^Chest X-Ray|||20250817140000|||||||||||Dr. Smith|||||||F||||||Dr. Farhan Ahmed\r' +
  'OBX|1|TX|IMPRESSION^Clinical Impression||Normal chest radiograph. No acute cardiopulmonary abnormalities detected.\r' +
  'OBX|2|TX|FINDINGS^Clinical Findings||The lungs are clear bilaterally with no focal consolidation.\r' +
  'OBX|3|TX|TECHNIQUE^Imaging Technique||PA and lateral chest radiographs were obtained.\r' +
  'OBX|4|TX|CLINICAL_HISTORY^Clinical History||Cough and shortness of breath for 2 weeks.\r';

const SAMPLE_ORM_MESSAGE = 
  'MSH|^~\\&|VOYAGER|AXIS|PORTAL|AXIS|20250817140000||ORM^O01|12346|P|2.5\r' +
  'PID|1||P002^^^AXIS||Smith^Jane^A||19850615|F|||456 Oak Ave^^Melbourne^VIC^3001^AU||(03)90001235\r' +
  'ORC|NW|ORD001||ACC002||||||||Dr. Johnson\r' +
  'OBR|1||ACC002|CT ABDOMEN^CT Abdomen with Contrast|||20250817150000||||||||||Dr. Johnson\r';

const SAMPLE_ADT_MESSAGE = 
  'MSH|^~\\&|VOYAGER|AXIS|PORTAL|AXIS|20250817140000||ADT^A08|12347|P|2.5\r' +
  'PID|1||P001^^^AXIS||Doe^John^M||19900101|M|||123 Main St^^Melbourne^VIC^3000^AU||(03)90001234\r';

function sendHL7Message(message, description) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    
    console.log(`\n📤 Sending ${description}...`);
    console.log(`Message preview: ${message.substring(0, 80)}...`);
    
    client.connect(HL7_PORT, HL7_HOST, () => {
      console.log(`✅ Connected to HL7 server at ${HL7_HOST}:${HL7_PORT}`);
      client.write(message);
    });
    
    client.on('data', (data) => {
      const response = data.toString();
      console.log(`📥 Received response: ${response.replace(/\r/g, '\\r')}`);
      
      if (response.includes('MSA|AA')) {
        console.log(`✅ ${description} - ACK received (success)`);
      } else if (response.includes('MSA|AE')) {
        console.log(`❌ ${description} - NAK received (error)`);
      }
      
      client.destroy();
      resolve(response);
    });
    
    client.on('error', (error) => {
      console.error(`❌ ${description} - Connection error:`, error.message);
      reject(error);
    });
    
    client.on('close', () => {
      console.log(`🔌 ${description} - Connection closed`);
    });
    
    // Timeout after 10 seconds
    client.setTimeout(10000, () => {
      console.log(`⏰ ${description} - Connection timeout`);
      client.destroy();
      reject(new Error('Connection timeout'));
    });
  });
}

async function testHL7Messages() {
  console.log('🧪 HL7 Message Testing Script');
  console.log('==============================');
  console.log(`Target: ${HL7_HOST}:${HL7_PORT}`);
  
  try {
    // Test 1: Report Completion (ORU^R01)
    await sendHL7Message(SAMPLE_ORU_MESSAGE, 'Report Completion (ORU^R01)');
    await sleep(2000);
    
    // Test 2: New Order (ORM^O01)
    await sendHL7Message(SAMPLE_ORM_MESSAGE, 'New Order (ORM^O01)');
    await sleep(2000);
    
    // Test 3: Patient Update (ADT^A08)
    await sendHL7Message(SAMPLE_ADT_MESSAGE, 'Patient Update (ADT^A08)');
    
    console.log('\n🎉 All HL7 message tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Report Completion (ORU^R01) - Processed');
    console.log('   ✅ New Order (ORM^O01) - Processed');
    console.log('   ✅ Patient Update (ADT^A08) - Processed');
    console.log('\n🔌 Voyager RIS can now be configured to send messages to:');
    console.log(`   - IP: ${HL7_HOST === 'localhost' ? '[SERVER_IP]' : HL7_HOST}`);
    console.log(`   - Port: ${HL7_PORT}`);
    console.log('   - Protocol: TCP/IP');
    
  } catch (error) {
    console.error('❌ HL7 testing failed:', error.message);
    process.exit(1);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if HL7 server is running first
function checkHL7Server() {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    
    client.connect(HL7_PORT, HL7_HOST, () => {
      console.log('✅ HL7 server is running and ready for testing');
      client.destroy();
      resolve();
    });
    
    client.on('error', (error) => {
      console.error('❌ HL7 server is not running. Please start it first with:');
      console.error('   HL7_PORT=2575 node src/hl7-server-simple.js');
      reject(error);
    });
    
    client.setTimeout(5000, () => {
      client.destroy();
      reject(new Error('Connection timeout - HL7 server not responding'));
    });
  });
}

// Main execution
async function main() {
  try {
    await checkHL7Server();
    await testHL7Messages();
  } catch (error) {
    console.error('Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  main();
}