// Security Monitoring Service for Healthcare Applications
// Implements real-time threat detection and incident response

import { PrismaClient } from '@prisma/client'
import { AuditLogger } from './audit-logger'
import { EventEmitter } from 'events'
import geoip from 'geoip-lite'
import crypto from 'crypto'

export class SecurityMonitor extends EventEmitter {
  private readonly suspiciousActivityThresholds = {
    failedLoginsPerMinute: 5,
    failedLoginsPerHour: 20,
    maxLoginAttemptsFromSameIP: 10,
    maxConcurrentSessions: 3,
    maxDataAccessesPerMinute: 50,
    maxAPICallsPerMinute: 100,
    suspiciousGeoDistance: 1000, // km
    suspiciousLocationChange: 30 * 60 * 1000 // 30 minutes
  }

  private readonly intrusionPatterns = [
    /sql\s*injection/i,
    /<script/i,
    /union\s+select/i,
    /exec\s*\(/i,
    /javascript:/i,
    /vbscript:/i,
    /<iframe/i,
    /onclick\s*=/i,
    /onerror\s*=/i,
    /onload\s*=/i
  ]

  private readonly suspiciousUserAgents = [
    /sqlmap/i,
    /nikto/i,
    /burp/i,
    /nessus/i,
    /masscan/i,
    /nmap/i,
    /dirb/i,
    /gobuster/i,
    /whatweb/i
  ]

  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogger: AuditLogger
  ) {
    super()
    this.setupEventHandlers()
  }

  /**
   * Monitor authentication attempts for suspicious activity
   */
  async monitorAuthentication(event: AuthenticationMonitorEvent): Promise<SecurityAssessment> {
    const assessment: SecurityAssessment = {
      riskLevel: 'LOW',
      threats: [],
      recommendations: []
    }

    try {
      // Check for brute force attacks
      const bruteForceRisk = await this.checkBruteForceAttack(event.ipAddress, event.email)
      if (bruteForceRisk.detected) {
        assessment.riskLevel = 'HIGH'
        assessment.threats.push({
          type: 'BRUTE_FORCE_ATTACK',
          severity: 'HIGH',
          description: 'Multiple failed login attempts detected',
          indicators: bruteForceRisk.indicators
        })
      }

      // Check for credential stuffing
      const credentialStuffingRisk = await this.checkCredentialStuffing(event.ipAddress)
      if (credentialStuffingRisk.detected) {
        assessment.riskLevel = 'HIGH'
        assessment.threats.push({
          type: 'CREDENTIAL_STUFFING',
          severity: 'HIGH',
          description: 'Suspicious login patterns across multiple accounts',
          indicators: credentialStuffingRisk.indicators
        })
      }

      // Check for suspicious user agents
      if (this.isSuspiciousUserAgent(event.userAgent)) {
        assessment.riskLevel = 'MEDIUM'
        assessment.threats.push({
          type: 'SUSPICIOUS_USER_AGENT',
          severity: 'MEDIUM',
          description: 'User agent associated with security tools',
          indicators: [event.userAgent]
        })
      }

      // Check geographical anomalies
      const geoRisk = await this.checkGeographicalAnomaly(event.userId, event.ipAddress)
      if (geoRisk.detected) {
        assessment.riskLevel = assessment.riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM'
        assessment.threats.push({
          type: 'GEOGRAPHICAL_ANOMALY',
          severity: 'MEDIUM',
          description: 'Login from unusual geographical location',
          indicators: geoRisk.indicators
        })
      }

      // Log security assessment
      await this.auditLogger.logSecurityEvent({
        event: 'AUTHENTICATION_SECURITY_ASSESSMENT',
        userId: event.userId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        details: {
          riskLevel: assessment.riskLevel,
          threatsDetected: assessment.threats.length,
          email: event.email
        }
      })

      // Emit security events for real-time response
      if (assessment.riskLevel === 'HIGH') {
        this.emit('highRiskAuthentication', {
          userId: event.userId,
          ipAddress: event.ipAddress,
          threats: assessment.threats
        })
      }

      return assessment
    } catch (error) {
      await this.auditLogger.logSecurityEvent({
        event: 'SECURITY_MONITORING_ERROR',
        userId: event.userId,
        ipAddress: event.ipAddress,
        details: { error: error.message, function: 'monitorAuthentication' }
      })
      
      return {
        riskLevel: 'UNKNOWN',
        threats: [],
        recommendations: ['Manual security review required due to monitoring error']
      }
    }
  }

