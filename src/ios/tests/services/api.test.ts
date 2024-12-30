import { describe, test, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals'; // ^29.5.0
import MockAdapter from 'axios-mock-adapter'; // ^1.21.0
import { waitFor } from '@testing-library/react'; // ^13.4.0
import { ApiService } from '../../src/services/api';
import { User } from '../../src/types/auth';
import { ErrorCode } from '../../../backend/shared/constants/error-codes';
import { HttpStatus } from '../../../backend/shared/constants/status-codes';

// Test constants
const TEST_TIMEOUT = 30000;
const MOCK_USER_DATA: User = {
  id: '123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'USER',
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLogin: null,
  mfaEnabled: false
};
const MOCK_AUTH_TOKEN = 'mock-jwt-token';
const MOCK_REFRESH_TOKEN = 'mock-refresh-token';
const BASE_URL = 'http://localhost:3000/v1';

// Global test variables
let mockApiInstance: MockAdapter;
let apiService: ApiService;

describe('ApiService', () => {
  beforeAll(() => {
    jest.setTimeout(TEST_TIMEOUT);
  });

  beforeEach(() => {
    apiService = new ApiService();
    mockApiInstance = new MockAdapter(apiService['apiInstance'], { 
      delayResponse: 100,
      onNoMatch: 'throwException'
    });
    apiService['resetCircuitBreaker']();
    apiService['clearCache']();
  });

  afterEach(() => {
    mockApiInstance.reset();
    jest.clearAllMocks();
  });

  describe('HTTP Request Handling', () => {
    test('should successfully handle GET requests', async () => {
      // Setup
      const endpoint = '/users/profile';
      mockApiInstance.onGet(`${BASE_URL}${endpoint}`).reply(200, MOCK_USER_DATA);

      // Execute
      const response = await apiService.request<User>({
        method: 'GET',
        url: endpoint
      });

      // Verify
      expect(response).toEqual(MOCK_USER_DATA);
      expect(apiService['cache'].has(endpoint)).toBeTruthy();
    });

    test('should handle POST requests with correct payload', async () => {
      // Setup
      const endpoint = '/users';
      const payload = { email: 'new@example.com' };
      mockApiInstance.onPost(`${BASE_URL}${endpoint}`, payload).reply(201, MOCK_USER_DATA);

      // Execute
      const response = await apiService.request({
        method: 'POST',
        url: endpoint,
        data: payload
      });

      // Verify
      expect(response).toEqual(MOCK_USER_DATA);
      expect(apiService['cache'].has(endpoint)).toBeFalsy();
    });

    test('should include correct headers in requests', async () => {
      // Setup
      const endpoint = '/test-headers';
      mockApiInstance.onGet(`${BASE_URL}${endpoint}`).reply(config => {
        expect(config.headers).toMatchObject({
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Client-Version': '1.0.0',
          'X-Platform': 'iOS',
          'X-Correlation-ID': expect.any(String)
        });
        return [200, {}];
      });

      // Execute
      await apiService.request({ method: 'GET', url: endpoint });
    });
  });

  describe('Authentication Flow', () => {
    test('should handle token management correctly', async () => {
      // Setup
      await apiService.setAuthToken(MOCK_AUTH_TOKEN);
      const endpoint = '/authenticated-endpoint';
      mockApiInstance.onGet(`${BASE_URL}${endpoint}`).reply(config => {
        expect(config.headers.Authorization).toBe(`Bearer ${MOCK_AUTH_TOKEN}`);
        return [200, {}];
      });

      // Execute
      await apiService.request({ method: 'GET', url: endpoint });

      // Clear token
      await apiService.clearAuthToken();
      expect(apiService['authToken']).toBeNull();
    });

    test('should handle token refresh flow', async () => {
      // Setup
      await apiService.setAuthToken('expired-token');
      const endpoint = '/protected-resource';
      
      // Mock 401 followed by successful refresh
      mockApiInstance.onGet(`${BASE_URL}${endpoint}`).replyOnce(401);
      mockApiInstance.onPost(`${BASE_URL}/auth/refresh`).replyOnce(200, {
        token: MOCK_AUTH_TOKEN
      });
      mockApiInstance.onGet(`${BASE_URL}${endpoint}`).replyOnce(200, MOCK_USER_DATA);

      // Execute
      const response = await apiService.request<User>({
        method: 'GET',
        url: endpoint
      });

      // Verify
      expect(response).toEqual(MOCK_USER_DATA);
      expect(apiService['authToken']).toBe(MOCK_AUTH_TOKEN);
    });
  });

  describe('Caching Mechanism', () => {
    test('should cache GET requests and return cached data', async () => {
      // Setup
      const endpoint = '/cached-resource';
      mockApiInstance.onGet(`${BASE_URL}${endpoint}`).replyOnce(200, MOCK_USER_DATA);

      // First request - should hit API
      const response1 = await apiService.request<User>({
        method: 'GET',
        url: endpoint
      });

      // Second request - should return cached data
      const response2 = await apiService.request<User>({
        method: 'GET',
        url: endpoint
      });

      // Verify
      expect(response1).toEqual(MOCK_USER_DATA);
      expect(response2).toEqual(MOCK_USER_DATA);
      expect(mockApiInstance.history.get.length).toBe(1);
    });

    test('should not cache non-GET requests', async () => {
      // Setup
      const endpoint = '/non-cached-resource';
      mockApiInstance.onPost(`${BASE_URL}${endpoint}`).reply(200, MOCK_USER_DATA);

      // Execute POST request
      await apiService.request({
        method: 'POST',
        url: endpoint,
        data: {}
      });

      // Verify no cache entry
      expect(apiService['cache'].has(endpoint)).toBeFalsy();
    });
  });

  describe('Circuit Breaker Pattern', () => {
    test('should open circuit after threshold failures', async () => {
      // Setup
      const endpoint = '/failing-endpoint';
      mockApiInstance.onGet(`${BASE_URL}${endpoint}`).reply(500);

      // Execute multiple failing requests
      const attempts = 5;
      for (let i = 0; i < attempts; i++) {
        try {
          await apiService.request({ method: 'GET', url: endpoint });
        } catch (error) {
          // Expected errors
        }
      }

      // Verify circuit breaker state
      expect(apiService['circuitBreaker'].isOpen).toBeTruthy();
      expect(apiService['circuitBreaker'].failures).toBeGreaterThanOrEqual(5);

      // Attempt request with open circuit
      await expect(
        apiService.request({ method: 'GET', url: endpoint })
      ).rejects.toThrow('Circuit breaker is open');
    });

    test('should reset circuit breaker after timeout', async () => {
      // Setup
      const endpoint = '/recovery-endpoint';
      apiService['circuitBreaker'] = {
        failures: 5,
        lastFailure: Date.now() - 31000, // Just over reset timeout
        isOpen: true
      };

      mockApiInstance.onGet(`${BASE_URL}${endpoint}`).reply(200, MOCK_USER_DATA);

      // Execute request after timeout
      const response = await apiService.request<User>({
        method: 'GET',
        url: endpoint
      });

      // Verify circuit breaker reset and successful request
      expect(response).toEqual(MOCK_USER_DATA);
      expect(apiService['circuitBreaker'].isOpen).toBeFalsy();
      expect(apiService['circuitBreaker'].failures).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle validation errors correctly', async () => {
      // Setup
      const endpoint = '/validation-error';
      const errorResponse = {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid input',
        details: { field: ['Invalid value'] }
      };
      mockApiInstance.onPost(`${BASE_URL}${endpoint}`).reply(400, errorResponse);

      // Execute and verify
      await expect(
        apiService.request({
          method: 'POST',
          url: endpoint,
          data: {}
        })
      ).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid input'
      });
    });

    test('should handle network errors with retry logic', async () => {
      // Setup
      const endpoint = '/network-error';
      let attempts = 0;
      mockApiInstance.onGet(`${BASE_URL}${endpoint}`).reply(() => {
        attempts++;
        return attempts < 3 ? [0] : [200, MOCK_USER_DATA];
      });

      // Execute
      const response = await apiService.request<User>({
        method: 'GET',
        url: endpoint
      });

      // Verify retries and successful response
      expect(attempts).toBe(3);
      expect(response).toEqual(MOCK_USER_DATA);
    });

    test('should handle rate limiting with exponential backoff', async () => {
      // Setup
      const endpoint = '/rate-limited';
      const startTime = Date.now();
      let attempts = 0;
      
      mockApiInstance.onGet(`${BASE_URL}${endpoint}`).reply(() => {
        attempts++;
        return attempts < 3 ? [429] : [200, MOCK_USER_DATA];
      });

      // Execute
      const response = await apiService.request<User>({
        method: 'GET',
        url: endpoint
      });

      // Verify backoff timing and successful response
      const duration = Date.now() - startTime;
      expect(duration).toBeGreaterThan(3000); // Minimum time for exponential backoff
      expect(attempts).toBe(3);
      expect(response).toEqual(MOCK_USER_DATA);
    });
  });
});