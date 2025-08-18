# Axis Imaging Integration Test Script for Windows
# Run as Administrator

param(
    [string]$ServerIP = "10.1.1.241",
    [switch]$SendTestMessages
)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Axis Imaging Integration Test - Windows" -ForegroundColor Cyan
Write-Host "Target Server: $ServerIP" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Test results array
$testResults = @()

# Function to test port connectivity
function Test-Port {
    param(
        [string]$ComputerName,
        [int]$Port,
        [int]$Timeout = 3000
    )
    
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connect = $tcpClient.BeginConnect($ComputerName, $Port, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne($Timeout, $false)
        
        if ($wait) {
            $tcpClient.EndConnect($connect)
            $tcpClient.Close()
            return $true
        } else {
            $tcpClient.Close()
            return $false
        }
    } catch {
        return $false
    }
}

# 1. Test Network Connectivity
Write-Host "`n1. Testing network connectivity..." -ForegroundColor Yellow
$ping = Test-Connection -ComputerName $ServerIP -Count 2 -Quiet
if ($ping) {
    Write-Host "   ✓ Server is reachable" -ForegroundColor Green
    $testResults += @{Test="Network Connectivity"; Result="PASS"}
} else {
    Write-Host "   ✗ Cannot reach server at $ServerIP" -ForegroundColor Red
    $testResults += @{Test="Network Connectivity"; Result="FAIL"}
}

# 2. Test HL7 Port (2575)
Write-Host "`n2. Testing HL7 port (2575)..." -ForegroundColor Yellow
if (Test-Port -ComputerName $ServerIP -Port 2575) {
    Write-Host "   ✓ HL7 port is open" -ForegroundColor Green
    $testResults += @{Test="HL7 Port 2575"; Result="PASS"}
} else {
    Write-Host "   ✗ HL7 port 2575 is not accessible" -ForegroundColor Red
    $testResults += @{Test="HL7 Port 2575"; Result="FAIL"}
}

# 3. Test DICOM Port (104)
Write-Host "`n3. Testing DICOM port (104)..." -ForegroundColor Yellow
if (Test-Port -ComputerName $ServerIP -Port 104) {
    Write-Host "   ✓ DICOM port is open" -ForegroundColor Green
    $testResults += @{Test="DICOM Port 104"; Result="PASS"}
} else {
    Write-Host "   ✗ DICOM port 104 is not accessible" -ForegroundColor Red
    $testResults += @{Test="DICOM Port 104"; Result="FAIL"}
}

# 4. Test Windows Services (if local)
if ($ServerIP -eq "localhost" -or $ServerIP -eq "127.0.0.1") {
    Write-Host "`n4. Testing Windows Services..." -ForegroundColor Yellow
    
    # Test HL7 Service
    $hl7Service = Get-Service -Name "AxisHL7" -ErrorAction SilentlyContinue
    if ($hl7Service) {
        if ($hl7Service.Status -eq "Running") {
            Write-Host "   ✓ HL7 Service is running" -ForegroundColor Green
            $testResults += @{Test="HL7 Service"; Result="PASS"}
        } else {
            Write-Host "   ✗ HL7 Service is not running (Status: $($hl7Service.Status))" -ForegroundColor Red
            $testResults += @{Test="HL7 Service"; Result="FAIL"}
        }
    } else {
        Write-Host "   ✗ HL7 Service not found" -ForegroundColor Red
        $testResults += @{Test="HL7 Service"; Result="NOT FOUND"}
    }
    
    # Test DICOM Service
    $dicomService = Get-Service -Name "AxisDICOM" -ErrorAction SilentlyContinue
    if ($dicomService) {
        if ($dicomService.Status -eq "Running") {
            Write-Host "   ✓ DICOM Service is running" -ForegroundColor Green
            $testResults += @{Test="DICOM Service"; Result="PASS"}
        } else {
            Write-Host "   ✗ DICOM Service is not running (Status: $($dicomService.Status))" -ForegroundColor Red
            $testResults += @{Test="DICOM Service"; Result="FAIL"}
        }
    } else {
        Write-Host "   ✗ DICOM Service not found" -ForegroundColor Red
        $testResults += @{Test="DICOM Service"; Result="NOT FOUND"}
    }
}

# 5. Test HTTP Health Endpoint
Write-Host "`n5. Testing HTTP health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://$ServerIP/health" -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✓ HTTP health endpoint is responding" -ForegroundColor Green
        $testResults += @{Test="HTTP Health"; Result="PASS"}
    }
} catch {
    Write-Host "   ✗ HTTP health endpoint is not responding" -ForegroundColor Red
    $testResults += @{Test="HTTP Health"; Result="FAIL"}
}

