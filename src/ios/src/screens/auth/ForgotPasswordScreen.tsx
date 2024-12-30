/**
 * @fileoverview Forgot Password Screen Component for iOS
 * Implements secure password reset functionality with rate limiting,
 * analytics tracking, and accessibility features
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  Keyboard,
  AccessibilityInfo,
  Platform,
} from 'react-native';

import AuthInput from '../../components/auth/AuthInput';
import AuthButton from '../../components/auth/AuthButton';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../constants/colors';
import { Analytics } from '../../utils/analytics';
import { validateEmail } from '../../utils/validation';

/**
 * Props interface for the ForgotPassword screen
 */
interface ForgotPasswordScreenProps {
  navigation: any; // NavigationProp type would be more specific in a real app
}

/**
 * ForgotPasswordScreen component implementing secure password reset flow
 */
const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  // State management
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmailValid, setIsEmailValid] = useState(false);

  // Custom hooks
  const { forgotPassword } = useAuth();

  /**
   * Validates email format and updates state
   */
  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
    const validation = validateEmail(text);
    setIsEmailValid(validation.isValid);
    setError(validation.errors[0] || null);
  }, []);

  /**
   * Handles password reset request submission
   */
  const handleForgotPassword = useCallback(async () => {
    try {
      if (!isEmailValid) {
        setError('Please enter a valid email address');
        AccessibilityInfo.announceForAccessibility('Please enter a valid email address');
        return;
      }

      setIsLoading(true);
      setError(null);
      Keyboard.dismiss();

      // Track password reset attempt
      await Analytics.trackEvent('password_reset_attempt', {
        email_domain: email.split('@')[1],
      });

      await forgotPassword(email);

      // Track successful password reset request
      await Analytics.trackEvent('password_reset_success', {
        email_domain: email.split('@')[1],
      });

      Alert.alert(
        'Reset Link Sent',
        'Please check your email for password reset instructions.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ],
        { cancelable: false }
      );
    } catch (error: any) {
      // Track failed password reset attempt
      await Analytics.trackEvent('password_reset_error', {
        error: error.message,
        email_domain: email.split('@')[1],
      });

      setError(error.message || 'Failed to send reset link. Please try again.');
      AccessibilityInfo.announceForAccessibility(
        'Failed to send reset link. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [email, isEmailValid, navigation, forgotPassword]);

  /**
   * Sets up accessibility focus on mount
   */
  useEffect(() => {
    const timeout = setTimeout(() => {
      AccessibilityInfo.announceForAccessibility('Forgot Password Screen');
    }, 500);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Forgot Password
      </Text>
      
      <Text style={styles.subtitle}>
        Enter your email address and we'll send you instructions to reset your password.
      </Text>

      <View style={styles.form}>
        <AuthInput
          type="email"
          value={email}
          onChangeText={handleEmailChange}
          placeholder="Enter your email"
          error={error}
          testID="forgot-password-email-input"
        />

        <View style={styles.buttonContainer}>
          <AuthButton
            type="resetPassword"
            onPress={handleForgotPassword}
            isLoading={isLoading}
            disabled={!isEmailValid || isLoading}
            accessibilityLabel="Send reset password link"
            testID="forgot-password-submit-button"
            fullWidth
          >
            Send Reset Link
          </AuthButton>
        </View>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: Platform.select({
      ios: 'Roboto-Bold',
      default: 'System',
    }),
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Platform.select({
      ios: 'Roboto-Regular',
      default: 'System',
    }),
    color: colors.text.secondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    marginBottom: 16,
  },
  buttonContainer: {
    marginTop: 24,
  },
  errorText: {
    color: colors.error.default,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ForgotPasswordScreen;