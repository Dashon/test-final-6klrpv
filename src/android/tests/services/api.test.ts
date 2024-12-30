/**
 * @fileoverview Test suite for Android API service module
 * @version 1.0.0
 */

import { describe, expect, jest, test, beforeEach, afterEach } from '@jest/globals'; // ^29.5.0
import MockAdapter from 'axios-mock-adapter'; // ^1.21.0
import nock from 'nock'; // ^13.3.1
import { StatusCodes } from 'http-status-codes'; // ^2.2.0

import { apiClient, get, post, put, del } from '../../src/services/api';
import { AuthTokens } from '../../src/types/auth';
import { API_CONFIG } from '../../src/config/development';
import { ErrorCode } from '../../../backend/shared/constants/error-codes';
import { HttpStatus } from '../../../backend/shared/constants/status-codes';

// Test constants
const TEST_API_URL = 'https://api.test.aitravelplatform.com';
const MOCK_AUTH_TOKENS: AuthTokens = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  expiresIn: 3600,
  tokenType: 'Bearer',
  secureStorage: true
};
const NETWORK_CONDITIONS = ['4G', '3G', '2G', 'offline'];

// Mock adapter setup
let mockApi: MockAdapter;

describe('API Service Tests', () => {
  beforeEach(() => {
    // Initialize mock adapter
    mockApi = new MockAdapter(apiClient, { delayResponse: 100 });
    
    // Reset all mocks and history
    jest.clearAllMocks();
    mockApi.reset();
    
    // Setup default security headers validation
    mockApi.onAny().reply(config => {
      const hasAuthHeader = config.headers?.Authorization?.startsWith('Bearer ');
      const hasClientVersion = config.headers?.['X-Client-Version'] === '1.0.0';
      const hasPlatform = config.headers?.['X-Platform'] === 'android';
      
      if (!hasAuthHeader || !hasClientVersion || !hasPlatform) {
        return [HttpStatus.UNAUTHORIZED, { error: ErrorCode.AUTHENTICATION_ERROR }];
      }
      return [HttpStatus.OK, { data: {} }];
    });
  });

  afterEach(() => {
    mockApi.restore();
    nock.cleanAll();
  });

  describe('Request Methods', () => {
    test('should successfully make GET request', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockApi.onGet('/test').reply(HttpStatus.OK, { data: mockData });

      const response = await get('/test');
      expect(response).toEqual(mockData);
      expect(mockApi.history.get[0].headers['Authorization']).toBeDefined();
    });

    test('should successfully make POST request with payload', async () => {
      const payload = { name: 'Test' };
      const mockResponse = { id: 1, ...payload };
      
      mockApi.onPost('/test', payload).reply(HttpStatus.CREATED, { 
        data: mockResponse 
      });

      const response = await post('/test', payload);
      expect(response).toEqual(mockResponse);
      expect(mockApi.history.post[0].data).toBe(JSON.stringify(payload));
    });

    test('should successfully make PUT request', async () => {
      const payload = { id: 1, name: 'Updated' };
      mockApi.onPut('/test/1', payload).reply(HttpStatus.OK, { 
        data: payload 
      });

      const response = await put('/test/1', payload);
      expect(response).toEqual(payload);
    });

    test('should successfully make DELETE request', async () => {
      mockApi.onDelete('/test/1').reply(HttpStatus.NO_CONTENT);

      await del('/test/1');
      expect(mockApi.history.delete.length).toBe(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle validation errors', async () => {
      mockApi.onPost('/test').reply(HttpStatus.BAD_REQUEST, {
        error: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid data',
        details: { field: ['Required'] }
      });

      await expect(post('/test', {})).rejects.toThrow('Invalid data');
    });

    test('should handle network errors', async () => {
      mockApi.onGet('/test').networkError();
      await expect(get('/test')).rejects.toThrow('Network Error');
    });

    test('should handle timeout errors', async () => {
      mockApi.onGet('/test').timeout();
      await expect(get('/test')).rejects.toThrow('Request Timeout');
    });

    test('should handle server errors', async () => {
      mockApi.onGet('/test').reply(HttpStatus.INTERNAL_SERVER_ERROR, {
        error: ErrorCode.INTERNAL_SERVER_ERROR
      });
      
      await expect(get('/test')).rejects.toThrow();
    });
  });

  describe('Retry Mechanism', () => {
    test('should retry failed requests with backoff', async () => {
      const attempts = jest.fn();
      
      mockApi.onGet('/test')
        .replyOnce(HttpStatus.SERVICE_UNAVAILABLE)
        .replyOnce(HttpStatus.SERVICE_UNAVAILABLE)
        .replyOnce(HttpStatus.OK, { data: { success: true } });

      const response = await get('/test');
      expect(response).toEqual({ success: true });
      expect(mockApi.history.get.length).toBe(3);
    });

    test('should abort after max retry attempts', async () => {
      mockApi.onGet('/test').reply(HttpStatus.SERVICE_UNAVAILABLE);

      await expect(get('/test')).rejects.toThrow();
      expect(mockApi.history.get.length).toBe(3); // Default max retries
    });

    test('should handle rate limiting with exponential backoff', async () => {
      const startTime = Date.now();
      
      mockApi.onGet('/test')
        .replyOnce(HttpStatus.TOO_MANY_REQUESTS)
        .replyOnce(HttpStatus.OK, { data: { success: true } });

      await get('/test');
      const duration = Date.now() - startTime;
      
      expect(duration).toBeGreaterThan(1000); // Minimum backoff delay
    });
  });

  describe('Authentication Flow', () => {
    test('should refresh token on 401 response', async () => {
      // Initial request fails with 401
      mockApi.onGet('/test')
        .replyOnce(HttpStatus.UNAUTHORIZED)
        .onPost('/auth/refresh')
        .reply(HttpStatus.OK, { 
          data: { ...MOCK_AUTH_TOKENS, accessToken: 'new-token' } 
        })
        .onGet('/test')
        .reply(HttpStatus.OK, { data: { success: true } });

      const response = await get('/test');
      expect(response).toEqual({ success: true });
      expect(mockApi.history.post).toHaveLength(1); // Refresh token call
    });

    test('should handle refresh token failure', async () => {
      mockApi.onGet('/test')
        .reply(HttpStatus.UNAUTHORIZED)
        .onPost('/auth/refresh')
        .reply(HttpStatus.UNAUTHORIZED);

      await expect(get('/test')).rejects.toThrow('Token refresh failed');
    });

    test('should maintain request queue during token refresh', async () => {
      mockApi.onGet('/test1').reply(HttpStatus.UNAUTHORIZED);
      mockApi.onGet('/test2').reply(HttpStatus.UNAUTHORIZED);
      mockApi.onPost('/auth/refresh').reply(HttpStatus.OK, { 
        data: MOCK_AUTH_TOKENS 
      });

      const requests = [get('/test1'), get('/test2')];
      await expect(Promise.all(requests)).rejects.toThrow();
    });
  });

  describe('Network Conditions', () => {
    test.each(NETWORK_CONDITIONS)('should handle %s network condition', async (condition) => {
      const delay = condition === '4G' ? 100 : condition === '3G' ? 300 : 500;
      
      mockApi.onGet('/test').reply(config => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve([HttpStatus.OK, { data: { network: condition } }]);
          }, delay);
        });
      });

      const response = await get('/test');
      expect(response).toHaveProperty('network', condition);
    });
  });

  describe('Security Headers', () => {
    test('should include required security headers', async () => {
      mockApi.onGet('/test').reply(config => {
        expect(config.headers).toMatchObject({
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Client-Version': '1.0.0',
          'X-Platform': 'android'
        });
        return [HttpStatus.OK, { data: {} }];
      });

      await get('/test');
    });

    test('should handle missing security headers', async () => {
      const insecureClient = apiClient.create({
        baseURL: TEST_API_URL,
        headers: {}
      });

      await expect(
        insecureClient.get('/test')
      ).rejects.toThrow();
    });
  });
});