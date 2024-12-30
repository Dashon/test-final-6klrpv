/**
 * @fileoverview Core color system for iOS application
 * Implements design system color specifications with platform-specific values
 * Supports light/dark modes and accessibility requirements
 * @version 1.0.0
 */

/**
 * Primary color palette with variants
 */
const primary = {
  default: '#1A73E8',
  light: '#4285F4',
  dark: '#1557B0',
  contrast: '#FFFFFF',
} as const;

/**
 * Secondary color palette with variants
 */
const secondary = {
  default: '#34A853',
  light: '#46B966',
  dark: '#2D8B47',
  contrast: '#FFFFFF',
} as const;

/**
 * Background colors for different surface levels
 * Includes dark mode variants
 */
const background = {
  primary: '#FFFFFF',
  secondary: '#F8F9FA',
  tertiary: '#F1F3F4',
  dark: {
    primary: '#121212',
    secondary: '#1E1E1E',
    tertiary: '#2D2D2D',
  },
} as const;

/**
 * Text colors with semantic meanings
 * Includes dark mode variants
 */
const text = {
  primary: '#202124',
  secondary: '#5F6368',
  disabled: '#9AA0A6',
  dark: {
    primary: '#FFFFFF',
    secondary: '#E8EAED',
    disabled: '#9AA0A6',
  },
} as const;

/**
 * Error state colors with variants
 */
const error = {
  default: '#D93025',
  light: '#EA4335',
  dark: '#B31412',
  background: '#FDE7E7',
} as const;

/**
 * Success state colors with variants
 */
const success = {
  default: '#188038',
  light: '#34A853',
  dark: '#137333',
  background: '#E6F4EA',
} as const;

/**
 * Warning state colors with variants
 */
const warning = {
  default: '#F9AB00',
  light: '#FBBC04',
  dark: '#F29900',
  background: '#FEF7E0',
} as const;

/**
 * Border colors with interactive states
 * Includes dark mode variants
 */
const border = {
  default: '#DADCE0',
  focus: '#1A73E8',
  error: '#D93025',
  dark: {
    default: '#5F6368',
    focus: '#4285F4',
    error: '#EA4335',
  },
} as const;

/**
 * Overlay colors with different opacity levels
 */
const overlay = {
  light: 'rgba(32, 33, 36, 0.4)',
  medium: 'rgba(32, 33, 36, 0.6)',
  dark: 'rgba(32, 33, 36, 0.8)',
} as const;

/**
 * Complete color system object
 * All colors are readonly to prevent accidental modifications
 */
export const colors = {
  primary,
  secondary,
  background,
  text,
  error,
  success,
  warning,
  border,
  overlay,
} as const;

/**
 * Type definitions for the color system
 * Enables TypeScript support with proper typing
 */
export type Colors = typeof colors;
export type ColorKey = keyof typeof colors;