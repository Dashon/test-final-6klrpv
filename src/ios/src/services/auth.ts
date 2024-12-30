/**
 * Enhanced Authentication Service for iOS
 * @version 1.0.0
 * 
 * Implements secure authentication with OAuth 2.0 + JWT, biometric authentication,
 * and secure token storage using iOS Keychain.
 */

import Auth0, { Credentials, Auth0User } from 'react-native-auth0'; // ^2.17.0
import * as Keychain from 'react-native-keychain'; // ^8.1.1
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics'; // ^2.1.4
import { ApiService } from './api';
import { Analytics } from '../utils/analytics';
import { developmentConfig } from '../config/development';
import { productionConfig } from '../config/production';

// Constants for authentication configuration
const {
  AUTH_CONFIG: {
    TOKEN_KEY,
    REFRESH_TOKEN_KEY,
    TOKEN_EXPIRY,
    REFRESH_TOKEN_EXPIRY,
    MAX_FAILED_ATTEMPTS,
    LOCKOUT_DURATION,
    BIOMETRIC_TIMEOUT
  },
  SECURITY_CONFIG: {
    ENCRYPTION_ALGORITHM
  }
} = process.env.NODE_ENV === 'production' ? productionConfig : developmentConfig;

// Secure storage keys with namespace
const TOKEN_STORAGE_KEY = '@auth_token_secure';
const REFRESH_TOKEN_STORAGE_KEY = '@refresh_token_secure';
const BIOMETRIC_KEY = '@biometric_key_secure';
const FAILED_ATTEMPTS_KEY = '@failed_attempts';
const LOCKOUT_TIME_KEY = '@lockout_timestamp';

/**
 * Authentication state interface
 */
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: Auth0User | null;
  error: Error | null;
  lockoutTime: number | null;
  failedAttempts: number;
}

/**
 * Login credentials interface
 */
interface LoginCredentials {
  email: string;
  password: string;
  useBiometrics?: boolean;
}

/**
 * Authentication response interface
 */
interface AuthResponse {
  user: Auth0User;
  tokens: {
    accessToken: string;
    refreshToken: string;
    idToken: string;
  };
}

/**
 * Enhanced Authentication Service Class
 */
export class AuthService {
  private auth0: Auth0;
  private biometrics: ReactNativeBiometrics;
  private apiService: ApiService;
  private state: AuthState;
  private sessionTimeout?: NodeJS.Timeout;
  private readonly SESSION_DURATION = TOKEN_EXPIRY * 1000;
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor(apiService: ApiService) {
    this.auth0 = new Auth0({
      domain: process.env.AUTH0_DOMAIN!,
      clientId: process.env.AUTH0_CLIENT_ID!
    });
    this.biometrics = new ReactNativeBiometrics({
      allowDeviceCredentials: true
    });
    this.apiService = apiService;
    this.state = {
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
      lockoutTime: null,
      failedAttempts: 0
    };
    this.initializeAuthState();
  }

  /**
   * Initializes authentication state and biometric availability
   */
  private async initializeAuthState(): Promise<void> {
    try {
      // Check for existing tokens
      const tokens = await this.getStoredTokens();
      if (tokens?.accessToken) {
        await this.validateAndRestoreSession(tokens);
      }

      // Initialize biometric state
      const { available, biometryType } = await this.biometrics.isSensorAvailable();
      if (available && biometryType !== BiometryTypes.None) {
        await this.initializeBiometricKey();
      }
    } catch (error) {
      console.error('Auth state initialization failed:', error);
      await this.clearAuthState();
    }
  }

  /**
   * Authenticates user with enhanced security measures
   */
  public async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      await this.checkLockoutStatus();
      this.state.isLoading = true;

      // Validate credentials
      if (!this.validateCredentials(credentials)) {
        throw new Error('Invalid credentials format');
      }

      // Handle biometric authentication if enabled
      if (credentials.useBiometrics) {
        await this.authenticateWithBiometrics();
      }

      // Perform Auth0 authentication
      const auth0Response = await this.auth0.auth.passwordRealm({
        username: credentials.email,
        password: credentials.password,
        realm: 'Username-Password-Authentication',
        scope: 'openid profile email offline_access'
      });

      // Store tokens securely
      await this.securelyStoreTokens(auth0Response);

      // Initialize session management
      this.initializeSessionManagement();

      // Reset failed attempts on successful login
      await this.resetFailedAttempts();

      // Track successful login
      await Analytics.trackAuthEvent('login_success', {
        method: credentials.useBiometrics ? 'biometric' : 'password'
      });

