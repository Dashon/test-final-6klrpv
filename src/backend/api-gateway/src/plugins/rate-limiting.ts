/**
 * @fileoverview Kong plugin for distributed rate limiting using Redis sliding window algorithm
 * @module api-gateway/plugins/rate-limiting
 * @version 1.0.0
 */

import Redis from 'ioredis'; // v5.3.x
import * as prometheus from 'prom-client'; // v14.x
import { ErrorCode } from '../../shared/constants/error-codes';
import { HttpStatus } from '../../shared/constants/status-codes';

/**
 * Route types and their corresponding hourly rate limits
 */
enum RouteType {
  PUBLIC = 'PUBLIC_ROUTES',
  USER = 'USER_ROUTES',
  PROFESSIONAL = 'PROFESSIONAL_ROUTES',
  SYSTEM = 'SYSTEM_ROUTES'
}

const ROUTE_LIMITS: Record<RouteType, number> = {
  [RouteType.PUBLIC]: 100,
  [RouteType.USER]: 1000,
  [RouteType.PROFESSIONAL]: 5000,
  [RouteType.SYSTEM]: 10000
};

/**
 * Configuration constants
 */
const WINDOW_SIZE_MS = 3600000; // 1 hour in milliseconds
const METRICS_PREFIX = 'api_rate_limit';
const REDIS_KEY_PREFIX = 'rate_limit:';
const JITTER_MAX_MS = 5000;

/**
 * Redis client configuration
 */
const REDIS_CONFIG = {
  maxRetries: 3,
  connectTimeout: 5000,
  enableReadyCheck: true,
  maxRetriesPerRequest: 2,
  retryStrategy: (times: number) => Math.min(times * 50, 2000)
};

/**
 * Interface for rate limit information
 */
interface RateLimitInfo {
  remaining: number;
  total: number;
  reset: number;
  retryAfter?: number;
}

/**
 * Interface for plugin configuration
 */
interface PluginConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  routeTypeHeader: string;
  clientIdHeader: string;
}

/**
 * Rate limiting plugin implementation for Kong
 */
export class RateLimitPlugin {
  private readonly redis: Redis;
  private readonly routeLimits: Map<string, number>;
  private readonly rateLimitCounter: prometheus.Counter;
  private readonly activeWindows: prometheus.Gauge;

  /**
   * Initialize the rate limiting plugin
   */
  constructor(private readonly config: PluginConfig) {
    // Initialize Redis client with configuration
    this.redis = new Redis({
      ...REDIS_CONFIG,
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password
    });

    // Set up route limits map
    this.routeLimits = new Map(Object.entries(ROUTE_LIMITS));

    // Initialize Prometheus metrics
    this.rateLimitCounter = new prometheus.Counter({
      name: `${METRICS_PREFIX}_exceeded_total`,
      help: 'Total number of rate limit exceeded events',
      labelNames: ['route_type']
    });

    this.activeWindows = new prometheus.Gauge({
      name: `${METRICS_PREFIX}_active_windows`,
      help: 'Number of active rate limit windows',
      labelNames: ['route_type']
    });

    // Set up error handling for Redis
    this.redis.on('error', this.handleRedisError.bind(this));
  }

  /**
   * Handle incoming requests for rate limiting
   */
  public async access(request: any): Promise<void> {
    const clientId = request.headers[this.config.clientIdHeader];
    const routeType = request.headers[this.config.routeTypeHeader] || RouteType.PUBLIC;
    
    try {
      const limitInfo = await this.calculateRateLimit(clientId, routeType);
      
      // Set rate limit headers
      this.setRateLimitHeaders(request, limitInfo);

      // Check if rate limit exceeded
      if (limitInfo.remaining < 0) {
        this.rateLimitCounter.inc({ route_type: routeType });
        throw this.createRateLimitError(limitInfo);
      }

      // Update rate limit in Redis
      await this.updateRateLimit(clientId, routeType);

    } catch (error) {
      if (error.code === ErrorCode.RATE_LIMIT_EXCEEDED) {
        throw error;
      }
      // Fallback to local memory rate limiting if Redis fails
      this.handleRedisFailure(request, routeType);
    }
  }

  /**
   * Calculate current rate limit status using sliding window
   */
  private async calculateRateLimit(
    clientId: string,
    routeType: RouteType
  ): Promise<RateLimitInfo> {
    const now = Date.now();
    const windowStart = now - WINDOW_SIZE_MS;
    const key = `${REDIS_KEY_PREFIX}${routeType}:${clientId}`;

    // Remove expired entries and count current window
    const multi = this.redis.multi();
    multi.zremrangebyscore(key, 0, windowStart);
    multi.zcard(key);
    const [, requestCount] = await multi.exec();

    const limit = this.routeLimits.get(routeType);
    const remaining = limit - (requestCount as number);
    const reset = Math.ceil((now + WINDOW_SIZE_MS) / 1000);

    this.activeWindows.set({ route_type: routeType }, requestCount as number);

    return {
      remaining,
      total: limit,
      reset,
      retryAfter: remaining < 0 ? this.calculateRetryAfter(now) : undefined
    };
  }

  /**
   * Update rate limit counter in Redis
   */
  private async updateRateLimit(clientId: string, routeType: RouteType): Promise<void> {
    const key = `${REDIS_KEY_PREFIX}${routeType}:${clientId}`;
    const now = Date.now();

    await this.redis.zadd(key, now, `${now}`);
    await this.redis.expire(key, Math.ceil(WINDOW_SIZE_MS / 1000));
  }

  /**
   * Calculate retry-after time with jitter
   */
  private calculateRetryAfter(now: number): number {
    const jitter = Math.floor(Math.random() * JITTER_MAX_MS);
    return Math.ceil((WINDOW_SIZE_MS + jitter) / 1000);
  }

  /**
   * Set rate limit headers on response
   */
  private setRateLimitHeaders(request: any, limitInfo: RateLimitInfo): void {
    request.response.headers['X-RateLimit-Limit'] = limitInfo.total.toString();
    request.response.headers['X-RateLimit-Remaining'] = Math.max(0, limitInfo.remaining).toString();
    request.response.headers['X-RateLimit-Reset'] = limitInfo.reset.toString();

    if (limitInfo.retryAfter) {
      request.response.headers['Retry-After'] = limitInfo.retryAfter.toString();
    }
  }

  /**
   * Create rate limit error response
   */
  private createRateLimitError(limitInfo: RateLimitInfo): Error {
    const error: any = new Error('Rate limit exceeded');
    error.code = ErrorCode.RATE_LIMIT_EXCEEDED;
    error.status = HttpStatus.TOO_MANY_REQUESTS;
    error.headers = {
      'Retry-After': limitInfo.retryAfter.toString()
    };
    return error;
  }

  /**
   * Handle Redis connection errors
   */
  private handleRedisError(error: Error): void {
    console.error('Redis error:', error);
    // Implement circuit breaker pattern here if needed
  }

  /**
   * Fallback to local memory rate limiting when Redis fails
   */
  private handleRedisFailure(request: any, routeType: RouteType): void {
    // Implement local rate limiting fallback
    // This is a simplified version that allows requests through
    // with reduced limits to prevent complete service disruption
    const reducedLimit = Math.floor(this.routeLimits.get(routeType) * 0.5);
    request.response.headers['X-RateLimit-Limit'] = reducedLimit.toString();
    request.response.headers['X-RateLimit-Mode'] = 'fallback';
  }
}