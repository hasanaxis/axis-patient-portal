# Axis Imaging Integration Setup Guide

## Azure Server Configuration
**Server IP:** 10.1.1.241  
**Location:** Azure (Australia East Region)  
**Purpose:** Integration gateway between modalities, Voyager RIS, and patient portal

## Network Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Modalities     │ DICOM   │  Azure Server    │  HTTPS  │  Supabase       │
│  (CT/XR/US)     │-------->│  10.1.1.241      │-------->│  Edge Functions │
└─────────────────┘  :104   │                  │         └─────────────────┘
                             │  - HL7 Listener  │
┌─────────────────┐  HL7    │  - DICOM Receiver│         ┌─────────────────┐
│  Voyager RIS    │-------->│  - Webhook Relay │-------->│  Patient Portal │
└─────────────────┘  :2575  └──────────────────┘         └─────────────────┘
```

## 1. Azure Server Setup

### SSH into your Azure server:
```bash
ssh azureuser@10.1.1.241
```

### Run the deployment script:
```bash
# Upload the deployment script
scp deploy-azure-integration.sh azureuser@10.1.1.241:/home/azureuser/

# SSH into server and run
ssh azureuser@10.1.1.241
chmod +x deploy-azure-integration.sh
sudo ./deploy-azure-integration.sh
```

### Set environment variables:
```bash
# Edit the systemd service files
sudo nano /etc/systemd/system/axis-hl7.service
# Add your Supabase service key:
Environment="SUPABASE_SERVICE_KEY=your_actual_service_key_here"

sudo nano /etc/systemd/system/axis-dicom.service  
# Add your Supabase service key:
Environment="SUPABASE_SERVICE_KEY=your_actual_service_key_here"

# Restart services
sudo systemctl daemon-reload
sudo systemctl restart axis-hl7 axis-dicom
```

## 2. Voyager RIS Configuration

Configure Voyager RIS to send HL7 messages to your Azure server:

### HL7 Interface Settings:
- **Host:** 10.1.1.241
- **Port:** 2575
- **Protocol:** TCP/IP
- **Message Types:** ORM^O01, ORU^R01, ADT^A08
- **Encoding:** UTF-8
- **Message Wrapper:** MLLP (Minimal Lower Layer Protocol)

### Message Triggers:
1. **New Order (ORM^O01):** When exam is scheduled
2. **Report Ready (ORU^R01):** When radiologist signs report
3. **Patient Update (ADT^A08):** When patient info changes

### Sample HL7 Configuration in Voyager:
```
Interface Name: AXIS_PORTAL
Interface Type: HL7 v2.5
Connection Type: TCP Client
Remote Host: 10.1.1.241
Remote Port: 2575
Local Facility: AXIS_IMAGING
Remote Facility: AXIS_PORTAL
Send ACK: Yes
Retry Attempts: 3
Timeout: 30 seconds
```

## 3. Modality Configuration

Configure each modality (CT, X-ray, Ultrasound) to send DICOM images:

### DICOM C-STORE SCP Settings:
- **AE Title:** AXIS_PORTAL
- **Host:** 10.1.1.241
- **Port:** 104
- **Transfer Syntax:** 
  - Implicit VR Little Endian
  - Explicit VR Little Endian
  - JPEG Baseline
  - JPEG Lossless

### Example Modality Configuration:

#### CT Scanner:
```
Destination AE: AXIS_PORTAL
IP Address: 10.1.1.241
Port: 104
Transfer Syntax: Explicit VR Little Endian
Compression: None
Auto-send: After Study Complete
```

#### X-Ray System:
```
DICOM Node: AXIS_PORTAL
Network Address: 10.1.1.241
Port Number: 104
Called AE Title: AXIS_PORTAL
Calling AE Title: XRAY_01
Auto Route: Enabled
```

#### Ultrasound:
```
Remote System: AXIS Patient Portal
AE Title: AXIS_PORTAL
IP: 10.1.1.241
Port: 104
Study Forward: Automatic
Include Reports: Yes
```

## 4. Firewall Configuration

Ensure Azure Network Security Group allows:

```bash
# Azure CLI commands
az network nsg rule create \
  --resource-group axis-imaging-rg \
  --nsg-name axis-nsg \
  --name AllowHL7 \
  --priority 100 \
  --source-address-prefixes "*" \
  --destination-port-ranges 2575 \
  --protocol Tcp \
  --access Allow

