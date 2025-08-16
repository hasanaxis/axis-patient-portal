# Axis Imaging Patient Portal - Deployment Guide

## Overview

This guide covers deploying the Axis Imaging Patient Portal to production infrastructure with proper security, monitoring, and compliance for healthcare data.

## Architecture

- **Backend**: Node.js/Express API with PostgreSQL database
- **Frontend**: React web application 
- **Mobile**: React Native/Expo iOS and Android apps
- **Infrastructure**: Docker containers on AWS/Azure cloud
- **Storage**: Local file storage with S3 backup for medical images
- **Notifications**: Twilio SMS service

## Prerequisites

### Required Services
- Domain name (e.g., axisimaging.com.au)
- SSL certificates for HTTPS
- Twilio account for SMS notifications
- Cloud hosting (AWS/Azure/Google Cloud)
- PostgreSQL database
- Docker and Docker Compose

### Australian Healthcare Compliance
- Ensure data residency within Australia
- Configure audit logging
- Set up backup and retention policies
- Implement access controls

## Environment Configuration

### 1. Copy Environment Template
```bash
cp .env.example .env
```

### 2. Configure Production Values
Edit `.env` with your production values:

```bash
# Database
DB_PASSWORD=YOUR_SECURE_DATABASE_PASSWORD
DB_NAME=axis_portal_production

# Security
JWT_SECRET=YOUR_SUPER_SECURE_JWT_SECRET_MIN_32_CHARS
JWT_REFRESH_SECRET=YOUR_JWT_REFRESH_SECRET_MIN_32_CHARS

# Twilio SMS
TWILIO_ACCOUNT_SID=AC123...
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+61400123456

# Domains
DOMAIN=axisimaging.com.au
API_SUBDOMAIN=api
PORTAL_SUBDOMAIN=portal
```

## Database Setup

### 1. PostgreSQL Production Database
```bash
# Create production database
createdb axis_portal_production

# Run migrations
cd backend
npx prisma migrate deploy
npx prisma generate
```

### 2. Initial Data Setup
```bash
# Create initial admin user and sample data
npx ts-node prisma/simple-seed.ts
```

## Docker Deployment

### 1. Build Production Images
```bash
# Build all services
docker-compose build

# Or build individually
docker-compose build backend
docker-compose build webapp
```

### 2. Start Production Stack
```bash
# Start all services
docker-compose up -d

# Check service health
docker-compose ps
docker-compose logs backend
```

### 3. SSL and Domain Setup
Configure your DNS to point to your server:
- `portal.axisimaging.com.au` → Web app
- `api.axisimaging.com.au` → Backend API

## Production Checklist

### Security
- [ ] SSL certificates installed and working
- [ ] Database passwords changed from defaults
- [ ] JWT secrets updated to secure random values
- [ ] CORS configured for production domains only
- [ ] Rate limiting enabled
- [ ] Audit logging configured

### Healthcare Compliance
- [ ] Data encryption at rest and in transit
- [ ] Access logging enabled
- [ ] Backup strategy implemented
- [ ] Data retention policies configured
- [ ] Australian data residency confirmed

### Performance
- [ ] Database indexes optimized
- [ ] File storage configured
- [ ] CDN setup for static assets
- [ ] Application monitoring enabled
- [ ] Health checks working

### Monitoring
- [ ] Application logs centralized
- [ ] Error tracking (Sentry) configured
- [ ] Performance monitoring enabled
- [ ] Uptime monitoring setup
- [ ] Database monitoring enabled

## Service Endpoints

After deployment, verify these endpoints work:

### Backend API
- Health check: `https://api.axisimaging.com.au/api/health`
- Studies: `https://api.axisimaging.com.au/api/studies`
- SMS status: `https://api.axisimaging.com.au/api/sms/status`
- Storage status: `https://api.axisimaging.com.au/api/storage/status`

### Web Application
- Main app: `https://portal.axisimaging.com.au`
- Login: `https://portal.axisimaging.com.au/login`
- Dashboard: `https://portal.axisimaging.com.au/dashboard`

## Mobile App Deployment

### iOS App Store
1. Build production iOS app:
```bash
cd mobile
npx expo build:ios --release-channel production
```

2. Upload to App Store Connect
3. Submit for review

### Android Play Store
1. Build production Android app:
```bash
cd mobile
npx expo build:android --release-channel production
```

2. Upload to Google Play Console
3. Submit for review

## Backup and Recovery

### Database Backups
```bash
# Daily backup script
pg_dump axis_portal_production > backup_$(date +%Y%m%d).sql

# Restore from backup
psql axis_portal_production < backup_20240814.sql
```

### File Storage Backups
```bash
# Sync to S3
aws s3 sync ./storage s3://axis-imaging-backups/storage/
```

## Monitoring and Maintenance

### Health Checks
- API health endpoint: `/api/health`
- Database connectivity
- File storage accessibility
- SMS service status

### Log Monitoring
- Application logs in `/app/logs`
- Database logs
- Nginx access logs
- Error tracking with Sentry

### Updates and Patches
- Regular security updates
- Database maintenance
- SSL certificate renewal
- Dependency updates

## Troubleshooting

### Common Issues

1. **Database connection failed**
   - Check DATABASE_URL environment variable
   - Verify PostgreSQL is running
   - Check network connectivity

2. **SMS not sending**
   - Verify Twilio credentials
   - Check phone number format (+61...)
   - Review Twilio account balance

3. **File uploads failing**
   - Check storage directory permissions
   - Verify disk space
   - Review file size limits

### Support Contacts
- Technical Support: support@axisimaging.com.au
- Emergency: +61 3 8765 1000

## Security Considerations

### Data Protection
- All patient data encrypted
- Secure authentication required
- Session management with timeouts
- Audit trail for all access

### Network Security
- HTTPS only (no HTTP)
- Firewall rules configured
- VPN access for admin functions
- Regular security audits

### Compliance
- Australian Privacy Act compliance
- Healthcare data handling standards
- Retention policies enforced
- Data breach response plan