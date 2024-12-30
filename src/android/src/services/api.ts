/**
 * @fileoverview Core API service module for Android mobile app
 * @version 1.0.0
 * 
 * Implements a robust API client with comprehensive error handling,
 * retry logic, and security features for the AI-Enhanced Social Travel Platform.
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios'; // ^1.4.0
import axiosRetry from 'axios-retry'; // ^3.5.0
import { StatusCodes } from 'http-status-codes'; // ^2.2.0
import { config } from '../config/development';
import { AuthTokens } from '../types/auth';
import { ErrorCode, ErrorMetadata, ErrorMessage } from '../../../backend/shared/constants/error-codes';
import { HttpStatus } from '../../../backend/shared/constants/status-codes';
import { BaseResponse, ErrorResponse, isErrorResponse } from '../../../backend/shared/interfaces/base.interface';

// Global constants
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-Client-Version': '1.0.0',
  'X-Platform': 'android'
};

const NETWORK_ERROR = 'Network Error';
const TIMEOUT_ERROR = 'Request Timeout';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

/**
 * Custom API error class with detailed error information
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  public readonly requestId: string;
  public readonly timestamp: Date;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = new Date();
  }
}

/**
 * Creates and configures an axios instance with interceptors and retry logic
 */
const createApiClient = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: config.API_CONFIG.BASE_URL,
    timeout: config.API_CONFIG.TIMEOUT,
    headers: DEFAULT_HEADERS,
    validateStatus: (status) => status < 500
  });

  // Configure retry logic
  axiosRetry(instance, {
    retries: MAX_RETRY_ATTEMPTS,
    retryDelay: (retryCount) => {
      return retryCount * RETRY_DELAY;
    },
    retryCondition: (error: AxiosError) => {
      const shouldRetry = axiosRetry.isNetworkOrIdempotentRequestError(error) ||
        error.response?.status === HttpStatus.TOO_MANY_REQUESTS ||
        error.response?.status === HttpStatus.SERVICE_UNAVAILABLE;
      return shouldRetry;
    }
  });

  // Request interceptor
  instance.interceptors.request.use(
    async (config) => {
      const tokens = await getStoredTokens();
      if (tokens?.accessToken) {
        config.headers.Authorization = `Bearer ${tokens.accessToken}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config;
      
      if (error.response?.status === HttpStatus.UNAUTHORIZED && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const tokens = await getStoredTokens();
          if (tokens?.refreshToken) {
            const newTokens = await refreshAuthToken(tokens.refreshToken);
            await storeTokens(newTokens);
            originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
            return instance(originalRequest);
          }
        } catch (refreshError) {
          return Promise.reject(handleApiError(refreshError as AxiosError));
        }
      }
      
      return Promise.reject(handleApiError(error));
    }
  );

  return instance;
};

/**
 * Processes API errors with detailed logging and formatting
 */
const handleApiError = (error: AxiosError): ApiError => {
  let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
  let errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
  let message = ErrorMessage[ErrorCode.INTERNAL_SERVER_ERROR];
  let details: Record<string, unknown> | undefined;

  if (error.response) {
    const errorResponse = error.response.data as ErrorResponse;
    statusCode = error.response.status;
    errorCode = errorResponse.error || errorCode;
    message = errorResponse.message || message;
    details = errorResponse.details;
  } else if (error.code === 'ECONNABORTED') {
    statusCode = HttpStatus.GATEWAY_TIMEOUT;
    errorCode = ErrorCode.NETWORK_ERROR;
    message = TIMEOUT_ERROR;
  } else if (error.message === NETWORK_ERROR) {
    statusCode = HttpStatus.SERVICE_UNAVAILABLE;
    errorCode = ErrorCode.NETWORK_ERROR;
    message = error.message;
  }

  // Log error with appropriate severity
  const metadata = ErrorMetadata[errorCode];
  console.error(`[API Error][${metadata.severity}] ${message}`, {
    statusCode,
    errorCode,
    details,
    stack: error.stack
  });

  return new ApiError(message, statusCode, errorCode, details);
};

/**
 * Refreshes authentication token with retry mechanism
 */
const refreshAuthToken = async (refreshToken: string): Promise<AuthTokens> => {
  try {
    const response = await apiClient.post<BaseResponse<AuthTokens>>('/auth/refresh', {
      refreshToken
    });
    return response.data.data;
  } catch (error) {
    throw new ApiError(
      'Token refresh failed',
      HttpStatus.UNAUTHORIZED,
      ErrorCode.AUTHENTICATION_ERROR
    );
  }
};

// Token storage helpers
const getStoredTokens = async (): Promise<AuthTokens | null> => {
  // Implementation would use Android's secure storage
  return null;
};

const storeTokens = async (tokens: AuthTokens): Promise<void> => {
  // Implementation would use Android's secure storage
};

// Create API client instance
export const apiClient = createApiClient();

// Export type-safe request methods
export const get = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  const response = await apiClient.get<BaseResponse<T>>(url, config);
  return response.data.data;
};

export const post = async <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
  const response = await apiClient.post<BaseResponse<T>>(url, data, config);
  return response.data.data;
};

export const put = async <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
  const response = await apiClient.put<BaseResponse<T>>(url, data, config);
  return response.data.data;
};

export const del = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  const response = await apiClient.delete<BaseResponse<T>>(url, config);
  return response.data.data;
};