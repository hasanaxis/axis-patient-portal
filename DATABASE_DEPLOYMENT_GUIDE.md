# Axis Imaging Database Deployment Guide

## 🎯 **Production PostgreSQL Deployment Strategy**

### **Phase 1: Local Development (Immediate - 15 minutes)**

#### SQLite for Development
```bash
# Already configured in Prisma schema
# DATABASE_URL="file:./dev.db"
cd /Users/bilalahmed/axis_patient_portal/backend
npm run db:migrate
npm run db:seed
```

### **Phase 2: Production PostgreSQL (This Week)**

#### Option A: AWS RDS PostgreSQL (RECOMMENDED) 🇦🇺
**Why Perfect for Healthcare:**
- Australian data residency (Sydney ap-southeast-2)
- HIPAA-eligible, SOC 2 compliant
- 99.99% uptime SLA
- Automated backups (35-day retention)
- Point-in-time recovery
- Built-in monitoring and alerting

**Monthly Cost:** $200-400 AUD

**Setup Steps:**
1. **Create AWS Account** (Australian billing address)
2. **VPC Configuration** (Sydney region)
3. **RDS Instance Creation**
4. **Security Group Configuration**
5. **Backup and Monitoring Setup**

#### Option B: Azure Database for PostgreSQL
**Australian Regions:** Australia East (NSW), Australia Southeast (VIC)
**Monthly Cost:** $250-450 AUD

#### Option C: Local PostgreSQL Server (Cost-effective)
**For smaller clinics:** Self-hosted on Australian servers
**Monthly Cost:** $50-150 AUD (server costs)

---

## 🚀 **Immediate Setup (Development)**

### 1. Environment Configuration
```bash
# Create .env file
cp .env.example .env

# Update DATABASE_URL for SQLite (immediate development)
DATABASE_URL="file:./dev.db"
```

### 2. Database Migration
```bash
cd backend
npx prisma generate
npx prisma db push
npx prisma db seed
```

### 3. Verify Database
```bash
npx prisma studio
# Opens database browser at http://localhost:5555
```

---

## 🏥 **Production PostgreSQL Setup**

### AWS RDS Configuration (Recommended)

#### 1. Infrastructure Setup
```yaml
# AWS RDS Configuration
Engine: PostgreSQL 15.4
Instance Class: db.t3.medium (2 vCPU, 4GB RAM)
Storage: 100GB GP3 SSD
Multi-AZ: Yes (High Availability)
Backup Retention: 30 days
Encryption: Yes (AES-256)
Region: ap-southeast-2 (Sydney)
```

#### 2. Security Configuration
```yaml
VPC: Private subnet
Security Groups: Backend servers only
SSL: Required
Port: 5432 (custom port recommended)
Username: axis_admin
Password: [32-character secure password]
```

#### 3. Environment Variables (Production)
```bash
# Production .env
DATABASE_URL="postgresql://axis_admin:secure_password@axis-imaging-prod.xxxxx.ap-southeast-2.rds.amazonaws.com:5432/axis_imaging_prod?sslmode=require"
DB_HOST="axis-imaging-prod.xxxxx.ap-southeast-2.rds.amazonaws.com"
DB_PORT="5432"
DB_NAME="axis_imaging_prod"
DB_USERNAME="axis_admin"
DB_PASSWORD="secure_password"
DB_SSL="true"
```

#### 4. Migration to Production
```bash
# 1. Export development data
npx prisma db seed --preview-feature

# 2. Run production migrations
DATABASE_URL="postgresql://..." npx prisma migrate deploy

# 3. Verify production database
DATABASE_URL="postgresql://..." npx prisma studio
```

---

## 📊 **Database Schema Overview**

### Healthcare-Specific Tables
```sql
-- Patients with Australian compliance
CREATE TABLE patients (
    id UUID PRIMARY KEY,
    medicare_number VARCHAR(11),
    ihi_number VARCHAR(16),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    phone_number VARCHAR(20),
    address_line_1 VARCHAR(200),
    address_line_2 VARCHAR(200),
    suburb VARCHAR(100),
    state VARCHAR(3),
    postcode VARCHAR(4),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Medical Studies
CREATE TABLE studies (
    id UUID PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    accession_number VARCHAR(50) UNIQUE,
    study_date TIMESTAMP,
    modality VARCHAR(10),
    body_part VARCHAR(100),
    status VARCHAR(20),
    dicom_study_uid VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Radiology Reports
CREATE TABLE reports (
    id UUID PRIMARY KEY,
    study_id UUID REFERENCES studies(id),
    radiologist_id UUID,
    findings TEXT,
    impression TEXT,
    report_status VARCHAR(20),
    signed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔒 **Security & Compliance**

### Australian Healthcare Requirements
1. **Data Residency**: All data in Australian AWS regions
2. **Encryption**: AES-256 at rest, TLS 1.3 in transit  
3. **Access Control**: Role-based access (RBAC)
4. **Audit Logging**: All database access logged
5. **Backup Security**: Encrypted backups with 30-day retention
6. **Privacy Act 1988**: Full compliance with Australian privacy laws

### Database Security Checklist
- [ ] SSL/TLS connections only
- [ ] VPC private subnets
- [ ] Security groups (whitelist IPs only)
- [ ] Database parameter encryption
- [ ] Regular security patches
- [ ] Access logging enabled
- [ ] Backup encryption enabled

---

## 📈 **Monitoring & Alerts**

### CloudWatch Metrics (AWS)
- CPU utilization
- Database connections
- Read/Write IOPS
- Storage space
- Backup status

### Alert Thresholds
- CPU > 80% for 5 minutes
- Connections > 80% of max
- Storage > 85% full
- Failed backup alerts
- Security group changes

---

## 💰 **Cost Breakdown (Monthly AUD)**

### AWS RDS Production
```
db.t3.medium (Multi-AZ): $180
100GB GP3 Storage: $15
Backup Storage (30 days): $25
Data Transfer: $10
Total: ~$230 AUD/month
```

### Scaling Options
- **Small Clinic**: db.t3.micro ($60/month)
- **Medium Clinic**: db.t3.medium ($230/month)  
- **Large Clinic**: db.m5.large ($450/month)

---

## 🚀 **Quick Start Commands**

### Immediate Development Setup
```bash
cd /Users/bilalahmed/axis_patient_portal/backend
cp .env.example .env
echo 'DATABASE_URL="file:./dev.db"' >> .env
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### Production Deployment
```bash
# 1. Create AWS RDS instance
aws rds create-db-instance [parameters]

# 2. Update production environment
DATABASE_URL="postgresql://..." 

# 3. Deploy migrations
npx prisma migrate deploy

# 4. Start production server
npm run start
```

---

## 📞 **Next Steps**

1. **Today**: Set up SQLite development database
2. **This Week**: Create AWS account and RDS instance
3. **Testing**: Migrate development data to production
4. **Go-Live**: Switch DNS to production environment

For immediate questions about database setup, the backend is configured and ready to run with SQLite for development testing.