/**
 * @fileoverview Booking service interfaces and types for the AI-Enhanced Social Travel Platform
 * @module booking-service/interfaces/booking
 * @version 1.0.0
 */

import { BaseEntity } from '../../../shared/interfaces/base.interface';

/**
 * Global constants for booking service
 */
export const DEFAULT_CURRENCY = 'USD';
export const MAX_TRAVELLERS = 10;
export const MAX_PAYMENT_SPLITS = 5;
export const MIN_BOOKING_AMOUNT = 0.01;
export const MAX_BOOKING_AMOUNT = 100000.00;

/**
 * Enum representing possible booking statuses
 */
export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

/**
 * Enum representing possible payment statuses
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

/**
 * Interface for traveller personal information and travel documents
 */
export interface ITravellerDetails {
  /** Traveller's first name */
  firstName: string;
  
  /** Traveller's last name */
  lastName: string;
  
  /** Contact email */
  email: string;
  
  /** Contact phone number */
  phone: string;
  
  /** Date of birth for age verification */
  dateOfBirth: Date;
  
  /** Passport number if required */
  passportNumber: string | null;
  
  /** Passport expiry date if applicable */
  passportExpiry: Date | null;
  
  /** Traveller's nationality */
  nationality: string;
  
  /** Special requirements or preferences */
  specialRequirements: string[];
}

/**
 * Interface for split payment tracking
 */
export interface IPaymentSplit {
  /** User ID of the payer */
  userId: string;
  
  /** Payment amount for this split */
  amount: number;
  
  /** Current payment status */
  status: PaymentStatus;
  
  /** Payment processor's intent/transaction ID */
  paymentIntentId: string;
  
  /** Payment method used (e.g., 'card', 'paypal') */
  paymentMethod: string;
  
  /** Timestamp when payment was completed */
  paymentTimestamp: Date | null;
  
  /** Refund status if applicable */
  refundStatus: string | null;
}

/**
 * Main booking interface extending BaseEntity
 * Includes comprehensive booking details with GDS integration
 */
export interface IBooking extends BaseEntity {
  /** ID of user who created the booking */
  userId: string;
  
  /** Current booking status */
  status: BookingStatus;
  
  /** Overall payment status */
  paymentStatus: PaymentStatus;
  
  /** Amadeus GDS Passenger Name Record */
  amadeusPNR: string;
  
  /** Total booking amount */
  totalAmount: number;
  
  /** Currency code (ISO 4217) */
  currency: string;
  
  /** Array of traveller information */
  travellerDetails: ITravellerDetails[];
  
  /** Array of payment splits */
  paymentSplits: IPaymentSplit[];
  
  /** Booking-specific details (flights, hotels, etc.) */
  bookingDetails: Record<string, unknown>;
  
  /** Raw GDS response data */
  gdsResponse: Record<string, unknown>;
  
  /** Cancellation policy text */
  cancellationPolicy: string;
  
  /** Last GDS sync timestamp */
  lastSyncTimestamp: Date;
}

/**
 * Type guard to check if booking is modifiable
 */
export const isBookingModifiable = (booking: IBooking): boolean => {
  return booking.status === BookingStatus.PENDING;
};

/**
 * Type guard to check if booking is refundable
 */
export const isBookingRefundable = (booking: IBooking): boolean => {
  return [BookingStatus.CONFIRMED, BookingStatus.CANCELLED].includes(booking.status) &&
         booking.paymentStatus === PaymentStatus.COMPLETED;
};

/**
 * Type guard to check if payment split is valid
 */
export const isValidPaymentSplit = (splits: IPaymentSplit[]): boolean => {
  if (splits.length > MAX_PAYMENT_SPLITS) return false;
  
  const totalAmount = splits.reduce((sum, split) => sum + split.amount, 0);
  return totalAmount >= MIN_BOOKING_AMOUNT && totalAmount <= MAX_BOOKING_AMOUNT;
};

/**
 * Type guard to check if traveller details are complete
 */
export const isTravellerDetailsComplete = (traveller: ITravellerDetails): boolean => {
  const requiredFields: (keyof ITravellerDetails)[] = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'dateOfBirth',
    'nationality'
  ];
  
  return requiredFields.every(field => !!traveller[field]);
};