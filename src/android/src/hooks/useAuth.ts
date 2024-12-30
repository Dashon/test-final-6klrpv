/**
 * @fileoverview Custom React hook for managing authentication state and operations in the Android mobile app
 * @module android/hooks/useAuth
 * @version 1.0.0
 */

import { useDispatch, useSelector } from 'react-redux'; // v8.1.1
import { useCallback, useEffect, useRef } from 'react'; // v18.2.0
import SecureStore from '@react-native-community/secure-store'; // v1.0.0
import BiometricAuth from '@react-native-biometrics/auth'; // v2.0.0

import {
  login,
  loginWithBiometrics,
  refreshToken,
  logout,
  selectAuth
} from '../store/slices/authSlice';
import { AuthState, LoginCredentials, BiometricAuthResult } from '../types/auth';
import { ErrorCode } from '../../../backend/shared/constants/error-codes';

// Constants for secure storage
const SECURE_STORAGE_KEYS = {
  BIOMETRIC_CREDENTIALS: 'auth_biometric_credentials',
  OFFLINE_DATA: 'auth_offline_data',
  TOKEN_EXPIRY: 'auth_token_expiry',
};

// Token refresh configuration
const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const TOKEN_EXPIRY_BUFFER = 60 * 1000; // 1 minute

/**
 * Custom hook for managing authentication state and operations
 * @returns {Object} Authentication state and methods
 */
export const useAuth = () => {
  const dispatch = useDispatch();
  const authState = useSelector(selectAuth);
  const refreshIntervalRef = useRef<NodeJS.Timeout>();

  /**
   * Handles user login with enhanced security features
   * @param {LoginCredentials} credentials - User login credentials
   */
  const handleLogin = useCallback(async (credentials: LoginCredentials) => {
    try {
      // Validate credentials
      if (!credentials.email || !credentials.password) {
        throw new Error('Invalid credentials');
      }

      // Attempt login
      const result = await dispatch(login(credentials)).unwrap();

      // Store biometric credentials if enabled
      if (credentials.rememberDevice && authState.biometricEnabled) {
        const encryptedCredentials = JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        });
        await SecureStore.setItem(
          SECURE_STORAGE_KEYS.BIOMETRIC_CREDENTIALS,
          encryptedCredentials
        );
      }

      // Store token expiry
      if (result.tokens) {
        const expiryTime = Date.now() + result.tokens.expiresIn * 1000;
        await SecureStore.setItem(
          SECURE_STORAGE_KEYS.TOKEN_EXPIRY,
          expiryTime.toString()
        );
      }

      return result;
    } catch (error) {
      throw {
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: error.message || 'Login failed',
      };
    }
  }, [dispatch, authState.biometricEnabled]);

  /**
   * Handles biometric authentication
   */
  const handleBiometricLogin = useCallback(async () => {
    try {
      // Check biometric availability
      const biometricAuth = new BiometricAuth();
      const { available } = await biometricAuth.isSensorAvailable();
      
      if (!available) {
        throw new Error('Biometric authentication not available');
      }

      // Retrieve stored credentials
      const encryptedCredentials = await SecureStore.getItem(
        SECURE_STORAGE_KEYS.BIOMETRIC_CREDENTIALS
      );

      if (!encryptedCredentials) {
        throw new Error('No stored biometric credentials');
      }

      // Authenticate with biometrics
      const authResult: BiometricAuthResult = await biometricAuth.authenticate(
        'Verify your identity',
        'Use biometric authentication to login'
      );

      if (authResult.success) {
        const credentials = JSON.parse(encryptedCredentials);
        await dispatch(loginWithBiometrics(credentials)).unwrap();
      } else {
        throw new Error('Biometric authentication failed');
      }
    } catch (error) {
      throw {
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: error.message || 'Biometric authentication failed',
      };
    }
  }, [dispatch]);

  /**
   * Handles secure logout
   */
  const handleLogout = useCallback(async () => {
    try {
      // Clear secure storage
      await SecureStore.deleteItem(SECURE_STORAGE_KEYS.BIOMETRIC_CREDENTIALS);
      await SecureStore.deleteItem(SECURE_STORAGE_KEYS.OFFLINE_DATA);
      await SecureStore.deleteItem(SECURE_STORAGE_KEYS.TOKEN_EXPIRY);

      // Clear refresh interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      // Dispatch logout action
      await dispatch(logout());
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [dispatch]);

  /**
   * Handles token refresh
   */
  const refreshAuthToken = useCallback(async () => {
    try {
      const expiryTime = await SecureStore.getItem(SECURE_STORAGE_KEYS.TOKEN_EXPIRY);
      
      if (expiryTime && Date.now() + TOKEN_EXPIRY_BUFFER > parseInt(expiryTime)) {
        await dispatch(refreshToken()).unwrap();
        
        // Update token expiry time
        const newExpiryTime = Date.now() + TOKEN_REFRESH_INTERVAL;
        await SecureStore.setItem(
          SECURE_STORAGE_KEYS.TOKEN_EXPIRY,
          newExpiryTime.toString()
        );
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      // Force logout on refresh failure
      await handleLogout();
    }
  }, [dispatch, handleLogout]);

  // Setup token refresh interval
  useEffect(() => {
    if (authState.isAuthenticated) {
      refreshIntervalRef.current = setInterval(refreshAuthToken, TOKEN_REFRESH_INTERVAL);
      
      // Initial token refresh check
      refreshAuthToken();
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [authState.isAuthenticated, refreshAuthToken]);

  return {
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    loading: authState.loading,
    biometricEnabled: authState.biometricEnabled,
    offlineMode: authState.offlineMode,
    handleLogin,
    handleBiometricLogin,
    handleLogout,
    refreshAuthToken,
  };
};