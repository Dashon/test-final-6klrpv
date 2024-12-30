/**
 * Responsive design utility functions with type safety and performance optimizations
 * Implements breakpoint checks and responsive value calculations
 * @version 1.0.0
 */

import { breakpoints } from '../constants/theme';

// Constants for default values and performance optimization
const DEFAULT_MOBILE_VALUE = null;
const DEFAULT_TABLET_VALUE = null;
const DEFAULT_DESKTOP_VALUE = null;
const VIEWPORT_UPDATE_DEBOUNCE_MS = 150;

/**
 * Type definition for responsive configuration object
 * Allows specifying different values for each breakpoint
 */
export interface ResponsiveConfig<T> {
  mobile?: T;
  tablet?: T;
  desktop?: T;
}

/**
 * Type guard to validate width parameter
 * @param width - Viewport width to validate
 */
const isValidWidth = (width: number): boolean => {
  return typeof width === 'number' && width > 0 && Number.isFinite(width);
};

/**
 * Checks if the provided width falls within mobile breakpoint range
 * @param width - Viewport width to check
 * @throws {Error} If width is invalid
 * @returns {boolean} True if width is within mobile breakpoint range
 */
export const isMobile = (width: number): boolean => {
  if (!isValidWidth(width)) {
    throw new Error('Invalid width parameter provided to isMobile');
  }
  return width < breakpoints.mobile;
};

/**
 * Checks if the provided width falls within tablet breakpoint range
 * @param width - Viewport width to check
 * @throws {Error} If width is invalid
 * @returns {boolean} True if width is within tablet breakpoint range
 */
export const isTablet = (width: number): boolean => {
  if (!isValidWidth(width)) {
    throw new Error('Invalid width parameter provided to isTablet');
  }
  return width >= breakpoints.mobile && width < breakpoints.tablet;
};

/**
 * Checks if the provided width falls within desktop breakpoint range
 * @param width - Viewport width to check
 * @throws {Error} If width is invalid
 * @returns {boolean} True if width is within desktop breakpoint range
 */
export const isDesktop = (width: number): boolean => {
  if (!isValidWidth(width)) {
    throw new Error('Invalid width parameter provided to isDesktop');
  }
  return width >= breakpoints.desktop;
};

/**
 * Performance-optimized memoization decorator
 * Caches results based on stringified arguments
 */
function memoize<T extends Function>(target: T): T {
  const cache = new Map();

  return function (...args: any[]) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = target.apply(this, args);
    cache.set(key, result);
    return result;
  } as unknown as T;
}

/**
 * Gets the current viewport width with debouncing
 * @returns {number} Current viewport width
 */
const getCurrentViewportWidth = (() => {
  let cachedWidth: number | null = null;
  let debounceTimeout: NodeJS.Timeout | null = null;

  return (): number => {
    if (typeof window === 'undefined') {
      return breakpoints.desktop; // Default to desktop for SSR
    }

    if (cachedWidth !== null) {
      return cachedWidth;
    }

    const updateWidth = () => {
      cachedWidth = window.innerWidth;
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      debounceTimeout = setTimeout(() => {
        cachedWidth = null;
      }, VIEWPORT_UPDATE_DEBOUNCE_MS);
    };

    updateWidth();
    return cachedWidth as number;
  };
})();

/**
 * Returns appropriate value based on current viewport width
 * Implements performance optimizations and type safety
 * @param config - Responsive configuration object
 * @throws {Error} If configuration is invalid
 * @returns {T} Appropriate value for current viewport width
 */
export const getResponsiveValue = memoize(<T>(config: ResponsiveConfig<T>): T => {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid responsive configuration provided');
  }

  const width = getCurrentViewportWidth();

  try {
    if (isMobile(width) && config.mobile !== undefined) {
      return config.mobile;
    }

    if (isTablet(width) && config.tablet !== undefined) {
      return config.tablet;
    }

    if (isDesktop(width) && config.desktop !== undefined) {
      return config.desktop;
    }

    // Fallback logic for missing breakpoint values
    return (
      config.desktop ??
      config.tablet ??
      config.mobile ??
      DEFAULT_DESKTOP_VALUE ??
      DEFAULT_TABLET_VALUE ??
      DEFAULT_MOBILE_VALUE
    ) as T;
  } catch (error) {
    console.error('Error in getResponsiveValue:', error);
    throw new Error('Failed to calculate responsive value');
  }
});

/**
 * Type guard to check if a value implements ResponsiveConfig
 * @param value - Value to check
 * @returns {boolean} True if value implements ResponsiveConfig
 */
export const isResponsiveConfig = <T>(value: any): value is ResponsiveConfig<T> => {
  return (
    value !== null &&
    typeof value === 'object' &&
    ('mobile' in value || 'tablet' in value || 'desktop' in value)
  );
};