/**
 * @fileoverview A reusable loading spinner component for iOS
 * Implements design system loading state specifications with accessibility support
 * @version 1.0.0
 */

import React from 'react'; // v18.x
import { 
  ActivityIndicator, 
  StyleSheet, 
  ViewStyle 
} from 'react-native'; // v0.71.x
import { colors } from '../constants/colors';
import { spacing } from '../constants/layout';

/**
 * Props interface for the LoadingSpinner component
 */
interface LoadingSpinnerProps {
  /** Size of the spinner - follows iOS native sizes */
  size?: 'small' | 'large';
  /** Custom color for the spinner */
  color?: string;
  /** Additional styles to apply to the container */
  style?: ViewStyle;
  /** Test ID for automated testing */
  testID?: string;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
}

/**
 * A performance-optimized loading spinner component that provides visual feedback
 * during asynchronous operations.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <LoadingSpinner />
 * 
 * // Custom size and color
 * <LoadingSpinner size="large" color={colors.secondary.default} />
 * 
 * // With custom styles
 * <LoadingSpinner style={customStyles.spinner} />
 * ```
 */
export const LoadingSpinner = React.memo<LoadingSpinnerProps>(({
  size = 'small',
  color = colors.primary.default,
  style,
  testID = 'loading-spinner',
  accessibilityLabel = 'Loading'
}) => {
  return (
    <ActivityIndicator
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      size={size}
      color={color}
      style={[styles.container, style]}
    />
  );
});

// Set display name for debugging purposes
LoadingSpinner.displayName = 'LoadingSpinner';

/**
 * Styles optimized with StyleSheet.create for better performance
 * Following 8-point grid system from layout constants
 */
const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.medium,
    minHeight: 48, // Ensures minimum tappable area
  }
});

/**
 * Default export for convenient importing
 */
export default LoadingSpinner;