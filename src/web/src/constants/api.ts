/**
 * API Constants Configuration
 * Version: 1.0.0
 * 
 * Centralized API configuration for the AI-Enhanced Social Travel Platform
 * Includes environment-specific endpoints, API versioning, and service integrations
 */

// Global API configuration values
export const API_VERSION = "v1";
export const API_TIMEOUT = 30000;
export const MAX_RETRY_ATTEMPTS = 3;
export const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "Accept": "application/json"
};

/**
 * Environment-specific base URLs for API endpoints
 * Includes versioning and appropriate security protocols
 */
export const BASE_URL = {
  development: "http://localhost:3000/api/v1",
  staging: "https://staging-api.aitravelplatform.com/api/v1",
  production: "https://api.aitravelplatform.com/api/v1"
} as const;

/**
 * Comprehensive API endpoint paths organized by service domain
 */
export const API_ENDPOINTS = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
    refreshToken: "/auth/refresh-token",
    mfa: "/auth/mfa",
    socialAuth: "/auth/social/:provider"
  },
  booking: {
    list: "/bookings",
    create: "/bookings",
    details: "/bookings/:id",
    update: "/bookings/:id",
    cancel: "/bookings/:id/cancel",
    payment: "/bookings/:id/payment",
    split: "/bookings/:id/split",
    groupBooking: "/bookings/group"
  },
  chat: {
    rooms: "/chat/rooms",
    messages: "/chat/rooms/:roomId/messages",
    participants: "/chat/rooms/:roomId/participants",
    aiAgents: "/chat/rooms/:roomId/ai-agents",
    attachments: "/chat/rooms/:roomId/attachments"
  },
  persona: {
    list: "/personas",
    create: "/personas",
    details: "/personas/:id",
    update: "/personas/:id",
    delete: "/personas/:id",
    preferences: "/personas/:id/preferences",
    learning: "/personas/:id/learning",
    interactions: "/personas/:id/interactions"
  },
  professional: {
    agents: "/professional/agents",
    consultations: "/professional/consultations",
    analytics: "/professional/analytics",
    revenue: "/professional/revenue",
    availability: "/professional/availability",
    reviews: "/professional/reviews"
  },
  health: {
    status: "/health/status",
    metrics: "/health/metrics",
    dependencies: "/health/dependencies"
  }
} as const;

/**
 * WebSocket endpoint configurations for real-time features
 */
export const WEBSOCKET_ENDPOINTS = {
  chat: "/ws/chat",
  notifications: "/ws/notifications",
  typing: "/ws/typing"
} as const;

/**
 * Global API configuration settings
 * Includes security, performance, and rate limiting parameters
 */
export const API_CONFIG = {
  version: API_VERSION,
  timeout: API_TIMEOUT,
  retryAttempts: MAX_RETRY_ATTEMPTS,
  headers: DEFAULT_HEADERS,
  rateLimits: {
    public: 100,
    authenticated: 1000,
    professional: 5000
  }
} as const;

/**
 * External service integration configurations
 * Includes endpoints and API versions for third-party services
 */
export const EXTERNAL_SERVICES = {
  amadeus: {
    baseUrl: "https://api.amadeus.com/v2",
    endpoints: {
      search: "/shopping/flight-offers",
      booking: "/booking/flight-orders",
      hotelSearch: "/shopping/hotel-offers"
    }
  },
  stripe: {
    baseUrl: "https://api.stripe.com/v1",
    version: "2022-11-15",
    endpoints: {
      payment: "/payment_intents",
      refund: "/refunds",
      customer: "/customers"
    }
  },
  twilio: {
    baseUrl: "https://api.twilio.com/2010-04-01",
    endpoints: {
      messages: "/Messages",
      calls: "/Calls"
    }
  },
  zoom: {
    baseUrl: "https://api.zoom.us/v2",
    endpoints: {
      meetings: "/users/me/meetings",
      webinars: "/users/me/webinars"
    }
  }
} as const;

// Type definitions for better TypeScript support
export type Environment = keyof typeof BASE_URL;
export type ApiEndpoint = keyof typeof API_ENDPOINTS;
export type WebSocketEndpoint = keyof typeof WEBSOCKET_ENDPOINTS;
export type ExternalService = keyof typeof EXTERNAL_SERVICES;