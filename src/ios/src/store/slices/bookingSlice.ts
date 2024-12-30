/**
 * Redux slice for managing booking state in the iOS application
 * Implements comprehensive booking management with offline support and optimistic updates
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import { BookingService } from '../../services/booking';
import { 
  Booking, 
  BookingStatus, 
  PaymentStatus, 
  AmadeusBookingDetails,
  TravellerDetails,
  PaymentSplit
} from '../../types/booking';

// State interface definitions
interface BookingState {
  bookings: Booking[];
  currentBooking: Booking | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  offlineQueue: OfflineOperation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

interface OfflineOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'CANCEL';
  data: any;
  timestamp: Date;
}

// Initial state
const initialState: BookingState = {
  bookings: [],
  currentBooking: null,
  loading: false,
  error: null,
  lastUpdated: null,
  offlineQueue: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0
  }
};

// Async thunks
export const searchBookings = createAsyncThunk(
  'booking/search',
  async (searchCriteria: AmadeusBookingDetails, { rejectWithValue }) => {
    try {
      const bookingService = new BookingService();
      const results = await bookingService.searchBookings(searchCriteria, {
        useCache: true,
        timeout: 30000
      });
      return results;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createBooking = createAsyncThunk(
  'booking/create',
  async (
    {
      bookingDetails,
      travellers,
      paymentSplits
    }: {
      bookingDetails: AmadeusBookingDetails;
      travellers: TravellerDetails[];
      paymentSplits: PaymentSplit[];
    },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const bookingService = new BookingService();
      
      // Create optimistic booking entry
      const optimisticBooking: Booking = {
        id: `temp-${Date.now()}`,
        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        ...bookingDetails,
        travellerDetails: travellers,
        paymentSplits,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Dispatch optimistic update
      dispatch(addBooking(optimisticBooking));

      const result = await bookingService.createBooking(
        bookingDetails,
        travellers,
        paymentSplits
      );

      return result;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const processPayment = createAsyncThunk(
  'booking/processPayment',
  async (
    {
      bookingId,
      paymentSplits,
      options
    }: {
      bookingId: string;
      paymentSplits: PaymentSplit[];
      options: { requireAllPayments: boolean; notifyParticipants: boolean };
    },
    { rejectWithValue }
  ) => {
    try {
      const bookingService = new BookingService();
      const result = await bookingService.processPayment(
        bookingId,
        paymentSplits,
        options
      );
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Slice definition
const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    addBooking: (state, action: PayloadAction<Booking>) => {
      state.bookings.unshift(action.payload);
    },
    setCurrentBooking: (state, action: PayloadAction<Booking>) => {
      state.currentBooking = action.payload;
    },
    updateBookingStatus: (
      state,
      action: PayloadAction<{ id: string; status: BookingStatus }>
    ) => {
      const booking = state.bookings.find(b => b.id === action.payload.id);
      if (booking) {
        booking.status = action.payload.status;
        booking.updatedAt = new Date();
      }
    },
    addToOfflineQueue: (state, action: PayloadAction<OfflineOperation>) => {
      state.offlineQueue.push(action.payload);
    },
    removeFromOfflineQueue: (state, action: PayloadAction<string>) => {
      state.offlineQueue = state.offlineQueue.filter(op => op.id !== action.payload);
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Search Bookings
      .addCase(searchBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = action.payload;
        state.lastUpdated = new Date();
      })
      .addCase(searchBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create Booking
      .addCase(createBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.loading = false;
        // Replace optimistic booking with real one
        state.bookings = state.bookings.map(booking =>
          booking.id.startsWith('temp-') ? action.payload : booking
        );
        state.currentBooking = action.payload;
        state.lastUpdated = new Date();
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        // Remove failed optimistic booking
        state.bookings = state.bookings.filter(
          booking => !booking.id.startsWith('temp-')
        );
      })
      // Process Payment
      .addCase(processPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(processPayment.fulfilled, (state, action) => {
        state.loading = false;
        if (state.currentBooking) {
          state.currentBooking.paymentStatus = PaymentStatus.COMPLETED;
          state.currentBooking.updatedAt = new Date();
        }
      })
      .addCase(processPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

// Selectors
export const selectAllBookings = (state: { booking: BookingState }) =>
  state.booking.bookings;

export const selectCurrentBooking = (state: { booking: BookingState }) =>
  state.booking.currentBooking;

export const selectBookingsByStatus = (
  state: { booking: BookingState },
  status: BookingStatus
) => state.booking.bookings.filter(booking => booking.status === status);

export const selectOfflineQueue = (state: { booking: BookingState }) =>
  state.booking.offlineQueue;

export const selectBookingError = (state: { booking: BookingState }) =>
  state.booking.error;

export const selectIsLoading = (state: { booking: BookingState }) =>
  state.booking.loading;

// Actions
export const {
  addBooking,
  setCurrentBooking,
  updateBookingStatus,
  addToOfflineQueue,
  removeFromOfflineQueue,
  clearError
} = bookingSlice.actions;

// Default export
export default bookingSlice.reducer;