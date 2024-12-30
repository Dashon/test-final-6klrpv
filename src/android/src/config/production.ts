/**
 * @fileoverview Production environment configuration for Android application
 * @version 1.0.0
 * @module config/production
 * 
 * This file contains comprehensive production environment settings including:
 * - API endpoints and request configurations
 * - Security and authentication settings
 * - Feature flags and environment-specific configurations
 * - Caching, logging, and analytics settings
 * - Platform-specific configurations for personas, chat, and bookings
 */

import { HttpStatus } from '../../../backend/shared/constants/status-codes';

/**
 * Production environment configuration object
 * Contains all settings for the live production environment
 */
export const config = {
  /**
   * API configuration settings
   * Defines endpoints, timeouts, and request handling
   */
  API_CONFIG: {
    BASE_URL: 'https://api.aitravelplatform.com',
    WEBSOCKET_URL: 'wss://ws.aitravelplatform.com',
    FALLBACK_URL: 'https://api-backup.aitravelplatform.com',
    TIMEOUT: 15000, // 15 seconds
    RETRY_ATTEMPTS: 3,
    CIRCUIT_BREAKER: {
      FAILURE_THRESHOLD: 5,
      RESET_TIMEOUT: 30000, // 30 seconds
    },
    HEADERS: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Client-Version': 'android-1.0.0',
      'X-API-Version': 'v1'
    }
  },

  /**
   * Authentication and security configuration
   * Implements secure token storage and biometric authentication
   */
  AUTH_CONFIG: {
    TOKEN_STORAGE_KEY: '@auth_token_secure',
    REFRESH_TOKEN_STORAGE_KEY: '@refresh_token_secure',
    TOKEN_EXPIRY: 3600, // 1 hour
    BIOMETRIC: {
      ENABLED: true,
      FALLBACK_TO_PIN: true,
      MAX_ATTEMPTS: 3
    },
    ENCRYPTION: {
      ALGORITHM: 'AES-256-GCM',
      KEY_SIZE: 256
    }
  },

  /**
   * Feature flags for production environment
   * Controls availability of platform features
   */
  FEATURE_FLAGS: {
    ENABLE_BIOMETRIC: true,
    ENABLE_LOCATION: true,
    ENABLE_PUSH_NOTIFICATIONS: true,
    ENABLE_ANALYTICS: true,
    ENABLE_OFFLINE_MODE: false,
    ENABLE_BETA_FEATURES: false
  },

  /**
   * Logging configuration for production
   * Implements error tracking and performance monitoring
   */
  LOGGING: {
    ENABLED: true,
    LEVEL: 'error',
    REMOTE_LOGGING: true,
    CRASH_REPORTING: true,
    ERROR_SAMPLING_RATE: 100, // 100% of errors
    PERFORMANCE_MONITORING: true,
    RETENTION_DAYS: 30
  },

  /**
   * Cache configuration
   * Implements secure data persistence and optimization
   */
  CACHE: {
    ENABLED: true,
    TTL: 3600, // 1 hour
    MAX_SIZE: 100, // Maximum entries
    PERSISTENCE: true,
    ENCRYPTION: true,
    COMPRESSION: true
  },

  /**
   * Analytics configuration
   * Implements user tracking with privacy considerations
   */
  ANALYTICS: {
    ENABLED: true,
    TRACKING_ID: 'UA-PROD-12345',
    SAMPLE_RATE: 10, // 10% of events
    USER_PRIVACY: {
      ANONYMIZE_IP: true,
      DO_NOT_TRACK: true
    },
    CUSTOM_DIMENSIONS: {
      APP_VERSION: true,
      USER_TYPE: true,
      REGION: true
    }
  },

  /**
   * AI Persona configuration
   * Defines persona management and synchronization settings
   */
  PERSONA_CONFIG: {
    MAX_PERSONAS: 5,
    MODEL_UPDATE_INTERVAL: 900000, // 15 minutes
    SYNC_ENABLED: true,
    OFFLINE_SUPPORT: true,
    ENCRYPTION_ENABLED: true
  },

  /**
   * Chat configuration
   * Implements secure messaging and media handling
   */
  CHAT_CONFIG: {
    MAX_MESSAGE_LENGTH: 1000,
    TYPING_TIMEOUT: 5000, // 5 seconds
    RECONNECT_ATTEMPTS: 5,
    MESSAGE_ENCRYPTION: true,
    RATE_LIMIT: {
      MAX_MESSAGES_PER_MINUTE: 60,
      BURST_LIMIT: 10
    },
    MEDIA_CONFIG: {
      MAX_FILE_SIZE: 10485760, // 10MB
      ALLOWED_TYPES: ['image/*', 'application/pdf']
    }
  },

  /**
   * Booking configuration
   * Defines travel booking parameters and payment settings
   */
  BOOKING_CONFIG: {
    TIMEOUT: 30000, // 30 seconds
    MAX_TRAVELERS: 9,
    PAYMENT_METHODS: ['CREDIT_CARD', 'PAYPAL'],
    CURRENCY: 'USD',
    RETRY_STRATEGY: {
      MAX_ATTEMPTS: 3,
      BACKOFF_MS: 1000 // 1 second initial backoff
    }
  }
} as const;

/**
 * Type guard to check if response status is successful
 * @param status - HTTP status code
 * @returns boolean indicating if status is OK
 */
export const isSuccessStatus = (status: number): boolean => {
  return status === HttpStatus.OK;
};

/**
 * Type guard to check if response status indicates client error
 * @param status - HTTP status code
 * @returns boolean indicating if status is client error
 */
export const isClientError = (status: number): boolean => {
  return status === HttpStatus.BAD_REQUEST;
};