/**
 * @fileoverview Specialized authentication input component for iOS
 * Implements secure input handling, real-time validation, and iOS-specific styling
 * while maintaining WCAG 2.1 Level AA compliance
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Platform, Keyboard, AccessibilityInfo } from 'react-native';
import { useAccessibility } from '@react-native-aria/focus'; // v0.2.x
import ReactNativeHapticFeedback from 'react-native-haptic-feedback'; // v1.x

import Input from '../shared/Input';
import { colors } from '../../constants/colors';
import { validateEmail, validatePassword } from '../../utils/validation';

/**
 * Props interface for the AuthInput component with iOS-specific features
 */
interface AuthInputProps {
  type: 'email' | 'password' | 'text';
  value: string;
  onChangeText: (text: string, isValid: boolean) => void;
  error?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  enableBiometric?: boolean;
  testID?: string;
}

/**
 * Custom hook for managing authentication input state and validation
 */
const useAuthInput = (props: AuthInputProps) => {
  const [isValid, setIsValid] = useState(false);
  const [localError, setLocalError] = useState<string | undefined>(props.error);
  const { isScreenReaderEnabled } = useAccessibility();

  /**
   * Validates input based on type with haptic feedback
   */
  const handleValidation = useCallback((text: string) => {
    let validationResult = { isValid: true, errors: [] as string[] };

    switch (props.type) {
      case 'email':
        validationResult = validateEmail(text);
        break;
      case 'password':
        validationResult = validatePassword(text);
        break;
      default:
        validationResult = { isValid: text.length > 0, errors: [] };
    }

    // Provide haptic feedback based on validation result
    ReactNativeHapticFeedback.trigger(
      validationResult.isValid ? 'impactLight' : 'notificationError',
      {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      }
    );

    // Announce validation status for screen readers
    if (isScreenReaderEnabled && validationResult.errors.length > 0) {
      AccessibilityInfo.announceForAccessibility(validationResult.errors[0]);
    }

    setIsValid(validationResult.isValid);
    setLocalError(validationResult.errors[0]);

    return validationResult;
  }, [props.type, isScreenReaderEnabled]);

  return {
    isValid,
    localError,
    handleValidation,
  };
};

/**
 * AuthInput component with iOS-specific optimizations and security features
 */
const AuthInput: React.FC<AuthInputProps> = (props) => {
  const {
    type,
    value,
    onChangeText,
    error,
    placeholder,
    secureTextEntry,
    enableBiometric,
    testID,
  } = props;

  const { isValid, localError, handleValidation } = useAuthInput(props);

  /**
   * Handles text changes with validation
   */
  const handleTextChange = useCallback((text: string) => {
    const validationResult = handleValidation(text);
    onChangeText(text, validationResult.isValid);
  }, [handleValidation, onChangeText]);

  /**
   * Handle keyboard dismissal on blur
   */
  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        if (value) {
          handleValidation(value);
        }
      }
    );

    return () => {
      keyboardDidHideListener.remove();
    };
  }, [value, handleValidation]);

  // Determine input configuration based on type
  const inputConfig = {
    keyboardType: type === 'email' ? 'email-address' : 'default',
    autoCapitalize: type === 'email' ? 'none' : 'sentences',
    autoCorrect: false,
    spellCheck: false,
    secureTextEntry: type === 'password' || secureTextEntry,
  };

  const displayError = localError || error;

  return (
    <Input
      {...inputConfig}
      value={value}
      onChangeText={handleTextChange}
      placeholder={placeholder}
      error={displayError}
      style={[
        styles.authInput,
        displayError && styles.errorState,
        Platform.select({
          ios: styles.iosSpecific,
        }),
      ]}
      accessibilityLabel={`${type} input field`}
      accessibilityHint={placeholder}
      accessibilityRole="text"
      accessibilityState={{
        error: !!displayError,
        disabled: false,
      }}
      testID={testID || `auth-input-${type}`}
    />
  );
};

const styles = StyleSheet.create({
  authInput: {
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.background.secondary,
    paddingHorizontal: 16,
  },
  errorState: {
    borderColor: colors.error.default,
    borderWidth: 1,
  },
  iosSpecific: {
    shadowColor: colors.border.default,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  container: {
    marginVertical: 8,
  },
});

export default AuthInput;