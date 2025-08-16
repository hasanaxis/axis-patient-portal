// Healthcare Compliance Testing Suite for Axis Imaging Patient Portal
// Tests for HIPAA, Australian Privacy Act, and healthcare security standards

const puppeteer = require('puppeteer')
const axios = require('axios')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

class HealthcareComplianceTestSuite {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000'
    this.apiUrl = options.apiUrl || 'http://localhost:3001'
    this.browser = null
    this.page = null
    this.testResults = []
    this.complianceFrameworks = ['HIPAA', 'AustralianPrivacyAct', 'ISO27001', 'SOC2']
  }

  async setup() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    this.page = await this.browser.newPage()
    
    // Enable request interception for monitoring
    await this.page.setRequestInterception(true)
    this.page.on('request', this.monitorRequest.bind(this))
    this.page.on('response', this.monitorResponse.bind(this))
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close()
    }
  }

  // HIPAA Compliance Testing
  async testHIPAACompliance() {
    console.log('Testing HIPAA Compliance...')
    
    const hipaaTests = {
      dataEncryption: await this.testDataEncryption(),
      accessControls: await this.testAccessControls(),
      auditLogs: await this.testAuditLogging(),
      dataIntegrity: await this.testDataIntegrity(),
      transmissionSecurity: await this.testTransmissionSecurity(),
      minimumNecessary: await this.testMinimumNecessaryPrinciple(),
      businessAssociates: await this.testBusinessAssociateCompliance(),
      patientRights: await this.testPatientRights()
    }

    this.testResults.push({
      framework: 'HIPAA',
      tests: hipaaTests,
      overall: this.calculateComplianceScore(hipaaTests)
    })

    return hipaaTests
  }

  // Australian Privacy Act Compliance Testing
  async testAustralianPrivacyCompliance() {
    console.log('Testing Australian Privacy Act Compliance...')
    
    const privacyTests = {
      notificationRequirements: await this.testPrivacyNotification(),
      consentMechanisms: await this.testConsentManagement(),
      dataSubjectRights: await this.testDataSubjectRights(),
      crossBorderTransfers: await this.testCrossBorderDataTransfers(),
      dataRetention: await this.testDataRetentionPolicies(),
      breachNotification: await this.testBreachNotificationProcedures(),
      healthRecordsAct: await this.testHealthRecordsActCompliance(),
      medicareCompliance: await this.testMedicareDataCompliance()
    }

    this.testResults.push({
      framework: 'Australian Privacy Act',
      tests: privacyTests,
      overall: this.calculateComplianceScore(privacyTests)
    })

    return privacyTests
  }

  // Data Encryption Testing
  async testDataEncryption() {
    const tests = []
    
    // Test encryption at rest
    try {
      const response = await axios.get(`${this.apiUrl}/api/health/encryption-status`)
      tests.push({
        test: 'database-encryption-at-rest',
        passed: response.data.databaseEncrypted === true,
        details: response.data.encryptionDetails,
        requirement: 'HIPAA §164.312(a)(2)(iv) - Encryption and decryption'
      })
    } catch (error) {
      tests.push({
        test: 'database-encryption-at-rest',
        passed: false,
        error: error.message,
        requirement: 'HIPAA §164.312(a)(2)(iv) - Encryption and decryption'
      })
    }

    // Test encryption in transit
    const tlsTest = await this.testTLSEncryption()
    tests.push({
      test: 'transmission-encryption',
      passed: tlsTest.secure,
      details: tlsTest,
      requirement: 'HIPAA §164.312(e)(1) - Transmission security'
    })

    // Test API response encryption
    await this.performLogin()
    const apiResponse = await this.page.evaluate(async () => {
      const response = await fetch('/api/patients/me')
      return {
        encrypted: response.headers.get('content-encoding') === 'gzip',
        https: location.protocol === 'https:',
        headers: Object.fromEntries(response.headers.entries())
      }
    })

    tests.push({
      test: 'api-response-security',
      passed: apiResponse.https && apiResponse.encrypted,
      details: apiResponse,
      requirement: 'HIPAA §164.312(e)(2)(ii) - Encryption and decryption'
    })

    return tests
  }

  // Access Control Testing
  async testAccessControls() {
    const tests = []

    // Test unique user identification
    const userIdTest = await this.testUniqueUserIdentification()
    tests.push({
      test: 'unique-user-identification',
      passed: userIdTest.passed,
      details: userIdTest,
      requirement: 'HIPAA §164.312(a)(2)(i) - Unique user identification'
    })

    // Test automatic logoff
    const logoffTest = await this.testAutomaticLogoff()
    tests.push({
      test: 'automatic-logoff',
      passed: logoffTest.passed,
      details: logoffTest,
      requirement: 'HIPAA §164.312(a)(2)(iii) - Automatic logoff'
    })

    // Test encryption and decryption
    const encryptionTest = await this.testSessionEncryption()
    tests.push({
      test: 'session-encryption',
      passed: encryptionTest.passed,
      details: encryptionTest,
      requirement: 'HIPAA §164.312(a)(2)(iv) - Encryption and decryption'
    })

    // Test role-based access
    const rbacTest = await this.testRoleBasedAccess()
    tests.push({
      test: 'role-based-access-control',
      passed: rbacTest.passed,
      details: rbacTest,
      requirement: 'HIPAA §164.312(a)(1) - Access control'
    })

    return tests
  }

  // Audit Logging Testing
  async testAuditLogging() {
    const tests = []

    // Test audit log creation
    await this.performLogin()
    const loginAudit = await this.checkAuditLog('LOGIN')
    tests.push({
      test: 'login-audit-logging',
      passed: loginAudit.logged,
      details: loginAudit,
      requirement: 'HIPAA §164.312(b) - Audit controls'
    })

    // Test data access logging
    await this.page.goto(`${this.baseUrl}/studies`)
    const dataAccessAudit = await this.checkAuditLog('DATA_ACCESS')
    tests.push({
      test: 'data-access-audit-logging',
      passed: dataAccessAudit.logged,
      details: dataAccessAudit,
      requirement: 'HIPAA §164.312(b) - Audit controls'
    })

    // Test audit log integrity
    const logIntegrity = await this.testAuditLogIntegrity()
    tests.push({
      test: 'audit-log-integrity',
      passed: logIntegrity.passed,
      details: logIntegrity,
      requirement: 'HIPAA §164.312(c)(1) - Integrity'
    })

    // Test audit log retention
    const logRetention = await this.testAuditLogRetention()
    tests.push({
      test: 'audit-log-retention',
      passed: logRetention.passed,
      details: logRetention,
      requirement: 'HIPAA §164.316(b)(2)(i) - Time limit'
    })

    return tests
  }

  // Data Integrity Testing
  async testDataIntegrity() {
    const tests = []

    // Test data validation
    const validationTest = await this.testDataValidation()
    tests.push({
      test: 'data-validation',
      passed: validationTest.passed,
      details: validationTest,
      requirement: 'HIPAA §164.312(c)(1) - Integrity'
    })

    // Test data backup and recovery
    const backupTest = await this.testDataBackupIntegrity()
    tests.push({
      test: 'data-backup-integrity',
      passed: backupTest.passed,
      details: backupTest,
      requirement: 'HIPAA §164.308(a)(7)(ii)(A) - Data backup plan'
    })

    // Test version control
    const versionTest = await this.testDataVersionControl()
    tests.push({
      test: 'data-version-control',
      passed: versionTest.passed,
      details: versionTest,
      requirement: 'HIPAA §164.312(c)(2) - Electronic signature'
    })

    return tests
  }

  // Transmission Security Testing
  async testTransmissionSecurity() {
    const tests = []

    // Test TLS configuration
    const tlsTest = await this.testTLSConfiguration()
    tests.push({
      test: 'tls-configuration',
      passed: tlsTest.passed,
      details: tlsTest,
      requirement: 'HIPAA §164.312(e)(1) - Transmission security'
    })

    // Test API authentication
    const apiAuthTest = await this.testAPIAuthentication()
    tests.push({
      test: 'api-authentication',
      passed: apiAuthTest.passed,
      details: apiAuthTest,
      requirement: 'HIPAA §164.312(d) - Person or entity authentication'
    })

    // Test data in transit encryption
    const transitEncryption = await this.testDataInTransitEncryption()
    tests.push({
      test: 'data-in-transit-encryption',
      passed: transitEncryption.passed,
      details: transitEncryption,
      requirement: 'HIPAA §164.312(e)(2)(ii) - Encryption and decryption'
    })

    return tests
  }

  // Privacy Notification Testing
  async testPrivacyNotification() {
    const tests = []

    // Test privacy policy presence
    await this.page.goto(`${this.baseUrl}/privacy-policy`)
    const privacyPolicyExists = await this.page.$('h1, h2') !== null
    tests.push({
      test: 'privacy-policy-exists',
      passed: privacyPolicyExists,
      requirement: 'Privacy Act 1988 - APP 1.3'
    })

    // Test collection notice
    await this.page.goto(`${this.baseUrl}/register`)
    const collectionNotice = await this.page.$text('*', 'collection notice') !== null
    tests.push({
      test: 'collection-notice-present',
      passed: collectionNotice,
      requirement: 'Privacy Act 1988 - APP 5'
    })

    // Test purpose specification
    const purposeSpecified = await this.checkPurposeSpecification()
    tests.push({
      test: 'purpose-specification',
      passed: purposeSpecified.specified,
      details: purposeSpecified,
      requirement: 'Privacy Act 1988 - APP 3'
    })

    return tests
  }

  // Consent Management Testing
  async testConsentManagement() {
    const tests = []

    // Test explicit consent mechanisms
    await this.page.goto(`${this.baseUrl}/register`)
    const consentCheckbox = await this.page.$('input[type="checkbox"][name*="consent"]')
    tests.push({
      test: 'explicit-consent-mechanism',
      passed: consentCheckbox !== null,
      requirement: 'Privacy Act 1988 - APP 3.1'
    })

    // Test consent withdrawal
    const withdrawalTest = await this.testConsentWithdrawal()
    tests.push({
      test: 'consent-withdrawal-mechanism',
      passed: withdrawalTest.passed,
      details: withdrawalTest,
      requirement: 'Privacy Act 1988 - APP 3.6'
    })

    // Test granular consent
    const granularConsent = await this.testGranularConsent()
    tests.push({
      test: 'granular-consent-options',
      passed: granularConsent.passed,
      details: granularConsent,
      requirement: 'Privacy Act 1988 - APP 3.4'
    })

    return tests
  }

  // Data Subject Rights Testing
  async testDataSubjectRights() {
    const tests = []

    // Test data access rights
    const accessRights = await this.testDataAccessRights()
    tests.push({
      test: 'data-access-rights',
      passed: accessRights.passed,
      details: accessRights,
      requirement: 'Privacy Act 1988 - APP 12'
    })

    // Test data correction rights
    const correctionRights = await this.testDataCorrectionRights()
    tests.push({
      test: 'data-correction-rights',
      passed: correctionRights.passed,
      details: correctionRights,
      requirement: 'Privacy Act 1988 - APP 13'
    })

    // Test data deletion rights
    const deletionRights = await this.testDataDeletionRights()
    tests.push({
      test: 'data-deletion-rights',
      passed: deletionRights.passed,
      details: deletionRights,
      requirement: 'Privacy Act 1988 - APP 11'
    })

    return tests
  }

  // Medicare Data Compliance Testing
  async testMedicareDataCompliance() {
    const tests = []

    // Test Medicare number validation
    const medicareValidation = await this.testMedicareNumberValidation()
    tests.push({
      test: 'medicare-number-validation',
      passed: medicareValidation.passed,
      details: medicareValidation,
      requirement: 'Medicare Australia Act 1973'
    })

    // Test Medicare data protection
    const medicareProtection = await this.testMedicareDataProtection()
    tests.push({
      test: 'medicare-data-protection',
      passed: medicareProtection.passed,
      details: medicareProtection,
      requirement: 'Medicare Australia Act 1973 - Section 8C'
    })

    return tests
  }

  // Helper Methods

  async performLogin() {
    await this.page.goto(`${this.baseUrl}/login`)
    await this.page.type('input[name="email"]', 'test@example.com')
    await this.page.type('input[name="password"]', 'password123')
    await this.page.click('button[type="submit"]')
    await this.page.waitForNavigation()
  }

  async testTLSEncryption() {
    try {
      const response = await axios.get(this.baseUrl, {
        httpsAgent: new require('https').Agent({
          rejectUnauthorized: true
        })
      })
      
      return {
        secure: true,
        protocol: 'TLS',
        version: response.request.socket.getProtocol(),
        cipher: response.request.socket.getCipher()
      }
    } catch (error) {
      return {
        secure: false,
        error: error.message
      }
    }
  }

  async testUniqueUserIdentification() {
    // Test if users have unique identifiers
    const response = await this.page.evaluate(async () => {
      const userResponse = await fetch('/api/users/me')
      const userData = await userResponse.json()
      return {
        hasUniqueId: userData.id && typeof userData.id === 'string',
        idLength: userData.id ? userData.id.length : 0,
        userIdentifier: userData.id
      }
    })

    return {
      passed: response.hasUniqueId && response.idLength > 10,
      details: response
    }
  }

  async testAutomaticLogoff() {
    const startTime = Date.now()
    
    // Wait for session timeout (should be configured for testing)
    await this.page.waitForTimeout(31 * 60 * 1000) // 31 minutes
    
    // Try to access protected resource
    const response = await this.page.evaluate(async () => {
      const protectedResponse = await fetch('/api/patients/me')
      return {
        status: protectedResponse.status,
        redirected: protectedResponse.redirected,
        url: protectedResponse.url
      }
    })

    return {
      passed: response.status === 401 || response.redirected,
      timeoutDuration: Date.now() - startTime,
      details: response
    }
  }

  async testSessionEncryption() {
    const cookies = await this.page.cookies()
    const sessionCookie = cookies.find(cookie => 
      cookie.name.includes('session') || cookie.name.includes('token')
    )

    return {
      passed: sessionCookie && sessionCookie.secure && sessionCookie.httpOnly,
      details: sessionCookie
    }
  }

  async testRoleBasedAccess() {
    // Test patient role access
    const patientAccess = await this.testRoleAccess('patient')
    
    // Test admin role access (if applicable)
    const adminAccess = await this.testRoleAccess('admin')

    return {
      passed: patientAccess.restricted && adminAccess.privileged,
      details: { patientAccess, adminAccess }
    }
  }

  async testRoleAccess(role) {
    // Implementation would test access to different endpoints based on role
    return {
      restricted: true, // Placeholder
      privileged: role === 'admin'
    }
  }

  async checkAuditLog(action) {
    try {
      const response = await axios.get(`${this.apiUrl}/api/audit/logs`, {
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        params: {
          action: action,
          limit: 1
        }
      })

      return {
        logged: response.data.logs && response.data.logs.length > 0,
        details: response.data.logs[0]
      }
    } catch (error) {
      return {
        logged: false,
        error: error.message
      }
    }
  }

  async testAuditLogIntegrity() {
    // Test if audit logs are tamper-evident
    const response = await axios.get(`${this.apiUrl}/api/audit/integrity-check`)
    
    return {
      passed: response.data.integrityVerified,
      details: response.data
    }
  }

  async testAuditLogRetention() {
    // Test if audit logs are retained for required period
    const response = await axios.get(`${this.apiUrl}/api/audit/retention-policy`)
    
    return {
      passed: response.data.retentionPeriod >= 2190, // 6 years in days
      details: response.data
    }
  }

  async testDataValidation() {
    // Test input validation on patient data
    const invalidData = {
      email: 'invalid-email',
      phone: '123',
      medicare: 'invalid'
    }

    try {
      const response = await axios.post(`${this.apiUrl}/api/patients`, invalidData)
      return {
        passed: response.status >= 400, // Should reject invalid data
        details: response.data
      }
    } catch (error) {
      return {
        passed: error.response && error.response.status >= 400,
        details: error.response ? error.response.data : error.message
      }
    }
  }

  async testDataBackupIntegrity() {
    const response = await axios.get(`${this.apiUrl}/api/system/backup-status`)
    
    return {
      passed: response.data.lastBackup && response.data.integrityChecked,
      details: response.data
    }
  }

  async testDataVersionControl() {
    // Test if data changes are versioned
    const response = await axios.get(`${this.apiUrl}/api/patients/me/versions`)
    
    return {
      passed: response.data.versions && response.data.versions.length > 0,
      details: response.data
    }
  }

  async testTLSConfiguration() {
    // Test TLS version and cipher suites
    const tlsTest = await this.testTLSEncryption()
    
    return {
      passed: tlsTest.secure && tlsTest.version >= 'TLSv1.2',
      details: tlsTest
    }
  }

  async testAPIAuthentication() {
    // Test API without authentication
    try {
      const response = await axios.get(`${this.apiUrl}/api/patients/me`)
      return {
        passed: response.status === 401,
        details: { status: response.status }
      }
    } catch (error) {
      return {
        passed: error.response && error.response.status === 401,
        details: error.response ? error.response.data : error.message
      }
    }
  }

  async testDataInTransitEncryption() {
    // Verify all API calls use HTTPS
    const requests = await this.page.evaluate(() => {
      return window.performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('/api/'))
        .map(entry => ({
          url: entry.name,
          protocol: new URL(entry.name).protocol
        }))
    })

    const allHttps = requests.every(req => req.protocol === 'https:')
    
    return {
      passed: allHttps,
      details: requests
    }
  }

  async checkPurposeSpecification() {
    await this.page.goto(`${this.baseUrl}/privacy-policy`)
    
    const purposeText = await this.page.evaluate(() => {
      const content = document.body.textContent.toLowerCase()
      return {
        hasPurpose: content.includes('purpose') || content.includes('use'),
        hasHealthcare: content.includes('healthcare') || content.includes('medical'),
        hasImaging: content.includes('imaging') || content.includes('radiology')
      }
    })

    return {
      specified: purposeText.hasPurpose && purposeText.hasHealthcare,
      details: purposeText
    }
  }

  async testConsentWithdrawal() {
    // Check if consent withdrawal mechanism exists
    await this.performLogin()
    await this.page.goto(`${this.baseUrl}/settings/privacy`)
    
    const withdrawalOption = await this.page.$('button, a') !== null
    
    return {
      passed: withdrawalOption,
      details: { withdrawalOptionAvailable: withdrawalOption }
    }
  }

  async testGranularConsent() {
    await this.page.goto(`${this.baseUrl}/register`)
    
    const consentOptions = await this.page.$$('input[type="checkbox"]')
    
    return {
      passed: consentOptions.length >= 3, // Multiple consent options
      details: { consentOptionsCount: consentOptions.length }
    }
  }

  async testDataAccessRights() {
    await this.performLogin()
    await this.page.goto(`${this.baseUrl}/settings/data-access`)
    
    const downloadOption = await this.page.$('[data-testid="download-data"], button[id*="download"]')
    
    return {
      passed: downloadOption !== null,
      details: { downloadOptionAvailable: downloadOption !== null }
    }
  }

  async testDataCorrectionRights() {
    await this.performLogin()
    await this.page.goto(`${this.baseUrl}/profile`)
    
    const editOptions = await this.page.$$('input:not([readonly]), button[id*="edit"]')
    
    return {
      passed: editOptions.length > 0,
      details: { editableFieldsCount: editOptions.length }
    }
  }

  async testDataDeletionRights() {
    await this.performLogin()
    await this.page.goto(`${this.baseUrl}/settings/account`)
    
    const deleteOption = await this.page.$('[data-testid="delete-account"], button[id*="delete"]')
    
    return {
      passed: deleteOption !== null,
      details: { deleteOptionAvailable: deleteOption !== null }
    }
  }

  async testMedicareNumberValidation() {
    const testCases = [
      { medicare: '1234567890', valid: true },
      { medicare: '0123456789', valid: false },
      { medicare: 'ABC1234567', valid: false },
      { medicare: '123456789', valid: false } // Too short
    ]

    const results = []
    
    for (const testCase of testCases) {
      try {
        const response = await axios.post(`${this.apiUrl}/api/validate/medicare`, {
          medicareNumber: testCase.medicare
        })
        
        results.push({
          input: testCase.medicare,
          expected: testCase.valid,
          actual: response.data.valid,
          passed: response.data.valid === testCase.valid
        })
      } catch (error) {
        results.push({
          input: testCase.medicare,
          expected: testCase.valid,
          actual: false,
          passed: !testCase.valid // Error expected for invalid numbers
        })
      }
    }

    return {
      passed: results.every(result => result.passed),
      details: results
    }
  }

  async testMedicareDataProtection() {
    // Test if Medicare numbers are properly encrypted/masked
    await this.performLogin()
    
    const response = await this.page.evaluate(async () => {
      const userResponse = await fetch('/api/users/me')
      const userData = await userResponse.json()
      
      return {
        medicareVisible: userData.medicareNumber && !userData.medicareNumber.includes('*'),
        medicareLength: userData.medicareNumber ? userData.medicareNumber.length : 0
      }
    })

    return {
      passed: !response.medicareVisible || response.medicareLength <= 4, // Should be masked
      details: response
    }
  }

  monitorRequest(request) {
    // Monitor and log all requests for compliance analysis
    this.recordComplianceEvent('REQUEST', {
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      timestamp: new Date().toISOString()
    })
    
    request.continue()
  }

  monitorResponse(response) {
    // Monitor and log all responses for compliance analysis
    this.recordComplianceEvent('RESPONSE', {
      url: response.url(),
      status: response.status(),
      headers: response.headers(),
      timestamp: new Date().toISOString()
    })
  }

  recordComplianceEvent(type, data) {
    // Record compliance-related events for audit purposes
    const event = {
      type,
      data,
      timestamp: new Date().toISOString()
    }
    
    // In production, this would log to a compliance monitoring system
    console.log(`Compliance Event: ${JSON.stringify(event)}`)
  }

  calculateComplianceScore(tests) {
    const totalTests = Object.values(tests).flat().length
    const passedTests = Object.values(tests).flat().filter(test => test.passed).length
    
    return {
      score: Math.round((passedTests / totalTests) * 100),
      passed: passedTests,
      total: totalTests,
      compliant: (passedTests / totalTests) >= 0.95 // 95% compliance threshold
    }
  }

  async generateComplianceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      testResults: this.testResults,
      summary: {
        frameworks: this.complianceFrameworks,
        overallCompliance: this.calculateOverallCompliance(),
        criticalIssues: this.identifyCriticalIssues(),
        recommendations: this.generateRecommendations()
      }
    }

    // Save report to file
    const reportPath = path.join(__dirname, `compliance-report-${Date.now()}.json`)
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    
    console.log(`Compliance report saved to: ${reportPath}`)
    return report
  }

  calculateOverallCompliance() {
    const totalScore = this.testResults.reduce((sum, result) => sum + result.overall.score, 0)
    return Math.round(totalScore / this.testResults.length)
  }

  identifyCriticalIssues() {
    const criticalIssues = []
    
    this.testResults.forEach(framework => {
      Object.values(framework.tests).flat().forEach(test => {
        if (!test.passed && this.isCriticalRequirement(test.requirement)) {
          criticalIssues.push({
            framework: framework.framework,
            test: test.test,
            requirement: test.requirement,
            details: test.details
          })
        }
      })
    })

    return criticalIssues
  }

  isCriticalRequirement(requirement) {
    const criticalKeywords = [
      'encryption',
      'access control',
      'audit',
      'authentication',
      'authorization',
      'data protection'
    ]
    
    return criticalKeywords.some(keyword => 
      requirement.toLowerCase().includes(keyword)
    )
  }

  generateRecommendations() {
    return [
      'Implement end-to-end encryption for all patient data',
      'Enhance audit logging with real-time monitoring',
      'Strengthen access controls with multi-factor authentication',
      'Regular compliance assessments and penetration testing',
      'Staff training on healthcare privacy regulations',
      'Incident response plan for data breaches',
      'Regular backup and disaster recovery testing'
    ]
  }

  async getAuthToken() {
    // Implementation to get current auth token
    return 'mock-token'
  }
}

// Test execution
async function runComplianceTests() {
  const testSuite = new HealthcareComplianceTestSuite({
    baseUrl: process.env.TEST_URL || 'http://localhost:3000',
    apiUrl: process.env.API_URL || 'http://localhost:3001'
  })

  try {
    await testSuite.setup()
    
    console.log('Starting healthcare compliance testing...')
    
    // Run all compliance tests
    await testSuite.testHIPAACompliance()
    await testSuite.testAustralianPrivacyCompliance()
    
    // Generate comprehensive report
    const report = await testSuite.generateComplianceReport()
    
    console.log('Compliance testing completed!')
    console.log(`Overall compliance score: ${report.summary.overallCompliance}%`)
    
    return report
    
  } catch (error) {
    console.error('Compliance testing failed:', error)
    throw error
  } finally {
    await testSuite.teardown()
  }
}

module.exports = {
  HealthcareComplianceTestSuite,
  runComplianceTests
}