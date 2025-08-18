const net = require('net');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const DICOM_PORT = process.env.DICOM_PORT || 104;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yageczmzfuuhlklctojc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const STORAGE_PATH = path.join(__dirname, 'dicom-storage');
const LOG_PATH = path.join(__dirname, 'logs');

// Ensure directories exist
if (!fs.existsSync(STORAGE_PATH)) fs.mkdirSync(STORAGE_PATH, { recursive: true });
if (!fs.existsSync(LOG_PATH)) fs.mkdirSync(LOG_PATH, { recursive: true });

console.log('Enhanced DICOM Receiver for Production');
console.log('Port:', DICOM_PORT);
console.log('Storage:', STORAGE_PATH);
console.log('Supabase:', SUPABASE_URL);

function writeLog(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = '[' + timestamp + '] [' + level.toUpperCase() + '] ' + message;
    console.log(logMessage);
    
    const logFile = path.join(LOG_PATH, 'dicom-' + new Date().toISOString().split('T')[0] + '.log');
    fs.appendFileSync(logFile, logMessage + '\n');
}

// Enhanced DICOM metadata parser
function parseDICOMMetadata(buffer) {
    const metadata = {
        patientName: '',
        patientId: '',
        studyInstanceUID: '',
        seriesInstanceUID: '',
        sopInstanceUID: '',
        modality: '',
        studyDate: '',
        studyTime: '',
        accessionNumber: '',
        bodyPartExamined: '',
        studyDescription: '',
        seriesDescription: '',
        instanceNumber: 1,
        imageComments: ''
    };
    
    try {
        // Skip DICOM header (128 bytes + "DICM")
        let offset = 132;
        
        while (offset < buffer.length - 8 && offset < 5000) {
            if (offset + 8 > buffer.length) break;
            
            const group = buffer.readUInt16LE(offset);
            const element = buffer.readUInt16LE(offset + 2);
            const tag = group.toString(16).padStart(4, '0') + element.toString(16).padStart(4, '0');
            
            // Get VR (Value Representation) - 2 bytes
            const vr = String.fromCharCode(buffer[offset + 4] || 0, buffer[offset + 5] || 0);
            let length = 0;
            let dataOffset = offset + 8;
            
            // Handle different VR length encodings
            if (['OB', 'OW', 'OF', 'SQ', 'UN', 'UT'].includes(vr)) {
                if (offset + 12 > buffer.length) break;
                dataOffset = offset + 12;
                length = buffer.readUInt32LE(offset + 8);
            } else {
                if (offset + 8 > buffer.length) break;
                length = buffer.readUInt16LE(offset + 6);
            }
            
            // Validate length and bounds
            if (length > 0 && length < 1000 && dataOffset + length <= buffer.length) {
                const value = buffer.toString('utf8', dataOffset, dataOffset + length)
                    .replace(/\0/g, '')
                    .replace(/\r/g, '')
                    .replace(/\n/g, ' ')
                    .trim();
                
                // Extract specific DICOM tags
                switch(tag.toUpperCase()) {
                    case '00100010': metadata.patientName = value; break;
                    case '00100020': metadata.patientId = value; break;
                    case '0020000D': metadata.studyInstanceUID = value; break;
                    case '0020000E': metadata.seriesInstanceUID = value; break;
                    case '00080018': metadata.sopInstanceUID = value; break;
                    case '00080060': metadata.modality = value; break;
                    case '00080020': metadata.studyDate = value; break;
                    case '00080030': metadata.studyTime = value; break;
                    case '00080050': metadata.accessionNumber = value; break;
                    case '00180015': metadata.bodyPartExamined = value; break;
                    case '00081030': metadata.studyDescription = value; break;
                    case '0008103E': metadata.seriesDescription = value; break;
                    case '00200013': metadata.instanceNumber = parseInt(value) || 1; break;
                    case '00204000': metadata.imageComments = value; break;
                }
            }
            
            // Move to next element
            offset = dataOffset + length;
            if (offset % 2 !== 0) offset++; // Ensure even alignment
        }
        
        // Generate defaults if missing critical values
        if (!metadata.sopInstanceUID) {
            metadata.sopInstanceUID = Date.now() + '.' + Math.random().toString(36).substr(2, 9);
        }
        if (!metadata.studyInstanceUID) {
            metadata.studyInstanceUID = Date.now() + '.' + Math.random().toString(36).substr(2, 9);
        }
        if (!metadata.seriesInstanceUID) {
            metadata.seriesInstanceUID = metadata.studyInstanceUID + '.1';
        }
        
        writeLog('Parsed DICOM metadata: Patient=' + metadata.patientId + ', Modality=' + metadata.modality + ', Study=' + metadata.studyInstanceUID.substring(0, 20) + '...');
        
    } catch (error) {
        writeLog('Error parsing DICOM metadata: ' + error.message, 'error');
    }
    
    return metadata;
}

