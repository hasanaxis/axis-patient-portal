#!/bin/bash

# Test script for Azure integration server
# Run this to verify HL7 and DICOM connectivity

echo "========================================"
echo "Axis Imaging Integration Test Script"
echo "Target Server: 10.1.1.241"
echo "========================================"

# Configuration
SERVER_IP="10.1.1.241"
HL7_PORT="2575"
DICOM_PORT="104"

# Test network connectivity
echo -e "\n1. Testing network connectivity..."
if ping -c 2 $SERVER_IP > /dev/null 2>&1; then
    echo "✅ Server is reachable"
else
    echo "❌ Cannot reach server at $SERVER_IP"
    exit 1
fi

# Test HL7 port
echo -e "\n2. Testing HL7 port ($HL7_PORT)..."
if nc -zv $SERVER_IP $HL7_PORT 2>&1 | grep -q "succeeded"; then
    echo "✅ HL7 port is open"
else
    echo "❌ HL7 port $HL7_PORT is not accessible"
fi

# Test DICOM port
echo -e "\n3. Testing DICOM port ($DICOM_PORT)..."
if nc -zv $SERVER_IP $DICOM_PORT 2>&1 | grep -q "succeeded"; then
    echo "✅ DICOM port is open"
else
    echo "❌ DICOM port $DICOM_PORT is not accessible"
fi

# Send test HL7 message
echo -e "\n4. Sending test HL7 message..."
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
MESSAGE="MSH|^~\\&|TEST|CLINIC|AXIS_PORTAL|PORTAL|$TIMESTAMP||ADT^A08|TEST001|P|2.5
PID|||TEST123||TEST^PATIENT^A||19800101|M|||123 TEST ST^^MELBOURNE^VIC^3000^AU||(03)98765432"

# Send with MLLP wrapper
echo -e "\x0b$MESSAGE\x1c\x0d" | nc -w 5 $SERVER_IP $HL7_PORT > /tmp/hl7_response.txt 2>&1

if [ -s /tmp/hl7_response.txt ]; then
    echo "✅ HL7 message sent and response received:"
    cat /tmp/hl7_response.txt | od -c | head -n 5
else
    echo "⚠️ No response received (server might not be running)"
fi

# Test HTTP health endpoint
echo -e "\n5. Testing HTTP health endpoint..."
if curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP/health | grep -q "200"; then
    echo "✅ HTTP health endpoint is responding"
else
    echo "❌ HTTP health endpoint is not responding"
fi

# Test Supabase connectivity
echo -e "\n6. Testing Supabase API connectivity..."
if curl -s https://yageczmzfuuhlklctojc.supabase.co/functions/v1/api/health | grep -q "ok"; then
    echo "✅ Supabase API is accessible"
else
    echo "❌ Cannot reach Supabase API"
fi

echo -e "\n========================================"
echo "Integration Test Complete"
echo "========================================"
echo ""
echo "Next Steps:"
echo "1. SSH into server: ssh azureuser@$SERVER_IP"
echo "2. Check service status: sudo systemctl status axis-hl7 axis-dicom"
echo "3. View logs: sudo journalctl -u axis-hl7 -f"
echo "4. Configure Voyager RIS to send to $SERVER_IP:$HL7_PORT"
echo "5. Configure modalities to send DICOM to $SERVER_IP:$DICOM_PORT"