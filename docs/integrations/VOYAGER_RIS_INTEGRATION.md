# Voyager RIS Integration Guide

## Overview

This guide provides comprehensive instructions for integrating with Voyager RIS systems by Carestream Health. Voyager is a widely deployed RIS solution in Australian healthcare facilities, offering comprehensive radiology workflow management.

## Voyager RIS Architecture

### System Components
- **Voyager Workstation**: Desktop application for order management
- **Voyager Web**: Web-based interface for workflow management
- **HL7 Interface Engine**: Message processing and routing
- **Database Server**: Central data repository
- **Report Distribution**: Automated report delivery system

### Supported Features
- **Order Management**: Complete order lifecycle management
- **Scheduling**: Appointment scheduling and resource management
- **Reporting**: Report creation, distribution, and archiving
- **Billing Integration**: Revenue cycle management
- **Quality Assurance**: Peer review and quality metrics

## Prerequisites

### Network Requirements
- **HL7 Port**: 2575 (configurable)
- **HTTPS Port**: 443 for API access (if available)
- **Firewall Rules**: Allow bidirectional traffic
- **DNS Resolution**: Proper hostname resolution
- **Message Persistence**: Reliable message delivery

### Voyager Configuration
- **HL7 Interface Setup**: Configure HL7 interface engine
- **Message Types**: Enable required message types (ADT, ORM, ORU, SIU)
- **Routing Rules**: Configure message routing to Axis Imaging
- **User Accounts**: Service account for API access (if available)
- **Permissions**: Appropriate order and report access

### Security Requirements
- **Network Encryption**: TLS for all communications
- **Message Encryption**: HL7 message encryption if required
- **Authentication**: Network-level or application-level authentication
- **Audit Logging**: Enable comprehensive audit logging
- **Access Control**: Role-based access control

## Configuration

### Basic RIS Configuration

```json
{
  "id": "voyager-ris-prod",
  "name": "Voyager RIS Production",
  "type": "RIS",
  "vendor": "Carestream Health",
  "enabled": true,
  "config": {
    "endpoint": "ris.hospital.com.au",
    "protocol": "HL7",
    "port": 2575,
    "authentication": {
      "type": "BASIC",
      "credentials": {
        "username": "axis_service",
        "password": "${VOYAGER_PASSWORD}"
      }
    },
    "timeout": 30000,
    "retryAttempts": 3,
    "enableTLS": true,
    "hl7Config": {
      "sendingApplication": "AXIS_IMAGING",
      "sendingFacility": "HOSPITAL",
      "receivingApplication": "VOYAGER",
      "receivingFacility": "RIS",
      "messageType": "QRY",
      "processingID": "P"
    }
  },
  "voyagerConfig": {
    "systemVersion": "7.6",
    "departmentCode": "RAD",
    "facilityCode": "MAIN",
    "autoAcknowledge": true,
    "messageEncoding": "UTF-8",
    "fieldSeparator": "|",
    "componentSeparator": "^",
    "repetitionSeparator": "~",
    "escapeCharacter": "\\",
    "subComponentSeparator": "&",
    "customMappings": {
      "patientClass": "OUTPATIENT",
      "defaultPriority": "ROUTINE"
    }
  },
  "apiConfig": {
    "baseURL": "https://ris-api.hospital.com.au",
    "version": "v2",
    "enableWebhooks": true,
    "webhookSecret": "${VOYAGER_WEBHOOK_SECRET}"
  },
  "retryPolicy": {
    "maxAttempts": 3,
    "backoffMultiplier": 2,
    "maxDelay": 30000
  },
  "healthCheck": {
    "interval": 30000,
    "timeout": 5000,
    "failureThreshold": 3
  },
  "monitoring": {
    "enableMetrics": true,
    "enableLogging": true,
    "logLevel": "INFO"
  }
}
```

### Advanced Configuration Options

