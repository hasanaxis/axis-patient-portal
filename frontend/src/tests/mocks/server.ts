import { setupServer } from 'msw/node'
import { rest } from 'msw'
import { mockData } from './data'

// Mock API endpoints
export const handlers = [
  // Authentication endpoints
  rest.post('/api/auth/login', (req, res, ctx) => {
    const { email, password } = req.body as any
    
    if (email === 'test@example.com' && password === 'password123') {
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          token: 'mock-jwt-token',
          user: mockData.users.testUser
        })
      )
    }
    
    return res(
      ctx.status(401),
      ctx.json({
        success: false,
        message: 'Invalid credentials'
      })
    )
  }),

  rest.post('/api/auth/register', (req, res, ctx) => {
    const { email } = req.body as any
    
    if (email === 'existing@example.com') {
      return res(
        ctx.status(400),
        ctx.json({
          success: false,
          message: 'User already exists'
        })
      )
    }
    
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        user: mockData.users.newUser
      })
    )
  }),

  rest.get('/api/auth/verify', (req, res, ctx) => {
    const authHeader = req.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res(
        ctx.status(401),
        ctx.json({
          success: false,
          message: 'No token provided'
        })
      )
    }
    
    const token = authHeader.split(' ')[1]
    
    if (token === 'mock-jwt-token') {
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          user: mockData.users.testUser
        })
      )
    }
    
    return res(
      ctx.status(401),
      ctx.json({
        success: false,
        message: 'Invalid token'
      })
    )
  }),

  // Patient endpoints
  rest.get('/api/patients/profile', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        patient: mockData.patients.testPatient
      })
    )
  }),

  rest.put('/api/patients/profile', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        patient: { ...mockData.patients.testPatient, ...req.body }
      })
    )
  }),

  // Studies endpoints
  rest.get('/api/studies', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        studies: mockData.studies.list
      })
    )
  }),

  rest.get('/api/studies/:id', (req, res, ctx) => {
    const { id } = req.params
    const study = mockData.studies.list.find(s => s.id === id)
    
    if (!study) {
      return res(
        ctx.status(404),
        ctx.json({
          success: false,
          message: 'Study not found'
        })
      )
    }
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        study
      })
    )
  }),

  // Appointments endpoints
  rest.get('/api/appointments', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        appointments: mockData.appointments.list
      })
    )
  }),

  rest.post('/api/appointments', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        appointment: {
          id: 'new-appointment-id',
          ...req.body,
          status: 'SCHEDULED',
          createdAt: new Date().toISOString()
        }
      })
    )
  }),

  rest.put('/api/appointments/:id', (req, res, ctx) => {
    const { id } = req.params
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        appointment: {
          id,
          ...req.body,
          updatedAt: new Date().toISOString()
        }
      })
    )
  }),

  rest.delete('/api/appointments/:id', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Appointment cancelled'
      })
    )
  }),

  // Reports endpoints
  rest.get('/api/reports/:studyId', (req, res, ctx) => {
    const { studyId } = req.params
    const report = mockData.reports[studyId as string]
    
    if (!report) {
      return res(
        ctx.status(404),
        ctx.json({
          success: false,
          message: 'Report not found'
        })
      )
    }
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        report
      })
    )
  }),

  // Sharing endpoints
  rest.post('/api/sharing/create', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        shareId: 'new-share-id',
        accessUrl: 'https://portal.axisimaging.com.au/shared/abc123',
        accessToken: 'share-token-123'
      })
    )
  }),

  rest.get('/api/sharing/patient/:patientId', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        shares: mockData.shares.list
      })
    )
  }),

  // Error handlers for testing error states
  rest.get('/api/error/500', (req, res, ctx) => {
    return res(ctx.status(500))
  }),

  rest.get('/api/error/network', (req, res, ctx) => {
    return res.networkError('Network error')
  }),
]

export const server = setupServer(...handlers)