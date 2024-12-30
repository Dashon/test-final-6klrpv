/**
 * @fileoverview Comprehensive utility functions for data formatting in the iOS app
 * Provides type-safe, locale-aware formatting for dates, currency, phone numbers,
 * and booking statuses with proper internationalization support.
 * @version 1.0.0
 * @requires date-fns ^2.30.0
 * @requires react-native-localize ^3.0.0
 */

import { format as dateFnsFormat, isValid, parseISO } from 'date-fns'; // ^2.30.0
import { getLocales, getCurrencySymbol, getNumberFormatSettings } from 'react-native-localize'; // ^3.0.0
import { BookingStatus } from '../types/booking';
import memoize from 'lodash/memoize';

// Global constants for date formatting
export const DATE_FORMATS = {
  short: 'MMM dd',
  medium: 'MMM dd, yyyy',
  long: 'MMMM dd, yyyy',
  full: 'EEEE, MMMM dd, yyyy',
  time: 'HH:mm',
  datetime: 'MMM dd, yyyy HH:mm'
} as const;

export const DEFAULT_DATE_FORMAT = DATE_FORMATS.medium;
export const DEFAULT_CURRENCY = 'USD';

// Type definitions
type DateFormatKey = keyof typeof DATE_FORMATS;
type FormatDateOptions = DateFormatKey | string;

/**
 * Formats a date using date-fns with proper validation and error handling
 * @param date - Date object or ISO string to format
 * @param formatKey - Optional format key from DATE_FORMATS or custom format string
 * @returns Formatted date string
 * @throws TypeError for invalid date inputs
 */
export const formatDate = (date: Date | string, formatKey: FormatDateOptions = DEFAULT_DATE_FORMAT): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObj)) {
      throw new TypeError('Invalid date provided');
    }

    const formatString = DATE_FORMATS[formatKey as DateFormatKey] || formatKey;
    return dateFnsFormat(dateObj, formatString);
  } catch (error) {
    console.error('Date formatting error:', error);
    throw new TypeError('Failed to format date');
  }
};

/**
 * Memoized currency formatter factory for performance optimization
 */
const getCurrencyFormatter = memoize((locale: string, currency: string) => 
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
);

/**
 * Formats a number as currency with proper locale and symbol placement
 * @param amount - Numeric amount to format
 * @param currency - Optional currency code (defaults to device locale currency)
 * @returns Formatted currency string
 * @throws TypeError for invalid amount
 */
export const formatCurrencyValue = (amount: number, currency: string = DEFAULT_CURRENCY): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new TypeError('Invalid amount provided');
  }

  const deviceLocale = getLocales()[0].languageTag;
  const formatter = getCurrencyFormatter(deviceLocale, currency);
  
  try {
    return formatter.format(amount);
  } catch (error) {
    console.error('Currency formatting error:', error);
    return `${currency} ${amount.toFixed(2)}`;
  }
};

/**
 * Formats phone numbers to consistent international format
 * @param phone - Phone number string to format
 * @param countryCode - Optional country code (defaults to device locale)
 * @returns Formatted phone number string
 * @throws TypeError for invalid phone number
 */
export const formatPhoneNumber = (phone: string, countryCode?: string): string => {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length < 10) {
    throw new TypeError('Invalid phone number length');
  }

  const deviceLocale = getLocales()[0];
  const defaultCountry = countryCode || deviceLocale.countryCode;

  try {
    // Format for US numbers (can be expanded for other countries)
    if (defaultCountry === 'US') {
      const match = cleaned.match(/^(\d{1,3})(\d{3})(\d{3})(\d{4})$/);
      if (match) {
        const [_, countryCode, areaCode, prefix, line] = match;
        return `+${countryCode} (${areaCode}) ${prefix}-${line}`;
      }
    }

    // Default international format
    return `+${cleaned.slice(0, cleaned.length - 10)} ${cleaned.slice(-10, -7)} ${cleaned.slice(-7, -4)} ${cleaned.slice(-4)}`;
  } catch (error) {
    console.error('Phone formatting error:', error);
    return phone; // Return original if formatting fails
  }
};

/**
 * Status display configurations with semantic meanings
 */
const STATUS_DISPLAY = {
  [BookingStatus.PENDING]: {
    text: 'Pending',
    accessibility: 'Booking status: Pending confirmation'
  },
  [BookingStatus.CONFIRMED]: {
    text: 'Confirmed',
    accessibility: 'Booking status: Confirmed'
  },
  [BookingStatus.CANCELLED]: {
    text: 'Cancelled',
    accessibility: 'Booking status: Cancelled'
  },
  [BookingStatus.COMPLETED]: {
    text: 'Completed',
    accessibility: 'Booking status: Completed'
  }
} as const;

/**
 * Formats booking status for display with proper localization
 * @param status - BookingStatus enum value
 * @param locale - Optional locale string (defaults to device locale)
 * @returns Formatted and localized status string
 */
export const formatBookingStatus = (status: BookingStatus, locale?: string): string => {
  const deviceLocale = locale || getLocales()[0].languageTag;
  
  try {
    const statusConfig = STATUS_DISPLAY[status];
    // TODO: Implement proper translations when i18n system is in place
    return {
      text: statusConfig.text,
      accessibility: statusConfig.accessibility
    };
  } catch (error) {
    console.error('Status formatting error:', error);
    return status.toString();
  }
};

/**
 * Utility function to truncate text with ellipsis
 * @param text - String to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated string with ellipsis if needed
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
};

/**
 * Formats percentage values for display
 * @param value - Number to format as percentage
 * @param decimals - Optional decimal places (defaults to 0)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number, decimals: number = 0): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new TypeError('Invalid value for percentage');
  }
  return `${value.toFixed(decimals)}%`;
};