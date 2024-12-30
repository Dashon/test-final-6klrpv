/**
 * @fileoverview Validation utilities for iOS mobile application
 * @module ios/utils/validation
 * @version 1.0.0
 * 
 * Implements comprehensive form validation and data sanitization
 * with enhanced security measures and accessibility compliance
 */

import { LoginCredentials, RegisterCredentials } from '../types/auth';
import { TravellerDetails } from '../types/booking';

// Constants for validation rules
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PASSWORD_MIN_LENGTH = 12;
const NAME_MAX_LENGTH = 50;
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;
const PASSPORT_REGEX = /^[A-Z0-9]{6,9}$/;
const MIN_AGE_YEARS = 18;
const BLOCKED_EMAIL_DOMAINS = ['tempmail.com', 'disposable.com'];

// Common password patterns to check against
const COMMON_PASSWORD_PATTERNS = [
  '12345', 'qwerty', 'password', 'admin', 'welcome',
  'letmein', '123456789', 'abc123', 'password123'
];

/**
 * Validates email format and domain requirements
 * @param email - Email address to validate
 * @returns Validation result with detailed errors
 */
export const validateEmail = (email: string): { 
  isValid: boolean; 
  errors: string[] 
} => {
  const errors: string[] = [];

  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
    return { isValid: false, errors };
  }

  if (!EMAIL_REGEX.test(email)) {
    errors.push('Invalid email format');
  }

  if (email.length > 254) { // RFC 5321 length limit
    errors.push('Email exceeds maximum length');
  }

  const domain = email.split('@')[1]?.toLowerCase();
  if (BLOCKED_EMAIL_DOMAINS.includes(domain)) {
    errors.push('Email domain not allowed');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates password strength with enhanced security requirements
 * @param password - Password to validate
 * @returns Validation result with strength score and errors
 */
export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
  strength: number;
} => {
  const errors: string[] = [];
  let strength = 0;

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return { isValid: false, errors, strength };
  }

  // Length check
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  } else {
    strength += 2;
  }

  // Character type checks
  const hasUpperCase = /[A-Z].*[A-Z]/.test(password);
  const hasLowerCase = /[a-z].*[a-z]/.test(password);
  const hasNumbers = /\d.*\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?].*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

  if (!hasUpperCase) errors.push('Password must contain at least two uppercase letters');
  if (!hasLowerCase) errors.push('Password must contain at least two lowercase letters');
  if (!hasNumbers) errors.push('Password must contain at least two numbers');
  if (!hasSpecialChars) errors.push('Password must contain at least two special characters');

  // Add strength points for character diversity
  if (hasUpperCase) strength += 2;
  if (hasLowerCase) strength += 2;
  if (hasNumbers) strength += 2;
  if (hasSpecialChars) strength += 2;

  // Check for common patterns
  const passwordLower = password.toLowerCase();
  if (COMMON_PASSWORD_PATTERNS.some(pattern => passwordLower.includes(pattern))) {
    errors.push('Password contains common patterns');
    strength -= 2;
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: Math.max(0, Math.min(10, strength))
  };
};

/**
 * Validates login credentials
 * @param credentials - Login credentials to validate
 * @returns Validation result with field-specific errors
 */
export const validateLoginCredentials = (credentials: LoginCredentials): {
  isValid: boolean;
  errors: Record<string, string[]>;
} => {
  const errors: Record<string, string[]> = {};
  
  const emailValidation = validateEmail(credentials.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.errors;
  }

  const passwordValidation = validatePassword(credentials.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.errors;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates registration data with enhanced validation
 * @param data - Registration data to validate
 * @returns Validation result with field-specific errors
 */
export const validateRegistrationData = (data: RegisterCredentials): {
  isValid: boolean;
  errors: Record<string, string[]>;
} => {
  const errors: Record<string, string[]> = {};

  // Email validation
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.errors;
  }

  // Password validation
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.errors;
  }

  // Name validations
  if (!data.firstName || data.firstName.length > NAME_MAX_LENGTH) {
    errors.firstName = ['First name is required and must not exceed 50 characters'];
  }
  if (!data.lastName || data.lastName.length > NAME_MAX_LENGTH) {
    errors.lastName = ['Last name is required and must not exceed 50 characters'];
  }

  // Sanitize names for special characters
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(data.firstName)) {
    errors.firstName = [...(errors.firstName || []), 'First name contains invalid characters'];
  }
  if (!nameRegex.test(data.lastName)) {
    errors.lastName = [...(errors.lastName || []), 'Last name contains invalid characters'];
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates comprehensive traveller information
 * @param details - Traveller details to validate
 * @returns Validation result with field-specific errors
 */
export const validateTravellerDetails = (details: TravellerDetails): {
  isValid: boolean;
  errors: Record<string, string[]>;
} => {
  const errors: Record<string, string[]> = {};

  // Name validations with sanitization
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!details.firstName || !nameRegex.test(details.firstName) || 
      details.firstName.length > NAME_MAX_LENGTH) {
    errors.firstName = ['Invalid first name'];
  }
  if (!details.lastName || !nameRegex.test(details.lastName) || 
      details.lastName.length > NAME_MAX_LENGTH) {
    errors.lastName = ['Invalid last name'];
  }

  // Email validation
  const emailValidation = validateEmail(details.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.errors;
  }

  // Phone validation
  if (!PHONE_REGEX.test(details.phone)) {
    errors.phone = ['Invalid phone number format'];
  }

  // Date of birth validation
  const today = new Date();
  const birthDate = new Date(details.dateOfBirth);
  const age = today.getFullYear() - birthDate.getFullYear();
  if (isNaN(birthDate.getTime()) || age < MIN_AGE_YEARS) {
    errors.dateOfBirth = [`Must be at least ${MIN_AGE_YEARS} years old`];
  }

  // Passport validation
  if (!PASSPORT_REGEX.test(details.passportNumber)) {
    errors.passportNumber = ['Invalid passport number format'];
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};