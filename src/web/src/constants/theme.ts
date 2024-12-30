/**
 * Core theme constants and configuration for the AI-Enhanced Social Travel Platform
 * Implements comprehensive design system tokens with TypeScript type safety
 * @version 1.0.0
 */

/**
 * Color palette constants including brand colors, semantic colors, and variations
 * Uses HSL values for better color manipulation and accessibility
 */
export const colors = {
  // Brand Colors
  primary: '#1A73E8', // Blue
  primaryLight: '#4285F4',
  primaryDark: '#0D47A1',
  secondary: '#34A853', // Green
  secondaryLight: '#4CAF50',
  secondaryDark: '#1B5E20',

  // Background Colors
  backgroundPrimary: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',

  // Text Colors
  textPrimary: '#202124',
  textSecondary: '#5F6368',

  // Semantic Colors
  error: '#D93025',
  errorLight: '#F44336',
  success: '#0F9D58',
  successLight: '#4CAF50',
  warning: '#F4B400',
  warningLight: '#FFC107',
} as const;

/**
 * Typography system constants including font families, weights, sizes, and line heights
 * Implements system font fallbacks for optimal performance and consistency
 */
export const typography = {
  // Font Families
  fontFamilyUI: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  fontFamilyHeadings: "'Playfair Display', Georgia, serif",

  // Base Typography
  baseFontSize: '16px',
  baseLineHeight: '1.5',

  // Font Weights
  fontWeightLight: 300,
  fontWeightNormal: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,

  // Font Sizes
  fontSizeH1: '2.5rem', // 40px
  fontSizeH2: '2rem',   // 32px
  fontSizeH3: '1.5rem', // 24px
  fontSizeBody: '1rem', // 16px
  fontSizeSmall: '0.875rem', // 14px
} as const;

/**
 * 8-point grid spacing system constants
 * Provides consistent spacing across components and layouts
 */
export const spacing = {
  base: 4, // Base unit in pixels
  xxs: 4,  // 4px
  xs: 8,   // 8px
  sm: 16,  // 16px
  md: 24,  // 24px
  lg: 32,  // 32px
  xl: 48,  // 48px
  xxl: 64, // 64px
} as const;

/**
 * Responsive breakpoint constants
 * Defines screen size thresholds for responsive design
 */
export const breakpoints = {
  mobile: 320,      // Mobile devices
  tablet: 768,      // Tablet devices
  desktop: 1024,    // Desktop screens
  desktopLarge: 1440, // Large desktop screens
} as const;

/**
 * Box shadow constants for different elevation levels
 * Uses rgba values for better browser compatibility
 */
export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
} as const;

/**
 * Animation transition constants
 * Defines durations and easing functions for consistent animations
 */
export const transitions = {
  fast: '150ms',
  default: '300ms',
  slow: '500ms',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
} as const;

// Type definitions for theme objects
export type Colors = typeof colors;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type Breakpoints = typeof breakpoints;
export type Shadows = typeof shadows;
export type Transitions = typeof transitions;

/**
 * Combined theme object for use with styled-components or other styling solutions
 */
export const theme = {
  colors,
  typography,
  spacing,
  breakpoints,
  shadows,
  transitions,
} as const;

export type Theme = typeof theme;

export default theme;