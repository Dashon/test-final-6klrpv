import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { act } from 'react-dom/test-utils';
import AuthForm from './AuthForm';
import { useAuth } from '../../../hooks/useAuth';
import { ErrorCode } from '../../../../backend/shared/constants/error-codes';
import { VALIDATION_MESSAGES } from '../../../constants/validation';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock useAuth hook
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

// Mock auth handlers
const mockHandleLogin = jest.fn();
const mockHandleRegister = jest.fn();
const mockHandleMFAChallenge = jest.fn();
const mockHandleSocialAuth = jest.fn();

// Test data
const validLoginData = {
  email: 'test@example.com',
  password: 'Test123!@#'
};

const validRegistrationData = {
  email: 'test@example.com',
  password: 'Test123!@#',
  firstName: 'Test',
  lastName: 'User',
  acceptTerms: true
};

const invalidData = {
  email: 'invalid-email',
  password: 'weak',
  mfaCode: '12345' // Invalid length
};

describe('AuthForm Component', () => {
  // Setup before each test
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      handleLogin: mockHandleLogin,
      handleRegister: mockHandleRegister,
      handleMFAChallenge: mockHandleMFAChallenge,
      handleSocialAuth: mockHandleSocialAuth
    });
  });

  // Clear mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Login Form', () => {
    it('renders login form with all required fields', () => {
      render(
        <AuthForm 
          formType="login"
          onSuccess={jest.fn()}
          onError={jest.fn()}
          onMFARequired={jest.fn()}
        />
      );

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('handles successful login', async () => {
      const onSuccess = jest.fn();
      mockHandleLogin.mockResolvedValueOnce({ accessToken: 'test-token' });

      render(
        <AuthForm 
          formType="login"
          onSuccess={onSuccess}
          onError={jest.fn()}
          onMFARequired={jest.fn()}
        />
      );

      await act(async () => {
        await userEvent.type(screen.getByLabelText(/email address/i), validLoginData.email);
        await userEvent.type(screen.getByLabelText(/password/i), validLoginData.password);
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      });

      await waitFor(() => {
        expect(mockHandleLogin).toHaveBeenCalledWith({
          email: validLoginData.email,
          password: validLoginData.password
        });
        expect(onSuccess).toHaveBeenCalledWith('test-token');
      });
    });

    it('handles MFA challenge', async () => {
      const onMFARequired = jest.fn();
      mockHandleLogin.mockResolvedValueOnce({ mfaRequired: true, challengeId: 'test-challenge' });

      render(
        <AuthForm 
          formType="login"
          onSuccess={jest.fn()}
          onError={jest.fn()}
          onMFARequired={onMFARequired}
        />
      );

      await act(async () => {
        await userEvent.type(screen.getByLabelText(/email address/i), validLoginData.email);
        await userEvent.type(screen.getByLabelText(/password/i), validLoginData.password);
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      });

      await waitFor(() => {
        expect(onMFARequired).toHaveBeenCalledWith('test-challenge');
        expect(screen.getByLabelText(/mfa code/i)).toBeInTheDocument();
      });
    });

    it('validates email format', async () => {
      render(
        <AuthForm 
          formType="login"
          onSuccess={jest.fn()}
          onError={jest.fn()}
          onMFARequired={jest.fn()}
        />
      );

      await act(async () => {
        await userEvent.type(screen.getByLabelText(/email address/i), invalidData.email);
        fireEvent.blur(screen.getByLabelText(/email address/i));
      });

      expect(await screen.findByText(VALIDATION_MESSAGES.email.format)).toBeInTheDocument();
    });
  });

  describe('Registration Form', () => {
    it('renders registration form with all required fields', () => {
      render(
        <AuthForm 
          formType="register"
          onSuccess={jest.fn()}
          onError={jest.fn()}
          onMFARequired={jest.fn()}
        />
      );

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/terms and conditions/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('handles successful registration', async () => {
      const onSuccess = jest.fn();
      mockHandleRegister.mockResolvedValueOnce({ accessToken: 'test-token' });

      render(
        <AuthForm 
          formType="register"
          onSuccess={onSuccess}
          onError={jest.fn()}
          onMFARequired={jest.fn()}
        />
      );

      await act(async () => {
        await userEvent.type(screen.getByLabelText(/email address/i), validRegistrationData.email);
        await userEvent.type(screen.getByLabelText(/^password$/i), validRegistrationData.password);
        await userEvent.type(screen.getByLabelText(/confirm password/i), validRegistrationData.password);
        await userEvent.type(screen.getByLabelText(/first name/i), validRegistrationData.firstName);
        await userEvent.type(screen.getByLabelText(/last name/i), validRegistrationData.lastName);
        await userEvent.click(screen.getByLabelText(/terms and conditions/i));
        fireEvent.click(screen.getByRole('button', { name: /create account/i }));
      });

      await waitFor(() => {
        expect(mockHandleRegister).toHaveBeenCalledWith(validRegistrationData);
        expect(onSuccess).toHaveBeenCalledWith('test-token');
      });
    });
  });

  describe('Social Authentication', () => {
    it('handles Google authentication', async () => {
      render(
        <AuthForm 
          formType="login"
          onSuccess={jest.fn()}
          onError={jest.fn()}
          onMFARequired={jest.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
      });

      expect(mockHandleSocialAuth).toHaveBeenCalledWith('google');
    });

    it('handles Facebook authentication', async () => {
      render(
        <AuthForm 
          formType="login"
          onSuccess={jest.fn()}
          onError={jest.fn()}
          onMFARequired={jest.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /sign in with facebook/i }));
      });

      expect(mockHandleSocialAuth).toHaveBeenCalledWith('facebook');
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(
        <AuthForm 
          formType="login"
          onSuccess={jest.fn()}
          onError={jest.fn()}
          onMFARequired={jest.fn()}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', async () => {
      render(
        <AuthForm 
          formType="login"
          onSuccess={jest.fn()}
          onError={jest.fn()}
          onMFARequired={jest.fn()}
        />
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await userEvent.tab();
      expect(emailInput).toHaveFocus();

      await userEvent.tab();
      expect(passwordInput).toHaveFocus();
    });

    it('announces form errors to screen readers', async () => {
      render(
        <AuthForm 
          formType="login"
          onSuccess={jest.fn()}
          onError={jest.fn()}
          onMFARequired={jest.fn()}
        />
      );

      await act(async () => {
        await userEvent.type(screen.getByLabelText(/email address/i), invalidData.email);
        fireEvent.blur(screen.getByLabelText(/email address/i));
      });

      const errorMessage = await screen.findByRole('alert');
      expect(errorMessage).toHaveTextContent(VALIDATION_MESSAGES.email.format);
    });
  });
});