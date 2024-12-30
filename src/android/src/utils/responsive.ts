/**
 * @file Responsive utilities for Android application
 * @version 1.0.0
 * 
 * Provides responsive utility functions and hooks for handling device dimensions,
 * screen scaling, and responsive layouts with optimized performance and cross-device
 * compatibility.
 */

import { Dimensions, PixelRatio, Platform, useWindowDimensions } from 'react-native'; // v0.71.x
import { Breakpoints, Spacing } from '../constants/layout';
import { useMemo, useEffect, useCallback } from 'react';

// Constants for performance optimization
const RESPONSIVE_VERSION = '1.0.0';
const DIMENSION_UPDATE_THROTTLE = 16; // ~60fps
const CACHE_DURATION = 1000; // 1 second cache

// Cache storage for responsive calculations
interface CacheEntry {
  value: number;
  timestamp: number;
}

const responsiveCache = new Map<string, CacheEntry>();

/**
 * Cleans expired entries from the responsive calculations cache
 */
const cleanCache = (): void => {
  const now = Date.now();
  responsiveCache.forEach((entry, key) => {
    if (now - entry.timestamp > CACHE_DURATION) {
      responsiveCache.delete(key);
    }
  });
};

/**
 * Calculates responsive size with pixel ratio scaling and performance optimization
 * 
 * @param baseSize - Base size in dp
 * @param minSize - Minimum size constraint
 * @param maxSize - Maximum size constraint
 * @param shouldScalePixel - Whether to apply pixel ratio scaling
 * @returns Calculated and scaled responsive size value
 */
export const getResponsiveSize = (
  baseSize: number,
  minSize: number = 0,
  maxSize: number = Number.MAX_SAFE_INTEGER,
  shouldScalePixel: boolean = true
): number => {
  const cacheKey = `size_${baseSize}_${minSize}_${maxSize}_${shouldScalePixel}`;
  const cached = responsiveCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.value;
  }

  const { width } = Dimensions.get('window');
  let scaleFactor = 1;

  // Calculate scale factor based on screen width
  if (width <= Breakpoints.MOBILE) {
    scaleFactor = width / Breakpoints.MOBILE;
  } else if (width <= Breakpoints.TABLET) {
    scaleFactor = 1 + ((width - Breakpoints.MOBILE) / (Breakpoints.TABLET - Breakpoints.MOBILE)) * 0.2;
  } else {
    scaleFactor = 1.2 + ((width - Breakpoints.TABLET) / (Breakpoints.DESKTOP - Breakpoints.TABLET)) * 0.1;
  }

  let size = baseSize * scaleFactor;

  // Apply pixel ratio scaling if needed
  if (shouldScalePixel) {
    size = PixelRatio.roundToNearestPixel(size);
  }

  // Clamp size between min and max
  const finalSize = Math.min(Math.max(size, minSize), maxSize);

  // Cache the calculated value
  responsiveCache.set(cacheKey, {
    value: finalSize,
    timestamp: Date.now()
  });

  return finalSize;
};

/**
 * Calculates grid-based spacing with pixel density compensation
 * 
 * @param multiplier - Grid unit multiplier
 * @param shouldScalePixel - Whether to apply pixel ratio scaling
 * @returns Calculated spacing value with pixel ratio adjustment
 */
export const getResponsiveSpacing = (
  multiplier: number,
  shouldScalePixel: boolean = true
): number => {
  const cacheKey = `spacing_${multiplier}_${shouldScalePixel}`;
  const cached = responsiveCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.value;
  }

  const baseSpacing = Spacing.GRID * multiplier;
  let finalSpacing = baseSpacing;

  if (shouldScalePixel) {
    finalSpacing = PixelRatio.roundToNearestPixel(baseSpacing);
  }

  // Cache the calculated value
  responsiveCache.set(cacheKey, {
    value: finalSpacing,
    timestamp: Date.now()
  });

  return finalSpacing;
};

/**
 * Determines current screen type with orientation consideration
 * 
 * @returns Screen type identifier
 */
const getScreenType = (width: number, height: number): 'mobile' | 'tablet' | 'desktop' => {
  const isPortrait = height > width;
  const screenWidth = isPortrait ? width : height;

  if (screenWidth < Breakpoints.MOBILE) return 'mobile';
  if (screenWidth < Breakpoints.TABLET) return 'tablet';
  return 'desktop';
};

/**
 * Memoized hook providing responsive dimensions with orientation detection
 * 
 * @returns Object containing responsive dimension information
 */
export const useResponsiveDimensions = () => {
  const { width, height } = useWindowDimensions();
  
  const dimensions = useMemo(() => {
    const isPortrait = height > width;
    const screenType = getScreenType(width, height);
    const pixelRatio = PixelRatio.get();
    const scale = width / Breakpoints.MOBILE;

    return {
      width,
      height,
      screenType,
      isPortrait,
      pixelRatio,
      scale
    };
  }, [width, height]);

  // Clean cache periodically
  useEffect(() => {
    const cleanupInterval = setInterval(cleanCache, CACHE_DURATION);
    return () => clearInterval(cleanupInterval);
  }, []);

  return dimensions;
};

// Type definitions for better TypeScript support
export type ResponsiveDimensions = ReturnType<typeof useResponsiveDimensions>;

// Freeze version for runtime checks
Object.freeze(RESPONSIVE_VERSION);