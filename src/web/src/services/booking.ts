/**
 * Booking Service Module
 * Version: 1.0.0
 * 
 * Handles all booking-related operations including travel reservations,
 * payment processing, and booking management through Amadeus GDS integration.
 * Supports split payments and comprehensive error handling.
 * 
 * @packageDocumentation
 */

import { AxiosResponse } from 'axios'; // ^1.4.0
import { AmadeusSDK } from '@amadeus/sdk'; // ^5.0.0
import {
  Booking,
  AmadeusBookingDetails,
  TravellerDetails,
  PaymentSplit,
  BookingStatus,
  PaymentStatus,
  DEFAULT_CURRENCY,
  MAX_TRAVELLERS,
  MAX_PAYMENT_SPLITS,
  isSupportedCurrency
} from '../types/booking';
import { handleGDSError, retryRequest } from '../utils/api';
import { API_ENDPOINTS, EXTERNAL_SERVICES } from '../constants/api';

// Initialize Amadeus SDK
const amadeus = new AmadeusSDK({
  clientId: process.env.AMADEUS_CLIENT_ID!,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET!,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'test'
});

/**
 * Interface for booking creation parameters
 */
interface BookingCreateParams {
  checkInDate: Date;
  checkOutDate: Date;
  travellers: TravellerDetails[];
  paymentSplits?: PaymentSplit[];
  currency: string;
  totalAmount: number;
  gdsOptions: AmadeusBookingOptions;
}

/**
 * Interface for Amadeus booking options
 */
interface AmadeusBookingOptions {
  fareClass: string;
  segmentDetails: GDSSegment[];
  specialRequests?: string[];
  pnrOptions?: PNROptions;
}

/**
 * Interface for GDS segment details
 */
interface GDSSegment {
  origin: string;
  destination: string;
  departureDate: Date;
  returnDate?: Date;
  passengerCount: number;
  cabinClass: string;
}

/**
 * Interface for PNR options
 */
interface PNROptions {
  timeLimit?: number;
  queue?: string;
  officeId?: string;
}

/**
 * Creates a new booking with Amadeus GDS integration and split payment support
 * @param params - Booking creation parameters
 * @returns Promise resolving to created booking details
 * @throws ApiError if booking creation fails
 */
export const createBooking = async (params: BookingCreateParams): Promise<Booking> => {
  try {
    // Validate booking parameters
    validateBookingParams(params);

    // Check real-time inventory availability
    const availability = await checkInventoryAvailability(params.gdsOptions);
    if (!availability.available) {
      throw new Error('Selected inventory is no longer available');
    }

    // Process payment splits if provided
    let paymentSplits: PaymentSplit[] = [];
    if (params.paymentSplits && params.paymentSplits.length > 0) {
      paymentSplits = await processPaymentSplit(params.totalAmount, params.paymentSplits);
    }

    // Create PNR in Amadeus GDS
    const gdsBooking = await createGDSBooking(params);

    // Create booking record
    const booking: Booking = {
      id: generateBookingId(),
      userId: getCurrentUserId(),
      status: BookingStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      amadeusPNR: gdsBooking.pnr,
      totalAmount: params.totalAmount,
      currency: params.currency,
      travellerDetails: params.travellers,
      paymentSplits,
      amadeusDetails: gdsBooking,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: calculateExpiryDate(gdsBooking.ticketTimeLimit),
      metadata: {}
    };

    // Save booking to backend
    const savedBooking = await saveBooking(booking);

    // Process initial payments
    if (paymentSplits.length > 0) {
      await processInitialPayments(savedBooking.id, paymentSplits);
    }

    return savedBooking;
  } catch (error) {
    handleGDSError(error);
    throw error;
  }
};

/**
 * Processes split payments for a booking
 * @param bookingId - ID of the booking
 * @param splits - Array of payment splits
 * @returns Promise resolving to processed payment splits
 */
export const processPaymentSplit = async (
  totalAmount: number,
  splits: PaymentSplit[]
): Promise<PaymentSplit[]> => {
  // Validate total split amount matches booking total
  const splitTotal = splits.reduce((sum, split) => sum + split.amount, 0);
  if (splitTotal !== totalAmount) {
    throw new Error('Split payment total does not match booking amount');
  }

  // Create payment intents for each split
  const processedSplits = await Promise.all(
    splits.map(async (split) => {
      const paymentIntent = await createPaymentIntent({
        amount: split.amount,
        currency: split.currency,
        userId: split.userId
      });

      return {
        ...split,
        paymentIntentId: paymentIntent.id,
        status: PaymentStatus.PENDING
      };
    })
  );

  return processedSplits;
};

