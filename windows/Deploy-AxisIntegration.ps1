# Axis Imaging Integration Server - Windows Deployment Script
# Run as Administrator
# Server IP: 10.1.1.241

param(
    [string]$ServerIP = "10.1.1.241",
    [string]$InstallPath = "C:\AxisImaging",
    [string]$SupabaseURL = "https://yageczmzfuuhlklctojc.supabase.co",
    [string]$SupabaseKey = ""
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Axis Imaging Integration Server Setup" -ForegroundColor Cyan
Write-Host "Windows Server: $ServerIP" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "This script must be run as Administrator. Exiting..." -ForegroundColor Red
    exit 1
}

# Create installation directory
Write-Host "`n1. Creating installation directory..." -ForegroundColor Yellow
if (!(Test-Path $InstallPath)) {
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
}

# Install Node.js if not present
Write-Host "`n2. Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js is installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Installing Node.js..." -ForegroundColor Yellow
    
    # Download Node.js installer
    $nodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
    $nodeInstaller = "$env:TEMP\node-installer.msi"
    
    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller
    Start-Process msiexec.exe -Wait -ArgumentList "/i $nodeInstaller /quiet"
    
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    Write-Host "Node.js installed successfully" -ForegroundColor Green
}

# Install Git if not present
Write-Host "`n3. Checking Git installation..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host "Git is installed: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "Installing Git..." -ForegroundColor Yellow
    
    # Download Git installer
    $gitUrl = "https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe"
    $gitInstaller = "$env:TEMP\git-installer.exe"
    
    Invoke-WebRequest -Uri $gitUrl -OutFile $gitInstaller
    Start-Process $gitInstaller -Wait -ArgumentList "/SILENT"
    
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    Write-Host "Git installed successfully" -ForegroundColor Green
}

# Copy application files
Write-Host "`n4. Copying application files..." -ForegroundColor Yellow
$sourceFiles = @(
    "src\hl7-server-production.js",
    "src\dicom-receiver.js",
    "package.json"
)

foreach ($file in $sourceFiles) {
    $sourcePath = Join-Path $PSScriptRoot "..\$file"
    $destPath = Join-Path $InstallPath (Split-Path $file -Leaf)
    
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath $destPath -Force
        Write-Host "Copied: $file" -ForegroundColor Gray
    }
}

# Create package.json if not exists
if (!(Test-Path "$InstallPath\package.json")) {
    $packageJson = @{
        name = "axis-imaging-integration"
        version = "1.0.0"
        description = "Axis Imaging Integration Server"
        main = "hl7-server-production.js"
        scripts = @{
            "start-hl7" = "node hl7-server-production.js"
            "start-dicom" = "node dicom-receiver.js"
        }
        dependencies = @{
            "express" = "^4.18.2"
        }
    } | ConvertTo-Json -Depth 3
    
    Set-Content -Path "$InstallPath\package.json" -Value $packageJson
}

# Install npm dependencies
Write-Host "`n5. Installing Node.js dependencies..." -ForegroundColor Yellow
Set-Location $InstallPath
npm install

# Create environment configuration
Write-Host "`n6. Creating environment configuration..." -ForegroundColor Yellow
$envContent = @"
HL7_PORT=2575
DICOM_PORT=104
SUPABASE_URL=$SupabaseURL
SUPABASE_SERVICE_KEY=$SupabaseKey
SERVER_IP=$ServerIP
"@

Set-Content -Path "$InstallPath\.env" -Value $envContent

# Configure Windows Firewall
Write-Host "`n7. Configuring Windows Firewall..." -ForegroundColor Yellow

# HL7 Port
New-NetFirewallRule -DisplayName "Axis HL7 Listener" `
    -Direction Inbound -Protocol TCP -LocalPort 2575 `
    -Action Allow -Profile Any -ErrorAction SilentlyContinue

# DICOM Port  
New-NetFirewallRule -DisplayName "Axis DICOM Receiver" `
    -Direction Inbound -Protocol TCP -LocalPort 104 `
    -Action Allow -Profile Any -ErrorAction SilentlyContinue

# HTTP/HTTPS
New-NetFirewallRule -DisplayName "Axis HTTP" `
    -Direction Inbound -Protocol TCP -LocalPort 80 `
    -Action Allow -Profile Any -ErrorAction SilentlyContinue

New-NetFirewallRule -DisplayName "Axis HTTPS" `
    -Direction Inbound -Protocol TCP -LocalPort 443 `
    -Action Allow -Profile Any -ErrorAction SilentlyContinue

Write-Host "Firewall rules configured" -ForegroundColor Green

# Install NSSM (Non-Sucking Service Manager)
Write-Host "`n8. Installing NSSM for Windows Services..." -ForegroundColor Yellow
$nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
$nssmZip = "$env:TEMP\nssm.zip"
$nssmPath = "$InstallPath\nssm"

Invoke-WebRequest -Uri $nssmUrl -OutFile $nssmZip
Expand-Archive -Path $nssmZip -DestinationPath $nssmPath -Force
$nssm = "$nssmPath\nssm-2.24\win64\nssm.exe"

# Create Windows Services
Write-Host "`n9. Creating Windows Services..." -ForegroundColor Yellow

