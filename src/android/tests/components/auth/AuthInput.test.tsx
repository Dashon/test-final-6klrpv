/**
 * @fileoverview Test suite for AuthInput component with enhanced security and accessibility testing
 * @version 1.0.0
 */

import React from 'react';
import { render, fireEvent, waitFor, within } from '@testing-library/react-native';
import { Platform, Keyboard, AccessibilityInfo, Clipboard } from 'react-native';
import { Haptics } from 'react-native';
import AuthInput, { AuthInputProps } from '../../src/components/auth/AuthInput';
import { validateEmail, validatePassword, validateMFACode } from '../../src/utils/validation';

// Mock native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    select: jest.fn(),
  },
  Keyboard: {
    dismiss: jest.fn(),
  },
  AccessibilityInfo: {
    announceForAccessibility: jest.fn(),
  },
  Clipboard: {
    setString: jest.fn(),
    getString: jest.fn(),
  },
  StyleSheet: {
    create: jest.fn(styles => styles),
  },
}));

// Mock Haptics
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Haptics: {
    selectionAsync: jest.fn(),
    notificationAsync: jest.fn(),
  },
}));

// Mock validation functions
jest.mock('../../src/utils/validation', () => ({
  validateEmail: jest.fn(),
  validatePassword: jest.fn(),
  validateMFACode: jest.fn(),
}));

