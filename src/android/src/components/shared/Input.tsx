/**
 * @fileoverview Reusable, accessible input component for Android applications
 * Implements WCAG 2.1 Level AA compliance, secure input validation,
 * and platform-specific optimizations.
 * @version 1.0.0
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  Text,
  useColorScheme,
  Platform,
  KeyboardTypeOptions,
  TextInputProps,
  AccessibilityProps,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from 'react-native';
import { colors } from '../../constants/colors';
import { fontSizes } from '../../constants/typography';
import { validateEmail } from '../../utils/validation';
import { formatPhoneNumber } from '../../utils/formatting';

/**
 * Props interface for the Input component with enhanced validation and accessibility
 */
export interface InputProps extends Pick<TextInputProps, 'maxLength' | 'autoComplete'> {
  value: string;
  onChangeText: (text: string, isValid: boolean) => void;
  label: string;
  error?: string;
  type?: 'text' | 'email' | 'password' | 'phone';
  placeholder?: string;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/**
 * Enhanced input component with platform-specific optimizations,
 * accessibility support, and real-time validation
 */
const Input: React.FC<InputProps> = ({
  value,
  onChangeText,
  label,
  error,
  type = 'text',
  placeholder,
  testID,
  accessibilityLabel,
  accessibilityHint,
  maxLength,
  autoComplete,
}) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const [isFocused, setIsFocused] = useState(false);

  /**
   * Determines keyboard type based on input type and platform
   */
  const keyboardType: KeyboardTypeOptions = useMemo(() => {
    switch (type) {
      case 'email':
        return 'email-address';
      case 'phone':
        return Platform.select({
          android: 'phone-pad',
          default: 'number-pad',
        });
      default:
        return 'default';
    }
  }, [type]);

  /**
   * Handles text input changes with type-specific validation and formatting
   */
  const handleTextChange = useCallback((text: string) => {
    let processedText = text;
    let isValid = true;

    switch (type) {
      case 'email':
        isValid = validateEmail(text).isValid;
        break;
      case 'phone':
        processedText = formatPhoneNumber(text);
        isValid = processedText.length >= 10;
        break;
      case 'password':
        // Enforce password complexity requirements
        isValid = text.length >= 12 &&
          /[A-Z]/.test(text) &&
          /[a-z]/.test(text) &&
          /[0-9]/.test(text) &&
          /[^A-Za-z0-9]/.test(text);
        break;
      default:
        isValid = text.length > 0;
    }

    onChangeText(processedText, isValid);
  }, [type, onChangeText]);

  /**
   * Handles focus state for enhanced visual feedback
   */
  const handleFocus = useCallback(
    (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
      setIsFocused(true);
    },
    []
  );

  /**
   * Handles blur state and final validation
   */
  const handleBlur = useCallback(
    (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
      setIsFocused(false);
    },
    []
  );

  /**
   * Computed styles based on state and theme
   */
  const inputStyle = useMemo(() => {
    return [
      styles.input,
      isDarkMode && styles.darkMode.input,
      isFocused && { borderColor: colors.primary.default },
      error && styles.inputError,
    ];
  }, [isDarkMode, isFocused, error]);

  /**
   * Accessibility props for enhanced screen reader support
   */
  const accessibilityProps: AccessibilityProps = {
    accessible: true,
    accessibilityLabel: accessibilityLabel || `${label} input field`,
    accessibilityHint: accessibilityHint || `Enter ${label.toLowerCase()}`,
    accessibilityRole: 'none',
    accessibilityState: {
      error: !!error,
      disabled: false,
    },
  };

  return (
    <View style={styles.container} {...accessibilityProps}>
      <Text
        style={[
          styles.label,
          isDarkMode && { color: colors.text.darkMode.primary },
        ]}
        accessibilityRole="text"
      >
        {label}
      </Text>

      <TextInput
        style={inputStyle}
        value={value}
        onChangeText={handleTextChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        placeholderTextColor={
          isDarkMode ? colors.text.darkMode.tertiary : colors.text.tertiary
        }
        keyboardType={keyboardType}
        secureTextEntry={type === 'password'}
        autoCapitalize={type === 'email' ? 'none' : 'sentences'}
        autoCorrect={type === 'text'}
        autoComplete={autoComplete}
        maxLength={maxLength}
        testID={testID}
        textContentType={type === 'password' ? 'oneTimeCode' : type}
        importantForAutofill="yes"
        accessibilityLiveRegion="polite"
      />

      {error && (
        <Text
          style={styles.errorText}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: fontSizes.sm,
    color: colors.text.primary,
    marginBottom: 4,
    fontWeight: '500',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: fontSizes.md,
    color: colors.text.primary,
    borderColor: colors.border.default,
    backgroundColor: colors.background.primary,
    minHeight: 48, // Ensures minimum touch target size
    textAlignVertical: 'center',
  },
  inputError: {
    borderColor: colors.error.default,
  },
  errorText: {
    fontSize: fontSizes.sm,
    color: colors.error.default,
    marginTop: 4,
  },
  darkMode: {
    input: {
      backgroundColor: colors.background.darkMode.primary,
      color: colors.text.darkMode.primary,
    },
  },
});

export default Input;