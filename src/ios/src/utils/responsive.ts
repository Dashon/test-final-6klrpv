/**
 * @fileoverview Responsive utility functions for iOS application UI scaling
 * Implements responsive calculations based on 4px base unit and 8-point grid
 * with optimized performance through memoization
 * @version 1.0.0
 */

import { Dimensions, Platform, PixelRatio } from 'react-native'; // v0.71.x
import { breakpoints, dimensions } from '../constants/layout';

// Constants for scaling and grid calculations
const BASE_SCALE_FACTOR = 1;
const MIN_SCALE_FACTOR = 0.85;
const MAX_SCALE_FACTOR = 1.15;
const GRID_BASE_UNIT = 4;
const CACHE_DURATION_MS = 1000;

// Type definitions
type DeviceType = 'mobile' | 'tablet' | 'desktop';
type CacheEntry<T> = {
  value: T;
  timestamp: number;
};

// Cache implementations
const dimensionCache = new Map<string, CacheEntry<number>>();
const deviceTypeCache = new Map<string, CacheEntry<DeviceType>>();
const scaleFactorCache = new Map<string, CacheEntry<number>>();

/**
 * Cleans expired entries from caches
 * @param cache - Cache to clean
 */
const cleanCache = <T>(cache: Map<string, CacheEntry<T>>) => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_DURATION_MS) {
      cache.delete(key);
    }
  }
};

/**
 * Gets cached value or calculates new one
 * @param cache - Cache to use
 * @param key - Cache key
 * @param calculator - Function to calculate value if not cached
 * @returns Cached or calculated value
 */
const getCachedValue = <T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  calculator: () => T
): T => {
  const cached = cache.get(key);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
    return cached.value;
  }

  const value = calculator();
  cache.set(key, { value, timestamp: now });
  return value;
};

/**
 * Determines current device type with caching
 * @returns Current device type based on screen width
 */
export const getDeviceType = (): DeviceType => {
  return getCachedValue(
    deviceTypeCache,
    'deviceType',
    () => {
      const { screenWidth } = dimensions;
      if (screenWidth >= breakpoints.desktop) return 'desktop';
      if (screenWidth >= breakpoints.tablet) return 'tablet';
      return 'mobile';
    }
  );
};

/**
 * Calculates and caches scale factor based on device type
 * @returns Scale factor within bounds
 */
const getScaleFactor = (): number => {
  return getCachedValue(
    scaleFactorCache,
    'scaleFactor',
    () => {
      const deviceType = getDeviceType();
      const { screenWidth } = dimensions;
      let scaleFactor = BASE_SCALE_FACTOR;

      switch (deviceType) {
        case 'mobile':
          scaleFactor = screenWidth / breakpoints.mobile;
          break;
        case 'tablet':
          scaleFactor = screenWidth / breakpoints.tablet;
          break;
        case 'desktop':
          scaleFactor = screenWidth / breakpoints.desktop;
          break;
      }

      // Apply boundaries and adjust for pixel ratio
      const pixelRatio = PixelRatio.get();
      scaleFactor = Math.max(
        MIN_SCALE_FACTOR,
        Math.min(MAX_SCALE_FACTOR, scaleFactor * pixelRatio)
      );

      return scaleFactor;
    }
  );
};

/**
 * Calculates responsive width with caching and boundary checks
 * @param percentage - Width percentage (0-100)
 * @returns Calculated width in pixels
 */
export const getResponsiveWidth = (percentage: number): number => {
  const cacheKey = `width-${percentage}`;
  return getCachedValue(
    dimensionCache,
    cacheKey,
    () => {
      const { screenWidth } = dimensions;
      const scaleFactor = getScaleFactor();
      return Math.round((percentage / 100) * screenWidth * scaleFactor);
    }
  );
};

/**
 * Calculates responsive height with caching and boundary checks
 * @param percentage - Height percentage (0-100)
 * @returns Calculated height in pixels
 */
export const getResponsiveHeight = (percentage: number): number => {
  const cacheKey = `height-${percentage}`;
  return getCachedValue(
    dimensionCache,
    cacheKey,
    () => {
      const { screenHeight } = dimensions;
      const scaleFactor = getScaleFactor();
      return Math.round((percentage / 100) * screenHeight * scaleFactor);
    }
  );
};

/**
 * Calculates responsive spacing based on 8-point grid
 * @param multiplier - Grid multiplier
 * @returns Calculated spacing in pixels
 */
export const getResponsiveSpacing = (multiplier: number): number => {
  const cacheKey = `spacing-${multiplier}`;
  return getCachedValue(
    dimensionCache,
    cacheKey,
    () => {
      const scaleFactor = getScaleFactor();
      const baseSpacing = GRID_BASE_UNIT * multiplier;
      
      // Ensure spacing aligns with 8-point grid
      const scaledSpacing = baseSpacing * scaleFactor;
      return Math.round(scaledSpacing / 8) * 8;
    }
  );
};

// Listen for dimension changes
Dimensions.addEventListener('change', () => {
  // Clear all caches on dimension change
  dimensionCache.clear();
  deviceTypeCache.clear();
  scaleFactorCache.clear();
});

// Clean caches periodically
setInterval(() => {
  cleanCache(dimensionCache);
  cleanCache(deviceTypeCache);
  cleanCache(scaleFactorCache);
}, CACHE_DURATION_MS);