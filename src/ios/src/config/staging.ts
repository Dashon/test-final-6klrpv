/**
 * Staging Environment Configuration
 * Version: 1.0.0
 * 
 * This file contains all environment-specific configurations for the staging/pre-production
 * environment of the AI Travel Platform iOS application. It includes API endpoints,
 * authentication settings, feature flags, and monitoring configurations.
 */

// Global environment identifiers
export const ENV = 'staging';
export const BUILD_VERSION = process.env.BUILD_VERSION || '1.0.0';
export const COMMIT_HASH = process.env.COMMIT_HASH || 'unknown';

/**
 * API Configuration
 * Contains all API-related settings for the staging environment
 * including endpoints, timeouts, and retry logic
 */
export const API_CONFIG = {
  BASE_URL: 'https://staging-api.aitravelplatform.com/v1',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  ENDPOINTS: {
    AUTH: '/auth',
    PERSONAS: '/personas',
    CHAT: '/chat',
    BOOKING: '/booking'
  },
  HEADERS: {
    CORRELATION_ID: 'X-Correlation-ID',
    CLIENT_VERSION: 'X-Client-Version'
  }
} as const;

/**
 * WebSocket Configuration
 * Settings for real-time communication including reconnection logic
 * and connection management
 */
export const WEBSOCKET_CONFIG = {
  URL: 'wss://staging-ws.aitravelplatform.com',
  RECONNECT_INTERVAL: 5000, // 5 seconds
  MAX_RECONNECT_ATTEMPTS: 5,
  PING_INTERVAL: 30000, // 30 seconds
  CONNECTION_TIMEOUT: 10000 // 10 seconds
} as const;

/**
 * Authentication Configuration
 * Secure authentication settings for staging environment
 * including token management and biometric authentication
 */
export const AUTH_CONFIG = {
  TOKEN_KEY: 'staging_auth_token',
  REFRESH_TOKEN_KEY: 'staging_refresh_token',
  TOKEN_EXPIRY: 3600, // 1 hour
  REFRESH_TOKEN_EXPIRY: 604800, // 1 week
  AUTH0_DOMAIN: 'staging.auth0.domain',
  AUTH0_CLIENT_ID: 'staging_client_id',
  ENCRYPTION_KEY: 'staging_encryption_key',
  BIOMETRIC_TIMEOUT: 300000 // 5 minutes
} as const;

/**
 * Feature Flags
 * Toggles for various features in the staging environment
 * enabling testing and gradual feature rollout
 */
export const FEATURE_FLAGS = {
  ENABLE_BIOMETRICS: true,
  ENABLE_OFFLINE_MODE: true,
  ENABLE_ANALYTICS: true,
  ENABLE_CRASH_REPORTING: true,
  ENABLE_DEBUG_MENU: true,
  ENABLE_MOCK_API: false,
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_ERROR_BOUNDARY: true,
  ENABLE_NETWORK_INSPECTOR: true,
  ENABLE_STATE_INSPECTOR: true
} as const;

/**
 * Logging Configuration
 * Enhanced logging settings for staging environment
 * with comprehensive debugging capabilities
 */
export const LOGGING_CONFIG = {
  LEVEL: 'debug',
  ENABLE_CONSOLE_LOGS: true,
  ENABLE_FILE_LOGS: true,
  MAX_FILE_SIZE: 10485760, // 10MB
  MAX_FILES: 5,
  LOG_ROTATION_INTERVAL: '1d',
  ENABLE_NETWORK_LOGS: true,
  ENABLE_REDUX_LOGS: true,
  ENABLE_CRASH_LOGS: true,
  LOG_FILTERS: {
    EXCLUDE_PATTERNS: ['password', 'token'],
    INCLUDE_METADATA: true
  }
} as const;

/**
 * Monitoring Configuration
 * Comprehensive monitoring settings for tracking
 * application performance and errors in staging
 */
export const MONITORING_CONFIG = {
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_ERROR_TRACKING: true,
  ENABLE_ANALYTICS: true,
  SAMPLING_RATE: 100, // 100% sampling in staging
  ERROR_THRESHOLD: 50,
  PERFORMANCE_THRESHOLD: {
    API_CALL: 1000, // 1 second
    RENDER_TIME: 300, // 300ms
    TTI: 2000 // 2 seconds
  },
  DATADOG_CONFIG: {
    API_KEY: 'staging_datadog_key',
    APP_KEY: 'staging_datadog_app',
    SERVICE_NAME: 'ios-staging'
  }
} as const;

/**
 * Combined staging configuration object
 * Exports all configuration settings as a single object
 * with type safety enforced
 */
export const stagingConfig = {
  ENV,
  BUILD_VERSION,
  COMMIT_HASH,
  API_CONFIG,
  WEBSOCKET_CONFIG,
  AUTH_CONFIG,
  FEATURE_FLAGS,
  LOGGING_CONFIG,
  MONITORING_CONFIG
} as const;

// Type-safe default export
export default stagingConfig;