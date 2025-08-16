// Load Testing Scenarios for Axis Imaging Patient Portal
// Using Artillery.js for comprehensive load testing

const config = {
  config: {
    target: process.env.TEST_TARGET || 'http://localhost:3000',
    phases: [
      {
        duration: 60,
        arrivalRate: 5,
        name: 'Warm up'
      },
      {
        duration: 120,
        arrivalRate: 10,
        name: 'Ramp up load'
      },
      {
        duration: 300,
        arrivalRate: 20,
        name: 'Sustained load'
      },
      {
        duration: 180,
        arrivalRate: 50,
        name: 'Peak load'
      },
      {
        duration: 60,
        arrivalRate: 100,
        name: 'Stress test'
      },
      {
        duration: 120,
        arrivalRate: 5,
        name: 'Cool down'
      }
    ],
    defaults: {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Artillery Load Test'
      }
    },
    processor: './load-test-processor.js'
  },
  scenarios: [
    {
      name: 'Patient Authentication Flow',
      weight: 30,
      flow: [
        {
          post: {
            url: '/api/auth/login',
            json: {
              email: '{{ $randomEmail }}',
              password: 'TestPassword123!'
            },
            capture: {
              json: '$.token',
              as: 'authToken'
            }
          }
        },
        {
          get: {
            url: '/api/user/profile',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            }
          }
        },
        {
          post: {
            url: '/api/auth/logout',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            }
          }
        }
      ]
    },
    {
      name: 'Study Browsing and Viewing',
      weight: 25,
      flow: [
        {
          function: 'authenticateUser'
        },
        {
          get: {
            url: '/api/studies',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            },
            capture: {
              json: '$.studies[0].id',
              as: 'studyId'
            }
          }
        },
        {
          get: {
            url: '/api/studies/{{ studyId }}',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            }
          }
        },
        {
          get: {
            url: '/api/studies/{{ studyId }}/report',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            }
          }
        },
        {
          get: {
            url: '/api/studies/{{ studyId }}/images',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            }
          }
        }
      ]
    },
    {
      name: 'Appointment Management',
      weight: 20,
      flow: [
        {
          function: 'authenticateUser'
        },
        {
          get: {
            url: '/api/appointments',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            }
          }
        },
        {
          get: {
            url: '/api/appointments/available-slots',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            },
            qs: {
              modality: 'MRI',
              date: '{{ $randomFutureDate }}',
              location: 'melbourne-cbd'
            }
          }
        },
        {
          post: {
            url: '/api/appointments',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            },
            json: {
              modality: 'MRI',
              bodyPart: 'HEAD',
              appointmentDate: '{{ $randomFutureDate }}',
              appointmentTime: '{{ $randomTime }}',
              reason: 'Follow-up scan for load testing',
              locationId: 'melbourne-cbd'
            },
            capture: {
              json: '$.appointmentId',
              as: 'appointmentId'
            }
          }
        },
        {
          get: {
            url: '/api/appointments/{{ appointmentId }}',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            }
          }
        }
      ]
    },
    {
      name: 'DICOM Image Loading',
      weight: 15,
      flow: [
        {
          function: 'authenticateUser'
        },
        {
          function: 'getRandomStudyWithImages'
        },
        {
          get: {
            url: '/api/studies/{{ studyId }}/dicom/series',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            },
            capture: {
              json: '$.series[0].seriesUID',
              as: 'seriesUID'
            }
          }
        },
        {
          get: {
            url: '/api/studies/{{ studyId }}/dicom/{{ seriesUID }}/instances',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            }
          }
        },
        {
          get: {
            url: '/api/studies/{{ studyId }}/dicom/{{ seriesUID }}/thumbnail',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            }
          }
        }
      ]
    },
    {
      name: 'Search and Filter Operations',
      weight: 10,
      flow: [
        {
          function: 'authenticateUser'
        },
        {
          get: {
            url: '/api/studies/search',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            },
            qs: {
              query: '{{ $randomSearchTerm }}',
              modality: '{{ $randomModality }}',
              dateFrom: '{{ $randomPastDate }}',
              dateTo: '{{ $randomFutureDate }}'
            }
          }
        },
        {
          get: {
            url: '/api/studies',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            },
            qs: {
              filter: 'completed',
              sort: 'date_desc',
              page: '{{ $randomInt(1, 10) }}',
              limit: 20
            }
          }
        },
        {
          get: {
            url: '/api/appointments/search',
            headers: {
              Authorization: 'Bearer {{ authToken }}'
            },
            qs: {
              status: 'scheduled',
              modality: '{{ $randomModality }}'
            }
          }
        }
      ]
    }
  ]
}

