/**
 * Tailwind CSS Configuration
 * Implements design system specifications with comprehensive theme customization
 * @version 1.0.0
 */

import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'
import forms from '@tailwindcss/forms' // v0.5.0
import typography from '@tailwindcss/typography' // v0.5.0
import { 
  colors, 
  typography as themeTypography, 
  spacing, 
  breakpoints, 
  shadows, 
  transitions 
} from '../constants/theme'

const config: Config = {
  // Content sources for style purging
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}'
  ],

  // Dark mode configuration
  darkMode: 'class',

  theme: {
    extend: {
      // Color system
      colors: {
        primary: {
          DEFAULT: colors.primary,
          light: colors.primaryLight,
          dark: colors.primaryDark,
        },
        secondary: {
          DEFAULT: colors.secondary,
          light: colors.secondaryLight,
          dark: colors.secondaryDark,
        },
        background: {
          primary: colors.backgroundPrimary,
          secondary: colors.backgroundSecondary,
        },
        text: {
          primary: colors.textPrimary,
          secondary: colors.textSecondary,
        },
        status: {
          error: colors.error,
          'error-light': colors.errorLight,
          success: colors.success,
          'success-light': colors.successLight,
          warning: colors.warning,
          'warning-light': colors.warningLight,
        }
      },

      // Typography system
      fontFamily: {
        sans: [
          'var(--font-family-ui)',
          ...defaultTheme.fontFamily.sans
        ],
        display: [
          'var(--font-family-headings)',
          ...defaultTheme.fontFamily.serif
        ],
      },

      fontSize: {
        'base': themeTypography.baseFontSize,
        'h1': themeTypography.fontSizeH1,
        'h2': themeTypography.fontSizeH2,
        'h3': themeTypography.fontSizeH3,
        'body': themeTypography.fontSizeBody,
        'small': themeTypography.fontSizeSmall,
      },

      fontWeight: {
        light: themeTypography.fontWeightLight,
        normal: themeTypography.fontWeightNormal,
        medium: themeTypography.fontWeightMedium,
        bold: themeTypography.fontWeightBold,
      },

      lineHeight: {
        base: themeTypography.baseLineHeight,
      },

      // Spacing system based on 8-point grid
      spacing: {
        'base': `${spacing.base}px`,
        'xxs': `${spacing.xxs}px`,
        'xs': `${spacing.xs}px`,
        'sm': `${spacing.sm}px`,
        'md': `${spacing.md}px`,
        'lg': `${spacing.lg}px`,
        'xl': `${spacing.xl}px`,
        'xxl': `${spacing.xxl}px`,
      },

      // Responsive breakpoints
      screens: {
        'mobile': `${breakpoints.mobile}px`,
        'tablet': `${breakpoints.tablet}px`,
        'desktop': `${breakpoints.desktop}px`,
        'desktop-large': `${breakpoints.desktopLarge}px`,
      },

      // Box shadows
      boxShadow: {
        'none': shadows.none,
        'sm': shadows.sm,
        'md': shadows.md,
        'lg': shadows.lg,
        'xl': shadows.xl,
        // Interactive states
        'focus': 'var(--shadow-focus)',
        'hover': 'var(--shadow-hover)',
        'active': 'var(--shadow-active)',
      },

      // Transitions and animations
      transitionDuration: {
        'fast': transitions.fast,
        'default': transitions.default,
        'slow': transitions.slow,
      },

      transitionTimingFunction: {
        'default': transitions.easeInOut,
        'in': transitions.easeIn,
        'out': transitions.easeOut,
      },
    },
  },

  // Plugins configuration
  plugins: [
    // Enhanced form input styling
    forms({
      strategy: 'class',
    }),
    // Prose text styling utilities
    typography({
      className: 'prose',
    }),
    // Custom plugin for component states
    function({ addUtilities }) {
      const stateUtilities = {
        '.state-hover': {
          '@apply hover:shadow-hover hover:brightness-105 transition-all duration-fast': {},
        },
        '.state-active': {
          '@apply active:shadow-active active:brightness-95 transition-all duration-fast': {},
        },
        '.state-disabled': {
          '@apply opacity-50 cursor-not-allowed pointer-events-none': {},
        },
        '.state-error': {
          '@apply border-status-error text-status-error': {},
        },
      }
      addUtilities(stateUtilities)
    },
  ],
}

export default config