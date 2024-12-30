/**
 * @fileoverview Date utility functions for the AI-Enhanced Social Travel Platform
 * Provides comprehensive date formatting, manipulation, and validation utilities
 * with timezone handling and GDS compatibility
 * @version 1.0.0
 */

import { format, differenceInDays, addDays, parseISO } from 'date-fns'; // v2.30.0
import { BOOKING_VALIDATION } from '../constants/validation';

// Global date format constants
export const DEFAULT_DATE_FORMAT = 'yyyy-MM-dd' as const;
export const DISPLAY_DATE_FORMAT = 'MMM dd, yyyy' as const;
export const DATE_WITH_TIME_FORMAT = 'MMM dd, yyyy HH:mm' as const;

/**
 * Custom error class for date-related errors
 */
class DateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DateValidationError';
  }
}

/**
 * Formats a date into a localized string based on specified format
 * @param date - Date to format or ISO date string
 * @param formatString - Desired output format
 * @returns Formatted date string in user's locale
 * @throws {DateValidationError} If date is invalid
 */
export const formatDate = (date: Date | string, formatString: string = DEFAULT_DATE_FORMAT): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!dateObj || isNaN(dateObj.getTime())) {
      throw new DateValidationError('Invalid date provided');
    }

    return format(dateObj, formatString);
  } catch (error) {
    if (error instanceof DateValidationError) {
      throw error;
    }
    throw new DateValidationError('Error formatting date');
  }
};

/**
 * Calculates the duration between check-in and check-out dates
 * @param checkInDate - Check-in date
 * @param checkOutDate - Check-out date
 * @returns Number of nights stay
 * @throws {DateValidationError} If dates are invalid or in wrong order
 */
export const calculateStayDuration = (checkInDate: Date, checkOutDate: Date): number => {
  try {
    if (!checkInDate || !checkOutDate || 
        isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      throw new DateValidationError('Invalid date objects provided');
    }

    const duration = differenceInDays(checkOutDate, checkInDate);
    
    if (duration < 0) {
      throw new DateValidationError('Check-out date must be after check-in date');
    }

    return duration;
  } catch (error) {
    if (error instanceof DateValidationError) {
      throw error;
    }
    throw new DateValidationError('Error calculating stay duration');
  }
};

/**
 * Validates if booking dates meet all requirements
 * @param checkInDate - Check-in date
 * @param checkOutDate - Check-out date
 * @returns Whether dates are valid
 */
export const validateBookingDates = (checkInDate: Date, checkOutDate: Date): boolean => {
  try {
    // Validate date objects
    if (!checkInDate || !checkOutDate || 
        isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return false;
    }

    // Check if dates are in the past
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (checkInDate < now) {
      return false;
    }

    // Calculate and validate stay duration
    const duration = calculateStayDuration(checkInDate, checkOutDate);
    
    if (duration < BOOKING_VALIDATION.minStayDuration || 
        duration > BOOKING_VALIDATION.maxStayDuration) {
      return false;
    }

    // Validate advance booking limit
    const maxAdvanceDate = addDays(now, BOOKING_VALIDATION.advanceBookingDays);
    if (checkInDate > maxAdvanceDate) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Calculates default checkout date based on check-in date
 * @param checkInDate - Selected check-in date
 * @returns Suggested checkout date
 * @throws {DateValidationError} If check-in date is invalid
 */
export const getDefaultCheckoutDate = (checkInDate: Date): Date => {
  try {
    if (!checkInDate || isNaN(checkInDate.getTime())) {
      throw new DateValidationError('Invalid check-in date provided');
    }

    // Add minimum stay duration to check-in date
    return addDays(checkInDate, BOOKING_VALIDATION.minStayDuration);
  } catch (error) {
    if (error instanceof DateValidationError) {
      throw error;
    }
    throw new DateValidationError('Error calculating default checkout date');
  }
};

/**
 * Safely parses date strings from booking forms
 * @param dateString - Date string to parse
 * @returns Parsed date or null if invalid
 */
export const parseBookingDate = (dateString: string): Date | null => {
  try {
    if (!dateString) {
      return null;
    }

    // Attempt to parse the date string
    const parsedDate = parseISO(dateString);
    
    // Validate the parsed date
    if (isNaN(parsedDate.getTime())) {
      return null;
    }

    // Normalize the time to midnight UTC
    parsedDate.setUTCHours(0, 0, 0, 0);

    return parsedDate;
  } catch (error) {
    return null;
  }
};

/**
 * Type guard to check if a value is a valid Date object
 * @param value - Value to check
 * @returns Whether the value is a valid Date
 */
export const isValidDate = (value: any): value is Date => {
  return value instanceof Date && !isNaN(value.getTime());
};