/**
 * @fileoverview Type definitions for the booking system in the iOS app.
 * Provides comprehensive type safety for booking-related operations including
 * payment splits, traveller details, and Amadeus GDS integration.
 * @version 1.0.0
 */

/**
 * Enum representing possible states in a booking's lifecycle
 */
export enum BookingStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    CANCELLED = 'CANCELLED',
    COMPLETED = 'COMPLETED'
}

/**
 * Enum representing possible states of a payment transaction
 */
export enum PaymentStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    REFUNDED = 'REFUNDED'
}

/**
 * Interface defining required traveller information for bookings
 */
export interface TravellerDetails {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: Date;
    passportNumber: string;
    passportExpiry: Date;
}

/**
 * Interface for managing split payments in group bookings
 */
export interface PaymentSplit {
    userId: string;
    amount: number;
    status: PaymentStatus;
    paymentIntentId: string;
    paymentMethod: string;
    processingFee: number;
}

/**
 * Interface for Amadeus GDS specific booking requirements
 */
export interface AmadeusBookingDetails {
    itineraryType: string;
    origin: string;
    destination: string;
    departureDate: Date;
    returnDate: Date | null;
    passengers: number;
    cabinClass: string;
    fareType: string;
    segmentDetails: object[];
}

/**
 * Comprehensive interface for booking management
 */
export interface Booking {
    id: string;
    userId: string;
    status: BookingStatus;
    paymentStatus: PaymentStatus;
    amadeusPNR: string;
    totalAmount: number;
    currency: string;
    travellerDetails: TravellerDetails[];
    paymentSplits: PaymentSplit[];
    bookingDetails: AmadeusBookingDetails;
    createdAt: Date;
    updatedAt: Date;
    cancellationPolicy: object;
    specialRequests: string[];
}

/**
 * Global constants for booking system configuration
 */
export const MAX_TRAVELLERS: number = 10;
export const MAX_PAYMENT_SPLITS: number = 5;
export const DEFAULT_CURRENCY: string = 'USD';
export const SUPPORTED_CURRENCIES: string[] = ['USD', 'EUR', 'GBP', 'JPY'];
export const MIN_BOOKING_AMOUNT: number = 50;

/**
 * Type guard to check if a currency is supported
 */
export const isSupportedCurrency = (currency: string): boolean => {
    return SUPPORTED_CURRENCIES.includes(currency);
};

/**
 * Type guard to check if a booking is modifiable
 */
export const isBookingModifiable = (status: BookingStatus): boolean => {
    return status === BookingStatus.PENDING || status === BookingStatus.CONFIRMED;
};

/**
 * Type guard to check if a payment is refundable
 */
export const isPaymentRefundable = (status: PaymentStatus): boolean => {
    return status === PaymentStatus.COMPLETED;
};