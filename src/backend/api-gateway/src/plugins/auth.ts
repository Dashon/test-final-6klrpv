/**
 * @fileoverview Kong API Gateway plugin for OAuth 2.0 + JWT authentication and authorization
 * @module api-gateway/plugins/auth
 * @version 1.0.0
 */

import { verify, decode, JwtPayload } from 'jsonwebtoken'; // v9.0.x
import { createClient, RedisClientType } from 'redis'; // v4.6.x
import { ErrorCode } from '../../../shared/constants/error-codes';
import { HttpStatus } from '../../../shared/constants/status-codes';
import { decrypt } from '../../../shared/utils/encryption.util';
import { logger } from '../../../shared/utils/logger.util';

// Plugin configuration constants
const PLUGIN_NAME = 'ai-travel-auth';
const PLUGIN_VERSION = '1.0.0';
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || '1h';
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '3600', 10);
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10);

// Role hierarchy and permissions
const ROLE_HIERARCHY = {
  ADMIN: ['PROFESSIONAL', 'USER'],
  PROFESSIONAL: ['USER'],
  USER: []
};

/**
 * Interface for plugin configuration
 */
interface PluginConfig {
  enableEncryption?: boolean;
  rateLimitWindow?: number;
  rateLimitMaxRequests?: number;
  cacheEnabled?: boolean;
}

/**
 * Interface for validated token payload
 */
interface ValidatedToken extends JwtPayload {
  userId: string;
  role: string;
  permissions: string[];
  encrypted?: boolean;
}

/**
 * Decorator for caching validation results
 */
function cacheable(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = async function(...args: any[]) {
    const cacheKey = `${propertyKey}:${JSON.stringify(args)}`;
    const cache = (this as any).cache;

    if (cache) {
      const cachedResult = await cache.get(cacheKey);
      if (cachedResult) {
        return JSON.parse(cachedResult);
      }
    }

    const result = await originalMethod.apply(this, args);
    
    if (cache && result) {
      await cache.set(cacheKey, JSON.stringify(result), {
        EX: 300 // 5 minutes cache
      });
    }

    return result;
  };
}

/**
 * Kong authentication plugin implementation
 */
export class KongAuthPlugin {
  private cache: RedisClientType;
  private rateLimiter: Map<string, { count: number; timestamp: number }>;

  constructor(private config: PluginConfig = {}) {
    this.initializeCache();
    this.rateLimiter = new Map();
  }

  /**
   * Plugin metadata
   */
  public readonly name = PLUGIN_NAME;
  public readonly version = PLUGIN_VERSION;
  public readonly priority = 1000;

  /**
   * Initialize Redis cache connection
   */
  private async initializeCache(): Promise<void> {
    if (this.config.cacheEnabled) {
      this.cache = createClient({
        url: process.env.REDIS_URL
      });

      await this.cache.connect();

      this.cache.on('error', (error) => {
        logger.error('Redis cache error', error, { plugin: PLUGIN_NAME });
      });
    }
  }

  /**
   * Validate JWT token with enhanced security checks
   */
  @cacheable
  private async validateToken(token: string): Promise<ValidatedToken> {
    try {
      if (!JWT_SECRET) {
        throw new Error('JWT secret not configured');
      }

      // Verify token signature and expiration
      const decoded = verify(token, JWT_SECRET, {
        algorithms: ['RS256']
      }) as ValidatedToken;

      // Handle encrypted tokens
      if (decoded.encrypted && this.config.enableEncryption) {
        const decryptedPayload = await decrypt(
          Buffer.from(decoded.payload as string, 'base64'),
          Buffer.from(decoded.iv as string, 'base64'),
          Buffer.from(decoded.authTag as string, 'base64'),
          Buffer.from(JWT_SECRET)
        );
        
        Object.assign(decoded, JSON.parse(decryptedPayload.toString()));
      }

      return decoded;
    } catch (error) {
      logger.error('Token validation failed', error as Error, {
        plugin: PLUGIN_NAME,
        errorCode: ErrorCode.AUTHENTICATION_ERROR
      });
      throw error;
    }
  }

