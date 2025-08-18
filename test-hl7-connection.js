// Test HL7 Connection to Axis Imaging Server
// Sends test HL7 messages to verify integration

const net = require('net');

const SERVER_IP = '10.1.1.241';
const HL7_PORT = 2575;

// MLLP wrapper functions
function wrapMLLP(message) {
    return Buffer.concat([
        Buffer.from([0x0B]), // Start of Block
        Buffer.from(message, 'utf8'),
        Buffer.from([0x1C, 0x0D]) // End of Block + Carriage Return
    ]);
}

function unwrapMLLP(buffer) {
    if (buffer[0] === 0x0B && buffer[buffer.length - 2] === 0x1C && buffer[buffer.length - 1] === 0x0D) {
        return buffer.slice(1, buffer.length - 2).toString('utf8');
    }
    return buffer.toString('utf8');
}

// Test HL7 Messages
const testMessages = {
    // 1. ORM^O01 - New Order Message (Patient scheduled for scan)
    newOrder: `MSH|^~\\&|VOYAGER_RIS|AXIS_IMAGING|PATIENT_PORTAL|AXIS_IMAGING|${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}||ORM^O01^ORM_O01|${Date.now()}|P|2.5|||||||
PID|1||PAT001^^^AXIS^MR||DOE^JOHN^MIDDLE||19900101|M|||123 MAIN ST^^MICKLEHAM^VIC^3064^AU||(03)1234-5678|(03)8765-4321||S||PAT001|||||||||||
PV1|1|O|RAD^^^^||||DOC001^SMITH^JANE^DR^^^^^^^^^^^UPIN|RAD||||||||DOC001^SMITH^JANE^DR^^^^^^^^^^^UPIN|VIS|PAT001|||||||||||||||||||||||${new Date().toISOString().slice(0, 8)}|||||||
ORC|NW|ORD001|ORD001|GRP001||IP||${new Date().toISOString()}|||DOC001^SMITH^JANE^DR^^^^^^^^^^^UPIN||||||||
OBR|1|ORD001|ORD001|XR-CHEST^CHEST XRAY^LOCAL||${new Date().toISOString()}|${new Date().toISOString()}|||||||||DOC001^SMITH^JANE^DR^^^^^^^^^^^UPIN||||||${new Date().toISOString()}||RAD^RADIOLOGY^HL70074||||||||`,

    // 2. ORU^R01 - Report Ready Message (Report completed)
    reportReady: `MSH|^~\\&|VOYAGER_RIS|AXIS_IMAGING|PATIENT_PORTAL|AXIS_IMAGING|${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}||ORU^R01^ORU_R01|${Date.now()}|P|2.5|||||||
PID|1||PAT001^^^AXIS^MR||DOE^JOHN^MIDDLE||19900101|M|||123 MAIN ST^^MICKLEHAM^VIC^3064^AU||(03)1234-5678|(03)8765-4321||S||PAT001|||||||||||
PV1|1|O|RAD^^^^||||DOC001^SMITH^JANE^DR^^^^^^^^^^^UPIN|RAD||||||||DOC001^SMITH^JANE^DR^^^^^^^^^^^UPIN|VIS|PAT001|||||||||||||||||||||||${new Date().toISOString().slice(0, 8)}|||||||
ORC|RE|ORD001|ORD001|GRP001||CM||${new Date().toISOString()}|||RAD001^AHMED^FARHAN^DR^^^^^^^^^^^UPIN||||||||
OBR|1|ORD001|ORD001|XR-CHEST^CHEST XRAY^LOCAL||${new Date().toISOString()}|${new Date().toISOString()}|||||||||RAD001^AHMED^FARHAN^DR^^^^^^^^^^^UPIN||||||${new Date().toISOString()}||RAD^RADIOLOGY^HL70074|F|||||||
OBX|1|TX|IMP^IMPRESSION^LOCAL||Normal chest radiograph. No significant abnormality detected. The lungs appear clear with no focal consolidation, pleural effusion, or pneumothorax. The cardiac silhouette is normal in size and configuration.||||||F|||${new Date().toISOString()}|RAD001^AHMED^FARHAN^DR^^^^^^^^^^^UPIN|`,

    // 3. ADT^A08 - Patient Update Message
    patientUpdate: `MSH|^~\\&|VOYAGER_RIS|AXIS_IMAGING|PATIENT_PORTAL|AXIS_IMAGING|${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}||ADT^A08^ADT_A01|${Date.now()}|P|2.5|||||||
EVN|A08|${new Date().toISOString()}|||DOC001^SMITH^JANE^DR^^^^^^^^^^^UPIN|${new Date().toISOString()}
PID|1||PAT001^^^AXIS^MR||DOE^JOHN^MIDDLE||19900101|M|||123 MAIN ST^^MICKLEHAM^VIC^3064^AU||(03)1234-5678|(03)8765-4321||S||PAT001|||||||||||
PV1|1|O|RAD^^^^||||DOC001^SMITH^JANE^DR^^^^^^^^^^^UPIN|RAD||||||||DOC001^SMITH^JANE^DR^^^^^^^^^^^UPIN|VIS|PAT001|||||||||||||||||||||||${new Date().toISOString().slice(0, 8)}|||||||`
};

