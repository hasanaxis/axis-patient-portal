# Windows Server Integration Setup Guide

## Prerequisites

- Windows Server 2016/2019/2022 or Windows 10/11 Pro
- Administrator access
- PowerShell 5.1 or higher
- Internet connection for downloading components

## Quick Setup

### 1. Download Files

Download the deployment package to your Windows server:
- Copy the entire `windows` folder to `C:\temp\`
- Or download directly from your repository

### 2. Run PowerShell as Administrator

```powershell
# Open PowerShell as Administrator
# Navigate to the deployment folder
cd C:\temp\windows

# Allow script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

### 3. Run Deployment Script

```powershell
# Basic installation
.\Deploy-AxisIntegration.ps1 -ServerIP "10.1.1.241"

# With Supabase key
.\Deploy-AxisIntegration.ps1 -ServerIP "10.1.1.241" -SupabaseKey "your-service-key-here"

# Custom installation path
.\Deploy-AxisIntegration.ps1 -InstallPath "D:\AxisImaging" -ServerIP "10.1.1.241"
```

## Manual Setup Steps

### 1. Install Node.js

```powershell
# Download and install Node.js
$nodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
Invoke-WebRequest -Uri $nodeUrl -OutFile "$env:TEMP\node.msi"
Start-Process msiexec.exe -Wait -ArgumentList "/i $env:TEMP\node.msi /quiet"
```

### 2. Create Installation Directory

```powershell
# Create directory structure
New-Item -ItemType Directory -Path "C:\AxisImaging" -Force
New-Item -ItemType Directory -Path "C:\AxisImaging\logs" -Force
New-Item -ItemType Directory -Path "C:\AxisImaging\dicom-storage" -Force
```

### 3. Copy Application Files

```powershell
# Copy the service files
Copy-Item "hl7-service-windows.js" "C:\AxisImaging\"
Copy-Item "dicom-receiver.js" "C:\AxisImaging\"

# Create package.json
@'
{
  "name": "axis-imaging-integration",
  "version": "1.0.0",
  "dependencies": {
    "dotenv": "^16.0.3",
    "node-windows": "^1.0.0-beta.8"
  }
}
'@ | Out-File "C:\AxisImaging\package.json" -Encoding UTF8

# Install dependencies
cd C:\AxisImaging
npm install
```

### 4. Configure Environment

Create `.env` file in `C:\AxisImaging\`:

```ini
HL7_PORT=2575
DICOM_PORT=104
SERVER_IP=10.1.1.241
SUPABASE_URL=https://yageczmzfuuhlklctojc.supabase.co
SUPABASE_SERVICE_KEY=your-actual-service-key-here
```

### 5. Configure Windows Firewall

```powershell
# Allow HL7 port
New-NetFirewallRule -DisplayName "Axis HL7 Listener" `
    -Direction Inbound -Protocol TCP -LocalPort 2575 `
    -Action Allow -Profile Any

# Allow DICOM port
New-NetFirewallRule -DisplayName "Axis DICOM Receiver" `
    -Direction Inbound -Protocol TCP -LocalPort 104 `
    -Action Allow -Profile Any

# Allow HTTP/HTTPS
New-NetFirewallRule -DisplayName "HTTP" `
    -Direction Inbound -Protocol TCP -LocalPort 80 `
    -Action Allow -Profile Any

New-NetFirewallRule -DisplayName "HTTPS" `
    -Direction Inbound -Protocol TCP -LocalPort 443 `
    -Action Allow -Profile Any
```

### 6. Install Windows Services

Using NSSM (Non-Sucking Service Manager):

```powershell
# Download NSSM
Invoke-WebRequest -Uri "https://nssm.cc/release/nssm-2.24.zip" -OutFile "$env:TEMP\nssm.zip"
Expand-Archive -Path "$env:TEMP\nssm.zip" -DestinationPath "C:\AxisImaging\nssm"

