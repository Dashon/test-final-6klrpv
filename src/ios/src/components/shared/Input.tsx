/**
 * @fileoverview Reusable input component for iOS with design system compliance
 * Implements WCAG 2.1 Level AA accessibility standards with iOS-specific optimizations
 * @version 1.0.0
 */

import React, { forwardRef, useRef, useState, useCallback } from 'react';
import {
  TextInput,
  StyleSheet,
  View,
  Text,
  Platform,
  Animated,
  NativeSyntheticEvent,
  TextInputFocusEventData,
  AccessibilityInfo,
} from 'react-native';
import { useAccessibilityInfo } from '@react-native-community/hooks'; // v2.x
import ReactNativeHapticFeedback from 'react-native-haptic-feedback'; // v1.x

import { colors } from '../../constants/colors';
import { fontSizes } from '../../constants/typography';
import { validateInput } from '../../utils/validation';

/**
 * Props interface for the Input component
 */
interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  validationPattern?: RegExp;
  mask?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
  maxLength?: number;
  editable?: boolean;
  onBlur?: (e: NativeSyntheticEvent<TextInputFocusEventData>) => void;
  onFocus?: (e: NativeSyntheticEvent<TextInputFocusEventData>) => void;
}

/**
 * Input component with iOS-specific optimizations and accessibility features
 */
export const Input = forwardRef<TextInput, InputProps>((props, ref) => {
  const {
    value,
    onChangeText,
    placeholder,
    error,
    validationPattern,
    mask,
    accessibilityLabel,
    accessibilityHint,
    testID,
    secureTextEntry,
    autoCapitalize = 'none',
    keyboardType = 'default',
    returnKeyType = 'done',
    maxLength,
    editable = true,
    onBlur,
    onFocus,
  } = props;

  // State management
  const [isFocused, setIsFocused] = useState(false);
  const [localError, setLocalError] = useState<string | undefined>(error);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  // Accessibility hooks
  const { isScreenReaderEnabled } = useAccessibilityInfo();

  /**
   * Handles input focus with haptic feedback
   */
  const handleFocus = useCallback((e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(true);
    ReactNativeHapticFeedback.trigger('impactLight', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });

    if (isScreenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility('Input field focused');
    }

    onFocus?.(e);
  }, [onFocus, isScreenReaderEnabled]);

  /**
   * Handles input blur with validation
   */
  const handleBlur = useCallback((e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(false);
    
    if (validationPattern && value) {
      const isValid = validateInput(value, validationPattern);
      if (!isValid) {
        setLocalError('Invalid input');
        triggerErrorAnimation();
      } else {
        setLocalError(undefined);
      }
    }

    onBlur?.(e);
  }, [value, validationPattern, onBlur]);

  /**
   * Handles text changes with optional masking
   */
  const handleChangeText = useCallback((text: string) => {
    let processedText = text;

    if (mask) {
      processedText = applyInputMask(text, mask);
    }

    if (maxLength) {
      processedText = processedText.slice(0, maxLength);
    }

    onChangeText(processedText);
  }, [mask, maxLength, onChangeText]);

  /**
   * Triggers error state animation
   */
  const triggerErrorAnimation = useCallback(() => {
    ReactNativeHapticFeedback.trigger('notificationError', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });

    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnimation]);

  /**
   * Applies input mask pattern
   */
  const applyInputMask = (text: string, maskPattern: string): string => {
    let result = '';
    let textIndex = 0;

    for (let i = 0; i < maskPattern.length && textIndex < text.length; i++) {
      const maskChar = maskPattern[i];
      const textChar = text[textIndex];

      if (maskChar === '#') {
        if (/\d/.test(textChar)) {
          result += textChar;
          textIndex++;
        }
      } else if (maskChar === 'A') {
        if (/[a-zA-Z]/.test(textChar)) {
          result += textChar;
          textIndex++;
        }
      } else {
        result += maskChar;
        if (textChar === maskChar) {
          textIndex++;
        }
      }
    }

    return result;
  };

  const displayError = localError || error;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.inputContainer,
          isFocused && styles.focusedInput,
          displayError && styles.errorInput,
          { transform: [{ translateX: shakeAnimation }] },
        ]}
      >
        <TextInput
          ref={ref}
          style={[
            styles.input,
            Platform.select({
              ios: styles.iosInput,
            }),
          ]}
          value={value}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.text.secondary}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          maxLength={maxLength}
          editable={editable}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          accessibilityRole="text"
          accessibilityState={{
            disabled: !editable,
            error: !!displayError,
          }}
          testID={testID}
        />
      </Animated.View>
      {displayError && (
        <Text
          style={styles.errorText}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {displayError}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    backgroundColor: Platform.select({
      ios: colors.background.primary,
      default: colors.background.primary,
    }),
  },
  input: {
    height: 48,
    paddingHorizontal: 16,
    fontSize: fontSizes.md,
    color: colors.text.primary,
    textAlignVertical: 'center',
  },
  iosInput: {
    paddingVertical: 12,
  },
  focusedInput: {
    borderColor: colors.border.focus,
    borderWidth: 2,
  },
  errorInput: {
    borderColor: colors.error.default,
    backgroundColor: colors.error.background,
  },
  errorText: {
    color: colors.error.default,
    fontSize: fontSizes.md,
    marginTop: 4,
    marginLeft: 16,
  },
});

Input.displayName = 'Input';

export default Input;