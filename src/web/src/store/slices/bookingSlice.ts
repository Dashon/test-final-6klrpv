/**
 * Booking Slice
 * Version: 1.0.0
 * 
 * Redux Toolkit slice for managing booking state in the web frontend.
 * Handles travel reservations, payment processing, and real-time booking status updates.
 * 
 * @packageDocumentation
 */

import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import {
  Booking,
  BookingStatus,
  PaymentStatus,
  TravellerDetails,
  PaymentSplit,
  BookingError
} from '../types/booking';
import {
  createBooking,
  getBooking,
  updateBooking,
  cancelBooking,
  processPaymentSplit,
  validateBooking
} from '../services/booking';

// State interface
interface BookingState {
  bookings: Record<string, Booking>;
  activeBookingId: string | null;
  loadingStates: {
    create: boolean;
    fetch: boolean;
    update: boolean;
    payment: boolean;
  };
  errors: {
    create: BookingError | null;
    fetch: BookingError | null;
    update: BookingError | null;
    payment: BookingError | null;
  };
  paymentProcessing: boolean;
  expirationTimers: Record<string, number>;
}

// Initial state
const initialState: BookingState = {
  bookings: {},
  activeBookingId: null,
  loadingStates: {
    create: false,
    fetch: false,
    update: false,
    payment: false
  },
  errors: {
    create: null,
    fetch: null,
    update: null,
    payment: null
  },
  paymentProcessing: false,
  expirationTimers: {}
};

// Async thunks
export const createBookingThunk = createAsyncThunk(
  'booking/create',
  async (params: {
    checkInDate: Date;
    checkOutDate: Date;
    travellers: TravellerDetails[];
    paymentSplits?: PaymentSplit[];
    currency: string;
    totalAmount: number;
    gdsOptions: any;
  }, { rejectWithValue }) => {
    try {
      await validateBooking(params);
      const booking = await createBooking(params);
      return booking;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

export const fetchBookingThunk = createAsyncThunk(
  'booking/fetch',
  async (bookingId: string, { rejectWithValue }) => {
    try {
      const booking = await getBooking(bookingId);
      return booking;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

export const updateBookingThunk = createAsyncThunk(
  'booking/update',
  async (params: { bookingId: string; updates: Partial<Booking> }, { rejectWithValue }) => {
    try {
      const booking = await updateBooking(params.bookingId, params.updates);
      return booking;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

export const processPaymentSplitThunk = createAsyncThunk(
  'booking/processSplit',
  async (params: {
    bookingId: string;
    splits: PaymentSplit[];
  }, { rejectWithValue }) => {
    try {
      const processedSplits = await processPaymentSplit(params.splits[0].amount, params.splits);
      return { bookingId: params.bookingId, splits: processedSplits };
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

// Slice definition
const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setActiveBooking: (state, action: PayloadAction<string | null>) => {
      state.activeBookingId = action.payload;
    },
    clearBookingError: (state, action: PayloadAction<keyof BookingState['errors']>) => {
      state.errors[action.payload] = null;
    },
    updateExpirationTimer: (state, action: PayloadAction<{ bookingId: string; timer: number }>) => {
      state.expirationTimers[action.payload.bookingId] = action.payload.timer;
    },
    removeExpiredBooking: (state, action: PayloadAction<string>) => {
      delete state.bookings[action.payload];
      delete state.expirationTimers[action.payload];
      if (state.activeBookingId === action.payload) {
        state.activeBookingId = null;
      }
    }
  },
  extraReducers: (builder) => {
    // Create booking
    builder.addCase(createBookingThunk.pending, (state) => {
      state.loadingStates.create = true;
      state.errors.create = null;
    });
    builder.addCase(createBookingThunk.fulfilled, (state, action) => {
      state.loadingStates.create = false;
      state.bookings[action.payload.id] = action.payload;
      state.activeBookingId = action.payload.id;
      state.expirationTimers[action.payload.id] = Date.parse(action.payload.expiresAt.toString());
    });
    builder.addCase(createBookingThunk.rejected, (state, action) => {
      state.loadingStates.create = false;
      state.errors.create = action.payload as BookingError;
    });

    // Fetch booking
    builder.addCase(fetchBookingThunk.pending, (state) => {
      state.loadingStates.fetch = true;
      state.errors.fetch = null;
    });
    builder.addCase(fetchBookingThunk.fulfilled, (state, action) => {
      state.loadingStates.fetch = false;
      state.bookings[action.payload.id] = action.payload;
    });
    builder.addCase(fetchBookingThunk.rejected, (state, action) => {
      state.loadingStates.fetch = false;
      state.errors.fetch = action.payload as BookingError;
    });

    // Update booking
    builder.addCase(updateBookingThunk.pending, (state) => {
      state.loadingStates.update = true;
      state.errors.update = null;
    });
    builder.addCase(updateBookingThunk.fulfilled, (state, action) => {
      state.loadingStates.update = false;
      state.bookings[action.payload.id] = action.payload;
    });
    builder.addCase(updateBookingThunk.rejected, (state, action) => {
      state.loadingStates.update = false;
      state.errors.update = action.payload as BookingError;
    });

    // Process payment split
    builder.addCase(processPaymentSplitThunk.pending, (state) => {
      state.loadingStates.payment = true;
      state.paymentProcessing = true;
      state.errors.payment = null;
    });
    builder.addCase(processPaymentSplitThunk.fulfilled, (state, action) => {
      state.loadingStates.payment = false;
      state.paymentProcessing = false;
      if (state.bookings[action.payload.bookingId]) {
        state.bookings[action.payload.bookingId].paymentSplits = action.payload.splits;
      }
    });
    builder.addCase(processPaymentSplitThunk.rejected, (state, action) => {
      state.loadingStates.payment = false;
      state.paymentProcessing = false;
      state.errors.payment = action.payload as BookingError;
    });
  }
});

// Selectors
export const selectAllBookings = (state: { booking: BookingState }) => state.booking.bookings;
export const selectActiveBooking = (state: { booking: BookingState }) => 
  state.booking.activeBookingId ? state.booking.bookings[state.booking.activeBookingId] : null;

export const selectBookingLoadingState = createSelector(
  [(state: { booking: BookingState }) => state.booking.loadingStates],
  (loadingStates) => loadingStates
);

export const selectBookingError = createSelector(
  [(state: { booking: BookingState }) => state.booking.errors],
  (errors) => errors
);

export const selectBookingById = (bookingId: string) =>
  createSelector(
    [(state: { booking: BookingState }) => state.booking.bookings],
    (bookings) => bookings[bookingId]
  );

export const { 
  setActiveBooking, 
  clearBookingError, 
  updateExpirationTimer, 
  removeExpiredBooking 
} = bookingSlice.actions;

export default bookingSlice.reducer;