  /**
   * Monitor data access patterns for anomalies
   */
  async monitorDataAccess(event: DataAccessMonitorEvent): Promise<SecurityAssessment> {
    const assessment: SecurityAssessment = {
      riskLevel: 'LOW',
      threats: [],
      recommendations: []
    }

    try {
      // Check for excessive data access
      const excessiveAccessRisk = await this.checkExcessiveDataAccess(event.userId, event.resourceType)
      if (excessiveAccessRisk.detected) {
        assessment.riskLevel = 'MEDIUM'
        assessment.threats.push({
          type: 'EXCESSIVE_DATA_ACCESS',
          severity: 'MEDIUM',
          description: 'Unusual volume of data access detected',
          indicators: excessiveAccessRisk.indicators
        })
      }

      // Check for unauthorized patient data access
      const unauthorizedAccessRisk = await this.checkUnauthorizedPatientAccess(event.userId, event.patientId)
      if (unauthorizedAccessRisk.detected) {
        assessment.riskLevel = 'HIGH'
        assessment.threats.push({
          type: 'UNAUTHORIZED_ACCESS',
          severity: 'HIGH',
          description: 'Access to patient data without authorization',
          indicators: unauthorizedAccessRisk.indicators
        })
      }

      // Check for data scraping patterns
      const scrapingRisk = await this.checkDataScrapingPatterns(event.ipAddress, event.sessionId)
      if (scrapingRisk.detected) {
        assessment.riskLevel = 'HIGH'
        assessment.threats.push({
          type: 'DATA_SCRAPING',
          severity: 'HIGH',
          description: 'Automated data extraction detected',
          indicators: scrapingRisk.indicators
        })
      }

      // Check for privilege escalation attempts
      const privilegeEscalationRisk = await this.checkPrivilegeEscalation(event.userId, event.action)
      if (privilegeEscalationRisk.detected) {
        assessment.riskLevel = 'HIGH'
        assessment.threats.push({
          type: 'PRIVILEGE_ESCALATION',
          severity: 'HIGH',
          description: 'Attempt to access higher privilege resources',
          indicators: privilegeEscalationRisk.indicators
        })
      }

      // Log data access security assessment
      await this.auditLogger.logSecurityEvent({
        event: 'DATA_ACCESS_SECURITY_ASSESSMENT',
        userId: event.userId,
        ipAddress: event.ipAddress,
        details: {
          riskLevel: assessment.riskLevel,
          threatsDetected: assessment.threats.length,
          resourceType: event.resourceType,
          action: event.action
        }
      })

      return assessment
    } catch (error) {
      await this.auditLogger.logSecurityEvent({
        event: 'SECURITY_MONITORING_ERROR',
        userId: event.userId,
        ipAddress: event.ipAddress,
        details: { error: error.message, function: 'monitorDataAccess' }
      })
      
      return {
        riskLevel: 'UNKNOWN',
        threats: [],
        recommendations: ['Manual security review required due to monitoring error']
      }
    }
  }