#### High Availability Setup
```json
{
  "config": {
    "primaryEndpoint": "ris-primary.hospital.com.au",
    "secondaryEndpoint": "ris-secondary.hospital.com.au",
    "failoverTimeout": 10000,
    "messageQueue": {
      "persistentQueue": true,
      "maxQueueSize": 10000,
      "retryInterval": 5000
    }
  }
}
```

#### Message Processing Options
```json
{
  "hl7Config": {
    "messageValidation": {
      "strictValidation": false,
      "requiredFields": ["MSH", "PID"],
      "customValidationRules": []
    },
    "messageTransformation": {
      "enableTransformation": true,
      "transformationRules": [
        {
          "field": "PID.8",
          "transformation": "UPPERCASE"
        }
      ]
    },
    "messageRouting": {
      "routingRules": [
        {
          "messageType": "ADT^A01",
          "destination": "REGISTRATION"
        },
        {
          "messageType": "ORM^O01",
          "destination": "ORDERS"
        }
      ]
    }
  }
}
```

## Implementation

### Initialize Integration

```typescript
import { IntegrationManager } from '../integrations/core/IntegrationManager';
import { VoyagerRISProvider } from '../integrations/ris/VoyagerRISProvider';

const integrationManager = new IntegrationManager();
const voyagerProvider = new VoyagerRISProvider();

// Load configuration
const config = loadVoyagerConfig();

// Register provider
await integrationManager.registerPlugin('voyager-ris', voyagerProvider, config);

// Connect to RIS
const connected = await integrationManager.connectPlugin('voyager-ris');
if (!connected) {
  throw new Error('Failed to connect to Voyager RIS');
}
```

### Patient Search Implementation

```typescript
// Basic patient search
const searchCriteria = {
  patientID: 'PAT123456',
  patientName: 'Smith^John',
  dateRange: {
    from: '2024-01-01',
    to: '2024-12-31'
  },
  limit: 50
};

const searchResult = await voyagerProvider.findPatients(searchCriteria);

if (searchResult.success) {
  const patients = searchResult.data;
  console.log(`Found ${patients.length} patients`);
  
  patients.forEach(patient => {
    console.log(`Patient: ${patient.patientID}`);
    console.log(`Name: ${patient.firstName} ${patient.lastName}`);
    console.log(`DOB: ${patient.dateOfBirth}`);
    console.log(`MRN: ${patient.mrn}`);
  });
} else {
  console.error('Patient search failed:', searchResult.error);
}
```

### Order Management Implementation

```typescript
// Find orders for patient
const orderQuery = {
  patientID: 'PAT123456',
  status: ['SCHEDULED', 'IN_PROGRESS'],
  modality: ['CT', 'MR'],
  dateRange: {
    from: '2024-01-01',
    to: '2024-12-31'
  }
};

const ordersResult = await voyagerProvider.findOrders(orderQuery);

if (ordersResult.success) {
  const orders = ordersResult.data;
  console.log(`Found ${orders.length} orders`);
  
  orders.forEach(order => {
    console.log(`Order: ${order.orderID}`);
    console.log(`Accession: ${order.accessionNumber}`);
    console.log(`Status: ${order.status}`);
    console.log(`Procedures: ${order.procedures.length}`);
    
    order.procedures.forEach(procedure => {
      console.log(`  - ${procedure.description} (${procedure.modality})`);
    });
  });
}

// Update order status
const statusUpdate = await voyagerProvider.updateOrderStatus(
  'ORD123456',
  'IN_PROGRESS',
  'Study started at CT scanner'
);

if (statusUpdate.success) {
  console.log('Order status updated successfully');
} else {
  console.error('Failed to update order status:', statusUpdate.error);
}
```

### Report Management Implementation

