/**
 * Enhanced Login Screen Component for iOS
 * @version 1.0.0
 * 
 * Implements secure OAuth 2.0 authentication with biometric support,
 * comprehensive validation, analytics tracking, and accessibility features.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  AccessibilityInfo,
  Alert
} from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';
import KeychainService from 'react-native-keychain';

import AuthButton from '../../components/auth/AuthButton';
import AuthInput from '../../components/auth/AuthInput';
import useAuth from '../../hooks/useAuth';
import { colors } from '../../constants/colors';
import { fontSizes } from '../../constants/typography';
import { getResponsiveSpacing } from '../../utils/responsive';
import { validateEmail, validatePassword } from '../../utils/validation';
import { Analytics } from '../../utils/analytics';

// Validation error interface
interface ValidationErrors {
  email: string | null;
  password: string | null;
}

// Login screen props interface
interface LoginScreenProps {
  navigation: any; // NavigationProp type would be more specific in actual navigation setup
}

/**
 * Enhanced Login Screen Component
 */
const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  // State management
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({
    email: null,
    password: null
  });

  // Custom hook for authentication
  const { login, loading, error } = useAuth();

  /**
   * Checks biometric availability on component mount
   */
  useEffect(() => {
    const checkBiometricAvailability = async () => {
      try {
        const biometrics = new ReactNativeBiometrics();
        const { available, biometryType } = await biometrics.isSensorAvailable();
        setBiometricEnabled(available);

        if (available) {
          await Analytics.trackEvent('biometric_available', { type: biometryType });
        }
      } catch (error) {
        console.error('Biometric check failed:', error);
        setBiometricEnabled(false);
      }
    };

    checkBiometricAvailability();
  }, []);

  /**
   * Validates form fields
   */
  const validateFields = useCallback((): boolean => {
    const errors: ValidationErrors = {
      email: null,
      password: null
    };

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.errors[0];
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.errors[0];
    }

    setValidationErrors(errors);
    return !errors.email && !errors.password;
  }, [email, password]);

  /**
   * Handles biometric authentication
   */
  const handleBiometricAuth = async (): Promise<boolean> => {
    try {
      const biometrics = new ReactNativeBiometrics();
      const { success } = await biometrics.simplePrompt({
        promptMessage: 'Confirm your identity',
        cancelButtonText: 'Cancel'
      });

      await Analytics.trackEvent('biometric_auth_attempt', { success });
      return success;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      await Analytics.trackEvent('biometric_auth_error', { error: error.message });
      return false;
    }
  };

  /**
   * Handles login submission with validation and analytics
   */
  const handleLogin = async () => {
    try {
      await Analytics.trackEvent('login_attempt', { method: 'credentials' });

      if (!validateFields()) {
        await Analytics.trackEvent('login_validation_failed', {
          errors: validationErrors
        });
        return;
      }

      const result = await login({
        email,
        password,
        mfaCode: null
      });

      await Analytics.trackEvent('login_success', {
        method: 'credentials'
      });

      // Store credentials for biometric login if enabled
      if (biometricEnabled) {
        await KeychainService.setGenericPassword(email, password, {
          accessControl: KeychainService.ACCESS_CONTROL.BIOMETRY_ANY,
          accessible: KeychainService.ACCESSIBLE.WHEN_UNLOCKED
        });
      }

      // Navigate to main app
      navigation.replace('MainApp');
    } catch (error) {
      await Analytics.trackEvent('login_error', {
        error: error.message
      });

      Alert.alert(
        'Login Failed',
        error.message || 'Please check your credentials and try again.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.content}>
          <Text style={styles.title} accessibilityRole="header">
            Welcome Back
          </Text>

          <View style={styles.form}>
            <AuthInput
              type="email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setValidationErrors({ ...validationErrors, email: null });
              }}
              error={validationErrors.email}
              placeholder="Email"
              testID="login-email-input"
            />

            <AuthInput
              type="password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setValidationErrors({ ...validationErrors, password: null });
              }}
              error={validationErrors.password}
              placeholder="Password"
              secureTextEntry
              testID="login-password-input"
            />

            <AuthButton
              type="login"
              onPress={handleLogin}
              isLoading={loading}
              disabled={loading}
              accessibilityLabel="Sign in to your account"
              testID="login-submit-button"
              style={styles.loginButton}
            >
              Sign In
            </AuthButton>

            {biometricEnabled && (
              <AuthButton
                type="login"
                onPress={handleBiometricAuth}
                accessibilityLabel="Sign in with biometrics"
                testID="biometric-login-button"
                style={styles.biometricButton}
              >
                Sign in with Biometrics
              </AuthButton>
            )}
          </View>

          <View style={styles.footer}>
            <AuthButton
              type="forgotPassword"
              onPress={() => navigation.navigate('ForgotPassword')}
              accessibilityLabel="Forgot password? Reset it here"
              testID="forgot-password-button"
            >
              Forgot Password?
            </AuthButton>

            <AuthButton
              type="register"
              onPress={() => navigation.navigate('Register')}
              accessibilityLabel="Don't have an account? Sign up here"
              testID="register-button"
            >
              Create Account
            </AuthButton>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary
  },
  keyboardAvoidingView: {
    flex: 1
  },
  content: {
    flex: 1,
    padding: getResponsiveSpacing(4),
    justifyContent: 'center'
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: getResponsiveSpacing(6)
  },
  form: {
    gap: getResponsiveSpacing(3)
  },
  loginButton: {
    marginTop: getResponsiveSpacing(4)
  },
  biometricButton: {
    marginTop: getResponsiveSpacing(2)
  },
  footer: {
    marginTop: getResponsiveSpacing(6),
    alignItems: 'center',
    gap: getResponsiveSpacing(2)
  }
});

export default LoginScreen;