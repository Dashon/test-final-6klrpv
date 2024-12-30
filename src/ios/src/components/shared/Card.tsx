/**
 * @fileoverview Reusable card component with theme support and responsive spacing
 * Implements design system specifications for elevation, borders and spacing
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import { StyleSheet, View, ViewProps, ViewStyle, useColorScheme } from 'react-native'; // v0.71.x
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/layout';
import { getResponsiveSpacing } from '../../utils/responsive';

/**
 * Props interface for Card component extending ViewProps
 */
interface CardProps extends ViewProps {
  /** Content to be rendered inside the card container */
  children: React.ReactNode;
  /** Shadow elevation level (1-5) affecting shadow intensity and spread */
  elevation?: number;
  /** Flag to disable default padding, useful for custom content layouts */
  noPadding?: boolean;
  /** Additional styles to merge with default card styling */
  style?: ViewStyle;
}

/**
 * Generates iOS-specific shadow styles based on elevation level with theme awareness
 * @param elevation - Shadow elevation level (1-5)
 * @param colorScheme - Current color scheme (light/dark)
 * @returns Platform-specific shadow style object
 */
const getElevationStyle = (elevation: number, colorScheme: 'light' | 'dark'): ViewStyle => {
  // Normalize elevation to 1-5 range
  const normalizedElevation = Math.max(1, Math.min(5, elevation));
  
  // Calculate shadow properties based on elevation
  const shadowOpacity = colorScheme === 'dark' 
    ? 0.1 + (normalizedElevation * 0.04) 
    : 0.2 + (normalizedElevation * 0.02);
  
  const shadowRadius = normalizedElevation * 2;
  const shadowOffset = {
    width: 0,
    height: normalizedElevation,
  };

  return {
    shadowColor: colorScheme === 'dark' ? '#000000' : '#222222',
    shadowOffset,
    shadowOpacity,
    shadowRadius,
  };
};

/**
 * Card component providing a themed container with elevation and responsive spacing
 */
export const Card: React.FC<CardProps> = ({ 
  children, 
  elevation = 1,
  noPadding = false,
  style,
  ...props 
}) => {
  // Get current color scheme for theme-aware styling
  const colorScheme = useColorScheme() ?? 'light';

  // Memoize elevation styles to prevent recalculation
  const elevationStyle = useMemo(() => 
    getElevationStyle(elevation, colorScheme),
    [elevation, colorScheme]
  );

  // Calculate container styles based on theme
  const containerStyle = useMemo(() => ({
    ...styles.container,
    backgroundColor: colorScheme === 'dark' 
      ? colors.background.dark.primary 
      : colors.background.primary,
    borderColor: colorScheme === 'dark'
      ? colors.border.dark.default
      : colors.border.default,
  }), [colorScheme]);

  // Calculate padding if enabled
  const paddingStyle = !noPadding ? {
    padding: getResponsiveSpacing(spacing.medium / 4), // Convert to grid units
  } : undefined;

  return (
    <View
      {...props}
      style={[
        containerStyle,
        elevationStyle,
        paddingStyle,
        style,
      ]}
      accessible={true}
      accessibilityRole="none"
    >
      {children}
    </View>
  );
};

/**
 * Default styles for Card component
 */
const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden', // Ensure content respects border radius
  },
});

export default Card;
```

This implementation:

1. Provides a fully typed Card component with proper TypeScript interfaces and documentation.
2. Implements theme-aware styling with dark mode support using useColorScheme.
3. Uses the design system's color constants for consistent theming.
4. Implements responsive spacing using the getResponsiveSpacing utility.
5. Provides customizable elevation with iOS-specific shadow calculations.
6. Includes proper accessibility support for VoiceOver.
7. Uses performance optimizations with useMemo for style calculations.
8. Follows the 8-point grid system for spacing and layout.
9. Provides flexible styling options through style prop composition.
10. Implements proper border handling with overflow control.

The component can be used like this:
```typescript
<Card elevation={2}>
  <Text>Basic card with default padding</Text>
</Card>

<Card elevation={3} noPadding style={{ marginTop: spacing.medium }}>
  <CustomContent />
</Card>