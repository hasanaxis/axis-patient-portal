import { z } from 'zod';
import { UserRole, AppointmentStatus, ScanType, ReportStatus } from './types';

const phoneRegex = /^(\+61|0)[2-478][\d]{8}$/;
const medicareRegex = /^[\d]{10}[\d]?$/;

export const userSchema = z.object({
  phoneNumber: z.string().regex(phoneRegex, 'Invalid Australian phone number'),
  email: z.string().email().optional(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  dateOfBirth: z.date().or(z.string().transform(str => new Date(str))),
  medicareNumber: z.string().regex(medicareRegex, 'Invalid Medicare number').optional(),
  role: z.nativeEnum(UserRole).default(UserRole.PATIENT)
});

export const loginSchema = z.object({
  phoneNumber: z.string().regex(phoneRegex, 'Invalid Australian phone number'),
  verificationCode: z.string().length(6, 'Verification code must be 6 digits')
});

export const verifyPhoneSchema = z.object({
  phoneNumber: z.string().regex(phoneRegex, 'Invalid Australian phone number')
});

export const appointmentSchema = z.object({
  scanType: z.nativeEnum(ScanType),
  scheduledAt: z.date().or(z.string().transform(str => new Date(str))),
  duration: z.number().min(15).max(120).default(30),
  referralId: z.string().uuid().optional(),
  notes: z.string().max(500).optional()
});

export const updateAppointmentSchema = z.object({
  scheduledAt: z.date().or(z.string().transform(str => new Date(str))).optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  notes: z.string().max(500).optional()
});

export const referralSchema = z.object({
  referringGpId: z.string().uuid(),
  patientName: z.string().min(1).max(100),
  patientPhone: z.string().regex(phoneRegex, 'Invalid Australian phone number'),
  scanType: z.nativeEnum(ScanType),
  clinicalHistory: z.string().min(1).max(2000),
  urgency: z.enum(['URGENT', 'ROUTINE']).default('ROUTINE'),
  referralDate: z.date().or(z.string().transform(str => new Date(str))),
  expiryDate: z.date().or(z.string().transform(str => new Date(str)))
});

export const reportSchema = z.object({
  findings: z.string().min(1).max(5000),
  impression: z.string().min(1).max(2000),
  recommendations: z.string().max(1000).optional(),
  status: z.nativeEnum(ReportStatus).default(ReportStatus.PENDING)
});

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const searchSchema = z.object({
  query: z.string().min(1).max(100),
  filters: z.record(z.any()).optional(),
  ...paginationSchema.shape
});

export type UserInput = z.infer<typeof userSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyPhoneInput = z.infer<typeof verifyPhoneSchema>;
export type AppointmentInput = z.infer<typeof appointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type ReferralInput = z.infer<typeof referralSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SearchInput = z.infer<typeof searchSchema>;