/**
 * @fileoverview Enhanced authentication input component for Android mobile app
 * Implements secure input handling, real-time validation, and WCAG 2.1 Level AA compliance
 * @version 1.0.0
 */

import React, { useCallback, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  AccessibilityInfo,
  Platform,
  Keyboard,
} from 'react-native';
import { Haptics } from 'react-native';
import { useDebounce } from 'use-debounce'; // v9.0.0
import Input, { InputProps } from '../shared/Input';
import { validateEmail, validatePassword, validateMFACode } from '../../utils/validation';
import { colors } from '../../constants/colors';
import { fontSizes } from '../../constants/typography';

/**
 * Props interface for the AuthInput component with enhanced security features
 */
export interface AuthInputProps extends Omit<InputProps, 'type' | 'label'> {
  type: 'email' | 'password' | 'mfaCode';
  value: string;
  onChangeText: (text: string, isValid: boolean) => void;
  error?: string;
  testID?: string;
  showPasswordStrength?: boolean;
  accessibilityLabel?: string;
}

/**
 * Enhanced authentication input component with security features and accessibility
 */
const AuthInput: React.FC<AuthInputProps> = ({
  type,
  value,
  onChangeText,
  error,
  testID,
  showPasswordStrength = false,
  accessibilityLabel,
  ...props
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [strengthScore, setStrengthScore] = useState(0);
  const [debouncedValidation] = useDebounce(handleValidation, 300);
  const inputRef = useRef<any>(null);

  /**
   * Handles secure text validation with debouncing
   */
  async function handleValidation(text: string) {
    let validationResult = { isValid: false, error: '', strength: 0 };

    switch (type) {
      case 'email':
        const emailResult = validateEmail(text);
        validationResult = {
          isValid: emailResult.isValid,
          error: emailResult.errors.email || '',
          strength: 0
        };
        break;

      case 'password':
        const passwordResult = validatePassword(text);
        const entropy = calculatePasswordEntropy(text);
        validationResult = {
          isValid: passwordResult.isValid,
          error: passwordResult.errors.password || '',
          strength: Math.min(Math.floor((entropy / 80) * 100), 100)
        };
        break;

      case 'mfaCode':
        const mfaResult = validateMFACode(text);
        validationResult = {
          isValid: mfaResult.isValid,
          error: mfaResult.errors.mfaCode || '',
          strength: 0
        };
        break;
    }

    // Provide haptic feedback based on validation result
    if (Platform.OS === 'ios') {
      if (validationResult.isValid) {
        Haptics.selectionAsync();
      } else if (text.length > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }

    return validationResult;
  }

  /**
   * Handles text changes with enhanced security validation
   */
  const handleTextChange = useCallback(async (text: string) => {
    // Sanitize input
    const sanitizedText = text.trim();
    
    // Validate input
    const validation = await debouncedValidation(sanitizedText);
    
    // Update strength indicator for passwords
    if (type === 'password' && showPasswordStrength) {
      setStrengthScore(validation.strength);
    }

    // Provide accessibility feedback
    if (validation.error) {
      AccessibilityInfo.announceForAccessibility(validation.error);
    }

    onChangeText(sanitizedText, validation.isValid);
  }, [type, showPasswordStrength, debouncedValidation, onChangeText]);

  /**
   * Toggles password visibility with security measures
   */
  const togglePasswordVisibility = useCallback(() => {
    setIsPasswordVisible(prev => !prev);
    // Dismiss keyboard on iOS for security
    if (Platform.OS === 'ios') {
      Keyboard.dismiss();
    }
  }, []);

  /**
   * Calculates password entropy for strength indication
   */
  const calculatePasswordEntropy = (password: string): number => {
    const charset = {
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[^A-Za-z0-9]/.test(password)
    };

    let poolSize = 0;
    if (charset.lowercase) poolSize += 26;
    if (charset.uppercase) poolSize += 26;
    if (charset.numbers) poolSize += 10;
    if (charset.symbols) poolSize += 32;

    return Math.log2(Math.pow(poolSize, password.length));
  };

  /**
   * Determines input label based on type
   */
  const getInputLabel = useCallback(() => {
    switch (type) {
      case 'email':
        return 'Email Address';
      case 'password':
        return 'Password';
      case 'mfaCode':
        return 'Authentication Code';
      default:
        return '';
    }
  }, [type]);

  return (
    <View style={styles.container}>
      <Input
        ref={inputRef}
        value={value}
        onChangeText={handleTextChange}
        label={getInputLabel()}
        error={error}
        testID={testID}
        secureTextEntry={type === 'password' && !isPasswordVisible}
        autoCapitalize={type === 'email' ? 'none' : 'sentences'}
        autoComplete={type === 'password' ? 'off' : type}
        autoCorrect={false}
        keyboardType={type === 'email' ? 'email-address' : type === 'mfaCode' ? 'number-pad' : 'default'}
        maxLength={type === 'mfaCode' ? 6 : undefined}
        style={[type === 'password' && styles.secureTextEntry]}
        accessibilityLabel={accessibilityLabel || getInputLabel()}
        accessibilityHint={`Enter your ${type}`}
        {...props}
      />

      {type === 'password' && (
        <TouchableOpacity
          style={styles.togglePasswordButton}
          onPress={togglePasswordVisibility}
          accessibilityLabel={`${isPasswordVisible ? 'Hide' : 'Show'} password`}
          accessibilityRole="button"
        >
          {/* Icon component would go here */}
        </TouchableOpacity>
      )}

      {type === 'password' && showPasswordStrength && (
        <View 
          style={[
            styles.strengthIndicator,
            { backgroundColor: getStrengthColor(strengthScore) }
          ]}
          accessibilityLabel={`Password strength: ${getStrengthLabel(strengthScore)}`}
        />
      )}
    </View>
  );
};

/**
 * Helper function to get strength indicator color
 */
const getStrengthColor = (score: number): string => {
  if (score >= 80) return colors.success.default;
  if (score >= 60) return colors.warning.default;
  if (score >= 30) return colors.error.light;
  return colors.error.default;
};

/**
 * Helper function to get strength label for accessibility
 */
const getStrengthLabel = (score: number): string => {
  if (score >= 80) return 'very strong';
  if (score >= 60) return 'strong';
  if (score >= 30) return 'moderate';
  return 'weak';
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  secureTextEntry: {
    paddingRight: 40,
  },
  togglePasswordButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -12 }],
    padding: 8,
    zIndex: 1,
  },
  strengthIndicator: {
    height: 4,
    marginTop: 8,
    borderRadius: 2,
  },
});

export default AuthInput;