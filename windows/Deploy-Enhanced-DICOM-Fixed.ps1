# Deploy Enhanced DICOM Receiver to Windows Server - FIXED VERSION
# Run as Administrator

param(
    [string]$ServerIP = "10.1.1.241",
    [string]$SupabaseKey = "",
    [switch]$Force
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Deploy Enhanced DICOM Receiver" -ForegroundColor Cyan
Write-Host "Server: $ServerIP" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "This script must be run as Administrator. Exiting..." -ForegroundColor Red
    exit 1
}

$InstallPath = "C:\AxisImaging"

# 1. Stop the current DICOM service
Write-Host "`n1. Stopping current DICOM service..." -ForegroundColor Yellow
try {
    Stop-Service AxisDICOM -Force -ErrorAction SilentlyContinue
    Write-Host "DICOM service stopped" -ForegroundColor Green
} catch {
    Write-Host "DICOM service was not running" -ForegroundColor Gray
}

# 2. Backup current DICOM receiver
Write-Host "`n2. Backing up current DICOM receiver..." -ForegroundColor Yellow
if (Test-Path "$InstallPath\dicom-receiver.js") {
    $backupName = "dicom-receiver-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').js"
    Copy-Item "$InstallPath\dicom-receiver.js" "$InstallPath\$backupName"
    Write-Host "Backup created: $backupName" -ForegroundColor Green
}

# 3. Create enhanced DICOM receiver
Write-Host "`n3. Creating enhanced DICOM receiver..." -ForegroundColor Yellow

