import { Platform } from 'react-native';

/**
 * Typography System Version 1.0.0
 * Implements WCAG 2.1 Level AA compliant typography system for iOS
 * @version 1.0.0
 */

// Global constants
export const TYPOGRAPHY_VERSION = '1.0.0';
export const MIN_ACCESSIBLE_FONT_SIZE = 12;
export const MAX_FONT_SCALE = 3.0;

/**
 * Platform-optimized font families with fallbacks
 * Primary: Roboto for UI elements
 * Heading: Playfair Display for headings
 */
export const fontFamilies = {
  primary: {
    regular: Platform.select({
      ios: 'Roboto-Regular',
      default: 'System',
    }),
    bold: Platform.select({
      ios: 'Roboto-Bold',
      default: 'System-Bold',
    }),
  },
  heading: {
    regular: Platform.select({
      ios: 'PlayfairDisplay-Regular',
      default: 'System',
    }),
    bold: Platform.select({
      ios: 'PlayfairDisplay-Bold',
      default: 'System-Bold',
    }),
  },
};

/**
 * Accessibility-aware font size scale
 * Follows 8-point grid system with minimum size constraints
 */
export const fontSizes = {
  xs: 12, // Minimum accessible size
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

/**
 * Platform-specific font weights
 * iOS uses specific font files for different weights
 */
export const fontWeights = {
  regular: Platform.select({
    ios: '400',
    default: 'normal',
  }),
  bold: Platform.select({
    ios: '700',
    default: 'bold',
  }),
};

/**
 * Memoized font size scaling function
 * Ensures WCAG 2.1 compliance with minimum sizes and proper scaling
 */
export const getScaledFontSize = (() => {
  const cache = new Map();

  return (baseFontSize: number, options: { enforceMinimum?: boolean } = {}): number => {
    const cacheKey = `${baseFontSize}-${JSON.stringify(options)}`;
    
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const { enforceMinimum = true } = options;
    let scaledSize = baseFontSize;

    // Apply minimum size constraint if enabled
    if (enforceMinimum) {
      scaledSize = Math.max(scaledSize, MIN_ACCESSIBLE_FONT_SIZE);
    }

    // Apply maximum scale limit
    scaledSize = Math.min(scaledSize * MAX_FONT_SCALE, baseFontSize * MAX_FONT_SCALE);

    // Round to nearest pixel for iOS
    scaledSize = Math.round(scaledSize);

    cache.set(cacheKey, scaledSize);
    return scaledSize;
  };
})();

/**
 * WCAG 2.1 Level AA compliant text styles
 * Implements consistent typography across the application
 */
export const textStyles = {
  h1: {
    fontFamily: fontFamilies.heading.bold,
    fontSize: getScaledFontSize(fontSizes.xxl),
    fontWeight: fontWeights.bold,
    lineHeight: Math.round(fontSizes.xxl * 1.3), // 130% line height for readability
    letterSpacing: Platform.select({
      ios: 0.35,
      default: 0,
    }),
  },
  h2: {
    fontFamily: fontFamilies.heading.bold,
    fontSize: getScaledFontSize(fontSizes.xl),
    fontWeight: fontWeights.bold,
    lineHeight: Math.round(fontSizes.xl * 1.3),
    letterSpacing: Platform.select({
      ios: 0.25,
      default: 0,
    }),
  },
  h3: {
    fontFamily: fontFamilies.heading.regular,
    fontSize: getScaledFontSize(fontSizes.lg),
    fontWeight: fontWeights.regular,
    lineHeight: Math.round(fontSizes.lg * 1.3),
    letterSpacing: Platform.select({
      ios: 0.15,
      default: 0,
    }),
  },
  body: {
    fontFamily: fontFamilies.primary.regular,
    fontSize: getScaledFontSize(fontSizes.md),
    fontWeight: fontWeights.regular,
    lineHeight: Math.round(fontSizes.md * 1.5), // 150% line height for body text
    letterSpacing: Platform.select({
      ios: 0.5,
      default: 0,
    }),
  },
  caption: {
    fontFamily: fontFamilies.primary.regular,
    fontSize: getScaledFontSize(fontSizes.sm),
    fontWeight: fontWeights.regular,
    lineHeight: Math.round(fontSizes.sm * 1.4), // 140% line height for captions
    letterSpacing: Platform.select({
      ios: 0.4,
      default: 0,
    }),
  },
};

// Type definitions for exported constants
export type FontFamily = keyof typeof fontFamilies;
export type FontSize = keyof typeof fontSizes;
export type FontWeight = keyof typeof fontWeights;
export type TextStyle = keyof typeof textStyles;

/**
 * @example
 * import { textStyles, getScaledFontSize } from './typography';
 * 
 * // Using predefined text styles
 * const styles = StyleSheet.create({
 *   title: {
 *     ...textStyles.h1,
 *   },
 *   content: {
 *     ...textStyles.body,
 *   },
 * });
 * 
 * // Custom scaled font size
 * const customSize = getScaledFontSize(18);
 */