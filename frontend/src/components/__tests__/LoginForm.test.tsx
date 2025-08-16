import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '../LoginForm'
import { render, createMockResponse, createMockError } from '../../tests/utils/test-utils'

// Mock the auth context
const mockLogin = jest.fn()

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLogin.mockReset()
  })

  it('renders login form correctly', () => {
    render(<LoginForm />, {
      authContext: { login: mockLogin, loading: false }
    })

    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    
    render(<LoginForm />, {
      authContext: { login: mockLogin, loading: false }
    })

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    // Try to submit without filling fields
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })

    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    
    render(<LoginForm />, {
      authContext: { login: mockLogin, loading: false }
    })

    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'invalid-email')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    })

    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue({ success: true })

    render(<LoginForm />, {
      authContext: { login: mockLogin, loading: false }
    })

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  it('displays error message on login failure', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue({ 
      success: false, 
      message: 'Invalid credentials' 
    })

    render(<LoginForm />, {
      authContext: { login: mockLogin, loading: false }
    })

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('shows loading state during login', async () => {
    const user = userEvent.setup()
    
    render(<LoginForm />, {
      authContext: { login: mockLogin, loading: true }
    })

    const submitButton = screen.getByRole('button', { name: /signing in/i })
    
    expect(submitButton).toBeDisabled()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    
    render(<LoginForm />, {
      authContext: { login: mockLogin, loading: false }
    })

    const passwordInput = screen.getByLabelText(/password/i)
    const toggleButton = screen.getByRole('button', { name: /show password/i })

    // Initially password should be hidden
    expect(passwordInput).toHaveAttribute('type', 'password')

    // Click to show password
    await user.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument()

    // Click to hide password again
    await user.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('navigates to registration page', async () => {
    const user = userEvent.setup()
    
    render(<LoginForm />, {
      authContext: { login: mockLogin, loading: false }
    })

    const signUpLink = screen.getByRole('link', { name: /sign up here/i })
    
    expect(signUpLink).toHaveAttribute('href', '/register')
  })

  it('navigates to forgot password page', async () => {
    const user = userEvent.setup()
    
    render(<LoginForm />, {
      authContext: { login: mockLogin, loading: false }
    })

    const forgotPasswordLink = screen.getByRole('link', { name: /forgot your password/i })
    
    expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password')
  })

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup()
    
    render(<LoginForm />, {
      authContext: { login: mockLogin, loading: false }
    })

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    // Tab through form elements
    await user.tab()
    expect(emailInput).toHaveFocus()

    await user.tab()
    expect(passwordInput).toHaveFocus()

    await user.tab()
    expect(submitButton).toHaveFocus()
  })

  it('remembers email in localStorage', async () => {
    const user = userEvent.setup()
    const mockSetItem = jest.spyOn(Storage.prototype, 'setItem')
    
    render(<LoginForm />, {
      authContext: { login: mockLogin, loading: false }
    })

    const emailInput = screen.getByLabelText(/email address/i)
    const rememberCheckbox = screen.getByLabelText(/remember me/i)

    await user.type(emailInput, 'test@example.com')
    await user.click(rememberCheckbox)

    expect(mockSetItem).toHaveBeenCalledWith('remembered_email', 'test@example.com')
  })

  it('loads remembered email on mount', () => {
    const mockGetItem = jest.spyOn(Storage.prototype, 'getItem')
    mockGetItem.mockReturnValue('remembered@example.com')
    
    render(<LoginForm />, {
      authContext: { login: mockLogin, loading: false }
    })

    const emailInput = screen.getByLabelText(/email address/i)
    
    expect(emailInput).toHaveValue('remembered@example.com')
  })

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup()
    mockLogin.mockRejectedValue(new Error('Network error'))

    render(<LoginForm />, {
      authContext: { login: mockLogin, loading: false }
    })

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/something went wrong. please try again/i)).toBeInTheDocument()
    })
  })
})