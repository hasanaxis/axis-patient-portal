const net = require('net');
const https = require('https');

// Configuration
const HL7_PORT = process.env.HL7_PORT || 2575;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yageczmzfuuhlklctojc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// HL7 Delimiters
const SEGMENT_DELIMITER = '\r';
const FIELD_DELIMITER = '|';
const COMPONENT_DELIMITER = '^';

console.log('Starting Axis Imaging HL7 Production Server');
console.log(`Server IP: 10.1.1.241`);
console.log(`HL7 Port: ${HL7_PORT}`);
console.log(`Supabase URL: ${SUPABASE_URL}`);

// Parse HL7 message
function parseHL7Message(message) {
    const segments = message.split(SEGMENT_DELIMITER).filter(s => s.length > 0);
    const parsed = {};
    
    segments.forEach(segment => {
        const fields = segment.split(FIELD_DELIMITER);
        const segmentType = fields[0];
        
        if (segmentType === 'MSH') {
            parsed.messageType = fields[8];
            parsed.messageControlId = fields[9];
            parsed.timestamp = fields[6];
            parsed.sendingFacility = fields[3];
        } else if (segmentType === 'PID') {
            const patientName = fields[5] ? fields[5].split(COMPONENT_DELIMITER) : [];
            parsed.patient = {
                mrn: fields[3],
                lastName: patientName[0] || '',
                firstName: patientName[1] || '',
                middleName: patientName[2] || '',
                dob: fields[7],
                gender: fields[8],
                phone: fields[13] || fields[14]
            };
        } else if (segmentType === 'OBR') {
            parsed.order = {
                accessionNumber: fields[3],
                procedureCode: fields[4],
                orderDateTime: fields[6],
                modality: fields[24],
                status: fields[25]
            };
        } else if (segmentType === 'OBX') {
            if (!parsed.results) parsed.results = [];
            parsed.results.push({
                valueType: fields[2],
                observationId: fields[3],
                value: fields[5],
                units: fields[6],
                status: fields[11]
            });
        }
    });
    
    return parsed;
}

// Forward to Supabase Edge Function
async function forwardToSupabase(messageData) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(messageData);
        
        const options = {
            hostname: SUPABASE_URL.replace('https://', ''),
            port: 443,
            path: '/functions/v1/api/voyager/hl7',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
            }
        };
        
        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(responseData);
                } else {
                    reject(new Error(`Supabase returned ${res.statusCode}: ${responseData}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.write(data);
        req.end();
    });
}

// Create HL7 ACK message
function createACK(messageControlId, ackCode = 'AA') {
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    return [
        `MSH|^~\\&|AXIS_PORTAL|AXIS_IMAGING|VOYAGER|RIS|${timestamp}||ACK|${messageControlId}|P|2.5`,
        `MSA|${ackCode}|${messageControlId}`
    ].join(SEGMENT_DELIMITER) + SEGMENT_DELIMITER;
}

// Create HL7 Server
const server = net.createServer((socket) => {
    console.log(`New connection from ${socket.remoteAddress}:${socket.remotePort}`);
    
    let buffer = '';
    
    socket.on('data', async (data) => {
        buffer += data.toString();
        
        // Check for message terminator
        if (buffer.includes('\x1c')) {
            const messages = buffer.split('\x1c');
            
            for (const message of messages) {
                if (message.trim()) {
                    try {
                        console.log('Received HL7 message');
                        const parsed = parseHL7Message(message);
                        console.log('Message type:', parsed.messageType);
                        console.log('Patient:', parsed.patient);
                        
                        // Forward to Supabase
                        await forwardToSupabase({
                            raw: message,
                            parsed: parsed,
                            source: 'voyager_ris',
                            timestamp: new Date().toISOString()
                        });
                        
                        console.log('Message forwarded to Supabase');
                        
                        // Send ACK
                        const ack = createACK(parsed.messageControlId, 'AA');
                        socket.write('\x0b' + ack + '\x1c\x0d');
                        console.log('ACK sent');
                        
                    } catch (error) {
                        console.error('Error processing message:', error);
                        // Send error ACK
                        const ack = createACK('ERROR', 'AE');
                        socket.write('\x0b' + ack + '\x1c\x0d');
                    }
                }
            }
            
            buffer = '';
        }
    });
    
    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
    
    socket.on('close', () => {
        console.log('Connection closed');
    });
});

// Start server
server.listen(HL7_PORT, '0.0.0.0', () => {
    console.log(`HL7 server listening on 0.0.0.0:${HL7_PORT}`);
    console.log('Ready to receive messages from Voyager RIS');
});

// Handle shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, closing server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});