```typescript
// Create preliminary report
const reportData = {
  accessionNumber: 'ACC123456',
  patientID: 'PAT123456',
  studyInstanceUID: '1.2.3.4.5.6.7.8.9.0',
  reportType: 'PRELIMINARY' as const,
  status: 'DRAFT' as const,
  radiologist: {
    id: 'RAD001',
    name: 'Dr. Smith^John',
    credentials: 'MD, FRANZCR',
    department: 'Diagnostic Radiology'
  },
  findings: 'CT scan of the chest demonstrates normal lung parenchyma...',
  impression: 'Normal chest CT scan. No acute findings.',
  recommendations: 'No follow-up required unless clinically indicated.'
};

const reportResult = await voyagerProvider.createReport(reportData);

if (reportResult.success) {
  const reportID = reportResult.data;
  console.log(`Report created: ${reportID}`);
  
  // Sign report
  const signatureResult = await voyagerProvider.signReport(
    reportID,
    'Dr. Smith Digital Signature'
  );
  
  if (signatureResult.success) {
    console.log('Report signed successfully');
  }
} else {
  console.error('Failed to create report:', reportResult.error);
}
```

### Schedule Management Implementation

```typescript
// Get today's schedule
const today = new Date().toISOString().split('T')[0];
const scheduleResult = await voyagerProvider.getSchedule(today, 'CT');

if (scheduleResult.success) {
  const appointments = scheduleResult.data;
  console.log(`Found ${appointments.length} CT appointments today`);
  
  appointments.forEach(appointment => {
    console.log(`${appointment.scheduledTime}: ${appointment.patientID}`);
    console.log(`  Room: ${appointment.room}`);
    console.log(`  Duration: ${appointment.estimatedDuration} minutes`);
    console.log(`  Status: ${appointment.status}`);
  });
}

// Create new appointment
const newAppointment = {
  patientID: 'PAT123456',
  orderID: 'ORD123456',
  scheduledDate: '2024-06-15',
  scheduledTime: '14:30',
  estimatedDuration: 30,
  room: 'CT-1',
  modality: 'CT',
  technologist: 'Tech-001',
  status: 'SCHEDULED' as const,
  notes: 'Patient requires contrast'
};

const appointmentResult = await voyagerProvider.createAppointment(newAppointment);

if (appointmentResult.success) {
  const scheduleID = appointmentResult.data;
  console.log(`Appointment created: ${scheduleID}`);
} else {
  console.error('Failed to create appointment:', appointmentResult.error);
}
```

### HL7 Message Processing

```typescript
// Set up HL7 message handlers
voyagerProvider.onNewOrder = (order) => {
  console.log('New order received:', order.orderID);
  
  // Process new order
  processNewOrder(order);
  
  // Notify relevant staff
  notificationService.notifyNewOrder(order);
};

voyagerProvider.onOrderUpdate = (orderID, status) => {
  console.log(`Order ${orderID} status changed to: ${status}`);
  
  // Update local database
  updateOrderStatus(orderID, status);
  
  // Trigger workflow actions
  if (status === 'COMPLETED') {
    triggerReportGeneration(orderID);
  }
};

voyagerProvider.onNewReport = (report) => {
  console.log('New report received:', report.reportID);
  
  // Process report
  processNewReport(report);
  
  // Distribute report
  if (report.status === 'SIGNED') {
    distributeReport(report);
  }
};

// Send custom HL7 message
const customMessage = {
  messageType: 'ADT^A08',
  messageControlId: 'AXIS20240615001',
  timestamp: new Date().toISOString(),
  sendingApplication: 'AXIS_IMAGING',
  receivingApplication: 'VOYAGER',
  segments: [
    {
      segmentType: 'PID',
      fields: [
        '',              // Set ID
        '',              // Patient ID (external)
        'PAT123456',     // Patient ID (internal)
        '',              // Alternate Patient ID
        'Smith^John^M',  // Patient Name
        '',              // Mother's Maiden Name
        '19800101',      // Date of Birth
        'M',             // Sex
        '',              // Patient Alias
        '',              // Race
        '123 Main St^^Sydney^NSW^2000^AU'  // Address
      ]
    }
  ]
};

const messageResult = await voyagerProvider.sendHL7Message(customMessage);

if (messageResult.success) {
  const ackMessage = messageResult.data;
  console.log('Message sent successfully:', ackMessage.messageControlId);
} else {
  console.error('Failed to send HL7 message:', messageResult.error);
}
```

