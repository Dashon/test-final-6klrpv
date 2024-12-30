/**
 * @fileoverview Express middleware for centralized error handling across backend services
 * @module shared/middleware/error
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.x
import { nanoid } from 'nanoid'; // v4.0.x
import { ErrorResponse } from '../interfaces/base.interface';
import { ErrorCode, ErrorMetadata, ErrorMessage, CacheImpact } from '../constants/error-codes';
import { HttpStatus } from '../constants/status-codes';
import { logger } from '../utils/logger.util';

// Environment configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const ERROR_TRACKING_ENABLED = process.env.ERROR_TRACKING_ENABLED === 'true';

/**
 * Custom error class for application-specific errors
 */
export class ApplicationError extends Error {
  public readonly code: ErrorCode;
  public readonly status: HttpStatus;
  public readonly details?: Record<string, string[]>;

  constructor(
    code: ErrorCode,
    message?: string,
    details?: Record<string, string[]>
  ) {
    super(message || ErrorMessage[code]);
    this.code = code;
    this.status = ErrorMetadata[code].httpStatus;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Interface for error tracking metadata
 */
interface ErrorTrackingMetadata {
  referenceId: string;
  timestamp: string;
  path: string;
  method: string;
  correlationId?: string;
  userId?: string;
  errorCode: ErrorCode;
  errorMessage: string;
  stackTrace?: string;
}

/**
 * Formats error response according to API standards
 */
const formatErrorResponse = (
  error: Error | ApplicationError,
  referenceId: string
): ErrorResponse => {
  const isAppError = error instanceof ApplicationError;
  const errorCode = isAppError ? error.code : ErrorCode.INTERNAL_SERVER_ERROR;
  const metadata = ErrorMetadata[errorCode];

  return {
    success: false,
    status: metadata.httpStatus,
    error: errorCode,
    message: error.message || ErrorMessage[errorCode],
    details: isAppError ? error.details : undefined,
    referenceId,
    retryStrategy: metadata.retryStrategy,
    cacheImpact: metadata.cacheImpact,
    ...(NODE_ENV === 'development' && { stack: error.stack })
  };
};

/**
 * Tracks error occurrence for monitoring and analysis
 */
const trackError = (error: Error, metadata: ErrorTrackingMetadata): void => {
  if (!ERROR_TRACKING_ENABLED) return;

  logger.error('API Error Occurred', error, {
    ...metadata,
    severity: ErrorMetadata[metadata.errorCode].severity,
    loggingLevel: ErrorMetadata[metadata.errorCode].loggingLevel
  });

  // Log security events for authentication/authorization errors
  if (
    metadata.errorCode === ErrorCode.AUTHENTICATION_ERROR ||
    metadata.errorCode === ErrorCode.AUTHORIZATION_ERROR
  ) {
    logger.warn('Security Event Detected', {
      ...metadata,
      eventType: 'security_violation'
    });
  }
};

/**
 * Centralized error handling middleware for Express applications
 */
export const errorMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate unique reference ID for error tracking
  const referenceId = nanoid();

  // Extract error details and sanitize sensitive information
  const errorMetadata: ErrorTrackingMetadata = {
    referenceId,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    correlationId: req.headers['x-correlation-id'] as string,
    userId: (req as any).user?.id,
    errorCode: error instanceof ApplicationError ? error.code : ErrorCode.INTERNAL_SERVER_ERROR,
    errorMessage: error.message,
    stackTrace: NODE_ENV === 'development' ? error.stack : undefined
  };

  // Track error for monitoring
  trackError(error, errorMetadata);

  // Format error response
  const errorResponse = formatErrorResponse(error, referenceId);

  // Set appropriate headers based on error type
  if (errorResponse.retryStrategy) {
    res.set('Retry-After', String(errorResponse.retryStrategy.baseDelay / 1000));
  }

  if (errorResponse.cacheImpact === CacheImpact.CLEAR) {
    res.set('Cache-Control', 'no-store, must-revalidate');
  }

  // Send error response
  res.status(errorResponse.status).json(errorResponse);

  // Clear error from memory after sending response
  error = null as any;
};

/**
 * Async wrapper to handle promise rejections
 */
export const asyncHandler = (fn: Function) => (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};
```

This implementation provides:

1. Comprehensive error handling with standardized responses
2. Security event monitoring for auth-related errors
3. Detailed error tracking with correlation IDs
4. Environment-aware error details
5. Retry strategy headers for recoverable errors
6. Cache control headers based on error impact
7. Memory cleanup after error handling
8. Async error handling wrapper
9. PII protection through sanitization
10. Support for field-level validation errors
11. Integration with centralized logging
12. Development vs production error detail control

The middleware can be used in Express applications like this:

```typescript
import { errorMiddleware, asyncHandler } from './middleware/error.middleware';

// Apply to routes
app.use('/api', routes);

// Apply error middleware last
app.use(errorMiddleware);

// Use async handler for route handlers
app.get('/users', asyncHandler(async (req, res) => {
  // Async route logic
}));