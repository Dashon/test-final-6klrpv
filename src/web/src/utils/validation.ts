/**
 * @fileoverview Validation utilities for form inputs, data integrity checks, and error handling
 * Implements comprehensive validation for auth, booking, and chat validations
 * @version 1.0.0
 */

import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'; // v1.10.0
import { LoginCredentials, RegisterData } from '../types/auth';
import { TravellerDetails } from '../types/booking';
import { 
  PASSWORD_RULES, 
  EMAIL_REGEX, 
  VALIDATION_MESSAGES 
} from '../constants/validation';

/**
 * Interface for validation result with detailed error information
 */
interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  ariaDescriptions?: Record<string, string>;
}

/**
 * Validates email format and requirements
 * @param email - Email address to validate
 * @returns boolean indicating if email is valid
 */
export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return EMAIL_REGEX.test(email.trim());
};

/**
 * Validates password against security rules
 * @param password - Password to validate
 * @returns ValidationResult with detailed error messages
 */
export const validatePassword = (password: string): ValidationResult => {
  const errors: Record<string, string> = {};
  const ariaDescriptions: Record<string, string> = {};

  if (!password) {
    errors.password = VALIDATION_MESSAGES.required;
    ariaDescriptions.password = 'Password field is required';
    return { isValid: false, errors, ariaDescriptions };
  }

  if (password.length < PASSWORD_RULES.minLength) {
    errors.password = VALIDATION_MESSAGES.password.tooShort;
    ariaDescriptions.password = `Password must be at least ${PASSWORD_RULES.minLength} characters long`;
  }

  if (password.length > PASSWORD_RULES.maxLength) {
    errors.password = VALIDATION_MESSAGES.password.tooLong;
    ariaDescriptions.password = `Password must be less than ${PASSWORD_RULES.maxLength} characters`;
  }

  if (PASSWORD_RULES.requireSpecialChar && !PASSWORD_RULES.specialCharRegex.test(password)) {
    errors.password = VALIDATION_MESSAGES.password.requireSpecial;
    ariaDescriptions.password = 'Password must contain at least one special character';
  }

  if (PASSWORD_RULES.requireNumber && !/\d/.test(password)) {
    errors.password = VALIDATION_MESSAGES.password.requireNumber;
    ariaDescriptions.password = 'Password must contain at least one number';
  }

  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
    errors.password = VALIDATION_MESSAGES.password.requireUppercase;
    ariaDescriptions.password = 'Password must contain at least one uppercase letter';
  }

  if (PASSWORD_RULES.bannedCharacters.test(password)) {
    errors.password = VALIDATION_MESSAGES.password.invalidChars;
    ariaDescriptions.password = 'Password contains invalid characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    ariaDescriptions
  };
};

/**
 * Validates login credentials
 * @param credentials - Login credentials to validate
 * @returns ValidationResult with field-level errors
 */
export const validateLoginCredentials = (credentials: LoginCredentials): ValidationResult => {
  const errors: Record<string, string> = {};
  const ariaDescriptions: Record<string, string> = {};

  if (!validateEmail(credentials.email)) {
    errors.email = VALIDATION_MESSAGES.email.invalid;
    ariaDescriptions.email = 'Please enter a valid email address';
  }

  const passwordValidation = validatePassword(credentials.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.errors.password;
    ariaDescriptions.password = passwordValidation.ariaDescriptions?.password || '';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    ariaDescriptions
  };
};

/**
 * Validates registration data with enhanced checks
 * @param data - Registration data to validate
 * @returns ValidationResult with comprehensive error details
 */
export const validateRegistrationData = (data: RegisterData): ValidationResult => {
  const errors: Record<string, string> = {};
  const ariaDescriptions: Record<string, string> = {};

  // Email validation
  if (!validateEmail(data.email)) {
    errors.email = VALIDATION_MESSAGES.email.invalid;
    ariaDescriptions.email = 'Please enter a valid email address';
  }

  // Password validation
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.errors.password;
    ariaDescriptions.password = passwordValidation.ariaDescriptions?.password || '';
  }

  // First name validation
  if (!data.firstName || data.firstName.trim().length === 0) {
    errors.firstName = VALIDATION_MESSAGES.required;
    ariaDescriptions.firstName = 'First name is required';
  }

  // Last name validation
  if (!data.lastName || data.lastName.trim().length === 0) {
    errors.lastName = VALIDATION_MESSAGES.required;
    ariaDescriptions.lastName = 'Last name is required';
  }

  // Terms acceptance validation
  if (!data.acceptedTerms) {
    errors.acceptedTerms = 'You must accept the terms and conditions';
    ariaDescriptions.acceptedTerms = 'Please accept the terms and conditions to continue';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    ariaDescriptions
  };
};

/**
 * Validates traveller details with international phone support
 * @param details - Traveller details to validate
 * @returns ValidationResult with field-level validation
 */
export const validateTravellerDetails = (details: TravellerDetails): ValidationResult => {
  const errors: Record<string, string> = {};
  const ariaDescriptions: Record<string, string> = {};

  // Name validations
  if (!details.firstName || details.firstName.trim().length === 0) {
    errors.firstName = VALIDATION_MESSAGES.required;
    ariaDescriptions.firstName = 'First name is required';
  }

  if (!details.lastName || details.lastName.trim().length === 0) {
    errors.lastName = VALIDATION_MESSAGES.required;
    ariaDescriptions.lastName = 'Last name is required';
  }

  // Email validation
  if (!validateEmail(details.email)) {
    errors.email = VALIDATION_MESSAGES.email.invalid;
    ariaDescriptions.email = 'Please enter a valid email address';
  }

  // Phone validation using libphonenumber-js
  try {
    if (!details.phone) {
      errors.phone = VALIDATION_MESSAGES.required;
      ariaDescriptions.phone = 'Phone number is required';
    } else {
      const phoneNumber = parsePhoneNumber(details.phone);
      if (!phoneNumber || !isValidPhoneNumber(details.phone)) {
        errors.phone = 'Invalid phone number';
        ariaDescriptions.phone = 'Please enter a valid phone number with country code';
      }
    }
  } catch (error) {
    errors.phone = 'Invalid phone number format';
    ariaDescriptions.phone = 'Please check the phone number format';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    ariaDescriptions
  };
};

/**
 * Validates a string is not empty or only whitespace
 * @param value - String to validate
 * @returns boolean indicating if string is valid
 */
export const validateRequired = (value: string): boolean => {
  return value !== undefined && value !== null && value.trim().length > 0;
};

/**
 * Validates a URL string
 * @param url - URL to validate
 * @returns boolean indicating if URL is valid
 */
export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};