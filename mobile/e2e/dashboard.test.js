import { device, element, by, expect } from 'detox'
import { helpers } from './setup'

describe('Dashboard Flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative()
    await helpers.login()
  })

  describe('Dashboard Screen', () => {
    it('should display dashboard elements', async () => {
      await expect(element(by.id('dashboard-screen'))).toBeVisible()
      await expect(element(by.text('Welcome back'))).toBeVisible()
      await expect(element(by.id('recent-studies-section'))).toBeVisible()
      await expect(element(by.id('upcoming-appointments-section'))).toBeVisible()
      await expect(element(by.id('quick-actions-section'))).toBeVisible()
    })

    it('should display patient information', async () => {
      await expect(element(by.text('John Doe'))).toBeVisible()
      await expect(element(by.text('Patient #: AX001234'))).toBeVisible()
    })

    it('should show recent studies', async () => {
      await expect(element(by.id('recent-studies-list'))).toBeVisible()
      await expect(element(by.text('CT Chest with Contrast'))).toBeVisible()
      await expect(element(by.text('Jan 15, 2024'))).toBeVisible()
    })

    it('should show upcoming appointments', async () => {
      await expect(element(by.id('upcoming-appointments-list'))).toBeVisible()
      await expect(element(by.text('MRI Head'))).toBeVisible()
      await expect(element(by.text('Feb 1, 2024'))).toBeVisible()
    })

    it('should navigate to studies when tapping View All Studies', async () => {
      await element(by.id('view-all-studies-button')).tap()
      
      await expect(element(by.id('studies-screen'))).toBeVisible()
      await expect(element(by.text('My Studies'))).toBeVisible()
    })

    it('should navigate to appointments when tapping View All Appointments', async () => {
      await element(by.id('view-all-appointments-button')).tap()
      
      await expect(element(by.id('appointments-screen'))).toBeVisible()
      await expect(element(by.text('My Appointments'))).toBeVisible()
    })

    it('should open study details when tapping on a study', async () => {
      await element(by.id('study-item-ACC001')).tap()
      
      await expect(element(by.id('study-details-screen'))).toBeVisible()
      await expect(element(by.text('CT Chest with Contrast'))).toBeVisible()
    })

    it('should pull to refresh dashboard data', async () => {
      await helpers.pullToRefresh('dashboard-scroll-view')
      
      // Verify loading indicator appears and disappears
      await expect(element(by.id('loading-indicator'))).toBeVisible()
      await expect(element(by.id('loading-indicator'))).not.toBeVisible()
    })

    it('should show quick action buttons', async () => {
      await expect(element(by.id('book-appointment-button'))).toBeVisible()
      await expect(element(by.id('download-app-button'))).toBeVisible()
      await expect(element(by.id('contact-us-button'))).toBeVisible()
    })

    it('should navigate to appointment booking from quick actions', async () => {
      await element(by.id('book-appointment-button')).tap()
      
      await expect(element(by.id('book-appointment-screen'))).toBeVisible()
      await expect(element(by.text('Book an Appointment'))).toBeVisible()
    })
  })

  describe('Navigation', () => {
    it('should have bottom tab navigation', async () => {
      await expect(element(by.id('tab-dashboard'))).toBeVisible()
      await expect(element(by.id('tab-studies'))).toBeVisible()
      await expect(element(by.id('tab-appointments'))).toBeVisible()
      await expect(element(by.id('tab-profile'))).toBeVisible()
    })

    it('should navigate between tabs', async () => {
      // Navigate to studies
      await helpers.navigateToStudies()
      await expect(element(by.id('studies-screen'))).toBeVisible()
      
      // Navigate to appointments
      await helpers.navigateToAppointments()
      await expect(element(by.id('appointments-screen'))).toBeVisible()
      
      // Navigate to profile
      await helpers.navigateToProfile()
      await expect(element(by.id('profile-screen'))).toBeVisible()
      
      // Navigate back to dashboard
      await element(by.id('tab-dashboard')).tap()
      await expect(element(by.id('dashboard-screen'))).toBeVisible()
    })

    it('should highlight active tab', async () => {
      await expect(element(by.id('tab-dashboard'))).toHaveValue('1') // Active state
      
      await helpers.navigateToStudies()
      await expect(element(by.id('tab-studies'))).toHaveValue('1')
      await expect(element(by.id('tab-dashboard'))).toHaveValue('0')
    })
  })

  describe('Notifications', () => {
    it('should display notification badge when notifications exist', async () => {
      await expect(element(by.id('notification-badge'))).toBeVisible()
      await expect(element(by.text('3'))).toBeVisible() // Badge count
    })

    it('should open notifications when tapping notification icon', async () => {
      await element(by.id('notifications-button')).tap()
      
      await expect(element(by.id('notifications-screen'))).toBeVisible()
      await expect(element(by.text('Notifications'))).toBeVisible()
    })

    it('should show new report notification', async () => {
      await element(by.id('notifications-button')).tap()
      
      await expect(element(by.text('New report available'))).toBeVisible()
      await expect(element(by.text('Your CT Chest scan results are ready'))).toBeVisible()
    })
  })

  describe('Search Functionality', () => {
    it('should open search when tapping search icon', async () => {
      await element(by.id('search-button')).tap()
      
      await expect(element(by.id('search-screen'))).toBeVisible()
      await expect(element(by.id('search-input'))).toBeVisible()
    })

    it('should search studies', async () => {
      await element(by.id('search-button')).tap()
      await element(by.id('search-input')).typeText('CT Chest')
      
      await expect(element(by.text('CT Chest with Contrast'))).toBeVisible()
    })

    it('should show no results message for invalid search', async () => {
      await element(by.id('search-button')).tap()
      await element(by.id('search-input')).typeText('nonexistent study')
      
      await expect(element(by.text('No results found'))).toBeVisible()
    })
  })

  describe('Error Handling', () => {
    it('should show error message when data fails to load', async () => {
      // Simulate network error
      await helpers.enableAirplaneMode()
      await helpers.pullToRefresh('dashboard-scroll-view')
      
      await expect(element(by.text('Unable to load data'))).toBeVisible()
      await expect(element(by.id('retry-button'))).toBeVisible()
      
      await helpers.disableAirplaneMode()
    })

    it('should retry loading data when retry button is tapped', async () => {
      await helpers.enableAirplaneMode()
      await helpers.pullToRefresh('dashboard-scroll-view')
      
      await helpers.disableAirplaneMode()
      await element(by.id('retry-button')).tap()
      
      await expect(element(by.id('recent-studies-section'))).toBeVisible()
    })
  })

  describe('Performance', () => {
    it('should load dashboard within acceptable time', async () => {
      const startTime = Date.now()
      
      await device.reloadReactNative()
      await helpers.login()
      
      await expect(element(by.id('dashboard-screen'))).toBeVisible()
      
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(5000) // Should load within 5 seconds
    })

    it('should handle multiple rapid taps without freezing', async () => {
      for (let i = 0; i < 5; i++) {
        await element(by.id('tab-studies')).tap()
        await element(by.id('tab-dashboard')).tap()
      }
      
      await expect(element(by.id('dashboard-screen'))).toBeVisible()
    })
  })
})