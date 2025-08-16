// Visual Regression Tests for Axis Imaging Patient Portal
// Comprehensive visual testing across all major components and pages

const { test, expect } = require('@playwright/test')
const percySnapshot = require('@percy/playwright')

test.describe('Visual Regression Tests', () => {
  // Setup authentication for protected pages
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')
    await page.waitForURL('/dashboard')
  })

  test.describe('Authentication Pages', () => {
    test('Login page visual state', async ({ page }) => {
      await page.goto('/login')
      
      // Wait for page to fully load
      await page.waitForLoadState('networkidle')
      
      // Take screenshot of clean login state
      await percySnapshot(page, 'Login Page - Initial State')
      
      // Test form validation visual states
      await page.click('[data-testid="login-button"]')
      await page.waitForSelector('[role="alert"]')
      await percySnapshot(page, 'Login Page - Validation Errors')
      
      // Test loading state
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')
      await percySnapshot(page, 'Login Page - Loading State')
    })

    test('Registration page visual state', async ({ page }) => {
      await page.goto('/register')
      await page.waitForLoadState('networkidle')
      
      await percySnapshot(page, 'Registration Page - Initial State')
      
      // Test form progression
      await page.fill('[data-testid="first-name-input"]', 'John')
      await page.fill('[data-testid="last-name-input"]', 'Doe')
      await page.fill('[data-testid="email-input"]', 'john.doe@example.com')
      await percySnapshot(page, 'Registration Page - Partially Filled')
      
      // Test validation states
      await page.click('[data-testid="register-button"]')
      await page.waitForSelector('[role="alert"]')
      await percySnapshot(page, 'Registration Page - Validation Errors')
    })

    test('Password reset visual state', async ({ page }) => {
      await page.goto('/forgot-password')
      await page.waitForLoadState('networkidle')
      
      await percySnapshot(page, 'Password Reset - Initial State')
      
      // Test success state
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.click('[data-testid="reset-button"]')
      await page.waitForSelector('[data-testid="success-message"]')
      await percySnapshot(page, 'Password Reset - Success State')
    })
  })

  test.describe('Dashboard Views', () => {
    test('Dashboard overview visual state', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      // Wait for dynamic content to load
      await page.waitForSelector('[data-testid="recent-studies"]')
      await page.waitForSelector('[data-testid="upcoming-appointments"]')
      
      await percySnapshot(page, 'Dashboard - Overview')
      
      // Test different data states
      await page.click('[data-testid="view-all-studies"]')
      await page.waitForURL('/studies')
      await page.goBack()
      
      // Test notification states
      await page.click('[data-testid="notifications-button"]')
      await page.waitForSelector('[data-testid="notifications-dropdown"]')
      await percySnapshot(page, 'Dashboard - Notifications Open')
    })

    test('Dashboard with critical alerts', async ({ page }) => {
      // Mock critical alert data
      await page.route('**/api/alerts', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            alerts: [{
              id: 1,
              type: 'critical',
              message: 'Critical result available',
              studyId: 'STUDY001'
            }]
          })
        })
      })

      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      await page.waitForSelector('[data-testid="critical-alert"]')
      
      await percySnapshot(page, 'Dashboard - Critical Alert Banner')
    })

    test('Dashboard empty states', async ({ page }) => {
      // Mock empty data responses
      await page.route('**/api/studies**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ studies: [], total: 0 })
        })
      })

      await page.route('**/api/appointments**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ appointments: [], total: 0 })
        })
      })

      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      await percySnapshot(page, 'Dashboard - Empty State')
    })
  })

  test.describe('Studies Management', () => {
    test('Studies list visual state', async ({ page }) => {
      await page.goto('/studies')
      await page.waitForLoadState('networkidle')
      await page.waitForSelector('[data-testid="studies-list"]')
      
      await percySnapshot(page, 'Studies - List View')
      
      // Test filter states
      await page.click('[data-testid="filter-button"]')
      await page.waitForSelector('[data-testid="filter-modal"]')
      await percySnapshot(page, 'Studies - Filter Modal Open')
      
      // Test search state
      await page.click('[data-testid="close-filter"]')
      await page.fill('[data-testid="search-input"]', 'CT Chest')
      await page.waitForTimeout(500) // Wait for search debounce
      await percySnapshot(page, 'Studies - Search Results')
    })

    test('Study details visual state', async ({ page }) => {
      await page.goto('/studies')
      await page.waitForLoadState('networkidle')
      
      // Click on first study
      await page.click('[data-testid="study-item"]:first-child')
      await page.waitForLoadState('networkidle')
      
      await percySnapshot(page, 'Study Details - Overview')
      
      // Test report section
      await page.click('[data-testid="report-tab"]')
      await page.waitForSelector('[data-testid="report-content"]')
      await percySnapshot(page, 'Study Details - Report View')
      
      // Test image viewer
      await page.click('[data-testid="images-tab"]')
      await page.waitForSelector('[data-testid="image-viewer"]')
      await percySnapshot(page, 'Study Details - Image Viewer')
    })

    test('DICOM viewer visual state', async ({ page }) => {
      await page.goto('/studies/STUDY001/viewer')
      await page.waitForLoadState('networkidle')
      await page.waitForSelector('[data-testid="dicom-viewer"]')
      
      await percySnapshot(page, 'DICOM Viewer - Default View')
      
      // Test toolbar states
      await page.click('[data-testid="zoom-in-button"]')
      await percySnapshot(page, 'DICOM Viewer - Zoomed In')
      
      await page.click('[data-testid="window-level-button"]')
      await percySnapshot(page, 'DICOM Viewer - Window Level Mode')
      
      // Test fullscreen mode
      await page.click('[data-testid="fullscreen-button"]')
      await page.waitForTimeout(500)
      await percySnapshot(page, 'DICOM Viewer - Fullscreen')
    })
  })

  test.describe('Appointments Management', () => {
    test('Appointments list visual state', async ({ page }) => {
      await page.goto('/appointments')
      await page.waitForLoadState('networkidle')
      
      await percySnapshot(page, 'Appointments - List View')
      
      // Test calendar view
      await page.click('[data-testid="calendar-view-button"]')
      await page.waitForSelector('[data-testid="calendar-view"]')
      await percySnapshot(page, 'Appointments - Calendar View')
    })

    test('Appointment booking visual state', async ({ page }) => {
      await page.goto('/appointments/book')
      await page.waitForLoadState('networkidle')
      
      await percySnapshot(page, 'Appointment Booking - Step 1')
      
      // Progress through booking steps
      await page.selectOption('[data-testid="modality-select"]', 'MRI')
      await page.selectOption('[data-testid="body-part-select"]', 'HEAD')
      await page.click('[data-testid="next-button"]')
      
      await page.waitForSelector('[data-testid="location-selection"]')
      await percySnapshot(page, 'Appointment Booking - Step 2 Location')
      
      await page.click('[data-testid="location-melbourne"]')
      await page.click('[data-testid="next-button"]')
      
      await page.waitForSelector('[data-testid="time-slots"]')
      await percySnapshot(page, 'Appointment Booking - Step 3 Time Selection')
      
      // Test confirmation page
      await page.click('[data-testid="time-slot-10am"]')
      await page.click('[data-testid="next-button"]')
      
      await page.waitForSelector('[data-testid="booking-confirmation"]')
      await percySnapshot(page, 'Appointment Booking - Confirmation')
    })

    test('Appointment details visual state', async ({ page }) => {
      await page.goto('/appointments/APP001')
      await page.waitForLoadState('networkidle')
      
      await percySnapshot(page, 'Appointment Details - Overview')
      
      // Test preparation instructions
      await page.click('[data-testid="preparation-tab"]')
      await percySnapshot(page, 'Appointment Details - Preparation')
      
      // Test location information
      await page.click('[data-testid="location-tab"]')
      await page.waitForSelector('[data-testid="location-map"]')
      await percySnapshot(page, 'Appointment Details - Location')
    })
  })

  test.describe('User Profile and Settings', () => {
    test('Profile page visual state', async ({ page }) => {
      await page.goto('/profile')
      await page.waitForLoadState('networkidle')
      
      await percySnapshot(page, 'Profile - Overview')
      
      // Test edit mode
      await page.click('[data-testid="edit-profile-button"]')
      await page.waitForSelector('[data-testid="profile-form"]')
      await percySnapshot(page, 'Profile - Edit Mode')
      
      // Test validation states
      await page.fill('[data-testid="email-input"]', 'invalid-email')
      await page.click('[data-testid="save-button"]')
      await page.waitForSelector('[role="alert"]')
      await percySnapshot(page, 'Profile - Validation Errors')
    })

    test('Settings page visual state', async ({ page }) => {
      await page.goto('/settings')
      await page.waitForLoadState('networkidle')
      
      await percySnapshot(page, 'Settings - General')
      
      // Test notifications settings
      await page.click('[data-testid="notifications-tab"]')
      await page.waitForSelector('[data-testid="notification-preferences"]')
      await percySnapshot(page, 'Settings - Notifications')
      
      // Test privacy settings
      await page.click('[data-testid="privacy-tab"]')
      await page.waitForSelector('[data-testid="privacy-controls"]')
      await percySnapshot(page, 'Settings - Privacy')
      
      // Test security settings
      await page.click('[data-testid="security-tab"]')
      await page.waitForSelector('[data-testid="security-options"]')
      await percySnapshot(page, 'Settings - Security')
    })
  })

  test.describe('Error States', () => {
    test('404 error page visual state', async ({ page }) => {
      await page.goto('/non-existent-page')
      await page.waitForLoadState('networkidle')
      
      await percySnapshot(page, 'Error - 404 Page Not Found')
    })

    test('Network error states', async ({ page }) => {
      // Mock network failures
      await page.route('**/api/studies**', route => {
        route.abort('failed')
      })

      await page.goto('/studies')
      await page.waitForLoadState('networkidle')
      await page.waitForSelector('[data-testid="error-message"]')
      
      await percySnapshot(page, 'Error - Network Failure')
    })

    test('Maintenance mode visual state', async ({ page }) => {
      // Mock maintenance mode
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Service temporarily unavailable',
            maintenance: true
          })
        })
      })

      await page.goto('/dashboard')
      await page.waitForSelector('[data-testid="maintenance-banner"]')
      
      await percySnapshot(page, 'System - Maintenance Mode')
    })
  })

  test.describe('Responsive Design States', () => {
    test('Mobile navigation visual state', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      await percySnapshot(page, 'Mobile - Dashboard')
      
      // Test mobile menu
      await page.click('[data-testid="mobile-menu-button"]')
      await page.waitForSelector('[data-testid="mobile-menu"]')
      await percySnapshot(page, 'Mobile - Menu Open')
    })

    test('Tablet layout visual state', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('/studies')
      await page.waitForLoadState('networkidle')
      
      await percySnapshot(page, 'Tablet - Studies List')
      
      // Test tablet-specific layouts
      await page.click('[data-testid="study-item"]:first-child')
      await page.waitForLoadState('networkidle')
      await percySnapshot(page, 'Tablet - Study Details')
    })
  })

  test.describe('Theme and Accessibility States', () => {
    test('Dark mode visual state', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      // Enable dark mode
      await page.click('[data-testid="settings-menu"]')
      await page.click('[data-testid="dark-mode-toggle"]')
      await page.waitForTimeout(500) // Wait for theme transition
      
      await percySnapshot(page, 'Theme - Dark Mode Dashboard')
      
      // Test dark mode on different pages
      await page.goto('/studies')
      await page.waitForLoadState('networkidle')
      await percySnapshot(page, 'Theme - Dark Mode Studies')
    })

    test('High contrast mode visual state', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      // Enable high contrast mode
      await page.addStyleTag({
        content: `
          * {
            filter: contrast(1.5) !important;
          }
          .high-contrast {
            background: #000 !important;
            color: #fff !important;
          }
        `
      })
      
      await percySnapshot(page, 'Accessibility - High Contrast Mode')
    })

    test('Large text mode visual state', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      // Simulate large text settings
      await page.addStyleTag({
        content: `
          * {
            font-size: 1.5em !important;
            line-height: 1.6 !important;
          }
        `
      })
      
      await percySnapshot(page, 'Accessibility - Large Text Mode')
    })
  })

  test.describe('Loading and Animation States', () => {
    test('Loading states visual progression', async ({ page }) => {
      await page.goto('/studies')
      
      // Capture loading skeleton
      await page.waitForSelector('[data-testid="loading-skeleton"]')
      await percySnapshot(page, 'Loading - Studies Skeleton')
      
      // Wait for content to load
      await page.waitForLoadState('networkidle')
      await percySnapshot(page, 'Loading - Studies Loaded')
    })

    test('Animation states', async ({ page }) => {
      await page.goto('/appointments/book')
      await page.waitForLoadState('networkidle')
      
      // Test step transitions
      await page.selectOption('[data-testid="modality-select"]', 'MRI')
      await page.click('[data-testid="next-button"]')
      
      // Capture mid-transition state
      await page.waitForTimeout(250)
      await percySnapshot(page, 'Animation - Step Transition')
    })
  })

  test.describe('Form States and Interactions', () => {
    test('Form validation visual states', async ({ page }) => {
      await page.goto('/profile')
      await page.click('[data-testid="edit-profile-button"]')
      
      // Test empty field validation
      await page.fill('[data-testid="first-name-input"]', '')
      await page.fill('[data-testid="email-input"]', '')
      await page.click('[data-testid="save-button"]')
      
      await page.waitForSelector('[role="alert"]')
      await percySnapshot(page, 'Forms - Validation Errors')
      
      // Test success state
      await page.fill('[data-testid="first-name-input"]', 'John')
      await page.fill('[data-testid="email-input"]', 'john@example.com')
      await page.click('[data-testid="save-button"]')
      
      await page.waitForSelector('[data-testid="success-message"]')
      await percySnapshot(page, 'Forms - Success State')
    })

    test('Complex form interactions', async ({ page }) => {
      await page.goto('/appointments/book')
      await page.waitForLoadState('networkidle')
      
      // Test form with multiple steps and interactions
      await page.selectOption('[data-testid="modality-select"]', 'MRI')
      await page.selectOption('[data-testid="body-part-select"]', 'HEAD')
      await page.selectOption('[data-testid="urgency-select"]', 'routine')
      
      await percySnapshot(page, 'Forms - Complex Form Filled')
      
      // Test conditional fields
      await page.selectOption('[data-testid="urgency-select"]', 'urgent')
      await page.waitForSelector('[data-testid="urgency-reason"]')
      
      await percySnapshot(page, 'Forms - Conditional Fields Visible')
    })
  })

  test.describe('Data Visualization States', () => {
    test('Charts and graphs visual state', async ({ page }) => {
      await page.goto('/reports/analytics')
      await page.waitForLoadState('networkidle')
      await page.waitForSelector('[data-testid="analytics-chart"]')
      
      await percySnapshot(page, 'Analytics - Charts Overview')
      
      // Test different chart types
      await page.click('[data-testid="chart-type-bar"]')
      await page.waitForTimeout(500)
      await percySnapshot(page, 'Analytics - Bar Chart')
      
      await page.click('[data-testid="chart-type-pie"]')
      await page.waitForTimeout(500)
      await percySnapshot(page, 'Analytics - Pie Chart')
    })
  })
})