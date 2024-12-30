/**
 * @fileoverview Express middleware for request validation using class-validator and class-transformer
 * @module shared/middleware/validation
 * @version 1.0.0
 */

import { plainToClass } from 'class-transformer'; // v0.5.x
import { validate } from 'class-validator'; // v0.14.x
import { RequestHandler } from 'express'; // v4.18.x
import { ErrorCode } from '../constants/error-codes';
import { HttpStatus } from '../constants/status-codes';
import { ErrorResponse } from '../interfaces/base.interface';
import { logger } from '../utils/logger.util';

/**
 * Interface for validation error details
 */
interface ValidationError {
  field: string;
  constraints: string[];
}

/**
 * Options for validation middleware configuration
 */
interface ValidationOptions {
  skipMissingProperties?: boolean;
  whitelist?: boolean;
  forbidNonWhitelisted?: boolean;
  validationError?: {
    target?: boolean;
    value?: boolean;
  };
}

/**
 * Default validation options
 */
const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  skipMissingProperties: false,
  whitelist: true,
  forbidNonWhitelisted: true,
  validationError: {
    target: false,
    value: false
  }
};

/**
 * Creates a validation middleware for Express routes
 * @param ClassType - The DTO class to validate against
 * @param options - Optional validation configuration
 * @returns Express middleware function
 */
const validationMiddleware = (
  ClassType: any,
  options: ValidationOptions = DEFAULT_VALIDATION_OPTIONS
): RequestHandler => {
  return async (req, res, next) => {
    try {
      // Transform request body to class instance
      const transformedBody = plainToClass(ClassType, req.body, {
        excludeExtraneousValues: true,
        enableImplicitConversion: true
      });

      // Validate the transformed object
      const validationErrors = await validate(transformedBody, {
        ...DEFAULT_VALIDATION_OPTIONS,
        ...options
      });

      if (validationErrors.length > 0) {
        // Map validation errors to a more readable format
        const errors: ValidationError[] = validationErrors.map(error => ({
          field: error.property,
          constraints: Object.values(error.constraints || {})
        }));

        // Create error response object
        const errorResponse: ErrorResponse = {
          success: false,
          status: HttpStatus.BAD_REQUEST,
          error: ErrorCode.VALIDATION_ERROR,
          message: 'Validation failed',
          details: errors.reduce((acc, curr) => ({
            ...acc,
            [curr.field]: curr.constraints
          }), {}),
          referenceId: req.headers['x-request-id'] as string || undefined
        };

        // Log validation error with context
        logger.error(
          'Request validation failed',
          new Error('Validation Error'),
          {
            path: req.path,
            method: req.method,
            errors: errors,
            body: req.body,
            correlationId: req.headers['x-correlation-id']
          }
        );

        return res.status(HttpStatus.BAD_REQUEST).json(errorResponse);
      }

      // Replace request body with transformed and validated object
      req.body = transformedBody;
      
      // Log successful validation if in debug mode
      logger.debug('Request validation successful', {
        path: req.path,
        method: req.method,
        correlationId: req.headers['x-correlation-id']
      });

      next();
    } catch (error) {
      // Handle unexpected validation errors
      logger.error(
        'Validation middleware error',
        error as Error,
        {
          path: req.path,
          method: req.method,
          correlationId: req.headers['x-correlation-id']
        }
      );

      const errorResponse: ErrorResponse = {
        success: false,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        error: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'An error occurred during request validation',
        referenceId: req.headers['x-request-id'] as string || undefined
      };

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
    }
  };
};

export default validationMiddleware;
```

This implementation provides:

1. Comprehensive request validation using class-validator and class-transformer
2. Detailed field-level validation errors with proper error messages
3. Standardized error response format following the API specifications
4. Robust error handling with proper logging
5. Support for custom validation options
6. Request correlation tracking
7. Debug logging for successful validations
8. Security through whitelisting and transformation
9. Performance optimization through configuration options
10. Type safety with TypeScript

The middleware can be used in Express routes like this:

```typescript
import { CreateUserDTO } from './dto/create-user.dto';

router.post('/users', validationMiddleware(CreateUserDTO), userController.create);