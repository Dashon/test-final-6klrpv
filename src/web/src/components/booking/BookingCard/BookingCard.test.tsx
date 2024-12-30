/**
 * BookingCard Component Tests
 * Comprehensive test suite for the BookingCard component with Redux integration
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import BookingCard from './BookingCard';
import { Booking, BookingStatus, PaymentStatus } from '../../../types/booking';
import bookingReducer, { selectBookingError, selectBookingLoadingState } from '../../../store/slices/bookingSlice';

// Helper function to render component with Redux store
const renderWithRedux = (
  component: React.ReactElement,
  initialState = {}
) => {
  const store = configureStore({
    reducer: {
      booking: bookingReducer
    },
    preloadedState: initialState
  });

  return {
    ...render(
      <Provider store={store}>
        {component}
      </Provider>
    ),
    store
  };
};

// Mock booking data generator
const createMockBooking = (overrides = {}): Booking => ({
  id: 'booking-123',
  userId: 'user-123',
  status: BookingStatus.CONFIRMED,
  paymentStatus: PaymentStatus.COMPLETED,
  amadeusPNR: 'ABC123',
  totalAmount: 1500,
  currency: 'USD',
  travellerDetails: [{
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    dateOfBirth: new Date('1990-01-01'),
    nationality: 'US',
    passportNumber: 'P123456',
    passportExpiry: new Date('2025-01-01'),
    specialRequests: []
  }],
  paymentSplits: [],
  amadeusDetails: {
    pnr: 'ABC123',
    itineraryDetails: {
      tripType: 'ROUND_TRIP',
      passengerCount: 1,
      segments: [{
        departureAirport: 'JFK',
        arrivalAirport: 'LAX',
        departureTime: new Date('2024-06-15T10:00:00Z'),
        arrivalTime: new Date('2024-06-15T13:00:00Z'),
        flightNumber: 'AA123',
        carrier: 'American Airlines',
        cabinClass: 'ECONOMY',
        bookingClass: 'Y'
      }],
      totalDuration: 180,
      stopCount: 0
    },
    fareDetails: {
      baseAmount: 1200,
      taxAmount: 300,
      totalAmount: 1500,
      currency: 'USD',
      fareClass: 'ECONOMY',
      fareType: 'REGULAR',
      fareRules: []
    },
    segmentDetails: [],
    gdsTimestamp: new Date(),
    ticketTimeLimit: new Date('2024-06-14T23:59:59Z')
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  expiresAt: new Date('2024-06-14T23:59:59Z'),
  metadata: {},
  ...overrides
});

describe('BookingCard Component', () => {
  // Mock handlers
  const mockHandlers = {
    onViewDetails: jest.fn(),
    onCancel: jest.fn(),
    onPaymentSplit: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering Tests', () => {
    it('renders basic booking details correctly', () => {
      const booking = createMockBooking();
      renderWithRedux(
        <BookingCard
          booking={booking}
          onViewDetails={mockHandlers.onViewDetails}
          testId="booking-card"
        />
      );

      expect(screen.getByText(`Booking ${booking.amadeusPNR}`)).toBeInTheDocument();
      expect(screen.getByText(booking.status)).toBeInTheDocument();
      expect(screen.getByText('$1,500.00')).toBeInTheDocument();
      expect(screen.getByText('1 person(s)')).toBeInTheDocument();
    });

    it('renders split payment information when available', () => {
      const booking = createMockBooking({
        paymentSplits: [
          {
            userId: 'user-1',
            amount: 750,
            currency: 'USD',
            status: PaymentStatus.COMPLETED,
            paymentIntentId: 'pi_123',
            paymentMethod: 'card',
            splitPercentage: 50,
            dueDate: new Date('2024-06-14')
          },
          {
            userId: 'user-2',
            amount: 750,
            currency: 'USD',
            status: PaymentStatus.PENDING,
            paymentIntentId: 'pi_124',
            paymentMethod: 'card',
            splitPercentage: 50,
            dueDate: new Date('2024-06-14')
          }
        ]
      });

      renderWithRedux(
        <BookingCard
          booking={booking}
          onViewDetails={mockHandlers.onViewDetails}
          testId="booking-card"
        />
      );

      expect(screen.getByText('1/2 payments completed')).toBeInTheDocument();
    });

    it('handles loading state correctly', () => {
      const booking = createMockBooking();
      renderWithRedux(
        <BookingCard
          booking={booking}
          onViewDetails={mockHandlers.onViewDetails}
          testId="booking-card"
        />,
        {
          booking: {
            loadingStates: { update: true }
          }
        }
      );

      const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
      expect(viewDetailsButton).toBeDisabled();
    });
  });

  describe('Accessibility Tests', () => {
    it('has correct ARIA attributes', () => {
      const booking = createMockBooking();
      renderWithRedux(
        <BookingCard
          booking={booking}
          onViewDetails={mockHandlers.onViewDetails}
          testId="booking-card"
        />
      );

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', `Booking ${booking.amadeusPNR}`);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('maintains focus management', async () => {
      const booking = createMockBooking();
      renderWithRedux(
        <BookingCard
          booking={booking}
          onViewDetails={mockHandlers.onViewDetails}
          onCancel={mockHandlers.onCancel}
          testId="booking-card"
        />
      );

      const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
      await userEvent.tab();
      expect(viewDetailsButton).toHaveFocus();
    });
  });

  describe('Interaction Tests', () => {
    it('handles view details click correctly', async () => {
      const booking = createMockBooking();
      renderWithRedux(
        <BookingCard
          booking={booking}
          onViewDetails={mockHandlers.onViewDetails}
          testId="booking-card"
        />
      );

      const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
      await userEvent.click(viewDetailsButton);
      
      expect(mockHandlers.onViewDetails).toHaveBeenCalledWith(booking.id);
    });

    it('handles cancel booking correctly', async () => {
      const booking = createMockBooking({ status: BookingStatus.PENDING });
      renderWithRedux(
        <BookingCard
          booking={booking}
          onViewDetails={mockHandlers.onViewDetails}
          onCancel={mockHandlers.onCancel}
          testId="booking-card"
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);
      
      expect(mockHandlers.onCancel).toHaveBeenCalledWith(booking.id);
    });

    it('prevents interaction when loading', async () => {
      const booking = createMockBooking();
      renderWithRedux(
        <BookingCard
          booking={booking}
          onViewDetails={mockHandlers.onViewDetails}
          testId="booking-card"
        />,
        {
          booking: {
            loadingStates: { update: true }
          }
        }
      );

      const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
      await userEvent.click(viewDetailsButton);
      
      expect(mockHandlers.onViewDetails).not.toHaveBeenCalled();
    });
  });

  describe('Redux Integration Tests', () => {
    it('reflects loading state from Redux store', () => {
      const booking = createMockBooking();
      const { store } = renderWithRedux(
        <BookingCard
          booking={booking}
          onViewDetails={mockHandlers.onViewDetails}
          testId="booking-card"
        />,
        {
          booking: {
            loadingStates: { update: true }
          }
        }
      );

      const state = store.getState();
      const loadingState = selectBookingLoadingState(state);
      expect(loadingState.update).toBe(true);
    });

    it('handles error states from Redux store', () => {
      const booking = createMockBooking();
      const { store } = renderWithRedux(
        <BookingCard
          booking={booking}
          onViewDetails={mockHandlers.onViewDetails}
          testId="booking-card"
        />,
        {
          booking: {
            errors: {
              update: { message: 'Update failed' }
            }
          }
        }
      );

      const state = store.getState();
      const error = selectBookingError(state);
      expect(error.update?.message).toBe('Update failed');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing optional props gracefully', () => {
      const booking = createMockBooking();
      renderWithRedux(
        <BookingCard
          booking={booking}
          onViewDetails={mockHandlers.onViewDetails}
          testId="booking-card"
        />
      );

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });

    it('displays appropriate message for empty split payments', () => {
      const booking = createMockBooking({ paymentSplits: [] });
      renderWithRedux(
        <BookingCard
          booking={booking}
          onViewDetails={mockHandlers.onViewDetails}
          testId="booking-card"
        />
      );

      expect(screen.queryByText(/payments completed/i)).not.toBeInTheDocument();
    });
  });
});