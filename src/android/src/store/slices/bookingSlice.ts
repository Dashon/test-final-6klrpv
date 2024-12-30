/**
 * @fileoverview Redux slice for managing booking state in the Android mobile app
 * Implements comprehensive booking management with Amadeus GDS integration,
 * split payments, real-time inventory tracking, and group coordination
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import { Booking, BookingStatus, PaymentStatus } from '../../types/booking';
import { bookingService } from '../../services/booking';
import { config } from '../../config/development';
import { ErrorCode } from '../../../../backend/shared/constants/error-codes';

// Interfaces for state management
interface BookingState {
  bookings: Booking[];
  currentBooking: Booking | null;
  loading: boolean;
  error: string | null;
  filters: {
    status?: BookingStatus;
    dateRange?: {
      start: string;
      end: string;
    };
  };
  splitPaymentStatus: PaymentStatus | null;
  groupCoordinationStatus: 'pending' | 'complete' | 'failed' | null;
  inventoryStatus: 'available' | 'limited' | 'unavailable' | null;
  retryCount: number;
  lastSync: string | null;
}

// Initial state with configuration from development config
const initialState: BookingState = {
  bookings: [],
  currentBooking: null,
  loading: false,
  error: null,
  filters: {
    status: undefined,
    dateRange: undefined
  },
  splitPaymentStatus: null,
  groupCoordinationStatus: null,
  inventoryStatus: null,
  retryCount: 0,
  lastSync: null
};

// Async thunks for booking operations
export const createBooking = createAsyncThunk(
  'booking/create',
  async (bookingData: {
    bookingDetails: any;
    splitPaymentConfig?: any;
    groupConfig?: any;
  }, { rejectWithValue }) => {
    try {
      const booking = await bookingService.createBooking(bookingData.bookingDetails);
      if (bookingData.splitPaymentConfig) {
        await bookingService.processSplitPayment(booking.id, bookingData.splitPaymentConfig);
      }
      if (bookingData.groupConfig) {
        await bookingService.updateGroupStatus(booking.id, bookingData.groupConfig);
      }
      return booking;
    } catch (error: any) {
      return rejectWithValue({
        code: error.code || ErrorCode.GDS_ERROR,
        message: error.message
      });
    }
  }
);

export const fetchBookings = createAsyncThunk(
  'booking/fetchAll',
  async (filters: BookingState['filters'], { rejectWithValue }) => {
    try {
      const bookings = await bookingService.listBookings({
        status: filters.status,
        dateRange: filters.dateRange
      });
      return bookings;
    } catch (error: any) {
      return rejectWithValue({
        code: error.code || ErrorCode.NETWORK_ERROR,
        message: error.message
      });
    }
  }
);

export const checkInventoryStatus = createAsyncThunk(
  'booking/checkInventory',
  async (bookingId: string, { rejectWithValue }) => {
    try {
      const status = await bookingService.checkInventoryStatus(bookingId);
      return status;
    } catch (error: any) {
      return rejectWithValue({
        code: error.code || ErrorCode.GDS_ERROR,
        message: error.message
      });
    }
  }
);

// Booking slice with reducers and actions
const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setCurrentBooking: (state, action: PayloadAction<Booking>) => {
      state.currentBooking = action.payload;
    },
    clearCurrentBooking: (state) => {
      state.currentBooking = null;
    },
    setFilters: (state, action: PayloadAction<BookingState['filters']>) => {
      state.filters = action.payload;
    },
    resetError: (state) => {
      state.error = null;
      state.retryCount = 0;
    },
    setSplitPaymentStatus: (state, action: PayloadAction<PaymentStatus>) => {
      state.splitPaymentStatus = action.payload;
    },
    setGroupCoordinationStatus: (state, action: PayloadAction<BookingState['groupCoordinationStatus']>) => {
      state.groupCoordinationStatus = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Create booking reducers
      .addCase(createBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings.unshift(action.payload);
        state.currentBooking = action.payload;
        state.lastSync = new Date().toISOString();
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.retryCount += 1;
      })
      // Fetch bookings reducers
      .addCase(fetchBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = action.payload;
        state.lastSync = new Date().toISOString();
      })
      .addCase(fetchBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Check inventory status reducers
      .addCase(checkInventoryStatus.pending, (state) => {
        state.inventoryStatus = null;
      })
      .addCase(checkInventoryStatus.fulfilled, (state, action) => {
        state.inventoryStatus = action.payload;
      })
      .addCase(checkInventoryStatus.rejected, (state) => {
        state.inventoryStatus = 'unavailable';
      });
  }
});

// Export actions and selectors
export const {
  setCurrentBooking,
  clearCurrentBooking,
  setFilters,
  resetError,
  setSplitPaymentStatus,
  setGroupCoordinationStatus
} = bookingSlice.actions;

// Selectors
export const selectAllBookings = (state: { booking: BookingState }) => state.booking.bookings;
export const selectCurrentBooking = (state: { booking: BookingState }) => state.booking.currentBooking;
export const selectBookingLoading = (state: { booking: BookingState }) => state.booking.loading;
export const selectBookingError = (state: { booking: BookingState }) => state.booking.error;
export const selectBookingFilters = (state: { booking: BookingState }) => state.booking.filters;
export const selectSplitPaymentStatus = (state: { booking: BookingState }) => state.booking.splitPaymentStatus;
export const selectGroupCoordinationStatus = (state: { booking: BookingState }) => state.booking.groupCoordinationStatus;
export const selectInventoryStatus = (state: { booking: BookingState }) => state.booking.inventoryStatus;

// Export reducer
export default bookingSlice.reducer;