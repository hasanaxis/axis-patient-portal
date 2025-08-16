import { PrismaClient } from '@prisma/client'
import { addMinutes, addHours } from 'date-fns'

export interface DeliveryStatus {
  id: string
  status: 'sent' | 'delivered' | 'failed' | 'undelivered' | 'pending'
  errorCode?: string
  errorMessage?: string
  deliveredAt?: Date
  retryCount: number
  lastRetryAt?: Date
}

export class SMSDeliveryTracker {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async trackMessage(smsId: string, twilioSid: string): Promise<void> {
    await this.prisma.sMSDeliveryTracking.create({
      data: {
        smsNotificationId: smsId,
        twilioSid: twilioSid,
        status: 'sent',
        trackedAt: new Date()
      }
    })
  }

  async updateDeliveryStatus(
    twilioSid: string, 
    status: string, 
    errorMessage?: string
  ): Promise<void> {
    const deliveryStatus = this.mapTwilioStatus(status)
    const updateData: any = {
      status: deliveryStatus,
      lastUpdatedAt: new Date()
    }

    if (deliveryStatus === 'delivered') {
      updateData.deliveredAt = new Date()
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage
      updateData.errorCode = this.extractErrorCode(errorMessage)
    }

    // Update tracking record
    await this.prisma.sMSDeliveryTracking.update({
      where: { twilioSid },
      data: updateData
    })

    // Also update the main SMS notification record
    await this.prisma.sMSNotification.updateMany({
      where: { twilioSid },
      data: {
        deliveryStatus: deliveryStatus,
        deliveredAt: deliveryStatus === 'delivered' ? new Date() : undefined
      }
    })
  }

  async getDeliveryStatus(smsId: string): Promise<DeliveryStatus | null> {
    const tracking = await this.prisma.sMSDeliveryTracking.findFirst({
      where: { smsNotificationId: smsId },
      orderBy: { trackedAt: 'desc' }
    })

    if (!tracking) return null

    return {
      id: tracking.id,
      status: tracking.status as any,
      errorCode: tracking.errorCode || undefined,
      errorMessage: tracking.errorMessage || undefined,
      deliveredAt: tracking.deliveredAt || undefined,
      retryCount: tracking.retryCount,
      lastRetryAt: tracking.lastRetryAt || undefined
    }
  }

  async getFailedMessages(hoursBack: number = 24): Promise<any[]> {
    const cutoffTime = addHours(new Date(), -hoursBack)
    
    return this.prisma.sMSNotification.findMany({
      where: {
        status: 'failed',
        createdAt: {
          gte: cutoffTime
        },
        retryCount: {
          lt: 3 // Max retries
        }
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  async getDeliveryReport(startDate: Date, endDate: Date): Promise<any> {
    const totalSent = await this.prisma.sMSNotification.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: { in: ['sent', 'delivered', 'failed'] }
      }
    })

    const delivered = await this.prisma.sMSNotification.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        deliveryStatus: 'delivered'
      }
    })

    const failed = await this.prisma.sMSNotification.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: 'failed'
      }
    })

    const byTemplate = await this.prisma.sMSNotification.groupBy({
      by: ['templateType'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: {
        id: true
      }
    })

    const failureReasons = await this.prisma.sMSDeliveryTracking.groupBy({
      by: ['errorCode'],
      where: {
        trackedAt: {
          gte: startDate,
          lte: endDate
        },
        status: 'failed'
      },
      _count: {
        id: true
      }
    })

    return {
      period: { startDate, endDate },
      summary: {
        totalSent,
        delivered,
        failed,
        deliveryRate: totalSent > 0 ? ((delivered / totalSent) * 100).toFixed(2) : 0,
        failureRate: totalSent > 0 ? ((failed / totalSent) * 100).toFixed(2) : 0
      },
      byTemplate: byTemplate.map(item => ({
        templateType: item.templateType,
        count: item._count.id
      })),
      failureReasons: failureReasons.map(item => ({
        errorCode: item.errorCode,
        count: item._count.id
      }))
    }
  }

  async scheduleRetry(smsId: string, retryAt: Date): Promise<void> {
    await this.prisma.sMSNotification.update({
      where: { id: smsId },
      data: {
        status: 'scheduled',
        scheduledAt: retryAt,
        retryCount: {
          increment: 1
        }
      }
    })

    await this.prisma.sMSDeliveryTracking.updateMany({
      where: { smsNotificationId: smsId },
      data: {
        lastRetryAt: new Date(),
        retryCount: {
          increment: 1
        }
      }
    })
  }

  async markAsUndeliverable(smsId: string, reason: string): Promise<void> {
    await this.prisma.sMSNotification.update({
      where: { id: smsId },
      data: {
        status: 'failed',
        error: `Undeliverable: ${reason}`,
        retryCount: 999 // Prevent further retries
      }
    })

    await this.prisma.sMSDeliveryTracking.updateMany({
      where: { smsNotificationId: smsId },
      data: {
        status: 'undelivered',
        errorMessage: reason,
        lastUpdatedAt: new Date()
      }
    })
  }

  private mapTwilioStatus(twilioStatus: string): string {
    const statusMap: Record<string, string> = {
      'queued': 'pending',
      'sent': 'sent',
      'delivered': 'delivered',
      'failed': 'failed',
      'undelivered': 'failed'
    }

    return statusMap[twilioStatus.toLowerCase()] || 'pending'
  }

  private extractErrorCode(errorMessage: string): string | null {
    // Extract Twilio error codes from error messages
    const errorCodeMatch = errorMessage.match(/Error (\d+)/)
    if (errorCodeMatch) {
      return errorCodeMatch[1]
    }

    // Common error patterns
    if (errorMessage.toLowerCase().includes('invalid phone number')) {
      return 'INVALID_PHONE'
    }
    if (errorMessage.toLowerCase().includes('opt out') || errorMessage.toLowerCase().includes('unsubscribed')) {
      return 'OPTED_OUT'
    }
    if (errorMessage.toLowerCase().includes('blocked')) {
      return 'BLOCKED'
    }
    if (errorMessage.toLowerCase().includes('rate limit')) {
      return 'RATE_LIMITED'
    }

    return null
  }

  // Cleanup old tracking data
  async cleanupOldTrackingData(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = addHours(new Date(), -(daysToKeep * 24))
    
    const result = await this.prisma.sMSDeliveryTracking.deleteMany({
      where: {
        trackedAt: {
          lt: cutoffDate
        }
      }
    })

    return result.count
  }
}