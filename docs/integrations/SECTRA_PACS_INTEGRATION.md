# Sectra PACS Integration Guide

## Overview

This guide provides comprehensive instructions for integrating with Sectra IDS7 PACS systems. Sectra AB is a leading provider of PACS solutions with strong presence in the Australian healthcare market.

## Sectra PACS Architecture

### System Components
- **IDS7 Workstation**: Primary reading workstation
- **PACS Archive**: Central image storage and management
- **IDS7 Web**: Web-based image viewing
- **IDS7 Mobile**: Mobile image access
- **Integration API**: RESTful API for third-party integration

### Supported Features
- **DICOM Services**: C-ECHO, C-FIND, C-MOVE, C-STORE
- **Web Viewer Integration**: Embedded viewer support
- **Workflow Integration**: Study routing and worklist management
- **Reporting Integration**: Report distribution and management
- **Mobile Access**: Tablet and smartphone access

## Prerequisites

### Network Requirements
- **DICOM Port**: 11112 (configurable)
- **HTTPS Port**: 443 for API access
- **Firewall Rules**: Allow bidirectional traffic
- **DNS Resolution**: Proper hostname resolution
- **Certificate Management**: Valid SSL certificates

### Sectra Configuration
- **AE Title Registration**: Register Axis Imaging AE title
- **User Account**: Service account for API access
- **Permissions**: Appropriate query and retrieve permissions
- **Worklist Access**: Configure worklist sharing
- **API Keys**: Generate API authentication keys

### Security Requirements
- **Network Encryption**: TLS 1.3 for all communications
- **Authentication**: Certificate-based or API key authentication
- **Audit Logging**: Enable comprehensive audit logging
- **Access Control**: Role-based access control
- **Data Protection**: PHI encryption and protection

## Configuration

### Basic PACS Configuration

```json
{
  "id": "sectra-pacs-prod",
  "name": "Sectra PACS Production",
  "type": "PACS",
  "vendor": "Sectra AB",
  "enabled": true,
  "config": {
    "host": "pacs.hospital.com.au",
    "port": 11112,
    "callingAET": "AXIS_IMAGING",
    "calledAET": "SECTRA_PACS",
    "timeout": 30000,
    "maxConnections": 10,
    "enableTLS": true,
    "credentials": {
      "username": "axis_service",
      "password": "${SECTRA_API_PASSWORD}"
    }
  },
  "secttraConfig": {
    "apiEndpoint": "https://pacs-api.hospital.com.au",
    "apiVersion": "v2",
    "worklistEndpoint": "https://pacs-api.hospital.com.au/worklist",
    "viewerEndpoint": "https://viewer.hospital.com.au",
    "enableWebViewer": true,
    "thumbnailSupport": true,
    "compressionLevel": 2,
    "preferredTransferSyntax": [
      "1.2.840.10008.1.2.4.90",
      "1.2.840.10008.1.2.4.70",
      "1.2.840.10008.1.2"
    ],
    "securityLevel": "ENHANCED",
    "customHeaders": {
      "X-API-Key": "${SECTRA_API_KEY}",
      "X-Client-ID": "axis-imaging-portal"
    }
  },
  "dicomConfig": {
    "supportedSOPClasses": [
      "1.2.840.10008.5.1.4.1.1.2",
      "1.2.840.10008.5.1.4.1.1.4",
      "1.2.840.10008.5.1.4.1.1.12.1",
      "1.2.840.10008.5.1.4.1.1.7",
      "1.2.840.10008.5.1.4.1.1.88.11"
    ],
    "maxPDUSize": 16384,
    "enableCompression": true,
    "asyncOperations": 1,
    "networkTimeout": 60000
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
  "secttraConfig": {
    "primaryEndpoint": "https://pacs-primary.hospital.com.au",
    "secondaryEndpoint": "https://pacs-secondary.hospital.com.au",
    "failoverTimeout": 10000,
    "healthCheckEndpoint": "/health",
    "loadBalancing": "ROUND_ROBIN"
  }
}
```

