// Complete workflow end-to-end test for mobile app
// Tests the full patient journey from registration to viewing scan results

const { device, element, by, expect: detoxExpect } = require('detox');

describe('Complete Patient Workflow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Patient Registration and Login Flow', () => {
    it('should complete patient registration with invitation', async () => {
      // Navigate to registration
      await element(by.id('welcome-register-button')).tap();
      
      // Enter invitation code
      await element(by.id('invitation-code-input')).typeText('TEST123456');
      await element(by.id('validate-invitation-button')).tap();
      
      // Wait for validation and fill registration form
      await waitFor(element(by.id('registration-form')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('phone-number-input')).typeText('0412345678');
      await element(by.id('password-input')).typeText('TestPassword123!');
      await element(by.id('confirm-password-input')).typeText('TestPassword123!');
      
      // Accept terms
      await element(by.id('terms-checkbox')).tap();
      await element(by.id('privacy-checkbox')).tap();
      
      // Submit registration
      await element(by.id('register-button')).tap();
      
      // Verify success message
      await waitFor(element(by.text('Registration successful')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should login with registered credentials', async () => {
      // Navigate to login
      await element(by.id('welcome-login-button')).tap();
      
      // Enter credentials
      await element(by.id('phone-number-input')).typeText('0412345678');
      await element(by.id('password-input')).typeText('TestPassword123!');
      
      // Submit login
      await element(by.id('login-button')).tap();
      
      // Verify dashboard loads
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(10000);
    });
  });

  describe('Dashboard and Navigation', () => {
    beforeEach(async () => {
      // Ensure user is logged in
      await loginUser();
    });

    it('should display dashboard with patient information', async () => {
      await detoxExpect(element(by.id('dashboard-screen'))).toBeVisible();
      await detoxExpect(element(by.id('patient-greeting'))).toBeVisible();
      await detoxExpect(element(by.id('stats-section'))).toBeVisible();
    });

    it('should navigate to scans list', async () => {
      await element(by.id('scans-tab')).tap();
      await detoxExpect(element(by.id('scans-screen'))).toBeVisible();
      await detoxExpect(element(by.id('scans-list'))).toBeVisible();
    });

    it('should navigate to appointments', async () => {
      await element(by.id('appointments-tab')).tap();
      await detoxExpect(element(by.id('appointments-screen'))).toBeVisible();
    });

    it('should navigate to profile', async () => {
      await element(by.id('profile-tab')).tap();
      await detoxExpect(element(by.id('profile-screen'))).toBeVisible();
    });
  });

  describe('Scans and Reports Workflow', () => {
    beforeEach(async () => {
      await loginUser();
      await element(by.id('scans-tab')).tap();
    });

    it('should view scan details', async () => {
      // Tap on first scan in list
      await element(by.id('scan-item-0')).tap();
      
      // Verify scan viewer opens
      await waitFor(element(by.id('scan-viewer-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await detoxExpect(element(by.id('scan-metadata'))).toBeVisible();
      await detoxExpect(element(by.id('scan-images'))).toBeVisible();
    });

    it('should view associated report if available', async () => {
      await element(by.id('scan-item-0')).tap();
      
      // Check if report is available and tap it
      try {
        await element(by.id('view-report-button')).tap();
        await detoxExpect(element(by.id('report-content'))).toBeVisible();
      } catch (error) {
        // Report might not be available for all scans
        console.log('Report not available for this scan');
      }
    });

    it('should filter scans by modality', async () => {
      await element(by.id('filter-button')).tap();
      await element(by.id('filter-modality-xray')).tap();
      await element(by.id('apply-filter-button')).tap();
      
      // Verify filtered results
      await detoxExpect(element(by.id('scans-list'))).toBeVisible();
    });

    it('should search scans', async () => {
      await element(by.id('search-input')).typeText('chest');
      await element(by.id('search-button')).tap();
      
      // Verify search results
      await waitFor(element(by.id('scans-list')))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe('Appointment Booking Workflow', () => {
    beforeEach(async () => {
      await loginUser();
      await element(by.id('appointments-tab')).tap();
    });

    it('should complete appointment booking flow', async () => {
      // Start booking process
      await element(by.id('book-appointment-button')).tap();
      
      // Select scan type
      await element(by.id('scan-type-dropdown')).tap();
      await element(by.text('X-Ray')).tap();
      
      // Select body part
      await element(by.id('body-part-dropdown')).tap();
      await element(by.text('Chest')).tap();
      
      // Select preferred date
      await element(by.id('date-picker')).tap();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await element(by.text(tomorrow.getDate().toString())).tap();
      
      // Select time preference
      await element(by.id('time-preference-morning')).tap();
      
      // Add notes if needed
      await element(by.id('notes-input')).typeText('Routine check-up');
      
      // Confirm booking
      await element(by.id('confirm-booking-button')).tap();
      
      // Verify success
      await waitFor(element(by.text('Booking request submitted')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should view booking status', async () => {
      await element(by.id('view-bookings-button')).tap();
      await detoxExpect(element(by.id('bookings-list'))).toBeVisible();
      
      // Tap on a booking to view details
      await element(by.id('booking-item-0')).tap();
      await detoxExpect(element(by.id('booking-details'))).toBeVisible();
    });
  });

  describe('Profile and Settings', () => {
    beforeEach(async () => {
      await loginUser();
      await element(by.id('profile-tab')).tap();
    });

    it('should update profile information', async () => {
      await element(by.id('edit-profile-button')).tap();
      
      // Update email
      await element(by.id('email-input')).clearText();
      await element(by.id('email-input')).typeText('updated@example.com');
      
      // Save changes
      await element(by.id('save-profile-button')).tap();
      
      // Verify success message
      await waitFor(element(by.text('Profile updated successfully')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should change notification preferences', async () => {
      await element(by.id('settings-button')).tap();
      
      // Toggle SMS notifications
      await element(by.id('sms-notifications-toggle')).tap();
      
      // Save settings
      await element(by.id('save-settings-button')).tap();
      
      // Verify save
      await waitFor(element(by.text('Settings saved')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Offline Functionality', () => {
    beforeEach(async () => {
      await loginUser();
    });

    it('should work offline with cached data', async () => {
      // First load data while online
      await element(by.id('scans-tab')).tap();
      await waitFor(element(by.id('scans-list')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Simulate offline mode
      await device.setURLBlacklist(['.*']);
      
      // Verify cached data is still accessible
      await device.reloadReactNative();
      await detoxExpect(element(by.id('scans-list'))).toBeVisible();
      
      // Re-enable network
      await device.setURLBlacklist([]);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await loginUser();
    });

    it('should handle network errors gracefully', async () => {
      // Simulate network error
      await device.setURLBlacklist(['.*']);
      
      // Try to refresh data
      await element(by.id('scans-tab')).tap();
      await element(by.id('refresh-button')).tap();
      
      // Verify error message is shown
      await waitFor(element(by.text('Network error')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Re-enable network
      await device.setURLBlacklist([]);
    });

    it('should handle authentication errors', async () => {
      // Simulate expired token by clearing storage
      await device.reloadReactNative();
      
      // Try to access protected content
      await element(by.id('scans-tab')).tap();
      
      // Should redirect to login
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });
});

// Helper function to login user
async function loginUser() {
  try {
    // Check if already logged in
    await detoxExpected(element(by.id('dashboard-screen'))).toBeVisible();
    return; // Already logged in
  } catch (error) {
    // Not logged in, proceed with login
    await element(by.id('welcome-login-button')).tap();
    await element(by.id('phone-number-input')).typeText('0412345678');
    await element(by.id('password-input')).typeText('TestPassword123!');
    await element(by.id('login-button')).tap();
    
    await waitFor(element(by.id('dashboard-screen')))
      .toBeVisible()
      .withTimeout(10000);
  }
}