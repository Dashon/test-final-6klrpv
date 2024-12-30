import { Platform, PixelRatio, AccessibilityInfo, TextStyle } from 'react-native';

// Version tracking for the typography system
const TYPOGRAPHY_VERSION = '1.1.0';

// Font scaling bounds for accessibility
const MIN_FONT_SCALE = 0.85;
const MAX_FONT_SCALE = 2.5;

/**
 * Platform-optimized font families with fallbacks
 */
export const fontFamilies = {
  primary: {
    regular: Platform.select({
      android: 'Roboto-Regular',
      default: 'System',
    }),
    medium: Platform.select({
      android: 'Roboto-Medium',
      default: 'System-Medium',
    }),
    bold: Platform.select({
      android: 'Roboto-Bold',
      default: 'System-Bold',
    }),
  },
  heading: {
    regular: Platform.select({
      android: 'PlayfairDisplay-Regular',
      default: 'System',
    }),
    medium: Platform.select({
      android: 'PlayfairDisplay-Medium',
      default: 'System-Medium',
    }),
    bold: Platform.select({
      android: 'PlayfairDisplay-Bold',
      default: 'System-Bold',
    }),
  },
};

/**
 * Base font sizes following an 8pt scale
 */
export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

/**
 * Retrieves the current system font scale multiplier with enforced bounds
 * @returns {number} Bounded font scale multiplier
 */
const getFontScaleMultiplier = async (): Promise<number> => {
  const scale = await AccessibilityInfo.getRecommendedFontScale();
  return Math.min(Math.max(scale, MIN_FONT_SCALE), MAX_FONT_SCALE);
};

/**
 * Returns font size scaled according to device density and accessibility settings
 * @param {number} baseFontSize - Base font size to scale
 * @param {boolean} enforceAccessibilityBounds - Whether to enforce min/max bounds
 * @returns {number} Scaled and bounded font size value
 */
const getScaledFontSize = async (
  baseFontSize: number,
  enforceAccessibilityBounds: boolean = true
): Promise<number> => {
  const pixelRatio = PixelRatio.getFontScale();
  const accessibilityScale = enforceAccessibilityBounds 
    ? await getFontScaleMultiplier()
    : await AccessibilityInfo.getRecommendedFontScale();
    
  const scaledSize = baseFontSize * pixelRatio * accessibilityScale;
  
  return enforceAccessibilityBounds
    ? Math.min(Math.max(scaledSize, baseFontSize * MIN_FONT_SCALE), baseFontSize * MAX_FONT_SCALE)
    : scaledSize;
};

/**
 * Comprehensive text style presets with accessibility support
 */
export const textStyles: Record<string, TextStyle> = {
  h1: {
    fontFamily: fontFamilies.heading.bold,
    fontSize: fontSizes.xxl,
    lineHeight: fontSizes.xxl * 1.2,
    letterSpacing: -0.5,
    fontWeight: Platform.select({ android: undefined, default: '700' }),
  },
  h2: {
    fontFamily: fontFamilies.heading.bold,
    fontSize: fontSizes.xl,
    lineHeight: fontSizes.xl * 1.2,
    letterSpacing: -0.3,
    fontWeight: Platform.select({ android: undefined, default: '700' }),
  },
  h3: {
    fontFamily: fontFamilies.heading.medium,
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * 1.2,
    letterSpacing: -0.2,
    fontWeight: Platform.select({ android: undefined, default: '500' }),
  },
  body: {
    fontFamily: fontFamilies.primary.regular,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.5,
    letterSpacing: 0.15,
    fontWeight: Platform.select({ android: undefined, default: '400' }),
  },
  bodyBold: {
    fontFamily: fontFamilies.primary.bold,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.5,
    letterSpacing: 0.15,
    fontWeight: Platform.select({ android: undefined, default: '700' }),
  },
  caption: {
    fontFamily: fontFamilies.primary.regular,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.4,
    letterSpacing: 0.25,
    fontWeight: Platform.select({ android: undefined, default: '400' }),
  },
  button: {
    fontFamily: fontFamilies.primary.medium,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.25,
    letterSpacing: 0.5,
    fontWeight: Platform.select({ android: undefined, default: '500' }),
    textTransform: 'uppercase',
  },
};

// Export utility functions for external use
export { getScaledFontSize, getFontScaleMultiplier };

// Export version for dependency tracking
export { TYPOGRAPHY_VERSION };