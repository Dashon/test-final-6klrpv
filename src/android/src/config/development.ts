/**
 * @fileoverview Development environment configuration for Android application
 * @version 1.0.0
 * 
 * This file contains comprehensive configuration settings for the development
 * environment including API endpoints, security, caching, analytics, and feature flags.
 * 
 * @see Technical Specifications/8.1 DEPLOYMENT ENVIRONMENT
 */

import { HttpStatus } from '../../../backend/shared/constants/status-codes';

/**
 * Global environment constants
 */
declare global {
  const ENV: 'development';
  const DEBUG: boolean;
  const VERBOSE_LOGGING: boolean;
}

/**
 * API configuration for development environment
 * Includes endpoints, timeouts, and request settings
 */
const API_CONFIG = {
  BASE_URL: 'http://localhost:3000',
  WEBSOCKET_URL: 'ws://localhost:3000',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  MAX_CONCURRENT_REQUESTS: 10,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Environment': 'development'
  },
  STATUS_CODES: {
    SUCCESS: HttpStatus.OK,
    ERROR: HttpStatus.BAD_REQUEST
  }
} as const;

/**
 * Authentication configuration
 * Manages token storage and refresh behavior
 */
const AUTH_CONFIG = {
  TOKEN_STORAGE_KEY: '@auth_token',
  REFRESH_TOKEN_STORAGE_KEY: '@refresh_token',
  TOKEN_EXPIRY: 3600, // 1 hour
  REFRESH_THRESHOLD: 300, // 5 minutes
  MAX_REFRESH_ATTEMPTS: 3
} as const;

/**
 * Feature flags for development environment
 * Controls availability of various app features
 */
const FEATURE_FLAGS = {
  ENABLE_BIOMETRIC: true,
  ENABLE_LOCATION: true,
  ENABLE_PUSH_NOTIFICATIONS: true,
  ENABLE_ANALYTICS: false, // Disabled in development
  ENABLE_DEBUG_TOOLS: true,
  ENABLE_PERFORMANCE_MONITORING: true
} as const;

/**
 * Logging configuration
 * Defines logging behavior and restrictions
 */
const LOGGING = {
  ENABLED: true,
  LEVEL: 'debug',
  REMOTE_LOGGING: false,
  MAX_LOG_SIZE: 5 * 1024 * 1024, // 5MB
  RETENTION_PERIOD: 7 * 24 * 60 * 60, // 7 days
  SENSITIVE_FIELDS: ['password', 'token', 'credit_card']
} as const;

/**
 * Cache configuration
 * Defines caching strategy and invalidation rules
 */
const CACHE = {
  ENABLED: true,
  TTL: 300, // 5 minutes
  MAX_SIZE: 50, // Maximum number of cached items
  STORAGE_STRATEGY: 'memory' as const,
  INVALIDATION_EVENTS: ['auth_change', 'profile_update']
} as const;

/**
 * Analytics configuration
 * Controls tracking and data collection (disabled in development)
 */
const ANALYTICS = {
  ENABLED: false,
  TRACKING_ID: 'dev-tracking-id',
  SAMPLE_RATE: 100, // 100% sampling in development
  CUSTOM_DIMENSIONS: ['persona_type', 'user_segment'],
  EVENT_BATCHING: true,
  BATCH_SIZE: 10
} as const;

/**
 * AI Persona configuration
 * Settings for persona management and behavior
 */
const PERSONA_CONFIG = {
  MAX_PERSONAS: 5,
  MODEL_UPDATE_INTERVAL: 5 * 60 * 1000, // 5 minutes
  LEARNING_RATE: 0.01,
  CACHE_DURATION: 60 * 60, // 1 hour
  FALLBACK_BEHAVIOR: 'default_persona' as const
} as const;

/**
 * Chat configuration
 * Settings for real-time communication
 */
const CHAT_CONFIG = {
  MAX_MESSAGE_LENGTH: 1000,
  TYPING_TIMEOUT: 5000, // 5 seconds
  RECONNECT_ATTEMPTS: 3,
  RECONNECT_INTERVAL: 2000, // 2 seconds
  MESSAGE_BATCH_SIZE: 50,
  HISTORY_LOAD_LIMIT: 100
} as const;

/**
 * Booking configuration
 * Settings for travel booking functionality
 */
const BOOKING_CONFIG = {
  TIMEOUT: 60000, // 1 minute
  MAX_TRAVELERS: 9,
  PAYMENT_METHODS: ['CREDIT_CARD', 'PAYPAL'] as const,
  HOLD_DURATION: 600, // 10 minutes
  PRICE_CHECK_INTERVAL: 30000, // 30 seconds
  CANCELLATION_WINDOW: 24 * 60 * 60 // 24 hours
} as const;

/**
 * Export consolidated configuration object
 * @exports config
 */
export const config = {
  API_CONFIG,
  AUTH_CONFIG,
  FEATURE_FLAGS,
  LOGGING,
  CACHE,
  ANALYTICS,
  PERSONA_CONFIG,
  CHAT_CONFIG,
  BOOKING_CONFIG
} as const;

// Type exports for configuration objects
export type ApiConfig = typeof API_CONFIG;
export type AuthConfig = typeof AUTH_CONFIG;
export type FeatureFlags = typeof FEATURE_FLAGS;
export type LoggingConfig = typeof LOGGING;
export type CacheConfig = typeof CACHE;
export type AnalyticsConfig = typeof ANALYTICS;
export type PersonaConfig = typeof PERSONA_CONFIG;
export type ChatConfig = typeof CHAT_CONFIG;
export type BookingConfig = typeof BOOKING_CONFIG;