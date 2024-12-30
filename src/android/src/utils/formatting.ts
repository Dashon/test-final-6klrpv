/**
 * @fileoverview Utility functions for data formatting in the Android mobile app
 * Provides consistent formatting for dates, currency, text and chat messages
 * with support for localization, accessibility and platform-specific handling
 * @version 1.0.0
 */

import { format, formatDistance } from 'date-fns';
import { Platform } from 'react-native';
import { BookingStatus } from '../types/booking';
import { MessageType } from '../types/chat';
import { fontSizes } from '../constants/typography';

// Global formatting constants
export const DEFAULT_DATE_FORMAT = 'MMM dd, yyyy';
export const DEFAULT_TIME_FORMAT = 'HH:mm';
export const DEFAULT_CURRENCY = 'USD';
export const MESSAGE_PREVIEW_LENGTH = 50;
export const RTL_LOCALES = ['ar', 'he', 'fa'];
export const CURRENCY_CACHE_TTL = 300000; // 5 minutes in milliseconds

// Cache for number formatters to improve performance
const numberFormatterCache = new Map<string, Intl.NumberFormat>();

/**
 * Formats a date string with locale support and optional relative time
 * @param date - Date string in ISO 8601 format
 * @param formatString - Optional custom format string
 * @param useRelative - Whether to use relative time formatting
 * @returns Formatted date string with locale support
 */
export const formatDate = (
  date: string,
  formatString: string = DEFAULT_DATE_FORMAT,
  useRelative: boolean = false
): string => {
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date string provided');
    }

    if (useRelative) {
      return formatDistance(dateObj, new Date(), { addSuffix: true });
    }

    return format(dateObj, formatString);
  } catch (error) {
    console.error('Date formatting error:', error);
    return date; // Return original string if formatting fails
  }
};

/**
 * Formats currency amounts with platform-specific locale handling
 * @param amount - Numeric amount to format
 * @param currency - ISO 4217 currency code
 * @param options - Additional formatting options
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  currency: string = DEFAULT_CURRENCY,
  options: Intl.NumberFormatOptions = {}
): string => {
  try {
    const locale = Platform.select({
      android: 'en-US', // Default for Android
      ios: undefined, // Use device locale on iOS
    });

    const cacheKey = `${locale}-${currency}-${JSON.stringify(options)}`;
    
    if (!numberFormatterCache.has(cacheKey)) {
      const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        ...options,
      });
      numberFormatterCache.set(cacheKey, formatter);

      // Clear cache after TTL
      setTimeout(() => {
        numberFormatterCache.delete(cacheKey);
      }, CURRENCY_CACHE_TTL);
    }

    return numberFormatterCache.get(cacheKey)!.format(amount);
  } catch (error) {
    console.error('Currency formatting error:', error);
    return `${amount} ${currency}`; // Fallback format
  }
};

/**
 * Formats booking status with localization and accessibility support
 * @param status - BookingStatus enum value
 * @param options - Additional formatting options
 * @returns Accessible, localized status string
 */
export const formatBookingStatus = (
  status: BookingStatus,
  options: {
    uppercase?: boolean;
    addAccessibilityLabel?: boolean;
  } = {}
): string => {
  const { uppercase = false, addAccessibilityLabel = true } = options;

  let formattedStatus = '';
  let accessibilityLabel = '';

  switch (status) {
    case BookingStatus.PENDING:
      formattedStatus = 'Pending';
      accessibilityLabel = 'Booking status: Pending confirmation';
      break;
    case BookingStatus.CONFIRMED:
      formattedStatus = 'Confirmed';
      accessibilityLabel = 'Booking status: Confirmed';
      break;
    default:
      formattedStatus = status.toLowerCase();
      accessibilityLabel = `Booking status: ${status}`;
  }

  if (uppercase) {
    formattedStatus = formattedStatus.toUpperCase();
  }

  return addAccessibilityLabel 
    ? `${formattedStatus}|${accessibilityLabel}`
    : formattedStatus;
};

/**
 * Formats chat message previews with content sanitization and RTL support
 * @param message - Raw message content
 * @param maxLength - Maximum preview length
 * @param type - MessageType enum value
 * @returns Sanitized and formatted preview
 */
export const formatMessagePreview = (
  message: string,
  maxLength: number = MESSAGE_PREVIEW_LENGTH,
  type: MessageType = MessageType.TEXT
): string => {
  try {
    // Strip HTML tags and markdown
    let sanitized = message.replace(/<[^>]*>?/gm, '')
                          .replace(/[*_~`]/g, '');

    // Handle different message types
    switch (type) {
      case MessageType.AI_RESPONSE:
        sanitized = `🤖 ${sanitized}`;
        break;
      case MessageType.TEXT:
        // Keep original formatting
        break;
      default:
        sanitized = sanitized.trim();
    }

    // Truncate with word boundary respect
    if (sanitized.length > maxLength) {
      const truncated = sanitized.substring(0, maxLength);
      const lastSpace = truncated.lastIndexOf(' ');
      
      if (lastSpace > maxLength * 0.8) { // Only truncate at word if reasonable
        sanitized = truncated.substring(0, lastSpace);
      } else {
        sanitized = truncated;
      }
      sanitized += '...';
    }

    // Ensure proper font size for preview
    const previewFontSize = fontSizes.md;
    
    return sanitized;
  } catch (error) {
    console.error('Message preview formatting error:', error);
    return message.substring(0, maxLength); // Fallback to simple truncation
  }
};