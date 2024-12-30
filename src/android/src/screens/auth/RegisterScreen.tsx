/**
 * @fileoverview Registration screen component for Android mobile app
 * Implements secure user account creation with email/password validation,
 * MFA setup, and WCAG 2.1 Level AA accessibility compliance.
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Internal imports
import AuthInput from '../../components/auth/AuthInput';
import AuthButton from '../../components/auth/AuthButton';
import { useAuth } from '../../hooks/useAuth';
import { register } from '../../services/auth';
import { validateEmail, validatePassword } from '../../utils/validation';
import { colors } from '../../constants/colors';
import { fontSizes } from '../../constants/typography';
import { getResponsiveSize } from '../../utils/responsive';

// Interfaces
interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
  enableMFA: boolean;
}

interface FormErrors {
  email: string | null;
  password: string | null;
  confirmPassword: string | null;
  terms: string | null;
}

/**
 * RegisterScreen Component
 * 
 * Implements secure user registration with:
 * - Real-time input validation
 * - Password strength requirements
 * - MFA setup option
 * - Accessibility support
 * - Material Design compliance
 */
const RegisterScreen: React.FC = () => {
  // Navigation and auth hooks
  const navigation = useNavigation();
  const { loading, error } = useAuth();

  // Form state
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false,
    enableMFA: false,
  });

  // Validation state
  const [formErrors, setFormErrors] = useState<FormErrors>({
    email: null,
    password: null,
    confirmPassword: null,
    terms: null,
  });

  const [isFormValid, setIsFormValid] = useState(false);

  /**
   * Validates all form inputs with security checks
   */
  const validateForm = useCallback((data: RegisterFormData): FormErrors => {
    const errors: FormErrors = {
      email: null,
      password: null,
      confirmPassword: null,
      terms: null,
    };

    // Email validation
    const emailValidation = validateEmail(data.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.errors.email;
    }

    // Password validation
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.errors.password;
    }

    // Confirm password validation
    if (data.password !== data.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Terms validation
    if (!data.acceptedTerms) {
      errors.terms = 'You must accept the terms and conditions';
    }

    return errors;
  }, []);

  /**
   * Updates form validity state based on current errors
   */
  useEffect(() => {
    const errors = validateForm(formData);
    const hasErrors = Object.values(errors).some(error => error !== null);
    setIsFormValid(!hasErrors && formData.acceptedTerms);
  }, [formData, validateForm]);

  /**
   * Handles input changes with validation
   */
  const handleInputChange = useCallback((field: keyof RegisterFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  /**
   * Handles secure registration submission
   */
  const handleRegister = useCallback(async () => {
    try {
      const errors = validateForm(formData);
      const hasErrors = Object.values(errors).some(error => error !== null);

      if (hasErrors) {
        setFormErrors(errors);
        return;
      }

      const registrationData = {
        email: formData.email,
        password: formData.password,
        enableMFA: formData.enableMFA,
      };

      await register(registrationData);

      // Navigate based on MFA status
      if (formData.enableMFA) {
        navigation.navigate('MFASetup');
      } else {
        navigation.navigate('Login');
      }
    } catch (error) {
      Alert.alert(
        'Registration Failed',
        error instanceof Error ? error.message : 'An error occurred during registration'
      );
    }
  }, [formData, validateForm, navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <AuthInput
            type="email"
            value={formData.email}
            onChangeText={(text) => handleInputChange('email', text)}
            error={formErrors.email}
            testID="register-email-input"
            accessibilityLabel="Email address input"
          />

          <AuthInput
            type="password"
            value={formData.password}
            onChangeText={(text) => handleInputChange('password', text)}
            error={formErrors.password}
            showPasswordStrength
            testID="register-password-input"
            accessibilityLabel="Password input"
          />

          <AuthInput
            type="password"
            value={formData.confirmPassword}
            onChangeText={(text) => handleInputChange('confirmPassword', text)}
            error={formErrors.confirmPassword}
            testID="register-confirm-password-input"
            accessibilityLabel="Confirm password input"
          />

          <AuthButton
            label="Create Account"
            onPress={handleRegister}
            disabled={!isFormValid || loading}
            style={styles.registerButton}
            testID="register-submit-button"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(24),
  },
  formContainer: {
    width: '100%',
    maxWidth: getResponsiveSize(400),
    alignSelf: 'center',
    gap: getResponsiveSize(16),
  },
  registerButton: {
    marginTop: getResponsiveSize(24),
  },
});

export default RegisterScreen;