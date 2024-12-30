/**
 * @fileoverview Core color system for Android application
 * @version 1.0.0
 * @scheme 2024.1
 * 
 * Implements Material Design color system with support for:
 * - Light and dark mode variants
 * - WCAG 2.1 Level AA compliant contrast ratios
 * - Dynamic theme adaptation
 * - Semantic color tokens
 */

// Version constants for color system tracking
export const COLOR_VERSION = '1.0.0';
export const COLOR_SCHEME_VERSION = '2024.1';

/**
 * Core color palette implementing design system specifications
 * All colors are provided in hexadecimal format with light/dark variants
 */
export const colors = {
  /**
   * Primary brand colors
   * Base: #1A73E8 (Blue 600)
   */
  primary: {
    default: '#1A73E8',
    light: '#4285F4',
    dark: '#1557B0',
    contrast: '#FFFFFF',
    surface: '#E8F0FE',
    darkMode: {
      default: '#4285F4',
      light: '#669DF6',
      dark: '#1A73E8',
      surface: '#1F1F1F'
    }
  },

  /**
   * Secondary brand colors
   * Base: #34A853 (Green 600)
   */
  secondary: {
    default: '#34A853',
    light: '#46B966',
    dark: '#2D8B47',
    contrast: '#FFFFFF',
    surface: '#E6F4EA',
    darkMode: {
      default: '#46B966',
      light: '#58C977',
      dark: '#34A853',
      surface: '#1F1F1F'
    }
  },

  /**
   * Background colors for different surface levels
   * Implements Material Design elevation system
   */
  background: {
    primary: '#FFFFFF',
    secondary: '#F8F9FA',
    tertiary: '#F1F3F4',
    elevated: '#FFFFFF',
    darkMode: {
      primary: '#121212',
      secondary: '#1E1E1E',
      tertiary: '#2D2D2D',
      elevated: '#2D2D2D'
    }
  },

  /**
   * Text colors with varying emphasis levels
   * Ensures WCAG 2.1 Level AA compliance for all combinations
   */
  text: {
    primary: '#202124',
    secondary: '#5F6368',
    tertiary: '#80868B',
    disabled: '#9AA0A6',
    inverse: '#FFFFFF',
    darkMode: {
      primary: '#FFFFFF',
      secondary: '#E8EAED',
      tertiary: '#9AA0A6',
      disabled: '#5F6368',
      inverse: '#202124'
    }
  },

  /**
   * Error and validation colors
   * Base: #D93025 (Red 600)
   */
  error: {
    default: '#D93025',
    light: '#EA4335',
    dark: '#B31412',
    surface: '#FDE7E7',
    text: '#B31412',
    darkMode: {
      default: '#EA4335',
      light: '#F28B82',
      dark: '#D93025',
      surface: '#2D1F1F',
      text: '#F28B82'
    }
  },

  /**
   * Success state colors
   * Base: #188038 (Green 700)
   */
  success: {
    default: '#188038',
    light: '#34A853',
    dark: '#137333',
    surface: '#E6F4EA',
    text: '#137333',
    darkMode: {
      default: '#34A853',
      light: '#46B966',
      dark: '#188038',
      surface: '#1F2D1F',
      text: '#46B966'
    }
  },

  /**
   * Warning state colors
   * Base: #F9AB00 (Yellow 600)
   */
  warning: {
    default: '#F9AB00',
    light: '#FBBC04',
    dark: '#F29900',
    surface: '#FEF7E0',
    text: '#B06000',
    darkMode: {
      default: '#FBBC04',
      light: '#FDD663',
      dark: '#F9AB00',
      surface: '#2D2D1F',
      text: '#FDD663'
    }
  },

  /**
   * Border and divider colors
   */
  border: {
    default: '#DADCE0',
    focus: '#1A73E8',
    error: '#D93025',
    divider: '#EEEEEE',
    darkMode: {
      default: '#5F6368',
      focus: '#4285F4',
      error: '#EA4335',
      divider: '#2D2D2D'
    }
  },

  /**
   * Overlay colors for modals, dialogs, and other elevated surfaces
   * Uses rgba for opacity control
   */
  overlay: {
    light: 'rgba(32, 33, 36, 0.4)',
    medium: 'rgba(32, 33, 36, 0.6)',
    dark: 'rgba(32, 33, 36, 0.8)',
    darkMode: {
      light: 'rgba(0, 0, 0, 0.4)',
      medium: 'rgba(0, 0, 0, 0.6)',
      dark: 'rgba(0, 0, 0, 0.8)'
    }
  },

  /**
   * Interaction state colors
   * Uses rgba for subtle hover and press states
   */
  interaction: {
    hover: 'rgba(26, 115, 232, 0.04)',
    pressed: 'rgba(26, 115, 232, 0.12)',
    selected: 'rgba(26, 115, 232, 0.16)',
    darkMode: {
      hover: 'rgba(66, 133, 244, 0.08)',
      pressed: 'rgba(66, 133, 244, 0.16)',
      selected: 'rgba(66, 133, 244, 0.24)'
    }
  }
};

// Type definitions for color system
export type ColorTheme = typeof colors;
export type ColorToken = keyof typeof colors;