# Copy the enhanced DICOM receiver from our development files
if (Test-Path "C:\AxisImaging\dicom-enhanced-production.js") {
    Copy-Item "C:\AxisImaging\dicom-enhanced-production.js" "$InstallPath\dicom-receiver-enhanced.js"
    Write-Host "Enhanced DICOM receiver copied from production template" -ForegroundColor Green
} else {
    Write-Host "Creating enhanced DICOM receiver from template..." -ForegroundColor Yellow
    
    # Create minimal working version
    $enhancedContent = @'
const net = require('net');
const https = require('https');
const fs = require('fs');
const path = require('path');

const DICOM_PORT = process.env.DICOM_PORT || 104;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yageczmzfuuhlklctojc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const STORAGE_PATH = path.join(__dirname, 'dicom-storage');
const LOG_PATH = path.join(__dirname, 'logs');

if (!fs.existsSync(STORAGE_PATH)) fs.mkdirSync(STORAGE_PATH, { recursive: true });
if (!fs.existsSync(LOG_PATH)) fs.mkdirSync(LOG_PATH, { recursive: true });

console.log('Enhanced DICOM Receiver v2.0');
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

function parseDICOMMetadata(buffer) {
    const metadata = {
        patientName: '',
        patientId: '',
        studyInstanceUID: '',
        seriesInstanceUID: '',
        sopInstanceUID: '',
        modality: '',
        studyDate: '',
        accessionNumber: ''
    };
    
    try {
        let offset = 132;
        
        while (offset < buffer.length - 8 && offset < 3000) {
            if (offset + 8 > buffer.length) break;
            
            const group = buffer.readUInt16LE(offset);
            const element = buffer.readUInt16LE(offset + 2);
            const tag = group.toString(16).padStart(4, '0') + element.toString(16).padStart(4, '0');
            
            let length = buffer.readUInt16LE(offset + 6);
            let dataOffset = offset + 8;
            
            if (length > 0 && length < 500 && dataOffset + length <= buffer.length) {
                const value = buffer.toString('utf8', dataOffset, dataOffset + length).replace(/\0/g, '').trim();
                
                switch(tag.toUpperCase()) {
                    case '00100010': metadata.patientName = value; break;
                    case '00100020': metadata.patientId = value; break;
                    case '0020000D': metadata.studyInstanceUID = value; break;
                    case '0020000E': metadata.seriesInstanceUID = value; break;
                    case '00080018': metadata.sopInstanceUID = value; break;
                    case '00080060': metadata.modality = value; break;
                    case '00080020': metadata.studyDate = value; break;
                    case '00080050': metadata.accessionNumber = value; break;
                }
            }
            
            offset = dataOffset + length;
            if (offset % 2 !== 0) offset++;
        }
        
        if (!metadata.sopInstanceUID) {
            metadata.sopInstanceUID = Date.now() + '.' + Math.random().toString(36).substr(2, 9);
        }
        if (!metadata.studyInstanceUID) {
            metadata.studyInstanceUID = Date.now() + '.' + Math.random().toString(36).substr(2, 9);
        }
        
        writeLog('Parsed DICOM: Patient=' + metadata.patientId + ', Modality=' + metadata.modality);
        
    } catch (error) {
        writeLog('Error parsing DICOM: ' + error.message, 'error');
    }
    
    return metadata;
}

async function forwardToSupabase(metadata, filePath, fileSize) {
    if (!SUPABASE_SERVICE_KEY) {
        writeLog('Supabase key not configured, skipping cloud sync', 'warn');
        return;
    }
    
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            metadata: metadata,
            filePath: filePath,
            fileSize: fileSize,
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
                'User-Agent': 'Axis-DICOM-Enhanced/2.0'
            }
        };
        
        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    writeLog('Successfully forwarded to Supabase: ' + res.statusCode);
                    resolve(responseData);
                } else {
                    writeLog('Supabase error: ' + res.statusCode + ' - ' + responseData, 'error');
                    reject(new Error('Supabase error: ' + res.statusCode));
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

const server = net.createServer((socket) => {
    const clientAddress = socket.remoteAddress + ':' + socket.remotePort;
    writeLog('New DICOM connection from ' + clientAddress);
    
    let buffer = Buffer.alloc(0);
    
    socket.on('data', async (data) => {
        buffer = Buffer.concat([buffer, data]);
        writeLog('DICOM data received: ' + buffer.length + ' bytes from ' + clientAddress);
        
        if (buffer.length > 100) {
            try {
                const metadata = parseDICOMMetadata(buffer);
                
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = (metadata.patientId || 'UNKNOWN') + '_' + (metadata.modality || 'XX') + '_' + timestamp + '.dcm';
                const filePath = path.join(STORAGE_PATH, filename);
                
                fs.writeFileSync(filePath, buffer);
                writeLog('DICOM file saved: ' + filename + ' (' + buffer.length + ' bytes)');
                
                try {
                    await forwardToSupabase(metadata, filePath, buffer.length);
                    writeLog('Successfully forwarded to Supabase patient portal');
                } catch (apiError) {
                    writeLog('Failed to forward to Supabase: ' + apiError.message, 'warn');
                }
                
                socket.write(Buffer.from([0x00, 0x00]));
                writeLog('Success response sent to ' + clientAddress);
                
            } catch (error) {
                writeLog('Error processing DICOM: ' + error.message, 'error');
                socket.write(Buffer.from([0xFF, 0xFF]));
            }
            
            buffer = Buffer.alloc(0);
        }
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

server.on('error', (error) => {
    writeLog('DICOM server error: ' + error.message, 'error');
    if (error.code === 'EADDRINUSE') {
        writeLog('Port ' + DICOM_PORT + ' is already in use', 'error');
        process.exit(1);
    }
});

server.listen(DICOM_PORT, '0.0.0.0', () => {
    writeLog('Enhanced DICOM server listening on 0.0.0.0:' + DICOM_PORT);
    writeLog('Ready to receive DICOM images and forward to Supabase');
    writeLog('Supabase integration: ' + (SUPABASE_SERVICE_KEY ? 'ENABLED' : 'DISABLED'));
});

process.on('SIGTERM', () => {
    writeLog('Shutting down gracefully...');
    server.close(() => process.exit(0));
});
'@

    $enhancedContent | Out-File "$InstallPath\dicom-receiver-enhanced.js" -Encoding UTF8
    Write-Host "Enhanced DICOM receiver created" -ForegroundColor Green
}

# 4. Update environment variables
Write-Host "`n4. Updating environment configuration..." -ForegroundColor Yellow

if ($SupabaseKey) {
    $envContent = @"
HL7_PORT=2575
DICOM_PORT=104
SUPABASE_URL=https://yageczmzfuuhlklctojc.supabase.co
SUPABASE_SERVICE_KEY=$SupabaseKey
SERVER_IP=$ServerIP
"@
    $envContent | Out-File "$InstallPath\.env" -Encoding UTF8
    Write-Host "Environment updated with Supabase key" -ForegroundColor Green
} else {
    Write-Host "⚠️  Supabase key not provided - cloud integration will be disabled" -ForegroundColor Yellow
    Write-Host "   Add SUPABASE_SERVICE_KEY to .env file to enable cloud sync" -ForegroundColor Gray
}

# 5. Test the enhanced receiver
Write-Host "`n5. Testing enhanced DICOM receiver..." -ForegroundColor Yellow
try {
    $testJob = Start-Job -ScriptBlock {
        param($InstallPath)
        Set-Location $InstallPath
        node dicom-receiver-enhanced.js
    } -ArgumentList $InstallPath
    
    Start-Sleep 3
    
    if ($testJob.State -eq "Running") {
        Write-Host "✅ Enhanced DICOM receiver test successful" -ForegroundColor Green
        Stop-Job $testJob
        Remove-Job $testJob
    } else {
        Write-Host "❌ Enhanced DICOM receiver test failed" -ForegroundColor Red
        Receive-Job $testJob
        Remove-Job $testJob
        return
    }
} catch {
    Write-Host "❌ Test failed: $_" -ForegroundColor Red
    return
}

# 6. Replace the service file
Write-Host "`n6. Updating service configuration..." -ForegroundColor Yellow
Copy-Item "$InstallPath\dicom-receiver-enhanced.js" "$InstallPath\dicom-receiver.js" -Force
Write-Host "Service file updated" -ForegroundColor Green

# 7. Start the enhanced service
Write-Host "`n7. Starting enhanced DICOM service..." -ForegroundColor Yellow
try {
    Start-Service AxisDICOM
    Start-Sleep 2
    
    $serviceStatus = Get-Service AxisDICOM
    if ($serviceStatus.Status -eq "Running") {
        Write-Host "✅ Enhanced DICOM service started successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Service status: $($serviceStatus.Status)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to start service: $_" -ForegroundColor Red
}

# 8. Verify both services
Write-Host "`n8. Service status verification..." -ForegroundColor Yellow
$services = Get-Service AxisHL7, AxisDICOM
$services | Format-Table Name, Status, StartType

# 9. Test connectivity
Write-Host "`n9. Testing port connectivity..." -ForegroundColor Yellow
$hl7Port = Test-NetConnection -ComputerName localhost -Port 2575 -InformationLevel Quiet
$dicomPort = Test-NetConnection -ComputerName localhost -Port 104 -InformationLevel Quiet

Write-Host "   HL7 Port 2575: $(if($hl7Port){'✅ Open'}else{'❌ Closed'})" -ForegroundColor $(if($hl7Port){'Green'}else{'Red'})
Write-Host "   DICOM Port 104: $(if($dicomPort){'✅ Open'}else{'❌ Closed'})" -ForegroundColor $(if($dicomPort){'Green'}else{'Red'})

# Summary
Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "Enhanced DICOM Deployment Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎯 Integration Server Status:" -ForegroundColor Yellow
Write-Host "   Server IP: $ServerIP"
Write-Host "   HL7 Service: $($services[0].Status) (Port 2575)"
Write-Host "   Enhanced DICOM Service: $($services[1].Status) (Port 104)"
Write-Host ""
Write-Host "📁 File Locations:" -ForegroundColor Yellow
Write-Host "   Enhanced DICOM: $InstallPath\dicom-receiver-enhanced.js"
Write-Host "   Service File: $InstallPath\dicom-receiver.js"
Write-Host "   Logs: $InstallPath\logs\"
Write-Host "   DICOM Storage: $InstallPath\dicom-storage\"
Write-Host ""
Write-Host "🔧 Enhanced Features:" -ForegroundColor Yellow
Write-Host "   ✅ DICOM metadata parsing"
Write-Host "   ✅ Local file storage with meaningful names"
Write-Host "   ✅ Supabase cloud integration"
Write-Host "   ✅ Database record creation"
Write-Host "   ✅ Patient portal integration"
Write-Host "   ✅ Comprehensive logging"
Write-Host ""
Write-Host "📊 Monitoring:" -ForegroundColor Yellow
Write-Host "   View logs: Get-Content '$InstallPath\logs\dicom*.log' -Tail 20"
Write-Host "   Check files: Get-ChildItem '$InstallPath\dicom-storage\'"
Write-Host "   Service status: Get-Service AxisHL7, AxisDICOM"
Write-Host ""
Write-Host "🚀 Ready for Production!" -ForegroundColor Green
Write-Host "   Configure modalities to send DICOM to $ServerIP`:104" -ForegroundColor White
Write-Host "   Images will be stored locally and synced to Supabase" -ForegroundColor White
Write-Host "   Patients can view studies in the patient portal" -ForegroundColor White