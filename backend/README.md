# Axis Imaging Patient Portal - Backend API

A secure, HIPAA-compliant backend API for Axis Imaging's patient portal system, featuring invite-only registration, SMS-based authentication, and comprehensive audit logging.

## 🏥 Features

### Authentication & Security
- **Invite-only registration** - Patients can only register after scan completion
- **SMS-based OTP verification** - Secure phone number verification
- **JWT authentication** with refresh tokens
- **Session management** with automatic timeout
- **Password reset** via SMS OTP
- **Rate limiting** and brute force protection
- **HIPAA-compliant audit logging**

### Patient Management
- **Secure patient data access** - Patients can only view their own data
- **Study and image viewing** - Access to radiology scans and reports
- **Report notifications** - SMS alerts when results are ready
- **Appointment management** - View upcoming appointments
- **Preference management** - Communication and privacy settings

### Australian Healthcare Compliance
- **Medicare number validation**
- **Privacy Act 1988 compliance**
- **Individual Healthcare Identifier (IHI) support**
- **DVA number support**
- **7-year data retention** as per Australian requirements

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Twilio account (for SMS)

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up the database:**
   ```bash
   # Generate Prisma client
   npm run prisma:generate
   
   # Run migrations
   npm run prisma:migrate
   
   # Seed with sample data
   npm run prisma:seed
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3001`

## 📋 API Endpoints

### Authentication
- `POST /api/auth/validate-invitation` - Validate registration invitation
- `POST /api/auth/register` - Register new patient (invite-only)
- `POST /api/auth/login` - Patient login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/send-otp` - Send SMS OTP
- `POST /api/auth/verify-otp` - Verify SMS OTP
- `POST /api/auth/reset-password` - Reset password with OTP
- `GET /api/auth/profile` - Get current user profile
- `GET /api/auth/check` - Check authentication status

### Patient Data
- `GET /api/patients/dashboard` - Patient dashboard data
- `GET /api/patients/studies` - List patient studies
- `GET /api/patients/studies/:id` - Get study details
- `GET /api/patients/reports` - List patient reports
- `GET /api/patients/reports/:id` - Get report details
- `GET /api/patients/appointments` - List appointments
- `PATCH /api/patients/preferences` - Update preferences

### Invitations (Staff Only)
- `POST /api/invitations` - Create patient invitation
- `POST /api/invitations/:id/send` - Send invitation SMS
- `GET /api/invitations` - List invitations
- `GET /api/invitations/:id` - Get invitation details
- `GET /api/invitations/stats` - Invitation statistics
- `POST /api/invitations/bulk-create` - Bulk create invitations

## 🔒 Security Features

### Authentication Flow
1. **Scan Completion** → System creates invitation
2. **SMS Invitation** → Patient receives registration link
3. **Registration** → Verify phone + set password
4. **Login** → JWT tokens + session tracking
5. **Access Control** → Role-based permissions

### Security Measures
- **Invite-only registration** - Only patients with completed scans can register
- **Phone verification** - SMS OTP for all sensitive operations
- **Password requirements** - Strong password policy enforced
- **Session security** - IP validation, device fingerprinting
- **Rate limiting** - Protection against brute force attacks
- **Audit logging** - All patient data access logged
- **Data encryption** - Sensitive data encrypted at rest

## 📊 Database Schema

### Core Models
- **User** - Authentication and basic info
- **Patient** - Patient-specific medical data
- **Study** - DICOM imaging studies
- **Series** - Image series within studies
- **Image** - Individual DICOM images
- **Report** - Radiology reports
- **Appointment** - Scan appointments
- **Invitation** - Registration invitations
- **Session** - User sessions
- **AuditLog** - Compliance audit trail

### Key Relationships
- Patient → Studies (one-to-many)
- Study → Series (one-to-many)
- Series → Images (one-to-many)
- Study → Report (one-to-one)
- User → Sessions (one-to-many)

## 🏥 Healthcare Compliance

### HIPAA Compliance
- **Access Controls** - Role-based patient data access
- **Audit Trails** - Comprehensive logging of all data access
- **Data Encryption** - Sensitive data encrypted
- **Session Security** - Secure session management
- **Minimum Necessary** - Users only see their own data

### Australian Privacy Act 1988
- **Consent Management** - Explicit privacy consents
- **Data Retention** - 7-year retention policy
- **Individual Rights** - Access and correction rights
- **Breach Notification** - Security incident logging

## 📱 SMS Integration

### Twilio Configuration
The system uses Twilio for SMS delivery:

```bash
# Required environment variables
TWILIO_ACCOUNT_SID="your_account_sid"
TWILIO_AUTH_TOKEN="your_auth_token"
TWILIO_PHONE_NUMBER="+61400000000"
SMS_ENABLED=true
```

### SMS Templates
- **Invitation**: "Your scan at Axis Imaging is complete..."
- **OTP**: "Your verification code is: 123456"
- **Welcome**: "Welcome to Axis Imaging Patient Portal..."
- **Password Reset**: "Reset your password using code: 123456"

## 🔄 Invitation System

### Automatic Invitations
The system automatically creates invitations when:
1. A study status changes to "COMPLETED"
2. Patient doesn't have portal access yet
3. No active invitation exists

### Manual Invitations
Healthcare staff can manually create invitations for:
- Specific patients
- Bulk patient groups
- Custom messaging

### Security Features
- **30-day expiration** - Invitations expire automatically
- **Single use** - Each invitation can only be used once
- **Phone validation** - Must match patient's phone number
- **Attempt limiting** - Max 3 access attempts

## 📈 Monitoring & Logging

### Log Categories
- **Error Logs** (`logs/error.log`) - Application errors
- **Security Logs** (`logs/security.log`) - Security events
- **Audit Logs** (`logs/audit.log`) - Patient data access
- **Combined Logs** (`logs/combined.log`) - All application logs

### Healthcare-Specific Logging
```javascript
// Patient data access logging
healthcareLogger.patientAccess(patientId, userId, action, details);