// Processor functions for complex test scenarios
const processor = {
  authenticateUser: function(context, events, done) {
    // Simulate user authentication
    const testUsers = [
      { email: 'patient1@example.com', password: 'TestPassword123!' },
      { email: 'patient2@example.com', password: 'TestPassword123!' },
      { email: 'patient3@example.com', password: 'TestPassword123!' },
      { email: 'patient4@example.com', password: 'TestPassword123!' },
      { email: 'patient5@example.com', password: 'TestPassword123!' }
    ]
    
    const randomUser = testUsers[Math.floor(Math.random() * testUsers.length)]
    context.vars.email = randomUser.email
    context.vars.password = randomUser.password
    
    return done()
  },

  getRandomStudyWithImages: function(context, events, done) {
    // Simulate getting a study that has DICOM images
    const studiesWithImages = [
      'STUDY001-CT-CHEST',
      'STUDY002-MRI-BRAIN',
      'STUDY003-XRAY-SPINE',
      'STUDY004-CT-ABDOMEN',
      'STUDY005-MRI-KNEE'
    ]
    
    context.vars.studyId = studiesWithImages[Math.floor(Math.random() * studiesWithImages.length)]
    return done()
  },

  validateResponse: function(context, events, done) {
    // Custom validation for responses
    if (context.response && context.response.statusCode !== 200) {
      events.emit('error', `Unexpected status code: ${context.response.statusCode}`)
    }
    return done()
  },

  // Generate realistic test data
  $randomEmail: function() {
    const domains = ['example.com', 'test.com', 'patient.com']
    const names = ['john', 'jane', 'mike', 'sarah', 'david', 'lisa']
    const randomName = names[Math.floor(Math.random() * names.length)]
    const randomDomain = domains[Math.floor(Math.random() * domains.length)]
    return `${randomName}${Math.floor(Math.random() * 1000)}@${randomDomain}`
  },

  $randomModality: function() {
    const modalities = ['CT', 'MRI', 'XRAY', 'ULTRASOUND', 'MAMMOGRAPHY']
    return modalities[Math.floor(Math.random() * modalities.length)]
  },

  $randomSearchTerm: function() {
    const terms = ['chest', 'brain', 'spine', 'abdomen', 'knee', 'shoulder']
    return terms[Math.floor(Math.random() * terms.length)]
  },

  $randomFutureDate: function() {
    const today = new Date()
    const futureDate = new Date(today.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000)
    return futureDate.toISOString().split('T')[0]
  },

  $randomPastDate: function() {
    const today = new Date()
    const pastDate = new Date(today.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000)
    return pastDate.toISOString().split('T')[0]
  },

  $randomTime: function() {
    const hours = Math.floor(Math.random() * 8) + 9 // 9 AM to 5 PM
    const minutes = Math.floor(Math.random() * 4) * 15 // 0, 15, 30, 45
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  },

  $randomInt: function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }
}