      return this.createAuthResponse(auth0Response);
    } catch (error) {
      await this.handleLoginError(error);
      throw error;
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Refreshes authentication tokens
   */
  public async refreshTokens(): Promise<string> {
    try {
      const refreshToken = await Keychain.getGenericPassword(REFRESH_TOKEN_STORAGE_KEY);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const auth0Response = await this.auth0.auth.refreshToken({
        refreshToken: refreshToken.password
      });

      await this.securelyStoreTokens(auth0Response);
      this.resetSessionTimeout();

      return auth0Response.accessToken;
    } catch (error) {
      await this.handleTokenRefreshError(error);
      throw error;
    }
  }

  /**
   * Logs out user and cleans up auth state
   */
  public async logout(): Promise<void> {
    try {
      await this.auth0.auth.clearSession();
      await this.clearAuthState();
      await Analytics.trackAuthEvent('logout_success');
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private async validateAndRestoreSession(tokens: { accessToken: string; refreshToken: string }): Promise<void> {
    try {
      const user = await this.auth0.auth.userInfo({ token: tokens.accessToken });
      this.state.user = user;
      this.state.isAuthenticated = true;
      this.apiService.setAuthToken(tokens.accessToken);
      this.initializeSessionManagement();
    } catch (error) {
      await this.refreshTokens();
    }
  }

  private async securelyStoreTokens(credentials: Credentials): Promise<void> {
    await Promise.all([
      Keychain.setGenericPassword(
        TOKEN_STORAGE_KEY,
        credentials.accessToken,
        {
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
          authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS
        }
      ),
      Keychain.setGenericPassword(
        REFRESH_TOKEN_STORAGE_KEY,
        credentials.refreshToken!,
        {
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
          authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS
        }
      )
    ]);
  }

  private async authenticateWithBiometrics(): Promise<void> {
    const { success } = await this.biometrics.simplePrompt({
      promptMessage: 'Confirm your identity',
      cancelButtonText: 'Cancel'
    });
    
    if (!success) {
      throw new Error('Biometric authentication failed');
    }
  }

  private initializeSessionManagement(): void {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }
    this.sessionTimeout = setTimeout(
      () => this.refreshTokens(),
      this.SESSION_DURATION - 60000 // Refresh 1 minute before expiry
    );
  }

  private async handleLoginError(error: any): Promise<void> {
    await this.incrementFailedAttempts();
    await Analytics.trackAuthEvent('login_error', {
      error: error.message,
      attempts: this.state.failedAttempts
    });
    this.state.error = error;
  }

  private async clearAuthState(): Promise<void> {
    await Promise.all([
      Keychain.resetGenericPassword(TOKEN_STORAGE_KEY),
      Keychain.resetGenericPassword(REFRESH_TOKEN_STORAGE_KEY),
      this.apiService.clearAuthToken()
    ]);
    
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }
    
    this.state = {
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
      lockoutTime: null,
      failedAttempts: 0
    };
  }

  private validateCredentials(credentials: LoginCredentials): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(credentials.email) && credentials.password.length >= 8;
  }

  private async checkLockoutStatus(): Promise<void> {
    if (this.state.lockoutTime && Date.now() < this.state.lockoutTime) {
      throw new Error(`Account locked. Try again in ${Math.ceil((this.state.lockoutTime - Date.now()) / 1000)} seconds`);
    }
  }

  private async incrementFailedAttempts(): Promise<void> {
    this.state.failedAttempts++;
    if (this.state.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      this.state.lockoutTime = Date.now() + LOCKOUT_DURATION * 1000;
      await Keychain.setGenericPassword(LOCKOUT_TIME_KEY, this.state.lockoutTime.toString());
    }
    await Keychain.setGenericPassword(FAILED_ATTEMPTS_KEY, this.state.failedAttempts.toString());
  }

  private async resetFailedAttempts(): Promise<void> {
    this.state.failedAttempts = 0;
    this.state.lockoutTime = null;
    await Promise.all([
      Keychain.resetGenericPassword(FAILED_ATTEMPTS_KEY),
      Keychain.resetGenericPassword(LOCKOUT_TIME_KEY)
    ]);
  }

  private createAuthResponse(auth0Response: Credentials): AuthResponse {
    return {
      user: this.state.user!,
      tokens: {
        accessToken: auth0Response.accessToken,
        refreshToken: auth0Response.refreshToken!,
        idToken: auth0Response.idToken!
      }
    };
  }
}

// Export singleton instance
export const authService = new AuthService(new ApiService());