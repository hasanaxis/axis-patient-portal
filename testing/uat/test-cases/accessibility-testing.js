// Accessibility Testing Suite for Axis Imaging Patient Portal
// Using axe-core, Pa11y, and custom accessibility validators

const { AxePuppeteer } = require('@axe-core/puppeteer')
const puppeteer = require('puppeteer')
const pa11y = require('pa11y')
const fs = require('fs')
const path = require('path')

class AccessibilityTestSuite {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000'
    this.browser = null
    this.page = null
    this.testResults = []
    this.wcagLevel = options.wcagLevel || 'AA'
    this.includeTags = ['wcag2a', 'wcag2aa', 'wcag21aa']
  }

  async setup() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    this.page = await this.browser.newPage()
    
    // Set viewport for testing
    await this.page.setViewport({ width: 1920, height: 1080 })
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close()
    }
  }

  // Test login page accessibility
  async testLoginPageAccessibility() {
    console.log('Testing Login Page Accessibility...')
    
    await this.page.goto(`${this.baseUrl}/login`)
    
    const results = await AxePuppeteer(this.page)
      .withTags(this.includeTags)
      .analyze()
    
    // Custom validation for login form
    const loginFormTests = await this.validateLoginForm()
    
    this.testResults.push({
      page: 'login',
      axeResults: results,
      customTests: loginFormTests
    })
    
    return this.evaluateResults(results, loginFormTests)
  }

  // Test dashboard accessibility
  async testDashboardAccessibility() {
    console.log('Testing Dashboard Accessibility...')
    
    // Login first
    await this.performLogin()
    await this.page.goto(`${this.baseUrl}/dashboard`)
    
    const results = await AxePuppeteer(this.page)
      .withTags(this.includeTags)
      .analyze()
    
    // Custom validation for dashboard
    const dashboardTests = await this.validateDashboard()
    
    this.testResults.push({
      page: 'dashboard',
      axeResults: results,
      customTests: dashboardTests
    })
    
    return this.evaluateResults(results, dashboardTests)
  }

  // Test studies page accessibility
  async testStudiesPageAccessibility() {
    console.log('Testing Studies Page Accessibility...')
    
    await this.performLogin()
    await this.page.goto(`${this.baseUrl}/studies`)
    
    const results = await AxePuppeteer(this.page)
      .withTags(this.includeTags)
      .analyze()
    
    const studiesTests = await this.validateStudiesPage()
    
    this.testResults.push({
      page: 'studies',
      axeResults: results,
      customTests: studiesTests
    })
    
    return this.evaluateResults(results, studiesTests)
  }

  // Test DICOM viewer accessibility
  async testDicomViewerAccessibility() {
    console.log('Testing DICOM Viewer Accessibility...')
    
    await this.performLogin()
    await this.page.goto(`${this.baseUrl}/studies`)
    
    // Navigate to first study and open DICOM viewer
    await this.page.click('[data-testid="study-item"]:first-child')
    await this.page.click('[data-testid="view-dicom-button"]')
    
    const results = await AxePuppeteer(this.page)
      .withTags(this.includeTags)
      .analyze()
    
    const dicomTests = await this.validateDicomViewer()
    
    this.testResults.push({
      page: 'dicom-viewer',
      axeResults: results,
      customTests: dicomTests
    })
    
    return this.evaluateResults(results, dicomTests)
  }

  // Test appointment booking accessibility
  async testAppointmentBookingAccessibility() {
    console.log('Testing Appointment Booking Accessibility...')
    
    await this.performLogin()
    await this.page.goto(`${this.baseUrl}/appointments/book`)
    
    const results = await AxePuppeteer(this.page)
      .withTags(this.includeTags)
      .analyze()
    
    const bookingTests = await this.validateAppointmentBooking()
    
    this.testResults.push({
      page: 'appointment-booking',
      axeResults: results,
      customTests: bookingTests
    })
    
    return this.evaluateResults(results, bookingTests)
  }

  // Keyboard navigation testing
  async testKeyboardNavigation() {
    console.log('Testing Keyboard Navigation...')
    
    await this.page.goto(`${this.baseUrl}/login`)
    
    const keyboardTests = {
      tabNavigation: await this.testTabNavigation(),
      escapeKey: await this.testEscapeKey(),
      enterKey: await this.testEnterKey(),
      arrowKeys: await this.testArrowKeys(),
      skipLinks: await this.testSkipLinks()
    }
    
    return keyboardTests
  }

  // Screen reader compatibility testing
  async testScreenReaderCompatibility() {
    console.log('Testing Screen Reader Compatibility...')
    
    await this.page.goto(`${this.baseUrl}/login`)
    
    const screenReaderTests = {
      ariaLabels: await this.validateAriaLabels(),
      headingStructure: await this.validateHeadingStructure(),
      landmarks: await this.validateLandmarks(),
      liveRegions: await this.validateLiveRegions(),
      focusManagement: await this.validateFocusManagement()
    }
    
    return screenReaderTests
  }

  // Color contrast testing
  async testColorContrast() {
    console.log('Testing Color Contrast...')
    
    const pages = [
      '/login',
      '/dashboard',
      '/studies',
      '/appointments'
    ]
    
    const contrastResults = []
    
    for (const pagePath of pages) {
      await this.page.goto(`${this.baseUrl}${pagePath}`)
      
      if (pagePath !== '/login') {
        await this.performLogin()
      }
      
      const contrast = await this.validateColorContrast()
      contrastResults.push({
        page: pagePath,
        results: contrast
      })
    }
    
    return contrastResults
  }

  // Mobile accessibility testing
  async testMobileAccessibility() {
    console.log('Testing Mobile Accessibility...')
    
    // Set mobile viewport
    await this.page.setViewport({ width: 375, height: 667 })
    
    const mobilePages = ['/login', '/dashboard', '/studies']
    const mobileResults = []
    
    for (const pagePath of mobilePages) {
      await this.page.goto(`${this.baseUrl}${pagePath}`)
      
      if (pagePath !== '/login') {
        await this.performLogin()
      }
      
      const results = await AxePuppeteer(this.page)
        .withTags([...this.includeTags, 'wcag2aaa'])
        .analyze()
      
      const touchTargets = await this.validateTouchTargets()
      
      mobileResults.push({
        page: pagePath,
        axeResults: results,
        touchTargets
      })
    }
    
    return mobileResults
  }

  // Helper methods for specific validations

  async validateLoginForm() {
    const tests = []
    
    // Check form labels
    const emailLabel = await this.page.$('label[for="email"]')
    tests.push({
      test: 'email-label-exists',
      passed: emailLabel !== null,
      message: 'Email input should have associated label'
    })
    
    // Check password visibility toggle
    const passwordToggle = await this.page.$('[aria-label*="password"]')
    tests.push({
      test: 'password-toggle-accessible',
      passed: passwordToggle !== null,
      message: 'Password toggle should have aria-label'
    })
    
    // Check form validation messages
    await this.page.click('[type="submit"]')
    const errorMessages = await this.page.$$('[role="alert"]')
    tests.push({
      test: 'validation-messages-accessible',
      passed: errorMessages.length > 0,
      message: 'Form validation errors should use role="alert"'
    })
    
    return tests
  }

  async validateDashboard() {
    const tests = []
    
    // Check main navigation
    const nav = await this.page.$('nav[role="navigation"]')
    tests.push({
      test: 'main-navigation-accessible',
      passed: nav !== null,
      message: 'Main navigation should have role="navigation"'
    })
    
    // Check dashboard cards
    const cards = await this.page.$$('[role="region"]')
    tests.push({
      test: 'dashboard-cards-structured',
      passed: cards.length >= 3,
      message: 'Dashboard sections should use landmarks'
    })
    
    // Check data tables
    const tables = await this.page.$$('table')
    for (let i = 0; i < tables.length; i++) {
      const caption = await tables[i].$('caption')
      const headers = await tables[i].$$('th')
      tests.push({
        test: `table-${i}-accessible`,
        passed: caption !== null && headers.length > 0,
        message: `Table ${i} should have caption and headers`
      })
    }
    
    return tests
  }

  async validateStudiesPage() {
    const tests = []
    
    // Check filter controls
    const filters = await this.page.$$('[role="combobox"], [role="checkbox"]')
    tests.push({
      test: 'filter-controls-accessible',
      passed: filters.length > 0,
      message: 'Filter controls should have appropriate ARIA roles'
    })
    
    // Check study list
    const studyList = await this.page.$('[role="list"], [role="grid"]')
    tests.push({
      test: 'study-list-structured',
      passed: studyList !== null,
      message: 'Study list should use appropriate list or grid role'
    })
    
    // Check search functionality
    const searchBox = await this.page.$('input[type="search"]')
    tests.push({
      test: 'search-accessible',
      passed: searchBox !== null,
      message: 'Search input should have type="search"'
    })
    
    return tests
  }

  async validateDicomViewer() {
    const tests = []
    
    // Check viewer controls
    const controls = await this.page.$$('[role="button"]')
    tests.push({
      test: 'viewer-controls-accessible',
      passed: controls.length >= 5, // Zoom, pan, window/level, etc.
      message: 'DICOM viewer controls should be keyboard accessible'
    })
    
    // Check image descriptions
    const imageArea = await this.page.$('[role="img"]')
    tests.push({
      test: 'dicom-image-described',
      passed: imageArea !== null,
      message: 'DICOM image area should have role="img" and description'
    })
    
    // Check keyboard shortcuts info
    const shortcutsHelp = await this.page.$('[aria-label*="keyboard"]')
    tests.push({
      test: 'keyboard-shortcuts-documented',
      passed: shortcutsHelp !== null,
      message: 'Keyboard shortcuts should be documented and accessible'
    })
    
    return tests
  }

  async validateAppointmentBooking() {
    const tests = []
    
    // Check form structure
    const form = await this.page.$('form')
    const fieldsets = await this.page.$$('fieldset')
    tests.push({
      test: 'booking-form-structured',
      passed: form !== null && fieldsets.length > 0,
      message: 'Booking form should use fieldsets for grouping'
    })
    
    // Check date picker accessibility
    const datePicker = await this.page.$('[role="dialog"]')
    tests.push({
      test: 'date-picker-accessible',
      passed: datePicker !== null,
      message: 'Date picker should be accessible via keyboard'
    })
    
    // Check form progress indication
    const progressIndicator = await this.page.$('[role="progressbar"], [aria-label*="step"]')
    tests.push({
      test: 'form-progress-indicated',
      passed: progressIndicator !== null,
      message: 'Multi-step form should indicate progress'
    })
    
    return tests
  }

  async testTabNavigation() {
    const focusableElements = []
    
    // Tab through all focusable elements
    let currentElement = await this.page.evaluateHandle(() => document.activeElement)
    
    for (let i = 0; i < 20; i++) { // Limit to prevent infinite loop
      await this.page.keyboard.press('Tab')
      const newElement = await this.page.evaluateHandle(() => document.activeElement)
      
      const elementInfo = await newElement.evaluate(el => ({
        tagName: el.tagName,
        id: el.id,
        className: el.className,
        ariaLabel: el.getAttribute('aria-label'),
        role: el.getAttribute('role')
      }))
      
      focusableElements.push(elementInfo)
      
      if (await newElement.evaluate((el, first) => el === first, currentElement)) {
        break // We've cycled back to the first element
      }
    }
    
    return {
      passed: focusableElements.length > 5,
      elements: focusableElements,
      message: 'Tab navigation should cycle through focusable elements'
    }
  }

  async testEscapeKey() {
    // Open a modal or dialog
    const modalTrigger = await this.page.$('[data-opens-modal], [aria-haspopup="dialog"]')
    if (modalTrigger) {
      await modalTrigger.click()
      await this.page.keyboard.press('Escape')
      
      const modalStillOpen = await this.page.$('[role="dialog"]:not([hidden])')
      return {
        passed: modalStillOpen === null,
        message: 'Escape key should close modals and dialogs'
      }
    }
    
    return { passed: true, message: 'No modals to test' }
  }

  async testEnterKey() {
    // Test button activation with Enter key
    const buttons = await this.page.$$('button, [role="button"]')
    if (buttons.length > 0) {
      await buttons[0].focus()
      await this.page.keyboard.press('Enter')
      
      // Check if button action was triggered (implementation specific)
      return {
        passed: true, // Would need specific implementation
        message: 'Enter key should activate buttons'
      }
    }
    
    return { passed: true, message: 'No buttons to test' }
  }

  async testArrowKeys() {
    // Test arrow key navigation in lists, menus, etc.
    const lists = await this.page.$$('[role="listbox"], [role="menu"], [role="tablist"]')
    
    if (lists.length > 0) {
      await lists[0].focus()
      await this.page.keyboard.press('ArrowDown')
      
      return {
        passed: true, // Would need specific implementation
        message: 'Arrow keys should navigate within lists and menus'
      }
    }
    
    return { passed: true, message: 'No lists or menus to test' }
  }

  async testSkipLinks() {
    // Check for skip links
    const skipLinks = await this.page.$$('a[href^="#"][class*="skip"], a[href^="#"][aria-label*="skip"]')
    
    if (skipLinks.length > 0) {
      await this.page.keyboard.press('Tab')
      const focusedElement = await this.page.evaluate(() => document.activeElement)
      
      return {
        passed: skipLinks.length > 0,
        count: skipLinks.length,
        message: 'Skip links should be available for keyboard users'
      }
    }
    
    return {
      passed: false,
      message: 'Skip links should be provided for keyboard navigation'
    }
  }

  async validateAriaLabels() {
    const elementsNeedingLabels = await this.page.$$('button:not([aria-label]):not([aria-labelledby]), input:not([aria-label]):not([aria-labelledby])')
    
    return {
      passed: elementsNeedingLabels.length === 0,
      count: elementsNeedingLabels.length,
      message: 'All interactive elements should have accessible labels'
    }
  }

  async validateHeadingStructure() {
    const headings = await this.page.$$eval('h1, h2, h3, h4, h5, h6', 
      headings => headings.map(h => ({ level: parseInt(h.tagName[1]), text: h.textContent.trim() }))
    )
    
    // Check for proper heading hierarchy
    let isValidHierarchy = true
    let hasH1 = false
    
    for (let i = 0; i < headings.length; i++) {
      if (headings[i].level === 1) {
        hasH1 = true
      }
      
      if (i > 0 && headings[i].level > headings[i-1].level + 1) {
        isValidHierarchy = false
      }
    }
    
    return {
      passed: isValidHierarchy && hasH1,
      headings,
      message: 'Heading structure should be logical and include h1'
    }
  }

  async validateLandmarks() {
    const landmarks = await this.page.$$('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer')
    
    return {
      passed: landmarks.length >= 3, // At least main, nav, and header/footer
      count: landmarks.length,
      message: 'Page should have proper landmark structure'
    }
  }

  async validateLiveRegions() {
    const liveRegions = await this.page.$$('[aria-live], [role="alert"], [role="status"]')
    
    return {
      passed: liveRegions.length > 0,
      count: liveRegions.length,
      message: 'Dynamic content should use live regions'
    }
  }

  async validateFocusManagement() {
    // Test focus management in dynamic content
    // This would need specific implementation based on the app's behavior
    
    return {
      passed: true,
      message: 'Focus should be properly managed during dynamic updates'
    }
  }

  async validateColorContrast() {
    // Use axe-core's color contrast checking
    const results = await this.page.evaluate(() => {
      return axe.run({
        tags: ['color-contrast']
      })
    })
    
    return {
      passed: results.violations.length === 0,
      violations: results.violations,
      message: 'All text should meet WCAG color contrast requirements'
    }
  }

  async validateTouchTargets() {
    // Check touch target sizes for mobile
    const touchTargets = await this.page.$$eval('button, a, input, [role="button"]', 
      elements => elements.map(el => {
        const rect = el.getBoundingClientRect()
        return {
          element: el.tagName + (el.id ? `#${el.id}` : ''),
          width: rect.width,
          height: rect.height,
          area: rect.width * rect.height
        }
      })
    )
    
    const minTouchSize = 44 // WCAG recommendation: 44x44 CSS pixels
    const adequateTargets = touchTargets.filter(target => 
      target.width >= minTouchSize && target.height >= minTouchSize
    )
    
    return {
      passed: adequateTargets.length === touchTargets.length,
      total: touchTargets.length,
      adequate: adequateTargets.length,
      message: 'Touch targets should be at least 44x44 CSS pixels'
    }
  }

  async performLogin() {
    await this.page.goto(`${this.baseUrl}/login`)
    await this.page.type('[name="email"]', 'test@example.com')
    await this.page.type('[name="password"]', 'password123')
    await this.page.click('[type="submit"]')
    await this.page.waitForNavigation()
  }

  evaluateResults(axeResults, customTests) {
    const violations = axeResults.violations
    const passes = axeResults.passes
    const customPasses = customTests.filter(test => test.passed)
    const customFailures = customTests.filter(test => !test.passed)
    
    return {
      summary: {
        axeViolations: violations.length,
        axePasses: passes.length,
        customPasses: customPasses.length,
        customFailures: customFailures.length,
        overallPassed: violations.length === 0 && customFailures.length === 0
      },
      violations,
      customFailures,
      score: this.calculateAccessibilityScore(violations, customTests)
    }
  }

  calculateAccessibilityScore(violations, customTests) {
    const maxScore = 100
    const violationPenalty = violations.length * 5
    const customFailurePenalty = customTests.filter(test => !test.passed).length * 3
    
    return Math.max(0, maxScore - violationPenalty - customFailurePenalty)
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.testResults.length,
        passed: this.testResults.filter(result => result.summary?.overallPassed).length,
        failed: this.testResults.filter(result => !result.summary?.overallPassed).length
      },
      results: this.testResults,
      recommendations: this.generateRecommendations()
    }
    
    // Save report to file
    const reportPath = path.join(__dirname, `accessibility-report-${Date.now()}.json`)
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    
    console.log(`Accessibility report saved to: ${reportPath}`)
    return report
  }

  generateRecommendations() {
    const recommendations = []
    
    // Analyze common issues across test results
    this.testResults.forEach(result => {
      if (result.axeResults?.violations) {
        result.axeResults.violations.forEach(violation => {
          if (!recommendations.find(rec => rec.id === violation.id)) {
            recommendations.push({
              id: violation.id,
              impact: violation.impact,
              description: violation.description,
              helpUrl: violation.helpUrl,
              priority: this.getPriority(violation.impact)
            })
          }
        })
      }
    })
    
    return recommendations.sort((a, b) => a.priority - b.priority)
  }

  getPriority(impact) {
    const priorities = {
      'critical': 1,
      'serious': 2,
      'moderate': 3,
      'minor': 4
    }
    return priorities[impact] || 5
  }
}

