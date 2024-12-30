/**
 * @fileoverview Staging environment configuration for Android application
 * @version 1.0.0
 * @environment staging
 * 
 * This configuration file contains all environment-specific settings
 * for the staging/pre-production environment with enhanced debugging
 * and monitoring capabilities.
 */

import { HttpStatus } from '../../../backend/shared/constants/status-codes';

/**
 * Staging environment configuration object
 * Contains comprehensive settings for API, authentication, feature flags,
 * logging, caching, analytics, and various service-specific configurations
 */
export const config = {
  /**
   * API configuration for staging environment
   * Includes endpoints, timeouts, and request handling settings
   */
  API_CONFIG: {
    BASE_URL: 'https://staging-api.aitravelplatform.com',
    WEBSOCKET_URL: 'wss://staging-ws.aitravelplatform.com',
    TIMEOUT: 20000, // 20 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
    MAX_CONCURRENT_REQUESTS: 10,
    HEADERS: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Environment': 'staging',
      'X-Client-Version': '${VERSION_NAME}',
      'X-Platform': 'android'
    }
  },

  /**
   * Authentication configuration
   * Includes token management and storage settings
   */
  AUTH_CONFIG: {
    TOKEN_STORAGE_KEY: '@auth_token',
    REFRESH_TOKEN_STORAGE_KEY: '@refresh_token',
    TOKEN_EXPIRY: 3600, // 1 hour
    REFRESH_THRESHOLD: 300, // 5 minutes
    MAX_REFRESH_ATTEMPTS: 3,
    AUTH_PERSISTENCE: 'memory' // Enhanced security for staging
  },

  /**
   * Feature flags for staging environment
   * Enables additional debugging and testing features
   */
  FEATURE_FLAGS: {
    ENABLE_BIOMETRIC: true,
    ENABLE_LOCATION: true,
    ENABLE_PUSH_NOTIFICATIONS: true,
    ENABLE_ANALYTICS: true,
    ENABLE_DEBUG_MENU: true, // Staging-specific debug menu
    ENABLE_PERFORMANCE_MONITORING: true,
    ENABLE_ERROR_REPORTING: true,
    ENABLE_NETWORK_LOGGING: true
  },

  /**
   * Logging configuration with enhanced debugging
   * Includes remote logging and sensitive data protection
   */
  LOGGING: {
    ENABLED: true,
    LEVEL: 'debug', // Verbose logging for staging
    REMOTE_LOGGING: true,
    CONSOLE_OUTPUT: true,
    FILE_OUTPUT: true,
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    RETENTION_PERIOD: 7 * 24 * 60 * 60, // 7 days
    SENSITIVE_FIELDS: ['password', 'token', 'credit_card']
  },

  /**
   * Cache configuration for staging environment
   * Includes persistence and security settings
   */
  CACHE: {
    ENABLED: true,
    TTL: 1800, // 30 minutes
    MAX_SIZE: 75, // Percentage of available storage
    PERSISTENCE: true,
    ENCRYPTION: true,
    COMPRESSION: true,
    INVALIDATION_EVENTS: ['AUTH_LOGOUT', 'VERSION_UPDATE']
  },

  /**
   * Analytics configuration for staging environment
   * Includes enhanced tracking and monitoring
   */
  ANALYTICS: {
    ENABLED: true,
    TRACKING_ID: 'staging-tracking-id',
    SAMPLE_RATE: 50, // 50% sampling for staging
    USER_PROPERTIES: true,
    EXCEPTION_TRACKING: true,
    PERFORMANCE_TRACKING: true,
    BATCH_SIZE: 10,
    DISPATCH_INTERVAL: 30000 // 30 seconds
  },

  /**
   * Persona service configuration
   * Includes AI model and caching settings
   */
  PERSONA_CONFIG: {
    MAX_PERSONAS: 5,
    MODEL_UPDATE_INTERVAL: 10 * 60 * 1000, // 10 minutes
    CACHE_DURATION: 60 * 60 * 1000, // 1 hour
    OFFLINE_SUPPORT: true,
    SYNC_INTERVAL: 15 * 60 * 1000, // 15 minutes
    MAX_SUGGESTIONS: 10
  },

  /**
   * Chat service configuration
   * Includes messaging and media handling settings
   */
  CHAT_CONFIG: {
    MAX_MESSAGE_LENGTH: 1000,
    TYPING_TIMEOUT: 5000, // 5 seconds
    RECONNECT_ATTEMPTS: 4,
    MESSAGE_RETENTION: 7 * 24 * 60 * 60, // 7 days
    BATCH_SIZE: 50,
    ENCRYPTION_ENABLED: true,
    MEDIA_UPLOAD_LIMIT: 10 * 1024 * 1024 // 10MB
  },

  /**
   * Booking service configuration
   * Includes reservation and payment settings
   */
  BOOKING_CONFIG: {
    TIMEOUT: 45000, // 45 seconds
    MAX_TRAVELERS: 9,
    PAYMENT_METHODS: ['CREDIT_CARD', 'PAYPAL'],
    RESERVATION_HOLD_TIME: 15 * 60, // 15 minutes
    PRICE_CHECK_INTERVAL: 60000, // 1 minute
    CANCELLATION_WINDOW: 24 * 60 * 60, // 24 hours
    RETRY_STRATEGY: 'exponential'
  }
} as const;

/**
 * Type guard for checking HTTP response status
 * @param status - HTTP status code to check
 * @returns boolean indicating if status is OK
 */
export const isSuccessStatus = (status: number): boolean => {
  return status === HttpStatus.OK || status === HttpStatus.CREATED;
};

/**
 * Type guard for checking error response status
 * @param status - HTTP status code to check
 * @returns boolean indicating if status is an error
 */
export const isErrorStatus = (status: number): boolean => {
  return status >= HttpStatus.BAD_REQUEST;
};