/**
 * @fileoverview Test suite for the BookingCard component
 * Verifies booking display, status management, payment handling, and user interactions
 * @version 1.0.0
 */

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import BookingCard, { BookingCardProps } from '../../src/components/booking/BookingCard';
import { 
  Booking, 
  BookingStatus, 
  PaymentStatus, 
  AmadeusBookingDetails 
} from '../../src/types/booking';
import useBooking from '../../src/hooks/useBooking';

// Mock the native modules and hooks
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('react-native/Libraries/Alert/Alert');
jest.mock('../../src/hooks/useBooking');

// Mock data for testing
const mockAmadeusDetails: AmadeusBookingDetails = {
  itineraryType: 'ROUND_TRIP',
  origin: 'NYC',
  destination: 'PAR',
  departureDate: new Date('2024-06-15'),
  returnDate: new Date('2024-06-20'),
  passengers: 2,
  cabinClass: 'economy',
  fareType: 'standard',
  segmentDetails: []
};

const mockBooking: Booking = {
  id: 'booking-123',
  userId: 'user-123',
  status: BookingStatus.PENDING,
  paymentStatus: PaymentStatus.PENDING,
  amadeusPNR: 'ABC123',
  totalAmount: 1500,
  currency: 'USD',
  travellerDetails: [],
  paymentSplits: [],
  bookingDetails: mockAmadeusDetails,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  cancellationPolicy: {},
  specialRequests: []
};

describe('BookingCard Component', () => {
  // Setup mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    (Alert.alert as jest.Mock).mockImplementation(() => {});
  });

  it('renders booking details correctly', () => {
    const { getByText, getByTestId } = render(
      <BookingCard 
        booking={mockBooking}
        testID="booking-card"
      />
    );

    // Verify PNR display
    expect(getByText('ABC123')).toBeTruthy();

    // Verify status badge
    expect(getByText('PENDING')).toBeTruthy();

    // Verify travel details
    expect(getByText('NYC → PAR')).toBeTruthy();

    // Verify amount display
    expect(getByText('$1,500.00')).toBeTruthy();
  });

  it('handles status changes correctly', async () => {
    const mockHandleStatusChange = jest.fn();
    const { getByTestId } = render(
      <BookingCard 
        booking={mockBooking}
        onStatusChange={mockHandleStatusChange}
        testID="booking-card"
      />
    );

    // Simulate status change interaction
    await act(async () => {
      fireEvent.press(getByTestId('booking-card'));
    });

    expect(mockHandleStatusChange).toHaveBeenCalledWith(
      'booking-123',
      expect.any(String)
    );
  });

  it('displays payment button when payment is pending', () => {
    const { getByText } = render(
      <BookingCard 
        booking={{
          ...mockBooking,
          paymentStatus: PaymentStatus.PENDING
        }}
      />
    );

    expect(getByText('Complete Payment')).toBeTruthy();
  });

  it('handles payment completion correctly', async () => {
    const mockHandlePayment = jest.fn();
    const { getByText } = render(
      <BookingCard 
        booking={{
          ...mockBooking,
          paymentStatus: PaymentStatus.PENDING
        }}
        onPaymentComplete={mockHandlePayment}
      />
    );

    await act(async () => {
      fireEvent.press(getByText('Complete Payment'));
    });

    expect(mockHandlePayment).toHaveBeenCalledWith(
      'booking-123',
      true
    );
  });

  it('prevents status changes for non-modifiable bookings', async () => {
    const mockHandleStatusChange = jest.fn();
    const { getByTestId } = render(
      <BookingCard 
        booking={{
          ...mockBooking,
          status: BookingStatus.COMPLETED
        }}
        onStatusChange={mockHandleStatusChange}
        testID="booking-card"
      />
    );

    await act(async () => {
      fireEvent.press(getByTestId('booking-card'));
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Status Change Error',
      'This booking cannot be modified in its current state.'
    );
    expect(mockHandleStatusChange).not.toHaveBeenCalled();
  });

  it('applies correct styling based on booking status', () => {
    const { getByTestId } = render(
      <BookingCard 
        booking={mockBooking}
        testID="booking-card"
      />
    );

    const statusBadge = getByTestId('booking-card').findByProps({
      style: expect.objectContaining({
        backgroundColor: expect.any(String)
      })
    });

    expect(statusBadge).toBeTruthy();
  });

  it('handles loading state correctly', async () => {
    const { getByTestId } = render(
      <BookingCard 
        booking={mockBooking}
        testID="booking-card"
      />
    );

    const card = getByTestId('booking-card');
    expect(card.props.accessibilityState.busy).toBeFalsy();

    // Simulate loading state
    await act(async () => {
      fireEvent.press(card);
    });

    await waitFor(() => {
      expect(card.props.accessibilityState.busy).toBeTruthy();
    });
  });

  it('provides correct accessibility labels', () => {
    const { getByTestId } = render(
      <BookingCard 
        booking={mockBooking}
        testID="booking-card"
      />
    );

    const card = getByTestId('booking-card');
    expect(card.props.accessibilityLabel).toContain('ABC123');
    expect(card.props.accessibilityLabel).toContain('PENDING');
    expect(card.props.accessibilityLabel).toContain('$1,500.00');
    expect(card.props.accessibilityLabel).toContain('PAR');
  });

  it('animates on press interactions', async () => {
    const { getByTestId } = render(
      <BookingCard 
        booking={mockBooking}
        testID="booking-card"
      />
    );

    const card = getByTestId('booking-card');

    await act(async () => {
      fireEvent(card, 'pressIn');
    });

    expect(card.props.style).toContainEqual(
      expect.objectContaining({
        transform: expect.arrayContaining([
          { scale: expect.any(Object) }
        ])
      })
    );

    await act(async () => {
      fireEvent(card, 'pressOut');
    });
  });
});