/**
 * Development Environment Configuration
 * Version: 1.0.0
 * 
 * This file contains environment-specific configuration settings for the iOS application
 * in development mode. It includes API endpoints, WebSocket settings, authentication,
 * feature flags, logging configurations, and iOS-specific settings.
 * 
 * @packageDocumentation
 */

/**
 * Global environment indicator
 * @constant
 */
export const ENV = 'development' as const;

/**
 * Debug mode indicator
 * @constant
 */
export const IS_DEBUG = true as const;

/**
 * Simulator detection flag
 * @constant
 */
export const IS_SIMULATOR = false as const;

/**
 * API configuration for development environment
 * @constant
 */
export const API_CONFIG = {
  BASE_URL: 'http://localhost:3000/v1',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  ENABLE_MOCK_RESPONSES: true,
  MOCK_DELAY: 500, // 500ms mock response delay
  ENABLE_REQUEST_LOGGING: true,
} as const;

/**
 * WebSocket configuration for development environment
 * @constant
 */
export const WEBSOCKET_CONFIG = {
  URL: 'ws://localhost:3001',
  RECONNECT_INTERVAL: 5000, // 5 seconds
  MAX_RECONNECT_ATTEMPTS: 5,
  PING_INTERVAL: 30000, // 30 seconds
  ENABLE_AUTO_RECONNECT: true,
  ENABLE_MESSAGE_LOGGING: true,
} as const;

/**
 * Authentication configuration for development environment
 * @constant
 */
export const AUTH_CONFIG = {
  TOKEN_KEY: 'dev_auth_token',
  REFRESH_TOKEN_KEY: 'dev_refresh_token',
  TOKEN_EXPIRY: 3600, // 1 hour
  REFRESH_TOKEN_EXPIRY: 86400, // 24 hours
  ENABLE_BIOMETRIC_AUTH: true,
  ENABLE_TOKEN_REFRESH: true,
  AUTH_PERSISTENCE: 'keychain' as const,
  MOCK_AUTH_ENABLED: true,
} as const;

/**
 * Feature flags for development environment
 * @constant
 */
export const FEATURE_FLAGS = {
  ENABLE_BIOMETRICS: true,
  ENABLE_OFFLINE_MODE: true,
  ENABLE_ANALYTICS: false,
  ENABLE_CRASH_REPORTING: false,
  ENABLE_DEBUG_MENU: true,
  ENABLE_MOCK_API: true,
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_NETWORK_LOGGING: true,
  ENABLE_STATE_LOGGING: true,
  SHOW_DEVELOPMENT_TOOLS: true,
} as const;

/**
 * Logging configuration for development environment
 * @constant
 */
export const LOGGING_CONFIG = {
  LEVEL: 'debug' as const,
  ENABLE_CONSOLE_LOGS: true,
  ENABLE_FILE_LOGS: true,
  MAX_FILE_SIZE: 5242880, // 5MB
  MAX_FILES: 5,
  LOG_DIRECTORY: 'Library/Logs/Development',
  ENABLE_NETWORK_LOGS: true,
  ENABLE_REDUX_LOGS: true,
  ENABLE_NAVIGATION_LOGS: true,
  ENABLE_PERFORMANCE_LOGS: true,
  ENABLE_CRASH_LOGS: true,
  LOG_SENSITIVE_DATA: false,
} as const;

/**
 * iOS-specific development configuration
 * @constant
 */
export const IOS_SPECIFIC_CONFIG = {
  SIMULATOR_DETECTION: true,
  ENABLE_DEBUG_VIEW: true,
  SHAKE_GESTURE_ENABLED: true,
  DEVELOPMENT_TEAM: 'XXXXXXXXXX',
  BUNDLE_ID_SUFFIX: '.dev',
  ENABLE_PUSH_NOTIFICATIONS: false,
  USE_SANDBOX_CERTIFICATES: true,
  ENABLE_BACKGROUND_FETCH: true,
} as const;

/**
 * Combined development environment configuration object
 * @constant
 */
export const developmentConfig = {
  ENV,
  IS_DEBUG,
  IS_SIMULATOR,
  API_CONFIG,
  WEBSOCKET_CONFIG,
  AUTH_CONFIG,
  FEATURE_FLAGS,
  LOGGING_CONFIG,
  IOS_SPECIFIC_CONFIG,
} as const;

/**
 * Default export of the development configuration
 */
export default developmentConfig;