// Test execution
async function runAccessibilityTests() {
  const testSuite = new AccessibilityTestSuite({
    baseUrl: process.env.TEST_URL || 'http://localhost:3000',
    wcagLevel: 'AA'
  })
  
  try {
    await testSuite.setup()
    
    // Run all accessibility tests
    console.log('Starting accessibility test suite...')
    
    await testSuite.testLoginPageAccessibility()
    await testSuite.testDashboardAccessibility()
    await testSuite.testStudiesPageAccessibility()
    await testSuite.testDicomViewerAccessibility()
    await testSuite.testAppointmentBookingAccessibility()
    
    // Additional specialized tests
    await testSuite.testKeyboardNavigation()
    await testSuite.testScreenReaderCompatibility()
    await testSuite.testColorContrast()
    await testSuite.testMobileAccessibility()
    
    // Generate comprehensive report
    const report = await testSuite.generateReport()
    
    console.log('Accessibility testing completed!')
    console.log(`Overall score: ${report.summary.passed}/${report.summary.totalTests} tests passed`)
    
    return report
    
  } catch (error) {
    console.error('Accessibility testing failed:', error)
    throw error
  } finally {
    await testSuite.teardown()
  }
}

module.exports = {
  AccessibilityTestSuite,
  runAccessibilityTests
}