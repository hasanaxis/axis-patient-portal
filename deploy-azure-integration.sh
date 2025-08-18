#!/bin/bash

# Axis Imaging Patient Portal - Azure Integration Server Setup
# Server IP: 10.1.1.241
# Purpose: Handle HL7 messages from Voyager RIS and DICOM images from modalities

set -e

echo "========================================="
echo "Axis Imaging Integration Server Setup"
echo "Server: 10.1.1.241"
echo "========================================="

# Configuration
SERVER_IP="10.1.1.241"
HL7_PORT="2575"
DICOM_PORT="104"
SUPABASE_URL="https://yageczmzfuuhlklctojc.supabase.co"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

# Install required packages
echo "Installing required packages..."
sudo apt-get update
sudo apt-get install -y nodejs npm git nginx certbot python3-certbot-nginx

# Clone the repository if not exists
if [ ! -d "/opt/axis-imaging" ]; then
    echo "Cloning repository..."
    sudo git clone https://github.com/axis-imaging/patient-portal.git /opt/axis-imaging
fi

cd /opt/axis-imaging

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Create HL7 listener service
echo "Creating HL7 listener service..."
sudo tee /etc/systemd/system/axis-hl7.service > /dev/null <<EOF
[Unit]
Description=Axis Imaging HL7 Listener
After=network.target

[Service]
Type=simple
User=azureuser
WorkingDirectory=/opt/axis-imaging
Environment="NODE_ENV=production"
Environment="HL7_PORT=${HL7_PORT}"
Environment="SUPABASE_URL=${SUPABASE_URL}"
Environment="SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}"
ExecStart=/usr/bin/node src/hl7-server-production.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create DICOM receiver service
echo "Creating DICOM receiver service..."
sudo tee /etc/systemd/system/axis-dicom.service > /dev/null <<EOF
[Unit]
Description=Axis Imaging DICOM Receiver
After=network.target

[Service]
Type=simple
User=azureuser
WorkingDirectory=/opt/axis-imaging
Environment="NODE_ENV=production"
Environment="DICOM_PORT=${DICOM_PORT}"
Environment="SUPABASE_URL=${SUPABASE_URL}"
Environment="SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}"
ExecStart=/usr/bin/node src/dicom-receiver.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Configure firewall
echo "Configuring firewall rules..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow ${HL7_PORT}/tcp
sudo ufw allow ${DICOM_PORT}/tcp
sudo ufw --force enable

# Configure Nginx reverse proxy
echo "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/axis-imaging > /dev/null <<EOF
server {
    listen 80;
    server_name ${SERVER_IP};

    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /hl7 {
        proxy_pass http://localhost:${HL7_PORT};
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header Host \$host;
    }

    location /dicom {
        proxy_pass http://localhost:${DICOM_PORT};
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header Host \$host;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/axis-imaging /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Enable and start services
echo "Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable axis-hl7
sudo systemctl enable axis-dicom
sudo systemctl start axis-hl7
sudo systemctl start axis-dicom

# Check service status
echo "Checking service status..."
sudo systemctl status axis-hl7 --no-pager
sudo systemctl status axis-dicom --no-pager

echo "========================================="
echo "Setup complete!"
echo "HL7 Listener: ${SERVER_IP}:${HL7_PORT}"
echo "DICOM Receiver: ${SERVER_IP}:${DICOM_PORT}"
echo "Health Check: http://${SERVER_IP}/health"
echo "========================================="

# Display logs
echo "To view logs:"
echo "  HL7: sudo journalctl -u axis-hl7 -f"
echo "  DICOM: sudo journalctl -u axis-dicom -f"