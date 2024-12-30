/**
 * @fileoverview Core layout constants and dimensions for iOS application
 * Layout system based on 4px base unit and 8-point grid with responsive scaling
 * @version 1.0.0
 */

import { Dimensions } from 'react-native'; // v0.71.x

// Global constants for layout calculations
const BASE_SPACING = 4;
const GRID_UNIT = 8;
const MIN_SCALING_FACTOR = 0.8;
const MAX_SCALING_FACTOR = 1.2;

/**
 * Breakpoints for responsive design
 * Follows standard iOS device width ranges
 */
export const breakpoints = {
  mobile: 320,   // iPhone SE and similar
  tablet: 768,   // iPad Mini and similar
  desktop: 1024  // iPad Pro and larger devices
} as const;

/**
 * Spacing system based on 8-point grid
 * Values are multipliers of the base 4px unit
 */
export const spacing = {
  base: BASE_SPACING,      // 4px
  small: GRID_UNIT,       // 8px
  medium: GRID_UNIT * 2,  // 16px
  large: GRID_UNIT * 3,   // 24px
  extraLarge: GRID_UNIT * 4 // 32px
} as const;

/**
 * Device dimensions and layout information
 * Provides real-time access to screen dimensions and device characteristics
 */
export const dimensions = {
  screenWidth: Dimensions.get('window').width,
  screenHeight: Dimensions.get('window').height,
  isSmallDevice: Dimensions.get('window').width < breakpoints.tablet,
  safeAreaInsets: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  }
} as const;

/**
 * Container padding values for different screen sizes
 * Ensures consistent content margins across devices
 */
export const containerPadding = {
  mobile: spacing.medium,    // 16px
  tablet: spacing.large,     // 24px
  desktop: spacing.extraLarge // 32px
} as const;

/**
 * Maximum content width constraints
 * Prevents content from becoming too wide on large screens
 */
export const maxContentWidth = {
  mobile: '100%',
  tablet: 720,
  desktop: 1200
} as const;

// Cache for scaled spacing calculations
const spacingCache = new Map<string, number>();

/**
 * Calculates scaled spacing value based on screen size
 * @param baseSpacing - Base spacing value to scale
 * @param shouldClamp - Whether to apply min/max scaling boundaries
 * @returns Scaled spacing value
 */
export const getScaledSpacing = (baseSpacing: number, shouldClamp: boolean = true): number => {
  const cacheKey = `${baseSpacing}-${shouldClamp}`;
  
  if (spacingCache.has(cacheKey)) {
    return spacingCache.get(cacheKey)!;
  }

  const { screenWidth } = dimensions;
  let scaleFactor = screenWidth / breakpoints.tablet;

  if (shouldClamp) {
    scaleFactor = Math.max(MIN_SCALING_FACTOR, 
                          Math.min(MAX_SCALING_FACTOR, scaleFactor));
  }

  const scaledValue = Math.round(baseSpacing * scaleFactor);
  spacingCache.set(cacheKey, scaledValue);
  
  return scaledValue;
};

/**
 * Returns appropriate value based on current screen size
 * @param values - Object containing values for different breakpoints
 * @returns Value corresponding to current screen width
 */
export const getResponsiveValue = <T>(values: {
  mobile?: T;
  tablet?: T;
  desktop?: T;
}): T => {
  const { screenWidth } = dimensions;

  if (screenWidth >= breakpoints.desktop) {
    return values.desktop || values.tablet || values.mobile!;
  }

  if (screenWidth >= breakpoints.tablet) {
    return values.tablet || values.mobile!;
  }

  return values.mobile!;
};

// Listen for dimension changes and update cached values
Dimensions.addEventListener('change', () => {
  spacingCache.clear();
  
  // Update dimensions object
  Object.assign(dimensions, {
    screenWidth: Dimensions.get('window').width,
    screenHeight: Dimensions.get('window').height,
    isSmallDevice: Dimensions.get('window').width < breakpoints.tablet
  });
});