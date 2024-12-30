/**
 * @fileoverview Kong API Gateway plugin for comprehensive request/response transformation
 * @module api-gateway/plugins/request-transformer
 * @version 1.0.0
 */

import { KongPlugin } from '@kong/pdk'; // v0.5.0
import compression from 'compression'; // v1.7.4
import { v4 as uuidv4 } from 'uuid';
import { BaseResponse } from '../../../shared/interfaces/base.interface';
import { logger } from '../../../shared/utils/logger.util';
import { HttpStatus } from '../../../shared/constants/status-codes';
import { ErrorCode, ErrorMessage } from '../../../shared/constants/error-codes';

// Constants for request/response handling
const CONTENT_TYPE_JSON = 'application/json';
const CONTENT_TYPE_HEADER = 'content-type';
const CORRELATION_ID_HEADER = 'x-correlation-id';
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB
const COMPRESSION_THRESHOLD = 1024; // 1KB

// Default security headers based on OWASP recommendations
const DEFAULT_SECURITY_HEADERS = {
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'x-xss-protection': '1; mode=block',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'content-security-policy': "default-src 'self'",
  'permissions-policy': 'geolocation=(), microphone=()'
};

// Cache control directives
const CACHE_CONTROL_DIRECTIVES = {
  public: 'public, max-age=3600',
  private: 'private, no-cache, no-store, must-revalidate',
  dynamic: 'no-cache, must-revalidate'
};

/**
 * Interface for plugin configuration
 */
interface PluginConfig {
  enableCompression?: boolean;
  compressionLevel?: number;
  enableCaching?: boolean;
  securityHeaders?: Record<string, string>;
  corsConfig?: {
    allowOrigins: string[];
    allowMethods: string[];
    allowHeaders: string[];
    exposeHeaders: string[];
    maxAge: number;
    credentials: boolean;
  };
}

/**
 * Enhanced Kong plugin for request/response transformation with security features
 */
@KongPlugin({
  name: 'request-transformer',
  priority: 1000
})
export class RequestTransformerPlugin {
  private readonly config: Required<PluginConfig>;
  private readonly compress: compression.RequestHandler;

  constructor(config: PluginConfig = {}) {
    // Initialize configuration with defaults
    this.config = {
      enableCompression: true,
      compressionLevel: 6,
      enableCaching: true,
      securityHeaders: DEFAULT_SECURITY_HEADERS,
      corsConfig: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', CORRELATION_ID_HEADER],
        exposeHeaders: [CORRELATION_ID_HEADER],
        maxAge: 86400,
        credentials: true
      },
      ...config
    };

    // Initialize compression
    this.compress = compression({
      threshold: COMPRESSION_THRESHOLD,
      level: this.config.compressionLevel
    });
  }

  /**
   * Transform incoming request with security enhancements
   */
  private async transformRequest(request: any): Promise<void> {
    try {
      // Generate or propagate correlation ID
      const correlationId = request.headers[CORRELATION_ID_HEADER] || uuidv4();
      request.headers[CORRELATION_ID_HEADER] = correlationId;

      // Validate content type and size
      if (request.headers[CONTENT_TYPE_HEADER] === CONTENT_TYPE_JSON) {
        const body = request.body;
        if (body && Buffer.byteLength(JSON.stringify(body)) > MAX_BODY_SIZE) {
          throw new Error('Request body exceeds maximum size');
        }
      }

      // Add security headers
      Object.entries(this.config.securityHeaders).forEach(([key, value]) => {
        request.headers[key] = value;
      });

      logger.debug('Request transformed', {
        correlationId,
        method: request.method,
        path: request.url,
        headers: request.headers
      });
    } catch (error) {
      logger.error('Request transformation failed', error as Error, {
        path: request.url
      });
      throw error;
    }
  }

  /**
   * Transform outgoing response with compression and caching
   */
  private async transformResponse(response: any): Promise<void> {
    try {
      const baseResponse: BaseResponse<unknown> = {
        success: response.status < 400,
        status: response.status,
        data: response.body
      };

      // Apply CORS headers
      if (this.config.corsConfig) {
        const { corsConfig } = this.config;
        response.headers['access-control-allow-origin'] = corsConfig.allowOrigins.join(',');
        response.headers['access-control-allow-methods'] = corsConfig.allowMethods.join(',');
        response.headers['access-control-allow-headers'] = corsConfig.allowHeaders.join(',');
        response.headers['access-control-expose-headers'] = corsConfig.exposeHeaders.join(',');
        response.headers['access-control-max-age'] = corsConfig.maxAge.toString();
        response.headers['access-control-allow-credentials'] = corsConfig.credentials.toString();
      }

      // Apply caching directives
      if (this.config.enableCaching) {
        const cacheControl = response.status === HttpStatus.OK 
          ? CACHE_CONTROL_DIRECTIVES.public 
          : CACHE_CONTROL_DIRECTIVES.private;
        response.headers['cache-control'] = cacheControl;
        response.headers['etag'] = `W/"${Buffer.from(JSON.stringify(response.body)).toString('base64')}"`;
      }

      // Apply compression if enabled and response size exceeds threshold
      if (this.config.enableCompression && 
          Buffer.byteLength(JSON.stringify(response.body)) > COMPRESSION_THRESHOLD) {
        await new Promise((resolve) => {
          this.compress(response, response, resolve);
        });
      }

      response.body = baseResponse;

      logger.debug('Response transformed', {
        correlationId: response.headers[CORRELATION_ID_HEADER],
        status: response.status,
        headers: response.headers
      });
    } catch (error) {
      logger.error('Response transformation failed', error as Error, {
        status: response.status
      });
      throw error;
    }
  }

  /**
   * Handle request phase
   */
  public async access(ctx: any): Promise<void> {
    await this.transformRequest(ctx.request);
  }

  /**
   * Handle response phase
   */
  public async response(ctx: any): Promise<void> {
    await this.transformResponse(ctx.response);
  }
}
```

This implementation provides:

1. Comprehensive request/response transformation with security headers
2. CORS support with configurable options
3. Response compression for large payloads
4. Caching directives and ETag generation
5. Correlation ID tracking across services
6. Content type and size validation
7. Error handling with detailed logging
8. Configurable security headers based on OWASP recommendations
9. Performance optimization with compression thresholds
10. Standardized response format using BaseResponse interface

The plugin can be configured in Kong's configuration:

```yaml
plugins:
  - name: request-transformer
    config:
      enableCompression: true
      compressionLevel: 6
      enableCaching: true
      corsConfig:
        allowOrigins: ["https://example.com"]
        allowMethods: ["GET", "POST"]
        credentials: true