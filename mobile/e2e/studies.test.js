import { device, element, by, expect } from 'detox'
import { helpers } from './setup'

describe('Studies Flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative()
    await helpers.login()
    await helpers.navigateToStudies()
  })

  describe('Studies List Screen', () => {
    it('should display studies list elements', async () => {
      await expect(element(by.id('studies-screen'))).toBeVisible()
      await expect(element(by.text('My Studies'))).toBeVisible()
      await expect(element(by.id('studies-list'))).toBeVisible()
      await expect(element(by.id('filter-button'))).toBeVisible()
      await expect(element(by.id('search-studies-input'))).toBeVisible()
    })

    it('should show studies with correct information', async () => {
      await expect(element(by.id('study-item-ACC001'))).toBeVisible()
      await expect(element(by.text('CT Chest with Contrast'))).toBeVisible()
      await expect(element(by.text('Jan 15, 2024'))).toBeVisible()
      await expect(element(by.text('COMPLETED'))).toBeVisible()
      await expect(element(by.text('Dr. Smith'))).toBeVisible()
    })

    it('should filter studies by date range', async () => {
      await element(by.id('filter-button')).tap()
      await expect(element(by.id('filter-modal'))).toBeVisible()
      
      await element(by.id('date-range-filter')).tap()
      await helpers.selectDate('start-date-picker', new Date('2024-01-01'))
      await helpers.selectDate('end-date-picker', new Date('2024-01-31'))
      await element(by.id('apply-filter-button')).tap()
      
      await expect(element(by.text('CT Chest with Contrast'))).toBeVisible()
    })

    it('should filter studies by modality', async () => {
      await element(by.id('filter-button')).tap()
      await element(by.id('modality-filter')).tap()
      await element(by.text('CT')).tap()
      await element(by.id('apply-filter-button')).tap()
      
      await expect(element(by.text('CT Chest with Contrast'))).toBeVisible()
    })

    it('should filter studies by status', async () => {
      await element(by.id('filter-button')).tap()
      await element(by.id('status-filter')).tap()
      await element(by.text('COMPLETED')).tap()
      await element(by.id('apply-filter-button')).tap()
      
      await expect(element(by.text('COMPLETED'))).toBeVisible()
    })

    it('should search studies by description', async () => {
      await element(by.id('search-studies-input')).typeText('CT Chest')
      
      await expect(element(by.text('CT Chest with Contrast'))).toBeVisible()
    })

    it('should show no results for empty search', async () => {
      await element(by.id('search-studies-input')).typeText('nonexistent study')
      
      await expect(element(by.text('No studies found'))).toBeVisible()
      await expect(element(by.id('empty-state-illustration'))).toBeVisible()
    })

    it('should clear search when clear button is tapped', async () => {
      await element(by.id('search-studies-input')).typeText('CT Chest')
      await element(by.id('clear-search-button')).tap()
      
      await expect(element(by.id('search-studies-input'))).toHaveText('')
    })

    it('should sort studies by date', async () => {
      await element(by.id('sort-button')).tap()
      await element(by.text('Date (Newest First)')).tap()
      
      // Verify the order - most recent study should be first
      const firstStudy = element(by.id('studies-list')).atIndex(0)
      await expect(firstStudy).toHaveDescendant(by.text('Jan 15, 2024'))
    })

    it('should pull to refresh studies list', async () => {
      await helpers.pullToRefresh('studies-list')
      
      await expect(element(by.id('loading-indicator'))).toBeVisible()
      await expect(element(by.id('loading-indicator'))).not.toBeVisible()
    })

    it('should load more studies when scrolling to bottom', async () => {
      await element(by.id('studies-list')).scrollTo('bottom')
      
      // Verify loading indicator for pagination
      await expect(element(by.id('pagination-loading'))).toBeVisible()
    })
  })

  describe('Study Details Screen', () => {
    beforeEach(async () => {
      await element(by.id('study-item-ACC001')).tap()
      await expect(element(by.id('study-details-screen'))).toBeVisible()
    })

    it('should display study details', async () => {
      await expect(element(by.text('CT Chest with Contrast'))).toBeVisible()
      await expect(element(by.text('Jan 15, 2024'))).toBeVisible()
      await expect(element(by.text('ACC001'))).toBeVisible()
      await expect(element(by.text('Dr. Smith'))).toBeVisible()
      await expect(element(by.text('CHEST'))).toBeVisible()
      await expect(element(by.text('COMPLETED'))).toBeVisible()
    })

    it('should show study images/series', async () => {
      await expect(element(by.id('study-series-list'))).toBeVisible()
      await expect(element(by.text('Series 1'))).toBeVisible()
      await expect(element(by.text('120 images'))).toBeVisible()
    })

    it('should display report when available', async () => {
      await expect(element(by.id('report-section'))).toBeVisible()
      await expect(element(by.text('Clinical History'))).toBeVisible()
      await expect(element(by.text('Patient presents with chest pain'))).toBeVisible()
      await expect(element(by.text('Findings'))).toBeVisible()
      await expect(element(by.text('The lungs are clear bilaterally'))).toBeVisible()
      await expect(element(by.text('Impression'))).toBeVisible()
      await expect(element(by.text('Normal CT chest'))).toBeVisible()
    })

    it('should show report status', async () => {
      await expect(element(by.text('FINAL'))).toBeVisible()
      await expect(element(by.id('report-status-badge'))).toBeVisible()
    })

    it('should allow downloading study report', async () => {
      await element(by.id('download-report-button')).tap()
      
      await expect(element(by.text('Report downloaded successfully'))).toBeVisible()
    })

    it('should allow sharing study', async () => {
      await element(by.id('share-study-button')).tap()
      
      // On iOS, this would open the share sheet
      // On Android, it would show sharing options
      await expect(element(by.text('Share Study'))).toBeVisible()
    })

    it('should show DICOM viewer option for radiology studies', async () => {
      await expect(element(by.id('view-dicom-button'))).toBeVisible()
    })

    it('should open DICOM viewer when tapped', async () => {
      await element(by.id('view-dicom-button')).tap()
      
      await expect(element(by.id('dicom-viewer-screen'))).toBeVisible()
      await expect(element(by.id('dicom-image-viewer'))).toBeVisible()
    })

    it('should navigate back to studies list', async () => {
      await element(by.id('back-button')).tap()
      
      await expect(element(by.id('studies-screen'))).toBeVisible()
    })

    it('should show critical report alert', async () => {
      // Assuming we have a critical study
      await device.pressBack() // Go back to studies list
      await element(by.id('study-item-critical')).tap() // Tap critical study
      
      await expect(element(by.id('critical-alert-badge'))).toBeVisible()
      await expect(element(by.text('CRITICAL'))).toBeVisible()
    })
  })

  describe('DICOM Viewer', () => {
    beforeEach(async () => {
      await element(by.id('study-item-ACC001')).tap()
      await element(by.id('view-dicom-button')).tap()
      await expect(element(by.id('dicom-viewer-screen'))).toBeVisible()
    })

    it('should display DICOM viewer controls', async () => {
      await expect(element(by.id('dicom-image-viewer'))).toBeVisible()
      await expect(element(by.id('zoom-in-button'))).toBeVisible()
      await expect(element(by.id('zoom-out-button'))).toBeVisible()
      await expect(element(by.id('reset-view-button'))).toBeVisible()
      await expect(element(by.id('window-level-button'))).toBeVisible()
    })

    it('should allow zooming in and out', async () => {
      await element(by.id('zoom-in-button')).tap()
      await element(by.id('zoom-in-button')).tap()
      await element(by.id('zoom-out-button')).tap()
      
      // Verify zoom controls work (implementation specific)
      await expect(element(by.id('zoom-level-indicator'))).toBeVisible()
    })

    it('should allow panning images', async () => {
      // Simulate pan gesture
      await element(by.id('dicom-image-viewer')).swipe('left', 'fast')
      await element(by.id('dicom-image-viewer')).swipe('right', 'fast')
    })

    it('should navigate between series', async () => {
      await element(by.id('next-series-button')).tap()
      
      await expect(element(by.text('Series 2'))).toBeVisible()
    })

    it('should navigate between images in series', async () => {
      await element(by.id('dicom-image-viewer')).swipe('up', 'fast')
      await element(by.id('dicom-image-viewer')).swipe('down', 'fast')
      
      // Verify image number changes
      await expect(element(by.id('image-counter'))).toBeVisible()
    })

    it('should reset view when reset button is tapped', async () => {
      await element(by.id('zoom-in-button')).tap()
      await element(by.id('reset-view-button')).tap()
      
      // Verify view is reset to original state
    })

    it('should show image information overlay', async () => {
      await element(by.id('info-overlay-button')).tap()
      
      await expect(element(by.text('Patient: John Doe'))).toBeVisible()
      await expect(element(by.text('Study Date: Jan 15, 2024'))).toBeVisible()
      await expect(element(by.text('Slice: 1/120'))).toBeVisible()
    })

    it('should allow full screen viewing', async () => {
      await element(by.id('fullscreen-button')).tap()
      
      // Verify controls are hidden in fullscreen
      await expect(element(by.id('zoom-in-button'))).not.toBeVisible()
      
      // Tap to exit fullscreen
      await element(by.id('dicom-image-viewer')).tap()
      await expect(element(by.id('zoom-in-button'))).toBeVisible()
    })
  })

  describe('Error Handling', () => {
    it('should show error when studies fail to load', async () => {
      await helpers.enableAirplaneMode()
      await helpers.pullToRefresh('studies-list')
      
      await expect(element(by.text('Unable to load studies'))).toBeVisible()
      await expect(element(by.id('retry-button'))).toBeVisible()
      
      await helpers.disableAirplaneMode()
    })

    it('should show error when DICOM images fail to load', async () => {
      await element(by.id('study-item-ACC001')).tap()
      
      await helpers.enableAirplaneMode()
      await element(by.id('view-dicom-button')).tap()
      
      await expect(element(by.text('Unable to load images'))).toBeVisible()
      
      await helpers.disableAirplaneMode()
    })

    it('should handle missing report gracefully', async () => {
      // Navigate to study without report
      await element(by.id('study-item-no-report')).tap()
      
      await expect(element(by.text('Report not yet available'))).toBeVisible()
      await expect(element(by.id('report-pending-message'))).toBeVisible()
    })
  })

  describe('Offline Functionality', () => {
    it('should show cached studies when offline', async () => {
      // Load studies while online
      await helpers.pullToRefresh('studies-list')
      
      // Go offline
      await helpers.enableAirplaneMode()
      await device.reloadReactNative()
      await helpers.login()
      await helpers.navigateToStudies()
      
      // Should show cached studies
      await expect(element(by.text('CT Chest with Contrast'))).toBeVisible()
      await expect(element(by.id('offline-indicator'))).toBeVisible()
      
      await helpers.disableAirplaneMode()
    })

    it('should sync data when coming back online', async () => {
      await helpers.enableAirplaneMode()
      await helpers.disableAirplaneMode()
      
      await expect(element(by.text('Syncing data...'))).toBeVisible()
      await expect(element(by.text('Syncing data...'))).not.toBeVisible()
    })
  })
})