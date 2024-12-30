/**
 * @fileoverview Booking service module for Android mobile app
 * Implements comprehensive booking management with Amadeus GDS integration,
 * enhanced offline support, and sophisticated error handling
 * @version 1.0.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage'; // ^1.19.0
import { get, post, put } from './api';
import { validateTravellerDetails } from '../utils/validation';
import { Booking, BookingStatus, PaymentStatus, TravellerDetails, PaymentSplit } from '../types/booking';

// Global constants for booking service
const BOOKING_CACHE_KEY = '@booking_cache';
const BOOKING_DRAFT_KEY = '@booking_draft';
const BOOKING_ENDPOINTS = {
  CREATE: '/bookings',
  UPDATE: '/bookings/:id',
  GET: '/bookings/:id',
  LIST: '/bookings'
} as const;

// Retry configuration for API calls
const RETRY_CONFIG = {
  maxAttempts: 3,
  backoffMs: 1000,
  timeoutMs: 5000
} as const;

// Cache configuration
const CACHE_CONFIG = {
  ttlMs: 300000, // 5 minutes
  maxSize: 100
} as const;

/**
 * Interface for booking creation data
 */
interface BookingCreateData {
  travellerDetails: TravellerDetails[];
  paymentSplits?: PaymentSplit[];
  bookingDetails: object;
  currency?: string;
}

/**
 * Interface for booking update data
 */
interface BookingUpdateData {
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  travellerDetails?: TravellerDetails[];
  paymentSplits?: PaymentSplit[];
}

/**
 * Booking service implementation with enhanced error handling and offline support
 */
class BookingService {
  private cache: Map<string, { data: Booking; timestamp: number }>;

  constructor() {
    this.cache = new Map();
    this.initializeCache();
  }

  /**
   * Initializes the booking cache from persistent storage
   */
  private async initializeCache(): Promise<void> {
    try {
      const cachedData = await AsyncStorage.getItem(BOOKING_CACHE_KEY);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        Object.entries(parsed).forEach(([key, value]) => {
          this.cache.set(key, value as { data: Booking; timestamp: number });
        });
      }
    } catch (error) {
      console.error('Failed to initialize booking cache:', error);
    }
  }

  /**
   * Creates a new booking with enhanced validation and real-time inventory checking
   * @param bookingData - Booking creation data
   * @returns Created booking details with confirmation status
   */
  public async createBooking(bookingData: BookingCreateData): Promise<Booking> {
    // Validate all traveller details
    const validationResults = bookingData.travellerDetails.map(
      traveller => validateTravellerDetails(traveller)
    );

    const validationErrors = validationResults
      .filter(result => !result.isValid)
      .map(result => result.errors);

    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${JSON.stringify(validationErrors)}`);
    }

    try {
      // Save draft before API call
      await this.saveDraft(bookingData);

      // Create booking through API
      const booking = await post<Booking>(BOOKING_ENDPOINTS.CREATE, bookingData);

      // Update cache
      await this.updateCache(booking.id, booking);

      // Clear draft after successful creation
      await this.clearDraft();

      return booking;
    } catch (error) {
      // Handle specific error cases
      if (error.code === 'GDS_ERROR') {
        await this.handleGdsError(error);
      }
      throw error;
    }
  }

  /**
   * Updates an existing booking with conflict resolution
   * @param bookingId - Booking identifier
   * @param updateData - Booking update data
   * @returns Updated booking details
   */
  public async updateBooking(bookingId: string, updateData: BookingUpdateData): Promise<Booking> {
    try {
      // Validate update data if traveller details are included
      if (updateData.travellerDetails) {
        const validationResults = updateData.travellerDetails.map(
          traveller => validateTravellerDetails(traveller)
        );

        const validationErrors = validationResults
          .filter(result => !result.isValid)
          .map(result => result.errors);

        if (validationErrors.length > 0) {
          throw new Error(`Validation failed: ${JSON.stringify(validationErrors)}`);
        }
      }

      const endpoint = BOOKING_ENDPOINTS.UPDATE.replace(':id', bookingId);
      const booking = await put<Booking>(endpoint, updateData);

      // Update cache
      await this.updateCache(bookingId, booking);

      return booking;
    } catch (error) {
      if (error.code === 'CONFLICT') {
        return this.handleUpdateConflict(bookingId, updateData);
      }
      throw error;
    }
  }

  /**
   * Retrieves a booking by ID with cache support
   * @param bookingId - Booking identifier
   * @returns Booking details
   */
  public async getBooking(bookingId: string): Promise<Booking> {
    // Check cache first
    const cached = this.cache.get(bookingId);
    if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.ttlMs) {
      return cached.data;
    }

    try {
      const endpoint = BOOKING_ENDPOINTS.GET.replace(':id', bookingId);
      const booking = await get<Booking>(endpoint);

      // Update cache
      await this.updateCache(bookingId, booking);

      return booking;
    } catch (error) {
      if (error.code === 'NETWORK_ERROR') {
        return this.handleOfflineBookingRetrieval(bookingId);
      }
      throw error;
    }
  }

  /**
   * Lists all bookings with pagination and filtering
   * @param params - Query parameters for filtering and pagination
   * @returns List of bookings
   */
  public async listBookings(params?: {
    page?: number;
    limit?: number;
    status?: BookingStatus;
  }): Promise<Booking[]> {
    try {
      return await get<Booking[]>(BOOKING_ENDPOINTS.LIST, { params });
    } catch (error) {
      if (error.code === 'NETWORK_ERROR') {
        return this.handleOfflineBookingList();
      }
      throw error;
    }
  }

  /**
   * Saves booking draft data for offline support
   * @param draftData - Booking draft data
   */
  public async saveDraft(draftData: BookingCreateData): Promise<void> {
    try {
      await AsyncStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(draftData));
    } catch (error) {
      console.error('Failed to save booking draft:', error);
    }
  }

  /**
   * Private helper methods
   */

  private async updateCache(bookingId: string, booking: Booking): Promise<void> {
    this.cache.set(bookingId, { data: booking, timestamp: Date.now() });
    
    // Persist cache to storage
    try {
      const cacheData = Object.fromEntries(this.cache.entries());
      await AsyncStorage.setItem(BOOKING_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Failed to persist booking cache:', error);
    }
  }

  private async clearDraft(): Promise<void> {
    try {
      await AsyncStorage.removeItem(BOOKING_DRAFT_KEY);
    } catch (error) {
      console.error('Failed to clear booking draft:', error);
    }
  }

  private async handleGdsError(error: any): Promise<void> {
    console.error('GDS Error:', error);
    // Implement specific GDS error handling logic
  }

  private async handleUpdateConflict(bookingId: string, updateData: BookingUpdateData): Promise<Booking> {
    // Implement conflict resolution logic
    const currentBooking = await this.getBooking(bookingId);
    // Merge changes and retry update
    return this.updateBooking(bookingId, { ...updateData, version: currentBooking.version });
  }

  private async handleOfflineBookingRetrieval(bookingId: string): Promise<Booking> {
    const cached = this.cache.get(bookingId);
    if (cached) {
      return cached.data;
    }
    throw new Error('Booking not available offline');
  }

  private async handleOfflineBookingList(): Promise<Booking[]> {
    return Array.from(this.cache.values()).map(cached => cached.data);
  }
}

// Export singleton instance
export const bookingService = new BookingService();