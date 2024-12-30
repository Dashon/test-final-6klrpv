/**
 * @fileoverview Authentication and authorization types for Android mobile app
 * @module android/types/auth
 * @version 1.0.0
 */

import { BaseEntity } from '../../../backend/shared/interfaces/base.interface';

/**
 * Enumerated user roles for role-based access control
 */
export type UserRole = 'user' | 'professional' | 'admin';

/**
 * User preferences configuration including theme, language, and security settings
 */
export interface UserPreferences {
  /** UI theme preference */
  theme: 'light' | 'dark' | 'system';
  
  /** User's preferred language */
  language: string;
  
  /** Notification settings */
  notifications: {
    enabled: boolean;
    types: string[];
  };
  
  /** Biometric authentication preference */
  biometricPreference: 'always' | 'optional' | 'never';
  
  /** Offline access capability */
  offlineAccess: boolean;
}

/**
 * Enhanced user interface with mobile-specific fields
 * Extends BaseEntity for consistent data tracking
 */
export interface User extends BaseEntity {
  /** User's email address */
  email: string;
  
  /** User's assigned role */
  role: UserRole;
  
  /** MFA status flag */
  mfaEnabled: boolean;
  
  /** Biometric authentication status */
  biometricEnabled: boolean;
  
  /** User preferences */
  preferences: UserPreferences;
  
  /** Unique device identifier */
  deviceId: string;
  
  /** Last login device information */
  lastLoginDevice: string;
}

/**
 * Authentication tokens with secure storage configuration
 */
export interface AuthTokens {
  /** JWT access token */
  accessToken: string;
  
  /** JWT refresh token */
  refreshToken: string;
  
  /** Token expiration time in seconds */
  expiresIn: number;
  
  /** Token type (usually 'Bearer') */
  tokenType: string;
  
  /** Indicates if tokens are stored in Android Keystore */
  secureStorage: boolean;
}

/**
 * Biometric authentication status
 */
export type BiometricStatus = 
  | 'available'    // Biometric hardware ready and enrolled
  | 'unavailable'  // Biometric authentication not available
  | 'checking'     // Checking biometric capability
  | 'notEnrolled'  // No biometric data enrolled
  | 'noHardware';  // Device lacks biometric hardware

/**
 * Biometric authentication error types
 */
export type BiometricError = 
  | 'AUTH_FAILED'      // Authentication attempt failed
  | 'USER_CANCELED'    // User canceled authentication
  | 'SYSTEM_CANCELED'  // System canceled authentication
  | 'TIMEOUT'          // Authentication timed out
  | 'HARDWARE_ERROR'   // Biometric hardware error
  | 'LOCKOUT'          // Too many failed attempts
  | 'UNKNOWN';         // Unknown error occurred

/**
 * Biometric authentication result
 */
export interface BiometricAuthResult {
  /** Authentication success status */
  success: boolean;
  
  /** Error information if authentication failed */
  error?: BiometricError;
  
  /** Timestamp of authentication attempt */
  timestamp: number;
}

/**
 * Authentication state for the application
 */
export interface AuthState {
  /** Current authentication status */
  isAuthenticated: boolean;
  
  /** Authenticated user information */
  user: User | null;
  
  /** Authentication tokens */
  tokens: AuthTokens | null;
  
  /** Loading state for authentication operations */
  loading: boolean;
  
  /** Current biometric authentication status */
  biometricStatus: BiometricStatus;
  
  /** Offline access capability status */
  offlineAccess: boolean;
}