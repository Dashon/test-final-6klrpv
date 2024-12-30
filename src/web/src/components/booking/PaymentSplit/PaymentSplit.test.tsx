import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentSplit } from './PaymentSplit';
import { PaymentStatus } from '../../../types/booking';
import { useBooking } from '../../../hooks/useBooking';

// Mock useBooking hook
jest.mock('../../../hooks/useBooking', () => ({
  useBooking: jest.fn()
}));

// Test data constants
const mockBookingId = 'test-booking-123';
const mockTotalAmount = 1000;
const mockCurrency = 'USD';
const mockParticipants = [
  { id: 'user1', name: 'John', status: PaymentStatus.PENDING },
  { id: 'user2', name: 'Sarah', status: PaymentStatus.PENDING }
];

// Mock callback functions
const mockOnSplitComplete = jest.fn();
const mockProcessSplitPayment = jest.fn();
const mockTrackPaymentStatus = jest.fn();

describe('PaymentSplit Component', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup default useBooking mock implementation
    (useBooking as jest.Mock).mockImplementation(() => ({
      processSplitPayment: mockProcessSplitPayment,
      trackPaymentStatus: mockTrackPaymentStatus,
      loading: { payment: false },
      error: null
    }));
  });

  it('renders payment split interface correctly', () => {
    render(
      <PaymentSplit
        bookingId={mockBookingId}
        totalAmount={mockTotalAmount}
        currency={mockCurrency}
        participants={mockParticipants}
        onSplitComplete={mockOnSplitComplete}
      />
    );

    // Verify component title
    expect(screen.getByText('Split Payment')).toBeInTheDocument();

    // Verify split equally button
    expect(screen.getByText('Split Equally')).toBeInTheDocument();

    // Verify participant inputs
    mockParticipants.forEach(participant => {
      expect(screen.getByLabelText(participant.name)).toBeInTheDocument();
    });

    // Verify confirm button
    expect(screen.getByText('Confirm Split Payment')).toBeInTheDocument();
  });

  it('handles equal split functionality correctly', async () => {
    render(
      <PaymentSplit
        bookingId={mockBookingId}
        totalAmount={mockTotalAmount}
        currency={mockCurrency}
        participants={mockParticipants}
        onSplitComplete={mockOnSplitComplete}
      />
    );

    // Click split equally button
    fireEvent.click(screen.getByText('Split Equally'));

    // Calculate expected equal split amount
    const expectedAmount = (mockTotalAmount / mockParticipants.length).toFixed(2);

    // Verify each participant's amount is set correctly
    mockParticipants.forEach(participant => {
      const input = screen.getByLabelText(participant.name) as HTMLInputElement;
      expect(input.value).toBe(expectedAmount);
    });

    // Verify no remaining amount is shown
    expect(screen.queryByText(/Remaining:/)).not.toBeInTheDocument();
  });

  it('validates minimum payment amounts', async () => {
    render(
      <PaymentSplit
        bookingId={mockBookingId}
        totalAmount={mockTotalAmount}
        currency={mockCurrency}
        participants={mockParticipants}
        onSplitComplete={mockOnSplitComplete}
        minPaymentAmount={100}
      />
    );

    // Enter invalid amount
    const input = screen.getByLabelText(mockParticipants[0].name);
    await userEvent.clear(input);
    await userEvent.type(input, '50');

    // Verify error message
    expect(screen.getByText(/Minimum payment amount is/)).toBeInTheDocument();

    // Verify submit button is disabled
    expect(screen.getByText('Confirm Split Payment')).toBeDisabled();
  });

  it('processes split payment successfully', async () => {
    mockProcessSplitPayment.mockResolvedValueOnce({ status: 'success' });

    render(
      <PaymentSplit
        bookingId={mockBookingId}
        totalAmount={mockTotalAmount}
        currency={mockCurrency}
        participants={mockParticipants}
        onSplitComplete={mockOnSplitComplete}
      />
    );

    // Split equally
    fireEvent.click(screen.getByText('Split Equally'));

    // Submit split payment
    fireEvent.click(screen.getByText('Confirm Split Payment'));

    await waitFor(() => {
      // Verify processSplitPayment was called with correct arguments
      expect(mockProcessSplitPayment).toHaveBeenCalledWith(
        mockBookingId,
        expect.arrayContaining([
          expect.objectContaining({
            userId: mockParticipants[0].id,
            amount: mockTotalAmount / 2
          }),
          expect.objectContaining({
            userId: mockParticipants[1].id,
            amount: mockTotalAmount / 2
          })
        ])
      );

      // Verify onSplitComplete callback
      expect(mockOnSplitComplete).toHaveBeenCalledWith(
        expect.any(Array),
        PaymentStatus.COMPLETED
      );
    });
  });

  it('handles payment processing errors', async () => {
    const errorMessage = 'Payment processing failed';
    (useBooking as jest.Mock).mockImplementation(() => ({
      processSplitPayment: mockProcessSplitPayment,
      trackPaymentStatus: mockTrackPaymentStatus,
      loading: { payment: false },
      error: { payment: { message: errorMessage } }
    }));

    render(
      <PaymentSplit
        bookingId={mockBookingId}
        totalAmount={mockTotalAmount}
        currency={mockCurrency}
        participants={mockParticipants}
        onSplitComplete={mockOnSplitComplete}
      />
    );

    // Split equally and submit
    fireEvent.click(screen.getByText('Split Equally'));
    fireEvent.click(screen.getByText('Confirm Split Payment'));

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('displays loading state during payment processing', async () => {
    (useBooking as jest.Mock).mockImplementation(() => ({
      processSplitPayment: mockProcessSplitPayment,
      trackPaymentStatus: mockTrackPaymentStatus,
      loading: { payment: true },
      error: null
    }));

    render(
      <PaymentSplit
        bookingId={mockBookingId}
        totalAmount={mockTotalAmount}
        currency={mockCurrency}
        participants={mockParticipants}
        onSplitComplete={mockOnSplitComplete}
      />
    );

    // Split equally and submit
    fireEvent.click(screen.getByText('Split Equally'));
    fireEvent.click(screen.getByText('Confirm Split Payment'));

    // Verify loading state
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(screen.getByText('Processing...')).toBeDisabled();
  });

  it('updates remaining amount when split amounts change', async () => {
    render(
      <PaymentSplit
        bookingId={mockBookingId}
        totalAmount={mockTotalAmount}
        currency={mockCurrency}
        participants={mockParticipants}
        onSplitComplete={mockOnSplitComplete}
      />
    );

    // Enter amount for first participant
    const input = screen.getByLabelText(mockParticipants[0].name);
    await userEvent.clear(input);
    await userEvent.type(input, '600');

    // Verify remaining amount
    expect(screen.getByText(/Remaining: \$400/)).toBeInTheDocument();
  });
});