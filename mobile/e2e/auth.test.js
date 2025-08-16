import { device, element, by, expect } from 'detox'
import { helpers } from './setup'

describe('Authentication Flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative()
  })

  describe('Login Screen', () => {
    it('should display login form elements', async () => {
      await expect(element(by.id('login-screen'))).toBeVisible()
      await expect(element(by.id('email-input'))).toBeVisible()
      await expect(element(by.id('password-input'))).toBeVisible()
      await expect(element(by.id('login-button'))).toBeVisible()
      await expect(element(by.id('register-link'))).toBeVisible()
      await expect(element(by.id('forgot-password-link'))).toBeVisible()
    })

    it('should show validation errors for empty fields', async () => {
      await element(by.id('login-button')).tap()
      
      await expect(element(by.text('Email is required'))).toBeVisible()
      await expect(element(by.text('Password is required'))).toBeVisible()
    })

    it('should show validation error for invalid email format', async () => {
      await element(by.id('email-input')).typeText('invalid-email')
      await element(by.id('login-button')).tap()
      
      await expect(element(by.text('Please enter a valid email address'))).toBeVisible()
    })

    it('should login successfully with valid credentials', async () => {
      await helpers.login()
      
      await expect(element(by.id('dashboard-screen'))).toBeVisible()
      await expect(element(by.text('Welcome back'))).toBeVisible()
    })

    it('should show error for invalid credentials', async () => {
      await element(by.id('email-input')).typeText('test@example.com')
      await element(by.id('password-input')).typeText('wrongpassword')
      await element(by.id('login-button')).tap()
      
      await expect(element(by.text('Invalid credentials'))).toBeVisible()
      await expect(element(by.id('login-screen'))).toBeVisible()
    })

    it('should toggle password visibility', async () => {
      await element(by.id('password-input')).typeText('password123')
      await element(by.id('toggle-password-visibility')).tap()
      
      // Verify password is visible (implementation depends on how you handle this)
      await expect(element(by.id('password-input'))).toHaveText('password123')
      
      await element(by.id('toggle-password-visibility')).tap()
      // Verify password is hidden again
    })

    it('should navigate to registration screen', async () => {
      await element(by.id('register-link')).tap()
      
      await expect(element(by.id('register-screen'))).toBeVisible()
      await expect(element(by.text('Create Your Account'))).toBeVisible()
    })

    it('should navigate to forgot password screen', async () => {
      await element(by.id('forgot-password-link')).tap()
      
      await expect(element(by.id('forgot-password-screen'))).toBeVisible()
      await expect(element(by.text('Reset Your Password'))).toBeVisible()
    })
  })

  describe('Registration Screen', () => {
    beforeEach(async () => {
      await element(by.id('register-link')).tap()
      await expect(element(by.id('register-screen'))).toBeVisible()
    })

    it('should display registration form elements', async () => {
      await expect(element(by.id('first-name-input'))).toBeVisible()
      await expect(element(by.id('last-name-input'))).toBeVisible()
      await expect(element(by.id('email-input'))).toBeVisible()
      await expect(element(by.id('phone-input'))).toBeVisible()
      await expect(element(by.id('password-input'))).toBeVisible()
      await expect(element(by.id('confirm-password-input'))).toBeVisible()
      await expect(element(by.id('register-button'))).toBeVisible()
    })

    it('should validate all required fields', async () => {
      await element(by.id('register-button')).tap()
      
      await expect(element(by.text('First name is required'))).toBeVisible()
      await expect(element(by.text('Last name is required'))).toBeVisible()
      await expect(element(by.text('Email is required'))).toBeVisible()
      await expect(element(by.text('Phone number is required'))).toBeVisible()
      await expect(element(by.text('Password is required'))).toBeVisible()
    })

    it('should validate password strength', async () => {
      await element(by.id('password-input')).typeText('weak')
      await element(by.id('register-button')).tap()
      
      await expect(element(by.text('Password must be at least 8 characters'))).toBeVisible()
    })

    it('should validate password confirmation', async () => {
      await element(by.id('password-input')).typeText('password123')
      await element(by.id('confirm-password-input')).typeText('different123')
      await element(by.id('register-button')).tap()
      
      await expect(element(by.text('Passwords do not match'))).toBeVisible()
    })

    it('should register successfully with valid data', async () => {
      await element(by.id('first-name-input')).typeText('Jane')
      await element(by.id('last-name-input')).typeText('Smith')
      await element(by.id('email-input')).typeText('jane@example.com')
      await element(by.id('phone-input')).typeText('+61400000001')
      await element(by.id('password-input')).typeText('password123')
      await element(by.id('confirm-password-input')).typeText('password123')
      await element(by.id('terms-checkbox')).tap()
      
      await element(by.id('register-button')).tap()
      
      await expect(element(by.text('Account created successfully'))).toBeVisible()
      await expect(element(by.id('verify-email-screen'))).toBeVisible()
    })

    it('should show error for existing email', async () => {
      await element(by.id('first-name-input')).typeText('John')
      await element(by.id('last-name-input')).typeText('Doe')
      await element(by.id('email-input')).typeText('test@example.com') // Existing email
      await element(by.id('phone-input')).typeText('+61400000001')
      await element(by.id('password-input')).typeText('password123')
      await element(by.id('confirm-password-input')).typeText('password123')
      await element(by.id('terms-checkbox')).tap()
      
      await element(by.id('register-button')).tap()
      
      await expect(element(by.text('User already exists'))).toBeVisible()
    })
  })

  describe('Logout Flow', () => {
    beforeEach(async () => {
      await helpers.login()
    })

    it('should logout successfully', async () => {
      await element(by.id('profile-menu')).tap()
      await element(by.id('logout-button')).tap()
      
      await expect(element(by.id('login-screen'))).toBeVisible()
      await expect(element(by.text('Sign in to Axis Imaging'))).toBeVisible()
    })

    it('should clear authentication state on logout', async () => {
      await helpers.logout()
      
      // Try to access a protected screen by deep link
      await device.launchApp({ url: 'axisimaging://dashboard' })
      
      // Should redirect to login
      await expect(element(by.id('login-screen'))).toBeVisible()
    })
  })

  describe('Biometric Authentication', () => {
    beforeEach(async () => {
      await helpers.login()
      // Enable biometric authentication in settings
      await helpers.navigateToProfile()
      await element(by.id('biometric-toggle')).tap()
      await helpers.logout()
    })

    it('should prompt for biometric authentication when enabled', async () => {
      await element(by.id('email-input')).typeText('test@example.com')
      await element(by.id('login-button')).tap()
      
      await expect(element(by.text('Use Touch ID to sign in'))).toBeVisible()
    })

    it('should login with successful biometric authentication', async () => {
      await element(by.id('email-input')).typeText('test@example.com')
      await element(by.id('login-button')).tap()
      
      // Simulate successful biometric authentication
      await device.matchFace()
      
      await expect(element(by.id('dashboard-screen'))).toBeVisible()
    })

    it('should fallback to password on biometric failure', async () => {
      await element(by.id('email-input')).typeText('test@example.com')
      await element(by.id('login-button')).tap()
      
      // Simulate failed biometric authentication
      await device.unmatchedFace()
      
      await expect(element(by.id('password-input'))).toBeVisible()
      await element(by.id('password-input')).typeText('password123')
      await element(by.id('login-button')).tap()
      
      await expect(element(by.id('dashboard-screen'))).toBeVisible()
    })
  })
})