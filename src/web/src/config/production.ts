/**
 * Production Environment Configuration
 * Version: 1.0.0
 * 
 * Comprehensive production configuration for the AI-Enhanced Social Travel Platform
 * Includes settings for API endpoints, security, monitoring, caching, and feature flags
 * Optimized for multi-region AWS EKS deployment
 */

import { BASE_URL } from '../constants/api';

// Environment constants
const ENV = 'production' as const;
const DEBUG_MODE = false;
const API_VERSION = 'v1';
const ENABLE_MONITORING = true;

/**
 * Production configuration object
 * Contains all settings required for production environment
 */
export const config = {
  env: ENV,
  
  // API Configuration
  api: {
    baseUrl: BASE_URL.production,
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 30000
    },
    websocket: {
      url: 'wss://api.aitravelplatform.com/ws',
      reconnectInterval: 3000,
      maxReconnectAttempts: 5
    },
    rateLimiting: {
      maxRequests: 1000,
      windowMs: 60000
    }
  },

  // Microservices Configuration
  services: {
    booking: 'https://booking.aitravelplatform.com',
    persona: 'https://persona.aitravelplatform.com',
    chat: 'https://chat.aitravelplatform.com',
    professional: 'https://professional.aitravelplatform.com',
    ml: 'https://ml.aitravelplatform.com'
  },

  // Security Configuration
  security: {
    oauth: {
      clientId: process.env.OAUTH_CLIENT_ID,
      authEndpoint: 'https://auth.aitravelplatform.com/oauth',
      tokenEndpoint: 'https://auth.aitravelplatform.com/token'
    },
    jwt: {
      tokenExpiry: 3600, // 1 hour
      refreshTokenExpiry: 86400, // 24 hours
      algorithm: 'RS256',
      issuer: 'https://aitravelplatform.com'
    },
    rateLimit: {
      enabled: true,
      maxRequests: 100,
      windowMs: 60000 // 1 minute
    },
    cors: {
      allowedOrigins: ['https://*.aitravelplatform.com'],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
      maxAge: 86400 // 24 hours
    }
  },

  // Feature Flags
  features: {
    debugMode: DEBUG_MODE,
    mockApi: false,
    analytics: true,
    errorReporting: true,
    performanceMonitoring: true,
    hotReload: false,
    aiPersonas: true,
    professionalTools: true,
    advancedBooking: true
  },

  // Monitoring Configuration
  monitoring: {
    logging: {
      level: 'error',
      console: false,
      file: true,
      remote: true,
      remoteEndpoint: 'https://logging.aitravelplatform.com'
    },
    metrics: {
      enabled: ENABLE_MONITORING,
      endpoint: 'https://metrics.aitravelplatform.com',
      interval: 60000 // 1 minute
    },
    errorTracking: {
      enabled: true,
      sentryDsn: process.env.SENTRY_PROD_DSN,
      sampleRate: 1.0
    },
    analytics: {
      mixpanel: {
        token: process.env.MIXPANEL_PROD_TOKEN,
        enabled: true
      },
      customEvents: {
        enabled: true,
        endpoint: 'https://analytics.aitravelplatform.com'
      }
    }
  },

  // Caching Strategy
  cache: {
    enabled: true,
    strategy: 'memory-first' as const,
    duration: 3600, // 1 hour
    maxSize: 100, // MB
    cleanupInterval: 600, // 10 minutes
    cdn: {
      baseUrl: 'https://cdn.aitravelplatform.com',
      imageOptimization: true,
      cacheControl: 'public, max-age=31536000' // 1 year
    },
    redis: {
      enabled: true,
      host: process.env.REDIS_PROD_HOST,
      port: 6379,
      ttl: 3600 // 1 hour
    }
  },

  // Performance Optimization
  performance: {
    compression: true,
    minification: true,
    lazyLoading: true,
    preloading: {
      enabled: true,
      routes: ['/dashboard', '/booking']
    }
  }
} as const;

// Type safety for configuration object
export type Config = typeof config;