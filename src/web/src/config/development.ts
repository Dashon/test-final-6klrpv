/**
 * Development Environment Configuration
 * Version: 1.0.0
 * 
 * Comprehensive configuration for local development environment including
 * API endpoints, feature flags, debugging tools, and service integrations.
 */

import { BASE_URL } from '../constants/api';

/**
 * Development environment configuration object
 * Contains all settings required for local development and testing
 */
export const config = {
  // Environment identification
  env: 'development' as const,

  // API configuration
  api: {
    baseUrl: BASE_URL.development,
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    maxRetryDelay: 5000,
    rateLimiting: {
      enabled: true,
      maxRequests: 100,
      windowMs: 60000
    },
    websocket: {
      url: 'ws://localhost:3000/ws',
      reconnectInterval: 3000,
      maxReconnectAttempts: 5
    },
    errorHandling: {
      detailedErrors: true,
      stackTrace: true,
      errorReporting: true
    }
  },

  // Feature flags
  features: {
    debugMode: true,
    mockApi: true,
    analytics: false,
    errorReporting: true,
    performanceMonitoring: true,
    hotReload: {
      enabled: true,
      port: 3000,
      excludePaths: ['node_modules']
    },
    sourceMaps: true,
    devTools: true,
    mockData: true
  },

  // Service endpoints
  services: {
    booking: {
      url: 'http://localhost:3001',
      healthCheck: '/health',
      timeout: 5000
    },
    persona: {
      url: 'http://localhost:3002',
      healthCheck: '/health',
      timeout: 5000
    },
    chat: {
      url: 'http://localhost:3003',
      healthCheck: '/health',
      timeout: 5000
    },
    professional: {
      url: 'http://localhost:3004',
      healthCheck: '/health',
      timeout: 5000
    },
    ml: {
      url: 'http://localhost:3005',
      healthCheck: '/health',
      timeout: 10000,
      modelEndpoints: {
        recommendation: '/api/ml/recommend',
        nlp: '/api/ml/process',
        sentiment: '/api/ml/analyze'
      }
    },
    monitoring: {
      url: 'http://localhost:3006',
      metrics: '/metrics',
      traces: '/traces'
    }
  },

  // Authentication configuration
  auth: {
    enabled: true,
    mockUsers: true,
    sessionTimeout: 3600000,
    refreshTokenEnabled: true,
    mfa: {
      enabled: false,
      mockVerification: true
    },
    oauth: {
      enabled: true,
      mockProviders: ['google', 'facebook']
    }
  },

  // Logging configuration
  logging: {
    level: 'debug',
    console: true,
    file: true,
    network: true,
    performance: true,
    filters: {
      excludePatterns: ['[HMR]', '[WDS]'],
      minLevel: 'debug'
    }
  },

  // Cache configuration
  cache: {
    enabled: true,
    storage: 'localStorage',
    prefix: 'dev_',
    ttl: 3600,
    clearOnReload: true
  },

  // Analytics configuration
  analytics: {
    enabled: false,
    debugEvents: true,
    consoleLog: true,
    sampleRate: 100
  },

  // CDN configuration
  cdn: {
    enabled: false,
    baseUrl: 'http://localhost:3000',
    assets: {
      images: '/assets/images',
      fonts: '/assets/fonts',
      icons: '/assets/icons'
    }
  },

  // Security settings
  security: {
    cors: {
      enabled: true,
      allowedOrigins: ['http://localhost:3000'],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowCredentials: true
    },
    ssl: {
      enabled: false,
      key: 'path/to/key.pem',
      cert: 'path/to/cert.pem'
    },
    apiKeys: {
      enabled: true,
      mockKey: 'dev-api-key-123'
    }
  },

  // Development-specific settings
  development: {
    sourceMapSupport: true,
    debuggerPort: 9229,
    mockDataPath: './src/mocks',
    localStoragePrefix: 'dev_',
    clearStorageOnReload: true,
    consoleFilters: {
      excludePatterns: ['[HMR]', '[WDS]'],
      logLevel: 'debug'
    },
    performance: {
      monitoring: true,
      slowQueryThreshold: 1000,
      networkLatencySimulation: false
    },
    errorHandling: {
      verboseErrors: true,
      breakOnError: false,
      logToFile: true
    }
  }
} as const;

// Type definition for configuration
export type Config = typeof config;

// Default export
export default config;