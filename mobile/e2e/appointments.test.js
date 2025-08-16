import { device, element, by, expect } from 'detox'
import { helpers } from './setup'

describe('Appointments Flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative()
    await helpers.login()
    await helpers.navigateToAppointments()
  })

  describe('Appointments List Screen', () => {
    it('should display appointments list elements', async () => {
      await expect(element(by.id('appointments-screen'))).toBeVisible()
      await expect(element(by.text('My Appointments'))).toBeVisible()
      await expect(element(by.id('appointments-list'))).toBeVisible()
      await expect(element(by.id('book-appointment-button'))).toBeVisible()
      await expect(element(by.id('filter-appointments-button'))).toBeVisible()
    })

    it('should show appointments with correct information', async () => {
      await expect(element(by.id('appointment-item-1'))).toBeVisible()
      await expect(element(by.text('MRI Head'))).toBeVisible()
      await expect(element(by.text('Feb 1, 2024'))).toBeVisible()
      await expect(element(by.text('10:00 AM'))).toBeVisible()
      await expect(element(by.text('SCHEDULED'))).toBeVisible()
      await expect(element(by.text('Axis Imaging Melbourne'))).toBeVisible()
    })

    it('should separate upcoming and past appointments', async () => {
      await expect(element(by.text('Upcoming Appointments'))).toBeVisible()
      await expect(element(by.text('Past Appointments'))).toBeVisible()
    })

    it('should filter appointments by status', async () => {
      await element(by.id('filter-appointments-button')).tap()
      await element(by.text('SCHEDULED')).tap()
      await element(by.id('apply-filter-button')).tap()
      
      await expect(element(by.text('SCHEDULED'))).toBeVisible()
    })

    it('should filter appointments by date range', async () => {
      await element(by.id('filter-appointments-button')).tap()
      await element(by.id('date-range-filter')).tap()
      await helpers.selectDate('start-date-picker', new Date('2024-02-01'))
      await helpers.selectDate('end-date-picker', new Date('2024-02-28'))
      await element(by.id('apply-filter-button')).tap()
      
      await expect(element(by.text('Feb 1, 2024'))).toBeVisible()
    })

    it('should navigate to book appointment screen', async () => {
      await element(by.id('book-appointment-button')).tap()
      
      await expect(element(by.id('book-appointment-screen'))).toBeVisible()
      await expect(element(by.text('Book an Appointment'))).toBeVisible()
    })

    it('should pull to refresh appointments', async () => {
      await helpers.pullToRefresh('appointments-list')
      
      await expect(element(by.id('loading-indicator'))).toBeVisible()
      await expect(element(by.id('loading-indicator'))).not.toBeVisible()
    })
  })

  describe('Appointment Details Screen', () => {
    beforeEach(async () => {
      await element(by.id('appointment-item-1')).tap()
      await expect(element(by.id('appointment-details-screen'))).toBeVisible()
    })

    it('should display appointment details', async () => {
      await expect(element(by.text('MRI Head'))).toBeVisible()
      await expect(element(by.text('Feb 1, 2024'))).toBeVisible()
      await expect(element(by.text('10:00 AM - 11:00 AM'))).toBeVisible()
      await expect(element(by.text('Axis Imaging Melbourne'))).toBeVisible()
      await expect(element(by.text('123 Collins Street, Melbourne'))).toBeVisible()
      await expect(element(by.text('SCHEDULED'))).toBeVisible()
    })

    it('should show preparation instructions', async () => {
      await expect(element(by.text('Preparation Instructions'))).toBeVisible()
      await expect(element(by.text('Remove all metal objects'))).toBeVisible()
      await expect(element(by.text('Arrive 30 minutes early'))).toBeVisible()
    })

    it('should show appointment reason', async () => {
      await expect(element(by.text('Reason for Scan'))).toBeVisible()
      await expect(element(by.text('Follow-up scan'))).toBeVisible()
    })

    it('should allow adding to calendar', async () => {
      await element(by.id('add-to-calendar-button')).tap()
      
      // Platform specific calendar integration
      await expect(element(by.text('Event added to calendar'))).toBeVisible()
    })

    it('should show location with map option', async () => {
      await expect(element(by.id('location-section'))).toBeVisible()
      await expect(element(by.id('view-map-button'))).toBeVisible()
    })

    it('should open map when map button is tapped', async () => {
      await element(by.id('view-map-button')).tap()
      
      // Should open external maps app or show in-app map
      await expect(element(by.id('map-screen'))).toBeVisible()
    })

    it('should show contact information', async () => {
      await expect(element(by.text('Contact Information'))).toBeVisible()
      await expect(element(by.text('+61 3 9000 0000'))).toBeVisible()
      await expect(element(by.id('call-clinic-button'))).toBeVisible()
    })

    it('should allow calling clinic', async () => {
      await element(by.id('call-clinic-button')).tap()
      
      // Should prompt to make phone call
      await expect(element(by.text('Call Clinic'))).toBeVisible()
    })

    it('should allow canceling appointment', async () => {
      await element(by.id('cancel-appointment-button')).tap()
      
      await expect(element(by.text('Cancel Appointment'))).toBeVisible()
      await expect(element(by.text('Are you sure you want to cancel this appointment?'))).toBeVisible()
    })

    it('should confirm appointment cancellation', async () => {
      await element(by.id('cancel-appointment-button')).tap()
      await element(by.id('confirm-cancel-button')).tap()
      
      await expect(element(by.text('Appointment cancelled successfully'))).toBeVisible()
      await expect(element(by.id('appointments-screen'))).toBeVisible()
    })

    it('should allow rescheduling appointment', async () => {
      await element(by.id('reschedule-appointment-button')).tap()
      
      await expect(element(by.id('reschedule-screen'))).toBeVisible()
      await expect(element(by.text('Reschedule Appointment'))).toBeVisible()
    })
  })

  describe('Book Appointment Flow', () => {
    beforeEach(async () => {
      await element(by.id('book-appointment-button')).tap()
      await expect(element(by.id('book-appointment-screen'))).toBeVisible()
    })

    it('should display booking form elements', async () => {
      await expect(element(by.text('Book an Appointment'))).toBeVisible()
      await expect(element(by.id('modality-picker'))).toBeVisible()
      await expect(element(by.id('body-part-picker'))).toBeVisible()
      await expect(element(by.id('preferred-date-picker'))).toBeVisible()
      await expect(element(by.id('preferred-time-picker'))).toBeVisible()
      await expect(element(by.id('location-picker'))).toBeVisible()
      await expect(element(by.id('reason-input'))).toBeVisible()
    })

    it('should validate required fields', async () => {
      await element(by.id('book-appointment-submit-button')).tap()
      
      await expect(element(by.text('Modality is required'))).toBeVisible()
      await expect(element(by.text('Body part is required'))).toBeVisible()
      await expect(element(by.text('Preferred date is required'))).toBeVisible()
    })

    it('should select modality and body part', async () => {
      await element(by.id('modality-picker')).tap()
      await element(by.text('MRI')).tap()
      
      await element(by.id('body-part-picker')).tap()
      await element(by.text('HEAD')).tap()
      
      await expect(element(by.text('MRI'))).toBeVisible()
      await expect(element(by.text('HEAD'))).toBeVisible()
    })

    it('should select preferred date and time', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      
      await element(by.id('preferred-date-picker')).tap()
      await helpers.selectDate('date-picker', futureDate)
      
      await element(by.id('preferred-time-picker')).tap()
      await element(by.text('10:00 AM')).tap()
    })

    it('should select location', async () => {
      await element(by.id('location-picker')).tap()
      await element(by.text('Axis Imaging Melbourne')).tap()
      
      await expect(element(by.text('Axis Imaging Melbourne'))).toBeVisible()
    })

    it('should show available time slots for selected date', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      
      await element(by.id('modality-picker')).tap()
      await element(by.text('MRI')).tap()
      
      await element(by.id('location-picker')).tap()
      await element(by.text('Axis Imaging Melbourne')).tap()
      
      await element(by.id('preferred-date-picker')).tap()
      await helpers.selectDate('date-picker', futureDate)
      
      await expect(element(by.text('Available Times'))).toBeVisible()
      await expect(element(by.text('9:00 AM'))).toBeVisible()
      await expect(element(by.text('10:00 AM'))).toBeVisible()
    })

    it('should book appointment successfully', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      
      // Fill out form
      await element(by.id('modality-picker')).tap()
      await element(by.text('MRI')).tap()
      
      await element(by.id('body-part-picker')).tap()
      await element(by.text('HEAD')).tap()
      
      await element(by.id('location-picker')).tap()
      await element(by.text('Axis Imaging Melbourne')).tap()
      
      await element(by.id('preferred-date-picker')).tap()
      await helpers.selectDate('date-picker', futureDate)
      
      await element(by.text('10:00 AM')).tap()
      
      await element(by.id('reason-input')).typeText('Follow-up scan')
      
      // Submit
      await element(by.id('book-appointment-submit-button')).tap()
      
      await expect(element(by.text('Appointment booked successfully'))).toBeVisible()
      await expect(element(by.id('appointments-screen'))).toBeVisible()
    })

    it('should show no available slots message when fully booked', async () => {
      const busyDate = new Date()
      busyDate.setDate(busyDate.getDate() + 1) // Tomorrow might be fully booked
      
      await element(by.id('modality-picker')).tap()
      await element(by.text('MRI')).tap()
      
      await element(by.id('location-picker')).tap()
      await element(by.text('Axis Imaging Melbourne')).tap()
      
      await element(by.id('preferred-date-picker')).tap()
      await helpers.selectDate('date-picker', busyDate)
      
      await expect(element(by.text('No available slots for this date'))).toBeVisible()
      await expect(element(by.text('Please select a different date'))).toBeVisible()
    })
  })

  describe('Appointment Reminders', () => {
    it('should show reminder notification', async () => {
      // This would typically be tested with notifications in the background
      await device.sendToHome()
      await device.launchApp()
      
      // Check if reminder notification was shown
      await expect(element(by.text('Appointment Reminder'))).toBeVisible()
    })

    it('should allow setting reminder preferences', async () => {
      await element(by.id('appointment-item-1')).tap()
      await element(by.id('reminder-settings-button')).tap()
      
      await expect(element(by.text('Reminder Settings'))).toBeVisible()
      await expect(element(by.text('1 day before'))).toBeVisible()
      await expect(element(by.text('1 hour before'))).toBeVisible()
    })

    it('should update reminder preferences', async () => {
      await element(by.id('appointment-item-1')).tap()
      await element(by.id('reminder-settings-button')).tap()
      
      await element(by.id('reminder-1-day')).tap()
      await element(by.id('reminder-1-hour')).tap()
      await element(by.id('save-reminders-button')).tap()
      
      await expect(element(by.text('Reminder preferences updated'))).toBeVisible()
    })
  })

  describe('Error Handling', () => {
    it('should show error when appointments fail to load', async () => {
      await helpers.enableAirplaneMode()
      await helpers.pullToRefresh('appointments-list')
      
      await expect(element(by.text('Unable to load appointments'))).toBeVisible()
      await expect(element(by.id('retry-button'))).toBeVisible()
      
      await helpers.disableAirplaneMode()
    })

    it('should show error when booking fails', async () => {
      await element(by.id('book-appointment-button')).tap()
      
      await helpers.enableAirplaneMode()
      
      // Fill form and submit
      await element(by.id('modality-picker')).tap()
      await element(by.text('MRI')).tap()
      
      await element(by.id('book-appointment-submit-button')).tap()
      
      await expect(element(by.text('Unable to book appointment'))).toBeVisible()
      
      await helpers.disableAirplaneMode()
    })

    it('should handle appointment conflicts gracefully', async () => {
      await element(by.id('book-appointment-button')).tap()
      
      // Try to book appointment at same time as existing one
      await element(by.id('modality-picker')).tap()
      await element(by.text('MRI')).tap()
      
      await element(by.id('preferred-date-picker')).tap()
      await helpers.selectDate('date-picker', new Date('2024-02-01'))
      
      await element(by.text('10:00 AM')).tap()
      await element(by.id('book-appointment-submit-button')).tap()
      
      await expect(element(by.text('Time slot no longer available'))).toBeVisible()
    })
  })

  describe('Accessibility', () => {
    it('should support screen reader navigation', async () => {
      await expect(element(by.id('appointments-screen'))).toBeVisible()
      
      // Test accessibility labels are present
      await expect(element(by.label('My Appointments'))).toBeVisible()
      await expect(element(by.label('Book new appointment'))).toBeVisible()
    })

    it('should support voice control commands', async () => {
      // Test voice control accessibility
      await element(by.label('Book new appointment')).tap()
      await expect(element(by.id('book-appointment-screen'))).toBeVisible()
    })
  })
})