# 6. Test Supabase API
Write-Host "`n6. Testing Supabase API connectivity..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://yageczmzfuuhlklctojc.supabase.co/functions/v1/api/health" -TimeoutSec 5 -ErrorAction Stop
    $content = $response.Content | ConvertFrom-Json
    if ($content.status -eq "ok") {
        Write-Host "   ✓ Supabase API is accessible" -ForegroundColor Green
        $testResults += @{Test="Supabase API"; Result="PASS"}
    } else {
        Write-Host "   ✗ Supabase API returned unexpected response" -ForegroundColor Red
        $testResults += @{Test="Supabase API"; Result="FAIL"}
    }
} catch {
    Write-Host "   ✗ Cannot reach Supabase API" -ForegroundColor Red
    $testResults += @{Test="Supabase API"; Result="FAIL"}
}

# 7. Send Test HL7 Message (if requested)
if ($SendTestMessages) {
    Write-Host "`n7. Sending test HL7 message..." -ForegroundColor Yellow
    
    $timestamp = Get-Date -Format "yyyyMMddHHmmss"
    $messageId = "TEST" + (Get-Random -Maximum 999999).ToString("000000")
    
    $hl7Message = @"
MSH|^~\&|TESTAPP|TESTFACILITY|AXIS_PORTAL|AXIS_IMAGING|$timestamp||ADT^A08|$messageId|P|2.5
PID|||TEST123||DOE^JOHN^A||19800101|M|||123 TEST ST^^MELBOURNE^VIC^3000^AU||(03)98765432
PV1||I|ICU^001^01||||||||||||||||
"@
    
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.Connect($ServerIP, 2575)
        $stream = $tcpClient.GetStream()
        
        # Add MLLP wrapper
        $message = [char]0x0B + $hl7Message + [char]0x1C + [char]0x0D
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($message)
        
        $stream.Write($bytes, 0, $bytes.Length)
        
        # Read response
        Start-Sleep -Milliseconds 500
        if ($stream.DataAvailable) {
            $buffer = New-Object byte[] 1024
            $read = $stream.Read($buffer, 0, 1024)
            $response = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $read)
            
            if ($response -match "MSA\|AA") {
                Write-Host "   ✓ HL7 message sent and ACK received" -ForegroundColor Green
                $testResults += @{Test="HL7 Message"; Result="PASS"}
            } else {
                Write-Host "   ⚠ HL7 message sent but unexpected response" -ForegroundColor Yellow
                $testResults += @{Test="HL7 Message"; Result="PARTIAL"}
            }
        } else {
            Write-Host "   ⚠ HL7 message sent but no response" -ForegroundColor Yellow
            $testResults += @{Test="HL7 Message"; Result="NO RESPONSE"}
        }
        
        $stream.Close()
        $tcpClient.Close()
        
    } catch {
        Write-Host "   ✗ Failed to send HL7 message: $_" -ForegroundColor Red
        $testResults += @{Test="HL7 Message"; Result="FAIL"}
    }
}

# Display Summary
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

$passCount = ($testResults | Where-Object {$_.Result -eq "PASS"}).Count
$failCount = ($testResults | Where-Object {$_.Result -eq "FAIL"}).Count
$totalCount = $testResults.Count

Write-Host "`nResults: $passCount/$totalCount tests passed" -ForegroundColor $(if ($failCount -eq 0) {"Green"} else {"Yellow"})

$testResults | ForEach-Object {
    $color = switch ($_.Result) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        "PARTIAL" { "Yellow" }
        default { "Gray" }
    }
    Write-Host ("  {0,-25} {1}" -f $_.Test, $_.Result) -ForegroundColor $color
}

# Recommendations
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "Recommendations" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

if ($ServerIP -eq "localhost" -or $ServerIP -eq "127.0.0.1") {
    Write-Host "`nLocal Installation:" -ForegroundColor Yellow
    Write-Host "  1. Check service logs: C:\AxisImaging\logs\"
    Write-Host "  2. Verify environment config: C:\AxisImaging\.env"
    Write-Host "  3. Ensure Supabase key is configured"
    
    if ($hl7Service.Status -ne "Running" -or $dicomService.Status -ne "Running") {
        Write-Host "`n  To start services:" -ForegroundColor Yellow
        Write-Host "    Start-Service AxisHL7, AxisDICOM"
    }
} else {
    Write-Host "`nRemote Server:" -ForegroundColor Yellow
    Write-Host "  1. Ensure firewall rules allow connections"
    Write-Host "  2. Verify services are running on remote server"
    Write-Host "  3. Check network routing between sites"
}

Write-Host "`nVoyager RIS Configuration:" -ForegroundColor Yellow
Write-Host "  Host: $ServerIP"
Write-Host "  Port: 2575"
Write-Host "  Protocol: HL7 v2.5 over TCP/MLLP"

Write-Host "`nModality Configuration:" -ForegroundColor Yellow
Write-Host "  AE Title: AXIS_PORTAL"
Write-Host "  Host: $ServerIP"
Write-Host "  Port: 104"
Write-Host "  Transfer Syntax: Explicit VR Little Endian"

# Export results
$resultsFile = "integration-test-results-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$testResults | ConvertTo-Json | Out-File $resultsFile
Write-Host "`nTest results saved to: $resultsFile" -ForegroundColor Gray