  /**
   * Monitor API usage for security threats
   */
  async monitorAPIUsage(event: APIMonitorEvent): Promise<SecurityAssessment> {
    const assessment: SecurityAssessment = {
      riskLevel: 'LOW',
      threats: [],
      recommendations: []
    }

    try {
      // Check for injection attacks
      const injectionRisk = this.checkInjectionAttempts(event.requestData)
      if (injectionRisk.detected) {
        assessment.riskLevel = 'HIGH'
        assessment.threats.push({
          type: 'INJECTION_ATTACK',
          severity: 'HIGH',
          description: 'Potential injection attack detected in request',
          indicators: injectionRisk.indicators
        })
      }

      // Check for API abuse
      const apiAbuseRisk = await this.checkAPIAbuse(event.ipAddress, event.endpoint)
      if (apiAbuseRisk.detected) {
        assessment.riskLevel = 'MEDIUM'
        assessment.threats.push({
          type: 'API_ABUSE',
          severity: 'MEDIUM',
          description: 'Excessive API usage detected',
          indicators: apiAbuseRisk.indicators
        })
      }

      // Check for enumeration attacks
      const enumerationRisk = await this.checkEnumerationAttack(event.ipAddress, event.endpoint, event.responseStatus)
      if (enumerationRisk.detected) {
        assessment.riskLevel = 'MEDIUM'
        assessment.threats.push({
          type: 'ENUMERATION_ATTACK',
          severity: 'MEDIUM',
          description: 'Resource enumeration attempt detected',
          indicators: enumerationRisk.indicators
        })
      }

      // Log API security assessment
      await this.auditLogger.logSecurityEvent({
        event: 'API_SECURITY_ASSESSMENT',
        userId: event.userId,
        ipAddress: event.ipAddress,
        details: {
          riskLevel: assessment.riskLevel,
          threatsDetected: assessment.threats.length,
          endpoint: event.endpoint,
          method: event.method
        }
      })

      return assessment
    } catch (error) {
      await this.auditLogger.logSecurityEvent({
        event: 'SECURITY_MONITORING_ERROR',
        userId: event.userId,
        ipAddress: event.ipAddress,
        details: { error: error.message, function: 'monitorAPIUsage' }
      })
      
      return {
        riskLevel: 'UNKNOWN',
        threats: [],
        recommendations: ['Manual security review required due to monitoring error']
      }
    }
  }

  /**
   * Check for suspicious activity across user sessions
   */
  async checkSuspiciousActivity(
    userId: string, 
    ipAddress: string, 
    userAgent: string, 
    deviceFingerprint?: string
  ): Promise<SuspiciousActivityResult> {
    try {
      const suspiciousIndicators: string[] = []
      let riskScore = 0

      // Check for rapid location changes
      const locationChange = await this.checkRapidLocationChange(userId, ipAddress)
      if (locationChange.suspicious) {
        suspiciousIndicators.push('Rapid geographical location change')
        riskScore += 30
      }

      // Check for device fingerprint anomalies
      if (deviceFingerprint) {
        const deviceAnomaly = await this.checkDeviceFingerprint(userId, deviceFingerprint)
        if (deviceAnomaly.suspicious) {
          suspiciousIndicators.push('Unknown device fingerprint')
          riskScore += 20
        }
      }

      // Check for unusual access patterns
      const accessPattern = await this.checkAccessPatterns(userId)
      if (accessPattern.suspicious) {
        suspiciousIndicators.push('Unusual access patterns detected')
        riskScore += 25
      }

      // Check for concurrent sessions from different locations
      const concurrentSessions = await this.checkConcurrentSessions(userId, ipAddress)
      if (concurrentSessions.suspicious) {
        suspiciousIndicators.push('Multiple concurrent sessions from different locations')
        riskScore += 35
      }

      const isSuspicious = riskScore >= 50 || suspiciousIndicators.length >= 2

      if (isSuspicious) {
        await this.auditLogger.logSecurityEvent({
          event: 'SUSPICIOUS_ACTIVITY_DETECTED',
          userId,
          ipAddress,
          userAgent,
          details: {
            riskScore,
            indicators: suspiciousIndicators,
            deviceFingerprint
          }
        })

        // Emit real-time alert
        this.emit('suspiciousActivity', {
          userId,
          ipAddress,
          riskScore,
          indicators: suspiciousIndicators
        })
      }

      return {
        suspicious: isSuspicious,
        riskScore,
        indicators: suspiciousIndicators,
        recommendedActions: this.getRecommendedActions(riskScore)
      }
    } catch (error) {
      await this.auditLogger.logSecurityEvent({
        event: 'SUSPICIOUS_ACTIVITY_CHECK_ERROR',
        userId,
        ipAddress,
        details: { error: error.message }
      })
      
      return {
        suspicious: false,
        riskScore: 0,
        indicators: [],
        recommendedActions: ['Manual review due to monitoring error']
      }
    }
  }

