# Test Enhanced DICOM Receiver
# This script tests the enhanced DICOM functionality

param(
    [string]$ServerIP = "10.1.1.241"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Enhanced DICOM Receiver" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Check if enhanced DICOM receiver exists
Write-Host "`n1. Checking enhanced DICOM receiver..." -ForegroundColor Yellow

if (Test-Path "C:\AxisImaging\dicom-receiver-enhanced.js") {
    Write-Host "✅ Enhanced DICOM receiver found" -ForegroundColor Green
    $fileSize = (Get-Item "C:\AxisImaging\dicom-receiver-enhanced.js").Length
    Write-Host "   File size: $fileSize bytes" -ForegroundColor Gray
} else {
    Write-Host "❌ Enhanced DICOM receiver not found" -ForegroundColor Red
    Write-Host "   Run Deploy-Enhanced-DICOM.ps1 first" -ForegroundColor Yellow
    exit 1
}

# 2. Check service status
Write-Host "`n2. Checking service status..." -ForegroundColor Yellow
$services = Get-Service AxisHL7, AxisDICOM -ErrorAction SilentlyContinue

if ($services) {
    $services | ForEach-Object {
        $status = $_.Status
        $color = if ($status -eq "Running") { "Green" } else { "Red" }
        Write-Host "   $($_.Name): $status" -ForegroundColor $color
    }
} else {
    Write-Host "❌ Services not found" -ForegroundColor Red
}

# 3. Test port connectivity
Write-Host "`n3. Testing port connectivity..." -ForegroundColor Yellow

$hl7Test = Test-NetConnection -ComputerName $ServerIP -Port 2575 -InformationLevel Quiet -WarningAction SilentlyContinue
$dicomTest = Test-NetConnection -ComputerName $ServerIP -Port 104 -InformationLevel Quiet -WarningAction SilentlyContinue

Write-Host "   HL7 Port 2575: $(if($hl7Test){'✅ Open'}else{'❌ Closed'})" -ForegroundColor $(if($hl7Test){'Green'}else{'Red'})
Write-Host "   DICOM Port 104: $(if($dicomTest){'✅ Open'}else{'❌ Closed'})" -ForegroundColor $(if($dicomTest){'Green'}else{'Red'})

# 4. Check recent logs
Write-Host "`n4. Checking recent logs..." -ForegroundColor Yellow

$logFiles = Get-ChildItem "C:\AxisImaging\logs\*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending

if ($logFiles) {
    Write-Host "   Found $($logFiles.Count) log files" -ForegroundColor Green
    
    $recentLog = $logFiles[0]
    Write-Host "   Most recent: $($recentLog.Name) ($(Get-Date $recentLog.LastWriteTime -Format 'yyyy-MM-dd HH:mm'))" -ForegroundColor Gray
    
    # Show last few log entries
    $lastEntries = Get-Content $recentLog.FullName -Tail 3 -ErrorAction SilentlyContinue
    if ($lastEntries) {
        Write-Host "   Recent entries:" -ForegroundColor Gray
        $lastEntries | ForEach-Object { Write-Host "     $_" -ForegroundColor DarkGray }
    }
} else {
    Write-Host "   No log files found" -ForegroundColor Yellow
}

# 5. Check DICOM storage directory
Write-Host "`n5. Checking DICOM storage..." -ForegroundColor Yellow

$storageDir = "C:\AxisImaging\dicom-storage"
if (Test-Path $storageDir) {
    $dicomFiles = Get-ChildItem $storageDir -Filter "*.dcm" -ErrorAction SilentlyContinue
    Write-Host "   Storage directory exists" -ForegroundColor Green
    Write-Host "   DICOM files stored: $($dicomFiles.Count)" -ForegroundColor Gray
    
    if ($dicomFiles.Count -gt 0) {
        $recentDicom = $dicomFiles | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        Write-Host "   Most recent: $($recentDicom.Name) ($(Get-Date $recentDicom.LastWriteTime -Format 'yyyy-MM-dd HH:mm'))" -ForegroundColor Gray
    }
} else {
    Write-Host "   Storage directory not found" -ForegroundColor Yellow
}

# 6. Test Supabase connectivity
Write-Host "`n6. Testing Supabase connectivity..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "https://yageczmzfuuhlklctojc.supabase.co/functions/v1/api/health" -TimeoutSec 5
    if ($response.status -eq "healthy") {
        Write-Host "   ✅ Supabase API reachable" -ForegroundColor Green
        Write-Host "   Server: $($response.server)" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️ Supabase API responded but status: $($response.status)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Cannot reach Supabase API: $($_.Exception.Message)" -ForegroundColor Red
}

# 7. Send test DICOM connection
Write-Host "`n7. Testing DICOM connection..." -ForegroundColor Yellow

try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.Connect($ServerIP, 104)
    
    if ($tcpClient.Connected) {
        Write-Host "   ✅ Successfully connected to DICOM port" -ForegroundColor Green
        
        # Send a simple test byte
        $stream = $tcpClient.GetStream()
        $testBytes = [byte[]](0x01, 0x02, 0x03, 0x04)
        $stream.Write($testBytes, 0, $testBytes.Length)
        
        Write-Host "   ✅ Test data sent successfully" -ForegroundColor Green
        
        $stream.Close()
        $tcpClient.Close()
    } else {
        Write-Host "   ❌ Failed to connect to DICOM port" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ DICOM connection test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 8. Environment configuration check
Write-Host "`n8. Checking environment configuration..." -ForegroundColor Yellow

if (Test-Path "C:\AxisImaging\.env") {
    $envContent = Get-Content "C:\AxisImaging\.env" -ErrorAction SilentlyContinue
    Write-Host "   ✅ Environment file exists" -ForegroundColor Green
    
    $hasSupabaseKey = $envContent | Where-Object { $_ -match "SUPABASE_SERVICE_KEY=" -and $_ -notmatch "SUPABASE_SERVICE_KEY=$" }
    if ($hasSupabaseKey) {
        Write-Host "   ✅ Supabase service key configured" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ Supabase service key not configured" -ForegroundColor Yellow
        Write-Host "     Add SUPABASE_SERVICE_KEY to enable cloud sync" -ForegroundColor Gray
    }
} else {
    Write-Host "   ⚠️ Environment file not found" -ForegroundColor Yellow
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$overallStatus = "✅ READY"
$issues = @()

if (-not $hl7Test) { $issues += "HL7 port not accessible"; $overallStatus = "⚠️ PARTIAL" }
if (-not $dicomTest) { $issues += "DICOM port not accessible"; $overallStatus = "❌ NOT READY" }

Write-Host "`nOverall Status: $overallStatus" -ForegroundColor $(if($overallStatus.StartsWith("✅")){"Green"}elseif($overallStatus.StartsWith("⚠️")){"Yellow"}else{"Red"})

if ($issues.Count -gt 0) {
    Write-Host "`nIssues found:" -ForegroundColor Yellow
    $issues | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "  1. Configure modalities to send DICOM to $ServerIP`:104"
Write-Host "  2. Configure Voyager RIS to send HL7 to $ServerIP`:2575" 
Write-Host "  3. Monitor logs: Get-Content 'C:\AxisImaging\logs\*.log' -Tail 10 -Wait"
Write-Host "  4. Check stored files: Get-ChildItem 'C:\AxisImaging\dicom-storage\'"
Write-Host "  5. View patient portal: https://happy-river-0cbbe5100.1.azurestaticapps.net"

Write-Host "`n========================================" -ForegroundColor Cyan