/**
 * @fileoverview Centralized route configuration constants for the web application.
 * Follows Next.js 13+ app directory conventions with type-safe route definitions.
 * @version 1.0.0
 */

/**
 * Base configuration for route generation
 */
export const BASE_PATH = '/' as const;
export const API_VERSION = 'v1' as const;

/**
 * Standard parameter patterns for dynamic routes
 */
export const ROUTE_PARAMS = {
  id: ':id',
  slug: ':slug',
  date: ':date'
} as const;

/**
 * Authentication related route constants
 */
export const AUTH_ROUTES = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  VERIFY_EMAIL: '/auth/verify-email',
  MFA_SETUP: '/auth/mfa-setup'
} as const;

/**
 * Main application feature route constants
 */
export const MAIN_ROUTES = {
  DASHBOARD: '/dashboard',
  PERSONA_MANAGEMENT: '/personas',
  CHAT_HUB: '/chat',
  BOOKING_CENTER: '/bookings',
  USER_PROFILE: '/profile',
  NOTIFICATIONS: '/notifications',
  SETTINGS: '/settings'
} as const;

/**
 * Professional features route constants
 */
export const PROFESSIONAL_ROUTES = {
  AGENT_MANAGEMENT: '/professional/agents',
  ANALYTICS_DASHBOARD: '/professional/analytics',
  CONSULTATION_CALENDAR: '/professional/calendar',
  REVENUE_MANAGEMENT: '/professional/revenue',
  CLIENT_MANAGEMENT: '/professional/clients'
} as const;

/**
 * Dynamic route patterns with parameters
 */
export const DYNAMIC_ROUTES = {
  PERSONA_DETAILS: `/personas/${ROUTE_PARAMS.id}`,
  CHAT_ROOM: `/chat/${ROUTE_PARAMS.id}`,
  BOOKING_DETAILS: `/bookings/${ROUTE_PARAMS.id}`,
  AGENT_PROFILE: `/professional/agents/${ROUTE_PARAMS.id}`,
  CONSULTATION_SESSION: `/professional/calendar/${ROUTE_PARAMS.date}/${ROUTE_PARAMS.id}`
} as const;

/**
 * Type definitions for route parameters
 */
type RouteParams = {
  id?: string;
  slug?: string;
  date?: string;
};

/**
 * Utility function to generate dynamic route paths
 * @param route - The dynamic route pattern to use
 * @param params - Object containing parameter values
 * @returns Generated route path with parameters
 * @throws Error if required parameters are missing
 */
export const generateDynamicRoute = (
  route: keyof typeof DYNAMIC_ROUTES,
  params: RouteParams
): string => {
  const routePattern = DYNAMIC_ROUTES[route];
  
  if (!routePattern) {
    throw new Error(`Invalid route pattern: ${route}`);
  }

  let generatedRoute = routePattern;

  // Replace parameters in route pattern
  Object.entries(ROUTE_PARAMS).forEach(([key, placeholder]) => {
    if (routePattern.includes(placeholder) && !params[key as keyof RouteParams]) {
      throw new Error(`Missing required parameter: ${key}`);
    }
    
    if (params[key as keyof RouteParams]) {
      generatedRoute = generatedRoute.replace(
        placeholder,
        params[key as keyof RouteParams]!
      );
    }
  });

  // Validate generated route format
  if (generatedRoute.includes(':')) {
    throw new Error('Invalid route generation: Some parameters were not replaced');
  }

  return generatedRoute;
};

/**
 * Type-safe route pattern validation
 */
type ValidateRoutePattern<T> = T extends string
  ? T extends `${string}:${string}`
    ? never
    : T
  : never;

/**
 * Ensure all route patterns are valid at compile time
 */
type ValidateRoutes<T> = {
  [K in keyof T]: ValidateRoutePattern<T[K]>
};

// Type assertions to ensure route pattern validity
const _validateAuthRoutes: ValidateRoutes<typeof AUTH_ROUTES> = AUTH_ROUTES;
const _validateMainRoutes: ValidateRoutes<typeof MAIN_ROUTES> = MAIN_ROUTES;
const _validateProfessionalRoutes: ValidateRoutes<typeof PROFESSIONAL_ROUTES> = PROFESSIONAL_ROUTES;