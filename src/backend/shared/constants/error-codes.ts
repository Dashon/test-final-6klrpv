/**
 * @fileoverview Standardized error codes and handling configuration for the AI-Enhanced Social Travel Platform
 * @module shared/constants/error-codes
 * @version 1.0.0
 */

import { HttpStatus } from './status-codes';

/**
 * Global configuration constants for error handling
 */
export const ERROR_CODE_PREFIX = 'ERR_';
export const DEFAULT_RETRY_ATTEMPTS = 3;
export const DEFAULT_RETRY_DELAY = 1000; // milliseconds
export const MAX_ERROR_MESSAGE_LENGTH = 1024;

/**
 * Standardized error codes for application-wide error handling
 * @enum {string}
 */
export enum ErrorCode {
    VALIDATION_ERROR = `${ERROR_CODE_PREFIX}VALIDATION`,
    AUTHENTICATION_ERROR = `${ERROR_CODE_PREFIX}AUTH`,
    AUTHORIZATION_ERROR = `${ERROR_CODE_PREFIX}FORBIDDEN`,
    RESOURCE_NOT_FOUND = `${ERROR_CODE_PREFIX}NOT_FOUND`,
    RATE_LIMIT_EXCEEDED = `${ERROR_CODE_PREFIX}RATE_LIMIT`,
    INTERNAL_SERVER_ERROR = `${ERROR_CODE_PREFIX}INTERNAL`,
    DATABASE_ERROR = `${ERROR_CODE_PREFIX}DATABASE`,
    NETWORK_ERROR = `${ERROR_CODE_PREFIX}NETWORK`,
    GDS_ERROR = `${ERROR_CODE_PREFIX}GDS`,
    PAYMENT_ERROR = `${ERROR_CODE_PREFIX}PAYMENT`,
    ML_SERVICE_ERROR = `${ERROR_CODE_PREFIX}ML_SERVICE`,
    EXTERNAL_SERVICE_ERROR = `${ERROR_CODE_PREFIX}EXTERNAL_SERVICE`
}

/**
 * User-friendly error messages for each error code
 * Note: These messages should be moved to a localization system for production
 */
export const ErrorMessage: Record<ErrorCode, string> = {
    [ErrorCode.VALIDATION_ERROR]: 'The provided data is invalid or incomplete.',
    [ErrorCode.AUTHENTICATION_ERROR]: 'Authentication failed. Please log in again.',
    [ErrorCode.AUTHORIZATION_ERROR]: 'You do not have permission to perform this action.',
    [ErrorCode.RESOURCE_NOT_FOUND]: 'The requested resource could not be found.',
    [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later.',
    [ErrorCode.INTERNAL_SERVER_ERROR]: 'An unexpected error occurred. Please try again.',
    [ErrorCode.DATABASE_ERROR]: 'Database operation failed. Please try again.',
    [ErrorCode.NETWORK_ERROR]: 'Network connection error. Please check your connection.',
    [ErrorCode.GDS_ERROR]: 'Travel booking system temporarily unavailable.',
    [ErrorCode.PAYMENT_ERROR]: 'Payment processing failed. Please try again.',
    [ErrorCode.ML_SERVICE_ERROR]: 'AI service temporarily unavailable.',
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'External service integration failed.'
};

/**
 * Error severity levels for monitoring and alerting
 */
export enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

/**
 * Cache impact types for error scenarios
 */
export enum CacheImpact {
    NONE = 'none',
    CLEAR = 'clear',
    STALE = 'stale',
    PRESERVE = 'preserve'
}

/**
 * Logging levels for error tracking
 */
export enum LoggingLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error'
}

/**
 * Retry strategy configuration type
 */
interface RetryStrategy {
    maxAttempts: number;
    baseDelay: number;
    exponential: boolean;
    jitter: boolean;
}

/**
 * Comprehensive error metadata for handling and monitoring
 */
