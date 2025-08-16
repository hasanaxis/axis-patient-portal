# Axis Imaging SMS Notification System

## Overview

Comprehensive SMS notification system for Axis Imaging, focused on report readiness notifications and patient engagement. Built for Australian healthcare providers with full compliance to Privacy Act 1988 and healthcare communication standards.

## 🚀 Features

### Report Readiness Notifications
- **Scan-specific templates**: X-ray, CT, Ultrasound, MRI, Mammogram
- **Automatic triggers**: SMS sent when report status changes to "final"
- **Smart messaging**: "Your X-ray results are available. Book an appointment with your GP to discuss."
- **Deep links**: Direct links to patient portal for instant access

### Patient Information SMS
- **Registration invitations**: After scan completion
- **Appointment confirmations**: Automatic booking confirmations
- **Reminders**: 24-hour and 2-hour appointment reminders
- **Contact information**: Axis Imaging details and instructions
- **GP discussion reminders**: Follow-up reminders to discuss results with GP
- **Preparation instructions**: Pre-scan preparation for different modalities

### Australian Phone Number Support
- **Format handling**: Accepts 0412345678, +61412345678, 412345678
- **Automatic formatting**: Converts to international format (+61412345678)
- **Validation**: Comprehensive Australian mobile number validation
- **Telco compatibility**: Works with all major Australian carriers

### Business Hours Delivery
- **Weekday hours**: Monday-Friday 7:00 AM - 7:00 PM
- **Saturday hours**: Saturday 8:00 AM - 4:00 PM
- **Sunday**: No delivery (configurable)
- **Emergency override**: Critical findings bypass business hours
- **Automatic scheduling**: Non-urgent messages scheduled for next business hour

### Patient Opt-out Management
- **Keyword support**: STOP, UNSUBSCRIBE, OPT OUT, QUIT, CANCEL
- **Granular preferences**: Separate settings for different message types
- **Complete opt-out**: Full SMS blocking with audit trail
- **Re-subscription**: Easy opt-in process
- **Emergency bypass**: Critical findings still delivered (configurable)

### Delivery Tracking & Retry Logic
- **Real-time tracking**: Twilio webhook integration
- **Delivery confirmation**: Sent, delivered, failed status tracking
- **Smart retry**: Up to 3 retries with exponential backoff
- **Failure analysis**: Detailed error codes and reasons
- **Performance monitoring**: Delivery rate alerts and reporting

## 📋 Message Templates

### Report Ready Templates

```typescript
// General scan report
"Hi {patientName}, your {scanType} report from Axis Imaging is ready. View it in the app: {appLink} or book an appointment with your GP to discuss the results."

// X-ray specific
"Hi {patientName}, your X-ray results from Axis Imaging are now available. Please book an appointment with your GP to discuss your results. View online: {appLink}"

// CT scan specific
"Hi {patientName}, your CT scan results from Axis Imaging are ready. It's important to book an appointment with your GP to review these results. Access your report: {appLink}"
```

### Appointment Templates

```typescript
// Confirmation
"Hi {patientName}, your {scanType} appointment is confirmed for {appointmentDate} at {appointmentTime} at Axis Imaging {location}. Please arrive 15 minutes early."

// 24-hour reminder
"Reminder: {patientName}, you have a scan appointment tomorrow {appointmentDate} at {appointmentTime} with Axis Imaging. {preparationInstructions}"

// 2-hour reminder
"Final reminder: {patientName}, your scan appointment is in 2 hours at {appointmentTime}. Axis Imaging is located at {location}. Please arrive 15 minutes early."
```

### Emergency Template

```typescript
// Critical findings
"URGENT: {patientName}, your recent scan results from Axis Imaging require immediate medical attention. Please contact your GP or call us immediately on {contactNumber}."
```

## 🛠 Installation & Setup

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Twilio account with Australian phone number
- Domain with HTTPS for webhooks

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# Required Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM_NUMBER=+61412345678
TWILIO_WEBHOOK_URL=https://api.axisimaging.com.au/sms/webhook/twilio/status

