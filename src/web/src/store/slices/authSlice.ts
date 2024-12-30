/**
 * Authentication Redux Slice
 * Version: 1.0.0
 * 
 * Implements secure authentication state management with enhanced features:
 * - OAuth 2.0 + JWT authentication
 * - MFA support
 * - Secure token management with encryption
 * - Comprehensive error handling
 * - Session monitoring and security events tracking
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import { AES, enc } from 'crypto-js'; // ^4.1.1
import {
  AuthState,
  User,
  LoginCredentials,
  RegisterData,
  MFASetupResponse,
  SecurityEvent,
  TokenData
} from '../../types/auth';
import {
  login,
  register,
  logout,
  refreshToken,
  setupMFA,
  verifyMFA,
  revokeToken
} from '../../services/auth';
import { ErrorCode } from '../../../backend/shared/constants/error-codes';

// Security configuration constants
const TOKEN_ENCRYPTION_KEY = process.env.REACT_APP_TOKEN_ENCRYPTION_KEY || 'default-key';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Initial state with comprehensive security tracking
const initialState: AuthState & {
  failedAttempts: number;
  lastFailedAttempt: number | null;
  securityEvents: SecurityEvent[];
  lastActivity: number | null;
  mfaVerified: boolean;
  sessionExpiry: number | null;
} = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  failedAttempts: 0,
  lastFailedAttempt: null,
  securityEvents: [],
  lastActivity: null,
  mfaEnabled: false,
  mfaVerified: false,
  sessionExpiry: null
};

/**
 * Encrypts sensitive token data for secure storage
 */
const encryptToken = (token: string): string => {
  return AES.encrypt(token, TOKEN_ENCRYPTION_KEY).toString();
};

/**
 * Decrypts token data with error handling
 */
const decryptToken = (encryptedToken: string): string | null => {
  try {
    const bytes = AES.decrypt(encryptedToken, TOKEN_ENCRYPTION_KEY);
    return bytes.toString(enc.Utf8);
  } catch (error) {
    console.error('Token decryption failed:', error);
    return null;
  }
};

/**
 * Enhanced login thunk with security features
 */
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue, dispatch }) => {
    try {
      const response = await login(credentials);
      
      // Handle MFA requirement
      if (response.mfaRequired && !credentials.mfaCode) {
        return { mfaRequired: true };
      }

      // Encrypt tokens before storing
      const encryptedAccess = encryptToken(response.accessToken);
      const encryptedRefresh = encryptToken(response.refreshToken);

      // Set session expiry
      const sessionExpiry = Date.now() + SESSION_TIMEOUT;

      return {
        user: response.user,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        sessionExpiry,
        mfaVerified: !!credentials.mfaCode
      };
    } catch (error: any) {
      return rejectWithValue({
        code: error.code || ErrorCode.AUTHENTICATION_ERROR,
        message: error.message
      });
    }
  }
);

/**
 * Token refresh thunk with encryption
 */
export const refreshUserToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const decryptedRefresh = decryptToken(state.auth.refreshToken!);
      
      if (!decryptedRefresh) {
        throw new Error('Invalid refresh token');
      }

      const response = await refreshToken(decryptedRefresh);
      
      return {
        accessToken: encryptToken(response.accessToken),
        refreshToken: encryptToken(response.refreshToken),
        sessionExpiry: Date.now() + SESSION_TIMEOUT
      };
    } catch (error: any) {
      return rejectWithValue({
        code: error.code || ErrorCode.AUTHENTICATION_ERROR,
        message: error.message
      });
    }
  }
);

/**
 * Enhanced auth slice with comprehensive security features
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    updateLastActivity: (state) => {
      state.lastActivity = Date.now();
    },
    clearAuth: (state) => {
      return { ...initialState };
    },
    logSecurityEvent: (state, action: PayloadAction<SecurityEvent>) => {
      state.securityEvents.push(action.payload);
    },
    setMFAVerified: (state, action: PayloadAction<boolean>) => {
      state.mfaVerified = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Login handling
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        if (action.payload.mfaRequired) {
          state.mfaEnabled = true;
          state.loading = false;
          return;
        }

        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.loading = false;
        state.failedAttempts = 0;
        state.lastFailedAttempt = null;
        state.sessionExpiry = action.payload.sessionExpiry;
        state.mfaVerified = action.payload.mfaVerified;
        state.lastActivity = Date.now();
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.failedAttempts += 1;
        state.lastFailedAttempt = Date.now();

        // Implement account lockout
        if (state.failedAttempts >= MAX_FAILED_ATTEMPTS) {
          state.securityEvents.push({
            type: 'ACCOUNT_LOCKED',
            timestamp: Date.now(),
            details: { reason: 'Maximum failed attempts exceeded' }
          });
        }
      })
      // Token refresh handling
      .addCase(refreshUserToken.fulfilled, (state, action) => {
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.sessionExpiry = action.payload.sessionExpiry;
        state.lastActivity = Date.now();
      })
      .addCase(refreshUserToken.rejected, (state) => {
        return { ...initialState };
      });
  }
});

// Export actions and reducer
export const {
  updateLastActivity,
  clearAuth,
  logSecurityEvent,
  setMFAVerified
} = authSlice.actions;

export default authSlice.reducer;

// Selectors with security checks
export const selectAuth = (state: { auth: AuthState }) => {
  // Check session expiry
  if (state.auth.sessionExpiry && Date.now() > state.auth.sessionExpiry) {
    return { ...initialState };
  }
  return state.auth;
};

export const selectSecurityStatus = (state: { auth: AuthState }) => ({
  failedAttempts: state.auth.failedAttempts,
  isLocked: state.auth.failedAttempts >= MAX_FAILED_ATTEMPTS &&
    state.auth.lastFailedAttempt &&
    Date.now() - state.auth.lastFailedAttempt < LOCKOUT_DURATION,
  securityEvents: state.auth.securityEvents,
  mfaEnabled: state.auth.mfaEnabled,
  mfaVerified: state.auth.mfaVerified
});