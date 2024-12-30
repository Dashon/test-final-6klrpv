/**
 * Authentication Service Module
 * Version: 1.0.0
 * 
 * Implements OAuth 2.0 + JWT authentication with comprehensive security features
 * including MFA support, secure token management, and enhanced error handling.
 * 
 * @packageDocumentation
 */

import { LoginCredentials, RegisterData, User, AuthState, MFASetupResponse, TokenData } from '../types/auth';
import { makeRequest, handleApiError } from '../utils/api';
import axiosInstance from '../lib/axios';
import { API_ENDPOINTS } from '../constants/api';
import jwtDecode from 'jwt-decode'; // v3.1.2
import CryptoJS from 'crypto-js'; // v4.1.1

// Constants for token management and security
const TOKEN_STORAGE_KEY = '@auth:tokens';
const TOKEN_EXPIRY_BUFFER = 300; // 5 minutes in seconds
const MAX_RETRY_ATTEMPTS = 3;
const REQUEST_TIMEOUT = 5000;
const TOKEN_ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || 'default-key';

/**
 * Interface for encrypted token storage
 */
interface EncryptedTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Class implementing comprehensive authentication functionality
 */
class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;
  private authState: AuthState = {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    loading: false,
    error: null
  };

  private constructor() {
    this.initializeFromStorage();
  }

  /**
   * Gets singleton instance of AuthService
   */
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Encrypts sensitive token data for secure storage
   */
  private encryptTokens(tokens: Partial<EncryptedTokens>): string {
    return CryptoJS.AES.encrypt(
      JSON.stringify(tokens),
      TOKEN_ENCRYPTION_KEY
    ).toString();
  }

  /**
   * Decrypts stored token data
   */
  private decryptTokens(encryptedData: string): EncryptedTokens | null {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, TOKEN_ENCRYPTION_KEY);
      return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (error) {
      console.error('Token decryption failed:', error);
      return null;
    }
  }

  /**
   * Initializes auth state from secure storage
   */
  private initializeFromStorage(): void {
    const encryptedTokens = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (encryptedTokens) {
      const tokens = this.decryptTokens(encryptedTokens);
      if (tokens && tokens.expiresAt > Date.now()) {
        this.authState = {
          ...this.authState,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true
        };
        this.setAuthorizationHeader(tokens.accessToken);
      } else {
        this.clearAuth();
      }
    }
  }

  /**
   * Sets authorization header for API requests
   */
  private setAuthorizationHeader(token: string | null): void {
    if (token) {
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axiosInstance.defaults.headers.common['Authorization'];
    }
  }

  /**
   * Authenticates user with credentials and optional MFA
   */
  public async login(credentials: LoginCredentials): Promise<AuthState> {
    try {
      this.authState.loading = true;
      this.authState.error = null;

      const response = await makeRequest<TokenData>({
        method: 'POST',
        endpoint: API_ENDPOINTS.auth.login,
        data: credentials,
        timeout: REQUEST_TIMEOUT,
        retryConfig: {
          attempts: MAX_RETRY_ATTEMPTS,
          backoff: 1000
        }
      });

      if (response.mfaRequired) {
        this.authState.mfaRequired = true;
        return this.authState;
      }

      const tokens: EncryptedTokens = {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresAt: Date.now() + (response.expiresIn * 1000)
      };

      localStorage.setItem(TOKEN_STORAGE_KEY, this.encryptTokens(tokens));
      this.setAuthorizationHeader(response.accessToken);

      const decodedToken = jwtDecode<{ user: User }>(response.accessToken);
      this.currentUser = decodedToken.user;

      this.authState = {
        user: this.currentUser,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        isAuthenticated: true,
        loading: false,
        error: null
      };

      return this.authState;
    } catch (error) {
      this.authState.loading = false;
      this.authState.error = handleApiError(error).message;
      throw error;
    }
  }

  /**
   * Registers new user with enhanced validation
   */
  public async register(data: RegisterData): Promise<User> {
    try {
      const response = await makeRequest<User>({
        method: 'POST',
        endpoint: API_ENDPOINTS.auth.register,
        data,
        timeout: REQUEST_TIMEOUT
      });

      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Refreshes access token with rotation
   */
  public async refreshToken(): Promise<string> {
    try {
      const tokens = this.decryptTokens(localStorage.getItem(TOKEN_STORAGE_KEY) || '');
      if (!tokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await makeRequest<TokenData>({
        method: 'POST',
        endpoint: API_ENDPOINTS.auth.refreshToken,
        data: { refreshToken: tokens.refreshToken },
        timeout: REQUEST_TIMEOUT,
        retryConfig: {
          attempts: MAX_RETRY_ATTEMPTS,
          backoff: 1000
        }
      });

      const newTokens: EncryptedTokens = {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresAt: Date.now() + (response.expiresIn * 1000)
      };

      localStorage.setItem(TOKEN_STORAGE_KEY, this.encryptTokens(newTokens));
      this.setAuthorizationHeader(response.accessToken);

      return response.accessToken;
    } catch (error) {
      this.clearAuth();
      throw handleApiError(error);
    }
  }

  /**
   * Sets up MFA for user account
   */
  public async setupMFA(): Promise<MFASetupResponse> {
    try {
      return await makeRequest<MFASetupResponse>({
        method: 'POST',
        endpoint: API_ENDPOINTS.auth.mfa,
        requiresAuth: true,
        timeout: REQUEST_TIMEOUT
      });
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Logs out user and clears auth state
   */
  public async logout(): Promise<void> {
    try {
      await makeRequest({
        method: 'POST',
        endpoint: API_ENDPOINTS.auth.logout,
        requiresAuth: true,
        timeout: REQUEST_TIMEOUT
      });
    } finally {
      this.clearAuth();
    }
  }

  /**
   * Clears authentication state and storage
   */
  private clearAuth(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    this.setAuthorizationHeader(null);
    this.currentUser = null;
    this.authState = {
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      loading: false,
      error: null
    };
  }

  /**
   * Checks if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  /**
   * Gets current authentication state
   */
  public getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Gets current user
   */
  public getCurrentUser(): User | null {
    return this.currentUser;
  }
}

// Export singleton instance and types
export const authService = AuthService.getInstance();
export { AuthService };
export type { AuthState, LoginCredentials, RegisterData, User, MFASetupResponse };