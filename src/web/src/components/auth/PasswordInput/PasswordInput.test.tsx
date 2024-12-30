import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import PasswordInput from './PasswordInput';
import { validatePassword } from '../../../utils/validation';
import { PASSWORD_RULES } from '../../../constants/validation';

// Mock validatePassword to control validation results
jest.mock('../../../utils/validation', () => ({
  validatePassword: jest.fn()
}));

describe('PasswordInput Component', () => {
  // Common test setup
  const setupTest = () => {
    const handleChange = jest.fn();
    const user = userEvent.setup();
    const defaultProps = {
      value: '',
      onChange: handleChange,
      label: 'Password',
      showStrengthIndicator: true,
      allowVisibilityToggle: true,
      showRequirements: true
    };
    
    return {
      handleChange,
      user,
      defaultProps
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      const { defaultProps } = setupTest();
      render(<PasswordInput {...defaultProps} />);

      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByRole('list', { name: /password requirements/i })).toBeInTheDocument();
    });

    it('renders without optional features when disabled', () => {
      const { defaultProps } = setupTest();
      render(
        <PasswordInput
          {...defaultProps}
          showStrengthIndicator={false}
          allowVisibilityToggle={false}
          showRequirements={false}
        />
      );

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /show password/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('list', { name: /password requirements/i })).not.toBeInTheDocument();
    });
  });

  describe('Password Visibility Toggle', () => {
    it('toggles password visibility correctly', async () => {
      const { defaultProps, user } = setupTest();
      render(<PasswordInput {...defaultProps} />);

      const input = screen.getByLabelText(/password/i);
      const toggleButton = screen.getByRole('button', { name: /show password/i });

      expect(input).toHaveAttribute('type', 'password');
      
      await user.click(toggleButton);
      expect(input).toHaveAttribute('type', 'text');
      expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
      
      await user.click(toggleButton);
      expect(input).toHaveAttribute('type', 'password');
      expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('announces visibility changes to screen readers', async () => {
      const { defaultProps, user } = setupTest();
      render(<PasswordInput {...defaultProps} />);

      const toggleButton = screen.getByRole('button', { name: /show password/i });
      
      await user.click(toggleButton);
      expect(screen.getByRole('alert')).toHaveTextContent(/password shown/i);
      
      await user.click(toggleButton);
      expect(screen.getByRole('alert')).toHaveTextContent(/password hidden/i);
    });
  });

  describe('Password Strength Indicator', () => {
    it('displays correct strength level based on password content', async () => {
      const { defaultProps, user } = setupTest();
      render(<PasswordInput {...defaultProps} />);

      const input = screen.getByLabelText(/password/i);
      const progressBar = screen.getByRole('progressbar');

      // Test weak password
      await user.type(input, 'weak');
      expect(progressBar).toHaveAttribute('aria-valuenow', '25');
      expect(screen.getByText(/weak/i)).toBeInTheDocument();

      // Test moderate password
      await user.clear(input);
      await user.type(input, 'Moderate123');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(screen.getByText(/moderate/i)).toBeInTheDocument();

      // Test strong password
      await user.clear(input);
      await user.type(input, 'StrongP@ssw0rd123');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
      expect(screen.getByText(/strong/i)).toBeInTheDocument();
    });
  });

  describe('Password Requirements', () => {
    it('updates requirement checks as password is typed', async () => {
      const { defaultProps, user } = setupTest();
      render(<PasswordInput {...defaultProps} />);

      const input = screen.getByLabelText(/password/i);
      
      // Initial state - all requirements unchecked
      const requirements = screen.getAllByRole('listitem');
      requirements.forEach(req => {
        expect(req).toHaveClass('text-textSecondary');
      });

      // Type valid password meeting all requirements
      await user.type(input, 'StrongP@ssw0rd123');
      
      // Verify each requirement is checked
      expect(screen.getByText(`At least ${PASSWORD_RULES.minLength} characters`))
        .toHaveClass('text-success');
      expect(screen.getByText('At least one uppercase letter'))
        .toHaveClass('text-success');
      expect(screen.getByText('At least one number'))
        .toHaveClass('text-success');
      expect(screen.getByText('At least one special character'))
        .toHaveClass('text-success');
    });
  });

  describe('Validation and Error Handling', () => {
    it('displays error message when provided', () => {
      const { defaultProps } = setupTest();
      const errorMessage = 'Password is required';
      
      render(<PasswordInput {...defaultProps} error={errorMessage} />);
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('aria-invalid', 'true');
    });

    it('calls onChange with validation result', async () => {
      const { defaultProps, user, handleChange } = setupTest();
      const mockValidation = { isValid: true, errors: {} };
      (validatePassword as jest.Mock).mockReturnValue(mockValidation);

      render(<PasswordInput {...defaultProps} />);
      
      await user.type(screen.getByLabelText(/password/i), 'TestP@ssw0rd');
      
      expect(handleChange).toHaveBeenCalledWith('TestP@ssw0rd', true);
      expect(validatePassword).toHaveBeenCalledWith('TestP@ssw0rd');
    });
  });

  describe('Accessibility', () => {
    it('supports keyboard navigation', async () => {
      const { defaultProps, user } = setupTest();
      render(<PasswordInput {...defaultProps} />);

      const input = screen.getByLabelText(/password/i);
      const toggleButton = screen.getByRole('button', { name: /show password/i });

      // Test keyboard focus management
      await user.tab();
      expect(input).toHaveFocus();

      await user.tab();
      expect(toggleButton).toHaveFocus();
    });

    it('provides appropriate ARIA attributes', () => {
      const { defaultProps } = setupTest();
      render(<PasswordInput {...defaultProps} />);

      const input = screen.getByLabelText(/password/i);
      const strengthIndicator = screen.getByRole('progressbar');
      const requirements = screen.getByRole('list', { name: /password requirements/i });

      expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('strength-'));
      expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('requirements-'));
      expect(strengthIndicator).toHaveAttribute('aria-label', expect.stringContaining('Password strength'));
      expect(requirements).toBeInTheDocument();
    });
  });
});