## Error Handling

### Connection Error Handling

```typescript
// Set up error handlers
voyagerProvider.onConnectionLost = (error: Error) => {
  console.error('RIS connection lost:', error);
  
  // Attempt reconnection with exponential backoff
  let attempts = 0;
  const maxAttempts = 5;
  
  const reconnect = async () => {
    try {
      await integrationManager.connectPlugin('voyager-ris');
      console.log('RIS connection restored');
    } catch (reconnectError) {
      attempts++;
      if (attempts < maxAttempts) {
        const delay = Math.pow(2, attempts) * 1000;
        console.log(`Retrying connection in ${delay}ms (attempt ${attempts}/${maxAttempts})`);
        setTimeout(reconnect, delay);
      } else {
        console.error('Failed to reconnect after maximum attempts');
        // Notify administrators
        alertingService.sendAlert('RIS connection failed', 'CRITICAL');
      }
    }
  };
  
  setTimeout(reconnect, 1000);
};

voyagerProvider.onError = (error: Error, operation: string) => {
  console.error(`RIS operation failed [${operation}]:`, error);
  
  // Log error for monitoring
  logger.error('Voyager RIS Error', {
    operation,
    error: error.message,
    timestamp: new Date().toISOString()
  });
  
  // Handle specific error types
  if (error.message.includes('timeout')) {
    // Increase timeout for subsequent operations
    increaseOperationTimeout();
  } else if (error.message.includes('authentication')) {
    // Refresh authentication credentials
    refreshAuthentication();
  }
};
```

### HL7 Message Error Handling

```typescript
// Robust HL7 message sending
async function sendHL7MessageWithRetry(message: any, maxRetries: number = 3): Promise<any> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await voyagerProvider.sendHL7Message(message);
      
      if (result.success) {
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      lastError = error;
      
      console.warn(`HL7 message send attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`HL7 message send failed after ${maxRetries} attempts: ${lastError.message}`);
}

