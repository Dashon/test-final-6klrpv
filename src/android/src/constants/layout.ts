// @version 1.0.0
// External imports from react-native v0.71.x
import { Dimensions, Platform, StatusBar } from 'react-native';

// Screen breakpoints in pixels
export enum Breakpoints {
  MOBILE = 320,
  TABLET = 768,
  DESKTOP = 1024
}

// Base spacing units following 8-point grid system
export const Spacing = {
  BASE_UNIT: 4, // Base unit for spacing calculations
  GRID: 8, // Standard grid unit (2x base unit)
  xs: 4,   // Extra small spacing
  sm: 8,   // Small spacing
  md: 16,  // Medium spacing
  lg: 24,  // Large spacing
  xl: 32   // Extra large spacing
} as const;

// Minimum touch target size for accessibility (48x48dp)
const MINIMUM_TOUCH_TARGET = 48;

// Memoized status bar height calculation
let cachedStatusBarHeight: number | null = null;
const getStatusBarHeight = (): number => {
  if (cachedStatusBarHeight !== null) {
    return cachedStatusBarHeight;
  }

  if (Platform.OS === 'android') {
    const statusBarHeight = StatusBar.currentHeight || 0;
    // Add extra padding for devices with notch
    const hasNotch = StatusBar.currentHeight ? StatusBar.currentHeight > 24 : false;
    cachedStatusBarHeight = hasNotch ? statusBarHeight + 8 : statusBarHeight;
    return cachedStatusBarHeight;
  }

  return 0; // Fallback for unexpected cases
};

// Screen dimension handling with orientation support
type ScreenDimensions = {
  width: number;
  height: number;
};

let cachedDimensions: ScreenDimensions | null = null;
export const getScreenDimensions = (): ScreenDimensions => {
  if (cachedDimensions !== null) {
    return cachedDimensions;
  }

  const { width, height } = Dimensions.get('screen');
  cachedDimensions = { width, height };

  // Add dimension change listener
  Dimensions.addEventListener('change', ({ screen }) => {
    cachedDimensions = {
      width: screen.width,
      height: screen.height
    };
  });

  return cachedDimensions;
};

// Common layout measurements and safe areas
export const Layout = {
  HEADER_HEIGHT: 56, // Standard Android app bar height
  BOTTOM_NAV_HEIGHT: 56, // Standard bottom navigation height
  CARD_BORDER_RADIUS: 8, // Following 8-point grid
  BUTTON_HEIGHT: Math.max(MINIMUM_TOUCH_TARGET, 48), // Ensuring minimum touch target
  INPUT_HEIGHT: 48, // Standard input field height
  SAFE_AREA_TOP: getStatusBarHeight(),
  SAFE_AREA_BOTTOM: 16 // Default bottom safe area padding
} as const;

// Version tracking for maintenance
export const LAYOUT_VERSION = '1.0.0';

// Type definitions for better TypeScript support
export type SpacingType = typeof Spacing;
export type LayoutType = typeof Layout;
export type BreakpointType = keyof typeof Breakpoints;

// Utility type for responsive values
export type ResponsiveValue<T> = {
  [K in BreakpointType]?: T;
} & {
  base: T;
};

// Export a type-safe way to access spacing values
export const getSpacing = (multiplier: number = 1): number => {
  return Spacing.GRID * multiplier;
};

// Ensure layout constants are frozen to prevent modifications
Object.freeze(Spacing);
Object.freeze(Layout);
Object.freeze(Breakpoints);