# Install HL7 Service
C:\AxisImaging\nssm\nssm-2.24\win64\nssm.exe install AxisHL7 "C:\Program Files\nodejs\node.exe"
C:\AxisImaging\nssm\nssm-2.24\win64\nssm.exe set AxisHL7 AppDirectory "C:\AxisImaging"
C:\AxisImaging\nssm\nssm-2.24\win64\nssm.exe set AxisHL7 AppParameters "hl7-service-windows.js"
C:\AxisImaging\nssm\nssm-2.24\win64\nssm.exe set AxisHL7 DisplayName "Axis Imaging HL7 Listener"
C:\AxisImaging\nssm\nssm-2.24\win64\nssm.exe set AxisHL7 Start SERVICE_AUTO_START

# Install DICOM Service
C:\AxisImaging\nssm\nssm-2.24\win64\nssm.exe install AxisDICOM "C:\Program Files\nodejs\node.exe"
C:\AxisImaging\nssm\nssm-2.24\win64\nssm.exe set AxisDICOM AppDirectory "C:\AxisImaging"
C:\AxisImaging\nssm\nssm-2.24\win64\nssm.exe set AxisDICOM AppParameters "dicom-receiver.js"
C:\AxisImaging\nssm\nssm-2.24\win64\nssm.exe set AxisDICOM DisplayName "Axis Imaging DICOM Receiver"
C:\AxisImaging\nssm\nssm-2.24\win64\nssm.exe set AxisDICOM Start SERVICE_AUTO_START
```

### 7. Start Services

```powershell
# Start services
Start-Service AxisHL7
Start-Service AxisDICOM

# Check status
Get-Service AxisHL7, AxisDICOM | Format-Table Name, Status, StartType
```

## Testing the Installation

### Run Test Script

```powershell
# Basic connectivity test
.\Test-Integration.ps1 -ServerIP "10.1.1.241"

# Test with HL7 message sending
.\Test-Integration.ps1 -ServerIP "10.1.1.241" -SendTestMessages

# Test local installation
.\Test-Integration.ps1 -ServerIP "localhost" -SendTestMessages
```

### Manual Testing

#### Test HL7 Connection:
```powershell
# Test port connectivity
Test-NetConnection -ComputerName 10.1.1.241 -Port 2575

# Send test HL7 message using PowerShell
$client = New-Object System.Net.Sockets.TcpClient
$client.Connect("10.1.1.241", 2575)
$stream = $client.GetStream()
$message = [char]0x0B + "MSH|^~\&|TEST||AXIS||20240101120000||ADT^A08|123|P|2.5" + [char]0x1C + [char]0x0D
$bytes = [System.Text.Encoding]::UTF8.GetBytes($message)
$stream.Write($bytes, 0, $bytes.Length)
$client.Close()
```

#### Test DICOM Connection:
```powershell
# Test port connectivity
Test-NetConnection -ComputerName 10.1.1.241 -Port 104

# Use DCMTK tools if available
# storescu 10.1.1.241 104 test.dcm
```

## Service Management

### View Service Status
```powershell
Get-Service AxisHL7, AxisDICOM
```

### Start/Stop Services
```powershell
# Start services
Start-Service AxisHL7
Start-Service AxisDICOM

# Stop services
Stop-Service AxisHL7
Stop-Service AxisDICOM

# Restart services
Restart-Service AxisHL7
Restart-Service AxisDICOM
```

### View Logs
```powershell
# View recent HL7 logs
Get-Content "C:\AxisImaging\logs\hl7-output.log" -Tail 50

# View recent DICOM logs
Get-Content "C:\AxisImaging\logs\dicom-output.log" -Tail 50