// Message validation
function validateHL7Message(message: any): boolean {
  // Check required segments
  const requiredSegments = ['MSH'];
  const presentSegments = message.segments.map(seg => seg.segmentType);
  
  for (const required of requiredSegments) {
    if (!presentSegments.includes(required)) {
      throw new Error(`Missing required segment: ${required}`);
    }
  }
  
  // Validate MSH segment
  const mshSegment = message.segments.find(seg => seg.segmentType === 'MSH');
  if (!mshSegment || mshSegment.fields.length < 10) {
    throw new Error('Invalid MSH segment');
  }
  
  // Validate message control ID
  if (!message.messageControlId || message.messageControlId.length === 0) {
    throw new Error('Missing message control ID');
  }
  
  return true;
}
```

## Testing

### Unit Tests

```typescript
describe('Voyager RIS Integration', () => {
  let voyagerProvider: VoyagerRISProvider;
  
  beforeEach(() => {
    voyagerProvider = new VoyagerRISProvider();
  });
  
  test('should connect to RIS successfully', async () => {
    const config = {
      endpoint: 'localhost',
      protocol: 'HL7',
      port: 2575,
      authentication: {
        type: 'BASIC',
        credentials: { username: 'test', password: 'test' }
      },
      timeout: 5000
    };
    
    const result = await voyagerProvider.connect(config);
    expect(result.success).toBe(true);
  });
  
  test('should find patients by ID', async () => {
    const query = { patientID: 'TEST001' };
    const result = await voyagerProvider.findPatients(query);
    
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });
  
  test('should create and sign report', async () => {
    const reportData = {
      accessionNumber: 'TEST001',
      patientID: 'PAT001',
      reportType: 'PRELIMINARY',
      status: 'DRAFT',
      radiologist: {
        id: 'RAD001',
        name: 'Test Radiologist',
        credentials: 'MD',
        department: 'Radiology'
      },
      findings: 'Test findings',
      impression: 'Test impression'
    };
    
    const createResult = await voyagerProvider.createReport(reportData);
    expect(createResult.success).toBe(true);
    
    const reportID = createResult.data;
    const signResult = await voyagerProvider.signReport(reportID, 'Test Signature');
    expect(signResult.success).toBe(true);
  });
  
  test('should handle HL7 message parsing', async () => {
    const hl7Message = 'MSH|^~\\&|SENDING|SENDER|RECEIVING|RECEIVER|20240615120000||ADT^A01|MSG001|P|2.5\r';
    
    const parseResult = await voyagerProvider.parseHL7Message(hl7Message);
    expect(parseResult.success).toBe(true);
    expect(parseResult.data.messageType).toBe('ADT^A01');
  });
});
```

### Integration Tests

```typescript
describe('Voyager RIS Integration Tests', () => {
  test('complete patient workflow', async () => {
    // Connect
    const connected = await integrationManager.connectPlugin('voyager-ris');
    expect(connected).toBe(true);
    
    // Find patient
    const patients = await voyagerProvider.findPatients({ patientID: 'TEST001' });
    expect(patients.success).toBe(true);
    expect(patients.data.length).toBeGreaterThan(0);
    
    const patient = patients.data[0];
    
    // Find orders for patient
    const orders = await voyagerProvider.findOrders({ patientID: patient.patientID });
    expect(orders.success).toBe(true);
    
    // Update order status
    if (orders.data.length > 0) {
      const order = orders.data[0];
      const statusUpdate = await voyagerProvider.updateOrderStatus(order.orderID, 'IN_PROGRESS');
      expect(statusUpdate.success).toBe(true);
    }
    
    // Create report
    const reportData = {
      accessionNumber: 'TEST001',
      patientID: patient.patientID,
      reportType: 'PRELIMINARY',
      findings: 'Test findings',
      impression: 'Test impression'
    };
    
    const report = await voyagerProvider.createReport(reportData);
    expect(report.success).toBe(true);
  });
  
  test('HL7 message flow', async () => {
    // Send ADT message
    const adtMessage = createADTMessage('PAT001');
    const adtResult = await voyagerProvider.sendHL7Message(adtMessage);
    expect(adtResult.success).toBe(true);
    
    // Send ORM message
    const ormMessage = createORMMessage('PAT001', 'ORD001');
    const ormResult = await voyagerProvider.sendHL7Message(ormMessage);
    expect(ormResult.success).toBe(true);
    
    // Send ORU message
    const oruMessage = createORUMessage('PAT001', 'ORD001');
    const oruResult = await voyagerProvider.sendHL7Message(oruMessage);
    expect(oruResult.success).toBe(true);
  });
});
```

## Performance Optimization

### Message Queuing

```typescript
// Implement message queue for reliable delivery
class VoyagerMessageQueue {
  private queue: any[] = [];
  private processing: boolean = false;
  
  async enqueueMessage(message: any): Promise<void> {
    this.queue.push({
      id: generateMessageId(),
      message,
      timestamp: new Date(),
      attempts: 0,
      maxAttempts: 3
    });
    
    if (!this.processing) {
      this.processQueue();
    }
  }
  
  private async processQueue(): Promise<void> {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      
      try {
        const result = await voyagerProvider.sendHL7Message(item.message);
        
        if (result.success) {
          console.log(`Message ${item.id} sent successfully`);
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        item.attempts++;
        
        if (item.attempts < item.maxAttempts) {
          // Re-queue with exponential backoff
          setTimeout(() => {
            this.queue.unshift(item);
          }, Math.pow(2, item.attempts) * 1000);
        } else {
          console.error(`Message ${item.id} failed after ${item.maxAttempts} attempts`);
          // Send to dead letter queue
          this.handleFailedMessage(item);
        }
      }
    }
    
    this.processing = false;
  }
  
