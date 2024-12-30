/**
 * @file Custom hook for responsive utilities in Android application
 * @version 1.0.0
 */

import { useWindowDimensions, Platform } from 'react-native'; // v0.71.x
import { useMemo, useCallback } from 'react';
import { Breakpoints } from '../constants/layout';
import { getResponsiveSize, getResponsiveSpacing } from '../utils/responsive';

/**
 * Interface defining the return type of useResponsive hook
 */
interface ResponsiveUtils {
  width: number;
  height: number;
  isPortrait: boolean;
  screenType: 'mobile' | 'tablet' | 'desktop';
  getResponsiveSize: (
    baseSize: number,
    minSize?: number,
    maxSize?: number,
    shouldScalePixel?: boolean
  ) => number;
  getResponsiveSpacing: (
    multiplier: number,
    shouldScalePixel?: boolean
  ) => number;
}

/**
 * Custom hook providing responsive utilities and dimensions with real-time updates
 * and memoized calculations for optimal performance.
 * 
 * @returns {ResponsiveUtils} Object containing responsive utilities and dimensions
 */
const useResponsive = (): ResponsiveUtils => {
  // Get current window dimensions with real-time updates
  const { width, height } = useWindowDimensions();

  // Memoize orientation calculation
  const isPortrait = useMemo(() => height > width, [width, height]);

  // Memoize screen type determination based on current dimensions
  const screenType = useMemo((): 'mobile' | 'tablet' | 'desktop' => {
    const screenWidth = isPortrait ? width : height;

    if (screenWidth < Breakpoints.MOBILE) {
      return 'mobile';
    } else if (screenWidth < Breakpoints.TABLET) {
      return 'tablet';
    }
    return 'desktop';
  }, [width, height, isPortrait]);

  // Memoize responsive size calculation function
  const memoizedGetResponsiveSize = useCallback(
    (
      baseSize: number,
      minSize: number = 0,
      maxSize: number = Number.MAX_SAFE_INTEGER,
      shouldScalePixel: boolean = true
    ): number => {
      return getResponsiveSize(baseSize, minSize, maxSize, shouldScalePixel);
    },
    []
  );

  // Memoize responsive spacing calculation function
  const memoizedGetResponsiveSpacing = useCallback(
    (multiplier: number, shouldScalePixel: boolean = true): number => {
      return getResponsiveSpacing(multiplier, shouldScalePixel);
    },
    []
  );

  // Return memoized responsive utilities and dimensions
  return useMemo(
    () => ({
      width,
      height,
      isPortrait,
      screenType,
      getResponsiveSize: memoizedGetResponsiveSize,
      getResponsiveSpacing: memoizedGetResponsiveSpacing,
    }),
    [
      width,
      height,
      isPortrait,
      screenType,
      memoizedGetResponsiveSize,
      memoizedGetResponsiveSpacing,
    ]
  );
};

// Type definition for external usage
export type UseResponsiveReturn = ReturnType<typeof useResponsive>;

// Default export of the hook
export default useResponsive;

/**
 * Usage example:
 * 
 * const {
 *   width,
 *   height,
 *   isPortrait,
 *   screenType,
 *   getResponsiveSize,
 *   getResponsiveSpacing
 * } = useResponsive();
 * 
 * const buttonSize = getResponsiveSize(48, 40, 60);
 * const padding = getResponsiveSpacing(2);
 */