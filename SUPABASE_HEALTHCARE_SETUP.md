# 🏥 SUPABASE POSTGRESQL SETUP - AXIS IMAGING HEALTHCARE

## 🇦🇺 WHY SUPABASE FOR AUSTRALIAN HEALTHCARE

### Healthcare Compliance Features:
✅ **SOC 2 Type II Certified** - Healthcare-grade security audit
✅ **GDPR Compliant** - Similar to Australian Privacy Act 1988
✅ **Row Level Security (RLS)** - Patient data isolation at database level
✅ **Audit Logging** - Complete access logs for compliance
✅ **Data Encryption** - AES-256 at rest, TLS 1.3 in transit
✅ **Backup & Recovery** - Automated daily backups with point-in-time recovery
✅ **Geographic Data Control** - Can specify data residency
✅ **Built-in Authentication** - SMS verification, secure sessions

### Additional Benefits:
✅ **Real-time Updates** - Instant scan result notifications
✅ **Edge Functions** - Fast performance for Australian users
✅ **Dashboard & Monitoring** - Built-in database admin panel
✅ **API Auto-generation** - Instant REST and GraphQL APIs
✅ **Storage Integration** - DICOM image storage with CDN

---

## 🚀 QUICK SETUP (10 MINUTES)

### Step 1: Create Supabase Project
1. Go to https://supabase.com
2. Sign up with GitHub
3. Create New Project:
   - **Project Name**: `axis-imaging-portal`
   - **Database Password**: Generate strong password
   - **Region**: `Southeast Asia (Singapore)` - closest to Australia
   - **Plan**: Pro ($25/month) - includes everything we need

### Step 2: Configure for Healthcare
```sql
-- Enable Row Level Security for all tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Create policies for patient data access
CREATE POLICY "Patients can only see their own data" 
ON patients FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Staff can see all patient data" 
ON patients FOR ALL 
USING (auth.jwt() ->> 'role' = 'staff');
```

### Step 3: Get Connection Details
From Supabase Dashboard → Settings → Database:
- **Connection String**: `postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres`
- **Direct URL**: For Prisma migrations
- **Pooled URL**: For application connections

---

## 🔧 BACKEND CONFIGURATION

### Update .env file:
```bash
# Supabase Database URLs
DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"

# Supabase API Configuration
SUPABASE_URL="https://[project].supabase.co"
SUPABASE_ANON_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."

# Healthcare Compliance
ENABLE_ROW_LEVEL_SECURITY=true
ENABLE_AUDIT_LOGGING=true
PATIENT_DATA_ENCRYPTION=true
```

### Update Prisma Schema:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// Healthcare-specific models with RLS
model Patient {
  id              String   @id @default(uuid())
  userId          String   @unique // Links to Supabase auth.users
  medicareNumber  String?  @unique
  ihiNumber       String?  @unique // Individual Healthcare Identifier
  firstName       String
  lastName        String
  dateOfBirth     DateTime
  phoneNumber     String   @unique
  email           String?  @unique
  address         Json?    // Flexible address storage
  emergencyContact Json?   // Emergency contact details
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relationships
  studies         Study[]
  consents        Consent[]
  
  @@map("patients")
}

model Study {
  id              String   @id @default(uuid())
  patientId       String
  accessionNumber String   @unique
  studyDate       DateTime
  modality        String   // X-Ray, CT, Ultrasound, etc.
  bodyPart        String
  studyDescription String?
  dicomStudyUID   String?  @unique
  status          StudyStatus @default(SCHEDULED)
  priority        Priority @default(ROUTINE)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relationships
  patient         Patient  @relation(fields: [patientId], references: [id])
  images          Image[]
  report          Report?
  
  @@map("studies")
}

model Report {
  id              String     @id @default(uuid())
  studyId         String     @unique
  radiologistId   String?
  findings        String?
  impression      String?
  recommendations String?
  reportStatus    ReportStatus @default(DRAFT)
  signedAt        DateTime?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  
  // Relationships
  study           Study      @relation(fields: [studyId], references: [id])
  
  @@map("reports")
}

// Enums for healthcare workflow
enum StudyStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum ReportStatus {
  DRAFT
  PENDING
  SIGNED
  AMENDED
}

enum Priority {
  STAT
  URGENT
  ROUTINE
}
```

---

## 🔒 HEALTHCARE SECURITY SETUP

### Row Level Security Policies:
```sql
-- Patients can only access their own data
CREATE POLICY "patient_own_data" ON patients
FOR ALL USING (auth.uid()::text = user_id);

-- Healthcare staff can access all patient data
CREATE POLICY "staff_all_access" ON patients
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM staff_members 
    WHERE user_id = auth.uid()::text 
    AND role IN ('doctor', 'radiologist', 'admin')
  )
);

-- Studies are linked to patients
CREATE POLICY "patient_own_studies" ON studies
FOR ALL USING (
  patient_id IN (
    SELECT id FROM patients 
    WHERE user_id = auth.uid()::text
  )
);

-- Reports follow study access patterns
CREATE POLICY "study_linked_reports" ON reports
FOR ALL USING (
  study_id IN (
    SELECT id FROM studies 
    WHERE patient_id IN (
      SELECT id FROM patients 
      WHERE user_id = auth.uid()::text
    )
  )
);
```

### Audit Logging:
```sql
-- Enable audit logging for all patient data changes
CREATE EXTENSION IF NOT EXISTS "audit";

SELECT audit.enable_tracking('patients'::regclass);
SELECT audit.enable_tracking('studies'::regclass);
SELECT audit.enable_tracking('reports'::regclass);
```

---

## 📱 AUTHENTICATION INTEGRATION

### SMS Verification Setup:
```typescript
// Supabase SMS authentication
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

// Send SMS verification
async function sendSMSVerification(phoneNumber: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    phone: phoneNumber,
    options: {
      channel: 'sms',
    }
  })
  return { data, error }
}

// Verify SMS code
async function verifySMSCode(phoneNumber: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone: phoneNumber,
    token,
    type: 'sms'
  })
  return { data, error }
}
```

---

## 💰 COST BREAKDOWN (Monthly AUD)

### Supabase Pro Plan:
- **Database**: Included (up to 8GB)
- **Authentication**: Included (unlimited users)
- **Storage**: $0.021/GB (for DICOM images)
- **Bandwidth**: $0.09/GB
- **Edge Functions**: Included (2M invocations)

### Estimated Monthly Cost:
- **Small Clinic** (< 500 patients): $35-50 AUD
- **Medium Clinic** (< 2000 patients): $75-120 AUD
- **Large Clinic** (< 10000 patients): $200-350 AUD

---

## 🎯 IMMEDIATE SETUP STEPS

### 1. Create Supabase Project (You do this):
- Visit https://supabase.com
- Create account → New Project
- Choose Singapore region (closest to Australia)
- Generate strong database password
- Copy connection details

### 2. I'll Configure Everything:
```bash
# Update environment variables
# Deploy Prisma schema
# Set up Row Level Security
# Configure authentication
# Test healthcare compliance features
```

---

## 📞 READY TO START

**Please create the Supabase project now:**
1. Go to https://supabase.com
2. Sign up → New Project
3. Project name: `axis-imaging-portal`
4. Region: `Southeast Asia (Singapore)`
5. Plan: Pro ($25/month)
6. Copy the connection string and API keys

**Once you have the Supabase details, I'll configure everything for healthcare compliance immediately!**