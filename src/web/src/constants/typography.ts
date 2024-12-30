/**
 * @file Typography constants and text styles for the web application
 * @version 1.0.0
 * 
 * Implements the design system's typography specifications with web-specific
 * font families, sizes, weights, line heights and other typographic properties
 * while ensuring WCAG 2.1 Level AA compliance.
 */

/**
 * Interface defining font family configurations
 */
export interface FontFamilies {
  primary: {
    regular: string;
    bold: string;
  };
  heading: {
    regular: string;
    bold: string;
  };
}

/**
 * Font family definitions with comprehensive fallbacks for maximum compatibility
 * Primary: Roboto for UI elements
 * Heading: Playfair Display for headings
 */
export const fontFamilies: FontFamilies = {
  primary: {
    regular: "'Roboto', -apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    bold: "'Roboto', -apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
  },
  heading: {
    regular: "'Playfair Display', Georgia, 'Times New Roman', Times, serif",
    bold: "'Playfair Display', Georgia, 'Times New Roman', Times, serif"
  }
};

/**
 * Interface defining font size scale
 */
export interface FontSizes {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

/**
 * Font size scale using rem units for better accessibility and responsive scaling
 * Base size (md) is 1rem = 16px in most browsers
 */
export const fontSizes: FontSizes = {
  xs: '0.75rem',   // 12px
  sm: '0.875rem',  // 14px
  md: '1rem',      // 16px
  lg: '1.25rem',   // 20px
  xl: '1.5rem',    // 24px
  xxl: '2rem'      // 32px
};

/**
 * Font weight constants following standard numerical values
 */
export const fontWeights = {
  regular: 400,
  bold: 700
};

/**
 * Line height scale for optimal readability
 * Values follow WCAG 2.1 Level AA guidelines for text spacing
 */
export const lineHeights = {
  xs: 1.25,   // Compact
  sm: 1.375,  // Tight
  md: 1.5,    // Normal body text
  lg: 1.625,  // Relaxed
  xl: 1.75,   // Loose
  xxl: 2      // Extra loose for large headings
};

/**
 * Letter spacing (tracking) values for fine-tuning text legibility
 * Values in em units
 */
export const letterSpacing = {
  tight: -0.05,
  normal: 0,
  wide: 0.05
};

/**
 * Interface defining complete text style combinations
 */
export interface TextStyle {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
}

/**
 * Predefined text style combinations following the design system
 * Each style is optimized for its specific use case while maintaining
 * WCAG 2.1 Level AA compliance
 */
export const textStyles: Record<string, TextStyle> = {
  h1: {
    fontFamily: fontFamilies.heading.bold,
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.xxl,
    letterSpacing: letterSpacing.tight
  },
  h2: {
    fontFamily: fontFamilies.heading.bold,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.xl,
    letterSpacing: letterSpacing.tight
  },
  h3: {
    fontFamily: fontFamilies.heading.bold,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.lg,
    letterSpacing: letterSpacing.normal
  },
  body: {
    fontFamily: fontFamilies.primary.regular,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.md,
    letterSpacing: letterSpacing.normal
  },
  caption: {
    fontFamily: fontFamilies.primary.regular,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.sm,
    letterSpacing: letterSpacing.normal
  }
};