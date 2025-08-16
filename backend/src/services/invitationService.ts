import { PrismaClient, Patient, Study, Invitation } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { config } from '../config/config';
import { logger, healthcareLogger } from '../utils/logger';
import { smsService } from './smsService';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export interface InvitationData {
  patientId: string;
  studyId?: string;
  sentBy?: string;
  customMessage?: string;
}

export interface InvitationValidation {
  isValid: boolean;
  patient?: Patient;
  invitation?: Invitation;
  errors?: string[];
}

export class InvitationService {
  private static instance: InvitationService;

  private constructor() {}

  public static getInstance(): InvitationService {
    if (!InvitationService.instance) {
      InvitationService.instance = new InvitationService();
    }
    return InvitationService.instance;
  }

  // Generate secure invitation token
  private generateSecureToken(): string {
    // Generate a cryptographically secure random token
    const randomBytes = crypto.randomBytes(32);
    return randomBytes.toString('base64url'); // URL-safe base64
  }

  // Generate short code for SMS (6 digits)
  private generateShortCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Create registration invitation for patient after scan completion
  public async createInvitation(invitationData: InvitationData): Promise<Invitation> {
    const { patientId, studyId, sentBy, customMessage } = invitationData;

    try {
      // Validate patient exists and has completed studies
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          user: true,
          studies: {
            where: {
              status: { in: ['COMPLETED', 'FINAL'] }
            },
            orderBy: { studyDate: 'desc' },
            take: 1
          }
        }
      });

      if (!patient) {
        throw new NotFoundError('Patient not found');
      }

      if (!patient.studies.length) {
        throw new ValidationError('Patient must have at least one completed study before invitation can be sent');
      }

      // Check if patient already has a user account
      if (patient.user.passwordHash) {
        throw new ValidationError('Patient already has an active account');
      }

      // Check if there's already an active invitation for this patient
      const existingInvitation = await prisma.invitation.findFirst({
        where: {
          patientId,
          isUsed: false,
          expiresAt: { gt: new Date() }
        }
      });

      if (existingInvitation) {
        logger.info('Active invitation already exists for patient', { 
          patientId, 
          invitationId: existingInvitation.id 
        });
        return existingInvitation;
      }

      // Generate secure tokens
      const token = this.generateSecureToken();
      const shortCode = this.generateShortCode();

      // Calculate expiration date (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + config.INVITATION_EXPIRES_IN_DAYS);

      // Create invitation record
      const invitation = await prisma.invitation.create({
        data: {
          patientId,
          phoneNumber: patient.user.phoneNumber,
          email: patient.user.email,
          invitationType: 'PORTAL_ACCESS',
          token,
          shortCode,
          expiresAt,
          sentVia: 'SMS',
          sentBy,
          purpose: studyId ? 'Post-scan portal invitation' : 'General portal access invitation',
          metadata: {
            studyId,
            customMessage,
            facilityName: config.FACILITY_NAME,
            createdFor: 'completed_scan'
          }
        }
      });

      // Log invitation creation
      healthcareLogger.systemAccess('INVITATION_CREATED', sentBy, 'INVITATION_SERVICE', {
        invitationId: invitation.id,
        patientId,
        studyId,
        expiresAt: invitation.expiresAt.toISOString()
      });

      logger.info('Patient invitation created', {
        invitationId: invitation.id,
        patientId,
        studyId,
        expiresAt: invitation.expiresAt.toISOString()
      });

      return invitation;

    } catch (error) {
      logger.error('Failed to create invitation', {
        patientId,
        studyId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Send invitation SMS to patient
  public async sendInvitationSMS(invitationId: string): Promise<boolean> {
    try {
      const invitation = await prisma.invitation.findUnique({
        where: { id: invitationId },
        include: {
          patient: {
            include: {
              user: true
            }
          }
        }
      });

      if (!invitation) {
        throw new NotFoundError('Invitation not found');
      }

      if (invitation.isUsed) {
        throw new ValidationError('Invitation has already been used');
      }

      if (invitation.expiresAt < new Date()) {
        throw new ValidationError('Invitation has expired');
      }

      // Generate registration link
      const registrationLink = `${config.REGISTRATION_BASE_URL}?token=${invitation.token}&code=${invitation.shortCode}`;

      // Send SMS invitation
      const smsSuccess = await smsService.sendInvitationSMS(
        invitation.phoneNumber,
        registrationLink
      );

      if (smsSuccess) {
        // Update invitation record
        await prisma.invitation.update({
          where: { id: invitationId },
          data: {
            sentAt: new Date(),
            reminderSentAt: null // Reset reminder tracking
          }
        });

        // Log SMS sent
        healthcareLogger.systemAccess('INVITATION_SMS_SENT', invitation.sentBy, 'SMS_SERVICE', {
          invitationId: invitation.id,
          patientId: invitation.patientId,
          phoneNumber: this.maskPhoneNumber(invitation.phoneNumber)
        });

        logger.info('Invitation SMS sent successfully', {
          invitationId: invitation.id,
          patientId: invitation.patientId
        });
      }

      return smsSuccess;

    } catch (error) {
      logger.error('Failed to send invitation SMS', {
        invitationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Validate invitation token and get patient information
  public async validateInvitation(token: string, shortCode?: string): Promise<InvitationValidation> {
    try {
      const invitation = await prisma.invitation.findFirst({
        where: {
          token,
          ...(shortCode && { shortCode }),
          isUsed: false,
          expiresAt: { gt: new Date() }
        },
        include: {
          patient: {
            include: {
              user: true,
              studies: {
                where: {
                  status: { in: ['COMPLETED', 'FINAL'] }
                },
                orderBy: { studyDate: 'desc' },
                take: 5
              }
            }
          }
        }
      });

      if (!invitation) {
        // Log failed validation attempt
        healthcareLogger.securityIncident('INVALID_INVITATION_ACCESS', 'medium', {
          token: token.substring(0, 8) + '...',
          shortCode,
          timestamp: new Date().toISOString()
        });

        return {
          isValid: false,
          errors: ['Invalid or expired invitation token. Please contact Axis Imaging if you believe this is an error.']
        };
      }

      // Check if patient already has an account
      if (invitation.patient.user.passwordHash) {
        return {
          isValid: false,
          errors: ['You already have an account. Please try logging in instead.']
        };
      }

      // Increment attempt count
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          attemptCount: { increment: 1 }
        }
      });

      // Check max attempts
      if (invitation.attemptCount >= invitation.maxAttempts) {
        healthcareLogger.securityIncident('INVITATION_MAX_ATTEMPTS_EXCEEDED', 'high', {
          invitationId: invitation.id,
          patientId: invitation.patientId,
          attemptCount: invitation.attemptCount
        });

        return {
          isValid: false,
          errors: ['Too many access attempts. Please contact Axis Imaging for a new invitation.']
        };
      }

      // Log successful validation
      healthcareLogger.systemAccess('INVITATION_VALIDATED', undefined, 'INVITATION_SERVICE', {
        invitationId: invitation.id,
        patientId: invitation.patientId,
        attemptCount: invitation.attemptCount + 1
      });

      return {
        isValid: true,
        patient: invitation.patient,
        invitation
      };

    } catch (error) {
      logger.error('Invitation validation failed', {
        token: token.substring(0, 8) + '...',
        shortCode,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        isValid: false,
        errors: ['An error occurred while validating the invitation. Please try again.']
      };
    }
  }

  // Auto-generate invitations for completed studies
  public async autoGenerateInvitationsForCompletedStudies(): Promise<void> {
    try {
      // Find studies completed in the last 24 hours where patient doesn't have portal access
      const recentCompletedStudies = await prisma.study.findMany({
        where: {
          status: 'COMPLETED',
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          },
          patient: {
            user: {
              passwordHash: null // No password set = no portal access
            },
            invitations: {
              none: {
                isUsed: false,
                expiresAt: { gt: new Date() }
              }
            }
          }
        },
        include: {
          patient: {
            include: {
              user: true,
              invitations: true
            }
          }
        }
      });

      logger.info('Auto-generating invitations for completed studies', {
        studiesFound: recentCompletedStudies.length
      });

      for (const study of recentCompletedStudies) {
        try {
          // Create invitation
          const invitation = await this.createInvitation({
            patientId: study.patientId,
            studyId: study.id,
            sentBy: 'SYSTEM_AUTO'
          });

          // Send SMS invitation
          await this.sendInvitationSMS(invitation.id);

          logger.info('Auto-generated invitation sent', {
            studyId: study.id,
            patientId: study.patientId,
            invitationId: invitation.id
          });

        } catch (error) {
          logger.error('Failed to auto-generate invitation for study', {
            studyId: study.id,
            patientId: study.patientId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

    } catch (error) {
      logger.error('Auto-invitation generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Send reminder for unused invitations (after 7 days)
  public async sendInvitationReminders(): Promise<void> {
    try {
      const reminderThreshold = new Date();
      reminderThreshold.setDate(reminderThreshold.getDate() - 7); // 7 days ago

      const pendingInvitations = await prisma.invitation.findMany({
        where: {
          isUsed: false,
          expiresAt: { gt: new Date() },
          sentAt: { lt: reminderThreshold },
          reminderSentAt: null // No reminder sent yet
        },
        include: {
          patient: {
            include: {
              user: true
            }
          }
        }
      });

      logger.info('Sending invitation reminders', {
        invitationsFound: pendingInvitations.length
      });

      for (const invitation of pendingInvitations) {
        try {
          // Generate reminder registration link
          const registrationLink = `${config.REGISTRATION_BASE_URL}?token=${invitation.token}&code=${invitation.shortCode}`;

          // Send reminder SMS
          const reminderTemplate = {
            type: 'invitation' as const,
            message: 'Reminder: Your scan results are ready at Axis Imaging. Complete your portal registration: {{registrationLink}} (expires {{daysLeft}} days)'
          };

          const daysLeft = Math.ceil((invitation.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          
          const smsSuccess = await smsService.sendSMS(
            invitation.phoneNumber,
            reminderTemplate,
            { 
              registrationLink,
              daysLeft: daysLeft.toString()
            }
          );

          if (smsSuccess) {
            // Mark reminder as sent
            await prisma.invitation.update({
              where: { id: invitation.id },
              data: { reminderSentAt: new Date() }
            });

            logger.info('Invitation reminder sent', {
              invitationId: invitation.id,
              patientId: invitation.patientId
            });
          }

        } catch (error) {
          logger.error('Failed to send invitation reminder', {
            invitationId: invitation.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

    } catch (error) {
      logger.error('Invitation reminder process failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Clean up expired invitations
  public async cleanupExpiredInvitations(): Promise<void> {
    try {
      const expiredCount = await prisma.invitation.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
          isUsed: false
        }
      });

      logger.info('Cleaned up expired invitations', {
        deletedCount: expiredCount.count
      });

    } catch (error) {
      logger.error('Failed to clean up expired invitations', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get invitation statistics
  public async getInvitationStats(): Promise<any> {
    try {
      const [total, active, used, expired] = await Promise.all([
        prisma.invitation.count(),
        prisma.invitation.count({
          where: {
            isUsed: false,
            expiresAt: { gt: new Date() }
          }
        }),
        prisma.invitation.count({
          where: { isUsed: true }
        }),
        prisma.invitation.count({
          where: {
            isUsed: false,
            expiresAt: { lt: new Date() }
          }
        })
      ]);

      return {
        total,
        active,
        used,
        expired,
        usageRate: total > 0 ? ((used / total) * 100).toFixed(2) : 0
      };

    } catch (error) {
      logger.error('Failed to get invitation statistics', { error });
      throw error;
    }
  }

  // Mask phone number for logging
  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length > 6) {
      return `${phoneNumber.substring(0, 4)}***${phoneNumber.substring(phoneNumber.length - 2)}`;
    }
    return '***';
  }
}

export const invitationService = InvitationService.getInstance();
export default invitationService;