/**
 * @fileoverview Advanced validation utility module for Android mobile app
 * Implements secure validation for form inputs, data structures, and business rules
 * with support for error messages, localization, and offline validation capabilities.
 * @version 1.0.0
 */

import { isEmail, isMobilePhone, isPassportNumber } from 'validator'; // v13.9.0
import { LoginCredentials, RegisterData } from '../types/auth';
import { TravellerDetails } from '../types/booking';

// Validation interfaces
export interface ValidationResult {
  isValid: boolean;
  errors: { [key: string]: string };
  locale?: string;
}

interface ValidationCache {
  key: string;
  result: ValidationResult;
  timestamp: number;
}

// Constants
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;
const CACHE_TTL = 300000; // 5 minutes in milliseconds

// Validation cache storage
const validationCache = new Map<string, ValidationCache>();

/**
 * Enhanced email validation with caching and offline support
 * @param email - Email address to validate
 * @param locale - Optional locale for error messages
 * @returns ValidationResult with localized error messages
 */
export const validateEmail = (email: string, locale = 'en'): ValidationResult => {
  const cacheKey = `email:${email}:${locale}`;
  const cached = validationCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  const result: ValidationResult = {
    isValid: true,
    errors: {},
    locale
  };

  if (!email) {
    result.isValid = false;
    result.errors.email = 'Email is required';
    return result;
  }

  if (!isEmail(email)) {
    result.isValid = false;
    result.errors.email = 'Invalid email format';
    return result;
  }

  // Cache the validation result
  validationCache.set(cacheKey, {
    key: cacheKey,
    result,
    timestamp: Date.now()
  });

  return result;
};

/**
 * Enhanced password validation with strength requirements
 * @param password - Password to validate
 * @param locale - Optional locale for error messages
 * @returns ValidationResult with localized error messages
 */
export const validatePassword = (password: string, locale = 'en'): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: {},
    locale
  };

  if (!password) {
    result.isValid = false;
    result.errors.password = 'Password is required';
    return result;
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    result.isValid = false;
    result.errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
    return result;
  }

  if (!PASSWORD_REGEX.test(password)) {
    result.isValid = false;
    result.errors.password = 'Password must contain uppercase, lowercase, number, and special character';
    return result;
  }

  // Calculate password entropy for strength validation
  const entropy = calculatePasswordEntropy(password);
  if (entropy < 50) {
    result.isValid = false;
    result.errors.password = 'Password is too weak';
    return result;
  }

  return result;
};

/**
 * Comprehensive traveller details validation with Amadeus GDS requirements
 * @param data - Traveller details to validate
 * @param locale - Optional locale for error messages
 * @returns ValidationResult with localized error messages
 */
export const validateTravellerDetails = (data: TravellerDetails, locale = 'en'): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: {},
    locale
  };

  // Required fields validation
  if (!data.firstName?.trim()) {
    result.isValid = false;
    result.errors.firstName = 'First name is required';
  }

  if (!data.lastName?.trim()) {
    result.isValid = false;
    result.errors.lastName = 'Last name is required';
  }

  // Email validation
  const emailValidation = validateEmail(data.email, locale);
  if (!emailValidation.isValid) {
    result.isValid = false;
    result.errors.email = emailValidation.errors.email;
  }

  // Phone validation with international format
  if (!data.phone || !PHONE_REGEX.test(data.phone)) {
    result.isValid = false;
    result.errors.phone = 'Invalid phone number format';
  }

  // Date of birth validation
  if (!isValidDate(data.dateOfBirth)) {
    result.isValid = false;
    result.errors.dateOfBirth = 'Invalid date of birth';
  }

  // Passport validation
  if (!data.passportNumber || !isPassportNumber(data.passportNumber, data.nationality)) {
    result.isValid = false;
    result.errors.passportNumber = 'Invalid passport number';
  }

  // Nationality validation (ISO country code)
  if (!isValidCountryCode(data.nationality)) {
    result.isValid = false;
    result.errors.nationality = 'Invalid nationality code';
  }

  return result;
};

/**
 * Clears the validation cache
 * Useful for memory management and forcing fresh validation
 */
export const clearValidationCache = (): void => {
  validationCache.clear();
};

// Helper functions
const calculatePasswordEntropy = (password: string): number => {
  const charset = {
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    symbols: /[^A-Za-z0-9]/.test(password)
  };

  let poolSize = 0;
  if (charset.lowercase) poolSize += 26;
  if (charset.uppercase) poolSize += 26;
  if (charset.numbers) poolSize += 10;
  if (charset.symbols) poolSize += 32;

  return Math.log2(Math.pow(poolSize, password.length));
};

const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

const isValidCountryCode = (code: string): boolean => {
  // ISO 3166-1 alpha-2 country code validation
  return /^[A-Z]{2}$/.test(code);
};