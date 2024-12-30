/**
 * @fileoverview API constants for Android application
 * @version 1.0.0
 * 
 * Defines API-related constants including endpoints, request configurations,
 * service paths, WebSocket connections, and environment-specific settings.
 * 
 * @see Technical Specifications/3.3 API DESIGN
 */

import { API_CONFIG as DEV_CONFIG } from '../config/development';
import { API_CONFIG as PROD_CONFIG } from '../config/production';

/**
 * Global API configuration constants
 */
export const API_PREFIX = '/api/v1';
export const WEBSOCKET_PREFIX = '/ws';
export const ENVIRONMENT = process.env.NODE_ENV || 'development';

/**
 * API version constants
 * @version 1.0.0
 */
export const API_VERSIONS = {
  V1: 'v1',
  LATEST: 'v1'
} as const;

/**
 * API endpoints for all services
 * Organized by domain and functionality
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    REFRESH_TOKEN: '/auth/refresh',
    VERIFY_EMAIL: '/auth/verify-email',
    MFA_SETUP: '/auth/mfa/setup',
    MFA_VERIFY: '/auth/mfa/verify'
  },
  PERSONA: {
    LIST: '/personas',
    CREATE: '/personas',
    UPDATE: '/personas/:id',
    DELETE: '/personas/:id',
    PREFERENCES: '/personas/:id/preferences',
    LEARNING: '/personas/:id/learning',
    ANALYTICS: '/personas/:id/analytics'
  },
  BOOKING: {
    LIST: '/bookings',
    CREATE: '/bookings',
    DETAILS: '/bookings/:id',
    UPDATE: '/bookings/:id',
    CANCEL: '/bookings/:id/cancel',
    PAYMENT: '/bookings/:id/payment',
    SPLIT_PAYMENT: '/bookings/:id/split-payment',
    CONFIRMATION: '/bookings/:id/confirmation'
  },
  CHAT: {
    ROOMS: '/chat/rooms',
    MESSAGES: '/chat/rooms/:roomId/messages',
    PARTICIPANTS: '/chat/rooms/:roomId/participants',
    WEBSOCKET: '/ws/chat',
    TYPING: '/chat/rooms/:roomId/typing',
    ATTACHMENTS: '/chat/rooms/:roomId/attachments',
    HISTORY: '/chat/rooms/:roomId/history'
  },
  PROFESSIONAL: {
    AGENTS: '/agents',
    CONSULTATIONS: '/consultations',
    ANALYTICS: '/analytics',
    EARNINGS: '/earnings',
    AVAILABILITY: '/availability',
    REVIEWS: '/reviews',
    CERTIFICATIONS: '/certifications'
  }
} as const;

/**
 * Standard request headers configuration
 * Includes platform-specific identifiers and versioning
 */
export const REQUEST_HEADERS = {
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Platform': 'android',
    'X-App-Version': '${APP_VERSION}',
    'X-Device-Id': '${DEVICE_ID}'
  },
  AUTH_HEADERS: {
    'Authorization': 'Bearer ${token}',
    'X-Refresh-Token': '${refreshToken}'
  },
  WEBSOCKET_HEADERS: {
    'X-Socket-Version': '1.0',
    'X-Socket-Protocol': 'android-native'
  }
} as const;

/**
 * API timeout configurations in milliseconds
 * Defines timeouts for different types of requests
 */
export const API_TIMEOUTS = {
  DEFAULT: 15000,    // 15 seconds
  LONG: 30000,      // 30 seconds
  UPLOAD: 60000,    // 60 seconds
  WEBSOCKET: 45000, // 45 seconds
  BOOKING: 20000    // 20 seconds
} as const;

/**
 * Retry configuration for failed requests
 * Implements exponential backoff strategy
 */
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  BACKOFF_FACTOR: 1.5,
  INITIAL_DELAY: 1000,
  MAX_DELAY: 10000,
  TIMEOUT_RETRY_CODES: [408, 429, 502, 503, 504]
} as const;

/**
 * Rate limiting configurations
 * Defines request limits for different route categories
 */
export const RATE_LIMITS = {
  PUBLIC: {
    REQUESTS_PER_HOUR: 100,
    BURST: 20
  },
  USER: {
    REQUESTS_PER_HOUR: 1000,
    BURST: 50
  },
  PROFESSIONAL: {
    REQUESTS_PER_HOUR: 5000,
    BURST: 100
  }
} as const;

/**
 * Environment-specific API configuration
 * Automatically selects configuration based on environment
 */
export const API_CONFIG = ENVIRONMENT === 'production' ? PROD_CONFIG : DEV_CONFIG;

/**
 * Type definitions for API constants
 */
export type ApiEndpoints = typeof API_ENDPOINTS;
export type RequestHeaders = typeof REQUEST_HEADERS;
export type ApiTimeouts = typeof API_TIMEOUTS;
export type RetryConfig = typeof RETRY_CONFIG;
export type RateLimits = typeof RATE_LIMITS;