# Application URLs
APP_BASE_URL=https://app.axisimaging.com.au
REGISTRATION_BASE_URL=https://register.axisimaging.com.au

# Business Configuration
BUSINESS_HOURS_WEEKDAY_START=07:00
BUSINESS_HOURS_WEEKDAY_END=19:00
BUSINESS_HOURS_SATURDAY_START=08:00
BUSINESS_HOURS_SATURDAY_END=16:00
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed database (optional)
npm run prisma:seed
```

### 4. Twilio Configuration

1. **Purchase Australian Phone Number**:
   - Go to Twilio Console → Phone Numbers
   - Buy a number with SMS capabilities
   - Choose Australian number (+61)

2. **Configure Webhooks**:
   - Set webhook URL: `https://your-domain.com/api/sms/webhook/twilio/status`
   - Enable delivery status tracking
   - Configure incoming SMS for opt-out keywords

3. **Set up Opt-out Keywords**:
   - Go to Messaging → Try It → Phone Numbers
   - Add keywords: STOP, UNSUBSCRIBE, OPT OUT
   - Set webhook for incoming messages

## 📱 Usage Examples

### Basic SMS Sending

```typescript
import { initializeSMSServices } from './src/services/sms'

const smsContainer = await initializeSMSServices(prisma)

// Send report ready notification
const result = await smsContainer.service.sendSMS({
  to: '+61412345678',
  templateType: 'report_ready_xray',
  variables: {
    patientName: 'John Smith',
    appLink: 'https://app.axisimaging.com.au/scan/abc123'
  },
  patientId: 'patient-uuid',
  priority: 'normal'
})
```

### Automated Report Status Triggers

```typescript
// Integrate with Prisma middleware
prisma.$use(async (params, next) => {
  const result = await next(params)
  
  if (params.model === 'Report' && params.action === 'update') {
    const newStatus = params.data?.status
    if (newStatus === 'FINAL') {
      await smsContainer.automation.handleReportStatusChange(
        params.where.id,
        'FINAL',
        'PENDING'
      )
    }
  }
  
  return result
})
```

### Manual Staff Interface

```typescript
// Express.js routes
app.use('/api/admin/sms', createSMSRoutes(smsContainer.controller))

// Send custom message
POST /api/admin/sms/send/custom
{
  "patientId": "uuid",
  "message": "Your scan has been rescheduled to tomorrow at 2 PM.",
  "priority": "normal"
}

// Send bulk appointment reminders
POST /api/admin/sms/send/bulk
{
  "patientIds": ["uuid1", "uuid2", "uuid3"],
  "templateType": "appointment_reminder_24h",
  "variables": {
    "appointmentDate": "Monday, 15th January 2024",
    "appointmentTime": "2:30 PM"
  }
}
```

### Patient Preference Management

```typescript
// Patient portal routes
app.use('/api/patient/sms', createPatientSMSRoutes(smsContainer.controller))

// Update preferences
PUT /api/patient/sms/preferences
{
  "reportReadyNotifications": true,
  "appointmentReminders": true,
  "generalInformation": false,
  "emergencyNotifications": true
}

// Complete opt-out
POST /api/patient/sms/opt-out
{
  "reason": "No longer want SMS notifications"
}
```

## 🔄 Automated Jobs

The system includes scheduled jobs for automation:

### Job Schedule

- **Process Scheduled Messages**: Every 5 minutes
- **Retry Failed Messages**: Every 6 hours
- **Send Appointment Reminders**: 8 AM, 2 PM, 8 PM daily
- **Check Critical Findings**: Every 15 minutes
- **Generate Daily Reports**: 1 AM daily
- **Cleanup Old Data**: 2 AM on Sundays

### Manual Job Management

