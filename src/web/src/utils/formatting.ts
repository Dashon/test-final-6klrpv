/**
 * @fileoverview Comprehensive utility functions for data formatting with internationalization support
 * @version 1.0.0
 * Provides enterprise-grade formatting utilities for currency, phone numbers, addresses,
 * text truncation, and percentages with full locale support
 * 
 * External Dependencies:
 * - date-fns@^2.30.0
 * - intl@^1.2.5
 */

import { BOOKING_VALIDATION } from '../constants/validation';
import { format } from 'date-fns';

// Global Constants
export const DEFAULT_CURRENCY = 'USD';
export const DEFAULT_LOCALE = 'en-US';
export const DEFAULT_DECIMAL_PLACES = 2;
export const MAX_TEXT_LENGTH = 100;
export const SUPPORTED_LOCALES = ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'];

// Regional formatting patterns
const PHONE_NUMBER_PATTERNS: Record<string, string> = {
  US: '(xxx) xxx-xxxx',
  GB: 'xxxx xxx xxxx',
  FR: 'xx xx xx xx xx',
  DE: 'xxxx xxxxxxx',
  JP: 'xx-xxxx-xxxx',
  CN: 'xxx-xxxx-xxxx'
};

const ADDRESS_FORMATS: Record<string, string[]> = {
  US: ['street', 'city', 'state', 'zip'],
  GB: ['street', 'city', 'postcode'],
  JP: ['zip', 'state', 'city', 'street'],
  CN: ['country', 'province', 'city', 'street']
};

/**
 * Formats a number as currency with comprehensive localization support
 * @param amount - The numeric amount to format
 * @param currencyCode - ISO 4217 currency code (default: USD)
 * @param locale - BCP 47 language tag (default: en-US)
 * @returns Formatted currency string
 * @throws Error if amount is invalid or below minimum
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE
): string {
  // Validate amount
  if (amount < BOOKING_VALIDATION.minPaymentAmount) {
    throw new Error(`Amount must be at least ${BOOKING_VALIDATION.minPaymentAmount}`);
  }

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: DEFAULT_DECIMAL_PLACES,
      maximumFractionDigits: DEFAULT_DECIMAL_PLACES
    });

    return formatter.format(amount);
  } catch (error) {
    // Fallback formatting for unsupported locales
    return new Intl.NumberFormat(DEFAULT_LOCALE, {
      style: 'currency',
      currency: currencyCode
    }).format(amount);
  }
}

/**
 * Formats phone numbers with international support
 * @param phoneNumber - Raw phone number string
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @param includeCountryCode - Whether to include country code prefix
 * @returns Formatted phone number string
 */
export function formatPhoneNumber(
  phoneNumber: string,
  countryCode: string,
  includeCountryCode: boolean = false
): string {
  // Clean input - remove non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Validate input
  if (!cleaned || cleaned.length < 10) {
    throw new Error('Invalid phone number');
  }

  const pattern = PHONE_NUMBER_PATTERNS[countryCode.toUpperCase()] || PHONE_NUMBER_PATTERNS.US;
  let formatted = pattern;

  // Apply pattern
  let digitIndex = 0;
  for (let i = 0; i < pattern.length && digitIndex < cleaned.length; i++) {
    if (pattern[i] === 'x') {
      formatted = formatted.replace('x', cleaned[digitIndex]);
      digitIndex++;
    }
  }

  // Add country code if requested
  if (includeCountryCode) {
    const countryPrefixes: Record<string, string> = {
      US: '+1', GB: '+44', FR: '+33', DE: '+49', JP: '+81', CN: '+86'
    };
    const prefix = countryPrefixes[countryCode.toUpperCase()] || '';
    return `${prefix} ${formatted}`;
  }

  return formatted;
}

/**
 * Formats addresses with international support
 * @param addressObject - Object containing address components
 * @param locale - BCP 47 language tag
 * @param includeCountry - Whether to include country name
 * @returns Formatted address string
 */
export function formatAddress(
  addressObject: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    apartment?: string;
  },
  locale: string = DEFAULT_LOCALE,
  includeCountry: boolean = false
): string {
  const country = locale.split('-')[1] || 'US';
  const format = ADDRESS_FORMATS[country] || ADDRESS_FORMATS.US;
  
  // Build address components
  const components: string[] = [];
  
  // Add apartment/suite if provided
  if (addressObject.street) {
    components.push(addressObject.street + (addressObject.apartment ? ` ${addressObject.apartment}` : ''));
  }

  // Follow country-specific format
  format.forEach(part => {
    if (part !== 'street' && addressObject[part as keyof typeof addressObject]) {
      components.push(addressObject[part as keyof typeof addressObject] as string);
    }
  });

  // Add country name if requested
  if (includeCountry && addressObject.country) {
    components.push(addressObject.country);
  }

  return components.join(', ');
}

/**
 * Truncates text with Unicode support
 * @param text - Input text to truncate
 * @param maxLength - Maximum length (default: 100)
 * @param options - Truncation options
 * @returns Truncated text string
 */
export function truncateText(
  text: string,
  maxLength: number = MAX_TEXT_LENGTH,
  options: {
    preserveWords?: boolean;
    ellipsis?: string;
    stripHtml?: boolean;
  } = {}
): string {
  const {
    preserveWords = true,
    ellipsis = '...',
    stripHtml = true
  } = options;

  // Strip HTML if requested
  let processedText = stripHtml ? text.replace(/<[^>]*>/g, '') : text;

  if (processedText.length <= maxLength) {
    return processedText;
  }

  let truncated = processedText.slice(0, maxLength - ellipsis.length);

  if (preserveWords) {
    // Find last word boundary
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 0) {
      truncated = truncated.slice(0, lastSpace);
    }
  }

  return truncated + ellipsis;
}

/**
 * Formats percentages with locale support
 * @param value - Numeric value (0-100)
 * @param decimalPlaces - Number of decimal places
 * @param locale - BCP 47 language tag
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number,
  decimalPlaces: number = DEFAULT_DECIMAL_PLACES,
  locale: string = DEFAULT_LOCALE
): string {
  // Validate input
  if (value < 0 || value > 100) {
    throw new Error('Percentage must be between 0 and 100');
  }

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    });

    return formatter.format(value / 100);
  } catch (error) {
    // Fallback formatting
    return new Intl.NumberFormat(DEFAULT_LOCALE, {
      style: 'percent',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    }).format(value / 100);
  }
}