  /**
   * Check for brute force attacks
   */
  async checkBruteForceAttack(ipAddress: string, email?: string): Promise<ThreatDetectionResult> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000)

    // Check failed logins from IP address
    const ipFailedLogins = await this.prisma.auditLog.count({
      where: {
        eventType: 'AUTHENTICATION',
        action: 'LOGIN_FAILED',
        ipAddress,
        timestamp: { gte: oneHourAgo },
        success: false
      }
    })

    // Check failed logins per minute
    const recentFailedLogins = await this.prisma.auditLog.count({
      where: {
        eventType: 'AUTHENTICATION',
        action: 'LOGIN_FAILED',
        ipAddress,
        timestamp: { gte: oneMinuteAgo },
        success: false
      }
    })

    const detected = ipFailedLogins >= this.suspiciousActivityThresholds.failedLoginsPerHour ||
                     recentFailedLogins >= this.suspiciousActivityThresholds.failedLoginsPerMinute

    if (detected) {
      // Store brute force detection
      await this.prisma.securityIncident.create({
        data: {
          id: crypto.randomUUID(),
          type: 'BRUTE_FORCE_ATTACK',
          severity: 'HIGH',
          ipAddress,
          details: {
            failedLoginsLastHour: ipFailedLogins,
            failedLoginsLastMinute: recentFailedLogins,
            email
          },
          detectedAt: new Date(),
          status: 'ACTIVE'
        }
      })
    }

    return {
      detected,
      indicators: detected ? [
        `${ipFailedLogins} failed logins in last hour`,
        `${recentFailedLogins} failed logins in last minute`
      ] : []
    }
  }

  /**
   * Monitor session activity for anomalies
   */
  async monitorSessionActivity(sessionId: string, activity: SessionActivity): Promise<void> {
    try {
      // Update session activity tracking
      await this.prisma.sessionActivity.upsert({
        where: { sessionId },
        update: {
          lastActivity: new Date(),
          activityCount: { increment: 1 },
          lastEndpoint: activity.endpoint,
          lastAction: activity.action
        },
        create: {
          sessionId,
          firstActivity: new Date(),
          lastActivity: new Date(),
          activityCount: 1,
          lastEndpoint: activity.endpoint,
          lastAction: activity.action
        }
      })

      // Check for session hijacking indicators
      const hijackingRisk = await this.checkSessionHijacking(sessionId, activity)
      if (hijackingRisk.detected) {
        await this.auditLogger.logSecurityEvent({
          event: 'POTENTIAL_SESSION_HIJACKING',
          details: {
            sessionId,
            indicators: hijackingRisk.indicators,
            activity
          }
        })

        this.emit('sessionHijacking', {
          sessionId,
          indicators: hijackingRisk.indicators
        })
      }
    } catch (error) {
      await this.auditLogger.logSecurityEvent({
        event: 'SESSION_MONITORING_ERROR',
        details: { error: error.message, sessionId }
      })
    }
  }

  /**
   * Generate security incidents report
   */
  async generateSecurityReport(startDate: Date, endDate: Date): Promise<SecurityReport> {
    const incidents = await this.prisma.securityIncident.findMany({
      where: {
        detectedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { detectedAt: 'desc' }
    })

    const incidentsByType = incidents.reduce((acc, incident) => {
      acc[incident.type] = (acc[incident.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const incidentsBySeverity = incidents.reduce((acc, incident) => {
      acc[incident.severity] = (acc[incident.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topThreats = Object.entries(incidentsByType)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }))

    return {
      period: { startDate, endDate },
      summary: {
        totalIncidents: incidents.length,
        highSeverityIncidents: incidentsBySeverity.HIGH || 0,
        mediumSeverityIncidents: incidentsBySeverity.MEDIUM || 0,
        lowSeverityIncidents: incidentsBySeverity.LOW || 0,
        activeIncidents: incidents.filter(i => i.status === 'ACTIVE').length,
        resolvedIncidents: incidents.filter(i => i.status === 'RESOLVED').length
      },
      incidentsByType,
      incidentsBySeverity,
      topThreats,
      recommendations: this.generateSecurityRecommendations(incidents),
      generatedAt: new Date()
    }
  }

  // Private helper methods

  private setupEventHandlers(): void {
    this.on('highRiskAuthentication', this.handleHighRiskAuthentication.bind(this))
    this.on('suspiciousActivity', this.handleSuspiciousActivity.bind(this))
    this.on('sessionHijacking', this.handleSessionHijacking.bind(this))
  }

  private async handleHighRiskAuthentication(event: any): Promise<void> {
    // Implement immediate response to high-risk authentication
    // e.g., require additional verification, lock account, notify administrators
    console.log('High-risk authentication detected:', event)
  }

  private async handleSuspiciousActivity(event: any): Promise<void> {
    // Implement response to suspicious activity
    // e.g., require MFA, limit session scope, alert security team
    console.log('Suspicious activity detected:', event)
  }

  private async handleSessionHijacking(event: any): Promise<void> {
    // Implement immediate response to potential session hijacking
    // e.g., terminate session, require re-authentication, block IP
    console.log('Potential session hijacking detected:', event)
  }

  private async checkCredentialStuffing(ipAddress: string): Promise<ThreatDetectionResult> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    // Check for multiple different email attempts from same IP
    const distinctEmails = await this.prisma.auditLog.findMany({
      where: {
        eventType: 'AUTHENTICATION',
        action: 'LOGIN_FAILED',
        ipAddress,
        timestamp: { gte: oneHourAgo }
      },
      select: { details: true },
      distinct: ['details']
    })

    const detected = distinctEmails.length >= 10 // 10 different emails from same IP

    return {
      detected,
      indicators: detected ? [`${distinctEmails.length} different email attempts from same IP`] : []
    }
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    return this.suspiciousUserAgents.some(pattern => pattern.test(userAgent))
  }

  private async checkGeographicalAnomaly(userId: string, ipAddress: string): Promise<ThreatDetectionResult> {
    const currentLocation = geoip.lookup(ipAddress)
    if (!currentLocation) {
      return { detected: false, indicators: [] }
    }

    // Get user's recent login locations
    const recentLogins = await this.prisma.auditLog.findMany({
      where: {
        userId,
        eventType: 'AUTHENTICATION',
        action: 'LOGIN_SUCCESS',
        timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      },
      orderBy: { timestamp: 'desc' },
      take: 5
    })

    // Check if current location is significantly different from recent locations
    // This is a simplified implementation
    const detected = recentLogins.length > 0 && 
                     !recentLogins.some(login => {
                       const loginLocation = geoip.lookup(login.ipAddress)
                       return loginLocation && 
                              loginLocation.country === currentLocation.country
                     })

    return {
      detected,
      indicators: detected ? [
        `Login from ${currentLocation.country} - unusual for this user`
      ] : []
    }
  }

  private async checkExcessiveDataAccess(userId: string, resourceType: string): Promise<ThreatDetectionResult> {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000)

    const accessCount = await this.prisma.auditLog.count({
      where: {
        userId,
        eventType: 'DATA_ACCESS',
        resource: resourceType,
        timestamp: { gte: oneMinuteAgo }
      }
    })

    const detected = accessCount >= this.suspiciousActivityThresholds.maxDataAccessesPerMinute

    return {
      detected,
      indicators: detected ? [`${accessCount} data accesses in last minute`] : []
    }
  }

  private async checkUnauthorizedPatientAccess(userId: string, patientId?: string): Promise<ThreatDetectionResult> {
    if (!patientId) {
      return { detected: false, indicators: [] }
    }

    // Check if user has authorization to access this patient's data
    const authorized = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        userId: userId
      }
    })

    const detected = !authorized

    return {
      detected,
      indicators: detected ? ['Access to unauthorized patient data'] : []
    }
  }

  private async checkDataScrapingPatterns(ipAddress: string, sessionId?: string): Promise<ThreatDetectionResult> {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000)

    // Check for rapid API calls
    const apiCalls = await this.prisma.auditLog.count({
      where: {
        ipAddress,
        timestamp: { gte: oneMinuteAgo },
        eventType: 'DATA_ACCESS'
      }
    })

    const detected = apiCalls >= this.suspiciousActivityThresholds.maxAPICallsPerMinute

    return {
      detected,
      indicators: detected ? [`${apiCalls} API calls in last minute`] : []
    }
  }

  private async checkPrivilegeEscalation(userId: string, action: string): Promise<ThreatDetectionResult> {
    // Check for attempts to access admin functions
    const adminActions = ['DELETE_USER', 'MODIFY_PERMISSIONS', 'ACCESS_ALL_PATIENTS']
    const detected = adminActions.includes(action)

    return {
      detected,
      indicators: detected ? [`Attempt to perform admin action: ${action}`] : []
    }
  }

  private checkInjectionAttempts(requestData: any): ThreatDetectionResult {
    const dataString = JSON.stringify(requestData).toLowerCase()
    const detectedPatterns = this.intrusionPatterns.filter(pattern => pattern.test(dataString))

    return {
      detected: detectedPatterns.length > 0,
      indicators: detectedPatterns.map(pattern => `Injection pattern detected: ${pattern}`)
    }
  }

  private async checkAPIAbuse(ipAddress: string, endpoint: string): Promise<ThreatDetectionResult> {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000)

    const requestCount = await this.prisma.auditLog.count({
      where: {
        ipAddress,
        action: { contains: endpoint },
        timestamp: { gte: oneMinuteAgo }
      }
    })

    const detected = requestCount >= this.suspiciousActivityThresholds.maxAPICallsPerMinute

    return {
      detected,
      indicators: detected ? [`${requestCount} requests to ${endpoint} in last minute`] : []
    }
  }

  private async checkEnumerationAttack(ipAddress: string, endpoint: string, responseStatus: number): Promise<ThreatDetectionResult> {
    if (responseStatus !== 404) {
      return { detected: false, indicators: [] }
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    const notFoundCount = await this.prisma.auditLog.count({
      where: {
        ipAddress,
        action: { contains: endpoint },
        timestamp: { gte: oneHourAgo },
        success: false
      }
    })

    const detected = notFoundCount >= 50 // Many 404s suggests enumeration

    return {
      detected,
      indicators: detected ? [`${notFoundCount} 404 responses from ${endpoint}`] : []
    }
  }

  private async checkRapidLocationChange(userId: string, currentIP: string): Promise<{ suspicious: boolean; indicators?: string[] }> {
    const recentLogin = await this.prisma.auditLog.findFirst({
      where: {
        userId,
        eventType: 'AUTHENTICATION',
        action: 'LOGIN_SUCCESS',
        timestamp: { gte: new Date(Date.now() - this.suspiciousActivityThresholds.suspiciousLocationChange) }
      },
      orderBy: { timestamp: 'desc' }
    })

    if (!recentLogin || recentLogin.ipAddress === currentIP) {
      return { suspicious: false }
    }

    const currentLocation = geoip.lookup(currentIP)
    const previousLocation = geoip.lookup(recentLogin.ipAddress)

    if (!currentLocation || !previousLocation) {
      return { suspicious: false }
    }

    // Calculate distance (simplified)
    const distance = this.calculateDistance(
      currentLocation.ll[0], currentLocation.ll[1],
      previousLocation.ll[0], previousLocation.ll[1]
    )

    const timeDifference = Date.now() - recentLogin.timestamp.getTime()
    const suspicious = distance > this.suspiciousActivityThresholds.suspiciousGeoDistance && 
                      timeDifference < this.suspiciousActivityThresholds.suspiciousLocationChange

    return {
      suspicious,
      indicators: suspicious ? [
        `${Math.round(distance)}km travel in ${Math.round(timeDifference / 60000)} minutes`
      ] : undefined
    }
  }

  private async checkDeviceFingerprint(userId: string, fingerprint: string): Promise<{ suspicious: boolean }> {
    const knownDevice = await this.prisma.userDevice.findFirst({
      where: {
        userId,
        fingerprint
      }
    })

    return { suspicious: !knownDevice }
  }

  private async checkAccessPatterns(userId: string): Promise<{ suspicious: boolean }> {
    // Implement pattern analysis based on historical user behavior
    // This is a simplified implementation
    const recentActivity = await this.prisma.auditLog.count({
      where: {
        userId,
        timestamp: { gte: new Date(Date.now() - 60 * 60 * 1000) }
      }
    })

    return { suspicious: recentActivity > 100 } // Very active user
  }

  private async checkConcurrentSessions(userId: string, currentIP: string): Promise<{ suspicious: boolean }> {
    const activeSessions = await this.prisma.session.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() }
      }
    })

    const differentIPs = new Set(activeSessions.map(s => s.ipAddress))
    
    return { 
      suspicious: differentIPs.size > 1 && !differentIPs.has(currentIP)
    }
  }

  private async checkSessionHijacking(sessionId: string, activity: SessionActivity): Promise<ThreatDetectionResult> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId }
    })

    if (!session) {
      return { detected: false, indicators: [] }
    }

    const indicators: string[] = []

    // Check for IP address changes
    if (session.ipAddress !== activity.ipAddress) {
      indicators.push('IP address changed during session')
    }

    // Check for user agent changes
    if (session.userAgent !== activity.userAgent) {
      indicators.push('User agent changed during session')
    }

    return {
      detected: indicators.length > 0,
      indicators
    }
  }

  private getRecommendedActions(riskScore: number): string[] {
    if (riskScore >= 70) {
      return [
        'Terminate session immediately',
        'Require re-authentication with MFA',
        'Lock account pending investigation',
        'Alert security team'
      ]
    } else if (riskScore >= 50) {
      return [
        'Require additional authentication',
        'Limit session privileges',
        'Monitor activity closely'
      ]
    } else if (riskScore >= 30) {
      return [
        'Request MFA verification',
        'Log detailed activity',
        'Continue monitoring'
      ]
    } else {
      return ['Continue normal monitoring']
    }
  }

  private generateSecurityRecommendations(incidents: any[]): string[] {
    const recommendations: string[] = []

    const highSeverityCount = incidents.filter(i => i.severity === 'HIGH').length
    const bruteForceCount = incidents.filter(i => i.type === 'BRUTE_FORCE_ATTACK').length

    if (highSeverityCount > 5) {
      recommendations.push('Consider implementing additional security controls')
    }

    if (bruteForceCount > 3) {
      recommendations.push('Implement IP-based rate limiting and CAPTCHA')
    }

    if (recommendations.length === 0) {
      recommendations.push('Security posture appears normal')
    }

    return recommendations
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1)
    const dLon = this.deg2rad(lon2 - lon1)
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180)
  }
}

