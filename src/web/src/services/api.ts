/**
 * Core API Service Module
 * Version: 1.0.0
 * 
 * Provides a centralized interface for making HTTP requests to backend services
 * with comprehensive error handling, retry logic, and type safety.
 * 
 * @packageDocumentation
 */

import axiosInstance from '../lib/axios';
import { AxiosResponse, AxiosError } from 'axios'; // ^1.4.0
import { User, LoginCredentials, RegisterData, AuthState } from '../types/auth';
import { Booking, BookingStatus, PaymentSplit } from '../types/booking';
import { ErrorCode, ErrorMetadata } from '../../backend/shared/constants/error-codes';
import { API_ENDPOINTS, API_TIMEOUT, MAX_RETRY_ATTEMPTS } from '../constants/api';

/**
 * Interface for API error tracking and monitoring
 */
interface APIError {
  code: ErrorCode;
  message: string;
  status: number;
  correlationId: string;
  timestamp: number;
  retryable: boolean;
}

/**
 * Interface for request metadata and tracking
 */
interface RequestMetadata {
  startTime: number;
  retryCount: number;
  correlationId: string;
}

/**
 * Configuration interface for API requests
 */
interface RequestConfig {
  retryable?: boolean;
  maxRetries?: number;
  timeout?: number;
  cache?: boolean;
  cacheTTL?: number;
}

/**
 * Enhanced API service class implementing core functionality
 */
class APIService {
  private readonly baseURL: string;
  private readonly defaultConfig: RequestConfig;

  constructor() {
    this.baseURL = process.env.NODE_ENV === 'production' 
      ? 'https://api.aitravelplatform.com/api/v1'
      : 'http://localhost:3000/api/v1';
    
    this.defaultConfig = {
      retryable: true,
      maxRetries: MAX_RETRY_ATTEMPTS,
      timeout: API_TIMEOUT,
      cache: true,
      cacheTTL: 300000 // 5 minutes
    };
  }

  /**
   * Generic request handler with enhanced error handling and retry logic
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: unknown,
    config: RequestConfig = {}
  ): Promise<T> {
    const metadata: RequestMetadata = {
      startTime: Date.now(),
      retryCount: 0,
      correlationId: crypto.randomUUID()
    };

    const requestConfig = {
      ...this.defaultConfig,
      ...config,
      headers: {
        'X-Correlation-ID': metadata.correlationId,
        'X-Request-Time': metadata.startTime.toString()
      }
    };

    try {
      const response = await axiosInstance({
        method,
        url: endpoint,
        data,
        ...requestConfig
      });

      return response.data;
    } catch (error) {
      return this.handleError(error as AxiosError, metadata, requestConfig);
    }
  }

  /**
   * Enhanced error handler with retry logic and monitoring
   */
  private async handleError(
    error: AxiosError,
    metadata: RequestMetadata,
    config: RequestConfig
  ): Promise<never> {
    const status = error.response?.status || 500;
    const errorCode = this.mapErrorCode(status);
    const errorMetadata = ErrorMetadata[errorCode];

    // Construct standardized error object
    const apiError: APIError = {
      code: errorCode,
      message: error.response?.data?.message || 'An unexpected error occurred',
      status,
      correlationId: metadata.correlationId,
      timestamp: Date.now(),
      retryable: !!errorMetadata.retryStrategy
    };

    // Handle retry logic if applicable
    if (
      apiError.retryable &&
      metadata.retryCount < (config.maxRetries || MAX_RETRY_ATTEMPTS)
    ) {
      const retryDelay = this.calculateRetryDelay(metadata.retryCount);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      metadata.retryCount++;
      return this.request(
        error.config?.method as 'GET' | 'POST' | 'PUT' | 'DELETE',
        error.config?.url || '',
        error.config?.data,
        config
      );
    }

    throw apiError;
  }

  /**
   * Maps HTTP status codes to internal error codes
   */
  private mapErrorCode(status: number): ErrorCode {
    switch (status) {
      case 400:
        return ErrorCode.VALIDATION_ERROR;
      case 401:
        return ErrorCode.AUTHENTICATION_ERROR;
      case 403:
        return ErrorCode.AUTHORIZATION_ERROR;
      case 404:
        return ErrorCode.RESOURCE_NOT_FOUND;
      case 429:
        return ErrorCode.RATE_LIMIT_EXCEEDED;
      default:
        return ErrorCode.INTERNAL_SERVER_ERROR;
    }
  }

  /**
   * Calculates exponential backoff delay for retries
   */
  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = 1000;
    const maxDelay = 10000;
    const exponentialDelay = Math.min(
      maxDelay,
      baseDelay * Math.pow(2, retryCount)
    );
    return exponentialDelay + Math.random() * 1000; // Add jitter
  }

  /**
   * Authentication Methods
   */
  async login(credentials: LoginCredentials): Promise<AuthState> {
    return this.request<AuthState>('POST', API_ENDPOINTS.auth.login, credentials);
  }

  async register(data: RegisterData): Promise<User> {
    return this.request<User>('POST', API_ENDPOINTS.auth.register, data);
  }

  async refreshToken(refreshToken: string): Promise<AuthState> {
    return this.request<AuthState>('POST', API_ENDPOINTS.auth.refreshToken, { refreshToken });
  }

  /**
   * Booking Methods
   */
  async createBooking(
    bookingData: Partial<Booking>,
    paymentSplits?: PaymentSplit[]
  ): Promise<Booking> {
    return this.request<Booking>('POST', API_ENDPOINTS.booking.create, {
      ...bookingData,
      paymentSplits
    });
  }

  async getBooking(bookingId: string): Promise<Booking> {
    return this.request<Booking>(
      'GET',
      `${API_ENDPOINTS.booking.details.replace(':id', bookingId)}`
    );
  }

  async updateBookingStatus(
    bookingId: string,
    status: BookingStatus
  ): Promise<Booking> {
    return this.request<Booking>(
      'PUT',
      `${API_ENDPOINTS.booking.update.replace(':id', bookingId)}`,
      { status }
    );
  }

  async processPaymentSplit(
    bookingId: string,
    paymentSplit: PaymentSplit
  ): Promise<PaymentSplit> {
    return this.request<PaymentSplit>(
      'POST',
      `${API_ENDPOINTS.booking.split.replace(':id', bookingId)}`,
      paymentSplit
    );
  }

  /**
   * User Methods
   */
  async getCurrentUser(): Promise<User> {
    return this.request<User>('GET', '/users/me');
  }

  async updateUserProfile(userId: string, data: Partial<User>): Promise<User> {
    return this.request<User>('PUT', `/users/${userId}`, data);
  }
}

// Export singleton instance
export const apiService = new APIService();

// Export type definitions
export type { APIError, RequestConfig, RequestMetadata };