// Upload DICOM file to Supabase Storage
async function uploadToSupabaseStorage(filePath, filename, metadata) {
    return new Promise((resolve, reject) => {
        const fileData = fs.readFileSync(filePath);
        const storagePath = 'dicom-images/' + metadata.patientId + '/' + metadata.studyInstanceUID + '/' + filename;
        
        const options = {
            hostname: 'yageczmzfuuhlklctojc.supabase.co',
            port: 443,
            path: '/storage/v1/object/axis-patient-portal/' + storagePath,
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
                'Content-Type': 'application/octet-stream',
                'Content-Length': fileData.length,
                'x-upsert': 'true'
            }
        };
        
        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    writeLog('File uploaded to Supabase Storage: ' + storagePath);
                    resolve({ success: true, path: storagePath, url: SUPABASE_URL + '/storage/v1/object/public/axis-patient-portal/' + storagePath });
                } else {
                    writeLog('Storage upload failed: ' + res.statusCode + ' - ' + responseData, 'error');
                    reject(new Error('Storage upload failed: ' + res.statusCode));
                }
            });
        });
        
        req.on('error', (error) => {
            writeLog('Storage upload error: ' + error.message, 'error');
            reject(error);
        });
        
        req.write(fileData);
        req.end();
    });
}

// Forward metadata to Supabase Edge Function
async function forwardToSupabase(metadata, filePath, fileSize, storageUrl) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            metadata: metadata,
            filePath: filePath,
            fileSize: fileSize,
            storageUrl: storageUrl,
            source: 'modality_direct',
            server: '10.1.1.241',
            timestamp: new Date().toISOString()
        });
        
        const options = {
            hostname: 'yageczmzfuuhlklctojc.supabase.co',
            port: 443,
            path: '/functions/v1/api/modality/dicom',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
                'User-Agent': 'Axis-DICOM-Receiver/2.0'
            }
        };
        
        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    writeLog('Successfully forwarded to Supabase API: ' + res.statusCode);
                    resolve(responseData);
                } else {
                    writeLog('Supabase API error: ' + res.statusCode + ' - ' + responseData, 'error');
                    reject(new Error('Supabase API error: ' + res.statusCode));
                }
            });
        });
        
        req.on('error', (error) => {
            writeLog('Failed to forward to Supabase: ' + error.message, 'error');
            reject(error);
        });
        
        req.setTimeout(30000, () => {
            writeLog('Request to Supabase timed out', 'error');
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.write(data);
        req.end();
    });
}

// Enhanced DICOM Service Class Provider
class ProductionDICOMHandler {
    constructor(socket) {
        this.socket = socket;
        this.buffer = Buffer.alloc(0);
        this.state = 'WAITING_FOR_ASSOCIATION';
        this.clientAddress = socket.remoteAddress + ':' + socket.remotePort;
    }
    
    handleData(data) {
        this.buffer = Buffer.concat([this.buffer, data]);
        
        if (this.state === 'WAITING_FOR_ASSOCIATION' && this.buffer.length > 10) {
            if (this.buffer[0] === 0x01) { // A-ASSOCIATE-RQ
                writeLog('Received A-ASSOCIATE-RQ from ' + this.clientAddress);
                this.sendAssociationAccept();
                this.state = 'ASSOCIATED';
                this.buffer = Buffer.alloc(0);
            }
        } else if (this.state === 'ASSOCIATED' && this.buffer.length > 10) {
            if (this.buffer[0] === 0x04) { // P-DATA-TF (C-STORE)
                writeLog('Received P-DATA-TF (C-STORE request) from ' + this.clientAddress);
                this.handleCStore();
            } else if (this.buffer[0] === 0x05) { // A-RELEASE-RQ
                writeLog('Received A-RELEASE-RQ from ' + this.clientAddress);
                this.sendReleaseResponse();
                this.socket.end();
            }
        }
    }
    
