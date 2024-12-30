/**
 * useBooking Custom Hook
 * Version: 1.0.0
 * 
 * Enterprise-grade React hook for managing travel booking operations with
 * real-time inventory tracking and enhanced group booking coordination.
 * Integrates with Amadeus GDS and supports split payments.
 */

import { useState, useCallback, useEffect, useRef } from 'react'; // v18.2.0
import { useDispatch, useSelector } from 'react-redux'; // v8.1.0
import { debounce } from 'lodash'; // v4.17.21
import {
  Booking,
  BookingStatus,
  PaymentStatus,
  PaymentSplit,
  ParticipantStatus,
  InventoryStatus
} from '../types/booking';
import {
  bookingActions,
  selectBookings,
  selectInventoryStatus,
  selectParticipantStatus
} from '../store/slices/bookingSlice';

// Polling configuration
const INVENTORY_POLL_INTERVAL = 30000; // 30 seconds
const POLL_RETRY_ATTEMPTS = 3;

/**
 * Interface for booking operation error states
 */
interface BookingError {
  code: string;
  message: string;
  referenceId?: string;
}

/**
 * Interface for booking hook return type
 */
interface UseBookingReturn {
  // Booking state
  bookings: Booking[];
  activeBooking: Booking | null;
  inventoryStatus: InventoryStatus | null;
  participantStatus: ParticipantStatus[];
  
  // Loading states
  loading: {
    create: boolean;
    fetch: boolean;
    update: boolean;
    payment: boolean;
  };
  
  // Error states
  error: {
    create: BookingError | null;
    fetch: BookingError | null;
    update: BookingError | null;
    payment: BookingError | null;
  };
  
  // Booking operations
  createBooking: (bookingData: Partial<Booking>) => Promise<Booking>;
  fetchBookings: () => Promise<void>;
  updateBooking: (bookingId: string, updates: Partial<Booking>) => Promise<void>;
  processSplitPayment: (bookingId: string, splits: PaymentSplit[]) => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;
  retryPayment: (bookingId: string, splitId: string) => Promise<void>;
  resetError: (errorType: keyof BookingError) => void;
}

/**
 * Custom hook for managing booking operations with enhanced features
 * @returns {UseBookingReturn} Booking operations and state
 */
export const useBooking = (): UseBookingReturn => {
  const dispatch = useDispatch();
  
  // Redux selectors
  const bookings = useSelector(selectBookings);
  const inventoryStatus = useSelector(selectInventoryStatus);
  const participantStatus = useSelector(selectParticipantStatus);
  
  // Local state
  const [loading, setLoading] = useState({
    create: false,
    fetch: false,
    update: false,
    payment: false
  });
  
  const [error, setError] = useState({
    create: null,
    fetch: null,
    update: null,
    payment: null
  });
  
  // Refs for cleanup
  const pollInterval = useRef<NodeJS.Timeout>();
  const retryAttempts = useRef<number>(0);

  /**
   * Debounced inventory status polling
   */
  const pollInventoryStatus = useCallback(
    debounce(async (bookingId: string) => {
      try {
        await dispatch(bookingActions.pollInventoryStatus(bookingId));
        retryAttempts.current = 0;
      } catch (err) {
        if (retryAttempts.current < POLL_RETRY_ATTEMPTS) {
          retryAttempts.current++;
          pollInventoryStatus(bookingId);
        }
      }
    }, 1000),
    [dispatch]
  );

  /**
   * Creates a new booking with inventory validation
   */
  const createBooking = async (bookingData: Partial<Booking>): Promise<Booking> => {
    setLoading(prev => ({ ...prev, create: true }));
    setError(prev => ({ ...prev, create: null }));
    
    try {
      const booking = await dispatch(bookingActions.createBooking(bookingData));
      
      // Start inventory polling
      if (booking.id) {
        pollInventoryStatus(booking.id);
      }
      
      return booking;
    } catch (err: any) {
      setError(prev => ({
        ...prev,
        create: {
          code: err.code || 'BOOKING_CREATE_ERROR',
          message: err.message || 'Failed to create booking',
          referenceId: err.referenceId
        }
      }));
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, create: false }));
    }
  };

  /**
   * Fetches user's bookings with error handling
   */
  const fetchBookings = async (): Promise<void> => {
    setLoading(prev => ({ ...prev, fetch: true }));
    setError(prev => ({ ...prev, fetch: null }));
    
    try {
      await dispatch(bookingActions.fetchUserBookings());
    } catch (err: any) {
      setError(prev => ({
        ...prev,
        fetch: {
          code: err.code || 'BOOKING_FETCH_ERROR',
          message: err.message || 'Failed to fetch bookings',
          referenceId: err.referenceId
        }
      }));
    } finally {
      setLoading(prev => ({ ...prev, fetch: false }));
    }
  };

  /**
   * Updates booking with enhanced error recovery
   */
  const updateBooking = async (
    bookingId: string,
    updates: Partial<Booking>
  ): Promise<void> => {
    setLoading(prev => ({ ...prev, update: true }));
    setError(prev => ({ ...prev, update: null }));
    
    try {
      await dispatch(bookingActions.updateBooking({ bookingId, updates }));
    } catch (err: any) {
      setError(prev => ({
        ...prev,
        update: {
          code: err.code || 'BOOKING_UPDATE_ERROR',
          message: err.message || 'Failed to update booking',
          referenceId: err.referenceId
        }
      }));
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, update: false }));
    }
  };

  /**
   * Processes split payments for group bookings
   */
  const processSplitPayment = async (
    bookingId: string,
    splits: PaymentSplit[]
  ): Promise<void> => {
    setLoading(prev => ({ ...prev, payment: true }));
    setError(prev => ({ ...prev, payment: null }));
    
    try {
      await dispatch(bookingActions.processSplitPayment({ bookingId, splits }));
    } catch (err: any) {
      setError(prev => ({
        ...prev,
        payment: {
          code: err.code || 'PAYMENT_PROCESSING_ERROR',
          message: err.message || 'Failed to process payment',
          referenceId: err.referenceId
        }
      }));
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, payment: false }));
    }
  };

  /**
   * Cancels booking with inventory release
   */
  const cancelBooking = async (bookingId: string): Promise<void> => {
    try {
      await dispatch(bookingActions.cancelBooking(bookingId));
      // Stop inventory polling
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    } catch (err: any) {
      throw err;
    }
  };

  /**
   * Retries failed payment with error handling
   */
  const retryPayment = async (bookingId: string, splitId: string): Promise<void> => {
    setLoading(prev => ({ ...prev, payment: true }));
    setError(prev => ({ ...prev, payment: null }));
    
    try {
      await dispatch(bookingActions.retryPayment({ bookingId, splitId }));
    } catch (err: any) {
      setError(prev => ({
        ...prev,
        payment: {
          code: err.code || 'PAYMENT_RETRY_ERROR',
          message: err.message || 'Failed to retry payment',
          referenceId: err.referenceId
        }
      }));
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, payment: false }));
    }
  };

  /**
   * Resets error state for specified error type
   */
  const resetError = (errorType: keyof BookingError): void => {
    setError(prev => ({ ...prev, [errorType]: null }));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, []);

  return {
    bookings,
    activeBooking: bookings[0] || null, // Most recent booking
    inventoryStatus,
    participantStatus,
    loading,
    error,
    createBooking,
    fetchBookings,
    updateBooking,
    processSplitPayment,
    cancelBooking,
    retryPayment,
    resetError
  };
};