# HL7 Service
& $nssm install "AxisHL7" "C:\Program Files\nodejs\node.exe"
& $nssm set "AxisHL7" AppDirectory $InstallPath
& $nssm set "AxisHL7" AppParameters "hl7-server-production.js"
& $nssm set "AxisHL7" AppEnvironmentExtra "HL7_PORT=2575" "SUPABASE_URL=$SupabaseURL" "SUPABASE_SERVICE_KEY=$SupabaseKey"
& $nssm set "AxisHL7" DisplayName "Axis Imaging HL7 Listener"
& $nssm set "AxisHL7" Description "Receives HL7 messages from Voyager RIS"
& $nssm set "AxisHL7" Start SERVICE_AUTO_START
& $nssm set "AxisHL7" AppStdout "$InstallPath\logs\hl7-output.log"
& $nssm set "AxisHL7" AppStderr "$InstallPath\logs\hl7-error.log"

# DICOM Service
& $nssm install "AxisDICOM" "C:\Program Files\nodejs\node.exe"
& $nssm set "AxisDICOM" AppDirectory $InstallPath
& $nssm set "AxisDICOM" AppParameters "dicom-receiver.js"
& $nssm set "AxisDICOM" AppEnvironmentExtra "DICOM_PORT=104" "SUPABASE_URL=$SupabaseURL" "SUPABASE_SERVICE_KEY=$SupabaseKey"
& $nssm set "AxisDICOM" DisplayName "Axis Imaging DICOM Receiver"
& $nssm set "AxisDICOM" Description "Receives DICOM images from modalities"
& $nssm set "AxisDICOM" Start SERVICE_AUTO_START
& $nssm set "AxisDICOM" AppStdout "$InstallPath\logs\dicom-output.log"
& $nssm set "AxisDICOM" AppStderr "$InstallPath\logs\dicom-error.log"

# Create logs directory
New-Item -ItemType Directory -Path "$InstallPath\logs" -Force | Out-Null
New-Item -ItemType Directory -Path "$InstallPath\dicom-storage" -Force | Out-Null

Write-Host "Windows Services created" -ForegroundColor Green

# Install IIS if needed
Write-Host "`n10. Checking IIS installation..." -ForegroundColor Yellow
$iisFeature = Get-WindowsFeature -Name Web-Server
if ($iisFeature.InstallState -ne "Installed") {
    Write-Host "Installing IIS..." -ForegroundColor Yellow
    Install-WindowsFeature -Name Web-Server -IncludeManagementTools
    Install-WindowsFeature -Name Web-WebSockets
    Install-WindowsFeature -Name Web-App-Dev
}

# Configure IIS URL Rewrite and ARR
Write-Host "`n11. Installing IIS URL Rewrite and ARR..." -ForegroundColor Yellow

# Download and install URL Rewrite
$urlRewriteUrl = "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi"
$urlRewriteMsi = "$env:TEMP\urlrewrite.msi"
Invoke-WebRequest -Uri $urlRewriteUrl -OutFile $urlRewriteMsi
Start-Process msiexec.exe -Wait -ArgumentList "/i $urlRewriteMsi /quiet"

# Download and install ARR
$arrUrl = "https://download.microsoft.com/download/E/9/8/E9849D6A-020E-47E4-9FD0-A023E99B54EB/requestRouter_amd64.msi"
$arrMsi = "$env:TEMP\arr.msi"
Invoke-WebRequest -Uri $arrUrl -OutFile $arrMsi
Start-Process msiexec.exe -Wait -ArgumentList "/i $arrMsi /quiet"

# Start services
Write-Host "`n12. Starting services..." -ForegroundColor Yellow
Start-Service "AxisHL7" -ErrorAction SilentlyContinue
Start-Service "AxisDICOM" -ErrorAction SilentlyContinue

# Check service status
Write-Host "`n13. Checking service status..." -ForegroundColor Yellow
$hl7Status = Get-Service "AxisHL7" -ErrorAction SilentlyContinue
$dicomStatus = Get-Service "AxisDICOM" -ErrorAction SilentlyContinue

if ($hl7Status.Status -eq "Running") {
    Write-Host "HL7 Service: Running" -ForegroundColor Green
} else {
    Write-Host "HL7 Service: Not Running" -ForegroundColor Red
}

if ($dicomStatus.Status -eq "Running") {
    Write-Host "DICOM Service: Running" -ForegroundColor Green
} else {
    Write-Host "DICOM Service: Not Running" -ForegroundColor Red
}

# Display summary
Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services:" -ForegroundColor Yellow
Write-Host "  HL7 Listener: $ServerIP`:2575"
Write-Host "  DICOM Receiver: $ServerIP`:104"
Write-Host ""
Write-Host "Installation Path: $InstallPath" -ForegroundColor Yellow
Write-Host ""
Write-Host "To view logs:" -ForegroundColor Yellow
Write-Host "  HL7: Get-Content '$InstallPath\logs\hl7-output.log' -Tail 50"
Write-Host "  DICOM: Get-Content '$InstallPath\logs\dicom-output.log' -Tail 50"
Write-Host ""
Write-Host "To manage services:" -ForegroundColor Yellow
Write-Host "  Start: Start-Service AxisHL7, AxisDICOM"
Write-Host "  Stop: Stop-Service AxisHL7, AxisDICOM"
Write-Host "  Restart: Restart-Service AxisHL7, AxisDICOM"
Write-Host ""
Write-Host "IMPORTANT: Set your Supabase Service Key!" -ForegroundColor Red
Write-Host "  Edit: $InstallPath\.env"
Write-Host "  Add your SUPABASE_SERVICE_KEY value"
Write-Host "  Then restart services"