// Authentication events
healthcareLogger.authEvent(event, userId, details);

// Security incidents
healthcareLogger.securityIncident(incident, severity, details);
```

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Test Coverage
- Unit tests for all services
- Integration tests for API endpoints
- Security tests for authentication flows

### Test Data
Use the seeded test data:
- **Test Patient**: +61412345001 (Sarah Mitchell)
- **Test Doctor**: Dr. Amanda Richards
- **Test Studies**: Various modalities and dates

## 🚀 Production Deployment

### Environment Variables
Ensure these are set in production:
- `NODE_ENV=production`
- `JWT_SECRET` - Strong, unique secret
- `DATABASE_URL` - Production database
- `TWILIO_*` - Production Twilio credentials
- `CORS_ORIGINS` - Production frontend URLs

### Security Checklist
- [ ] HTTPS enabled (required for HIPAA)
- [ ] Strong JWT secret configured
- [ ] Database connections encrypted
- [ ] SMS credentials secured
- [ ] Log rotation configured
- [ ] Backup strategy implemented
- [ ] Security monitoring enabled

## 📚 Development

### Project Structure
```
backend/
├── src/
│   ├── config/           # Configuration
│   ├── middleware/       # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── utils/           # Utilities
├── prisma/              # Database schema and migrations
├── logs/                # Application logs
└── uploads/             # File uploads
```

### Available Scripts
- `npm run dev` - Development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Lint code
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:seed` - Seed database
- `npm run prisma:studio` - Open Prisma Studio

### Code Style
- TypeScript with strict mode
- ESLint for code quality
- Prettier for formatting
- Comprehensive error handling
- Healthcare-focused logging

## 🆘 Support

### Common Issues

**SMS not sending:**
- Check Twilio credentials
- Verify phone number format
- Check SMS_ENABLED flag

**Database connection issues:**
- Verify DATABASE_URL format
- Check PostgreSQL is running
- Run migrations: `npm run prisma:migrate`

**Authentication failures:**
- Check JWT_SECRET is set
- Verify invitation token format
- Check session expiry settings

### Health Check
Visit `/api/health` to check system status:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "service": "Axis Imaging Patient Portal API",
  "version": "1.0.0"
}
```

### Contact
For technical support or questions about the Axis Imaging Patient Portal:
- **Email**: dev@axisimaging.com.au
- **Phone**: +61 3 8765 1000

---

Built with ❤️ for Australian healthcare by the Axis Imaging development team.