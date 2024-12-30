/**
 * @fileoverview Redux slice for managing authentication state in the Android mobile app
 * @module android/store/slices/auth
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // v1.9.5
import { AuthState, User, AuthTokens, BiometricStatus, BiometricAuthResult } from '../../types/auth';
import { ErrorCode } from '../../../../backend/shared/constants/error-codes';
import { encryptData, decryptData } from '../../../utils/encryption';
import { SecureStorage } from '../../../utils/secureStorage';
import { DeviceInfo } from '../../../utils/deviceInfo';

// Constants for secure storage keys
const SECURE_STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER_DATA: 'auth_user_data',
};

// Initial state with enhanced security features
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  tokens: null,
  loading: false,
  error: null,
  biometricStatus: 'NOT_ENROLLED',
  deviceVerified: false,
  offlineAuthEnabled: false,
};

/**
 * Async thunk for user login with enhanced security
 */
export const loginAsync = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string; biometricData?: BiometricAuthResult }, { rejectWithValue }) => {
    try {
      // Verify device security status
      const deviceInfo = await DeviceInfo.getSecurityInfo();
      if (!deviceInfo.isSecure) {
        return rejectWithValue({
          code: ErrorCode.AUTHENTICATION_ERROR,
          message: 'Device security requirements not met',
        });
      }

      // Perform biometric authentication if enabled
      if (credentials.biometricData) {
        const biometricResult = credentials.biometricData;
        if (!biometricResult.success) {
          return rejectWithValue({
            code: ErrorCode.AUTHENTICATION_ERROR,
            message: 'Biometric authentication failed',
          });
        }
      }

      // Call authentication service
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...credentials,
          deviceInfo,
        }),
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const authData = await response.json();

      // Encrypt sensitive data before storage
      const encryptedTokens = await encryptData(authData.tokens);
      await SecureStorage.setItem(SECURE_STORAGE_KEYS.ACCESS_TOKEN, encryptedTokens.accessToken);
      await SecureStorage.setItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN, encryptedTokens.refreshToken);
      await SecureStorage.setItem(SECURE_STORAGE_KEYS.USER_DATA, JSON.stringify(authData.user));

      return authData;
    } catch (error) {
      return rejectWithValue({
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: error.message,
      });
    }
  }
);

/**
 * Async thunk for device verification
 */
export const verifyDeviceAsync = createAsyncThunk(
  'auth/verifyDevice',
  async (deviceInfo: DeviceInfo, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/v1/auth/verify-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deviceInfo),
      });

      if (!response.ok) {
        throw new Error('Device verification failed');
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue({
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: error.message,
      });
    }
  }
);

/**
 * Async thunk for biometric setup
 */
export const setupBiometricAsync = createAsyncThunk(
  'auth/setupBiometric',
  async (_, { rejectWithValue }) => {
    try {
      const biometricAvailable = await DeviceInfo.checkBiometricAvailability();
      if (!biometricAvailable) {
        throw new Error('Biometric authentication not available');
      }

      const enrollmentResult = await DeviceInfo.enrollBiometric();
      return enrollmentResult;
    } catch (error) {
      return rejectWithValue({
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: error.message,
      });
    }
  }
);

/**
 * Authentication slice with enhanced security features
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    logout: (state) => {
      // Securely clear sensitive data
      SecureStorage.removeItem(SECURE_STORAGE_KEYS.ACCESS_TOKEN);
      SecureStorage.removeItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
      SecureStorage.removeItem(SECURE_STORAGE_KEYS.USER_DATA);
      
      return {
        ...initialState,
        biometricStatus: state.biometricStatus,
      };
    },
    updateBiometricStatus: (state, action: PayloadAction<BiometricStatus>) => {
      state.biometricStatus = action.payload;
    },
    setOfflineAuth: (state, action: PayloadAction<boolean>) => {
      state.offlineAuthEnabled = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Login async thunk reducers
    builder
      .addCase(loginAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
        state.loading = false;
        state.error = null;
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as any;
      })
      // Device verification reducers
      .addCase(verifyDeviceAsync.fulfilled, (state) => {
        state.deviceVerified = true;
      })
      .addCase(verifyDeviceAsync.rejected, (state) => {
        state.deviceVerified = false;
      })
      // Biometric setup reducers
      .addCase(setupBiometricAsync.fulfilled, (state) => {
        state.biometricStatus = 'AVAILABLE';
      })
      .addCase(setupBiometricAsync.rejected, (state) => {
        state.biometricStatus = 'UNAVAILABLE';
      });
  },
});

export const {
  setLoading,
  clearError,
  logout,
  updateBiometricStatus,
  setOfflineAuth,
} = authSlice.actions;

export default authSlice.reducer;