# Monitor logs in real-time
Get-Content "C:\AxisImaging\logs\hl7-output.log" -Wait
```

### Windows Event Viewer
```powershell
# View Windows Event logs
Get-EventLog -LogName Application -Source "Axis HL7 Service" -Newest 20
Get-EventLog -LogName Application -Source "Axis DICOM Service" -Newest 20
```

## Voyager RIS Configuration

Configure Voyager RIS with these settings:

```
Interface Name: AXIS_PATIENT_PORTAL
Connection Type: TCP/IP Client
Remote Host: 10.1.1.241
Remote Port: 2575
Protocol: HL7 v2.5
Message Format: MLLP
Character Set: UTF-8
Timeout: 30 seconds
Retry Attempts: 3
```

### Message Types to Send:
- `ADT^A08` - Patient update
- `ORM^O01` - New order
- `ORU^R01` - Result ready

## Modality Configuration

Configure imaging modalities with these settings:

### DICOM Store SCP:
```
AE Title: AXIS_PORTAL
IP Address: 10.1.1.241
Port: 104
Transfer Syntax: Explicit VR Little Endian
Max PDU Size: 16384
Connection Timeout: 30
```

### Example Configurations:

#### GE CT Scanner:
```
Node Name: AXIS_PORTAL
AE Title: AXIS_PORTAL
IP: 10.1.1.241
Port: 104
Auto-routing: Enabled
Send on Study Complete: Yes
```

#### Philips Ultrasound:
```
Export Destination: AXIS_PORTAL
Network Address: 10.1.1.241:104
Protocol: DICOM
Auto Export: On
Include Reports: Yes
```

## Troubleshooting

### Service Won't Start

1. Check if ports are already in use:
```powershell
netstat -ano | findstr :2575
netstat -ano | findstr :104
```

2. Check service logs:
```powershell
Get-Content "C:\AxisImaging\logs\hl7-error.log" -Tail 20
Get-Content "C:\AxisImaging\logs\dicom-error.log" -Tail 20
```

3. Verify Node.js installation:
```powershell
node --version
npm --version
```

4. Check environment configuration:
```powershell
Get-Content "C:\AxisImaging\.env"
```

### Connection Issues

1. Test Windows Firewall:
```powershell
# Temporarily disable firewall (for testing only!)
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False

# Re-enable after testing
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
```

2. Check if services are listening:
```powershell
netstat -an | findstr LISTENING
```

3. Test from remote machine:
```powershell
Test-NetConnection -ComputerName 10.1.1.241 -Port 2575
Test-NetConnection -ComputerName 10.1.1.241 -Port 104
```

### Performance Issues

1. Check system resources:
```powershell
Get-Process | Where-Object {$_.ProcessName -like "node*"} | Format-Table Name, CPU, WS
```

2. Check disk space:
```powershell
Get-PSDrive C | Select-Object Used,Free
```

3. Review message volume:
```powershell
(Get-ChildItem "C:\AxisImaging\logs\messages\*.hl7").Count
```

## Security Considerations

### 1. Service Account
Create a dedicated service account instead of using SYSTEM:
```powershell
# Create local user
New-LocalUser -Name "AxisService" -Password (ConvertTo-SecureString "ComplexPassword123!" -AsPlainText -Force)
Add-LocalGroupMember -Group "Users" -Member "AxisService"

# Grant permissions
icacls "C:\AxisImaging" /grant "AxisService:(OI)(CI)F" /T

# Configure service to use account
C:\AxisImaging\nssm\nssm-2.24\win64\nssm.exe set AxisHL7 ObjectName ".\AxisService" "ComplexPassword123!"
```

### 2. Network Security
- Restrict source IPs in firewall rules
- Use IPSec or VPN for production
- Consider TLS for HL7 and DICOM

### 3. Audit Logging
Enable Windows audit logging:
```powershell
auditpol /set /subcategory:"Logon" /success:enable /failure:enable
auditpol /set /subcategory:"Object Access" /success:enable /failure:enable
```

## Maintenance

### Daily Tasks
- Check service status
- Review error logs
- Monitor disk space

### Weekly Tasks
- Archive old messages
- Review performance metrics
- Check for failed messages

### Monthly Tasks
- Windows updates
- Security patches
- Performance tuning
- Log rotation

### Log Rotation Script
```powershell
# Archive logs older than 30 days
$archivePath = "C:\AxisImaging\logs\archive"
New-Item -ItemType Directory -Path $archivePath -Force

Get-ChildItem "C:\AxisImaging\logs\*.log" | 
    Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-30)} |
    Move-Item -Destination $archivePath

# Compress archived logs
Compress-Archive -Path "$archivePath\*.log" -DestinationPath "$archivePath\logs_$(Get-Date -Format 'yyyyMM').zip"
Remove-Item "$archivePath\*.log"
```

## Support

For issues or questions:
- Check logs in `C:\AxisImaging\logs\`
- Run diagnostic script: `.\Test-Integration.ps1`
- Contact: support@axisimaging.com.au