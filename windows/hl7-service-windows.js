const net = require('net');
const https = require('https');
const fs = require('fs');
const path = require('path');
const EventLogger = require('node-windows').EventLogger;

// Windows Event Logger
const log = new EventLogger('Axis HL7 Service');

// Load environment variables
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

// Configuration
const HL7_PORT = process.env.HL7_PORT || 2575;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yageczmzfuuhlklctojc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const LOG_PATH = path.join(__dirname, 'logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_PATH)) {
    fs.mkdirSync(LOG_PATH, { recursive: true });
}

// HL7 Delimiters
const SEGMENT_DELIMITER = '\r';
const FIELD_DELIMITER = '|';
const COMPONENT_DELIMITER = '^';

console.log('Starting Axis Imaging HL7 Service for Windows');
console.log(`Server: ${process.env.SERVER_IP || 'localhost'}`);
console.log(`HL7 Port: ${HL7_PORT}`);
console.log(`Supabase URL: ${SUPABASE_URL}`);

log.info('Axis HL7 Service starting...');

// Write to log file
function writeLog(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    
    const logFile = path.join(LOG_PATH, `hl7-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, logMessage);
    
    // Also log to Windows Event Log
    if (level === 'error') {
        log.error(message);
    } else if (level === 'warn') {
        log.warn(message);
    } else {
        log.info(message);
    }
}

// Parse HL7 message
function parseHL7Message(message) {
    try {
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
                parsed.sendingApplication = fields[2];
                parsed.receivingFacility = fields[5];
                parsed.receivingApplication = fields[4];
            } else if (segmentType === 'PID') {
                const patientName = fields[5] ? fields[5].split(COMPONENT_DELIMITER) : [];
                const patientId = fields[3] ? fields[3].split(COMPONENT_DELIMITER) : [];
                parsed.patient = {
                    mrn: patientId[0] || fields[3] || '',
                    lastName: patientName[0] || '',
                    firstName: patientName[1] || '',
                    middleName: patientName[2] || '',
                    dob: fields[7],
                    gender: fields[8],
                    phone: fields[13] || fields[14],
                    address: fields[11]
                };
            } else if (segmentType === 'OBR') {
                parsed.order = {
                    accessionNumber: fields[3],
                    procedureCode: fields[4],
                    procedureDescription: fields[4] ? fields[4].split(COMPONENT_DELIMITER)[1] : '',
                    orderDateTime: fields[6],
                    observationDateTime: fields[7],
                    orderingProvider: fields[16],
                    modality: fields[24],
                    status: fields[25],
                    priority: fields[5]
                };
            } else if (segmentType === 'OBX') {
                if (!parsed.results) parsed.results = [];
                parsed.results.push({
                    valueType: fields[2],
                    observationId: fields[3],
                    observationDescription: fields[3] ? fields[3].split(COMPONENT_DELIMITER)[1] : '',
                    value: fields[5],
                    units: fields[6],
                    referenceRange: fields[7],
                    abnormalFlag: fields[8],
                    status: fields[11],
                    observationDateTime: fields[14]
                });
            } else if (segmentType === 'NTE') {
                if (!parsed.notes) parsed.notes = [];
                parsed.notes.push({
                    setId: fields[1],
                    source: fields[2],
                    comment: fields[3]
                });
            }
        });
        
        return parsed;
    } catch (error) {
        writeLog(`Error parsing HL7 message: ${error.message}`, 'error');
        throw error;
    }
}

// Forward to Supabase Edge Function
async function forwardToSupabase(messageData) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(messageData);
        
        const url = new URL(`${SUPABASE_URL}/functions/v1/api/voyager/hl7`);
        
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
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
                    writeLog(`Successfully forwarded to Supabase: ${res.statusCode}`);
                    resolve(responseData);
                } else {
                    const error = `Supabase returned ${res.statusCode}: ${responseData}`;
                    writeLog(error, 'error');
                    reject(new Error(error));
                }
            });
        });
        
        req.on('error', (error) => {
            writeLog(`Failed to forward to Supabase: ${error.message}`, 'error');
            reject(error);
        });
        
        req.write(data);
        req.end();
    });
}

// Create HL7 ACK message
function createACK(messageControlId, ackCode = 'AA', errorMessage = '') {
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const ackMessage = [
        `MSH|^~\\&|AXIS_PORTAL|AXIS_IMAGING|VOYAGER|RIS|${timestamp}||ACK^${messageControlId}|${Date.now()}|P|2.5`,
        `MSA|${ackCode}|${messageControlId}|${errorMessage}`
    ].join(SEGMENT_DELIMITER) + SEGMENT_DELIMITER;
    
    return ackMessage;
}

// Handle client connection
function handleConnection(socket) {
    const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
    writeLog(`New HL7 connection from ${clientAddress}`);
    
    let buffer = '';
    let messageTimeout;
    
    // Set socket timeout (30 seconds)
    socket.setTimeout(30000);
    
    socket.on('data', async (data) => {
        try {
            buffer += data.toString();
            
            // Clear existing timeout
            if (messageTimeout) clearTimeout(messageTimeout);
            
            // Set new timeout for incomplete messages
            messageTimeout = setTimeout(() => {
                writeLog(`Message timeout for ${clientAddress}`, 'warn');
                socket.end();
            }, 5000);
            
            // Check for message terminator (0x1C)
            if (buffer.includes('\x1c')) {
                clearTimeout(messageTimeout);
                
                const messages = buffer.split('\x1c');
                
                for (const message of messages) {
                    if (message.trim()) {
                        // Remove start byte (0x0B) if present
                        const cleanMessage = message.replace(/^\x0b/, '').trim();
                        
                        if (cleanMessage) {
                            try {
                                writeLog(`Received HL7 message from ${clientAddress}`);
                                
                                // Parse message
                                const parsed = parseHL7Message(cleanMessage);
                                writeLog(`Message type: ${parsed.messageType}, Patient: ${parsed.patient?.mrn}`);
                                
                                // Store raw message
                                const messageFile = path.join(LOG_PATH, 'messages', `${Date.now()}_${parsed.messageControlId}.hl7`);
                                if (!fs.existsSync(path.dirname(messageFile))) {
                                    fs.mkdirSync(path.dirname(messageFile), { recursive: true });
                                }
                                fs.writeFileSync(messageFile, cleanMessage);
                                
                                // Forward to Supabase
                                await forwardToSupabase({
                                    raw: cleanMessage,
                                    parsed: parsed,
                                    source: 'voyager_ris',
                                    clientAddress: clientAddress,
                                    timestamp: new Date().toISOString()
                                });
                                
                                // Send ACK
                                const ack = createACK(parsed.messageControlId, 'AA');
                                const ackMessage = '\x0b' + ack + '\x1c\x0d';
                                socket.write(ackMessage);
                                
                                writeLog(`ACK sent for message ${parsed.messageControlId}`);
                                
                            } catch (error) {
                                writeLog(`Error processing message: ${error.message}`, 'error');
                                
                                // Send error ACK
                                try {
                                    const errorAck = createACK('ERROR', 'AE', error.message);
                                    socket.write('\x0b' + errorAck + '\x1c\x0d');
                                } catch (ackError) {
                                    writeLog(`Failed to send error ACK: ${ackError.message}`, 'error');
                                }
                            }
                        }
                    }
                }
                
                buffer = '';
            }
            
            // Prevent buffer overflow
            if (buffer.length > 1048576) { // 1MB limit
                writeLog(`Buffer overflow from ${clientAddress}`, 'error');
                buffer = '';
                socket.end();
            }
            
        } catch (error) {
            writeLog(`Data processing error: ${error.message}`, 'error');
        }
    });
    
    socket.on('timeout', () => {
        writeLog(`Socket timeout for ${clientAddress}`, 'warn');
        socket.end();
    });
    
    socket.on('error', (error) => {
        if (error.code !== 'ECONNRESET') {
            writeLog(`Socket error for ${clientAddress}: ${error.message}`, 'error');
        }
    });
    
    socket.on('close', () => {
        if (messageTimeout) clearTimeout(messageTimeout);
        writeLog(`Connection closed from ${clientAddress}`);
    });
}

// Create HL7 Server
const server = net.createServer(handleConnection);

// Error handling for server
server.on('error', (error) => {
    writeLog(`Server error: ${error.message}`, 'error');
    if (error.code === 'EADDRINUSE') {
        writeLog(`Port ${HL7_PORT} is already in use`, 'error');
        process.exit(1);
    }
});

// Start server
server.listen(HL7_PORT, '0.0.0.0', () => {
    const message = `HL7 server listening on 0.0.0.0:${HL7_PORT}`;
    console.log(message);
    writeLog(message);
    writeLog('Ready to receive messages from Voyager RIS');
    log.info('Axis HL7 Service started successfully');
});

// Graceful shutdown
function shutdown(signal) {
    writeLog(`Received ${signal}, shutting down gracefully...`);
    
    server.close(() => {
        writeLog('Server closed');
        log.info('Axis HL7 Service stopped');
        process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
        writeLog('Forced shutdown', 'error');
        process.exit(1);
    }, 10000);
}

// Handle Windows service signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    writeLog(`Uncaught exception: ${error.message}`, 'error');
    console.error(error);
});

process.on('unhandledRejection', (reason, promise) => {
    writeLog(`Unhandled rejection at ${promise}: ${reason}`, 'error');
    console.error(reason);
});