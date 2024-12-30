/**
 * API Constants
 * Version: 1.0.0
 * 
 * Centralized API constants for the iOS application defining endpoints,
 * configurations, environment settings, and security parameters.
 * 
 * @packageDocumentation
 */

import { developmentConfig } from '../config/development';
import { productionConfig } from '../config/production';
import { stagingConfig } from '../config/staging';

/**
 * API endpoint constants for all services
 * @constant
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    REFRESH_TOKEN: '/auth/refresh-token',
    VERIFY_MFA: '/auth/verify-mfa'
  },
  PERSONA: {
    LIST: '/personas',
    CREATE: '/personas',
    UPDATE: '/personas/:id',
    DELETE: '/personas/:id',
    PREFERENCES: '/personas/:id/preferences',
    LEARNING_MODEL: '/personas/:id/model'
  },
  BOOKING: {
    SEARCH: '/bookings/search',
    CREATE: '/bookings',
    LIST: '/bookings',
    DETAILS: '/bookings/:id',
    CANCEL: '/bookings/:id/cancel',
    PAYMENT: '/bookings/:id/payment',
    SPLIT_PAYMENT: '/bookings/:id/split-payment'
  },
  CHAT: {
    ROOMS: '/chat/rooms',
    MESSAGES: '/chat/rooms/:roomId/messages',
    PARTICIPANTS: '/chat/rooms/:roomId/participants',
    WEBSOCKET: '/chat/ws',
    TYPING_STATUS: '/chat/rooms/:roomId/typing',
    FILE_UPLOAD: '/chat/rooms/:roomId/files'
  },
  PROFESSIONAL: {
    AGENTS: '/professional/agents',
    CONSULTATIONS: '/professional/consultations',
    ANALYTICS: '/professional/analytics',
    REVENUE: '/professional/revenue',
    AVAILABILITY: '/professional/availability'
  }
} as const;

/**
 * Enhanced API configuration settings
 * @constant
 */
export const API_CONFIG = {
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Platform': 'ios',
    'X-App-Version': '1.0.0',
    'X-Request-ID': 'uuid-v4'
  },
  SECURITY: {
    CERTIFICATE_PINNING: true,
    SSL_MIN_VERSION: 'TLS 1.2',
    ENABLE_HSTS: true,
    CSP_ENABLED: true
  },
  RATE_LIMITING: {
    MAX_REQUESTS_PER_MINUTE: 60,
    RETRY_AFTER: 60,
    ENABLE_THROTTLING: true
  },
  CACHING: {
    ENABLE_CACHE: true,
    MAX_AGE: 300,
    STALE_WHILE_REVALIDATE: 60
  }
} as const;

/**
 * Standardized API error codes
 * @constant
 */
export const ERROR_CODES = {
  NETWORK_ERROR: 'ERR_NETWORK',
  TIMEOUT: 'ERR_TIMEOUT',
  UNAUTHORIZED: 'ERR_AUTH',
  VALIDATION: 'ERR_VALIDATION',
  RATE_LIMIT: 'ERR_RATE_LIMIT',
  SERVER_ERROR: 'ERR_SERVER'
} as const;

/**
 * Environment configuration type
 */
type EnvironmentConfig = {
  API_BASE_URL: string;
  WEBSOCKET_URL: string;
  CERTIFICATE_HASHES: string[];
};

/**
 * Returns environment-specific API configuration
 * @returns {EnvironmentConfig} Environment-specific configuration
 * @throws {Error} If environment configuration is invalid
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const env = process.env.NODE_ENV || 'development';
  let config: EnvironmentConfig;

  switch (env) {
    case 'production':
      config = {
        API_BASE_URL: productionConfig.API_CONFIG.BASE_URL,
        WEBSOCKET_URL: productionConfig.WEBSOCKET_CONFIG.URL,
        CERTIFICATE_HASHES: productionConfig.API_CONFIG.CERTIFICATE_PINS || []
      };
      break;
    case 'staging':
      config = {
        API_BASE_URL: stagingConfig.API_CONFIG.BASE_URL,
        WEBSOCKET_URL: stagingConfig.WEBSOCKET_CONFIG.URL,
        CERTIFICATE_HASHES: [] // Staging might not use certificate pinning
      };
      break;
    default:
      config = {
        API_BASE_URL: developmentConfig.API_CONFIG.BASE_URL,
        WEBSOCKET_URL: developmentConfig.WEBSOCKET_CONFIG.URL,
        CERTIFICATE_HASHES: [] // Development doesn't use certificate pinning
      };
  }

  // Validate configuration
  if (!config.API_BASE_URL) {
    throw new Error('API_BASE_URL is required in environment configuration');
  }

  if (!config.WEBSOCKET_URL) {
    throw new Error('WEBSOCKET_URL is required in environment configuration');
  }

  // Apply environment-specific security settings
  if (env === 'production' && (!config.CERTIFICATE_HASHES || config.CERTIFICATE_HASHES.length === 0)) {
    throw new Error('Certificate hashes are required in production environment');
  }

  return config;
}

// Type exports for TypeScript support
export type ApiEndpoints = typeof API_ENDPOINTS;
export type ApiConfig = typeof API_CONFIG;
export type ErrorCodes = typeof ERROR_CODES;