    sendAssociationAccept() {
        // Send basic A-ASSOCIATE-AC response
        const response = Buffer.from([
            0x02, 0x00,                    // PDU Type: A-ASSOCIATE-AC
            0x00, 0x00, 0x00, 0x4E,        // PDU Length: 78 bytes
            0x00, 0x01,                    // Protocol Version
            0x00, 0x00,                    // Reserved
            // Called AE Title (16 bytes) - AXIS_PORTAL
            0x41, 0x58, 0x49, 0x53, 0x5F, 0x50, 0x4F, 0x52, 0x54, 0x41, 0x4C, 0x20, 0x20, 0x20, 0x20, 0x20,
            // Calling AE Title (16 bytes) - MODALITY
            0x4D, 0x4F, 0x44, 0x41, 0x4C, 0x49, 0x54, 0x59, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
            // Reserved (32 bytes)
            ...Buffer.alloc(32, 0)
        ]);
        
        this.socket.write(response);
        writeLog('Sent A-ASSOCIATE-AC (Association Accepted) to ' + this.clientAddress);
    }
    
    async handleCStore() {
        try {
            // Extract DICOM data from P-DATA-TF PDU
            const pduLength = this.buffer.readUInt32BE(2);
            const dicomData = this.buffer.slice(12); // Start after PDU header
            
            writeLog('Processing C-STORE with ' + dicomData.length + ' bytes of DICOM data from ' + this.clientAddress);
            
            // Parse DICOM metadata
            const metadata = parseDICOMMetadata(dicomData);
            
            // Generate filename with metadata
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = (metadata.patientId || 'UNKNOWN') + '_' + (metadata.modality || 'XX') + '_' + metadata.sopInstanceUID + '_' + timestamp + '.dcm';
            const filePath = path.join(STORAGE_PATH, filename);
            
            // Save DICOM file locally
            fs.writeFileSync(filePath, dicomData);
            writeLog('DICOM file saved locally: ' + filename + ' (' + dicomData.length + ' bytes)');
            
            let storageUrl = null;
            
            // Upload to Supabase Storage if service key is available
            if (SUPABASE_SERVICE_KEY) {
                try {
                    const uploadResult = await uploadToSupabaseStorage(filePath, filename, metadata);
                    storageUrl = uploadResult.url;
                    writeLog('DICOM file uploaded to cloud storage: ' + uploadResult.path);
                } catch (uploadError) {
                    writeLog('Cloud storage upload failed: ' + uploadError.message, 'warn');
                    // Continue even if upload fails - file is saved locally
                }
            }
            
            // Forward metadata to Supabase API
            if (SUPABASE_SERVICE_KEY) {
                try {
                    await forwardToSupabase(metadata, filePath, dicomData.length, storageUrl);
                    writeLog('Metadata successfully forwarded to Supabase patient portal');
                } catch (apiError) {
                    writeLog('Failed to forward to Supabase API: ' + apiError.message, 'warn');
                    // Continue even if API call fails - file is saved
                }
            }
            
            // Send successful C-STORE-RSP
            this.sendCStoreResponse(0x0000); // Success
            
            writeLog('C-STORE completed successfully for ' + this.clientAddress);
            
        } catch (error) {
            writeLog('Error handling C-STORE from ' + this.clientAddress + ': ' + error.message, 'error');
            this.sendCStoreResponse(0xC000); // General failure
        }
        
        this.buffer = Buffer.alloc(0);
    }
    
