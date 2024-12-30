/**
 * @fileoverview Authentication and authorization type definitions for the AI-Enhanced Social Travel Platform
 * @module web/types/auth
 * @version 1.0.0
 */

import { BaseEntity } from '../../backend/shared/interfaces/base.interface';

/**
 * Enumeration of available user roles in the system
 * Supports role-based access control (RBAC)
 */
export enum UserRole {
  USER = 'USER',
  PROFESSIONAL = 'PROFESSIONAL',
  ADMIN = 'ADMIN'
}

/**
 * Interface for notification preferences within user settings
 */
export interface NotificationPreferences {
  /** Email notification settings */
  email: {
    marketing: boolean;
    bookingUpdates: boolean;
    securityAlerts: boolean;
    chatMessages: boolean;
  };
  /** Push notification settings */
  push: {
    chatMessages: boolean;
    bookingReminders: boolean;
    promotionalOffers: boolean;
  };
  /** In-app notification settings */
  inApp: {
    mentions: boolean;
    replies: boolean;
    systemUpdates: boolean;
  };
}

/**
 * Interface for user customization preferences
 */
export interface UserPreferences {
  /** UI theme preference */
  theme: 'light' | 'dark' | 'system';
  /** Application language */
  language: string;
  /** Notification configuration */
  notifications: NotificationPreferences;
  /** Accessibility settings */
  accessibility?: {
    fontSize: number;
    highContrast: boolean;
    reduceMotion: boolean;
  };
}

/**
 * Comprehensive user interface extending BaseEntity
 * Includes authentication and profile information
 */
export interface User extends BaseEntity {
  /** User's email address (unique identifier) */
  email: string;
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /** User's assigned role */
  role: UserRole;
  /** MFA enablement status */
  mfaEnabled: boolean;
  /** Timestamp of last successful login */
  lastLogin: Date;
  /** User preferences and settings */
  preferences: UserPreferences;
  /** Profile completion percentage */
  profileCompletion?: number;
  /** Account verification status */
  verified: boolean;
  /** Social login providers linked to account */
  linkedProviders?: string[];
}

/**
 * Interface for login request credentials
 */
export interface LoginCredentials {
  /** User's email */
  email: string;
  /** User's password */
  password: string;
  /** Optional MFA verification code */
  mfaCode?: string;
  /** Remember me flag for extended session */
  rememberMe?: boolean;
}

/**
 * Interface for user registration data
 */
export interface RegisterData {
  /** User's email */
  email: string;
  /** User's password */
  password: string;
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /** Terms and conditions acceptance */
  acceptedTerms: boolean;
  /** Marketing communications opt-in */
  marketingConsent?: boolean;
  /** Initial role selection for professionals */
  requestedRole?: UserRole;
}

/**
 * Interface for authentication state management
 */
export interface AuthState {
  /** Currently authenticated user */
  user: User | null;
  /** JWT access token */
  accessToken: string | null;
  /** JWT refresh token */
  refreshToken: string | null;
  /** Authentication status */
  isAuthenticated: boolean;
  /** Loading state for async operations */
  loading: boolean;
  /** Error message if authentication fails */
  error: string | null;
  /** MFA verification required flag */
  mfaRequired?: boolean;
  /** Session expiry timestamp */
  sessionExpiry?: Date;
}

/**
 * Interface for MFA setup response
 */
export interface MFASetupResponse {
  /** QR code for authenticator app */
  qrCode: string;
  /** Secret key for manual entry */
  secret: string;
  /** Backup recovery keys */
  recoveryKeys: string[];
  /** Setup verification status */
  verified: boolean;
}

/**
 * Interface for password reset request
 */
export interface PasswordResetRequest {
  /** User's email */
  email: string;
  /** Reset token from email */
  token?: string;
  /** New password */
  newPassword?: string;
  /** Password confirmation */
  confirmPassword?: string;
}

/**
 * Interface for session management
 */
export interface SessionInfo {
  /** Session ID */
  id: string;
  /** Device information */
  device: {
    type: string;
    browser: string;
    os: string;
  };
  /** IP address */
  ipAddress: string;
  /** Session start timestamp */
  startedAt: Date;
  /** Last activity timestamp */
  lastActivity: Date;
  /** Session expiry timestamp */
  expiresAt: Date;
}

/**
 * Type for permission levels within roles
 */
export type Permission = 'read' | 'write' | 'delete' | 'admin';

/**
 * Interface for role-based permissions
 */
export interface RolePermissions {
  /** Role identifier */
  role: UserRole;
  /** Granted permissions */
  permissions: Permission[];
  /** Resource restrictions */
  restrictions?: {
    maxBookings?: number;
    maxPersonas?: number;
    maxChatRooms?: number;
  };
}

/**
 * Type guard to check if user has required permission
 */
export const hasPermission = (
  user: User,
  requiredPermission: Permission
): boolean => {
  const rolePermissions: Record<UserRole, Permission[]> = {
    [UserRole.USER]: ['read', 'write'],
    [UserRole.PROFESSIONAL]: ['read', 'write', 'delete'],
    [UserRole.ADMIN]: ['read', 'write', 'delete', 'admin']
  };
  return rolePermissions[user.role]?.includes(requiredPermission) ?? false;
};