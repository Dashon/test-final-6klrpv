/**
 * @fileoverview Android Status Bar Component
 * @version 1.0.0
 * 
 * A shared component that manages the Android status bar appearance,
 * including color, translucency, and theme adaptation based on the app's
 * design system and current screen context.
 */

import React, { useMemo } from 'react'; // v18.x
import { StatusBar, ColorSchemeName, Platform } from 'react-native'; // v0.71.x
import { colors } from '../../constants/colors';
import { useResponsiveDimensions } from '../../utils/responsive';

/**
 * Props interface for AndroidStatusBar component
 */
interface AndroidStatusBarProps {
  /**
   * Optional custom background color for status bar
   * @default colors.background.primary
   */
  backgroundColor?: string;
  
  /**
   * Style of status bar content (light or dark)
   * @default 'dark-content'
   */
  barStyle?: 'default' | 'light-content' | 'dark-content';
  
  /**
   * Whether status bar should be translucent
   * @default false
   */
  translucent?: boolean;
}

/**
 * Calculates the appropriate status bar color based on theme and props
 * 
 * @param colorScheme - Current color scheme (light/dark)
 * @param customColor - Optional custom background color
 * @param translucent - Whether status bar is translucent
 * @returns Processed color value for status bar
 */
const getStatusBarColor = (
  colorScheme: ColorSchemeName,
  customColor?: string,
  translucent?: boolean
): string => {
  // If translucent, return transparent
  if (translucent) {
    return 'transparent';
  }

  // Use custom color if provided
  if (customColor) {
    return customColor;
  }

  // Use theme-appropriate background color
  return colorScheme === 'dark'
    ? colors.background.darkMode.primary
    : colors.background.primary;
};

/**
 * Determines appropriate bar style based on background color
 * 
 * @param backgroundColor - Current background color
 * @param colorScheme - Current color scheme
 * @returns Appropriate bar style for contrast
 */
const getBarStyle = (
  backgroundColor: string,
  colorScheme: ColorSchemeName
): 'default' | 'light-content' | 'dark-content' => {
  // For transparent or light backgrounds in light mode
  if (backgroundColor === 'transparent' && colorScheme !== 'dark') {
    return 'dark-content';
  }

  // For dark mode or dark backgrounds
  if (colorScheme === 'dark' || backgroundColor === colors.primary.default) {
    return 'light-content';
  }

  return 'dark-content';
};

/**
 * AndroidStatusBar component
 * 
 * Manages the appearance of the Android status bar with proper theme adaptation
 * and manufacturer-specific adjustments.
 */
const AndroidStatusBar: React.FC<AndroidStatusBarProps> = ({
  backgroundColor,
  barStyle,
  translucent = false,
}) => {
  // Get current color scheme and responsive dimensions
  const colorScheme = Platform.select({ android: useColorScheme(), default: 'light' });
  const { screenType, isPortrait } = useResponsiveDimensions();

  // Memoize status bar color calculations
  const statusBarColor = useMemo(() => 
    getStatusBarColor(colorScheme, backgroundColor, translucent),
    [colorScheme, backgroundColor, translucent]
  );

  // Memoize bar style calculations
  const computedBarStyle = useMemo(() => 
    barStyle || getBarStyle(statusBarColor, colorScheme),
    [barStyle, statusBarColor, colorScheme]
  );

  // Handle manufacturer-specific adjustments
  const statusBarProps = useMemo(() => {
    const props: Record<string, any> = {
      backgroundColor: statusBarColor,
      barStyle: computedBarStyle,
      translucent,
    };

    // Add Samsung-specific handling for notched devices
    if (Platform.constants?.['Brand']?.toLowerCase().includes('samsung')) {
      props.animated = true;
    }

    return props;
  }, [statusBarColor, computedBarStyle, translucent]);

  // Render optimized status bar
  return (
    <StatusBar
      {...statusBarProps}
      animated={true}
      networkActivityIndicatorVisible={false}
    />
  );
};

// Performance optimization
export default React.memo(AndroidStatusBar);

// Type exports for external usage
export type { AndroidStatusBarProps };