az network nsg rule create \
  --resource-group axis-imaging-rg \
  --nsg-name axis-nsg \
  --name AllowDICOM \
  --priority 101 \
  --source-address-prefixes "*" \
  --destination-port-ranges 104 \
  --protocol Tcp \
  --access Allow
```

## 5. Testing

### Test HL7 Connection:
```bash
# From Voyager RIS server
telnet 10.1.1.241 2575

# Send test HL7 message
echo -e "\x0bMSH|^~\\&|VOYAGER|RIS|AXIS_PORTAL|PORTAL|20250117120000||ADT^A08|123456|P|2.5\rPID|||12345||DOE^JOHN^A||19800101|M|||123 MAIN ST^^MELBOURNE^VIC^3000^AU||(03)98765432\r\x1c\x0d" | nc 10.1.1.241 2575
```

### Test DICOM Connection:
```bash
# Using dcm4che tools
dcmsend -c AXIS_PORTAL@10.1.1.241:104 test.dcm

# Or using DCMTK
storescu 10.1.1.241 104 test.dcm
```

### Monitor Logs:
```bash
# On Azure server
sudo journalctl -u axis-hl7 -f
sudo journalctl -u axis-dicom -f
sudo journalctl -u nginx -f
```

## 6. Troubleshooting

### Check Service Status:
```bash
sudo systemctl status axis-hl7
sudo systemctl status axis-dicom
sudo netstat -tlnp | grep -E "2575|104"
```

### Test Connectivity:
```bash
# From modality or RIS
ping 10.1.1.241
telnet 10.1.1.241 2575
telnet 10.1.1.241 104
```

### View Logs:
```bash
# HL7 logs
sudo tail -f /var/log/syslog | grep axis-hl7

# DICOM logs  
sudo tail -f /var/log/syslog | grep axis-dicom

# Check stored DICOM files
ls -la /opt/axis-imaging/dicom-storage/
```

### Restart Services:
```bash
sudo systemctl restart axis-hl7
sudo systemctl restart axis-dicom
sudo systemctl restart nginx
```

## 7. Security Considerations

1. **Network Security:**
   - Restrict source IPs in NSG rules to only allow Voyager RIS and modalities
   - Use VPN or private endpoints for production

2. **Authentication:**
   - Implement DICOM AE title validation
   - Add HL7 message authentication

3. **Encryption:**
   - Consider TLS for HL7 (MLLP over TLS)
   - Implement DICOM TLS

4. **Audit Logging:**
   - All messages are logged with timestamps
   - Failed connections are tracked
   - Implement log retention policy

## 8. Monitoring

### Health Checks:
```bash
# Check if services are running
curl http://10.1.1.241/health

# Check Supabase connection
curl https://yageczmzfuuhlklctojc.supabase.co/functions/v1/api/health
```

### Set up Azure Monitor:
```bash
# Install Azure Monitor agent
wget https://aka.ms/AADLoginForLinux -O aadsshlogin.deb
sudo dpkg -i aadsshlogin.deb

# Configure metrics
az monitor metrics alert create \
  --name axis-hl7-down \
  --resource-group axis-imaging-rg \
  --scopes /subscriptions/{subscription-id}/resourceGroups/axis-imaging-rg/providers/Microsoft.Compute/virtualMachines/axis-integration \
  --condition "avg Percentage CPU > 90" \
  --description "Alert when CPU usage is over 90%"
```

## Support

For issues or questions:
- **Technical Support:** support@axisimaging.com.au
- **Portal Documentation:** https://docs.axisimaging.com.au
- **Emergency:** Call Axis Imaging IT on-call