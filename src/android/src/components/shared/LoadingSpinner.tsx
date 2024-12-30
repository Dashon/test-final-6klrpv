/**
 * @fileoverview Reusable loading spinner component for Android
 * @version 1.0.0
 * 
 * Implements a theme-aware loading spinner with accessibility support
 * and configurable display modes (inline/fullscreen).
 */

import React from 'react'; // v18.x
import {
  ActivityIndicator,
  StyleSheet,
  View,
  useColorScheme,
  type ColorSchemeName
} from 'react-native'; // v0.71.x
import { colors } from '../constants/colors';
import { Spacing } from '../constants/layout';

/**
 * Props interface for the LoadingSpinner component
 */
interface LoadingSpinnerProps {
  /** Size of the loading spinner */
  size?: 'small' | 'large';
  /** Custom color override for the spinner */
  color?: string;
  /** Whether to display in fullscreen mode */
  fullscreen?: boolean;
  /** Custom accessibility label for TalkBack */
  accessibilityLabel?: string;
}

/**
 * A reusable loading spinner component that provides visual feedback
 * during asynchronous operations with theme and accessibility support.
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'small',
  color,
  fullscreen = false,
  accessibilityLabel = 'Loading'
}) => {
  // Get current color scheme for theme-aware rendering
  const colorScheme: ColorSchemeName = useColorScheme();

  // Determine spinner color based on props or theme
  const spinnerColor = color || colors.primary[colorScheme === 'dark' ? 'darkMode' : 'default'];

  // Determine background color for fullscreen mode
  const backgroundColor = colors.background[
    colorScheme === 'dark' ? 'darkMode' : 'primary'
  ];

  return (
    <View
      style={[
        styles.container,
        fullscreen && [
          styles.fullscreenContainer,
          { backgroundColor }
        ]
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility="yes"
    >
      <ActivityIndicator
        size={size}
        color={spinnerColor}
        accessibilityElementsHidden={false}
        importantForAccessibility="yes"
      />
    </View>
  );
};

/**
 * Styles for the LoadingSpinner component
 */
const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.9,
    zIndex: 999,
    elevation: 5 // Android-specific elevation for overlay effect
  }
});

// Export the component as the default export
export default LoadingSpinner;

// Type export for TypeScript support
export type { LoadingSpinnerProps };
```

This implementation includes several key features and considerations:

1. **Theme Support**:
- Uses `useColorScheme` hook to detect the device's color scheme
- Implements proper color handling for both light and dark modes
- Utilizes the design system's color tokens from the colors constant

2. **Accessibility**:
- Implements proper ARIA roles with `accessibilityRole="progressbar"`
- Provides customizable accessibility labels for TalkBack
- Sets appropriate importance levels for accessibility tree

3. **Performance**:
- Uses native `ActivityIndicator` for optimal performance
- Implements proper style memoization through StyleSheet.create
- Minimizes re-renders by using constant style objects

4. **Flexibility**:
- Supports both inline and fullscreen display modes
- Allows customization of size and color
- Provides proper TypeScript type definitions

5. **Platform Specifics**:
- Uses Android-specific elevation for overlay effect
- Implements proper z-indexing for fullscreen mode
- Follows Material Design guidelines for loading indicators

The component can be used in various ways:

```typescript
// Basic usage
<LoadingSpinner />

// Large spinner
<LoadingSpinner size="large" />

// Custom color
<LoadingSpinner color={colors.secondary.default} />

// Fullscreen overlay
<LoadingSpinner fullscreen />

// Custom accessibility label
<LoadingSpinner accessibilityLabel="Loading content" />