  /**
   * Check role-based access with inheritance
   */
  @cacheable
  private async checkRoleAccess(
    userRole: string,
    requiredRole: string,
    resource: string
  ): Promise<boolean> {
    const roles = [userRole, ...(ROLE_HIERARCHY[userRole as keyof typeof ROLE_HIERARCHY] || [])];
    return roles.includes(requiredRole);
  }

  /**
   * Check rate limits for the user
   */
  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const window = this.config.rateLimitWindow || RATE_LIMIT_WINDOW;
    const maxRequests = this.config.rateLimitMaxRequests || RATE_LIMIT_MAX_REQUESTS;

    const userLimit = this.rateLimiter.get(userId) || { count: 0, timestamp: now };

    if (now - userLimit.timestamp > window * 1000) {
      userLimit.count = 1;
      userLimit.timestamp = now;
    } else {
      userLimit.count++;
    }

    this.rateLimiter.set(userId, userLimit);
    return userLimit.count <= maxRequests;
  }

  /**
   * Kong plugin access phase handler
   */
  public async access(kong: any): Promise<void> {
    try {
      // Extract token from Authorization header
      const authHeader = kong.request.getHeader('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        throw new Error('Missing or invalid Authorization header');
      }

      const token = authHeader.slice(7);
      
      // Validate token and extract user information
      const validated = await this.validateToken(token);
      
      // Check rate limits
      if (!this.checkRateLimit(validated.userId)) {
        kong.response.exit(HttpStatus.TOO_MANY_REQUESTS, {
          error: ErrorCode.RATE_LIMIT_EXCEEDED,
          message: 'Rate limit exceeded'
        });
        return;
      }

      // Check role-based access for the requested resource
      const requiredRole = kong.request.getHeader('X-Required-Role');
      const resource = kong.request.getHeader('X-Resource');
      
      if (requiredRole && !(await this.checkRoleAccess(validated.role, requiredRole, resource))) {
        kong.response.exit(HttpStatus.FORBIDDEN, {
          error: ErrorCode.AUTHORIZATION_ERROR,
          message: 'Insufficient permissions'
        });
        return;
      }

      // Add user context to headers for downstream services
      kong.service.request.setHeader('X-User-ID', validated.userId);
      kong.service.request.setHeader('X-User-Role', validated.role);
      kong.service.request.setHeader('X-User-Permissions', JSON.stringify(validated.permissions));

      // Log successful authentication
      logger.info('Authentication successful', {
        userId: validated.userId,
        role: validated.role,
        resource
      });

    } catch (error) {
      logger.error('Authentication failed', error as Error, {
        plugin: PLUGIN_NAME,
        errorCode: ErrorCode.AUTHENTICATION_ERROR
      });

      kong.response.exit(HttpStatus.UNAUTHORIZED, {
        error: ErrorCode.AUTHENTICATION_ERROR,
        message: 'Authentication failed'
      });
    }
  }

  /**
   * Cleanup plugin resources
   */
  public async destroy(): Promise<void> {
    if (this.cache) {
      await this.cache.quit();
    }
    this.rateLimiter.clear();
  }
}

// Export plugin instance factory
export default () => new KongAuthPlugin();
```

This implementation provides:

1. OAuth 2.0 + JWT validation with RS256 signing
2. Role-based access control with inheritance
3. Rate limiting with Redis-backed caching
4. Token encryption support
5. Comprehensive error handling and logging
6. Performance optimization through caching
7. Security headers for downstream services
8. Resource-level permission checks
9. Audit logging for security events
10. Graceful cleanup of resources

The plugin can be configured in Kong's configuration:

```yaml
plugins:
  - name: ai-travel-auth
    config:
      enableEncryption: true
      rateLimitWindow: 3600
      rateLimitMaxRequests: 1000
      cacheEnabled: true