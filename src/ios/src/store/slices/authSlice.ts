/**
 * Authentication Redux Slice for iOS Mobile Application
 * @version 1.0.0
 * 
 * Implements OAuth 2.0 + JWT authentication with Auth0 integration,
 * session management, MFA support, and comprehensive error handling.
 * 
 * @packageDocumentation
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import { AuthState, LoginCredentials, AuthError, User } from '../../types/auth';
import { AuthService } from '../../services/auth';
import { ErrorCode, ErrorMetadata } from '../../../backend/shared/constants/error-codes';
import { Analytics } from '../../utils/analytics';

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 1800000;

// Maximum retry attempts for authentication
const MAX_RETRY_ATTEMPTS = 3;

// Initial authentication state
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
  lastActivity: Date.now(),
  mfaRequired: false,
  retryAttempts: 0,
  validationErrors: {}
};

/**
 * Async thunk for user login with enhanced error handling and MFA support
 */
export const login = createAsyncThunk<User, LoginCredentials>(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue, dispatch }) => {
    try {
      // Validate credentials
      const validationErrors = validateCredentials(credentials);
      if (Object.keys(validationErrors).length > 0) {
        return rejectWithValue({
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Invalid credentials format',
          details: validationErrors
        });
      }

      // Check retry attempts
      if (initialState.retryAttempts >= MAX_RETRY_ATTEMPTS) {
        const backoffTime = Math.pow(2, initialState.retryAttempts) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }

      // Attempt authentication
      const authService = new AuthService(null); // ApiService is injected in AuthService
      const response = await authService.login(credentials);

      // Track successful login
      await Analytics.trackEvent('auth_login_success', {
        method: credentials.useBiometrics ? 'biometric' : 'password'
      });

      return response.user;
    } catch (error: any) {
      // Track failed login attempt
      await Analytics.trackEvent('auth_login_failure', {
        error: error.message,
        attempts: initialState.retryAttempts + 1
      });

      return rejectWithValue(mapErrorToAuthError(error));
    }
  }
);

/**
 * Async thunk for token refresh
 */
export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const authService = new AuthService(null);
      const response = await authService.refreshToken();
      return response.user;
    } catch (error: any) {
      return rejectWithValue(mapErrorToAuthError(error));
    }
  }
);

/**
 * Async thunk for user logout
 */
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const authService = new AuthService(null);
      await authService.logout();
      await Analytics.trackEvent('auth_logout_success');
    } catch (error: any) {
      await Analytics.trackEvent('auth_logout_failure', {
        error: error.message
      });
      return rejectWithValue(mapErrorToAuthError(error));
    }
  }
);

/**
 * Authentication slice with reducers and actions
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Update last activity timestamp
    updateLastActivity: (state) => {
      state.lastActivity = Date.now();
    },

    // Clear authentication errors
    clearErrors: (state) => {
      state.error = null;
      state.validationErrors = {};
    },

    // Reset retry attempts
    resetRetryAttempts: (state) => {
      state.retryAttempts = 0;
    },

    // Set MFA requirement
    setMfaRequired: (state, action: PayloadAction<boolean>) => {
      state.mfaRequired = action.payload;
    },

    // Handle session timeout
    handleSessionTimeout: (state) => {
      if (Date.now() - state.lastActivity > SESSION_TIMEOUT) {
        state.isAuthenticated = false;
        state.user = null;
        state.error = {
          code: ErrorCode.AUTHENTICATION_ERROR,
          message: 'Session expired',
          details: {}
        };
      }
    }
  },
  extraReducers: (builder) => {
    // Login action handlers
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload;
        state.loading = false;
        state.lastActivity = Date.now();
        state.retryAttempts = 0;
        state.error = null;
        state.validationErrors = {};
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.retryAttempts += 1;
        state.error = action.payload as AuthError;
        if (action.payload?.code === ErrorCode.VALIDATION_ERROR) {
          state.validationErrors = action.payload.details || {};
        }
      })

    // Token refresh action handlers
    builder
      .addCase(refreshToken.pending, (state) => {
        state.loading = true;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
        state.lastActivity = Date.now();
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload as AuthError;
      })

    // Logout action handlers
    builder
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        return { ...initialState };
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as AuthError;
      });
  }
});

// Helper functions
const validateCredentials = (credentials: LoginCredentials): Record<string, string> => {
  const errors: Record<string, string> = {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(credentials.email)) {
    errors.email = 'Invalid email format';
  }
  if (!credentials.password || credentials.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  return errors;
};

const mapErrorToAuthError = (error: any): AuthError => {
  const errorCode = error.code || ErrorCode.AUTHENTICATION_ERROR;
  const metadata = ErrorMetadata[errorCode];

  return {
    code: errorCode,
    message: error.message || 'Authentication failed',
    details: error.details || {}
  };
};

// Export actions and reducer
export const {
  updateLastActivity,
  clearErrors,
  resetRetryAttempts,
  setMfaRequired,
  handleSessionTimeout
} = authSlice.actions;

export default authSlice.reducer;