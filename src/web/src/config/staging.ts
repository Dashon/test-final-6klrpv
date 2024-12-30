/**
 * Staging Environment Configuration
 * Version: 1.0.0
 * 
 * Comprehensive configuration for the staging environment of the AI-Enhanced Social Travel Platform.
 * Includes enhanced debugging, monitoring, and testing capabilities for pre-production validation.
 */

import { BASE_URL } from '../constants/api';

/**
 * Global environment configuration
 * These values are used throughout the application to determine behavior and feature availability
 */
export const ENV = 'staging' as const;
export const DEBUG_MODE = true;
export const API_BASE_URL = BASE_URL.staging;
export const PERFORMANCE_MONITORING = true;
export const ERROR_TRACKING = true;

/**
 * Comprehensive staging environment configuration
 * Implements pre-production settings with enhanced debugging and monitoring capabilities
 */
export const config = {
  env: ENV,
  
  // API Configuration
  api: {
    baseUrl: API_BASE_URL,
    timeout: 30000,
    retryAttempts: 3,
    websocket: {
      url: 'wss://staging-api.aitravelplatform.com/ws',
      reconnectInterval: 3000,
      maxRetries: 5
    },
    rateLimiting: {
      enabled: true,
      maxRequests: 1000,
      windowMs: 60000
    }
  },

  // Microservices Configuration
  services: {
    booking: 'https://staging-booking.aitravelplatform.com',
    persona: 'https://staging-persona.aitravelplatform.com',
    chat: 'https://staging-chat.aitravelplatform.com',
    professional: 'https://staging-professional.aitravelplatform.com',
    ml: 'https://staging-ml.aitravelplatform.com'
  },

  // Feature Flags and Development Tools
  features: {
    debugMode: true,
    mockApi: false,
    analytics: true,
    errorReporting: true,
    performanceMonitoring: true,
    hotReload: true,
    testingTools: true,
    featureFlags: true
  },

  // Authentication Configuration
  auth: {
    tokenExpiry: 3600,
    refreshTokenExpiry: 86400,
    sessionTimeout: 3600,
    maxSessions: 5
  },

  // Logging Configuration
  logging: {
    level: 'debug',
    console: true,
    file: true,
    remote: true,
    format: 'json',
    stackTrace: true
  },

  // Cache Configuration
  cache: {
    enabled: true,
    duration: 1800,
    maxSize: 75,
    namespace: 'staging',
    invalidationStrategy: 'immediate'
  },

  // Analytics and Monitoring Integration
  analytics: {
    enabled: true,
    mixpanelToken: 'MIXPANEL_STAGING_TOKEN',
    sentryDsn: 'SENTRY_STAGING_DSN',
    datadog: {
      enabled: true,
      apiKey: 'DATADOG_STAGING_API_KEY'
    }
  },

  // CDN Configuration
  cdn: {
    baseUrl: 'https://staging-cdn.aitravelplatform.com',
    imageOptimization: true,
    cacheControl: 'max-age=3600',
    compression: true
  },

  // Deployment Configuration
  deployment: {
    strategy: 'blue-green' as const,
    rollbackEnabled: true,
    rollbackTimeout: 300, // 5 minutes in seconds
    healthCheck: {
      enabled: true,
      interval: 30,
      timeout: 5,
      path: '/health'
    }
  },

  // Enhanced Monitoring Configuration
  monitoring: {
    performance: {
      enabled: true,
      sampleRate: 100, // 100% sampling in staging
      slowThreshold: 1000 // 1 second threshold for slow operations
    },
    errors: {
      enabled: true,
      captureRate: 100, // Capture all errors in staging
      ignorePatterns: []
    },
    metrics: {
      enabled: true,
      interval: 60, // 60 seconds interval for metrics collection
      customMetrics: true
    }
  }
} as const;

// Type definitions for configuration
export type Config = typeof config;
export type ApiConfig = typeof config.api;
export type ServicesConfig = typeof config.services;
export type FeaturesConfig = typeof config.features;
export type MonitoringConfig = typeof config.monitoring;

// Default export for easy importing
export default config;