```typescript
// Run specific job manually
await smsContainer.scheduler.runJob('retryFailedMessages')

// Get job status
const status = smsContainer.scheduler.getJobStatus()
console.log(status)
// Output: [{ name: 'processScheduledMessages', running: true, config: {...} }]

// Update job configuration
smsContainer.scheduler.updateJobConfig('processScheduledMessages', {
  enabled: false,
  schedule: '*/10 * * * *' // Every 10 minutes
})
```

## 📊 Monitoring & Reporting

### Health Check

```bash
GET /api/health/sms
```

Response:
```json
{
  "status": "healthy",
  "checks": {
    "twilio": { "status": "pass" },
    "database": { "status": "pass" },
    "scheduler": { "status": "pass", "message": "6/6 jobs running" },
    "delivery": { "status": "pass", "message": "94.2% success rate" }
  }
}
```

### Delivery Reports

```typescript
// Get delivery report
GET /api/admin/sms/reports/delivery?startDate=2024-01-01&endDate=2024-01-31

// Response
{
  "report": {
    "period": { "startDate": "2024-01-01", "endDate": "2024-01-31" },
    "summary": {
      "totalSent": 1250,
      "delivered": 1180,
      "failed": 70,
      "deliveryRate": "94.40",
      "failureRate": "5.60"
    },
    "byTemplate": [
      { "templateType": "report_ready_xray", "count": 450 },
      { "templateType": "appointment_reminder_24h", "count": 320 }
    ]
  }
}
```

### Failed Message Analysis

```typescript
// Get failed messages
GET /api/admin/sms/reports/failed?hours=24

// Response
{
  "failedMessages": [
    {
      "id": "sms-uuid",
      "templateType": "report_ready_ct",
      "phoneNumber": "+61412345678",
      "error": "Invalid phone number",
      "retryCount": 3,
      "patient": { "name": "John Smith" }
    }
  ]
}
```

## 🔒 Security & Compliance

### Privacy Act 1988 Compliance

- **Data minimization**: Only necessary data stored
- **Retention limits**: 7-year retention for healthcare records
- **Access controls**: Role-based access to SMS functions
- **Audit logging**: Complete SMS activity logs
- **Patient consent**: Clear opt-in/opt-out mechanisms

### Security Features

- **Webhook validation**: Twilio signature verification
- **Rate limiting**: API endpoint protection
- **Phone validation**: Australian number format verification
- **Template validation**: XSS and injection prevention
- **Secure storage**: Encrypted sensitive data

### GDPR Features

- **Right to be forgotten**: Complete data removal
- **Data portability**: SMS history export
- **Consent management**: Granular preference controls
- **Breach notification**: Automated failure alerts

## 🚨 Emergency Procedures

### Critical Finding Protocol

1. **Automatic Detection**: Reports marked as `isCritical: true`
2. **Immediate Notification**: Bypasses business hours and scheduling
3. **Escalation**: Multiple notification attempts
4. **Audit Trail**: Complete logging of critical notifications
5. **GP Notification**: Automatic referrer notification (if configured)

### Emergency Override

```typescript
// Emergency notification (bypasses all restrictions)
await smsContainer.service.sendSMS({
  to: '+61412345678',
  templateType: 'urgent_review_required',
  variables: {
    patientName: 'Jane Doe',
    contactNumber: '(03) 8746 4200'
  },
  priority: 'emergency' // Bypasses business hours and opt-out
})
```

### System Recovery

```bash
# Restart SMS services
npm run sms:restart

# Retry all failed messages from last 24 hours
npm run sms:retry-failed

# Process all scheduled messages immediately
npm run sms:process-scheduled

# Generate emergency report
npm run sms:emergency-report
```

## 📈 Performance Optimization

### Message Throughput

- **Batch processing**: Up to 50 messages per batch
- **Rate limiting**: Respects Twilio API limits
- **Queue management**: Redis-based message queuing (optional)
- **Retry backoff**: Exponential backoff for failed messages

### Database Optimization

