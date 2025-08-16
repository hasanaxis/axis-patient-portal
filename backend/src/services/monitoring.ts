import fs from 'fs/promises'
import path from 'path'

export class MonitoringService {
  private metricsLog: string
  private performanceLog: string
  private securityLog: string
  
  constructor() {
    const logsDir = path.resolve('./logs')
    this.metricsLog = path.join(logsDir, 'metrics.log')
    this.performanceLog = path.join(logsDir, 'performance.log')
    this.securityLog = path.join(logsDir, 'security.log')
    this.ensureLogDirectories()
  }

  private async ensureLogDirectories() {
    try {
      await fs.mkdir(path.dirname(this.metricsLog), { recursive: true })
      console.log('✅ Monitoring log directories created')
    } catch (error) {
      console.error('❌ Failed to create log directories:', error)
    }
  }

  // System metrics monitoring
  async logSystemMetrics() {
    const metrics = {
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      version: process.version,
      environment: process.env.NODE_ENV || 'development'
    }

    await this.writeLog(this.metricsLog, 'METRICS', metrics)
  }

  // Performance monitoring
  async logPerformance(operation: string, duration: number, details?: any) {
    const performanceLog = {
      timestamp: new Date().toISOString(),
      operation,
      duration,
      details,
      severity: duration > 5000 ? 'SLOW' : duration > 1000 ? 'MODERATE' : 'FAST'
    }

    await this.writeLog(this.performanceLog, 'PERFORMANCE', performanceLog)

    // Alert on slow operations
    if (duration > 10000) {
      console.warn(`🐌 SLOW OPERATION: ${operation} took ${duration}ms`)
    }
  }

  // Security event logging
  async logSecurityEvent(event: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', details?: any) {
    const securityLog = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      details,
      source: 'axis-imaging-api'
    }

    await this.writeLog(this.securityLog, 'SECURITY', securityLog)

    // Alert on high severity events
    if (severity === 'HIGH' || severity === 'CRITICAL') {
      console.error(`🚨 SECURITY ALERT: ${event} - ${severity}`)
    }
  }

  // API usage metrics
  async logAPIUsage(endpoint: string, method: string, statusCode: number, userId?: string) {
    const apiLog = {
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      statusCode,
      userId: userId || 'anonymous',
      success: statusCode >= 200 && statusCode < 300
    }

    await this.writeLog(this.metricsLog, 'API_USAGE', apiLog)
  }

  // Database operation monitoring
  async logDatabaseOperation(operation: string, table: string, duration: number, rowsAffected?: number) {
    const dbLog = {
      timestamp: new Date().toISOString(),
      operation,
      table,
      duration,
      rowsAffected: rowsAffected || 0,
      performance: duration > 1000 ? 'SLOW' : 'NORMAL'
    }

    await this.writeLog(this.performanceLog, 'DATABASE', dbLog)
  }

  // Healthcare compliance logging
  async logPatientAccess(patientId: string, userId: string, action: string, details?: any) {
    const accessLog = {
      timestamp: new Date().toISOString(),
      patientId,
      userId,
      action,
      details,
      compliance: 'HIPAA_EQUIVALENT',
      category: 'PATIENT_DATA_ACCESS'
    }

    await this.writeLog(this.securityLog, 'PATIENT_ACCESS', accessLog)
  }

  // Error tracking
  async logError(error: Error, context?: any) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context,
      severity: 'ERROR'
    }

    await this.writeLog(this.securityLog, 'ERROR', errorLog)
  }

  // Write log entry to file
  private async writeLog(logFile: string, category: string, data: any) {
    try {
      const logEntry = `${new Date().toISOString()} [${category}] ${JSON.stringify(data)}\n`
      await fs.appendFile(logFile, logEntry)
    } catch (error) {
      console.error('Failed to write log:', error)
    }
  }

  // Get system health status
  async getHealthStatus(): Promise<any> {
    try {
      const memory = process.memoryUsage()
      const stats = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          used: Math.round(memory.heapUsed / 1024 / 1024),
          total: Math.round(memory.heapTotal / 1024 / 1024),
          external: Math.round(memory.external / 1024 / 1024)
        },
        cpu: process.cpuUsage(),
        version: process.version,
        environment: process.env.NODE_ENV
      }

      // Check if system is under stress
      if (memory.heapUsed > memory.heapTotal * 0.9) {
        stats.status = 'warning'
        await this.logSecurityEvent('HIGH_MEMORY_USAGE', 'MEDIUM', { memory: stats.memory })
      }

      return stats
    } catch (error) {
      await this.logError(error as Error, { context: 'health_check' })
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      }
    }
  }

  // Get metrics summary
  async getMetricsSummary(): Promise<any> {
    try {
      // In a real implementation, you would aggregate metrics from log files
      // For now, return current system state
      return {
        timestamp: new Date().toISOString(),
        system: await this.getHealthStatus(),
        api: {
          totalRequests: 'N/A', // Would be calculated from logs
          errorRate: 'N/A',
          averageResponseTime: 'N/A'
        },
        database: {
          connections: 'N/A',
          slowQueries: 'N/A',
          errorCount: 'N/A'
        }
      }
    } catch (error) {
      await this.logError(error as Error, { context: 'metrics_summary' })
      return { error: 'Failed to get metrics summary' }
    }
  }

  // Start periodic system monitoring
  startSystemMonitoring(intervalMs: number = 60000) {
    setInterval(async () => {
      await this.logSystemMetrics()
    }, intervalMs)

    console.log(`✅ System monitoring started (interval: ${intervalMs}ms)`)
  }

  // Cleanup old log files
  async cleanupOldLogs(retentionDays: number = 30) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

      // In a real implementation, you would scan log files and remove old entries
      console.log(`Log cleanup: retaining logs newer than ${cutoffDate.toISOString()}`)
    } catch (error) {
      await this.logError(error as Error, { context: 'log_cleanup' })
    }
  }
}

// Performance monitoring decorator
export function monitorPerformance(operation: string) {
  return function (_target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const start = Date.now()
      try {
        const result = await method.apply(this, args)
        const duration = Date.now() - start
        
        if (global.monitoringService) {
          await global.monitoringService.logPerformance(operation, duration, {
            method: propertyName,
            args: args.length
          })
        }
        
        return result
      } catch (error) {
        const duration = Date.now() - start
        
        if (global.monitoringService) {
          await global.monitoringService.logPerformance(operation, duration, {
            method: propertyName,
            error: (error as Error).message
          })
        }
        
        throw error
      }
    }
  }
}

// Create singleton instance
export const monitoringService = new MonitoringService()

// Make available globally for decorators
declare global {
  var monitoringService: MonitoringService | undefined
}
global.monitoringService = monitoringService

export default monitoringService