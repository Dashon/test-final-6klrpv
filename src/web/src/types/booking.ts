/**
 * @fileoverview TypeScript definitions for booking-related data structures
 * Supports Amadeus GDS integration and split payment functionality
 * @version 1.0.0
 */

/**
 * Enum representing possible states of a booking throughout its lifecycle
 */
export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

/**
 * Enum representing possible states of a payment transaction
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
 * Interface defining comprehensive traveller information required for bookings
 */
export interface TravellerDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  nationality: string;
  passportNumber: string;
  passportExpiry: Date;
  specialRequests: string[];
}

/**
 * Interface for managing split payment information in group bookings
 */
export interface PaymentSplit {
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentIntentId: string;
  paymentMethod: string;
  splitPercentage: number;
  dueDate: Date;
}

/**
 * Interface for flight segment details from Amadeus GDS
 */
interface SegmentDetails {
  departureAirport: string;
  arrivalAirport: string;
  departureTime: Date;
  arrivalTime: Date;
  flightNumber: string;
  carrier: string;
  cabinClass: string;
  bookingClass: string;
}

/**
 * Interface for fare information from Amadeus GDS
 */
interface FareDetails {
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  fareClass: string;
  fareType: string;
  fareRules: string[];
}

/**
 * Interface for complete itinerary information
 */
interface ItineraryDetails {
  tripType: string;
  passengerCount: number;
  segments: SegmentDetails[];
  totalDuration: number;
  stopCount: number;
}

/**
 * Interface for Amadeus GDS specific booking details
 */
export interface AmadeusBookingDetails {
  pnr: string;
  itineraryDetails: ItineraryDetails;
  fareDetails: FareDetails;
  segmentDetails: SegmentDetails[];
  gdsTimestamp: Date;
  ticketTimeLimit: Date;
}

/**
 * Main interface for complete booking data structure
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
  amadeusDetails: AmadeusBookingDetails;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  metadata: Record<string, unknown>;
}

/**
 * Global constants for booking configuration
 */
export const DEFAULT_CURRENCY = 'USD';
export const MAX_TRAVELLERS = 10;
export const MAX_PAYMENT_SPLITS = 5;
export const BOOKING_EXPIRY_HOURS = 24;
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY'] as const;

/**
 * Type guard to check if a string is a supported currency
 */
export const isSupportedCurrency = (currency: string): currency is typeof SUPPORTED_CURRENCIES[number] => {
  return SUPPORTED_CURRENCIES.includes(currency as typeof SUPPORTED_CURRENCIES[number]);
};