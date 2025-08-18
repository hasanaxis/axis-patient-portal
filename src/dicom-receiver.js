const net = require('net');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const DICOM_PORT = process.env.DICOM_PORT || 104;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yageczmzfuuhlklctojc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const STORAGE_PATH = '/opt/axis-imaging/dicom-storage';

console.log('Starting Axis Imaging DICOM Receiver');
console.log(`Server IP: 10.1.1.241`);
console.log(`DICOM Port: ${DICOM_PORT}`);
console.log(`Supabase URL: ${SUPABASE_URL}`);

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_PATH)) {
    fs.mkdirSync(STORAGE_PATH, { recursive: true });
}

// DICOM Transfer Syntax UIDs
const TRANSFER_SYNTAXES = {
    IMPLICIT_VR: '1.2.840.10008.1.2',
    EXPLICIT_VR_LITTLE: '1.2.840.10008.1.2.1',
    EXPLICIT_VR_BIG: '1.2.840.10008.1.2.2',
    JPEG_BASELINE: '1.2.840.10008.1.2.4.50',
    JPEG_LOSSLESS: '1.2.840.10008.1.2.4.70'
};

// Parse DICOM metadata (simplified)
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
        accessionNumber: ''
    };
    
    try {
        // This is a simplified parser - in production, use a proper DICOM library
        const dataView = new DataView(buffer.buffer);
        
        // Skip DICOM header (128 bytes + DICM signature)
        let offset = 132;
        
        // Parse data elements (simplified)
        while (offset < buffer.length - 8) {
            const group = dataView.getUint16(offset, true);
            const element = dataView.getUint16(offset + 2, true);
            const vr = String.fromCharCode(buffer[offset + 4], buffer[offset + 5]);
            let length = 0;
            let dataOffset = offset + 8;
            
            // Get length based on VR
            if (['OB', 'OW', 'OF', 'SQ', 'UN', 'UT'].includes(vr)) {
                dataOffset = offset + 12;
                length = dataView.getUint32(offset + 8, true);
            } else {
                length = dataView.getUint16(offset + 6, true);
            }
            
            // Extract specific tags
            const tag = `${group.toString(16).padStart(4, '0')}${element.toString(16).padStart(4, '0')}`.toUpperCase();
            
            switch(tag) {
                case '00100010': // Patient Name
                    metadata.patientName = buffer.toString('utf8', dataOffset, dataOffset + length).trim();
                    break;
                case '00100020': // Patient ID
                    metadata.patientId = buffer.toString('utf8', dataOffset, dataOffset + length).trim();
                    break;
                case '0020000D': // Study Instance UID
                    metadata.studyInstanceUID = buffer.toString('utf8', dataOffset, dataOffset + length).trim();
                    break;
                case '0020000E': // Series Instance UID
                    metadata.seriesInstanceUID = buffer.toString('utf8', dataOffset, dataOffset + length).trim();
                    break;
                case '00080018': // SOP Instance UID
                    metadata.sopInstanceUID = buffer.toString('utf8', dataOffset, dataOffset + length).trim();
                    break;
                case '00080060': // Modality
                    metadata.modality = buffer.toString('utf8', dataOffset, dataOffset + length).trim();
                    break;
                case '00080020': // Study Date
                    metadata.studyDate = buffer.toString('utf8', dataOffset, dataOffset + length).trim();
                    break;
                case '00080030': // Study Time
                    metadata.studyTime = buffer.toString('utf8', dataOffset, dataOffset + length).trim();
                    break;
                case '00080050': // Accession Number
                    metadata.accessionNumber = buffer.toString('utf8', dataOffset, dataOffset + length).trim();
                    break;
            }
            
            offset = dataOffset + length;
            if (offset % 2 !== 0) offset++; // Ensure even alignment
        }
    } catch (error) {
        console.error('Error parsing DICOM metadata:', error);
    }
    
    return metadata;
}

