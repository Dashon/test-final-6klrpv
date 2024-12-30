/**
 * @fileoverview Standardized HTTP status codes for consistent API responses
 * @see RFC 7231 - HTTP/1.1 Semantics and Content
 * @module shared/constants/status-codes
 */

/**
 * Enum representing standard HTTP status codes used across backend services.
 * Provides type safety and centralized status code management.
 * 
 * Usage:
 * - Use with API response handlers and error middleware
 * - Import specific codes using destructuring
 * - Supports tree-shaking for optimal bundle size
 * 
 * @enum {number}
 */
export enum HttpStatus {
    /**
     * 200 OK
     * Standard response for successful HTTP requests.
     * The actual response will depend on the request method used.
     */
    OK = 200,

    /**
     * 201 Created
     * Request has been fulfilled and new resource created.
     * Typically used with POST requests.
     */
    CREATED = 201,

    /**
     * 202 Accepted
     * Request accepted for processing but not yet completed.
     * Used for async operations.
     */
    ACCEPTED = 202,

    /**
     * 204 No Content
     * Server successfully processed request but is not returning content.
     * Common for DELETE operations.
     */
    NO_CONTENT = 204,

    /**
     * 400 Bad Request
     * Server cannot process request due to client error.
     * No retry strategy - client must modify request.
     */
    BAD_REQUEST = 400,

    /**
     * 401 Unauthorized
     * Authentication required and has failed or not been provided.
     * Triggers token refresh flow.
     */
    UNAUTHORIZED = 401,

    /**
     * 403 Forbidden
     * Server understood request but refuses to authorize it.
     * No retry strategy - client lacks required permissions.
     */
    FORBIDDEN = 403,

    /**
     * 404 Not Found
     * Requested resource could not be found.
     * No retry strategy - resource must exist.
     */
    NOT_FOUND = 404,

    /**
     * 409 Conflict
     * Request conflicts with current state of server.
     * Common in concurrent modification scenarios.
     */
    CONFLICT = 409,

    /**
     * 429 Too Many Requests
     * User has sent too many requests in a given time period.
     * Implements exponential backoff retry strategy.
     */
    TOO_MANY_REQUESTS = 429,

    /**
     * 500 Internal Server Error
     * Generic server error message for unexpected conditions.
     * Implements retry with exponential backoff, max 3 attempts.
     */
    INTERNAL_SERVER_ERROR = 500,

    /**
     * 503 Service Unavailable
     * Server temporarily unavailable, usually maintenance.
     * Implements retry with exponential backoff, max 3 attempts.
     */
    SERVICE_UNAVAILABLE = 503,

    /**
     * 504 Gateway Timeout
     * Gateway or proxy timeout waiting for response.
     * Implements retry with exponential backoff, max 3 attempts.
     */
    GATEWAY_TIMEOUT = 504
}

// Global constants for direct numeric access if needed
// These are useful when type safety is not required
export const HTTP_STATUS_OK = 200;
export const HTTP_STATUS_CREATED = 201;
export const HTTP_STATUS_ACCEPTED = 202;
export const HTTP_STATUS_NO_CONTENT = 204;
export const HTTP_STATUS_BAD_REQUEST = 400;
export const HTTP_STATUS_UNAUTHORIZED = 401;
export const HTTP_STATUS_FORBIDDEN = 403;
export const HTTP_STATUS_NOT_FOUND = 404;
export const HTTP_STATUS_CONFLICT = 409;
export const HTTP_STATUS_TOO_MANY_REQUESTS = 429;
export const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;
export const HTTP_STATUS_SERVICE_UNAVAILABLE = 503;
export const HTTP_STATUS_GATEWAY_TIMEOUT = 504;

/**
 * @constant
 * Type guard to check if a number is a valid HTTP status code
 */
export const isHttpStatus = (code: number): code is HttpStatus => {
    return Object.values(HttpStatus).includes(code);
};