// Performance thresholds and expectations
const performanceExpectations = {
  // Response time thresholds (in milliseconds)
  thresholds: {
    'http.response_time': ['p(95)<2000'], // 95% of responses under 2 seconds
    'http.response_time.login': ['p(90)<1000'], // Login responses under 1 second
    'http.response_time.studies': ['p(95)<3000'], // Study loading under 3 seconds
    'http.response_time.dicom': ['p(90)<5000'], // DICOM loading under 5 seconds
    'http.request_rate': ['>10'], // Minimum 10 requests per second
    'http.codes.200': ['>95%'], // 95% success rate
    'http.codes.500': ['<1%'] // Less than 1% server errors
  },

  // Expected performance under different load conditions
  loadProfiles: {
    normal: {
      concurrentUsers: 20,
      requestRate: 50,
      responseTime: 1500,
      errorRate: 0.5
    },
    peak: {
      concurrentUsers: 100,
      requestRate: 200,
      responseTime: 3000,
      errorRate: 2
    },
    stress: {
      concurrentUsers: 200,
      requestRate: 500,
      responseTime: 5000,
      errorRate: 5
    }
  }
}

// Database load testing scenarios
const databaseLoadTest = {
  // Test concurrent database operations
  scenarios: [
    {
      name: 'Concurrent Study Queries',
      description: 'Multiple users querying studies simultaneously',
      operations: [
        'SELECT * FROM studies WHERE patient_id = ?',
        'SELECT * FROM reports WHERE study_id IN (?)',
        'SELECT * FROM dicom_instances WHERE study_uid = ?'
      ],
      concurrency: 50,
      duration: 300
    },
    {
      name: 'Appointment Booking Contention',
      description: 'Multiple users booking appointments simultaneously',
      operations: [
        'SELECT available_slots FROM appointment_slots WHERE date = ?',
        'INSERT INTO appointments (...) VALUES (...)',
        'UPDATE appointment_slots SET available = available - 1'
      ],
      concurrency: 20,
      duration: 180
    },
    {
      name: 'Large Dataset Queries',
      description: 'Queries on large patient datasets',
      operations: [
        'SELECT COUNT(*) FROM studies WHERE created_at > ?',
        'SELECT * FROM patients WHERE medicare_number LIKE ?',
        'SELECT * FROM audit_logs WHERE created_at BETWEEN ? AND ?'
      ],
      concurrency: 10,
      duration: 600
    }
  ]
}

// Real-time monitoring and alerting during load tests
const monitoringConfig = {
  metrics: [
    'cpu_usage',
    'memory_usage',
    'disk_io',
    'network_io',
    'database_connections',
    'response_times',
    'error_rates',
    'throughput'
  ],
  
  alerts: [
    {
      condition: 'cpu_usage > 80%',
      action: 'scale_up_instances'
    },
    {
      condition: 'response_time > 5000ms',
      action: 'alert_ops_team'
    },
    {
      condition: 'error_rate > 5%',
      action: 'throttle_requests'
    },
    {
      condition: 'database_connections > 90%',
      action: 'alert_dba_team'
    }
  ]
}

// Load test execution commands
const executionCommands = {
  // Run basic load test
  basic: 'artillery run load-test-config.yml',
  
  // Run with custom target
  custom: 'artillery run --target https://staging.axisimaging.com load-test-config.yml',
  
  // Run with monitoring
  monitored: 'artillery run --output results.json load-test-config.yml && artillery report results.json',
  
  // Run stress test
  stress: 'artillery run --config stress-test-config.yml load-test-config.yml',
  
  // Run with custom duration
  extended: 'artillery run --overrides "{\"config\":{\"phases\":[{\"duration\":1800,\"arrivalRate\":30}]}}" load-test-config.yml'
}

// Post-test analysis and reporting
const reportingConfig = {
  generateReports: true,
  reportFormats: ['html', 'json', 'csv'],
  includeMetrics: [
    'response_times',
    'throughput',
    'error_rates',
    'concurrent_users',
    'system_resources'
  ],
  
  performanceBaseline: {
    responseTime95th: 2000,
    throughputMin: 100,
    errorRateMax: 2,
    uptimeMin: 99.9
  }
}

module.exports = {
  config,
  processor,
  performanceExpectations,
  databaseLoadTest,
  monitoringConfig,
  executionCommands,
  reportingConfig
}