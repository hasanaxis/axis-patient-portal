import React, { ReactElement, ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../../contexts/AuthContext'
import { NotificationProvider } from '../../contexts/NotificationContext'

// Mock contexts for testing
interface MockAuthContextValue {
  user: any
  token: string | null
  isAuthenticated: boolean
  login: jest.Mock
  logout: jest.Mock
  register: jest.Mock
  loading: boolean
}

const createMockAuthContext = (overrides: Partial<MockAuthContextValue> = {}): MockAuthContextValue => ({
  user: null,
  token: null,
  isAuthenticated: false,
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  loading: false,
  ...overrides
})

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authContext?: Partial<MockAuthContextValue>
  initialEntries?: string[]
  queryClient?: QueryClient
}

const AllTheProviders = ({ 
  children, 
  authContext = {},
  initialEntries = ['/'],
  queryClient
}: {
  children: ReactNode
  authContext?: Partial<MockAuthContextValue>
  initialEntries?: string[]
  queryClient?: QueryClient
}) => {
  const mockAuthValue = createMockAuthContext(authContext)
  const defaultQueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  })

  const client = queryClient || defaultQueryClient

  return (
    <BrowserRouter>
      <QueryClientProvider client={client}>
        <AuthProvider value={mockAuthValue}>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  )
}

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { authContext, initialEntries, queryClient, ...renderOptions } = options

  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders 
        authContext={authContext}
        initialEntries={initialEntries}
        queryClient={queryClient}
      >
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  })
}

// Helper functions for common test scenarios
export const renderWithAuth = (
  ui: ReactElement,
  authOverrides: Partial<MockAuthContextValue> = {},
  options: RenderOptions = {}
) => {
  return customRender(ui, {
    authContext: { isAuthenticated: true, ...authOverrides },
    ...options
  })
}

export const renderWithoutAuth = (
  ui: ReactElement,
  options: RenderOptions = {}
) => {
  return customRender(ui, {
    authContext: { isAuthenticated: false },
    ...options
  })
}

export const renderWithLoading = (
  ui: ReactElement,
  options: RenderOptions = {}
) => {
  return customRender(ui, {
    authContext: { loading: true },
    ...options
  })
}

// Helper to create mock fetch responses
export const createMockResponse = (data: any, ok = true, status = 200) => {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
    headers: new Headers(),
    statusText: ok ? 'OK' : 'Error'
  } as Response)
}

// Helper to mock API errors
export const createMockError = (message = 'Network error') => {
  return Promise.reject(new Error(message))
}

// Helper to wait for async operations
export const waitForPromises = () => new Promise(setImmediate)

// Common user interactions
export const userInteractions = {
  typeInInput: async (input: HTMLElement, value: string) => {
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.change(input, { target: { value } })
  },
  
  clickButton: async (button: HTMLElement) => {
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.click(button)
  },
  
  submitForm: async (form: HTMLElement) => {
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.submit(form)
  }
}

// Accessibility testing helpers
export const checkAccessibility = async (container: HTMLElement) => {
  const { axe, toHaveNoViolations } = await import('jest-axe')
  expect.extend(toHaveNoViolations)
  
  const results = await axe(container)
  expect(results).toHaveNoViolations()
}

// Performance testing helpers
export const measureRenderTime = (renderFn: () => void) => {
  const start = performance.now()
  renderFn()
  const end = performance.now()
  return end - start
}

// Mock data factories
export const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  phoneNumber: '+61400000000',
  isVerified: true,
  ...overrides
})

export const createMockPatient = (overrides = {}) => ({
  id: 'patient-1',
  userId: 'user-1',
  patientNumber: 'AX001234',
  dateOfBirth: '1990-01-01',
  gender: 'MALE',
  medicareNumber: '1234567890',
  ...overrides
})

export const createMockStudy = (overrides = {}) => ({
  id: 'study-1',
  patientId: 'patient-1',
  accessionNumber: 'ACC001',
  studyDate: '2024-01-15T10:00:00Z',
  modality: 'CT',
  studyDescription: 'CT Chest',
  status: 'COMPLETED',
  hasReport: true,
  ...overrides
})

export const createMockAppointment = (overrides = {}) => ({
  id: 'appointment-1',
  patientId: 'patient-1',
  appointmentDate: '2024-02-01',
  appointmentTime: '10:00',
  modality: 'CT',
  bodyPart: 'CHEST',
  status: 'SCHEDULED',
  ...overrides
})

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }