/**
 * API Utility Module
 * Version: 1.0.0
 * 
 * Enterprise-grade HTTP request handling with comprehensive error management,
 * request/response transformation, and enhanced security features.
 * 
 * @packageDocumentation
 */

import { AxiosError, AxiosResponse } from 'axios'; // ^1.4.0
import axiosInstance from '../lib/axios';
import { BASE_URL, API_ENDPOINTS, API_CONFIG } from '../constants/api';
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

// Request deduplication cache
const requestCache = new Map<string, { data: any; timestamp: number }>();

/**
 * Interface for standardized API errors with comprehensive tracking
 */
export interface ApiError {
  code: string;
  message: string;
  details: Record<string, any>;
  referenceId: string;
  correlationId: string;
  timestamp: Date;
  endpoint: string;
  retryAttempts: number;
}

/**
 * Interface for request configuration with enhanced options
 */
export interface RequestConfig<T = any> {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  params?: Record<string, string>;
  query?: Record<string, any>;
  data?: T;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
  retryConfig?: {
    attempts: number;
    backoff: number;
  };
  timeout?: number;
  deduplicate?: boolean;
}

/**
 * Builds a complete URL with path parameters replaced
 * @param endpoint - API endpoint path with parameter placeholders
 * @param params - Object containing parameter values
 * @returns Formatted URL with parameters replaced
 */
export const buildUrl = (endpoint: string, params?: Record<string, string>): string => {
  let url = endpoint;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, encodeURIComponent(value));
    });
  }
  return url;
};

/**
 * Builds query string from parameters with proper encoding
 * @param params - Query parameters object
 * @returns Formatted query string
 */
export const buildQueryString = (params?: Record<string, any>): string => {
  if (!params) return '';
  
  return Object.entries(params)
    .filter(([_, value]) => value !== null && value !== undefined)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value
          .map(item => `${encodeURIComponent(key)}[]=${encodeURIComponent(item)}`)
          .join('&');
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');
};

/**
 * Enhanced error handler with comprehensive error mapping and tracking
 * @param error - Axios error object
 * @returns Standardized API error object
 */
export const handleApiError = (error: AxiosError): ApiError => {
  const referenceId = uuidv4();
  const correlationId = error.config?.headers?.['X-Correlation-ID'] as string || uuidv4();
  const timestamp = new Date();
  
  // Map HTTP status codes to application error codes
  const errorCode = error.response?.status ? `API_${error.response.status}` : 'API_UNKNOWN';
  
  // Create secure error message
  const message = error.response?.data?.message || 'An unexpected error occurred';
  
  // Log error details for monitoring
  console.error('API Error:', {
    referenceId,
    correlationId,
    status: error.response?.status,
    endpoint: error.config?.url,
    message,
    timestamp
  });

  return {
    code: errorCode,
    message,
    details: error.response?.data || {},
    referenceId,
    correlationId,
    timestamp,
    endpoint: error.config?.url || '',
    retryAttempts: (error.config as any)?.retryAttempts || 0
  };
};

/**
 * Makes an HTTP request with comprehensive error handling and features
 * @param config - Request configuration object
 * @returns Promise resolving to response data
 */
export const makeRequest = async <T = any>({
  method,
  endpoint,
  params,
  query,
  data,
  headers = {},
  requiresAuth = true,
  retryConfig,
  timeout,
  deduplicate = false
}: RequestConfig): Promise<T> => {
  try {
    // Build complete URL
    const url = buildUrl(endpoint, params);
    const queryString = buildQueryString(query);
    const fullUrl = `${url}${queryString ? `?${queryString}` : ''}`;

    // Check deduplication cache
    if (deduplicate) {
      const cacheKey = `${method}:${fullUrl}:${JSON.stringify(data)}`;
      const cached = requestCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < API_CONFIG.timeout) {
        return cached.data;
      }
    }

    // Prepare request configuration
    const requestConfig = {
      method,
      url: fullUrl,
      data,
      headers: {
        ...API_CONFIG.headers,
        ...headers,
        'X-Request-ID': uuidv4()
      },
      timeout: timeout || API_CONFIG.timeout
    };

    // Configure retry strategy if specified
    if (retryConfig) {
      requestConfig.headers['X-Retry-Count'] = '0';
    }

    // Make request
    const response = await axiosInstance.request<T>(requestConfig);

    // Update cache if deduplication is enabled
    if (deduplicate) {
      const cacheKey = `${method}:${fullUrl}:${JSON.stringify(data)}`;
      requestCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
    }

    return response.data;
  } catch (error) {
    throw handleApiError(error as AxiosError);
  }
};

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  requestCache.forEach((value, key) => {
    if (now - value.timestamp > API_CONFIG.timeout) {
      requestCache.delete(key);
    }
  });
}, 60000); // Clean up every minute