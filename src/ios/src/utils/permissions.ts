/**
 * @fileoverview iOS device permissions management utility
 * @module ios/utils/permissions
 * @version 1.0.0
 * 
 * Implements secure permission handling for iOS device features with role-based access control,
 * caching, and comprehensive error handling.
 */

import { Platform } from 'react-native'; // v0.71.x
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions'; // v3.8.0
import AsyncStorage from '@react-native-async-storage/async-storage'; // v1.19.0
import { User, UserRole } from '../types/auth';

/**
 * Enum for supported permission types
 */
export enum PermissionType {
  CAMERA = 'camera',
  LOCATION = 'location',
  PHOTO_LIBRARY = 'photoLibrary',
  BIOMETRIC = 'biometric',
  NOTIFICATIONS = 'notifications'
}

/**
 * Enum for permission status values
 */
export enum PermissionStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  BLOCKED = 'blocked',
  UNAVAILABLE = 'unavailable'
}

/**
 * Custom error class for permission operations
 */
export class PermissionError extends Error {
  public code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'PermissionError';
  }
}

/**
 * Maps PermissionType to iOS-specific permission constants
 */
const PERMISSION_MAPPING: Record<PermissionType, any> = {
  [PermissionType.CAMERA]: PERMISSIONS.IOS.CAMERA,
  [PermissionType.LOCATION]: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
  [PermissionType.PHOTO_LIBRARY]: PERMISSIONS.IOS.PHOTO_LIBRARY,
  [PermissionType.BIOMETRIC]: PERMISSIONS.IOS.FACE_ID,
  [PermissionType.NOTIFICATIONS]: PERMISSIONS.IOS.NOTIFICATIONS
};

// Constants
const PERMISSION_CACHE_KEY = '@permissions_cache';
const MAX_REQUESTS_PER_HOUR = 5;
const CACHE_EXPIRY = 1000 * 60 * 60; // 1 hour

/**
 * Permission manager class for handling all permission-related operations
 */
export class PermissionManager {
  private permissionCache: Map<string, { status: PermissionStatus; timestamp: number }>;
  private requestCounts: Map<string, { count: number; resetTime: number }>;

  constructor() {
    this.permissionCache = new Map();
    this.requestCounts = new Map();
    this.initializeCache();
  }

  /**
   * Initialize permission cache from persistent storage
   */
  private async initializeCache(): Promise<void> {
    try {
      const cachedData = await AsyncStorage.getItem(PERMISSION_CACHE_KEY);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        Object.entries(parsed).forEach(([key, value]: [string, any]) => {
          this.permissionCache.set(key, value);
        });
      }
    } catch (error) {
      console.error('Failed to initialize permission cache:', error);
    }
  }

  /**
   * Validate user role has access to requested permission
   */
  private validateRoleAccess(permissionType: PermissionType, user: User): boolean {
    // Define role-based permission access
    const rolePermissions: Record<UserRole, PermissionType[]> = {
      [UserRole.USER]: [
        PermissionType.CAMERA,
        PermissionType.LOCATION,
        PermissionType.PHOTO_LIBRARY,
        PermissionType.NOTIFICATIONS
      ],
      [UserRole.PROFESSIONAL]: Object.values(PermissionType),
      [UserRole.ADMIN]: Object.values(PermissionType)
    };

    return rolePermissions[user.role]?.includes(permissionType) ?? false;
  }

  /**
   * Check if permission request is rate limited
   */
  private isRateLimited(permissionType: PermissionType): boolean {
    const now = Date.now();
    const requestInfo = this.requestCounts.get(permissionType);

    if (!requestInfo) {
      this.requestCounts.set(permissionType, { count: 1, resetTime: now + CACHE_EXPIRY });
      return false;
    }

    if (now > requestInfo.resetTime) {
      this.requestCounts.set(permissionType, { count: 1, resetTime: now + CACHE_EXPIRY });
      return false;
    }

    return requestInfo.count >= MAX_REQUESTS_PER_HOUR;
  }

  /**
   * Update permission cache
   */
  private async updateCache(permissionType: PermissionType, status: PermissionStatus): Promise<void> {
    const cacheData = { status, timestamp: Date.now() };
    this.permissionCache.set(permissionType, cacheData);

    try {
      const cacheObject = Object.fromEntries(this.permissionCache.entries());
      await AsyncStorage.setItem(PERMISSION_CACHE_KEY, JSON.stringify(cacheObject));
    } catch (error) {
      console.error('Failed to update permission cache:', error);
    }
  }

  /**
   * Check current permission status
   */
  public async checkPermission(permissionType: PermissionType, user: User): Promise<PermissionStatus> {
    if (!this.validateRoleAccess(permissionType, user)) {
      throw new PermissionError(
        'PERMISSION_DENIED',
        'User role does not have access to this permission'
      );
    }

    // Check cache first
    const cached = this.permissionCache.get(permissionType);
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
      return cached.status;
    }

    try {
      const permission = PERMISSION_MAPPING[permissionType];
      const result = await check(permission);

      // Map permission result to our status enum
      let status: PermissionStatus;
      switch (result) {
        case RESULTS.GRANTED:
          status = PermissionStatus.GRANTED;
          break;
        case RESULTS.DENIED:
          status = PermissionStatus.DENIED;
          break;
        case RESULTS.BLOCKED:
          status = PermissionStatus.BLOCKED;
          break;
        default:
          status = PermissionStatus.UNAVAILABLE;
      }

      await this.updateCache(permissionType, status);
      return status;
    } catch (error) {
      throw new PermissionError(
        'PERMISSION_CHECK_FAILED',
        `Failed to check ${permissionType} permission: ${error.message}`
      );
    }
  }

  /**
   * Request permission with rate limiting and error handling
   */
  public async requestPermission(permissionType: PermissionType, user: User): Promise<PermissionStatus> {
    if (!this.validateRoleAccess(permissionType, user)) {
      throw new PermissionError(
        'PERMISSION_DENIED',
        'User role does not have access to this permission'
      );
    }

    if (this.isRateLimited(permissionType)) {
      throw new PermissionError(
        'RATE_LIMIT_EXCEEDED',
        'Too many permission requests. Please try again later.'
      );
    }

    try {
      const permission = PERMISSION_MAPPING[permissionType];
      const result = await request(permission);

      // Update request count
      const requestInfo = this.requestCounts.get(permissionType);
      if (requestInfo) {
        requestInfo.count += 1;
      }

      // Map and cache result
      let status: PermissionStatus;
      switch (result) {
        case RESULTS.GRANTED:
          status = PermissionStatus.GRANTED;
          break;
        case RESULTS.DENIED:
          status = PermissionStatus.DENIED;
          break;
        case RESULTS.BLOCKED:
          status = PermissionStatus.BLOCKED;
          break;
        default:
          status = PermissionStatus.UNAVAILABLE;
      }

      await this.updateCache(permissionType, status);
      return status;
    } catch (error) {
      throw new PermissionError(
        'PERMISSION_REQUEST_FAILED',
        `Failed to request ${permissionType} permission: ${error.message}`
      );
    }
  }

  /**
   * Clear permission cache
   */
  public async clearCache(): Promise<void> {
    try {
      this.permissionCache.clear();
      this.requestCounts.clear();
      await AsyncStorage.removeItem(PERMISSION_CACHE_KEY);
    } catch (error) {
      throw new PermissionError(
        'CACHE_CLEAR_FAILED',
        `Failed to clear permission cache: ${error.message}`
      );
    }
  }
}

// Export singleton instance
export const permissionManager = new PermissionManager();