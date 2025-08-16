import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display login form on home page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /sign in to axis imaging/i })).toBeVisible()
    await expect(page.getByLabel(/email address/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click()
    
    await expect(page.getByText(/email is required/i)).toBeVisible()
    await expect(page.getByText(/password is required/i)).toBeVisible()
  })

  test('should show validation error for invalid email', async ({ page }) => {
    await page.getByLabel(/email address/i).fill('invalid-email')
    await page.getByRole('button', { name: /sign in/i }).click()
    
    await expect(page.getByText(/please enter a valid email address/i)).toBeVisible()
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.getByLabel(/email address/i).fill('test@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.getByLabel(/email address/i).fill('test@example.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()
    
    await expect(page.getByText(/invalid credentials/i)).toBeVisible()
    // Should stay on login page
    await expect(page).toHaveURL('/')
  })

  test('should navigate to registration page', async ({ page }) => {
    await page.getByRole('link', { name: /sign up here/i }).click()
    
    await expect(page).toHaveURL('/register')
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()
  })

  test('should navigate to forgot password page', async ({ page }) => {
    await page.getByRole('link', { name: /forgot your password/i }).click()
    
    await expect(page).toHaveURL('/forgot-password')
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible()
  })

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i)
    const toggleButton = page.getByRole('button', { name: /show password/i })
    
    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password')
    
    // Click to show password
    await toggleButton.click()
    await expect(passwordInput).toHaveAttribute('type', 'text')
    await expect(page.getByRole('button', { name: /hide password/i })).toBeVisible()
    
    // Click to hide password again
    await page.getByRole('button', { name: /hide password/i }).click()
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  test('should remember email when checkbox is checked', async ({ page }) => {
    await page.getByLabel(/email address/i).fill('test@example.com')
    await page.getByLabel(/remember me/i).check()
    
    // Reload page
    await page.reload()
    
    // Email should be remembered
    await expect(page.getByLabel(/email address/i)).toHaveValue('test@example.com')
    await expect(page.getByLabel(/remember me/i)).toBeChecked()
  })
})

test.describe('Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register')
  })

  test('should display registration form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()
    await expect(page.getByLabel(/first name/i)).toBeVisible()
    await expect(page.getByLabel(/last name/i)).toBeVisible()
    await expect(page.getByLabel(/email address/i)).toBeVisible()
    await expect(page.getByLabel(/phone number/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByLabel(/confirm password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
  })

  test('should validate all required fields', async ({ page }) => {
    await page.getByRole('button', { name: /create account/i }).click()
    
    await expect(page.getByText(/first name is required/i)).toBeVisible()
    await expect(page.getByText(/last name is required/i)).toBeVisible()
    await expect(page.getByText(/email is required/i)).toBeVisible()
    await expect(page.getByText(/phone number is required/i)).toBeVisible()
    await expect(page.getByText(/password is required/i)).toBeVisible()
  })

  test('should validate password strength', async ({ page }) => {
    await page.getByLabel(/password/i).fill('weak')
    await page.getByRole('button', { name: /create account/i }).click()
    
    await expect(page.getByText(/password must be at least 8 characters/i)).toBeVisible()
  })

  test('should validate password confirmation', async ({ page }) => {
    await page.getByLabel(/password/i).fill('password123')
    await page.getByLabel(/confirm password/i).fill('different123')
    await page.getByRole('button', { name: /create account/i }).click()
    
    await expect(page.getByText(/passwords do not match/i)).toBeVisible()
  })

  test('should register successfully with valid data', async ({ page }) => {
    await page.getByLabel(/first name/i).fill('Jane')
    await page.getByLabel(/last name/i).fill('Smith')
    await page.getByLabel(/email address/i).fill('jane@example.com')
    await page.getByLabel(/phone number/i).fill('+61400000001')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByLabel(/confirm password/i).fill('password123')
    await page.getByLabel(/i agree to the terms/i).check()
    
    await page.getByRole('button', { name: /create account/i }).click()
    
    // Should show success message and redirect
    await expect(page.getByText(/account created successfully/i)).toBeVisible()
    await expect(page).toHaveURL('/verify-email')
  })

  test('should show error for existing email', async ({ page }) => {
    await page.getByLabel(/first name/i).fill('John')
    await page.getByLabel(/last name/i).fill('Doe')
    await page.getByLabel(/email address/i).fill('test@example.com') // Existing email
    await page.getByLabel(/phone number/i).fill('+61400000001')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByLabel(/confirm password/i).fill('password123')
    await page.getByLabel(/i agree to the terms/i).check()
    
    await page.getByRole('button', { name: /create account/i }).click()
    
    await expect(page.getByText(/user already exists/i)).toBeVisible()
  })
})

test.describe('Logout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/')
    await page.getByLabel(/email address/i).fill('test@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/dashboard')
  })

  test('should logout successfully', async ({ page }) => {
    // Click profile menu
    await page.getByRole('button', { name: /user menu/i }).click()
    
    // Click logout
    await page.getByRole('menuitem', { name: /sign out/i }).click()
    
    // Should redirect to login page
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: /sign in to axis imaging/i })).toBeVisible()
  })

  test('should clear authentication state on logout', async ({ page }) => {
    // Logout
    await page.getByRole('button', { name: /user menu/i }).click()
    await page.getByRole('menuitem', { name: /sign out/i }).click()
    
    // Try to access protected route
    await page.goto('/dashboard')
    
    // Should redirect to login
    await expect(page).toHaveURL('/')
  })
})

test.describe('Protected Routes', () => {
  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/dashboard')
    
    await expect(page).toHaveURL('/')
    await expect(page.getByText(/please sign in to continue/i)).toBeVisible()
  })

  test('should redirect to login when token expires', async ({ page }) => {
    // Login first
    await page.goto('/')
    await page.getByLabel(/email address/i).fill('test@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/dashboard')
    
    // Simulate token expiration by clearing localStorage
    await page.evaluate(() => localStorage.clear())
    
    // Navigate to another page
    await page.goto('/studies')
    
    // Should redirect to login
    await expect(page).toHaveURL('/')
  })
})