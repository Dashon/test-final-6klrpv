/**
 * Custom React Hook for Authentication Management
 * Version: 1.0.0
 * 
 * Provides comprehensive authentication state management with enhanced security features:
 * - OAuth 2.0 + JWT authentication with secure token storage
 * - Multi-factor authentication support
 * - Session monitoring and automatic token refresh
 * - Device fingerprinting for enhanced security
 * - Role-based access control
 */

import { useDispatch, useSelector } from 'react-redux'; // ^8.1.1
import { useCallback, useEffect } from 'react'; // ^18.2.0
import { AES, enc } from 'crypto-js'; // ^4.1.1
import FingerprintJS from '@fingerprintjs/fingerprintjs'; // ^3.4.1

import {
  User,
  AuthState,
  LoginCredentials,
  RegisterData,
  Permission,
  hasPermission,
  SessionInfo
} from '../types/auth';
import {
  loginUser,
  refreshUserToken,
  clearAuth,
  updateLastActivity,
  logSecurityEvent,
  setMFAVerified,
  selectAuth,
  selectSecurityStatus
} from '../store/slices/authSlice';

// Security configuration constants
const TOKEN_REFRESH_INTERVAL = 1500000; // 25 minutes
const MAX_RETRY_ATTEMPTS = 3;
const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || 'default-key';
const SESSION_ACTIVITY_TIMEOUT = 1800000; // 30 minutes

/**
 * Encrypts sensitive data using AES encryption
 */
const encryptData = (data: string): string => {
  return AES.encrypt(data, ENCRYPTION_KEY).toString();
};

/**
 * Decrypts encrypted data with error handling
 */
const decryptData = (encryptedData: string): string | null => {
  try {
    const bytes = AES.decrypt(encryptedData, ENCRYPTION_KEY);
    return bytes.toString(enc.Utf8);
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
};

/**
 * Custom hook for managing authentication state and operations
 */
export const useAuth = () => {
  const dispatch = useDispatch();
  const auth = useSelector(selectAuth);
  const securityStatus = useSelector(selectSecurityStatus);

  // Initialize device fingerprint on mount
  useEffect(() => {
    const initializeFingerprint = async () => {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      localStorage.setItem('deviceId', encryptData(result.visitorId));
    };
    initializeFingerprint();
  }, []);

  // Automatic token refresh
  useEffect(() => {
    let refreshTimer: NodeJS.Timeout;
    
    if (auth.isAuthenticated) {
      refreshTimer = setInterval(() => {
        dispatch(refreshUserToken());
      }, TOKEN_REFRESH_INTERVAL);
    }

    return () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, [auth.isAuthenticated, dispatch]);

  // Session activity monitoring
  useEffect(() => {
    let activityTimer: NodeJS.Timeout;

    const handleActivity = () => {
      dispatch(updateLastActivity());
      if (activityTimer) {
        clearTimeout(activityTimer);
      }
      activityTimer = setTimeout(() => {
        handleLogout();
      }, SESSION_ACTIVITY_TIMEOUT);
    };

    if (auth.isAuthenticated) {
      window.addEventListener('mousemove', handleActivity);
      window.addEventListener('keypress', handleActivity);
      handleActivity();
    }

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      if (activityTimer) {
        clearTimeout(activityTimer);
      }
    };
  }, [auth.isAuthenticated, dispatch]);

  /**
   * Handles user login with enhanced security
   */
  const handleLogin = useCallback(async (credentials: LoginCredentials) => {
    try {
      // Verify device fingerprint
      const storedDeviceId = localStorage.getItem('deviceId');
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      const currentDeviceId = encryptData(result.visitorId);

      if (storedDeviceId && storedDeviceId !== currentDeviceId) {
        dispatch(logSecurityEvent({
          type: 'DEVICE_MISMATCH',
          timestamp: Date.now(),
          details: { deviceId: currentDeviceId }
        }));
      }

      // Encrypt sensitive credentials
      const encryptedCredentials: LoginCredentials = {
        ...credentials,
        password: encryptData(credentials.password)
      };

      const response = await dispatch(loginUser(encryptedCredentials)).unwrap();

      if (response.mfaRequired && !credentials.mfaCode) {
        return { mfaRequired: true };
      }

      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Handles MFA verification
   */
  const handleMFAChallenge = useCallback(async (mfaCode: string) => {
    try {
      const response = await dispatch(loginUser({
        ...auth.user,
        mfaCode
      })).unwrap();

      dispatch(setMFAVerified(true));
      return response;
    } catch (error) {
      console.error('MFA verification failed:', error);
      throw error;
    }
  }, [auth.user, dispatch]);

  /**
   * Handles user logout
   */
  const handleLogout = useCallback(async () => {
    try {
      dispatch(clearAuth());
      localStorage.removeItem('deviceId');
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Checks if user has required permission
   */
  const checkPermission = useCallback((requiredPermission: Permission): boolean => {
    if (!auth.user) return false;
    return hasPermission(auth.user, requiredPermission);
  }, [auth.user]);

  /**
   * Gets current session information
   */
  const getSessionInfo = useCallback((): SessionInfo => {
    return {
      id: auth.user?.id || '',
      device: {
        type: navigator.platform,
        browser: navigator.userAgent,
        os: navigator.platform
      },
      ipAddress: '', // Handled by backend
      startedAt: new Date(auth.lastActivity || Date.now()),
      lastActivity: new Date(auth.lastActivity || Date.now()),
      expiresAt: new Date(Date.now() + SESSION_ACTIVITY_TIMEOUT)
    };
  }, [auth.user, auth.lastActivity]);

  return {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    loading: auth.loading,
    error: auth.error,
    mfaRequired: auth.mfaRequired,
    mfaVerified: securityStatus.mfaVerified,
    sessionInfo: getSessionInfo(),
    handleLogin,
    handleMFAChallenge,
    handleLogout,
    checkPermission
  };
};

export type { User, AuthState, LoginCredentials, RegisterData, Permission, SessionInfo };