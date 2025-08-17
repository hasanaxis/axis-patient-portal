/*
  Warnings:

  - You are about to drop the column `acquisitionDate` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `acquisitionTime` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `bitsAllocated` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `bitsStored` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `columns` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `fileSize` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `imageComments` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `imageOrientation` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `imagePosition` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `imageQuality` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `jpegUrl` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `lossy` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `lossyMethod` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `photometricInterpretation` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `pixelRepresentation` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `pixelSpacing` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `rows` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `sliceLocation` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `sliceThickness` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `sopClassUID` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `transferSyntax` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `windowCenter` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `windowCenterWidthExplanation` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `windowWidth` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `allowEmailReminders` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `allowPostalMail` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `allowResearch` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `allowSmsReminders` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `currentMedications` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `familyHistory` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `homePhone` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `medicalConditions` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `medicalHistory` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `mrn` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `nextOfKinAddress` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `nextOfKinName` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `nextOfKinPhone` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `nextOfKinRelationship` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `preferredContactMethod` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `privateHealthInsurer` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `privateHealthNumber` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `referringGpId` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `shareWithFamilyGp` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `socialHistory` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `tpClaim` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `workPhone` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `workersCompClaim` on the `Patient` table. All the data in the column will be lost.
  - The `state` column on the `Patient` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `amendmentReason` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `audioUrl` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `comparison` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `complexityScore` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `criticalFinding` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `criticalNotifiedAt` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `criticalNotifiedBy` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `criticalNotifiedTo` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `isAmended` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `limitations` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `patientId` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `pdfUrl` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `previousVersionId` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `qaCompletedAt` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `qaCompletedBy` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `qaRequired` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `templateUsed` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `transcribedAt` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `wordCount` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `xmlUrl` on the `Report` table. All the data in the column will be lost.
  - The `priority` column on the `Report` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Report` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `acquisitionMatrix` on the `Series` table. All the data in the column will be lost.
  - You are about to drop the column `bodyPartExamined` on the `Series` table. All the data in the column will be lost.
  - You are about to drop the column `contrastAgent` on the `Series` table. All the data in the column will be lost.
  - You are about to drop the column `exposureTime` on the `Series` table. All the data in the column will be lost.
  - You are about to drop the column `imageOrientation` on the `Series` table. All the data in the column will be lost.
  - You are about to drop the column `imagePosition` on the `Series` table. All the data in the column will be lost.
  - You are about to drop the column `kvp` on the `Series` table. All the data in the column will be lost.
  - You are about to drop the column `pixelSpacing` on the `Series` table. All the data in the column will be lost.
  - You are about to drop the column `protocolName` on the `Series` table. All the data in the column will be lost.
  - You are about to drop the column `scanOptions` on the `Series` table. All the data in the column will be lost.
  - You are about to drop the column `seriesComments` on the `Series` table. All the data in the column will be lost.
  - You are about to drop the column `seriesDate` on the `Series` table. All the data in the column will be lost.
  - You are about to drop the column `seriesSize` on the `Series` table. All the data in the column will be lost.
  - You are about to drop the column `seriesTime` on the `Series` table. All the data in the column will be lost.
  - You are about to drop the column `sliceThickness` on the `Series` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Series` table. All the data in the column will be lost.
  - You are about to drop the column `xrayTubeCurrent` on the `Series` table. All the data in the column will be lost.
  - You are about to drop the column `deviceFingerprint` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `deviceInfo` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `isSecure` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `lastActivityAt` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `refreshExpiresAt` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `terminatedAt` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `terminationReason` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `twoFactorVerified` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `appointmentId` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `archivedAt` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `clinicalHistory` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `institutionAddress` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `manufacturerModel` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `operatorName` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `radiologistId` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `requestedProcedure` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `stationName` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `studyComments` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `studyId` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `studySize` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `studyTime` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `technologistId` on the `Study` table. All the data in the column will be lost.
  - The `priority` column on the `Study` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Study` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `culturalBackground` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `dateOfBirth` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `dvaNumber` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `emergencyContactName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `emergencyContactPhone` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `emergencyContactRelationship` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `healthcareCardNumber` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `ihiNumber` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `isDeceased` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastLoginAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `medicareExpiryDate` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `medicareNumber` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `middleName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `pensionNumber` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `preferredLanguage` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `twoFactorEnabled` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `twoFactorSecret` on the `User` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Appointment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Consent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Document` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Invitation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Radiologist` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Referral` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReferringGP` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SystemSetting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Technologist` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `instanceNumber` on table `Image` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `dateOfBirth` to the `Patient` table without a default value. This is not possible if the table is not empty.
  - Made the column `seriesNumber` on table `Series` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `modality` on the `Series` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updatedAt` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Made the column `studyDescription` on table `Study` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `modality` on the `Study` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `bodyPartExamined` on table `Study` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `passwordHash` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_patientId_fkey";

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_referralId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "Consent" DROP CONSTRAINT "Consent_patientId_fkey";

-- DropForeignKey
ALTER TABLE "Consent" DROP CONSTRAINT "Consent_userId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_patientId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_userId_fkey";

-- DropForeignKey
ALTER TABLE "Image" DROP CONSTRAINT "Image_seriesId_fkey";

-- DropForeignKey
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_patientId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "Patient" DROP CONSTRAINT "Patient_referringGpId_fkey";

-- DropForeignKey
ALTER TABLE "Radiologist" DROP CONSTRAINT "Radiologist_userId_fkey";

-- DropForeignKey
ALTER TABLE "Referral" DROP CONSTRAINT "Referral_referringGpId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_patientId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_radiologistId_fkey";

-- DropForeignKey
ALTER TABLE "Series" DROP CONSTRAINT "Series_studyId_fkey";

-- DropForeignKey
ALTER TABLE "Study" DROP CONSTRAINT "Study_appointmentId_fkey";

-- DropForeignKey
ALTER TABLE "Study" DROP CONSTRAINT "Study_radiologistId_fkey";

-- DropForeignKey
ALTER TABLE "Study" DROP CONSTRAINT "Study_technologistId_fkey";

-- DropForeignKey
ALTER TABLE "Technologist" DROP CONSTRAINT "Technologist_userId_fkey";

-- DropIndex
DROP INDEX "Image_acquisitionDate_idx";

-- DropIndex
DROP INDEX "Image_instanceNumber_idx";

-- DropIndex
DROP INDEX "Image_seriesId_idx";

-- DropIndex
DROP INDEX "Image_sopInstanceUID_idx";

-- DropIndex
DROP INDEX "Patient_mrn_idx";

-- DropIndex
DROP INDEX "Patient_mrn_key";

-- DropIndex
DROP INDEX "Patient_patientNumber_idx";

-- DropIndex
DROP INDEX "Patient_postcode_idx";

-- DropIndex
DROP INDEX "Patient_referringGpId_idx";

-- DropIndex
DROP INDEX "Patient_suburb_idx";

-- DropIndex
DROP INDEX "Report_dictatedAt_idx";

-- DropIndex
DROP INDEX "Report_isCritical_idx";

-- DropIndex
DROP INDEX "Report_patientId_idx";

-- DropIndex
DROP INDEX "Report_radiologistId_idx";

-- DropIndex
DROP INDEX "Report_reportNumber_idx";

-- DropIndex
DROP INDEX "Report_status_idx";

-- DropIndex
DROP INDEX "Report_studyId_idx";

-- DropIndex
DROP INDEX "Series_modality_idx";

-- DropIndex
DROP INDEX "Series_seriesInstanceUID_idx";

-- DropIndex
DROP INDEX "Series_seriesNumber_idx";

-- DropIndex
DROP INDEX "Series_studyId_idx";

-- DropIndex
DROP INDEX "Session_expiresAt_idx";

-- DropIndex
DROP INDEX "Session_isActive_idx";

-- DropIndex
DROP INDEX "Session_refreshToken_idx";

-- DropIndex
DROP INDEX "Session_token_idx";

-- DropIndex
DROP INDEX "Session_userId_idx";

-- DropIndex
DROP INDEX "Study_accessionNumber_idx";

-- DropIndex
DROP INDEX "Study_modality_idx";

-- DropIndex
DROP INDEX "Study_patientId_idx";

-- DropIndex
DROP INDEX "Study_radiologistId_idx";

-- DropIndex
DROP INDEX "Study_status_idx";

-- DropIndex
DROP INDEX "Study_studyDate_idx";

-- DropIndex
DROP INDEX "Study_studyInstanceUID_idx";

-- DropIndex
DROP INDEX "Study_technologistId_idx";

-- DropIndex
DROP INDEX "User_email_idx";

-- DropIndex
DROP INDEX "User_ihiNumber_idx";

-- DropIndex
DROP INDEX "User_medicareNumber_idx";

-- DropIndex
DROP INDEX "User_phoneNumber_idx";

-- DropIndex
DROP INDEX "User_role_idx";

-- AlterTable
ALTER TABLE "Image" DROP COLUMN "acquisitionDate",
DROP COLUMN "acquisitionTime",
DROP COLUMN "bitsAllocated",
DROP COLUMN "bitsStored",
DROP COLUMN "columns",
DROP COLUMN "fileSize",
DROP COLUMN "imageComments",
DROP COLUMN "imageOrientation",
DROP COLUMN "imagePosition",
DROP COLUMN "imageQuality",
DROP COLUMN "jpegUrl",
DROP COLUMN "lossy",
DROP COLUMN "lossyMethod",
DROP COLUMN "metadata",
DROP COLUMN "photometricInterpretation",
DROP COLUMN "pixelRepresentation",
DROP COLUMN "pixelSpacing",
DROP COLUMN "rows",
DROP COLUMN "sliceLocation",
DROP COLUMN "sliceThickness",
DROP COLUMN "sopClassUID",
DROP COLUMN "transferSyntax",
DROP COLUMN "updatedAt",
DROP COLUMN "windowCenter",
DROP COLUMN "windowCenterWidthExplanation",
DROP COLUMN "windowWidth",
ALTER COLUMN "instanceNumber" SET NOT NULL;

-- AlterTable
ALTER TABLE "Patient" DROP COLUMN "allowEmailReminders",
DROP COLUMN "allowPostalMail",
DROP COLUMN "allowResearch",
DROP COLUMN "allowSmsReminders",
DROP COLUMN "currentMedications",
DROP COLUMN "familyHistory",
DROP COLUMN "homePhone",
DROP COLUMN "medicalConditions",
DROP COLUMN "medicalHistory",
DROP COLUMN "mrn",
DROP COLUMN "nextOfKinAddress",
DROP COLUMN "nextOfKinName",
DROP COLUMN "nextOfKinPhone",
DROP COLUMN "nextOfKinRelationship",
DROP COLUMN "preferredContactMethod",
DROP COLUMN "privateHealthInsurer",
DROP COLUMN "privateHealthNumber",
DROP COLUMN "referringGpId",
DROP COLUMN "shareWithFamilyGp",
DROP COLUMN "socialHistory",
DROP COLUMN "tpClaim",
DROP COLUMN "workPhone",
DROP COLUMN "workersCompClaim",
ADD COLUMN     "dateOfBirth" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "ihi" TEXT,
ADD COLUMN     "medicareNumber" TEXT,
ADD COLUMN     "medications" TEXT,
DROP COLUMN "state",
ADD COLUMN     "state" TEXT,
ALTER COLUMN "allergies" DROP NOT NULL,
ALTER COLUMN "allergies" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Report" DROP COLUMN "amendmentReason",
DROP COLUMN "audioUrl",
DROP COLUMN "comparison",
DROP COLUMN "complexityScore",
DROP COLUMN "criticalFinding",
DROP COLUMN "criticalNotifiedAt",
DROP COLUMN "criticalNotifiedBy",
DROP COLUMN "criticalNotifiedTo",
DROP COLUMN "isAmended",
DROP COLUMN "limitations",
DROP COLUMN "patientId",
DROP COLUMN "pdfUrl",
DROP COLUMN "previousVersionId",
DROP COLUMN "qaCompletedAt",
DROP COLUMN "qaCompletedBy",
DROP COLUMN "qaRequired",
DROP COLUMN "templateUsed",
DROP COLUMN "transcribedAt",
DROP COLUMN "wordCount",
DROP COLUMN "xmlUrl",
ALTER COLUMN "radiologistId" DROP NOT NULL,
DROP COLUMN "priority",
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'ROUTINE',
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "Series" DROP COLUMN "acquisitionMatrix",
DROP COLUMN "bodyPartExamined",
DROP COLUMN "contrastAgent",
DROP COLUMN "exposureTime",
DROP COLUMN "imageOrientation",
DROP COLUMN "imagePosition",
DROP COLUMN "kvp",
DROP COLUMN "pixelSpacing",
DROP COLUMN "protocolName",
DROP COLUMN "scanOptions",
DROP COLUMN "seriesComments",
DROP COLUMN "seriesDate",
DROP COLUMN "seriesSize",
DROP COLUMN "seriesTime",
DROP COLUMN "sliceThickness",
DROP COLUMN "updatedAt",
DROP COLUMN "xrayTubeCurrent",
ALTER COLUMN "seriesNumber" SET NOT NULL,
DROP COLUMN "modality",
ADD COLUMN     "modality" TEXT NOT NULL,
ALTER COLUMN "numberOfInstances" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "deviceFingerprint",
DROP COLUMN "deviceInfo",
DROP COLUMN "isSecure",
DROP COLUMN "lastActivityAt",
DROP COLUMN "location",
DROP COLUMN "refreshExpiresAt",
DROP COLUMN "terminatedAt",
DROP COLUMN "terminationReason",
DROP COLUMN "twoFactorVerified",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Study" DROP COLUMN "appointmentId",
DROP COLUMN "archivedAt",
DROP COLUMN "clinicalHistory",
DROP COLUMN "deletedAt",
DROP COLUMN "institutionAddress",
DROP COLUMN "manufacturerModel",
DROP COLUMN "operatorName",
DROP COLUMN "radiologistId",
DROP COLUMN "requestedProcedure",
DROP COLUMN "stationName",
DROP COLUMN "studyComments",
DROP COLUMN "studyId",
DROP COLUMN "studySize",
DROP COLUMN "studyTime",
DROP COLUMN "technologistId",
ALTER COLUMN "studyDescription" SET NOT NULL,
DROP COLUMN "modality",
ADD COLUMN     "modality" TEXT NOT NULL,
ALTER COLUMN "bodyPartExamined" SET NOT NULL,
DROP COLUMN "priority",
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'ROUTINE',
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'COMPLETED',
ALTER COLUMN "institutionName" DROP NOT NULL,
ALTER COLUMN "institutionName" DROP DEFAULT,
ALTER COLUMN "numberOfSeries" SET DEFAULT 1,
ALTER COLUMN "numberOfInstances" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "culturalBackground",
DROP COLUMN "dateOfBirth",
DROP COLUMN "dvaNumber",
DROP COLUMN "emergencyContactName",
DROP COLUMN "emergencyContactPhone",
DROP COLUMN "emergencyContactRelationship",
DROP COLUMN "gender",
DROP COLUMN "healthcareCardNumber",
DROP COLUMN "ihiNumber",
DROP COLUMN "isActive",
DROP COLUMN "isDeceased",
DROP COLUMN "lastLoginAt",
DROP COLUMN "medicareExpiryDate",
DROP COLUMN "medicareNumber",
DROP COLUMN "middleName",
DROP COLUMN "pensionNumber",
DROP COLUMN "preferredLanguage",
DROP COLUMN "twoFactorEnabled",
DROP COLUMN "twoFactorSecret",
ALTER COLUMN "email" SET NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'PATIENT',
ALTER COLUMN "passwordHash" SET NOT NULL;

-- DropTable
DROP TABLE "Appointment";

-- DropTable
DROP TABLE "AuditLog";

-- DropTable
DROP TABLE "Consent";

-- DropTable
DROP TABLE "Document";

-- DropTable
DROP TABLE "Invitation";

-- DropTable
DROP TABLE "Notification";

-- DropTable
DROP TABLE "Radiologist";

-- DropTable
DROP TABLE "Referral";

-- DropTable
DROP TABLE "ReferringGP";

-- DropTable
DROP TABLE "SystemSetting";

-- DropTable
DROP TABLE "Technologist";

-- DropEnum
DROP TYPE "AccessLevel";

-- DropEnum
DROP TYPE "AppointmentStatus";

-- DropEnum
DROP TYPE "AuditAction";

-- DropEnum
DROP TYPE "AuditCategory";

-- DropEnum
DROP TYPE "AuditEntity";

-- DropEnum
DROP TYPE "AustralianState";

-- DropEnum
DROP TYPE "ConsentMethod";

-- DropEnum
DROP TYPE "ConsentType";

-- DropEnum
DROP TYPE "ContactMethod";

-- DropEnum
DROP TYPE "DeliveryStatus";

-- DropEnum
DROP TYPE "DocumentCategory";

-- DropEnum
DROP TYPE "DocumentType";

-- DropEnum
DROP TYPE "Environment";

-- DropEnum
DROP TYPE "Gender";

-- DropEnum
DROP TYPE "InvitationType";

-- DropEnum
DROP TYPE "LogSeverity";

-- DropEnum
DROP TYPE "Modality";

-- DropEnum
DROP TYPE "NotificationCategory";

-- DropEnum
DROP TYPE "NotificationType";

-- DropEnum
DROP TYPE "Priority";

-- DropEnum
DROP TYPE "ReportStatus";

-- DropEnum
DROP TYPE "ScanType";

-- DropEnum
DROP TYPE "SessionTerminationReason";

-- DropEnum
DROP TYPE "SettingDataType";

-- DropEnum
DROP TYPE "StudyStatus";

-- DropEnum
DROP TYPE "UserRole";

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