    sendCStoreResponse(status) {
        // Send basic C-STORE-RSP
        const response = Buffer.from([
            0x04, 0x00,                    // PDU Type: P-DATA-TF
            0x00, 0x00, 0x00, 0x20,        // PDU Length: 32 bytes
            // PDV Item
            0x00, 0x00, 0x00, 0x1C,        // Item Length: 28 bytes
            0x01,                          // Presentation Context ID
            0x03,                          // Message Control Header (Last Fragment)
            // Simple C-STORE-RSP Command Set
            0x00, 0x00, 0x00, 0x00,        // Group 0000, Element 0000 (Command Group Length)
            0x55, 0x4C,                    // VR: UL
            0x04, 0x00,                    // Length: 4
            0x00, 0x00, 0x00, 0x00,        // Value: 0
            // Status
            0x00, 0x00, 0x09, 0x00,        // Group 0000, Element 0900 (Status)
            0x55, 0x53,                    // VR: US
            0x02, 0x00,                    // Length: 2
            (status >> 8) & 0xFF, status & 0xFF // Status value
        ]);
        
        this.socket.write(response);
        
        const statusText = status === 0x0000 ? 'SUCCESS' : 'FAILURE (0x' + status.toString(16).toUpperCase() + ')';
        writeLog('Sent C-STORE-RSP: ' + statusText + ' to ' + this.clientAddress);
    }
    
    sendReleaseResponse() {
        const response = Buffer.from([
            0x06, 0x00,                    // PDU Type: A-RELEASE-RP
            0x00, 0x00, 0x00, 0x04,        // PDU Length: 4 bytes
            0x00, 0x00, 0x00, 0x00         // Reserved
        ]);
        
        this.socket.write(response);
        writeLog('Sent A-RELEASE-RP (Association Released) to ' + this.clientAddress);
    }
}

// Create Enhanced DICOM Server
const server = net.createServer((socket) => {
    const clientAddress = socket.remoteAddress + ':' + socket.remotePort;
    writeLog('New DICOM connection from ' + clientAddress);
    
    const handler = new ProductionDICOMHandler(socket);
    
    // Set socket timeout (5 minutes)
    socket.setTimeout(300000);
    
    socket.on('data', (data) => {
        handler.handleData(data);
    });
    
    socket.on('timeout', () => {
        writeLog('Socket timeout for ' + clientAddress, 'warn');
        socket.end();
    });
    
    socket.on('error', (error) => {
        if (error.code !== 'ECONNRESET') {
            writeLog('Socket error for ' + clientAddress + ': ' + error.message, 'error');
        }
    });
    
    socket.on('close', () => {
        writeLog('DICOM connection closed from ' + clientAddress);
    });
});

// Error handling for server
server.on('error', (error) => {
    writeLog('DICOM server error: ' + error.message, 'error');
    if (error.code === 'EADDRINUSE') {
        writeLog('Port ' + DICOM_PORT + ' is already in use', 'error');
        process.exit(1);
    }
});

// Start server
server.listen(DICOM_PORT, '0.0.0.0', () => {
    writeLog('Enhanced DICOM server listening on 0.0.0.0:' + DICOM_PORT);
    writeLog('Ready to receive DICOM images and forward to Supabase patient portal');
    writeLog('Local storage: ' + STORAGE_PATH);
    writeLog('Supabase integration: ' + (SUPABASE_SERVICE_KEY ? 'ENABLED' : 'DISABLED'));
    
    // Test Supabase connectivity on startup
    if (SUPABASE_SERVICE_KEY) {
        const testData = {
            metadata: { patientId: 'STARTUP_TEST', modality: 'TEST', studyInstanceUID: 'TEST_' + Date.now() },
            filePath: '/startup/test.dcm',
            fileSize: 0,
            source: 'startup_test',
            timestamp: new Date().toISOString()
        };
        
        forwardToSupabase(testData.metadata, testData.filePath, testData.fileSize, null)
            .then(() => writeLog('✅ Supabase connectivity test successful'))
            .catch((error) => writeLog('⚠️ Supabase connectivity test failed: ' + error.message, 'warn'));
    } else {
        writeLog('⚠️ SUPABASE_SERVICE_KEY not configured - cloud integration disabled', 'warn');
    }
});

// Graceful shutdown
function shutdown(signal) {
    writeLog('Received ' + signal + ', shutting down gracefully...');
    
    server.close(() => {
        writeLog('Enhanced DICOM server closed');
        process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
        writeLog('Forced shutdown', 'error');
        process.exit(1);
    }, 10000);
}

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    writeLog('Uncaught exception: ' + error.message, 'error');
    console.error(error);
});

process.on('unhandledRejection', (reason, promise) => {
    writeLog('Unhandled rejection at ' + promise + ': ' + reason, 'error');
    console.error(reason);
});