/**
 * @file Card.tsx
 * @version 1.0.0
 * 
 * A reusable card component for Android that provides a consistent container
 * with elevation, borders, and spacing following the design system specifications.
 * Implements platform-specific optimizations and responsive behavior.
 */

import React from 'react'; // v18.x
import {
  StyleSheet,
  View,
  ViewProps,
  Platform,
  Pressable,
} from 'react-native'; // v0.71.x

import { colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { getResponsiveSpacing } from '../../utils/responsive';

/**
 * Props interface for the Card component extending ViewProps
 */
export interface CardProps extends ViewProps {
  children: React.ReactNode;
  elevation?: number;
  noPadding?: boolean;
  borderRadius?: number;
  testID?: string;
  isLoading?: boolean;
  onPress?: () => void;
}

/**
 * Card component providing a consistent container with elevation and spacing
 */
export const Card = React.memo<CardProps>(({
  children,
  elevation = 2,
  noPadding = false,
  borderRadius,
  style,
  testID = 'card',
  isLoading = false,
  onPress,
  ...props
}) => {
  // Calculate responsive padding based on screen size
  const padding = noPadding ? 0 : getResponsiveSpacing(2);

  // Generate platform-specific elevation styles
  const elevationStyle = Platform.select({
    android: {
      elevation,
      shadowColor: colors.border.default,
    },
    default: {}, // Fallback for other platforms
  });

  // Combine all styles
  const containerStyle = [
    styles.container,
    elevationStyle,
    {
      padding,
      borderRadius: borderRadius ?? Layout.CARD_BORDER_RADIUS,
    },
    isLoading && styles.loadingSkeleton,
    style,
  ];

  // Render card content with proper accessibility
  const renderContent = () => (
    <View
      testID={testID}
      accessibilityRole="none"
      {...props}
      style={containerStyle}
    >
      {children}
    </View>
  );

  // Handle interactive card with onPress
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        android_ripple={{
          color: colors.interaction.pressed,
          borderless: false,
        }}
        disabled={isLoading}
        accessibilityRole="button"
      >
        {renderContent()}
      </Pressable>
    );
  }

  return renderContent();
});

// Display name for debugging
Card.displayName = 'Card';

/**
 * Styles for the Card component following design system specifications
 */
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: Layout.CARD_BORDER_RADIUS,
    borderWidth: Platform.select({
      android: 0,
      default: 1,
    }),
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  loadingSkeleton: {
    opacity: 0.7,
    backgroundColor: colors.background.secondary,
  },
});

export default Card;
```

This implementation includes:

1. Proper TypeScript types and interfaces for props and style definitions
2. Platform-specific optimizations for elevation and shadows
3. Responsive spacing calculations using the provided utility
4. Support for loading states and interactive cards
5. Proper accessibility attributes and roles
6. Memoization for performance optimization
7. Consistent styling following the design system specifications
8. Support for custom styling through style prop
9. Proper ripple effect for Android touch feedback
10. Comprehensive JSDoc documentation

The component follows all the requirements from the technical specification and implements the design system guidelines for cards. It's built to be highly reusable and maintainable while providing optimal performance on Android devices.

Key features:
- Customizable elevation and border radius
- Optional padding control
- Loading state support
- Interactive capability with proper touch feedback
- Responsive spacing based on screen size
- Platform-specific optimizations
- Proper accessibility implementation
- TypeScript support with proper type definitions

The component can be used in various ways as shown in the usage examples from the specification:

```typescript
// Basic usage
<Card>
  <Text>Basic Card</Text>
</Card>

// Elevated card
<Card elevation={4}>
  <Text>Elevated Card</Text>
</Card>

// Card without padding
<Card noPadding>
  <CustomContent />
</Card>

// Loading state
<Card isLoading>
  <Text>Loading Card</Text>
</Card>

// Interactive card
<Card onPress={() => handlePress()}>
  <Text>Clickable Card</Text>
</Card>