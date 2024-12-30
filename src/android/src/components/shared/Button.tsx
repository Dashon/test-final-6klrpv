/**
 * @file Button.tsx
 * @version 1.0.0
 * 
 * A reusable Material Design button component for Android with enhanced
 * accessibility, responsive sizing, and platform-specific touch feedback.
 * Implements WCAG 2.1 Level AA compliance.
 * 
 * @requires react v18.x
 * @requires react-native v0.71.x
 */

import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Pressable,
  ViewStyle,
  TextStyle,
  Platform
} from 'react-native';
import { colors } from '../../constants/colors';
import AndroidRipple from './AndroidRipple';
import { getResponsiveSize } from '../../utils/responsive';

/**
 * Props interface for Button component with comprehensive configuration options
 */
interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  labelStyle?: TextStyle;
  accessibilityLabel?: string;
  testID?: string;
  rippleColor?: string;
  elevation?: number;
}

/**
 * Calculates button colors based on variant and state
 */
const getButtonColors = (
  variant: ButtonProps['variant'] = 'primary',
  disabled: boolean,
  loading: boolean
) => {
  const baseColors = {
    primary: {
      background: colors.primary.default,
      text: colors.text.inverse,
      ripple: colors.primary.dark
    },
    secondary: {
      background: colors.secondary.default,
      text: colors.text.inverse,
      ripple: colors.secondary.dark
    },
    outline: {
      background: 'transparent',
      text: colors.primary.default,
      border: colors.primary.default,
      ripple: colors.primary.surface
    }
  };

  const selectedColors = baseColors[variant];

  if (disabled || loading) {
    return {
      ...selectedColors,
      background: variant === 'outline' ? 'transparent' : colors.background.tertiary,
      text: colors.text.disabled,
      border: variant === 'outline' ? colors.text.disabled : undefined,
      ripple: colors.background.tertiary
    };
  }

  return selectedColors;
};

/**
 * Calculates responsive button dimensions based on screen size and state
 */
const getButtonDimensions = (style?: ViewStyle, loading?: boolean): ViewStyle => {
  const baseHeight = getResponsiveSize(48); // Minimum touch target size
  const basePadding = getResponsiveSize(16);
  const baseMinWidth = loading ? getResponsiveSize(80) : getResponsiveSize(64);

  return {
    height: style?.height || baseHeight,
    paddingHorizontal: style?.paddingHorizontal || basePadding,
    minWidth: style?.minWidth || baseMinWidth
  };
};

/**
 * Button Component
 * 
 * A production-ready button implementation featuring:
 * - Material Design styling and animations
 * - WCAG 2.1 Level AA compliance
 * - Responsive sizing
 * - Loading states
 * - Platform-specific touch feedback
 */
const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  labelStyle,
  accessibilityLabel,
  testID,
  rippleColor,
  elevation = 2
}) => {
  // Calculate colors based on variant and state
  const buttonColors = useMemo(
    () => getButtonColors(variant, disabled, loading),
    [variant, disabled, loading]
  );

  // Calculate responsive dimensions
  const buttonDimensions = useMemo(
    () => getButtonDimensions(style, loading),
    [style, loading]
  );

  // Combine styles
  const containerStyle = [
    styles.container,
    {
      backgroundColor: buttonColors.background,
      borderColor: buttonColors.border,
      borderWidth: buttonColors.border ? 1 : 0,
      elevation: disabled ? 0 : elevation
    },
    buttonDimensions,
    disabled && styles.disabled,
    loading && styles.loading,
    style
  ];

  const textStyle = [
    styles.label,
    {
      color: buttonColors.text
    },
    labelStyle
  ];

  return (
    <AndroidRipple
      onPress={loading ? undefined : onPress}
      disabled={disabled || loading}
      color={rippleColor || buttonColors.ripple}
      accessible={true}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityRole="button"
      accessibilityState={{
        disabled: disabled || loading,
        busy: loading
      }}
      style={containerStyle}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            color={buttonColors.text}
            size="small"
            testID={`${testID}-loading`}
          />
        ) : (
          <Text
            style={textStyle}
            numberOfLines={1}
            testID={testID}
            allowFontScaling={false}
          >
            {label}
          </Text>
        )}
      </View>
    </AndroidRipple>
  );
};

/**
 * Optimized styles with static typing
 */
const styles = StyleSheet.create({
  container: {
    minHeight: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    elevation: 2,
    overflow: 'hidden'
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  label: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    textAlign: 'center',
    includeFontPadding: false
  },
  disabled: {
    opacity: 0.5,
    elevation: 0
  },
  loading: {
    opacity: 0.8,
    minWidth: 80
  }
});

export default Button;