#### Performance Optimization
```json
{
  "dicomConfig": {
    "connectionPooling": {
      "minConnections": 2,
      "maxConnections": 20,
      "idleTimeout": 300000,
      "validationInterval": 30000
    },
    "compressionSettings": {
      "enableJPEG2000": true,
      "enableJPEGLS": true,
      "qualityLevel": 95
    },
    "transferSettings": {
      "chunkSize": 65536,
      "maxRetries": 3,
      "timeoutPerChunk": 30000
    }
  }
}
```

## Implementation

### Initialize Integration

```typescript
import { IntegrationManager } from '../integrations/core/IntegrationManager';
import { SectraPACSProvider } from '../integrations/pacs/SectraPACSProvider';

const integrationManager = new IntegrationManager();
const sectraProvider = new SectraPACSProvider();

// Load configuration
const config = loadSectraConfig();

// Register provider
await integrationManager.registerPlugin('sectra-pacs', sectraProvider, config);

// Connect to PACS
const connected = await integrationManager.connectPlugin('sectra-pacs');
if (!connected) {
  throw new Error('Failed to connect to Sectra PACS');
}
```

### Study Search Implementation

```typescript
// Basic study search
const searchCriteria = {
  patientID: 'PAT123456',
  studyDate: {
    from: '2024-01-01',
    to: '2024-12-31'
  },
  modality: ['CT', 'MR'],
  limit: 50
};

const searchResult = await sectraProvider.findStudies(searchCriteria);

if (searchResult.success) {
  const studies = searchResult.data;
  console.log(`Found ${studies.length} studies`);
  
  studies.forEach(study => {
    console.log(`Study: ${study.studyInstanceUID}`);
    console.log(`Patient: ${study.patientName}`);
    console.log(`Date: ${study.studyDate}`);
    console.log(`Modality: ${study.modality}`);
  });
} else {
  console.error('Study search failed:', searchResult.error);
}
```

### Image Retrieval Implementation

```typescript
// Retrieve complete study
const retrieveRequest = {
  studyInstanceUID: '1.2.3.4.5.6.7.8.9.0',
  destinationAET: 'AXIS_STORE',
  priority: 'HIGH' as const
};

const retrieveResult = await sectraProvider.retrieveStudy(retrieveRequest);

if (retrieveResult.success) {
  const moveId = retrieveResult.data;
  console.log(`Retrieval initiated: ${moveId}`);
  
  // Monitor retrieval progress
  sectraProvider.onRetrieveProgress = (progress) => {
    console.log(`Progress: ${progress.completed}/${progress.total} images`);
  };
} else {
  console.error('Study retrieval failed:', retrieveResult.error);
}
```

### Web Viewer Integration

```typescript
// Get viewer URL for study
const viewerResult = await sectraProvider.getViewerURL(
  '1.2.3.4.5.6.7.8.9.0',
  {
    layout: 'GRID_2x2',
    tools: ['ZOOM', 'PAN', 'WINDOWING', 'MEASURE'],
    annotations: true
  }
);

if (viewerResult.success) {
  const viewerURL = viewerResult.data;
  
  // Open in iframe or new window
  window.open(viewerURL, '_blank', 'width=1200,height=800');
} else {
  console.error('Failed to get viewer URL:', viewerResult.error);
}
```

### Thumbnail Generation

```typescript
// Get thumbnail for series
const thumbnailResult = await sectraProvider.getThumbnail(
  '1.2.3.4.5.6.7.8.9.0.1',
  'medium'
);

if (thumbnailResult.success) {
  const thumbnailBuffer = thumbnailResult.data;
  
  // Convert to base64 for display
  const base64Thumbnail = thumbnailBuffer.toString('base64');
  const imageUrl = `data:image/jpeg;base64,${base64Thumbnail}`;
  
  // Display in UI
  document.getElementById('thumbnail').src = imageUrl;
} else {
  console.error('Failed to get thumbnail:', thumbnailResult.error);
}
```

### Workflow Integration