// Forward DICOM metadata to Supabase
async function forwardToSupabase(metadata, filePath) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            metadata: metadata,
            filePath: filePath,
            source: 'modality_direct',
            timestamp: new Date().toISOString()
        });
        
        const options = {
            hostname: SUPABASE_URL.replace('https://', ''),
            port: 443,
            path: '/functions/v1/api/modality/dicom',
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

// Handle DICOM C-STORE
class DICOMHandler {
    constructor(socket) {
        this.socket = socket;
        this.buffer = Buffer.alloc(0);
        this.state = 'WAITING_FOR_ASSOCIATION';
    }
    
    handleData(data) {
        this.buffer = Buffer.concat([this.buffer, data]);
        
        // Simple C-STORE handler (simplified for production use)
        if (this.state === 'WAITING_FOR_ASSOCIATION' && this.buffer.length > 10) {
            // Check for A-ASSOCIATE-RQ PDU (type 0x01)
            if (this.buffer[0] === 0x01) {
                console.log('Received A-ASSOCIATE-RQ');
                this.sendAssociationAccept();
                this.state = 'ASSOCIATED';
                this.buffer = Buffer.alloc(0);
            }
        } else if (this.state === 'ASSOCIATED' && this.buffer.length > 10) {
            // Check for P-DATA-TF PDU (type 0x04)
            if (this.buffer[0] === 0x04) {
                console.log('Received P-DATA-TF (C-STORE)');
                this.handleCStore();
            }
            // Check for A-RELEASE-RQ PDU (type 0x05)
            else if (this.buffer[0] === 0x05) {
                console.log('Received A-RELEASE-RQ');
                this.sendReleaseResponse();
                this.socket.end();
            }
        }
    }
    
    sendAssociationAccept() {
        // Simplified A-ASSOCIATE-AC PDU
        const response = Buffer.from([
            0x02, // PDU Type: A-ASSOCIATE-AC
            0x00, // Reserved
            0x00, 0x00, 0x00, 0x4e, // PDU Length
            0x00, 0x01, // Protocol Version
            0x00, 0x00, // Reserved
            // Called AE Title (16 bytes)
            0x41, 0x58, 0x49, 0x53, 0x5f, 0x50, 0x4f, 0x52, 0x54, 0x41, 0x4c, 0x20, 0x20, 0x20, 0x20, 0x20,
            // Calling AE Title (16 bytes)
            0x4d, 0x4f, 0x44, 0x41, 0x4c, 0x49, 0x54, 0x59, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
            // Reserved (32 bytes)
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
        ]);
        
        this.socket.write(response);
        console.log('Sent A-ASSOCIATE-AC');
    }
    
    async handleCStore() {
        try {
            // Extract DICOM data from P-DATA-TF PDU
            const pduLength = this.buffer.readUInt32BE(2);
            const dicomData = this.buffer.slice(12, 12 + pduLength - 6);
            
            // Parse metadata
            const metadata = parseDICOMMetadata(dicomData);
            console.log('DICOM Metadata:', metadata);
            
            // Save DICOM file
            const filename = `${metadata.sopInstanceUID || Date.now()}.dcm`;
            const filePath = path.join(STORAGE_PATH, filename);
            fs.writeFileSync(filePath, dicomData);
            console.log(`Saved DICOM file: ${filePath}`);
            
            // Forward to Supabase
            await forwardToSupabase(metadata, filePath);
            console.log('Metadata forwarded to Supabase');
            
            // Send C-STORE-RSP (success)
            this.sendCStoreResponse(0x0000);
            
        } catch (error) {
            console.error('Error handling C-STORE:', error);
            // Send C-STORE-RSP (failure)
            this.sendCStoreResponse(0xC000);
        }
        
        this.buffer = Buffer.alloc(0);
    }
    
    sendCStoreResponse(status) {
        // Simplified C-STORE-RSP
        const response = Buffer.from([
            0x04, // PDU Type: P-DATA-TF
            0x00, // Reserved
            0x00, 0x00, 0x00, 0x20, // PDU Length
            // PDV Item
            0x00, 0x00, 0x00, 0x1c, // Item Length
            0x01, // Presentation Context ID
            0x03, // Message Control Header (Last Fragment)
            // C-STORE-RSP Command
            0x00, 0x00, // Group 0000
            0x00, 0x00, // Element 0000
            0x55, 0x4c, // VR: UL
            0x04, 0x00, // Length: 4
            0x00, 0x00, 0x00, 0x00, // Value: 0
            // Status
            0x00, 0x00, // Group 0000
            0x09, 0x00, // Element 0900
            0x55, 0x53, // VR: US
            0x02, 0x00, // Length: 2
            (status >> 8) & 0xFF, status & 0xFF // Status value
        ]);
        
        this.socket.write(response);
        console.log(`Sent C-STORE-RSP (status: 0x${status.toString(16).padStart(4, '0')})`);
    }
    
    sendReleaseResponse() {
        const response = Buffer.from([
            0x06, // PDU Type: A-RELEASE-RP
            0x00, // Reserved
            0x00, 0x00, 0x00, 0x04, // PDU Length
            0x00, 0x00, 0x00, 0x00 // Reserved
        ]);
        
        this.socket.write(response);
        console.log('Sent A-RELEASE-RP');
    }
}

// Create DICOM Server
const server = net.createServer((socket) => {
    console.log(`New DICOM connection from ${socket.remoteAddress}:${socket.remotePort}`);
    
    const handler = new DICOMHandler(socket);
    
    socket.on('data', (data) => {
        handler.handleData(data);
    });
    
    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
    
    socket.on('close', () => {
        console.log('DICOM connection closed');
    });
});

// Start server
server.listen(DICOM_PORT, '0.0.0.0', () => {
    console.log(`DICOM server listening on 0.0.0.0:${DICOM_PORT}`);
    console.log('Ready to receive DICOM images from modalities');
    console.log(`Storage path: ${STORAGE_PATH}`);
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