- **Indexed queries**: Optimized for delivery tracking
- **Archival strategy**: Automatic old data cleanup
- **Connection pooling**: Efficient database connections
- **Query optimization**: Minimal database calls

## 🧪 Testing

### Development Mode

```env
NODE_ENV=development
TWILIO_FROM_NUMBER="+15005550006"  # Twilio magic number
SMS_ENABLE_SCHEDULED_JOBS="false"
DEV_ENABLE_SMS_SIMULATION="true"
```

### Test Templates

```typescript
// Test with magic numbers
await smsContainer.service.sendSMS({
  to: '+15005550006', // Always succeeds
  templateType: 'report_ready_general',
  variables: { patientName: 'Test Patient' }
})

// Test failure scenarios
await smsContainer.service.sendSMS({
  to: '+15005550009', // Always fails
  templateType: 'report_ready_general',
  variables: { patientName: 'Test Patient' }
})
```

### Integration Tests

```bash
# Run SMS integration tests
npm run test:sms

# Test delivery tracking
npm run test:sms:delivery

# Test business hours logic
npm run test:sms:business-hours

# Test opt-out functionality
npm run test:sms:opt-out
```

## 📚 API Reference

### Core SMS Service

```typescript
interface SendSMSRequest {
  to: string                    // Australian phone number
  templateType: string          // Template identifier
  variables?: Record<string, string>  // Template variables
  patientId?: string           // Patient UUID
  reportId?: string            // Report UUID
  priority?: 'normal' | 'high' | 'emergency'
  scheduledAt?: Date           // Schedule for later
}

interface SMSDeliveryResult {
  id: string                   // SMS notification ID
  status: 'sent' | 'failed' | 'scheduled'
  twilioSid?: string          // Twilio message SID
  error?: string              // Error message if failed
  scheduledRetryAt?: Date     // Next retry time
}
```

### Template Service

```typescript
interface SMSTemplate {
  id: string                  // Template identifier
  name: string               // Human-readable name
  body: string              // Message template with {{variables}}
  variables: string[]       // Required variables
  category: 'report_ready' | 'appointment' | 'emergency' | 'information'
  description: string       // Template description
}
```

### Patient Preferences

```typescript
interface SMSPreferences {
  patientId: string
  reportReadyNotifications: boolean
  appointmentReminders: boolean
  generalInformation: boolean
  emergencyNotifications: boolean
  optedOutAt?: Date
  optOutReason?: string
}
```

## 🤝 Support

### Getting Help

1. **Documentation**: This README and inline code comments
2. **Health Check**: `/api/health/sms` endpoint
3. **Logs**: Check application logs for detailed error information
4. **Twilio Console**: Monitor SMS delivery and errors

### Common Issues

#### SMS Not Sending

1. Check Twilio credentials in environment variables
2. Verify phone number format (+61XXXXXXXXX)
3. Check business hours configuration
4. Verify patient hasn't opted out

#### Delivery Failures

1. Check Twilio account balance
2. Verify webhook URL is accessible
3. Check for carrier-specific blocking
4. Review error codes in delivery tracking

#### Job Scheduler Issues

1. Verify cron expressions are valid
2. Check database connectivity
3. Monitor job status via API
4. Review job execution logs

### Troubleshooting Commands

```bash
# Check SMS service health
curl https://api.axisimaging.com.au/api/health/sms

# View recent SMS logs
tail -f logs/sms.log

# Check failed messages
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.axisimaging.com.au/api/admin/sms/reports/failed?hours=24"

# Manual job execution
curl -X POST -H "Authorization: Bearer $TOKEN" \
  "https://api.axisimaging.com.au/api/admin/sms/jobs/retryFailedMessages"
```

---

**Axis Imaging SMS Notification System** - Driving patient engagement through professional, timely, and compliant healthcare communications.

For technical support: `it@axisimaging.com.au`
For business inquiries: `admin@axisimaging.com.au`