/**
 * Axios Instance Configuration
 * Version: 1.0.0
 * 
 * Configures and exports a customized Axios instance for the AI-Enhanced Social Travel Platform
 * Implements enterprise-grade request handling with circuit breaker, retry logic, and error standardization
 * 
 * @packageDocumentation
 */

import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios'; // ^1.4.0
import axiosRetry from 'axios-retry'; // ^3.5.0
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import { BASE_URL, API_CONFIG, API_ENDPOINTS } from '../constants/api';

// Circuit breaker configuration constants
const CIRCUIT_BREAKER = {
  THRESHOLD: 5,
  TIMEOUT: 60000,
  failures: 0,
  lastFailure: 0,
  isOpen: false
};

// Request configuration constants
const REQUEST_CONFIG = {
  DEFAULT_TIMEOUT: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  RETRY_STATUS_CODES: [408, 429, 500, 502, 503, 504],
  TOKEN_REFRESH_BUFFER: 300000,
  CACHE_TTL: 300000,
  HEADERS: {
    CORRELATION_ID: 'X-Correlation-ID',
    REQUEST_TIME: 'X-Request-Time'
  }
} as const;

/**
 * Creates and configures a custom Axios instance with comprehensive error handling
 * and monitoring capabilities
 */
const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: process.env.NODE_ENV === 'production' 
      ? BASE_URL.production 
      : BASE_URL.development,
    timeout: REQUEST_CONFIG.DEFAULT_TIMEOUT,
    headers: API_CONFIG.headers
  });

  // Configure retry logic with exponential backoff
  axiosRetry(instance, {
    retries: REQUEST_CONFIG.MAX_RETRIES,
    retryDelay: (retryCount) => {
      return retryCount * REQUEST_CONFIG.RETRY_DELAY;
    },
    retryCondition: (error: AxiosError) => {
      return REQUEST_CONFIG.RETRY_STATUS_CODES.includes(error.response?.status || 0);
    }
  });

  setupRequestInterceptor(instance);
  setupResponseInterceptor(instance);

  return instance;
};

/**
 * Configures request interceptor for authentication, headers, and request tracking
 */
const setupRequestInterceptor = (instance: AxiosInstance): void => {
  instance.interceptors.request.use(
    async (config) => {
      // Check circuit breaker state
      if (CIRCUIT_BREAKER.isOpen) {
        const now = Date.now();
        if (now - CIRCUIT_BREAKER.lastFailure >= CIRCUIT_BREAKER.TIMEOUT) {
          CIRCUIT_BREAKER.isOpen = false;
          CIRCUIT_BREAKER.failures = 0;
        } else {
          throw new Error('Circuit breaker is open');
        }
      }

      // Add correlation ID and request timestamp
      config.headers[REQUEST_CONFIG.HEADERS.CORRELATION_ID] = uuidv4();
      config.headers[REQUEST_CONFIG.HEADERS.REQUEST_TIME] = Date.now().toString();

      // Handle authentication
      const token = localStorage.getItem('accessToken');
      if (token) {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        const isExpiringSoon = tokenData.exp * 1000 - Date.now() < REQUEST_CONFIG.TOKEN_REFRESH_BUFFER;

        if (isExpiringSoon) {
          try {
            const refreshToken = localStorage.getItem('refreshToken');
            const response = await axios.post(API_ENDPOINTS.auth.refreshToken, { refreshToken });
            localStorage.setItem('accessToken', response.data.accessToken);
            config.headers.Authorization = `Bearer ${response.data.accessToken}`;
          } catch (error) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
          }
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
};

/**
 * Configures response interceptor with circuit breaker and comprehensive error handling
 */
const setupResponseInterceptor = (instance: AxiosInstance): void => {
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      // Reset circuit breaker on successful response
      CIRCUIT_BREAKER.failures = 0;
      return response;
    },
    (error: AxiosError) => {
      // Update circuit breaker state
      CIRCUIT_BREAKER.failures++;
      if (CIRCUIT_BREAKER.failures >= CIRCUIT_BREAKER.THRESHOLD) {
        CIRCUIT_BREAKER.isOpen = true;
        CIRCUIT_BREAKER.lastFailure = Date.now();
      }

      // Handle specific error cases
      if (error.response) {
        switch (error.response.status) {
          case 401:
            if (!error.config?.url?.includes('refresh-token')) {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              window.location.href = '/login';
            }
            break;
          case 403:
            window.location.href = '/forbidden';
            break;
          case 429:
            // Rate limiting - handled by axios-retry
            break;
          default:
            // Log error for monitoring
            console.error('API Error:', {
              status: error.response.status,
              data: error.response.data,
              correlationId: error.config?.headers?.[REQUEST_CONFIG.HEADERS.CORRELATION_ID],
              url: error.config?.url
            });
        }
      }

      // Standardize error response
      return Promise.reject({
        status: error.response?.status || 500,
        message: error.response?.data?.message || 'An unexpected error occurred',
        correlationId: error.config?.headers?.[REQUEST_CONFIG.HEADERS.CORRELATION_ID],
        timestamp: Date.now(),
        path: error.config?.url
      });
    }
  );
};

// Create and export the configured Axios instance
const axiosInstance = createAxiosInstance();

export default axiosInstance;

/**
 * Export type definitions for better TypeScript support
 */
export type ApiError = {
  status: number;
  message: string;
  correlationId: string;
  timestamp: number;
  path?: string;
};