// Type definitions
export interface AuthenticationMonitorEvent {
  userId?: string
  email: string
  ipAddress: string
  userAgent: string
  success: boolean
  timestamp: Date
}

export interface DataAccessMonitorEvent {
  userId: string
  patientId?: string
  resourceType: string
  action: string
  ipAddress: string
  sessionId?: string
  timestamp: Date
}

export interface APIMonitorEvent {
  userId?: string
  ipAddress: string
  endpoint: string
  method: string
  requestData: any
  responseStatus: number
  timestamp: Date
}

export interface SessionActivity {
  ipAddress: string
  userAgent: string
  endpoint: string
  action: string
  timestamp: Date
}

export interface SecurityAssessment {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN'
  threats: SecurityThreat[]
  recommendations: string[]
}

export interface SecurityThreat {
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  description: string
  indicators: string[]
}

export interface ThreatDetectionResult {
  detected: boolean
  indicators: string[]
}

export interface SuspiciousActivityResult {
  suspicious: boolean
  riskScore: number
  indicators: string[]
  recommendedActions: string[]
}

export interface SecurityReport {
  period: { startDate: Date; endDate: Date }
  summary: {
    totalIncidents: number
    highSeverityIncidents: number
    mediumSeverityIncidents: number
    lowSeverityIncidents: number
    activeIncidents: number
    resolvedIncidents: number
  }
  incidentsByType: Record<string, number>
  incidentsBySeverity: Record<string, number>
  topThreats: Array<{ type: string; count: number }>
  recommendations: string[]
  generatedAt: Date
}

export default SecurityMonitor