function sendHL7Message(messageType, messageContent, callback) {
    console.log(`\n🔄 Sending ${messageType} message to ${SERVER_IP}:${HL7_PORT}`);
    console.log(`📋 Message preview: ${messageContent.substring(0, 100)}...`);
    
    const client = net.createConnection(HL7_PORT, SERVER_IP);
    let responseBuffer = Buffer.alloc(0);
    
    client.setTimeout(10000); // 10 second timeout
    
    client.on('connect', () => {
        console.log(`✅ Connected to HL7 server ${SERVER_IP}:${HL7_PORT}`);
        
        // Wrap message in MLLP protocol
        const mllpMessage = wrapMLLP(messageContent);
        console.log(`📤 Sending MLLP-wrapped message (${mllpMessage.length} bytes)`);
        
        client.write(mllpMessage);
    });
    
    client.on('data', (data) => {
        responseBuffer = Buffer.concat([responseBuffer, data]);
        console.log(`📥 Received ${data.length} bytes from server`);
        
        // Check if we have a complete MLLP message
        if (data.includes(0x1C) && data.includes(0x0D)) {
            const response = unwrapMLLP(responseBuffer);
            console.log(`✅ ${messageType} ACK received:`);
            console.log(`   ${response.substring(0, 200)}...`);
            
            client.end();
            if (callback) callback(null, response);
        }
    });
    
    client.on('timeout', () => {
        console.log(`⏰ ${messageType} connection timeout`);
        client.destroy();
        if (callback) callback(new Error('Connection timeout'), null);
    });
    
    client.on('error', (error) => {
        console.log(`❌ ${messageType} connection error: ${error.message}`);
        if (callback) callback(error, null);
    });
    
    client.on('close', () => {
        console.log(`🔌 ${messageType} connection closed`);
    });
}

// Test sequence
async function runHL7Tests() {
    console.log('🚀 Starting HL7 Integration Test Suite');
    console.log(`📡 Target Server: ${SERVER_IP}:${HL7_PORT}`);
    console.log('=' * 60);
    
    const tests = [
        { name: 'ORM^O01 (New Order)', message: testMessages.newOrder },
        { name: 'ORU^R01 (Report Ready)', message: testMessages.reportReady },
        { name: 'ADT^A08 (Patient Update)', message: testMessages.patientUpdate }
    ];
    
    for (const test of tests) {
        await new Promise((resolve) => {
            sendHL7Message(test.name, test.message, (error, response) => {
                if (error) {
                    console.log(`❌ ${test.name} failed: ${error.message}`);
                } else {
                    console.log(`✅ ${test.name} successful`);
                }
                
                // Wait 2 seconds between tests
                setTimeout(resolve, 2000);
            });
        });
    }
    
    console.log('\n🏁 HL7 Integration Test Suite Complete');
    console.log('📊 Check server logs for detailed processing information');
    console.log('📁 Windows Server Logs: C:\\AxisImaging\\logs\\hl7*.log');
}

// Simple connectivity test
function testConnectivity() {
    console.log(`🔍 Testing basic connectivity to ${SERVER_IP}:${HL7_PORT}`);
    
    const client = net.createConnection(HL7_PORT, SERVER_IP);
    
    client.setTimeout(5000);
    
    client.on('connect', () => {
        console.log('✅ Basic connectivity successful - HL7 port is open');
        client.end();
    });
    
    client.on('timeout', () => {
        console.log('⏰ Connection timeout - HL7 service may not be running');
        client.destroy();
    });
    
    client.on('error', (error) => {
        console.log(`❌ Connection failed: ${error.message}`);
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Possible issues:');
            console.log('   - HL7 service is not running on the server');
            console.log('   - Firewall is blocking port 2575');
            console.log('   - Server IP address is incorrect');
        }
    });
}

// Run tests based on command line argument
const testType = process.argv[2] || 'connectivity';

if (testType === 'connectivity') {
    testConnectivity();
} else if (testType === 'full') {
    runHL7Tests();
} else {
    console.log('Usage:');
    console.log('  node test-hl7-connection.js connectivity  # Test basic connection');
    console.log('  node test-hl7-connection.js full         # Send full HL7 test messages');
}