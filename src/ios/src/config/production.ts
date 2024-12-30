/**
 * Production Environment Configuration
 * Version: 1.0.0
 * 
 * This file contains secure production environment settings for the iOS application
 * with strict security hardening and performance optimizations.
 * 
 * IMPORTANT: This file should never contain sensitive credentials directly.
 * Use secure key storage and environment variables for sensitive data.
 */

/**
 * API configuration with security hardening and performance optimization
 * Implements retry mechanisms, timeouts, and certificate pinning
 */
export const API_CONFIG = {
  BASE_URL: 'https://api.aitravelplatform.com/v1',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  CERTIFICATE_PINS: ['sha256/XXXXX'], // Production certificate pins
  MAX_CONCURRENT_REQUESTS: 10,
  RATE_LIMIT: 100, // Requests per minute
  COMPRESSION: true,
  CACHE_TTL: 300000 // 5 minutes
} as const;

/**
 * WebSocket configuration for real-time features
 * Includes reconnection strategies and security measures
 */
export const WEBSOCKET_CONFIG = {
  URL: 'wss://ws.aitravelplatform.com',
  RECONNECT_INTERVAL: 5000, // 5 seconds
  MAX_RECONNECT_ATTEMPTS: 5,
  PING_INTERVAL: 30000, // 30 seconds
  PONG_TIMEOUT: 5000, // 5 seconds
  CONNECTION_TIMEOUT: 10000, // 10 seconds
  MESSAGE_SIZE_LIMIT: 1048576 // 1MB
} as const;

/**
 * Authentication configuration with enhanced security
 * Implements secure token storage and biometric authentication
 */
export const AUTH_CONFIG = {
  TOKEN_KEY: 'auth_token',
  REFRESH_TOKEN_KEY: 'refresh_token',
  TOKEN_EXPIRY: 3600, // 1 hour
  REFRESH_TOKEN_EXPIRY: 604800, // 1 week
  SECURE_STORAGE: true,
  BIOMETRIC_TIMEOUT: 300, // 5 minutes
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION: 1800 // 30 minutes
} as const;

/**
 * Production feature flags with security focus
 * Controls feature availability and security measures
 */
export const FEATURE_FLAGS = {
  ENABLE_BIOMETRICS: true,
  ENABLE_OFFLINE_MODE: true,
  ENABLE_ANALYTICS: true,
  ENABLE_CRASH_REPORTING: true,
  ENABLE_DEBUG_MENU: false,
  ENABLE_MOCK_API: false,
  ENABLE_CERTIFICATE_PINNING: true,
  ENABLE_SECURE_STORAGE: true,
  ENABLE_JAILBREAK_DETECTION: true
} as const;

/**
 * Privacy-focused logging configuration
 * Implements secure logging with PII protection
 */
export const LOGGING_CONFIG = {
  LEVEL: 'error',
  ENABLE_CONSOLE_LOGS: false,
  ENABLE_FILE_LOGS: true,
  MAX_FILE_SIZE: 10485760, // 10MB
  MAX_FILES: 5,
  ENABLE_NETWORK_LOGS: false,
  ENABLE_REDUX_LOGS: false,
  PII_MASKING: true,
  LOG_ROTATION: true,
  RETENTION_DAYS: 30
} as const;

/**
 * Enhanced security settings
 * Implements strict security measures for production
 */
export const SECURITY_CONFIG = {
  ENCRYPTION_ALGORITHM: 'AES-256-GCM',
  KEY_SIZE: 256,
  SSL_MIN_VERSION: 'TLSv1.2',
  ENABLE_HSTS: true,
  CSP_ENABLED: true,
  XSS_PROTECTION: true,
  FRAME_PROTECTION: true,
  CONTENT_SECURITY_POLICY: "default-src 'self'"
} as const;

/**
 * Global environment identifier
 */
export const ENV = 'production' as const;

/**
 * Combined production configuration export
 */
export const productionConfig = {
  API_CONFIG,
  WEBSOCKET_CONFIG,
  AUTH_CONFIG,
  FEATURE_FLAGS,
  LOGGING_CONFIG,
  SECURITY_CONFIG,
  ENV
} as const;

// Default export for convenient importing
export default productionConfig;