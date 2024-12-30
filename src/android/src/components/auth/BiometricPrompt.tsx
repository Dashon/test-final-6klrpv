/**
 * @fileoverview Enhanced biometric authentication prompt for Android devices
 * @version 1.0.0
 * 
 * A React Native component that provides secure biometric authentication
 * with comprehensive error handling, accessibility support, and Material Design
 * integration.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  AccessibilityInfo,
  Platform,
  PixelRatio
} from 'react-native';

// Internal imports with proper version tracking
import { useAndroidBiometric } from '../../hooks/useAndroidBiometric';
import type { BiometricAuthResult } from '../../types/auth';
import { AndroidRipple } from '../shared/AndroidRipple';
import { colors } from '../../constants/colors';
import { getResponsiveSize } from '../../utils/responsive';
import { Spacing, Layout } from '../../constants/layout';

// Component version for tracking
const COMPONENT_VERSION = '1.0.0';

interface BiometricPromptProps {
  /** Title text for the biometric prompt */
  title: string;
  /** Subtitle/description text for the biometric prompt */
  subtitle: string;
  /** Callback function on successful authentication */
  onSuccess: () => void;
  /** Callback function on authentication error */
  onError: (error: string) => void;
  /** Optional timeout duration in milliseconds */
  timeout?: number;
  /** Optional style overrides */
  style?: any;
}

/**
 * BiometricPrompt Component
 * 
 * Provides a secure interface for biometric authentication on Android devices
 * with comprehensive error handling and accessibility support.
 */
export const BiometricPrompt: React.FC<BiometricPromptProps> = ({
  title,
  subtitle,
  onSuccess,
  onError,
  timeout = 30000,
  style
}) => {
  // Biometric authentication state management
  const {
    isAvailable,
    isChecking,
    error,
    authenticate,
    cleanup
  } = useAndroidBiometric();

  // Screen reader status tracking
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  /**
   * Handles the biometric authentication process with enhanced error handling
   */
  const handleBiometricAuth = useCallback(async () => {
    try {
      if (!isAvailable) {
        throw new Error('Biometric authentication is not available');
      }

      const result: BiometricAuthResult = await authenticate(title, subtitle);

      if (result.success) {
        onSuccess();
      } else {
        const errorMessage = result.error || 'Authentication failed';
        onError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      onError(errorMessage);
    }
  }, [isAvailable, authenticate, title, subtitle, onSuccess, onError]);

  // Check screen reader status on mount
  useEffect(() => {
    let mounted = true;

    const checkScreenReader = async () => {
      const enabled = await AccessibilityInfo.isScreenReaderEnabled();
      if (mounted) {
        setIsScreenReaderEnabled(enabled);
      }
    };

    checkScreenReader();

    // Listen for screen reader changes
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );

    return () => {
      mounted = false;
      cleanup();
      subscription.remove();
    };
  }, [cleanup]);

  // Render loading state
  if (isChecking) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator
          size="large"
          color={colors.primary.default}
          accessibilityLabel="Checking biometric availability"
        />
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      </View>
    );
  }

  // Render unavailable state
  if (!isAvailable) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.unavailableText} accessibilityRole="alert">
          Biometric authentication is not available on this device
        </Text>
      </View>
    );
  }

  // Render main biometric prompt
  return (
    <View style={[styles.container, style]}>
      <AndroidRipple
        onPress={handleBiometricAuth}
        color={colors.primary.default}
        accessible={true}
        accessibilityLabel={`Authenticate using biometrics: ${title}`}
        accessibilityHint={subtitle}
        accessibilityRole="button"
      >
        <View style={styles.buttonContainer}>
          <Text style={styles.buttonText}>
            {isScreenReaderEnabled ? 'Use Biometric Authentication' : title}
          </Text>
          {!isScreenReaderEnabled && (
            <Text style={styles.subtitleText}>
              {subtitle}
            </Text>
          )}
        </View>
      </AndroidRipple>
    </View>
  );
};

/**
 * Optimized styles with proper scaling and accessibility considerations
 */
const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Layout.BUTTON_HEIGHT,
    width: '100%'
  },
  buttonContainer: {
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: getResponsiveSize(200),
    backgroundColor: colors.background.primary
  },
  buttonText: {
    color: colors.primary.default,
    fontSize: PixelRatio.roundToNearestPixel(16),
    fontWeight: '500',
    textAlign: 'center'
  },
  subtitleText: {
    color: colors.text.secondary,
    fontSize: PixelRatio.roundToNearestPixel(14),
    marginTop: Spacing.xs,
    textAlign: 'center'
  },
  errorText: {
    color: colors.error.default,
    fontSize: PixelRatio.roundToNearestPixel(14),
    textAlign: 'center',
    padding: Spacing.md
  },
  unavailableText: {
    color: colors.text.secondary,
    fontSize: PixelRatio.roundToNearestPixel(14),
    textAlign: 'center',
    padding: Spacing.md
  }
});

// Freeze version for runtime checks
Object.freeze(COMPONENT_VERSION);

export default BiometricPrompt;