```typescript
// Get workflow status for study
const workflowResult = await sectraProvider.getWorkflowStatus(
  '1.2.3.4.5.6.7.8.9.0'
);

if (workflowResult.success) {
  const workflow = workflowResult.data;
  
  console.log(`Workflow State: ${workflow.workflowState}`);
  console.log(`Assigned Radiologist: ${workflow.assignedRadiologist}`);
  console.log(`Priority: ${workflow.priority}`);
  console.log(`ETA: ${workflow.estimatedCompletionTime}`);
  
  // Display workflow steps
  workflow.workflowSteps.forEach(step => {
    console.log(`${step.step}: ${step.status} (${step.timestamp})`);
  });
} else {
  console.error('Failed to get workflow status:', workflowResult.error);
}
```

## Error Handling

### Connection Error Handling

```typescript
// Set up error handlers
sectraProvider.onConnectionLost = (error: Error) => {
  console.error('PACS connection lost:', error);
  
  // Attempt reconnection
  setTimeout(async () => {
    try {
      await integrationManager.connectPlugin('sectra-pacs');
      console.log('PACS connection restored');
    } catch (reconnectError) {
      console.error('Failed to reconnect:', reconnectError);
    }
  }, 5000);
};

sectraProvider.onError = (error: Error, operation: string) => {
  console.error(`PACS operation failed [${operation}]:`, error);
  
  // Log error for monitoring
  logger.error('Sectra PACS Error', {
    operation,
    error: error.message,
    timestamp: new Date().toISOString()
  });
  
  // Notify monitoring system
  monitoringService.recordError('sectra-pacs', operation, error);
};
```

### Query Error Handling

