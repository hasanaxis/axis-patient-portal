// Visual Regression Testing Configuration for Axis Imaging Frontend
// Using Percy and Chromatic for comprehensive visual testing

const { defineConfig } = require('@playwright/test')

module.exports = defineConfig({
  testDir: './visual-tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  reporter: [
    ['html'],
    ['percy', { 
      token: process.env.PERCY_TOKEN,
      projectName: 'axis-imaging-frontend'
    }]
  ],
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...require('@playwright/test').devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'firefox',
      use: { 
        ...require('@playwright/test').devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'webkit',
      use: { 
        ...require('@playwright/test').devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    // Mobile viewports for responsive testing
    {
      name: 'Mobile Chrome',
      use: { ...require('@playwright/test').devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...require('@playwright/test').devices['iPhone 12'] },
    },
    // Tablet viewports
    {
      name: 'iPad',
      use: { ...require('@playwright/test').devices['iPad Pro'] },
    }
  ],

  webServer: {
    command: 'npm run start',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
})

// Percy configuration for visual regression testing
const percyConfig = {
  version: 2,
  discovery: {
    allowedHostnames: ['localhost'],
    networkIdleTimeout: 750,
    disableCache: false
  },
  snapshot: {
    enableJavaScript: true,
    widths: [375, 768, 1280, 1920],
    minHeight: 1024,
    percyCSS: `
      /* Hide dynamic content that changes between tests */
      .timestamp, .live-data, .random-id {
        visibility: hidden !important;
      }
      
      /* Standardize animations for consistent screenshots */
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `
  },
  staticSnapshots: false,
  defer: ['**/*.jpg', '**/*.jpeg', '**/*.png', '**/*.gif', '**/*.svg']
}

// Chromatic configuration for Storybook visual testing
const chromaticConfig = {
  projectToken: process.env.CHROMATIC_PROJECT_TOKEN,
  buildScriptName: 'build-storybook',
  exitZeroOnChanges: true,
  exitOnceUploaded: true,
  ignoreLastBuildOnBranch: 'main',
  
  // Visual testing thresholds
  threshold: 0.2, // 20% threshold for pixel differences
  diffThreshold: 0.1, // 10% threshold for overall diff
  
  // Skip snapshots for certain stories
  skip: [
    '**/stories/internal/**',
    '**/stories/experimental/**'
  ],
  
  // Delay for animations and loading states
  delay: 500,
  
  // Test different viewports
  viewports: [
    { width: 320, height: 568, name: 'iPhone SE' },
    { width: 375, height: 667, name: 'iPhone 8' },
    { width: 768, height: 1024, name: 'iPad' },
    { width: 1024, height: 768, name: 'iPad Landscape' },
    { width: 1280, height: 720, name: 'Desktop Small' },
    { width: 1920, height: 1080, name: 'Desktop Large' }
  ]
}

module.exports = {
  playwright: module.exports,
  percy: percyConfig,
  chromatic: chromaticConfig
}