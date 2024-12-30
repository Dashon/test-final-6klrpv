/**
 * Enhanced Authentication Hook for iOS Mobile Application
 * @version 1.0.0
 * 
 * Implements secure authentication with OAuth 2.0 + JWT, biometric support,
 * session management, and comprehensive error handling.
 */

import { useEffect, useCallback } from 'react'; // ^18.2.0
import { useDispatch, useSelector } from 'react-redux'; // ^8.0.0
import TouchID from 'react-native-touch-id'; // ^4.4.1
import * as SecureStore from '@react-native-community/secure-store'; // ^6.0.0
import { 
  login, 
  register, 
  logout, 
  refreshToken, 
  selectAuth 
} from '../../store/slices/authSlice';
import analytics from '../../utils/analytics';
import { LoginCredentials, AuthError } from '../../types/auth';
import { ErrorCode } from '../../../backend/shared/constants/error-codes';

// Constants for authentication configuration
const TOKEN_REFRESH_INTERVAL = 25 * 60 * 1000; // 25 minutes
const MAX_RETRY_ATTEMPTS = 3;
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const BIOMETRIC_CONFIG = {
  promptMessage: 'Confirm your identity',
  fallbackLabel: 'Use passcode'
};

/**
 * Enhanced authentication hook with biometric support and security features
 */
export const useAuth = () => {
  const dispatch = useDispatch();
  const authState = useSelector(selectAuth);
  
  /**
   * Handles user login with biometric authentication support
   */
  const handleLogin = useCallback(async (credentials: LoginCredentials) => {
    try {
      // Track login attempt
      await analytics.trackAuthEvent('login_attempt', {
        method: credentials.useBiometrics ? 'biometric' : 'password'
      });

      if (credentials.useBiometrics) {
        const biometricSuccess = await handleBiometricAuth();
        if (!biometricSuccess) {
          throw new Error('Biometric authentication failed');
        }
      }

      const result = await dispatch(login(credentials)).unwrap();
      
      // Store authentication tokens securely
      await SecureStore.setItem('auth_token', result.tokens.accessToken);
      await SecureStore.setItem('refresh_token', result.tokens.refreshToken);
      
      // Track successful login
      await analytics.trackAuthEvent('login_success', {
        method: credentials.useBiometrics ? 'biometric' : 'password'
      });

      return result;
    } catch (error: any) {
      await handleAuthError('login', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Handles biometric authentication
   */
  const handleBiometricAuth = useCallback(async (): Promise<boolean> => {
    try {
      const biometryType = await TouchID.isSupported();
      
      if (!biometryType) {
        throw new Error('Biometric authentication not available');
      }

      const result = await TouchID.authenticate(BIOMETRIC_CONFIG.promptMessage, {
        fallbackLabel: BIOMETRIC_CONFIG.fallbackLabel
      });

      await analytics.trackAuthEvent('biometric_auth', {
        success: true,
        type: biometryType
      });

      return result;
    } catch (error) {
      await analytics.trackAuthEvent('biometric_auth', {
        success: false,
        error: error.message
      });
      return false;
    }
  }, []);

  /**
   * Handles token refresh with exponential backoff
   */
  const handleTokenRefresh = useCallback(async (retryAttempt = 0) => {
    try {
      const result = await dispatch(refreshToken()).unwrap();
      await SecureStore.setItem('auth_token', result.tokens.accessToken);
      
      await analytics.trackAuthEvent('token_refresh_success');
      
      return result;
    } catch (error) {
      if (retryAttempt < MAX_RETRY_ATTEMPTS) {
        const backoffDelay = Math.pow(2, retryAttempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return handleTokenRefresh(retryAttempt + 1);
      }
      
      await handleAuthError('token_refresh', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Handles user logout with cleanup
   */
  const handleLogout = useCallback(async () => {
    try {
      await dispatch(logout()).unwrap();
      await Promise.all([
        SecureStore.deleteItem('auth_token'),
        SecureStore.deleteItem('refresh_token')
      ]);
      
      await analytics.trackAuthEvent('logout_success');
    } catch (error) {
      await handleAuthError('logout', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Handles authentication errors with analytics tracking
   */
  const handleAuthError = async (action: string, error: any) => {
    const errorCode = error.code || ErrorCode.AUTHENTICATION_ERROR;
    
    await analytics.trackAuthEvent(`${action}_error`, {
      error_code: errorCode,
      error_message: error.message,
      timestamp: new Date().toISOString()
    });

    return {
      code: errorCode,
      message: error.message,
      details: error.details || {}
    } as AuthError;
  };

  /**
   * Sets up token refresh interval and inactivity detection
   */
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;
    let inactivityTimeout: NodeJS.Timeout;

    if (authState.isAuthenticated) {
      // Set up token refresh
      refreshInterval = setInterval(() => {
        handleTokenRefresh();
      }, TOKEN_REFRESH_INTERVAL);

      // Set up inactivity detection
      const resetInactivityTimer = () => {
        if (inactivityTimeout) {
          clearTimeout(inactivityTimeout);
        }
        inactivityTimeout = setTimeout(handleLogout, INACTIVITY_TIMEOUT);
      };

      // Add activity listeners
      document.addEventListener('touchstart', resetInactivityTimer);
      document.addEventListener('keypress', resetInactivityTimer);
      resetInactivityTimer();

      return () => {
        clearInterval(refreshInterval);
        clearTimeout(inactivityTimeout);
        document.removeEventListener('touchstart', resetInactivityTimer);
        document.removeEventListener('keypress', resetInactivityTimer);
      };
    }
  }, [authState.isAuthenticated, handleTokenRefresh, handleLogout]);

  return {
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    login: handleLogin,
    loginWithBiometrics: (credentials: LoginCredentials) => 
      handleLogin({ ...credentials, useBiometrics: true }),
    logout: handleLogout,
    refreshToken: handleTokenRefresh
  };
};