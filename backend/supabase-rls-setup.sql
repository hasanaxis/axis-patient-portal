-- ===== AXIS IMAGING HEALTHCARE RLS POLICIES =====
-- Row Level Security setup for Australian healthcare compliance
-- Using actual table names from Prisma schema

-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Patient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Study" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Series" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Image" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;

-- ===== USER POLICIES =====
-- Users can only access their own user record
CREATE POLICY "users_own_data" ON "User"
FOR ALL USING (auth.uid()::text = id);

-- Staff can access all users (for administration)
CREATE POLICY "staff_all_users" ON "User"
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM "User" u2
    WHERE u2.id = auth.uid()::text 
    AND u2.role IN ('ADMIN', 'STAFF', 'RADIOLOGIST')
  )
);

-- ===== PATIENT POLICIES =====
-- Patients can only access their own patient record
CREATE POLICY "patients_own_data" ON "Patient"
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM "User" u
    WHERE u.id = auth.uid()::text 
    AND u.id = "Patient"."userId"
  )
);

-- Staff can access all patient records
CREATE POLICY "staff_all_patients" ON "Patient"
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM "User" u
    WHERE u.id = auth.uid()::text 
    AND u.role IN ('ADMIN', 'STAFF', 'RADIOLOGIST')
  )
);

-- ===== STUDY POLICIES =====
-- Patients can only access their own studies
CREATE POLICY "patients_own_studies" ON "Study"
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM "Patient" p
    JOIN "User" u ON u.id = p."userId"
    WHERE u.id = auth.uid()::text 
    AND p.id = "Study"."patientId"
  )
);

-- Staff can access all studies
CREATE POLICY "staff_all_studies" ON "Study"
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM "User" u
    WHERE u.id = auth.uid()::text 
    AND u.role IN ('ADMIN', 'STAFF', 'RADIOLOGIST')
  )
);

-- ===== SERIES POLICIES =====
-- Patients can only access series from their own studies
CREATE POLICY "patients_own_series" ON "Series"
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM "Study" s
    JOIN "Patient" p ON p.id = s."patientId"
    JOIN "User" u ON u.id = p."userId"
    WHERE u.id = auth.uid()::text 
    AND s.id = "Series"."studyId"
  )
);

-- Staff can access all series
CREATE POLICY "staff_all_series" ON "Series"
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM "User" u
    WHERE u.id = auth.uid()::text 
    AND u.role IN ('ADMIN', 'STAFF', 'RADIOLOGIST')
  )
);

-- ===== IMAGE POLICIES =====
-- Patients can only access images from their own series
CREATE POLICY "patients_own_images" ON "Image"
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM "Series" se
    JOIN "Study" s ON s.id = se."studyId"
    JOIN "Patient" p ON p.id = s."patientId"
    JOIN "User" u ON u.id = p."userId"
    WHERE u.id = auth.uid()::text 
    AND se.id = "Image"."seriesId"
  )
);

-- Staff can access all images
CREATE POLICY "staff_all_images" ON "Image"
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM "User" u
    WHERE u.id = auth.uid()::text 
    AND u.role IN ('ADMIN', 'STAFF', 'RADIOLOGIST')
  )
);

-- ===== REPORT POLICIES =====
-- Patients can only read their own reports (no write access)
CREATE POLICY "patients_own_reports_read" ON "Report"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "Study" s
    JOIN "Patient" p ON p.id = s."patientId"
    JOIN "User" u ON u.id = p."userId"
    WHERE u.id = auth.uid()::text 
    AND s.id = "Report"."studyId"
  )
);

-- Radiologists can create/update reports
CREATE POLICY "radiologists_reports_write" ON "Report"
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM "User" u
    WHERE u.id = auth.uid()::text 
    AND u.role IN ('RADIOLOGIST', 'ADMIN')
  )
);

-- ===== SESSION POLICIES =====
-- Users can only access their own sessions
CREATE POLICY "users_own_sessions" ON "Session"
FOR ALL USING (auth.uid()::text = "userId");

-- ===== SECURITY FUNCTIONS =====
-- Function to check if user is healthcare staff
CREATE OR REPLACE FUNCTION is_healthcare_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "User" u
    WHERE u.id = auth.uid()::text 
    AND u.role IN ('ADMIN', 'STAFF', 'RADIOLOGIST')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get patient ID for current user
CREATE OR REPLACE FUNCTION get_patient_id_for_user()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT p.id FROM "Patient" p
    JOIN "User" u ON u.id = p."userId"
    WHERE u.id = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== INDEXES FOR PERFORMANCE =====
-- Create indexes for faster RLS policy evaluation
CREATE INDEX IF NOT EXISTS idx_patient_user_id ON "Patient"("userId");
CREATE INDEX IF NOT EXISTS idx_study_patient_id ON "Study"("patientId");
CREATE INDEX IF NOT EXISTS idx_series_study_id ON "Series"("studyId");
CREATE INDEX IF NOT EXISTS idx_image_series_id ON "Image"("seriesId");
CREATE INDEX IF NOT EXISTS idx_report_study_id ON "Report"("studyId");
CREATE INDEX IF NOT EXISTS idx_session_user_id ON "Session"("userId");
CREATE INDEX IF NOT EXISTS idx_user_role ON "User"("role");

-- ===== SUCCESS MESSAGE =====
SELECT 'Healthcare RLS policies successfully applied! 🏥✅' as status;