```typescript
async function robustStudySearch(criteria: any): Promise<any[]> {
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      const result = await sectraProvider.findStudies(criteria);
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      attempts++;
      
      if (attempts >= maxAttempts) {
        throw new Error(`Study search failed after ${maxAttempts} attempts: ${error.message}`);
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempts) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## Testing

### Unit Tests

```typescript
describe('Sectra PACS Integration', () => {
  let sectraProvider: SectraPACSProvider;
  
  beforeEach(() => {
    sectraProvider = new SectraPACSProvider();
  });
  
  test('should connect to PACS successfully', async () => {
    const config = {
      host: 'localhost',
      port: 11112,
      callingAET: 'TEST_AET',
      calledAET: 'SECTRA_TEST',
      timeout: 5000
    };
    
    const result = await sectraProvider.connect(config);
    expect(result.success).toBe(true);
  });
  
  test('should find studies by patient ID', async () => {
    const query = { patientID: 'TEST001' };
    const result = await sectraProvider.findStudies(query);
    
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });
  
  test('should handle connection errors gracefully', async () => {
    const invalidConfig = {
      host: 'invalid-host',
      port: 11112,
      callingAET: 'TEST_AET',
      calledAET: 'SECTRA_TEST',
      timeout: 1000
    };
    
    const result = await sectraProvider.connect(invalidConfig);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

### Integration Tests

```typescript
describe('Sectra PACS Integration Tests', () => {
  test('complete workflow integration', async () => {
    // Connect
    const connected = await integrationManager.connectPlugin('sectra-pacs');
    expect(connected).toBe(true);
    
    // Search studies
    const studies = await sectraProvider.findStudies({ patientID: 'TEST001' });
    expect(studies.success).toBe(true);
    expect(studies.data.length).toBeGreaterThan(0);
    
    // Get series
    const study = studies.data[0];
    const series = await sectraProvider.findSeries(study.studyInstanceUID);
    expect(series.success).toBe(true);
    
    // Get images
    const seriesInstance = series.data[0];
    const images = await sectraProvider.findImages(seriesInstance.seriesInstanceUID);
    expect(images.success).toBe(true);
    
    // Test viewer URL
    const viewerURL = await sectraProvider.getViewerURL(study.studyInstanceUID);
    expect(viewerURL.success).toBe(true);
    expect(viewerURL.data).toMatch(/^https?:\/\//);
  });
});
```

## Performance Optimization

### Connection Pooling

```typescript
// Configure connection pooling
const poolConfig = {
  minConnections: 2,
  maxConnections: 10,
  idleTimeout: 300000, // 5 minutes
  validationInterval: 30000 // 30 seconds
};

// Implement connection pool manager
class SectraConnectionPool {
  private connections: Map<string, any> = new Map();
  private config: any;
  
  constructor(config: any) {
    this.config = config;
    this.initializePool();
  }
  
  async getConnection(): Promise<any> {
    // Return available connection or create new one
    // Implement connection validation and cleanup
  }
  
  releaseConnection(connection: any): void {
    // Return connection to pool
  }
}
```

### Query Optimization

```typescript
// Optimize DICOM queries
function optimizeQuery(query: any): any {
  const optimized = { ...query };
  
  // Use specific date ranges instead of open-ended
  if (!optimized.studyDate) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    optimized.studyDate = {
      from: thirtyDaysAgo.toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0]
    };
  }
  
  // Limit results to prevent large datasets
  if (!optimized.limit) {
    optimized.limit = 100;
  }
  
  // Specify required fields only
  optimized.fields = [
    'StudyInstanceUID',
    'PatientID',
    'PatientName',
    'StudyDate',
    'Modality',
    'AccessionNumber'
  ];
  
  return optimized;
}
```

### Caching Strategy

```typescript
// Implement intelligent caching
class SectraCache {
  private cache: Map<string, any> = new Map();
  private ttl: Map<string, number> = new Map();
  
  async getStudies(query: any): Promise<any> {
    const cacheKey = this.generateCacheKey(query);
    
    // Check cache
    if (this.cache.has(cacheKey) && !this.isExpired(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    // Fetch from PACS
    const result = await sectraProvider.findStudies(query);
    
    // Cache successful results
    if (result.success) {
      this.cache.set(cacheKey, result);
      this.ttl.set(cacheKey, Date.now() + 300000); // 5 minutes TTL
    }
    
    return result;
  }
  
  private generateCacheKey(query: any): string {
    return `studies_${JSON.stringify(query)}`;
  }
  
  private isExpired(key: string): boolean {
    const expiry = this.ttl.get(key);
    return !expiry || Date.now() > expiry;
  }
}
```

## Monitoring & Alerting

### Health Check Implementation

```typescript
// Comprehensive health check
async function performHealthCheck(): Promise<any> {
  const healthStatus = {
    timestamp: new Date().toISOString(),
    status: 'HEALTHY',
    checks: []
  };
  
  try {
    // Test DICOM connectivity
    const echoResult = await sectraProvider.testConnection();
    healthStatus.checks.push({
      name: 'DICOM Connectivity',
      status: echoResult.success ? 'PASS' : 'FAIL',
      message: echoResult.error || 'Echo successful',
      responseTime: echoResult.data?.responseTime
    });
    
    // Test API connectivity
    if (sectraProvider.apiClient) {
      const apiResult = await sectraProvider.apiClient.ping();
      healthStatus.checks.push({
        name: 'API Connectivity',
        status: apiResult.success ? 'PASS' : 'FAIL',
        message: apiResult.error || 'API ping successful'
      });
    }
    
    // Check system performance
    const stats = await sectraProvider.getStatistics();
    if (stats.success) {
      const avgResponseTime = stats.data.averageResponseTime;
      healthStatus.checks.push({
        name: 'Performance',
        status: avgResponseTime < 2000 ? 'PASS' : 'WARN',
        message: `Average response time: ${avgResponseTime}ms`,
        value: avgResponseTime
      });
    }
    
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

### Metrics Collection

```typescript
// Collect performance metrics
class SectraMetrics {
  private metrics = {
    operations: {
      total: 0,
      successful: 0,
      failed: 0
    },
    responseTimes: {
      avg: 0,
      min: Number.MAX_VALUE,
      max: 0,
      p95: 0
    },
    studies: {
      queriesPerHour: 0,
      retrievalsPerHour: 0,
      totalStudiesProcessed: 0
    }
  };
  
  recordOperation(operation: string, success: boolean, responseTime: number): void {
    this.metrics.operations.total++;
    
    if (success) {
      this.metrics.operations.successful++;
    } else {
      this.metrics.operations.failed++;
    }
    
    // Update response times
    this.updateResponseTimes(responseTime);
    
    // Record specific operation metrics
    if (operation === 'findStudies') {
      this.metrics.studies.queriesPerHour++;
    } else if (operation === 'retrieveStudy') {
      this.metrics.studies.retrievalsPerHour++;
    }
  }
  
  private updateResponseTimes(responseTime: number): void {
    // Update min/max
    this.metrics.responseTimes.min = Math.min(this.metrics.responseTimes.min, responseTime);
    this.metrics.responseTimes.max = Math.max(this.metrics.responseTimes.max, responseTime);
    
    // Calculate running average (simplified)
    const total = this.metrics.operations.total;
    this.metrics.responseTimes.avg = 
      ((this.metrics.responseTimes.avg * (total - 1)) + responseTime) / total;
  }
  
  getMetrics(): any {
    return { ...this.metrics };
  }
}
```

## Troubleshooting

### Common Issues

#### Connection Timeouts
```typescript
// Diagnose connection issues
async function diagnoseConnection(): Promise<void> {
  console.log('Diagnosing Sectra PACS connection...');
  
  // Test network connectivity
  const networkTest = await testNetworkConnectivity();
  console.log('Network connectivity:', networkTest ? 'OK' : 'FAILED');
  
  // Test DICOM echo
  try {
    const echoResult = await sectraProvider.testConnection();
    console.log('DICOM echo:', echoResult.success ? 'OK' : 'FAILED');
    if (!echoResult.success) {
      console.log('Echo error:', echoResult.error);
    }
  } catch (error) {
    console.log('DICOM echo exception:', error.message);
  }
  
  // Test API connectivity
  if (sectraProvider.apiClient) {
    try {
      const apiResult = await sectraProvider.apiClient.ping();
      console.log('API ping:', apiResult.success ? 'OK' : 'FAILED');
    } catch (error) {
      console.log('API ping exception:', error.message);
    }
  }
}
```

#### Query Performance Issues
```typescript
// Analyze query performance
async function analyzeQueryPerformance(query: any): Promise<void> {
  const startTime = Date.now();
  
  try {
    const result = await sectraProvider.findStudies(query);
    const duration = Date.now() - startTime;
    
    console.log('Query Performance Analysis:');
    console.log(`Duration: ${duration}ms`);
    console.log(`Success: ${result.success}`);
    console.log(`Results: ${result.data?.length || 0}`);
    
    if (duration > 5000) {
      console.warn('Slow query detected. Consider:');
      console.warn('- Adding date range filters');
      console.warn('- Limiting result count');
      console.warn('- Using more specific search criteria');
    }
    
  } catch (error) {
    console.error('Query failed:', error.message);
  }
}
```

### Debug Logging

```typescript
// Enable debug logging
const logger = {
  debug: (message: string, data?: any) => {
    if (process.env.DEBUG_SECTRA === 'true') {
      console.log(`[SECTRA DEBUG] ${message}`, data || '');
    }
  },
  
  trace: (operation: string, duration: number, success: boolean) => {
    if (process.env.TRACE_SECTRA === 'true') {
      console.log(`[SECTRA TRACE] ${operation}: ${duration}ms (${success ? 'SUCCESS' : 'FAILURE'})`);
    }
  }
};

// Use in provider implementation
class SectraPACSProviderWithLogging extends SectraPACSProvider {
  async findStudies(query: any): Promise<any> {
    logger.debug('Finding studies', query);
    const startTime = Date.now();
    
    try {
      const result = await super.findStudies(query);
      const duration = Date.now() - startTime;
      
      logger.trace('findStudies', duration, result.success);
      logger.debug('Study search result', {
        success: result.success,
        count: result.data?.length,
        duration
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.trace('findStudies', duration, false);
      logger.debug('Study search error', error.message);
      throw error;
    }
  }
}
```

---

For additional support and advanced configuration options, please refer to:
- [Sectra IDS7 Documentation](https://sectra.com/ids7)
- [DICOM Standard Reference](http://dicom.nema.org/)
- [Integration Testing Guide](./TESTING_FRAMEWORK.md)
- [Configuration Reference](./CONFIGURATION_REFERENCE.md)