/**
 * Validates booking parameters
 * @param params - Booking parameters to validate
 * @throws Error if validation fails
 */
const validateBookingParams = (params: BookingCreateParams): void => {
  if (params.travellers.length > MAX_TRAVELLERS) {
    throw new Error(`Maximum number of travellers exceeded: ${MAX_TRAVELLERS}`);
  }

  if (params.paymentSplits && params.paymentSplits.length > MAX_PAYMENT_SPLITS) {
    throw new Error(`Maximum number of payment splits exceeded: ${MAX_PAYMENT_SPLITS}`);
  }

  if (!isSupportedCurrency(params.currency)) {
    throw new Error(`Unsupported currency: ${params.currency}`);
  }

  if (params.checkInDate <= new Date()) {
    throw new Error('Check-in date must be in the future');
  }

  if (params.checkOutDate <= params.checkInDate) {
    throw new Error('Check-out date must be after check-in date');
  }
};

/**
 * Checks inventory availability in Amadeus GDS
 * @param options - GDS booking options
 * @returns Promise resolving to availability status
 */
const checkInventoryAvailability = async (
  options: AmadeusBookingOptions
): Promise<{ available: boolean; fareDetails?: any }> => {
  const response = await retryRequest(async () => {
    return await amadeus.shopping.availability.get({
      ...options,
      numberOfResults: 1
    });
  });

  return {
    available: response.data.length > 0,
    fareDetails: response.data[0]
  };
};

/**
 * Creates a booking in Amadeus GDS
 * @param params - Booking parameters
 * @returns Promise resolving to GDS booking details
 */
const createGDSBooking = async (
  params: BookingCreateParams
): Promise<AmadeusBookingDetails> => {
  const response = await retryRequest(async () => {
    return await amadeus.booking.flightOrders.post({
      data: {
        type: 'flight-order',
        flightOffers: [params.gdsOptions],
        travelers: params.travellers.map(mapTravellerToGDSFormat)
      }
    });
  });

  return mapGDSResponseToBookingDetails(response.data);
};

/**
 * Maps traveller details to GDS format
 * @param traveller - Traveller details
 * @returns GDS formatted traveller data
 */
const mapTravellerToGDSFormat = (traveller: TravellerDetails) => ({
  id: generateTravellerId(),
  dateOfBirth: traveller.dateOfBirth.toISOString().split('T')[0],
  name: {
    firstName: traveller.firstName,
    lastName: traveller.lastName
  },
  contact: {
    emailAddress: traveller.email,
    phones: [{
      deviceType: 'MOBILE',
      countryCallingCode: '1',
      number: traveller.phone
    }]
  },
  documents: [{
    documentType: 'PASSPORT',
    number: traveller.passportNumber,
    expiryDate: traveller.passportExpiry.toISOString().split('T')[0],
    issuanceCountry: traveller.nationality
  }]
});

/**
 * Maps GDS response to booking details format
 * @param gdsResponse - Response from Amadeus GDS
 * @returns Formatted booking details
 */
const mapGDSResponseToBookingDetails = (gdsResponse: any): AmadeusBookingDetails => {
  // Implementation of mapping GDS response to AmadeusBookingDetails
  // This would contain complex mapping logic based on the Amadeus response format
  return {
    pnr: gdsResponse.id,
    itineraryDetails: {
      // Map itinerary details
    },
    fareDetails: {
      // Map fare details
    },
    segmentDetails: [
      // Map segment details
    ],
    gdsTimestamp: new Date(gdsResponse.lastModified),
    ticketTimeLimit: new Date(gdsResponse.ticketingAgreement.deadline)
  };
};

// Helper functions
const generateBookingId = (): string => {
  return `BK${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
};

const getCurrentUserId = (): string => {
  // Implementation to get current user ID from auth context
  return 'user-id';
};

const calculateExpiryDate = (ticketTimeLimit: Date): Date => {
  return new Date(Math.min(
    ticketTimeLimit.getTime(),
    Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  ));
};

const createPaymentIntent = async (params: {
  amount: number;
  currency: string;
  userId: string;
}): Promise<{ id: string }> => {
  // Implementation to create payment intent
  return { id: 'pi_123' };
};

const saveBooking = async (booking: Booking): Promise<Booking> => {
  // Implementation to save booking to backend
  return booking;
};

const processInitialPayments = async (
  bookingId: string,
  splits: PaymentSplit[]
): Promise<void> => {
  // Implementation to process initial payments
};