  private handleFailedMessage(item: any): void {
    // Store failed message for manual review
    console.error('Failed message:', item);
    // Could write to database or file for later analysis
  }
}
```

### Connection Pooling

```typescript
// Implement connection pooling for HL7 connections
class VoyagerConnectionPool {
  private connections: any[] = [];
  private maxConnections: number = 5;
  private currentConnections: number = 0;
  
  async getConnection(): Promise<any> {
    // Return available connection
    if (this.connections.length > 0) {
      return this.connections.pop();
    }
    
    // Create new connection if under limit
    if (this.currentConnections < this.maxConnections) {
      const connection = await this.createConnection();
      this.currentConnections++;
      return connection;
    }
    
    // Wait for connection to become available
    return new Promise((resolve) => {
      const checkForConnection = () => {
        if (this.connections.length > 0) {
          resolve(this.connections.pop());
        } else {
          setTimeout(checkForConnection, 100);
        }
      };
      checkForConnection();
    });
  }
  
  releaseConnection(connection: any): void {
    if (this.connections.length < this.maxConnections) {
      this.connections.push(connection);
    } else {
      // Close excess connection
      connection.close();
      this.currentConnections--;
    }
  }
  
  private async createConnection(): Promise<any> {
    // Create new HL7 connection
    return await voyagerProvider.createConnection();
  }
}
```

### Caching Strategy

```typescript
// Implement caching for frequently accessed data
class VoyagerCache {
  private patientCache: Map<string, any> = new Map();
  private orderCache: Map<string, any> = new Map();
  private scheduleCache: Map<string, any> = new Map();
  private cacheTTL: number = 300000; // 5 minutes
  
  async getPatient(patientID: string): Promise<any> {
    const cacheKey = `patient_${patientID}`;
    const cached = this.patientCache.get(cacheKey);
    
    if (cached && !this.isExpired(cached.timestamp)) {
      return cached.data;
    }
    
    // Fetch from RIS
    const result = await voyagerProvider.getPatient(patientID);
    
    if (result.success) {
      this.patientCache.set(cacheKey, {
        data: result.data,
        timestamp: Date.now()
      });
    }
    
    return result;
  }
  
  async getOrders(patientID: string): Promise<any> {
    const cacheKey = `orders_${patientID}`;
    const cached = this.orderCache.get(cacheKey);
    
    if (cached && !this.isExpired(cached.timestamp)) {
      return cached.data;
    }
    
    // Fetch from RIS
    const result = await voyagerProvider.findOrders({ patientID });
    
    if (result.success) {
      this.orderCache.set(cacheKey, {
        data: result.data,
        timestamp: Date.now()
      });
    }
    
    return result;
  }
  
  invalidatePatientCache(patientID: string): void {
    this.patientCache.delete(`patient_${patientID}`);
    this.orderCache.delete(`orders_${patientID}`);
  }
  
  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.cacheTTL;
  }
}
```

## Monitoring & Alerting

### HL7 Message Monitoring

```typescript
// Monitor HL7 message processing
class VoyagerMonitoring {
  private messageStats = {
    sent: 0,
    received: 0,
    failed: 0,
    avgProcessingTime: 0
  };
  
  recordMessageSent(messageType: string, processingTime: number): void {
    this.messageStats.sent++;
    this.updateAvgProcessingTime(processingTime);
    
    // Log message statistics
    console.log(`HL7 ${messageType} sent in ${processingTime}ms`);
    
    // Alert on slow processing
    if (processingTime > 5000) {
      console.warn(`Slow HL7 processing detected: ${processingTime}ms`);
    }
  }
  
  recordMessageReceived(messageType: string): void {
    this.messageStats.received++;
    console.log(`HL7 ${messageType} received`);
  }
  
