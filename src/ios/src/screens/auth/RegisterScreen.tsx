/**
 * Enhanced Registration Screen Component for iOS
 * Implements OAuth 2.0 + JWT authentication with biometric support
 * and WCAG 2.1 Level AA compliance
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Alert,
  AccessibilityInfo
} from 'react-native';
import TouchID from '@react-native-community/touch-id'; // v6.x
import analytics from '@react-native-firebase/analytics'; // v18.x
import { SafeAreaView } from 'react-native-safe-area-context';

import AuthInput from '../../components/auth/AuthInput';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../constants/colors';
import { textStyles } from '../../constants/typography';
import { validateRegistrationData } from '../../utils/validation';
import { RegisterCredentials, UserRole } from '../../types/auth';
import Button from '../../components/shared/Button';
import Text from '../../components/shared/Text';

/**
 * Props interface for RegisterScreen
 */
interface RegisterScreenProps {
  navigation: any;
  analyticsEnabled?: boolean;
}

/**
 * Form state interface for registration data
 */
interface FormState {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  biometricEnabled: boolean;
}

/**
 * Enhanced Registration Screen Component
 */
const RegisterScreen: React.FC<RegisterScreenProps> = ({
  navigation,
  analyticsEnabled = true
}) => {
  // State management
  const [formState, setFormState] = useState<FormState>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    biometricEnabled: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, loading } = useAuth();

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  /**
   * Checks device biometric capability
   */
  const checkBiometricAvailability = async () => {
    try {
      const biometryType = await TouchID.isSupported();
      setBiometricSupported(!!biometryType);
    } catch (error) {
      setBiometricSupported(false);
    }
  };

  /**
   * Handles form field changes with validation
   */
  const handleFieldChange = useCallback((field: keyof FormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  /**
   * Handles biometric enrollment
   */
  const handleBiometricToggle = async () => {
    try {
      if (!biometricSupported) {
        Alert.alert('Biometric Authentication', 'Biometric authentication is not available on this device');
        return;
      }

      const authenticated = await TouchID.authenticate('Verify your identity', {
        fallbackLabel: 'Use Passcode'
      });

      if (authenticated) {
        setFormState(prev => ({ ...prev, biometricEnabled: !prev.biometricEnabled }));
        if (analyticsEnabled) {
          await analytics().logEvent('biometric_enrollment', {
            success: true
          });
        }
      }
    } catch (error) {
      if (analyticsEnabled) {
        await analytics().logEvent('biometric_enrollment', {
          success: false,
          error: error.message
        });
      }
      Alert.alert('Authentication Failed', 'Please try again');
    }
  };

  /**
   * Handles form submission with validation
   */
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setErrors({});

      // Validate form data
      const credentials: RegisterCredentials = {
        email: formState.email,
        password: formState.password,
        firstName: formState.firstName,
        lastName: formState.lastName,
        role: UserRole.USER,
        acceptedTerms: true,
        enableMfa: formState.biometricEnabled
      };

      const validation = validateRegistrationData(credentials);
      if (!validation.isValid) {
        setErrors(validation.errors);
        return;
      }

      // Track registration attempt
      if (analyticsEnabled) {
        await analytics().logEvent('registration_attempt', {
          biometric_enabled: formState.biometricEnabled
        });
      }

      // Attempt registration
      await register(credentials);

      // Track successful registration
      if (analyticsEnabled) {
        await analytics().logEvent('registration_success', {
          biometric_enabled: formState.biometricEnabled
        });
      }

      navigation.navigate('RegistrationSuccess');
    } catch (error) {
      if (analyticsEnabled) {
        await analytics().logEvent('registration_error', {
          error: error.message
        });
      }
      Alert.alert(
        'Registration Failed',
        'Please check your information and try again'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          accessible={true}
          accessibilityLabel="Registration form"
          accessibilityHint="Form to create a new account"
        >
          <Text style={textStyles.h1} accessibilityRole="header">
            Create Account
          </Text>

          <View style={styles.form}>
            <AuthInput
              type="text"
              value={formState.firstName}
              onChangeText={(text) => handleFieldChange('firstName', text)}
              placeholder="First Name"
              error={errors.firstName}
              testID="register-firstname-input"
            />

            <AuthInput
              type="text"
              value={formState.lastName}
              onChangeText={(text) => handleFieldChange('lastName', text)}
              placeholder="Last Name"
              error={errors.lastName}
              testID="register-lastname-input"
            />

            <AuthInput
              type="email"
              value={formState.email}
              onChangeText={(text) => handleFieldChange('email', text)}
              placeholder="Email Address"
              error={errors.email}
              testID="register-email-input"
            />

            <AuthInput
              type="password"
              value={formState.password}
              onChangeText={(text) => handleFieldChange('password', text)}
              placeholder="Password"
              error={errors.password}
              testID="register-password-input"
            />

            {biometricSupported && (
              <Button
                onPress={handleBiometricToggle}
                variant="secondary"
                accessibilityLabel="Enable biometric authentication"
                accessibilityHint="Toggle biometric login for enhanced security"
                testID="register-biometric-button"
              >
                {formState.biometricEnabled ? 'Disable' : 'Enable'} Biometric Login
              </Button>
            )}

            <Button
              onPress={handleSubmit}
              disabled={isSubmitting || loading}
              loading={isSubmitting || loading}
              accessibilityLabel="Create account button"
              accessibilityHint="Press to create your account"
              testID="register-submit-button"
            >
              Create Account
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
  },
  form: {
    gap: 16,
    marginTop: 32,
  },
});

export default RegisterScreen;