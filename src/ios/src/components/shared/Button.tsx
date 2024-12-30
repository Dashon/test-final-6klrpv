/**
 * @fileoverview Reusable button component for iOS platform
 * Implements design system specifications with WCAG 2.1 Level AA compliance
 * @version 1.0.0
 */

import React, { memo, useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native'; // v0.71.x

import { colors } from '../../constants/colors';
import { fontSizes } from '../../constants/typography';
import { getResponsiveSpacing } from '../../utils/responsive';

// Minimum touch target size for accessibility (44x44 points)
const MIN_TOUCH_TARGET = 44;

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel: string;
}

/**
 * Memoized style generator for button container
 */
const getButtonStyles = ({
  variant = 'primary',
  disabled = false,
  size = 'medium',
  fullWidth = false,
  loading = false,
}: Pick<ButtonProps, 'variant' | 'disabled' | 'size' | 'fullWidth' | 'loading'>) => {
  const baseStyles: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    opacity: disabled ? 0.5 : 1,
    borderRadius: getResponsiveSpacing(2),
  };

  // Size-specific padding
  const sizeStyles: Record<string, ViewStyle> = {
    small: {
      paddingVertical: getResponsiveSpacing(2),
      paddingHorizontal: getResponsiveSpacing(4),
    },
    medium: {
      paddingVertical: getResponsiveSpacing(3),
      paddingHorizontal: getResponsiveSpacing(6),
    },
    large: {
      paddingVertical: getResponsiveSpacing(4),
      paddingHorizontal: getResponsiveSpacing(8),
    },
  };

  // Variant-specific styles
  const variantStyles: Record<string, ViewStyle> = {
    primary: {
      backgroundColor: colors.primary.default,
    },
    secondary: {
      backgroundColor: colors.secondary.default,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.primary.default,
    },
    text: {
      backgroundColor: 'transparent',
    },
  };

  return StyleSheet.create({
    button: {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(fullWidth && { width: '100%' }),
      ...(loading && { opacity: 0.8 }),
    },
  });
};

/**
 * Memoized style generator for button text
 */
const getTextStyles = ({
  variant = 'primary',
  disabled = false,
  size = 'medium',
}: Pick<ButtonProps, 'variant' | 'disabled' | 'size'>) => {
  const baseStyles: TextStyle = {
    textAlign: 'center',
    fontWeight: '600',
  };

  // Size-specific font sizes
  const sizeStyles: Record<string, TextStyle> = {
    small: {
      fontSize: fontSizes.sm,
    },
    medium: {
      fontSize: fontSizes.md,
    },
    large: {
      fontSize: fontSizes.md,
    },
  };

  // Variant-specific text colors
  const variantStyles: Record<string, TextStyle> = {
    primary: {
      color: colors.primary.contrast,
    },
    secondary: {
      color: colors.secondary.contrast,
    },
    outline: {
      color: colors.primary.default,
    },
    text: {
      color: colors.primary.default,
    },
  };

  return StyleSheet.create({
    text: {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(disabled && { color: colors.text.disabled }),
    },
  });
};

/**
 * Button component implementing design system specifications
 * with accessibility support and responsive sizing
 */
const Button: React.FC<ButtonProps> = memo(({
  variant = 'primary',
  size = 'medium',
  onPress,
  disabled = false,
  loading = false,
  fullWidth = false,
  children,
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const buttonStyles = getButtonStyles({ variant, disabled, size, fullWidth, loading });
  const textStyles = getTextStyles({ variant, disabled, size });

  const handlePress = useCallback(() => {
    if (!disabled && !loading) {
      onPress();
    }
  }, [disabled, loading, onPress]);

  return (
    <TouchableOpacity
      style={[buttonStyles.button, style]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{
        disabled: disabled || loading,
        busy: loading,
      }}
      accessible={true}
      {...Platform.select({
        ios: {
          accessibilityTraits: disabled ? ['button', 'disabled'] : ['button'],
        },
      })}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'text' 
            ? colors.primary.default 
            : colors.primary.contrast}
        />
      ) : (
        <Text style={[textStyles.text, textStyle]} numberOfLines={1}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
});

Button.displayName = 'Button';

export default Button;