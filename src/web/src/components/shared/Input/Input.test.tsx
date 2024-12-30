import React from 'react';
import { render, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import Input from './Input';
import { VALIDATION_MESSAGES } from '../../../constants/validation';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Helper function to setup userEvent
const setupUserEvent = () => userEvent.setup();

// Helper function to render Input with default props
const renderInput = (props = {}) => {
  const defaultProps = {
    id: 'test-input',
    name: 'test-input',
    value: '',
    onChange: jest.fn(),
    'data-testid': 'input-component',
  };
  return render(<Input {...defaultProps} {...props} />);
};

describe('Input Component', () => {
  // Common test props and mocks
  let onChange: jest.Mock;
  let onBlur: jest.Mock;
  let onFocus: jest.Mock;
  let user: ReturnType<typeof setupUserEvent>;

  beforeEach(() => {
    onChange = jest.fn();
    onBlur = jest.fn();
    onFocus = jest.fn();
    user = setupUserEvent();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      renderInput();
      const input = screen.getByTestId('input-component');
      expect(input).toBeInTheDocument();
    });

    it('applies correct HTML attributes', () => {
      renderInput({
        type: 'email',
        placeholder: 'Enter email',
        required: true,
        disabled: false,
        autoComplete: 'email',
        inputMode: 'email',
        maxLength: 50,
        pattern: '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$',
      });

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('placeholder', 'Enter email');
      expect(input).toHaveAttribute('required');
      expect(input).toHaveAttribute('autocomplete', 'email');
      expect(input).toHaveAttribute('inputmode', 'email');
      expect(input).toHaveAttribute('maxlength', '50');
      expect(input).toHaveAttribute('pattern');
    });

    it('renders label correctly when provided', () => {
      renderInput({ label: 'Email Address', required: true });
      const label = screen.getByText('Email Address');
      expect(label).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('handles text input correctly', async () => {
      renderInput({ onChange });
      const input = screen.getByRole('textbox');
      await user.type(input, 'test@example.com');
      expect(onChange).toHaveBeenCalledTimes(15); // One call per character
      expect(onChange).toHaveBeenLastCalledWith('test@example.com');
    });

    it('maintains cursor position on controlled updates', async () => {
      const { rerender } = renderInput({ value: 'initial', onChange });
      const input = screen.getByRole('textbox') as HTMLInputElement;
      
      // Set cursor position
      input.setSelectionRange(3, 3);
      await user.type(input, 'test');
      
      // Rerender with new value
      rerender(<Input value="initial test" onChange={onChange} />);
      
      expect(input.selectionStart).toBe(3);
    });

    it('handles paste events properly', async () => {
      renderInput({ onChange });
      const input = screen.getByRole('textbox');
      await user.paste('pasted text');
      expect(onChange).toHaveBeenCalledWith('pasted text');
    });
  });

  describe('Error Handling', () => {
    it('displays error message correctly', () => {
      const errorMessage = 'Invalid input';
      renderInput({ error: errorMessage });
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('applies error styling', () => {
      renderInput({ error: 'Error message' });
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-error');
    });

    it('shows required validation message for empty required field', async () => {
      renderInput({ required: true });
      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.tab();
      expect(screen.getByText(VALIDATION_MESSAGES.required)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      renderInput({
        label: 'Test Input',
        required: true,
        error: 'Error message',
      });
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby');
    });

    it('supports keyboard navigation', async () => {
      renderInput();
      const input = screen.getByRole('textbox');
      await user.tab();
      expect(input).toHaveFocus();
    });

    it('announces error messages to screen readers', () => {
      renderInput({ error: 'Error message' });
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toBeInTheDocument();
    });

    it('passes accessibility audit', async () => {
      const { container } = renderInput({
        label: 'Test Input',
        required: true,
      });
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Mobile Compatibility', () => {
    it('sets correct input mode for different types', () => {
      const { rerender } = renderInput({ type: 'email' });
      expect(screen.getByRole('textbox')).toHaveAttribute('inputmode', 'email');

      rerender(<Input type="tel" value="" onChange={onChange} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('inputmode', 'tel');

      rerender(<Input type="number" value="" onChange={onChange} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('inputmode', 'numeric');
    });

    it('handles touch events', async () => {
      renderInput({ onChange });
      const input = screen.getByRole('textbox');
      
      // Simulate touch interaction
      await user.click(input);
      fireEvent.touchStart(input);
      fireEvent.touchEnd(input);
      
      expect(input).toHaveFocus();
    });

    it('supports virtual keyboard interactions', async () => {
      renderInput({ onChange });
      const input = screen.getByRole('textbox');
      
      // Simulate virtual keyboard input
      await user.type(input, 'test');
      fireEvent.compositionStart(input);
      fireEvent.compositionEnd(input, { data: 'test' });
      
      expect(onChange).toHaveBeenCalledWith('test');
    });
  });
});