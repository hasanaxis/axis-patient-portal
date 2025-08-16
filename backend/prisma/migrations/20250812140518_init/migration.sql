-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PATIENT', 'RADIOLOGIST', 'ADMIN', 'REFERRING_GP', 'TECHNOLOGIST', 'CLERK', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "ContactMethod" AS ENUM ('SMS', 'EMAIL', 'PHONE', 'POSTAL_MAIL', 'PATIENT_PORTAL');

-- CreateEnum
CREATE TYPE "AustralianState" AS ENUM ('VIC', 'NSW', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT');

-- CreateEnum
CREATE TYPE "ScanType" AS ENUM ('XRAY', 'CT', 'MRI', 'ULTRASOUND', 'DEXA', 'MAMMOGRAPHY', 'FLUOROSCOPY', 'NUCLEAR_MEDICINE', 'PET_CT', 'ANGIOGRAPHY', 'CARDIAC_CT', 'CARDIAC_MRI');

-- CreateEnum
CREATE TYPE "Modality" AS ENUM ('CR', 'CT', 'DX', 'MG', 'MR', 'NM', 'PT', 'RF', 'SC', 'US', 'XA', 'XR');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('ROUTINE', 'URGENT', 'STAT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "StudyStatus" AS ENUM ('SCHEDULED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'PRELIMINARY', 'FINAL', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'DRAFT', 'IN_REVIEW', 'PRELIMINARY', 'FINAL', 'ADDENDUM', 'CORRECTED', 'SENT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPOINTMENT_REMINDER', 'REPORT_AVAILABLE', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_CANCELLED', 'SYSTEM_NOTIFICATION', 'PRIVACY_CONSENT', 'EMERGENCY_ALERT', 'CRITICAL_RESULT', 'PAYMENT_REMINDER', 'PORTAL_INVITATION');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('APPOINTMENT', 'REPORT', 'SYSTEM', 'BILLING', 'CONSENT', 'SECURITY');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "InvitationType" AS ENUM ('PORTAL_ACCESS', 'APPOINTMENT_BOOKING', 'REPORT_ACCESS', 'EMERGENCY_CONTACT');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('REFERRAL', 'REPORT', 'CONSENT_FORM', 'IDENTIFICATION', 'INSURANCE_CARD', 'MEDICAL_HISTORY', 'DISCHARGE_SUMMARY', 'LAB_RESULT', 'PRESCRIPTION', 'INVOICE');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('MEDICAL', 'ADMINISTRATIVE', 'CONSENT', 'BILLING', 'LEGAL');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('PATIENT_ONLY', 'STAFF_ONLY', 'DOCTOR_ONLY', 'ADMIN_ONLY', 'PUBLIC');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('PRIVACY', 'DATA_SHARING', 'COMMUNICATION', 'EMERGENCY_CONTACT', 'RESEARCH', 'MARKETING', 'PORTAL_TERMS', 'BILLING');

-- CreateEnum
CREATE TYPE "ConsentMethod" AS ENUM ('ONLINE', 'PAPER', 'VERBAL', 'ELECTRONIC_SIGNATURE', 'MOBILE_APP');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'VIEW', 'CREATE', 'UPDATE', 'DELETE', 'DOWNLOAD', 'PRINT', 'SHARE', 'CONSENT_GIVEN', 'CONSENT_WITHDRAWN', 'EXPORT', 'IMPORT', 'BACKUP', 'RESTORE');

-- CreateEnum
CREATE TYPE "AuditEntity" AS ENUM ('USER', 'PATIENT', 'STUDY', 'REPORT', 'APPOINTMENT', 'REFERRAL', 'DOCUMENT', 'CONSENT', 'SESSION', 'SYSTEM_SETTING');

-- CreateEnum
CREATE TYPE "AuditCategory" AS ENUM ('SECURITY', 'DATA_ACCESS', 'ADMINISTRATIVE', 'CLINICAL', 'BILLING', 'SYSTEM');

-- CreateEnum
CREATE TYPE "LogSeverity" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SettingDataType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'ARRAY');