  recordMessageFailed(messageType: string, error: string): void {
    this.messageStats.failed++;
    console.error(`HL7 ${messageType} failed: ${error}`);
    
    // Alert on high failure rate
    const failureRate = this.messageStats.failed / (this.messageStats.sent || 1);
    if (failureRate > 0.1) { // 10% failure rate
      console.error('High HL7 message failure rate detected');
    }
  }
  
  private updateAvgProcessingTime(newTime: number): void {
    const total = this.messageStats.sent;
    this.messageStats.avgProcessingTime = 
      ((this.messageStats.avgProcessingTime * (total - 1)) + newTime) / total;
  }
  
  getStatistics(): any {
    return { ...this.messageStats };
  }
}
```

### Health Check Implementation

```typescript
// Comprehensive health check for Voyager RIS
async function performVoyagerHealthCheck(): Promise<any> {
  const healthStatus = {
    timestamp: new Date().toISOString(),
    status: 'HEALTHY',
    checks: []
  };
  
  try {
    // Test HL7 connectivity
    const hl7Test = await voyagerProvider.testConnection();
    healthStatus.checks.push({
      name: 'HL7 Connectivity',
      status: hl7Test.success ? 'PASS' : 'FAIL',
      message: hl7Test.error || 'HL7 connection successful',
      responseTime: hl7Test.data?.responseTime
    });
    
    // Test API connectivity (if available)
    if (voyagerProvider.apiClient) {
      const apiTest = await voyagerProvider.apiClient.ping();
      healthStatus.checks.push({
        name: 'API Connectivity',
        status: apiTest.success ? 'PASS' : 'FAIL',
        message: apiTest.error || 'API ping successful'
      });
    }
    
    // Test patient query
    try {
      const patientTest = await voyagerProvider.findPatients({ 
        patientID: 'HEALTH_CHECK_TEST',
        limit: 1 
      });
      healthStatus.checks.push({
        name: 'Patient Query',
        status: patientTest.success ? 'PASS' : 'WARN',
        message: patientTest.error || 'Patient query successful'
      });
    } catch (error) {
      healthStatus.checks.push({
        name: 'Patient Query',
        status: 'WARN',
        message: `Patient query failed: ${error.message}`
      });
    }
    
    // Check message queue health
    const queueSize = messageQueue.getQueueSize();
    healthStatus.checks.push({
      name: 'Message Queue',
      status: queueSize < 100 ? 'PASS' : 'WARN',
      message: `Queue size: ${queueSize}`,
      value: queueSize
    });
    
    // Overall status
    const failedChecks = healthStatus.checks.filter(check => check.status === 'FAIL');
    if (failedChecks.length > 0) {
      healthStatus.status = 'UNHEALTHY';
    } else {
      const warnChecks = healthStatus.checks.filter(check => check.status === 'WARN');
      if (warnChecks.length > 0) {
        healthStatus.status = 'DEGRADED';
      }
    }
    
  } catch (error) {
    healthStatus.status = 'UNHEALTHY';
    healthStatus.checks.push({
      name: 'Health Check',
      status: 'FAIL',
      message: error.message
    });
  }
  
  return healthStatus;
}
```

## Troubleshooting

### Common Issues

#### HL7 Message Format Errors
```typescript
// Diagnose HL7 message issues
function diagnoseHL7Message(rawMessage: string): any {
  console.log('Diagnosing HL7 message...');
  
  const issues = [];
  
  // Check message structure
  if (!rawMessage.startsWith('MSH')) {
    issues.push('Message does not start with MSH segment');
  }
  
  // Check segment terminators
  const segments = rawMessage.split('\r');
  if (segments.length < 2) {
    issues.push('Missing segment terminators (\\r)');
  }
  
  // Check field separators
  if (rawMessage.includes('MSH')) {
    const mshSegment = rawMessage.split('\r')[0];
    const fieldSeparator = mshSegment.charAt(3);
    
    if (fieldSeparator !== '|') {
      issues.push(`Unexpected field separator: '${fieldSeparator}' (expected '|')`);
    }
  }
  
  // Check encoding characters
  if (rawMessage.length > 8) {
    const encodingChars = rawMessage.substring(4, 8);
    const expectedChars = '^~\\&';
    
    if (encodingChars !== expectedChars) {
      issues.push(`Unexpected encoding characters: '${encodingChars}' (expected '${expectedChars}')`);
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}
```

#### Connection Troubleshooting
```typescript
// Diagnose Voyager RIS connection issues
async function diagnoseVoyagerConnection(): Promise<void> {
  console.log('Diagnosing Voyager RIS connection...');
  
  // Test network connectivity
  const networkTest = await testNetworkConnectivity(config.endpoint, config.port);
  console.log('Network connectivity:', networkTest ? 'OK' : 'FAILED');
  
  // Test HL7 connection
  try {
    const hl7Test = await voyagerProvider.testConnection();
    console.log('HL7 connection:', hl7Test.success ? 'OK' : 'FAILED');
    if (!hl7Test.success) {
      console.log('HL7 error:', hl7Test.error);
    }
  } catch (error) {
    console.log('HL7 connection exception:', error.message);
  }
  
  // Test authentication
  if (config.authentication) {
    try {
      const authTest = await testAuthentication();
      console.log('Authentication:', authTest ? 'OK' : 'FAILED');
    } catch (error) {
      console.log('Authentication error:', error.message);
    }
  }
  
  // Test message parsing
  try {
    const testMessage = 'MSH|^~\\&|TEST|TEST|VOYAGER|RIS|20240615120000||QRY^A19|TEST001|P|2.5\r';
    const parseResult = await voyagerProvider.parseHL7Message(testMessage);
    console.log('Message parsing:', parseResult.success ? 'OK' : 'FAILED');
  } catch (error) {
    console.log('Message parsing error:', error.message);
  }
}
```

### Debug Logging

```typescript
// Enable comprehensive debug logging
const debugLogger = {
  logHL7Message: (direction: 'SEND' | 'RECEIVE', message: string) => {
    if (process.env.DEBUG_HL7 === 'true') {
      console.log(`[HL7 ${direction}] ${new Date().toISOString()}`);
      console.log(message.replace(/\r/g, '\\r\n'));
      console.log('---');
    }
  },
  
  logOperation: (operation: string, parameters: any, result: any, duration: number) => {
    if (process.env.DEBUG_VOYAGER === 'true') {
      console.log(`[VOYAGER] ${operation}:`);
      console.log(`  Parameters:`, JSON.stringify(parameters, null, 2));
      console.log(`  Result:`, JSON.stringify(result, null, 2));
      console.log(`  Duration: ${duration}ms`);
    }
  }
};

// Use in provider implementation
class VoyagerRISProviderWithLogging extends VoyagerRISProvider {
  async sendHL7Message(message: any): Promise<any> {
    const startTime = Date.now();
    
    // Log outgoing message
    const messageString = this.buildMessageString(message);
    debugLogger.logHL7Message('SEND', messageString);
    
    try {
      const result = await super.sendHL7Message(message);
      const duration = Date.now() - startTime;
      
      debugLogger.logOperation('sendHL7Message', message, result, duration);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      debugLogger.logOperation('sendHL7Message', message, { error: error.message }, duration);
      throw error;
    }
  }
}
```

---

For additional support and advanced configuration options, please refer to:
- [Voyager RIS Documentation](https://carestream.com/voyager)
- [HL7 v2.5 Standard Reference](http://www.hl7.org/implement/standards/product_brief.cfm?product_id=144)
- [Integration Testing Guide](./TESTING_FRAMEWORK.md)
- [Configuration Reference](./CONFIGURATION_REFERENCE.md)