export const ErrorMetadata: Record<ErrorCode, {
    httpStatus: HttpStatus;
    retryStrategy: RetryStrategy | null;
    severity: ErrorSeverity;
    cacheImpact: CacheImpact;
    loggingLevel: LoggingLevel;
}> = {
    [ErrorCode.VALIDATION_ERROR]: {
        httpStatus: HttpStatus.BAD_REQUEST,
        retryStrategy: null,
        severity: ErrorSeverity.LOW,
        cacheImpact: CacheImpact.NONE,
        loggingLevel: LoggingLevel.WARN
    },
    [ErrorCode.AUTHENTICATION_ERROR]: {
        httpStatus: HttpStatus.UNAUTHORIZED,
        retryStrategy: {
            maxAttempts: 1,
            baseDelay: DEFAULT_RETRY_DELAY,
            exponential: false,
            jitter: false
        },
        severity: ErrorSeverity.MEDIUM,
        cacheImpact: CacheImpact.CLEAR,
        loggingLevel: LoggingLevel.WARN
    },
    [ErrorCode.AUTHORIZATION_ERROR]: {
        httpStatus: HttpStatus.FORBIDDEN,
        retryStrategy: null,
        severity: ErrorSeverity.MEDIUM,
        cacheImpact: CacheImpact.NONE,
        loggingLevel: LoggingLevel.WARN
    },
    [ErrorCode.RESOURCE_NOT_FOUND]: {
        httpStatus: HttpStatus.NOT_FOUND,
        retryStrategy: null,
        severity: ErrorSeverity.LOW,
        cacheImpact: CacheImpact.NONE,
        loggingLevel: LoggingLevel.INFO
    },
    [ErrorCode.RATE_LIMIT_EXCEEDED]: {
        httpStatus: HttpStatus.TOO_MANY_REQUESTS,
        retryStrategy: {
            maxAttempts: DEFAULT_RETRY_ATTEMPTS,
            baseDelay: DEFAULT_RETRY_DELAY,
            exponential: true,
            jitter: true
        },
        severity: ErrorSeverity.MEDIUM,
        cacheImpact: CacheImpact.PRESERVE,
        loggingLevel: LoggingLevel.WARN
    },
    [ErrorCode.INTERNAL_SERVER_ERROR]: {
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        retryStrategy: {
            maxAttempts: DEFAULT_RETRY_ATTEMPTS,
            baseDelay: DEFAULT_RETRY_DELAY,
            exponential: true,
            jitter: true
        },
        severity: ErrorSeverity.HIGH,
        cacheImpact: CacheImpact.CLEAR,
        loggingLevel: LoggingLevel.ERROR
    },
    [ErrorCode.DATABASE_ERROR]: {
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        retryStrategy: {
            maxAttempts: DEFAULT_RETRY_ATTEMPTS,
            baseDelay: DEFAULT_RETRY_DELAY,
            exponential: true,
            jitter: false
        },
        severity: ErrorSeverity.HIGH,
        cacheImpact: CacheImpact.STALE,
        loggingLevel: LoggingLevel.ERROR
    },
    [ErrorCode.NETWORK_ERROR]: {
        httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
        retryStrategy: {
            maxAttempts: DEFAULT_RETRY_ATTEMPTS,
            baseDelay: DEFAULT_RETRY_DELAY,
            exponential: true,
            jitter: true
        },
        severity: ErrorSeverity.HIGH,
        cacheImpact: CacheImpact.PRESERVE,
        loggingLevel: LoggingLevel.ERROR
    },
    [ErrorCode.GDS_ERROR]: {
        httpStatus: HttpStatus.BAD_GATEWAY,
        retryStrategy: {
            maxAttempts: 5,
            baseDelay: DEFAULT_RETRY_DELAY,
            exponential: true,
            jitter: true
        },
        severity: ErrorSeverity.HIGH,
        cacheImpact: CacheImpact.STALE,
        loggingLevel: LoggingLevel.ERROR
    },
    [ErrorCode.PAYMENT_ERROR]: {
        httpStatus: HttpStatus.BAD_GATEWAY,
        retryStrategy: {
            maxAttempts: 2,
            baseDelay: DEFAULT_RETRY_DELAY,
            exponential: true,
            jitter: false
        },
        severity: ErrorSeverity.CRITICAL,
        cacheImpact: CacheImpact.NONE,
        loggingLevel: LoggingLevel.ERROR
    },
    [ErrorCode.ML_SERVICE_ERROR]: {
        httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
        retryStrategy: {
            maxAttempts: DEFAULT_RETRY_ATTEMPTS,
            baseDelay: DEFAULT_RETRY_DELAY,
            exponential: true,
            jitter: true
        },
        severity: ErrorSeverity.MEDIUM,
        cacheImpact: CacheImpact.STALE,
        loggingLevel: LoggingLevel.ERROR
    },
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: {
        httpStatus: HttpStatus.BAD_GATEWAY,
        retryStrategy: {
            maxAttempts: DEFAULT_RETRY_ATTEMPTS,
            baseDelay: DEFAULT_RETRY_DELAY,
            exponential: true,
            jitter: true
        },
        severity: ErrorSeverity.HIGH,
        cacheImpact: CacheImpact.STALE,
        loggingLevel: LoggingLevel.ERROR
    }
};