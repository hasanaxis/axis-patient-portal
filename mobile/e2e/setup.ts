import { beforeAll, beforeEach, afterAll } from '@jest/globals'
import { device, element, by, expect as detoxExpect } from 'detox'

beforeAll(async () => {
  await device.launchApp()
})

beforeEach(async () => {
  await device.reloadReactNative()
})

afterAll(async () => {
  await device.terminateApp()
})

// Helper functions for common test patterns
export const helpers = {
  // Login helper
  async login(email: string = 'test@example.com', password: string = 'password123') {
    await element(by.id('email-input')).typeText(email)
    await element(by.id('password-input')).typeText(password)
    await element(by.id('login-button')).tap()
    await detoxExpected(element(by.id('dashboard-screen'))).toBeVisible()
  },

  // Logout helper
  async logout() {
    await element(by.id('profile-menu')).tap()
    await element(by.id('logout-button')).tap()
    await detoxExpected(element(by.id('login-screen'))).toBeVisible()
  },

  // Navigation helpers
  async navigateToStudies() {
    await element(by.id('tab-studies')).tap()
    await detoxExpected(element(by.id('studies-screen'))).toBeVisible()
  },

  async navigateToAppointments() {
    await element(by.id('tab-appointments')).tap()
    await detoxExpected(element(by.id('appointments-screen'))).toBeVisible()
  },

  async navigateToProfile() {
    await element(by.id('tab-profile')).tap()
    await detoxExpected(element(by.id('profile-screen'))).toBeVisible()
  },

  // Wait for element to appear
  async waitForElement(elementId: string, timeout: number = 5000) {
    await waitFor(element(by.id(elementId))).toBeVisible().withTimeout(timeout)
  },

  // Scroll helpers
  async scrollToElement(scrollViewId: string, elementId: string) {
    await element(by.id(scrollViewId)).scrollTo('bottom')
    await this.waitForElement(elementId)
  },

  // Text input helpers
  async clearAndType(elementId: string, text: string) {
    await element(by.id(elementId)).clearText()
    await element(by.id(elementId)).typeText(text)
  },

  // Date picker helper
  async selectDate(datePickerId: string, date: Date) {
    await element(by.id(datePickerId)).tap()
    await element(by.text(date.getFullYear().toString())).tap()
    await element(by.text(date.toLocaleDateString('en-US', { month: 'long' }))).tap()
    await element(by.text(date.getDate().toString())).tap()
    await element(by.text('OK')).tap()
  },

  // Pull to refresh helper
  async pullToRefresh(scrollViewId: string) {
    await element(by.id(scrollViewId)).swipe('down', 'slow', 0.9)
  },

  // Device specific helpers
  async enableAirplaneMode() {
    await device.setURLBlacklist(['.*'])
  },

  async disableAirplaneMode() {
    await device.setURLBlacklist([])
  },

  // Permission helpers
  async allowPermissions() {
    await device.launchApp({ permissions: { camera: 'YES', photos: 'YES' } })
  }
}

// Custom matchers for Detox
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeVisibleOnScreen(): R
      toContainText(text: string): R
    }
  }
}