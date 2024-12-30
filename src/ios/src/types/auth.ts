/**
 * @fileoverview Authentication types and interfaces for iOS mobile application
 * @module ios/types/auth
 * @version 1.0.0
 * 
 * Implements OAuth 2.0 + JWT authentication with Auth0 integration
 * Auth0 SDK Version: 2.17.0
 */

import { BaseResponse, HttpStatus } from '../../../backend/shared/interfaces/base.interface';

/**
 * Enum representing user roles in the system
 * Maps to backend RBAC configuration
 */
export enum UserRole {
  USER = 'USER',
  PROFESSIONAL = 'PROFESSIONAL',
  ADMIN = 'ADMIN'
}

/**
 * Interface representing a user in the system
 * Contains core user data and security-related fields
 */
export interface User {
  /** Unique identifier (UUID v4) */
  id: string;
  
  /** User's email address (unique) */
  email: string;
  
  /** User's first name */
  firstName: string;
  
  /** User's last name */
  lastName: string;
  
  /** User's role for RBAC */
  role: UserRole;
  
  /** Account creation timestamp */
  createdAt: Date;
  
  /** Last account update timestamp */
  updatedAt: Date;
  
  /** Last successful login timestamp */
  lastLogin: Date | null;
  
  /** MFA enabled status */
  mfaEnabled: boolean;
}

/**
 * Interface for login request credentials
 * Supports standard and MFA-enabled login flows
 */
export interface LoginCredentials {
  /** User's email address */
  email: string;
  
  /** User's password (min 8 chars, requires complexity) */
  password: string;
  
  /** Optional MFA verification code */
  mfaCode: string | null;
}

/**
 * Interface for user registration credentials
 * Includes required fields for account creation
 */
export interface RegisterCredentials {
  /** User's email address */
  email: string;
  
  /** User's password (min 8 chars, requires complexity) */
  password: string;
  
  /** User's first name */
  firstName: string;
  
  /** User's last name */
  lastName: string;
  
  /** Selected user role */
  role: UserRole;
  
  /** Terms and conditions acceptance flag */
  acceptedTerms: boolean;
  
  /** MFA enrollment preference */
  enableMfa: boolean;
}

/**
 * Interface for successful authentication response
 * Includes JWT tokens and session information
 */
export interface AuthResponse {
  /** Authenticated user data */
  user: User;
  
  /** JWT access token */
  token: string;
  
  /** JWT refresh token for token renewal */
  refreshToken: string;
  
  /** Token expiration time in seconds */
  expiresIn: number;
}

/**
 * Interface for authentication state management
 * Used by auth context/store for session tracking
 */
export interface AuthState {
  /** Current authentication status */
  isAuthenticated: boolean;
  
  /** Current user data (null if not authenticated) */
  user: User | null;
  
  /** Loading state for async operations */
  loading: boolean;
  
  /** Current error state (null if no error) */
  error: AuthError | null;
  
  /** Timestamp of last user activity */
  lastActivity: Date;
}

/**
 * Interface for structured authentication errors
 * Maps to backend error handling system
 */
export interface AuthError {
  /** Error code for client-side handling */
  code: string;
  
  /** User-friendly error message */
  message: string;
  
  /** Additional error context/data */
  details: Record<string, any>;
}

/**
 * Type guard to check if a response is an AuthResponse
 */
export const isAuthResponse = (response: BaseResponse<unknown>): response is BaseResponse<AuthResponse> => {
  return response.success && 
         response.status === HttpStatus.OK && 
         'token' in response.data;
};

/**
 * Type guard to check if error is an AuthError
 */
export const isAuthError = (error: unknown): error is AuthError => {
  return typeof error === 'object' && 
         error !== null && 
         'code' in error && 
         'message' in error;
};