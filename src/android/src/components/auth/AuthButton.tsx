/**
 * @file AuthButton.tsx
 * @version 1.0.0
 * 
 * A specialized authentication button component for Android with biometric support,
 * enhanced loading states, and Material Design compliance.
 * 
 * @requires react v18.x
 * @requires react-native v0.71.x
 * @requires react-native-haptic-feedback v1.x
 * @requires react-native-biometrics v2.x
 */

import React, { useCallback, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Animated,
  Platform,
  ViewStyle
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useBiometric } from 'react-native-biometrics';
import Button from '../shared/Button';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../constants/colors';
import { getResponsiveSize } from '../../utils/responsive';

/**
 * Props interface for AuthButton component
 */
interface AuthButtonProps {
  label: string;
  onPress: () => Promise<void>;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  style?: ViewStyle;
  biometricEnabled?: boolean;
  onBiometricAuth?: () => Promise<void>;
  onError?: (error: Error) => void;
  loadingText?: string;
  timeout?: number;
}

/**
 * Default timeout for authentication attempts (ms)
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * Haptic feedback configuration
 */
const HAPTIC_OPTIONS = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false
};

/**
 * AuthButton Component
 * 
 * Enhanced authentication button with:
 * - Biometric authentication support
 * - Loading state management
 * - Haptic feedback
 * - Error handling
 * - Timeout management
 * - WCAG 2.1 Level AA compliance
 */
const AuthButton: React.FC<AuthButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  biometricEnabled = false,
  onBiometricAuth,
  onError,
  loadingText = 'Authenticating...',
  timeout = DEFAULT_TIMEOUT
}) => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [loadingOpacity] = useState(new Animated.Value(0));

  // Hooks
  const { loading: authLoading } = useAuth();
  const { isSensorAvailable } = useBiometric();

  /**
   * Handles biometric authentication flow
   */
  const handleBiometricAuth = useCallback(async (): Promise<boolean> => {
    if (!biometricEnabled || !onBiometricAuth) return false;

    try {
      const isAvailable = await isSensorAvailable();
      if (!isAvailable) {
        throw new Error('Biometric authentication not available');
      }

      await onBiometricAuth();
      ReactNativeHapticFeedback.trigger('notificationSuccess', HAPTIC_OPTIONS);
      return true;
    } catch (error) {
      ReactNativeHapticFeedback.trigger('notificationError', HAPTIC_OPTIONS);
      onError?.(error as Error);
      return false;
    }
  }, [biometricEnabled, onBiometricAuth, isSensorAvailable, onError]);

  /**
   * Handles button press with loading state and timeout
   */
  const handleAuthPress = useCallback(async () => {
    if (isLoading || disabled) return;

    try {
      setIsLoading(true);
      setError(null);
      ReactNativeHapticFeedback.trigger('impactMedium', HAPTIC_OPTIONS);

      // Animate loading state
      Animated.timing(loadingOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      }).start();

      // Setup timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Authentication timeout')), timeout);
      });

      // Handle biometric auth if enabled
      if (biometricEnabled) {
        const biometricSuccess = await handleBiometricAuth();
        if (!biometricSuccess) return;
      }

      // Execute authentication
      await Promise.race([onPress(), timeoutPromise]);
      ReactNativeHapticFeedback.trigger('notificationSuccess', HAPTIC_OPTIONS);
    } catch (error) {
      setError(error as Error);
      onError?.(error as Error);
      ReactNativeHapticFeedback.trigger('notificationError', HAPTIC_OPTIONS);
    } finally {
      // Animate loading state removal
      Animated.timing(loadingOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start(() => setIsLoading(false));
    }
  }, [
    isLoading,
    disabled,
    loadingOpacity,
    timeout,
    biometricEnabled,
    handleBiometricAuth,
    onPress,
    onError
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      loadingOpacity.setValue(0);
    };
  }, [loadingOpacity]);

  return (
    <Button
      label={isLoading ? loadingText : label}
      onPress={handleAuthPress}
      variant={variant}
      disabled={disabled || isLoading || authLoading}
      style={[
        styles.button,
        error && styles.errorState,
        isLoading && styles.loadingState,
        style
      ]}
      accessibilityLabel={label}
      accessibilityState={{
        disabled: disabled || isLoading,
        busy: isLoading
      }}
      testID="auth-button"
    >
      {isLoading && (
        <Animated.View 
          style={[
            styles.loadingContainer,
            { opacity: loadingOpacity }
          ]}
        >
          <ActivityIndicator
            color={colors.text.inverse}
            size="small"
            style={styles.loadingSpinner}
          />
        </Animated.View>
      )}
    </Button>
  );
};

/**
 * Styles with responsive sizing and Material Design compliance
 */
const styles = StyleSheet.create({
  button: {
    minWidth: getResponsiveSize(200),
    height: getResponsiveSize(48)
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8
  },
  loadingSpinner: {
    marginLeft: getResponsiveSize(8),
    transform: [{ scale: 0.8 }]
  },
  loadingState: {
    opacity: 0.8
  },
  errorState: {
    borderColor: colors.error.default,
    borderWidth: Platform.select({ android: 2, default: 1 })
  }
});

export default AuthButton;