-- CreateEnum
CREATE TYPE "Environment" AS ENUM ('DEVELOPMENT', 'STAGING', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "SessionTerminationReason" AS ENUM ('LOGOUT', 'EXPIRED', 'SECURITY', 'ADMIN', 'TIMEOUT', 'DEVICE_LIMIT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender",
    "medicareNumber" TEXT,
    "medicareExpiryDate" TIMESTAMP(3),
    "ihiNumber" TEXT,
    "dvaNumber" TEXT,
    "pensionNumber" TEXT,
    "healthcareCardNumber" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'PATIENT',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeceased" BOOLEAN NOT NULL DEFAULT false,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "culturalBackground" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactRelationship" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "passwordHash" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "patientNumber" TEXT NOT NULL,
    "mrn" TEXT,
    "streetAddress" TEXT,
    "suburb" TEXT,
    "state" "AustralianState",
    "postcode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Australia',
    "homePhone" TEXT,
    "workPhone" TEXT,
    "preferredContactMethod" "ContactMethod" NOT NULL DEFAULT 'SMS',
    "allergies" TEXT[],
    "medicalConditions" TEXT[],
    "currentMedications" TEXT[],
    "medicalHistory" JSONB,
    "familyHistory" TEXT,
    "socialHistory" TEXT,
    "referringGpId" TEXT,
    "privateHealthInsurer" TEXT,
    "privateHealthNumber" TEXT,
    "workersCompClaim" TEXT,
    "tpClaim" TEXT,
    "nextOfKinName" TEXT,
    "nextOfKinPhone" TEXT,
    "nextOfKinRelationship" TEXT,
    "nextOfKinAddress" TEXT,
    "allowSmsReminders" BOOLEAN NOT NULL DEFAULT true,
    "allowEmailReminders" BOOLEAN NOT NULL DEFAULT true,
    "allowPostalMail" BOOLEAN NOT NULL DEFAULT false,
    "shareWithFamilyGp" BOOLEAN NOT NULL DEFAULT true,
    "allowResearch" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferringGP" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "title" TEXT,
    "practiceName" TEXT NOT NULL,
    "providerNumber" TEXT NOT NULL,
    "prescriberId" TEXT,
    "ahpraNumber" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "faxNumber" TEXT,
    "email" TEXT NOT NULL,
    "streetAddress" TEXT NOT NULL,
    "suburb" TEXT NOT NULL,
    "state" "AustralianState" NOT NULL,
    "postcode" TEXT NOT NULL,
    "specializations" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "preferredContactMethod" "ContactMethod" NOT NULL DEFAULT 'EMAIL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferringGP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Radiologist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "specializations" TEXT[],
    "qualifications" TEXT[],
    "yearsExperience" INTEGER,
    "subspecialties" TEXT[],
    "consultingRooms" TEXT[],
    "workDays" TEXT[],
    "startTime" TEXT,
    "endTime" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedDate" TIMESTAMP(3),

    CONSTRAINT "Radiologist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Technologist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "modalities" TEXT[],
    "certifications" TEXT[],
    "workDays" TEXT[],
    "startTime" TEXT,
    "endTime" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedDate" TIMESTAMP(3),

    CONSTRAINT "Technologist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Study" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "studyInstanceUID" TEXT NOT NULL,
    "studyId" TEXT,
    "accessionNumber" TEXT NOT NULL,
    "studyDate" TIMESTAMP(3) NOT NULL,
    "studyTime" TEXT,
    "studyDescription" TEXT,
    "modality" "Modality" NOT NULL,
    "bodyPartExamined" TEXT,
    "studyComments" TEXT,
    "clinicalHistory" TEXT,
    "requestedProcedure" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'ROUTINE',
    "status" "StudyStatus" NOT NULL DEFAULT 'SCHEDULED',
    "performingPhysician" TEXT,
    "referringPhysician" TEXT,
    "operatorName" TEXT,
    "technologistId" TEXT,
    "radiologistId" TEXT,
    "stationName" TEXT,
    "manufacturerModel" TEXT,
    "institutionName" TEXT NOT NULL DEFAULT 'Axis Imaging Mickleham',
    "institutionAddress" TEXT NOT NULL DEFAULT 'Mickleham, VIC, Australia',
    "numberOfSeries" INTEGER NOT NULL DEFAULT 0,
    "numberOfInstances" INTEGER NOT NULL DEFAULT 0,
    "studySize" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "appointmentId" TEXT,

    CONSTRAINT "Study_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Series" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "seriesInstanceUID" TEXT NOT NULL,
    "seriesNumber" INTEGER,
    "seriesDate" TIMESTAMP(3),
    "seriesTime" TEXT,
    "seriesDescription" TEXT,
    "modality" "Modality" NOT NULL,
    "bodyPartExamined" TEXT,
    "protocolName" TEXT,
    "seriesComments" TEXT,
    "sliceThickness" DOUBLE PRECISION,
    "pixelSpacing" TEXT,
    "imageOrientation" TEXT,
    "imagePosition" TEXT,
    "acquisitionMatrix" TEXT,
    "kvp" DOUBLE PRECISION,
    "exposureTime" INTEGER,
    "xrayTubeCurrent" INTEGER,
    "contrastAgent" TEXT,
    "scanOptions" TEXT,
    "numberOfInstances" INTEGER NOT NULL DEFAULT 0,
    "seriesSize" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "sopInstanceUID" TEXT NOT NULL,
    "sopClassUID" TEXT,
    "instanceNumber" INTEGER,
    "acquisitionDate" TIMESTAMP(3),
    "acquisitionTime" TEXT,
    "imageComments" TEXT,
    "rows" INTEGER,
    "columns" INTEGER,
    "bitsAllocated" INTEGER,
    "bitsStored" INTEGER,
    "pixelRepresentation" INTEGER,
    "photometricInterpretation" TEXT,
    "windowCenter" TEXT,
    "windowWidth" TEXT,
    "windowCenterWidthExplanation" TEXT,
    "pixelSpacing" TEXT,
    "sliceLocation" DOUBLE PRECISION,
    "sliceThickness" DOUBLE PRECISION,
    "imagePosition" TEXT,
    "imageOrientation" TEXT,
    "imageUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "jpegUrl" TEXT,
    "fileSize" BIGINT,
    "transferSyntax" TEXT,
    "imageQuality" TEXT,
    "lossy" BOOLEAN NOT NULL DEFAULT false,
    "lossyMethod" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "radiologistId" TEXT NOT NULL,
    "clinicalHistory" TEXT,
    "technique" TEXT,
    "findings" TEXT NOT NULL,
    "impression" TEXT NOT NULL,
    "recommendations" TEXT,
    "comparison" TEXT,
    "limitations" TEXT,
    "reportNumber" TEXT NOT NULL,
    "templateUsed" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'ROUTINE',
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "isAmended" BOOLEAN NOT NULL DEFAULT false,
    "amendmentReason" TEXT,
    "previousVersionId" TEXT,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "criticalFinding" TEXT,
    "criticalNotifiedAt" TIMESTAMP(3),
    "criticalNotifiedBy" TEXT,
    "criticalNotifiedTo" TEXT,
    "dictatedAt" TIMESTAMP(3),
    "transcribedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "sentToReferrerAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "xmlUrl" TEXT,
    "audioUrl" TEXT,
    "wordCount" INTEGER,
    "complexityScore" DOUBLE PRECISION,
    "qaRequired" BOOLEAN NOT NULL DEFAULT false,
    "qaCompletedAt" TIMESTAMP(3),
    "qaCompletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentNumber" TEXT NOT NULL,
    "scanType" "ScanType" NOT NULL,
    "bodyPartExamined" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "priority" "Priority" NOT NULL DEFAULT 'ROUTINE',
    "referralId" TEXT,
    "referringPhysician" TEXT,
    "clinicalHistory" TEXT,
    "room" TEXT,
    "equipment" TEXT,
    "contrastRequired" BOOLEAN NOT NULL DEFAULT false,
    "contrastAgent" TEXT,
    "preparationInstructions" TEXT,
    "interpreterRequired" BOOLEAN NOT NULL DEFAULT false,
    "interpreterLanguage" TEXT,
    "wheelchairAccess" BOOLEAN NOT NULL DEFAULT false,
    "accompaniedByCaregiver" BOOLEAN NOT NULL DEFAULT false,
    "arrivedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "checkedOutAt" TIMESTAMP(3),
    "scheduledBy" TEXT,
    "performedBy" TEXT,
    "notes" TEXT,
    "patientInstructions" TEXT,
    "specialInstructions" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "confirmationSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancellationReason" TEXT,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referringGpId" TEXT NOT NULL,
    "referralNumber" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "patientDob" TIMESTAMP(3) NOT NULL,
    "patientPhone" TEXT NOT NULL,
    "patientMedicare" TEXT,
    "patientAddress" TEXT,
    "scanType" "ScanType" NOT NULL,
    "bodyPartExamined" TEXT,
    "clinicalHistory" TEXT NOT NULL,
    "clinicalIndication" TEXT,
    "previousImaging" TEXT,
    "currentMedications" TEXT,
    "relevantHistory" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'ROUTINE',
    "urgency" "Priority" NOT NULL DEFAULT 'ROUTINE',
    "urgentReason" TEXT,
    "medicareEligible" BOOLEAN NOT NULL DEFAULT true,
    "itemNumbers" TEXT[],
    "bulkBilled" BOOLEAN NOT NULL DEFAULT false,
    "referralDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "validUntilDate" TIMESTAMP(3),
    "documentUrl" TEXT,
    "originalDocumentName" TEXT,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "isExpired" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT,
    "invitationType" "InvitationType" NOT NULL DEFAULT 'PORTAL_ACCESS',
    "token" TEXT NOT NULL,
    "shortCode" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "sentVia" "ContactMethod" NOT NULL DEFAULT 'SMS',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reminderSentAt" TIMESTAMP(3),
    "sentBy" TEXT,
    "purpose" TEXT,
    "metadata" JSONB,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "category" "NotificationCategory",
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "actionText" TEXT,
    "imageUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "sentVia" "ContactMethod"[],
    "deliveryStatus" "DeliveryStatus",
    "deliveryAttempts" INTEGER NOT NULL DEFAULT 1,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "patientId" TEXT,
    "consentType" "ConsentType" NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "consentText" TEXT NOT NULL,
    "isConsented" BOOLEAN NOT NULL,
    "consentMethod" "ConsentMethod" NOT NULL,
    "consentedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "documentUrl" TEXT,
    "witnessName" TEXT,
    "witnessSignature" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceInfo" JSONB,
    "legalBasis" TEXT,
    "jurisdiction" TEXT NOT NULL DEFAULT 'Australia',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "patientId" TEXT,
    "documentType" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "filename" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "checksum" TEXT,
    "category" "DocumentCategory",
    "tags" TEXT[],
    "isConfidential" BOOLEAN NOT NULL DEFAULT true,
    "retentionPeriod" INTEGER,
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'PATIENT_ONLY',
    "encryptionKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "uploadedBy" TEXT,
    "uploadedFromIp" TEXT,
    "externalSystem" TEXT,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "refreshToken" TEXT,
    "deviceInfo" JSONB,
    "deviceFingerprint" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "location" JSONB,
    "isSecure" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorVerified" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "refreshExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "terminatedAt" TIMESTAMP(3),
    "terminationReason" "SessionTerminationReason",

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity" "AuditEntity" NOT NULL,
    "entityId" TEXT,
    "entityName" TEXT,
    "description" TEXT,
    "category" "AuditCategory",
    "severity" "LogSeverity" NOT NULL DEFAULT 'INFO',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "sessionId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "changedFields" TEXT[],
    "metadata" JSONB,
    "gdprLawfulBasis" TEXT,
    "retentionPeriod" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "dataType" "SettingDataType" NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "category" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "validationRules" JSONB,
    "environment" "Environment" NOT NULL DEFAULT 'PRODUCTION',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "changeReason" TEXT,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_phoneNumber_idx" ON "User"("phoneNumber");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_medicareNumber_idx" ON "User"("medicareNumber");

-- CreateIndex
CREATE INDEX "User_ihiNumber_idx" ON "User"("ihiNumber");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_userId_key" ON "Patient"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_patientNumber_key" ON "Patient"("patientNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_mrn_key" ON "Patient"("mrn");

-- CreateIndex
CREATE INDEX "Patient_patientNumber_idx" ON "Patient"("patientNumber");

-- CreateIndex
CREATE INDEX "Patient_mrn_idx" ON "Patient"("mrn");

-- CreateIndex
CREATE INDEX "Patient_referringGpId_idx" ON "Patient"("referringGpId");

-- CreateIndex
CREATE INDEX "Patient_suburb_idx" ON "Patient"("suburb");

-- CreateIndex
CREATE INDEX "Patient_postcode_idx" ON "Patient"("postcode");

-- CreateIndex
CREATE UNIQUE INDEX "ReferringGP_providerNumber_key" ON "ReferringGP"("providerNumber");

-- CreateIndex
CREATE INDEX "ReferringGP_providerNumber_idx" ON "ReferringGP"("providerNumber");

-- CreateIndex
CREATE INDEX "ReferringGP_practiceName_idx" ON "ReferringGP"("practiceName");

-- CreateIndex
CREATE INDEX "ReferringGP_suburb_idx" ON "ReferringGP"("suburb");

-- CreateIndex
CREATE UNIQUE INDEX "Radiologist_userId_key" ON "Radiologist"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Radiologist_employeeNumber_key" ON "Radiologist"("employeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Radiologist_licenseNumber_key" ON "Radiologist"("licenseNumber");

-- CreateIndex
CREATE INDEX "Radiologist_licenseNumber_idx" ON "Radiologist"("licenseNumber");

-- CreateIndex
CREATE INDEX "Radiologist_employeeNumber_idx" ON "Radiologist"("employeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Technologist_userId_key" ON "Technologist"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Technologist_employeeNumber_key" ON "Technologist"("employeeNumber");

-- CreateIndex
CREATE INDEX "Technologist_employeeNumber_idx" ON "Technologist"("employeeNumber");

-- CreateIndex
CREATE INDEX "Technologist_licenseNumber_idx" ON "Technologist"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Study_studyInstanceUID_key" ON "Study"("studyInstanceUID");

-- CreateIndex
CREATE UNIQUE INDEX "Study_accessionNumber_key" ON "Study"("accessionNumber");

-- CreateIndex
CREATE INDEX "Study_studyInstanceUID_idx" ON "Study"("studyInstanceUID");

-- CreateIndex
CREATE INDEX "Study_accessionNumber_idx" ON "Study"("accessionNumber");

-- CreateIndex
CREATE INDEX "Study_patientId_idx" ON "Study"("patientId");

-- CreateIndex
CREATE INDEX "Study_studyDate_idx" ON "Study"("studyDate");

-- CreateIndex
CREATE INDEX "Study_modality_idx" ON "Study"("modality");

-- CreateIndex
CREATE INDEX "Study_status_idx" ON "Study"("status");

-- CreateIndex
CREATE INDEX "Study_technologistId_idx" ON "Study"("technologistId");

-- CreateIndex
CREATE INDEX "Study_radiologistId_idx" ON "Study"("radiologistId");

-- CreateIndex
CREATE UNIQUE INDEX "Series_seriesInstanceUID_key" ON "Series"("seriesInstanceUID");

-- CreateIndex
CREATE INDEX "Series_seriesInstanceUID_idx" ON "Series"("seriesInstanceUID");

-- CreateIndex
CREATE INDEX "Series_studyId_idx" ON "Series"("studyId");

-- CreateIndex
CREATE INDEX "Series_seriesNumber_idx" ON "Series"("seriesNumber");

-- CreateIndex
CREATE INDEX "Series_modality_idx" ON "Series"("modality");

-- CreateIndex
CREATE UNIQUE INDEX "Image_sopInstanceUID_key" ON "Image"("sopInstanceUID");

-- CreateIndex
CREATE INDEX "Image_sopInstanceUID_idx" ON "Image"("sopInstanceUID");

-- CreateIndex
CREATE INDEX "Image_seriesId_idx" ON "Image"("seriesId");

-- CreateIndex
CREATE INDEX "Image_instanceNumber_idx" ON "Image"("instanceNumber");

-- CreateIndex
CREATE INDEX "Image_acquisitionDate_idx" ON "Image"("acquisitionDate");

-- CreateIndex
CREATE UNIQUE INDEX "Report_studyId_key" ON "Report"("studyId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_reportNumber_key" ON "Report"("reportNumber");

-- CreateIndex
CREATE INDEX "Report_reportNumber_idx" ON "Report"("reportNumber");

-- CreateIndex
CREATE INDEX "Report_studyId_idx" ON "Report"("studyId");

-- CreateIndex
CREATE INDEX "Report_patientId_idx" ON "Report"("patientId");

-- CreateIndex
CREATE INDEX "Report_radiologistId_idx" ON "Report"("radiologistId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_isCritical_idx" ON "Report"("isCritical");

-- CreateIndex
CREATE INDEX "Report_dictatedAt_idx" ON "Report"("dictatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_appointmentNumber_key" ON "Appointment"("appointmentNumber");

-- CreateIndex
CREATE INDEX "Appointment_appointmentNumber_idx" ON "Appointment"("appointmentNumber");

-- CreateIndex
CREATE INDEX "Appointment_patientId_idx" ON "Appointment"("patientId");

-- CreateIndex
CREATE INDEX "Appointment_scheduledAt_idx" ON "Appointment"("scheduledAt");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "Appointment_scanType_idx" ON "Appointment"("scanType");

-- CreateIndex
CREATE INDEX "Appointment_room_idx" ON "Appointment"("room");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referralNumber_key" ON "Referral"("referralNumber");

-- CreateIndex
CREATE INDEX "Referral_referralNumber_idx" ON "Referral"("referralNumber");

-- CreateIndex
CREATE INDEX "Referral_referringGpId_idx" ON "Referral"("referringGpId");

-- CreateIndex
CREATE INDEX "Referral_patientPhone_idx" ON "Referral"("patientPhone");

-- CreateIndex
CREATE INDEX "Referral_scanType_idx" ON "Referral"("scanType");

-- CreateIndex
CREATE INDEX "Referral_priority_idx" ON "Referral"("priority");

-- CreateIndex
CREATE INDEX "Referral_referralDate_idx" ON "Referral"("referralDate");

-- CreateIndex
CREATE INDEX "Referral_expiryDate_idx" ON "Referral"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_patientId_idx" ON "Invitation"("patientId");

-- CreateIndex
CREATE INDEX "Invitation_phoneNumber_idx" ON "Invitation"("phoneNumber");

-- CreateIndex
CREATE INDEX "Invitation_token_idx" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_shortCode_idx" ON "Invitation"("shortCode");

-- CreateIndex
CREATE INDEX "Invitation_expiresAt_idx" ON "Invitation"("expiresAt");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_isCritical_idx" ON "Notification"("isCritical");

-- CreateIndex
CREATE INDEX "Notification_sentAt_idx" ON "Notification"("sentAt");

-- CreateIndex
CREATE INDEX "Notification_relatedEntityType_relatedEntityId_idx" ON "Notification"("relatedEntityType", "relatedEntityId");

-- CreateIndex
CREATE INDEX "Consent_userId_idx" ON "Consent"("userId");

-- CreateIndex
CREATE INDEX "Consent_patientId_idx" ON "Consent"("patientId");

-- CreateIndex
CREATE INDEX "Consent_consentType_idx" ON "Consent"("consentType");

-- CreateIndex
CREATE INDEX "Consent_isConsented_idx" ON "Consent"("isConsented");

-- CreateIndex
CREATE INDEX "Consent_consentedAt_idx" ON "Consent"("consentedAt");

-- CreateIndex
CREATE INDEX "Document_patientId_idx" ON "Document"("patientId");

-- CreateIndex
CREATE INDEX "Document_documentType_idx" ON "Document"("documentType");

-- CreateIndex
CREATE INDEX "Document_category_idx" ON "Document"("category");

-- CreateIndex
CREATE INDEX "Document_isActive_idx" ON "Document"("isActive");

-- CreateIndex
CREATE INDEX "Document_createdAt_idx" ON "Document"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshToken_key" ON "Session"("refreshToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_refreshToken_idx" ON "Session"("refreshToken");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Session_isActive_idx" ON "Session"("isActive");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_category_idx" ON "AuditLog"("category");

-- CreateIndex
CREATE INDEX "AuditLog_severity_idx" ON "AuditLog"("severity");

-- CreateIndex
CREATE INDEX "AuditLog_ipAddress_idx" ON "AuditLog"("ipAddress");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "SystemSetting_key_idx" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "SystemSetting_category_idx" ON "SystemSetting"("category");

-- CreateIndex
CREATE INDEX "SystemSetting_environment_idx" ON "SystemSetting"("environment");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_referringGpId_fkey" FOREIGN KEY ("referringGpId") REFERENCES "ReferringGP"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Radiologist" ADD CONSTRAINT "Radiologist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Technologist" ADD CONSTRAINT "Technologist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Study" ADD CONSTRAINT "Study_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Study" ADD CONSTRAINT "Study_technologistId_fkey" FOREIGN KEY ("technologistId") REFERENCES "Technologist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Study" ADD CONSTRAINT "Study_radiologistId_fkey" FOREIGN KEY ("radiologistId") REFERENCES "Radiologist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Study" ADD CONSTRAINT "Study_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_radiologistId_fkey" FOREIGN KEY ("radiologistId") REFERENCES "Radiologist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referringGpId_fkey" FOREIGN KEY ("referringGpId") REFERENCES "ReferringGP"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