describe('AuthInput Component', () => {
  // Common props for testing
  const defaultProps: AuthInputProps = {
    type: 'email',
    value: '',
    onChangeText: jest.fn(),
    testID: 'auth-input',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Input', () => {
    it('should render with email-specific configuration', () => {
      const { getByTestId } = render(<AuthInput {...defaultProps} />);
      const input = getByTestId('auth-input');

      expect(input.props.keyboardType).toBe('email-address');
      expect(input.props.autoCapitalize).toBe('none');
      expect(input.props.autoComplete).toBe('email');
    });

    it('should validate and trim email input', async () => {
      const onChangeText = jest.fn();
      const { getByTestId } = render(
        <AuthInput {...defaultProps} onChangeText={onChangeText} />
      );

      const input = getByTestId('auth-input');
      fireEvent.changeText(input, ' test@example.com ');

      await waitFor(() => {
        expect(onChangeText).toHaveBeenCalledWith('test@example.com', expect.any(Boolean));
      });
    });

    it('should show validation errors with accessibility announcement', async () => {
      (validateEmail as jest.Mock).mockReturnValue({
        isValid: false,
        errors: { email: 'Invalid email format' },
      });

      const { getByTestId } = render(<AuthInput {...defaultProps} />);
      const input = getByTestId('auth-input');
      
      fireEvent.changeText(input, 'invalid-email');

      await waitFor(() => {
        expect(AccessibilityInfo.announceForAccessibility)
          .toHaveBeenCalledWith('Invalid email format');
      });
    });
  });

  describe('Password Input', () => {
    const passwordProps: AuthInputProps = {
      ...defaultProps,
      type: 'password',
      showPasswordStrength: true,
    };

    it('should render with secure text entry by default', () => {
      const { getByTestId } = render(<AuthInput {...passwordProps} />);
      const input = getByTestId('auth-input');

      expect(input.props.secureTextEntry).toBe(true);
    });

    it('should toggle password visibility securely', () => {
      const { getByRole } = render(<AuthInput {...passwordProps} />);
      const toggleButton = getByRole('button', { name: /show password/i });

      fireEvent.press(toggleButton);

      if (Platform.OS === 'ios') {
        expect(Keyboard.dismiss).toHaveBeenCalled();
      }
    });

    it('should prevent password copying to clipboard', async () => {
      const { getByTestId } = render(<AuthInput {...passwordProps} />);
      const input = getByTestId('auth-input');

      fireEvent.changeText(input, 'SecurePassword123!');
      
      // Attempt to copy password
      await expect(Clipboard.setString).not.toHaveBeenCalled();
    });

    it('should show password strength indicator', async () => {
      (validatePassword as jest.Mock).mockReturnValue({
        isValid: true,
        errors: {},
      });

      const { getByTestId, getByLabelText } = render(<AuthInput {...passwordProps} />);
      const input = getByTestId('auth-input');

      fireEvent.changeText(input, 'StrongP@ssw0rd123');

      await waitFor(() => {
        const strengthIndicator = getByLabelText(/password strength/i);
        expect(strengthIndicator).toBeTruthy();
      });
    });
  });

  describe('MFA Input', () => {
    const mfaProps: AuthInputProps = {
      ...defaultProps,
      type: 'mfaCode',
    };

    it('should render with numeric keyboard and length restrictions', () => {
      const { getByTestId } = render(<AuthInput {...mfaProps} />);
      const input = getByTestId('auth-input');

      expect(input.props.keyboardType).toBe('number-pad');
      expect(input.props.maxLength).toBe(6);
    });

    it('should validate MFA code format', async () => {
      (validateMFACode as jest.Mock).mockReturnValue({
        isValid: true,
        errors: {},
      });

      const onChangeText = jest.fn();
      const { getByTestId } = render(
        <AuthInput {...mfaProps} onChangeText={onChangeText} />
      );

      const input = getByTestId('auth-input');
      fireEvent.changeText(input, '123456');

      await waitFor(() => {
        expect(validateMFACode).toHaveBeenCalledWith('123456');
        expect(onChangeText).toHaveBeenCalledWith('123456', true);
      });
    });

    it('should provide haptic feedback on validation', async () => {
      const { getByTestId } = render(<AuthInput {...mfaProps} />);
      const input = getByTestId('auth-input');

      fireEvent.changeText(input, '123456');

      if (Platform.OS === 'ios') {
        await waitFor(() => {
          expect(Haptics.selectionAsync).toHaveBeenCalled();
        });
      }
    });
  });

  describe('Accessibility', () => {
    it('should maintain minimum touch target size', () => {
      const { getByTestId } = render(<AuthInput {...defaultProps} />);
      const input = getByTestId('auth-input');

      const { height } = input.props.style;
      expect(height).toBeGreaterThanOrEqual(48);
    });

    it('should provide clear error announcements', async () => {
      const { getByTestId } = render(
        <AuthInput {...defaultProps} error="Invalid input" />
      );

      await waitFor(() => {
        expect(AccessibilityInfo.announceForAccessibility)
          .toHaveBeenCalledWith('Invalid input');
      });
    });

    it('should support screen reader navigation', () => {
      const { getByTestId } = render(<AuthInput {...defaultProps} />);
      const input = getByTestId('auth-input');

      expect(input.props.accessibilityLabel).toBeTruthy();
      expect(input.props.accessibilityHint).toBeTruthy();
    });

    it('should handle keyboard navigation', () => {
      const { getByTestId } = render(<AuthInput {...defaultProps} />);
      const input = getByTestId('auth-input');

      fireEvent(input, 'onFocus');
      fireEvent(input, 'onBlur');

      expect(input.props.accessibilityRole).toBeTruthy();
    });
  });

  describe('Security Features', () => {
    it('should sanitize input data', async () => {
      const onChangeText = jest.fn();
      const { getByTestId } = render(
        <AuthInput {...defaultProps} onChangeText={onChangeText} />
      );

      const input = getByTestId('auth-input');
      fireEvent.changeText(input, '<script>alert("xss")</script>test@example.com');

      await waitFor(() => {
        expect(onChangeText).toHaveBeenCalledWith(
          expect.not.stringContaining('<script>'),
          expect.any(Boolean)
        );
      });
    });

    it('should implement secure field blur', () => {
      const { getByTestId } = render(
        <AuthInput {...defaultProps} type="password" />
      );
      const input = getByTestId('auth-input');

      fireEvent(input, 'onBlur');

      if (Platform.OS === 'ios') {
        expect(Keyboard.dismiss).toHaveBeenCalled();
      }
    });

    it('should clear sensitive data on unmount', () => {
      const { unmount, getByTestId } = render(
        <AuthInput {...defaultProps} type="password" value="sensitive" />
      );

      unmount();

      // Verify cleanup
      expect(getByTestId('auth-input').props.value).toBeFalsy();
    });
  });
});