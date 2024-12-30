/**
 * @fileoverview Login screen component for Android mobile app
 * Implements secure authentication with email/password and biometric support
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Keyboard,
  Platform,
  AccessibilityInfo
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import BiometricAuth from 'react-native-biometrics';

import AuthInput from '../../components/auth/AuthInput';
import AuthButton from '../../components/auth/AuthButton';
import { useAuth } from '../../hooks/useAuth';
import { validateForm } from '../../utils/validation';
import { colors } from '../../constants/colors';
import { fontSizes } from '../../constants/typography';
import { getResponsiveSize } from '../../utils/responsive';

// Interfaces
interface LoginFormState {
  email: string;
  password: string;
  mfaCode: string;
  rememberMe: boolean;
}

interface LoginFormErrors {
  email: string | null;
  password: string | null;
  mfaCode: string | null;
  general: string | null;
}

interface BiometricState {
  isAvailable: boolean;
  isEnrolled: boolean;
  type: 'fingerprint' | 'face' | 'none';
}

// Constants
const HAPTIC_OPTIONS = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false
};

const LoginScreen: React.FC = () => {
  // State management
  const [formState, setFormState] = useState<LoginFormState>({
    email: '',
    password: '',
    mfaCode: '',
    rememberMe: false
  });

  const [errors, setErrors] = useState<LoginFormErrors>({
    email: null,
    password: null,
    mfaCode: null,
    general: null
  });

  const [biometricState, setBiometricState] = useState<BiometricState>({
    isAvailable: false,
    isEnrolled: false,
    type: 'none'
  });

  const [showMfa, setShowMfa] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const navigation = useNavigation();
  const { handleLogin, handleBiometricLogin, loading } = useAuth();

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  /**
   * Checks device biometric capabilities and enrollment status
   */
  const checkBiometricAvailability = async () => {
    try {
      const biometricAuth = new BiometricAuth();
      const { available, biometryType } = await biometricAuth.isSensorAvailable();

      setBiometricState({
        isAvailable: available,
        isEnrolled: available && await biometricAuth.isEnrolled(),
        type: biometryType as BiometricState['type']
      });
    } catch (error) {
      console.error('Biometric check failed:', error);
    }
  };

  /**
   * Handles form input changes with validation
   */
  const handleInputChange = useCallback((field: keyof LoginFormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: null, general: null }));
  }, []);

  /**
   * Handles form submission with validation and error handling
   */
  const handleSubmit = async () => {
    try {
      // Trigger haptic feedback
      ReactNativeHapticFeedback.trigger('impactMedium', HAPTIC_OPTIONS);

      // Validate form
      const validationResult = validateForm(formState);
      if (!validationResult.isValid) {
        setErrors(validationResult.errors);
        AccessibilityInfo.announceForAccessibility('Form validation failed. Please check your inputs.');
        return;
      }

      // Attempt login
      const result = await handleLogin({
        email: formState.email,
        password: formState.password,
        mfaCode: showMfa ? formState.mfaCode : undefined,
        rememberMe: formState.rememberMe
      });

      if (result.requiresMfa && !showMfa) {
        setShowMfa(true);
        AccessibilityInfo.announceForAccessibility('Two-factor authentication required');
        scrollViewRef.current?.scrollToEnd({ animated: true });
        return;
      }

      // Navigate on success
      navigation.replace('Main');
      ReactNativeHapticFeedback.trigger('notificationSuccess', HAPTIC_OPTIONS);

    } catch (error) {
      setErrors(prev => ({
        ...prev,
        general: error.message || 'Authentication failed'
      }));
      ReactNativeHapticFeedback.trigger('notificationError', HAPTIC_OPTIONS);
      AccessibilityInfo.announceForAccessibility('Login failed. ' + error.message);
    }
  };

  /**
   * Handles biometric authentication
   */
  const handleBiometricAuth = async () => {
    try {
      if (!biometricState.isAvailable || !biometricState.isEnrolled) {
        throw new Error('Biometric authentication not available');
      }

      ReactNativeHapticFeedback.trigger('impactMedium', HAPTIC_OPTIONS);
      await handleBiometricLogin();
      navigation.replace('Main');
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        general: error.message || 'Biometric authentication failed'
      }));
      AccessibilityInfo.announceForAccessibility('Biometric authentication failed');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <Text style={styles.title}>Welcome Back</Text>

          <View style={styles.inputContainer}>
            <AuthInput
              type="email"
              value={formState.email}
              onChangeText={(text) => handleInputChange('email', text)}
              error={errors.email}
              testID="login-email-input"
              accessibilityLabel="Email address input"
            />
          </View>

          <View style={styles.inputContainer}>
            <AuthInput
              type="password"
              value={formState.password}
              onChangeText={(text) => handleInputChange('password', text)}
              error={errors.password}
              testID="login-password-input"
              accessibilityLabel="Password input"
              showPasswordStrength
            />
          </View>

          {showMfa && (
            <View style={styles.inputContainer}>
              <AuthInput
                type="mfaCode"
                value={formState.mfaCode}
                onChangeText={(text) => handleInputChange('mfaCode', text)}
                error={errors.mfaCode}
                testID="login-mfa-input"
                accessibilityLabel="Authentication code input"
              />
            </View>
          )}

          {errors.general && (
            <Text style={styles.errorText} accessibilityRole="alert">
              {errors.general}
            </Text>
          )}

          <View style={styles.buttonContainer}>
            <AuthButton
              label="Sign In"
              onPress={handleSubmit}
              loading={loading}
              testID="login-submit-button"
            />
          </View>

          {biometricState.isAvailable && biometricState.isEnrolled && (
            <View style={styles.buttonContainer}>
              <AuthButton
                label={`Sign in with ${biometricState.type === 'face' ? 'Face ID' : 'Fingerprint'}`}
                onPress={handleBiometricAuth}
                variant="outline"
                style={styles.biometricButton}
                testID="login-biometric-button"
              />
            </View>
          )}

          <Text
            style={styles.forgotPasswordText}
            onPress={() => navigation.navigate('ForgotPassword')}
            accessibilityRole="link"
          >
            Forgot Password?
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    padding: getResponsiveSize(16)
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center'
  },
  title: {
    fontSize: fontSizes.xxl,
    fontFamily: Platform.select({
      android: 'PlayfairDisplay-Bold',
      default: 'System'
    }),
    color: colors.primary.default,
    marginBottom: getResponsiveSize(24),
    textAlign: 'center'
  },
  inputContainer: {
    marginBottom: getResponsiveSize(16)
  },
  buttonContainer: {
    marginTop: getResponsiveSize(24)
  },
  forgotPasswordText: {
    color: colors.primary.default,
    textAlign: 'center',
    marginTop: getResponsiveSize(16),
    fontFamily: Platform.select({
      android: 'Roboto-Regular',
      default: 'System'
    })
  },
  biometricButton: {
    marginTop: getResponsiveSize(16),
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary.default
  },
  errorText: {
    color: colors.error.default,
    fontSize: fontSizes.sm,
    fontFamily: Platform.select({
      android: 'Roboto-Regular',
      default: 'System'
    }),
    marginTop: getResponsiveSize(4)
  }
});

export default LoginScreen;