/**
 * @fileoverview Booking type definitions for Android mobile app
 * Provides TypeScript interfaces and types for booking-related data structures,
 * ensuring type safety and consistency with backend booking service and Amadeus GDS integration.
 */

/**
 * Enum defining possible booking status values for tracking reservation states in the Amadeus GDS system
 */
export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

/**
 * Enum defining possible payment status values for split payment tracking
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED'
}

/**
 * Interface for comprehensive traveller personal information required by Amadeus GDS
 */
export interface TravellerDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;  // ISO 8601 format
  passportNumber: string;
  passportExpiry: string;  // ISO 8601 format
  nationality: string;  // ISO 3166-1 alpha-2 country code
  frequentFlyerNumber: string;
}

/**
 * Interface for detailed split payment information including processing fees and due dates
 */
export interface PaymentSplit {
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentIntentId: string;
  paymentMethod: string;
  processingFee: number;
  dueDate: string;  // ISO 8601 format
}

/**
 * Comprehensive interface for booking data structure with Amadeus GDS integration and split payment support
 */
export interface Booking {
  id: string;
  userId: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  amadeusPNR: string;  // Passenger Name Record in Amadeus GDS
  gdsBookingReference: string;  // Global Distribution System reference
  totalAmount: number;
  currency: string;
  travellerDetails: TravellerDetails[];
  paymentSplits: PaymentSplit[];
  bookingDetails: object;  // Flexible object for specific booking type details
  cancellationPolicy: object;  // Flexible object for cancellation rules
  createdAt: string;  // ISO 8601 format
  updatedAt: string;  // ISO 8601 format
  expiresAt: string;  // ISO 8601 format
}

/**
 * Global constants for booking-related configurations
 */
export const DEFAULT_CURRENCY = 'USD';
export const MAX_TRAVELLERS = 10;
export const MAX_PAYMENT_SPLITS = 5;
export const PAYMENT_SPLIT_TIMEOUT_HOURS = 24;
export const BOOKING_EXPIRY_MINUTES = 30;
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD'];