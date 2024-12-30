/**
 * @fileoverview Custom React hook for managing booking operations in the Android mobile app
 * Provides comprehensive booking management with offline support, split payments,
 * and real-time inventory validation
 * @version 1.0.0
 */

import { useCallback, useEffect, useState } from 'react'; // ^18.2.0
import { useDispatch, useSelector } from 'react-redux'; // ^8.1.0
import NetInfo from '@react-native-community/netinfo'; // ^9.3.0
import AsyncStorage from '@react-native-async-storage/async-storage'; // ^1.19.0

// Internal imports
import { Booking, BookingStatus, PaymentStatus } from '../types/booking';
import { bookingService } from '../services/booking';
import {
  createBooking,
  fetchBookings,
  checkInventoryStatus,
  selectAllBookings,
  selectCurrentBooking,
  selectBookingLoading,
  selectBookingError,
  setCurrentBooking,
  clearCurrentBooking,
  setSplitPaymentStatus,
  selectSplitPaymentStatus,
  selectInventoryStatus
} from '../store/slices/bookingSlice';

// Constants
const OFFLINE_STORAGE_KEY = '@bookings_offline';
const OFFLINE_SYNC_INTERVAL = 60000; // 1 minute
const MAX_OFFLINE_BOOKINGS = 50;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 5000;
const INVENTORY_CHECK_INTERVAL = 30000; // 30 seconds

/**
 * Custom hook for managing booking operations with comprehensive offline support
 * @returns Booking management functions and state
 */
export const useBooking = () => {
  const dispatch = useDispatch();
  
  // Redux selectors
  const bookings = useSelector(selectAllBookings);
  const currentBooking = useSelector(selectCurrentBooking);
  const loading = useSelector(selectBookingLoading);
  const error = useSelector(selectBookingError);
  const splitPaymentStatus = useSelector(selectSplitPaymentStatus);
  const inventoryStatus = useSelector(selectInventoryStatus);

  // Local state
  const [isOffline, setIsOffline] = useState(false);
  const [pendingSyncs, setPendingSyncs] = useState(0);
  const [inventoryCheckInterval, setInventoryCheckInterval] = useState<NodeJS.Timeout | null>(null);

  /**
   * Initialize network status monitoring and offline sync
   */
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
      if (state.isConnected) {
        syncOfflineBookings();
      }
    });

    // Set up periodic sync attempts when online
    const syncInterval = setInterval(() => {
      if (!isOffline) {
        syncOfflineBookings();
      }
    }, OFFLINE_SYNC_INTERVAL);

    return () => {
      unsubscribe();
      clearInterval(syncInterval);
      if (inventoryCheckInterval) {
        clearInterval(inventoryCheckInterval);
      }
    };
  }, [isOffline]);

  /**
   * Create a new booking with offline support
   */
  const handleCreateBooking = useCallback(async (bookingData: any) => {
    try {
      if (isOffline) {
        const offlineBooking = {
          ...bookingData,
          id: `offline_${Date.now()}`,
          status: BookingStatus.PENDING,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const storedBookings = await AsyncStorage.getItem(OFFLINE_STORAGE_KEY);
        const offlineBookings = storedBookings ? JSON.parse(storedBookings) : [];

        if (offlineBookings.length >= MAX_OFFLINE_BOOKINGS) {
          throw new Error('Maximum offline bookings limit reached');
        }

        await AsyncStorage.setItem(
          OFFLINE_STORAGE_KEY,
          JSON.stringify([...offlineBookings, offlineBooking])
        );

        setPendingSyncs(prev => prev + 1);
        return offlineBooking;
      }

      const result = await dispatch(createBooking(bookingData)).unwrap();
      startInventoryCheck(result.id);
      return result;
    } catch (error: any) {
      console.error('Failed to create booking:', error);
      throw error;
    }
  }, [isOffline, dispatch]);

  /**
   * Sync offline bookings when connection is restored
   */
  const syncOfflineBookings = useCallback(async () => {
    try {
      const storedBookings = await AsyncStorage.getItem(OFFLINE_STORAGE_KEY);
      if (!storedBookings) return;

      const offlineBookings = JSON.parse(storedBookings);
      let syncErrors = 0;

      for (const booking of offlineBookings) {
        try {
          await dispatch(createBooking(booking)).unwrap();
          setPendingSyncs(prev => Math.max(0, prev - 1));
        } catch (error) {
          syncErrors++;
          if (syncErrors >= RETRY_ATTEMPTS) {
            break;
          }
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }

      await AsyncStorage.removeItem(OFFLINE_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to sync offline bookings:', error);
    }
  }, [dispatch]);

  /**
   * Start real-time inventory checking for a booking
   */
  const startInventoryCheck = useCallback((bookingId: string) => {
    if (inventoryCheckInterval) {
      clearInterval(inventoryCheckInterval);
    }

    const interval = setInterval(() => {
      if (!isOffline) {
        dispatch(checkInventoryStatus(bookingId));
      }
    }, INVENTORY_CHECK_INTERVAL);

    setInventoryCheckInterval(interval);
  }, [dispatch, isOffline]);

  /**
   * Process split payment for a booking
   */
  const processSplitPayment = useCallback(async (
    bookingId: string,
    paymentDetails: any
  ) => {
    try {
      if (isOffline) {
        throw new Error('Split payments cannot be processed offline');
      }

      const result = await bookingService.processSplitPayment(bookingId, paymentDetails);
      dispatch(setSplitPaymentStatus(result.status));
      return result;
    } catch (error) {
      console.error('Failed to process split payment:', error);
      throw error;
    }
  }, [isOffline, dispatch]);

  /**
   * Validate inventory availability
   */
  const validateInventory = useCallback(async (bookingId: string) => {
    try {
      if (isOffline) {
        return { status: 'unknown', message: 'Offline - cannot validate inventory' };
      }

      const status = await dispatch(checkInventoryStatus(bookingId)).unwrap();
      return status;
    } catch (error) {
      console.error('Failed to validate inventory:', error);
      throw error;
    }
  }, [isOffline, dispatch]);

  return {
    // State
    bookings,
    currentBooking,
    loading,
    error,
    isOffline,
    pendingSyncs,
    splitPaymentStatus,
    inventoryStatus,

    // Actions
    createBooking: handleCreateBooking,
    updateBooking: bookingService.updateBooking,
    cancelBooking: bookingService.cancelBooking,
    getBooking: bookingService.getBooking,
    listBookings: bookingService.listBookings,
    saveDraft: bookingService.saveDraft,
    syncOfflineBookings,
    validateInventory,
    processSplitPayment,
    setCurrentBooking: (booking: Booking) => dispatch(setCurrentBooking(booking)),
    clearCurrentBooking: () => dispatch(clearCurrentBooking())
  };
};