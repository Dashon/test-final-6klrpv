/**
 * @fileoverview Test suite for BookingCard component
 * Verifies rendering, interactions, accessibility, and GDS integration
 * @version 1.0.0
 */

import React from 'react';
import { render, fireEvent, waitFor, screen, within } from '@testing-library/react-native';
import { jest } from '@jest/globals';
import { axe } from 'axe-react-native';
import BookingCard from '../../../src/components/booking/BookingCard';
import { useBooking } from '../../../src/hooks/useBooking';
import { BookingStatus, PaymentStatus } from '../../../src/types/booking';

// Mock the useBooking hook
jest.mock('../../../src/hooks/useBooking');

// Mock NetInfo for offline testing
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn()
}));

// Test data constants
const mockBooking = {
  id: 'test-booking-123',
  status: BookingStatus.CONFIRMED,
  paymentStatus: PaymentStatus.COMPLETED,
  totalAmount: 1000,
  currency: 'USD',
  paymentSplits: [
    { userId: 'user1', amount: 500, status: PaymentStatus.COMPLETED },
    { userId: 'user2', amount: 500, status: PaymentStatus.PENDING }
  ],
  groupSize: 3,
  amadeusPNR: 'ABC123',
  gdsBookingReference: 'GDS123'
};

describe('BookingCard Component', () => {
  // Setup before each test
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock useBooking implementation
    (useBooking as jest.Mock).mockReturnValue({
      cancelBooking: jest.fn(),
      updateSplitPayment: jest.fn(),
      checkInventoryStatus: jest.fn()
    });
  });

  describe('Rendering Tests', () => {
    it('renders booking details correctly', () => {
      const { getByText, getByTestId } = render(
        <BookingCard
          booking={mockBooking}
          onPress={jest.fn()}
          testID="booking-card"
        />
      );

      // Verify basic booking information
      expect(getByTestId('booking-card')).toBeTruthy();
      expect(getByText(`${mockBooking.totalAmount} ${mockBooking.currency}`)).toBeTruthy();
      expect(getByText(mockBooking.status)).toBeTruthy();
    });

    it('renders split payment information correctly', () => {
      const { getByText } = render(
        <BookingCard
          booking={mockBooking}
          onPress={jest.fn()}
        />
      );

      // Verify split payment details
      expect(getByText(/Split Payment Progress/)).toBeTruthy();
      expect(getByText(/500\/1000 USD/)).toBeTruthy();
    });

    it('renders group booking information when applicable', () => {
      const { getByText } = render(
        <BookingCard
          booking={mockBooking}
          onPress={jest.fn()}
        />
      );

      expect(getByText(`Group Booking: ${mockBooking.groupSize} travelers`)).toBeTruthy();
    });

    it('shows cancel button only for pending bookings', () => {
      const pendingBooking = { ...mockBooking, status: BookingStatus.PENDING };
      const { getByText } = render(
        <BookingCard
          booking={pendingBooking}
          onPress={jest.fn()}
        />
      );

      expect(getByText('Cancel Booking')).toBeTruthy();
    });
  });

  describe('Interaction Tests', () => {
    it('handles booking selection correctly', async () => {
      const onPressMock = jest.fn();
      const { getByTestId } = render(
        <BookingCard
          booking={mockBooking}
          onPress={onPressMock}
          testID="booking-card"
        />
      );

      fireEvent.press(getByTestId('booking-card'));
      await waitFor(() => {
        expect(onPressMock).toHaveBeenCalledWith(mockBooking);
      });
    });

    it('handles booking cancellation correctly', async () => {
      const { cancelBooking } = useBooking();
      const pendingBooking = { ...mockBooking, status: BookingStatus.PENDING };
      const onCancelPress = jest.fn();

      const { getByText } = render(
        <BookingCard
          booking={pendingBooking}
          onPress={jest.fn()}
          onCancelPress={onCancelPress}
        />
      );

      fireEvent.press(getByText('Cancel Booking'));
      await waitFor(() => {
        expect(cancelBooking).toHaveBeenCalledWith(pendingBooking.id);
        expect(onCancelPress).toHaveBeenCalledWith(pendingBooking);
      });
    });

    it('handles split payment updates correctly', async () => {
      const { updateSplitPayment } = useBooking();
      const { getByTestId } = render(
        <BookingCard
          booking={mockBooking}
          onPress={jest.fn()}
          onSplitPaymentUpdate={jest.fn()}
        />
      );

      const progressBar = getByTestId('split-payment-progress');
      expect(progressBar).toBeTruthy();
      expect(within(progressBar).getByTestId('progress-fill')).toHaveStyle({
        width: '50%' // 500/1000 = 50%
      });
    });
  });

  describe('Accessibility Tests', () => {
    it('meets accessibility requirements', async () => {
      const { container } = render(
        <BookingCard
          booking={mockBooking}
          onPress={jest.fn()}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper accessibility labels', () => {
      const { getByRole } = render(
        <BookingCard
          booking={mockBooking}
          onPress={jest.fn()}
        />
      );

      expect(getByRole('button')).toHaveAccessibilityHint('Double tap to view booking details');
      expect(getByRole('text', { name: mockBooking.status })).toBeTruthy();
    });
  });

  describe('Integration Tests', () => {
    it('integrates with Amadeus GDS correctly', async () => {
      const { checkInventoryStatus } = useBooking();
      render(
        <BookingCard
          booking={mockBooking}
          onPress={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(checkInventoryStatus).toHaveBeenCalledWith(mockBooking.id);
      });
    });

    it('handles offline mode gracefully', async () => {
      const NetInfo = require('@react-native-community/netinfo');
      NetInfo.fetch.mockResolvedValueOnce({ isConnected: false });

      const { getByText } = render(
        <BookingCard
          booking={mockBooking}
          onPress={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(getByText(mockBooking.status)).toHaveStyle({
          opacity: 0.7 // Indicates offline state
        });
      });
    });

    it('updates UI based on inventory status changes', async () => {
      const { checkInventoryStatus } = useBooking();
      checkInventoryStatus.mockResolvedValueOnce('limited');

      const { getByTestId } = render(
        <BookingCard
          booking={mockBooking}
          onPress={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(getByTestId('inventory-status')).toHaveTextContent('Limited Availability');
      });
    });
  });

  describe('Error Handling', () => {
    it('handles cancellation errors gracefully', async () => {
      const { cancelBooking } = useBooking();
      cancelBooking.mockRejectedValueOnce(new Error('Cancellation failed'));

      const { getByText } = render(
        <BookingCard
          booking={{ ...mockBooking, status: BookingStatus.PENDING }}
          onPress={jest.fn()}
        />
      );

      fireEvent.press(getByText('Cancel Booking'));
      await waitFor(() => {
        expect(getByText('Failed to cancel booking')).toBeTruthy();
      });
    });

    it('retries failed GDS operations', async () => {
      const { checkInventoryStatus } = useBooking();
      checkInventoryStatus
        .mockRejectedValueOnce(new Error('GDS Error'))
        .mockResolvedValueOnce('available');

      render(
        <BookingCard
          booking={mockBooking}
          onPress={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(checkInventoryStatus).toHaveBeenCalledTimes(2);
      });
    });
  });
});