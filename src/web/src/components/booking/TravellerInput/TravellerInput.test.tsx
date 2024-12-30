import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import TravellerInput from './TravellerInput';
import { TravellerDetails } from '../../../types/booking';
import { VALIDATION_MESSAGES } from '../../../constants/validation';

// Add jest-axe custom matchers
expect.extend(toHaveNoViolations);

// Mock data for testing
const mockTravellerDetails: TravellerDetails = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  dateOfBirth: new Date('1990-01-01'),
  nationality: 'US',
  passportNumber: 'AB123456',
  passportExpiry: new Date('2030-01-01'),
  specialRequests: []
};

describe('TravellerInput Component', () => {
  // Setup default props
  const defaultProps = {
    value: mockTravellerDetails,
    onChange: jest.fn(),
    testId: 'test-traveller-input'
  };

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Accessibility', () => {
    it('renders without accessibility violations', async () => {
      const { container } = render(<TravellerInput {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('renders all required input fields with proper labels', () => {
      render(<TravellerInput {...defaultProps} />);
      
      expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Nationality/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Passport Number/i)).toBeInTheDocument();
    });

    it('indicates required fields with proper ARIA attributes', () => {
      render(<TravellerInput {...defaultProps} isRequired={true} />);
      
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).toHaveAttribute('aria-required', 'true');
      });
    });
  });

  describe('Form Validation', () => {
    it('validates email format in real-time', async () => {
      const user = userEvent.setup();
      render(<TravellerInput {...defaultProps} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(VALIDATION_MESSAGES.email.invalid);
      });
    });

    it('validates phone number format', async () => {
      const user = userEvent.setup();
      render(<TravellerInput {...defaultProps} />);
      
      const phoneInput = screen.getByLabelText(/Phone/i);
      await user.clear(phoneInput);
      await user.type(phoneInput, 'invalid-phone');
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Invalid phone number');
      });
    });

    it('shows required field errors when fields are emptied', async () => {
      const user = userEvent.setup();
      render(<TravellerInput {...defaultProps} isRequired={true} />);
      
      const firstNameInput = screen.getByLabelText(/First Name/i);
      await user.clear(firstNameInput);
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(VALIDATION_MESSAGES.required);
      });
    });
  });

  describe('User Interaction', () => {
    it('calls onChange with updated values', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<TravellerInput {...defaultProps} onChange={onChange} />);
      
      const firstNameInput = screen.getByLabelText(/First Name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');
      
      expect(onChange).toHaveBeenCalled();
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
        firstName: 'Jane'
      }));
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<TravellerInput {...defaultProps} />);
      
      const firstNameInput = screen.getByLabelText(/First Name/i);
      firstNameInput.focus();
      
      await user.tab();
      expect(screen.getByLabelText(/Last Name/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/Email/i)).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    it('displays external errors passed via props', () => {
      const errors = {
        firstName: 'Custom error message'
      };
      
      render(<TravellerInput {...defaultProps} errors={errors} />);
      expect(screen.getByRole('alert')).toHaveTextContent('Custom error message');
    });

    it('announces errors to screen readers', async () => {
      const user = userEvent.setup();
      render(<TravellerInput {...defaultProps} isRequired={true} />);
      
      const inputs = screen.getAllByRole('textbox');
      for (const input of inputs) {
        await user.clear(input);
      }
      
      await waitFor(() => {
        const errorAnnouncement = screen.getByRole('alert');
        expect(errorAnnouncement).toBeInTheDocument();
        expect(errorAnnouncement).toHaveAttribute('aria-live', 'polite');
      });
    });
  });

  describe('Disabled State', () => {
    it('properly handles disabled state', () => {
      render(<TravellerInput {...defaultProps} disabled={true} />);
      
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).toBeDisabled();
      });
    });

    it('prevents user interaction when disabled', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<TravellerInput {...defaultProps} onChange={onChange} disabled={true} />);
      
      const firstNameInput = screen.getByLabelText(/First Name/i);
      await user.type(firstNameInput, 'Test');
      
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('debounces validation calls', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });
      const onChange = jest.fn();
      
      render(<TravellerInput {...defaultProps} onChange={onChange} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      await user.type(emailInput, 'test@test');
      
      expect(onChange).toHaveBeenCalledTimes(9); // One call per character
      
      jest.runAllTimers();
      
      // Validation should only be called once after debounce
      await waitFor(() => {
        expect(screen.queryByRole('alert')).toBeInTheDocument();
      });
      
      jest.useRealTimers();
    });
  });
});