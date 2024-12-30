/**
 * @fileoverview Test suite for AuthInput component with iOS-specific functionality
 * Validates authentication input behavior, accessibility, and styling compliance
 * @version 1.0.0
 */

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, Keyboard, Platform } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import AuthInput from '../../../src/components/auth/AuthInput';
import { validateEmail } from '../../../src/utils/validation';
import { colors } from '../../../src/constants/colors';

// Mock native modules and dependencies
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn((obj) => obj.ios),
}));

jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  AccessibilityInfo: {
    announceForAccessibility: jest.fn(),
    isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
  },
  Keyboard: {
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    dismiss: jest.fn(),
  },
}));

// Test constants
const mockValidEmail = 'test@example.com';
const mockInvalidEmail = 'invalid-email';
const mockPassword = 'Password123!';
const mockWeakPassword = 'weak';

describe('AuthInput Component - iOS', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Styling', () => {
    it('renders with correct iOS-specific styles', () => {
      const { getByTestId } = render(
        <AuthInput
          type="email"
          value=""
          onChangeText={jest.fn()}
          testID="auth-input-email"
        />
      );

      const input = getByTestId('auth-input-email');
      expect(input).toBeTruthy();
      expect(input.props.style).toContainEqual(expect.objectContaining({
        shadowColor: colors.border.default,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }));
    });

    it('applies error styles when error prop is provided', () => {
      const { getByTestId } = render(
        <AuthInput
          type="email"
          value=""
          onChangeText={jest.fn()}
          error="Invalid email"
          testID="auth-input-email"
        />
      );

      const input = getByTestId('auth-input-email');
      expect(input.props.style).toContainEqual(expect.objectContaining({
        borderColor: colors.error.default,
        borderWidth: 1,
      }));
    });
  });

  describe('Email Input Validation', () => {
    it('validates email format and triggers haptic feedback on valid input', async () => {
      const mockOnChangeText = jest.fn();
      const { getByTestId } = render(
        <AuthInput
          type="email"
          value=""
          onChangeText={mockOnChangeText}
          testID="auth-input-email"
        />
      );

      const input = getByTestId('auth-input-email');
      await act(async () => {
        fireEvent.changeText(input, mockValidEmail);
      });

      expect(mockOnChangeText).toHaveBeenCalledWith(mockValidEmail, true);
      expect(ReactNativeHapticFeedback.trigger).toHaveBeenCalledWith(
        'impactLight',
        expect.any(Object)
      );
    });

    it('shows error and triggers error haptic feedback for invalid email', async () => {
      const mockOnChangeText = jest.fn();
      const { getByTestId } = render(
        <AuthInput
          type="email"
          value=""
          onChangeText={mockOnChangeText}
          testID="auth-input-email"
        />
      );

      const input = getByTestId('auth-input-email');
      await act(async () => {
        fireEvent.changeText(input, mockInvalidEmail);
      });

      expect(mockOnChangeText).toHaveBeenCalledWith(mockInvalidEmail, false);
      expect(ReactNativeHapticFeedback.trigger).toHaveBeenCalledWith(
        'notificationError',
        expect.any(Object)
      );
    });
  });

  describe('Password Input Security', () => {
    it('handles secure text entry correctly', () => {
      const { getByTestId } = render(
        <AuthInput
          type="password"
          value=""
          onChangeText={jest.fn()}
          testID="auth-input-password"
        />
      );

      const input = getByTestId('auth-input-password');
      expect(input.props.secureTextEntry).toBe(true);
    });

    it('validates password strength and provides feedback', async () => {
      const mockOnChangeText = jest.fn();
      const { getByTestId } = render(
        <AuthInput
          type="password"
          value=""
          onChangeText={mockOnChangeText}
          testID="auth-input-password"
        />
      );

      const input = getByTestId('auth-input-password');
      await act(async () => {
        fireEvent.changeText(input, mockWeakPassword);
      });

      expect(mockOnChangeText).toHaveBeenCalledWith(mockWeakPassword, false);
      expect(ReactNativeHapticFeedback.trigger).toHaveBeenCalledWith(
        'notificationError',
        expect.any(Object)
      );
    });
  });

  describe('Accessibility Features', () => {
    it('provides correct accessibility props', () => {
      const { getByTestId } = render(
        <AuthInput
          type="email"
          value=""
          onChangeText={jest.fn()}
          placeholder="Enter email"
          testID="auth-input-email"
        />
      );

      const input = getByTestId('auth-input-email');
      expect(input.props.accessibilityLabel).toBe('email input field');
      expect(input.props.accessibilityHint).toBe('Enter email');
      expect(input.props.accessibilityRole).toBe('text');
    });

    it('announces validation errors to screen readers', async () => {
      // Mock screen reader enabled
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockImplementation(() => 
        Promise.resolve(true)
      );

      const { getByTestId } = render(
        <AuthInput
          type="email"
          value=""
          onChangeText={jest.fn()}
          testID="auth-input-email"
        />
      );

      const input = getByTestId('auth-input-email');
      await act(async () => {
        fireEvent.changeText(input, mockInvalidEmail);
      });

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalled();
    });
  });

  describe('Keyboard Handling', () => {
    it('validates input on keyboard dismiss', async () => {
      const mockOnChangeText = jest.fn();
      render(
        <AuthInput
          type="email"
          value={mockInvalidEmail}
          onChangeText={mockOnChangeText}
          testID="auth-input-email"
        />
      );

      // Simulate keyboard hide
      const keyboardListener = Keyboard.addListener.mock.calls[0][1];
      await act(async () => {
        keyboardListener();
      });

      expect(mockOnChangeText).toHaveBeenCalledWith(mockInvalidEmail, false);
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('removes keyboard listener on unmount', () => {
      const { unmount } = render(
        <AuthInput
          type="email"
          value=""
          onChangeText={jest.fn()}
        />
      );

      const mockRemove = Keyboard.addListener().remove;
      unmount();
      expect(mockRemove).toHaveBeenCalled();
    });
  });
});