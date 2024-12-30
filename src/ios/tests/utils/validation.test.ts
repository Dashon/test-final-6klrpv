/**
 * @fileoverview Test suite for validation utility functions
 * @version 1.0.0
 * 
 * Implements comprehensive testing for data validation with security
 * and accessibility compliance checks
 */

import { describe, test, expect } from '@jest/globals';
import {
  validateEmail,
  validatePassword,
  validateLoginCredentials,
  validateRegistrationData,
  validateTravellerDetails
} from '../../src/utils/validation';
import { UserRole } from '../../src/types/auth';

// Test constants
const TEST_VALID_EMAIL = 'test@example.com';
const TEST_VALID_PASSWORD = 'Test123!@#$Test';
const TEST_VALID_NAME = 'John';
const TEST_VALID_PHONE = '+1234567890';
const TEST_VALID_PASSPORT = 'AB123456';
const TEST_VALID_DOB = '1990-01-01';

describe('validateEmail', () => {
  test('should validate correct email format', () => {
    const result = validateEmail(TEST_VALID_EMAIL);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should reject invalid email formats', () => {
    const invalidEmails = [
      'test@',
      '@example.com',
      'test@.com',
      'test@com',
      'test.example.com',
      'test@example.',
      ''
    ];

    invalidEmails.forEach(email => {
      const result = validateEmail(email);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });
  });

  test('should reject blocked email domains', () => {
    const result = validateEmail('test@tempmail.com');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Email domain not allowed');
  });

  test('should enforce RFC 5321 length limits', () => {
    const longEmail = 'a'.repeat(255) + '@example.com';
    const result = validateEmail(longEmail);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Email exceeds maximum length');
  });
});

describe('validatePassword', () => {
  test('should validate strong passwords', () => {
    const result = validatePassword(TEST_VALID_PASSWORD);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.strength).toBeGreaterThanOrEqual(8);
  });

  test('should enforce minimum length requirement', () => {
    const result = validatePassword('Test1!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must be at least 12 characters');
  });

  test('should require multiple character types', () => {
    const weakPasswords = [
      'lowercaseonly123!',
      'UPPERCASEONLY123!',
      'NoSpecialChars123',
      'No-Numbers-Here!!'
    ];

    weakPasswords.forEach(password => {
      const result = validatePassword(password);
      expect(result.isValid).toBe(false);
    });
  });

  test('should detect common password patterns', () => {
    const commonPasswords = [
      'Password123!@#',
      'Admin123!@#',
      'Welcome123!@#'
    ];

    commonPasswords.forEach(password => {
      const result = validatePassword(password);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password contains common patterns');
    });
  });
});

describe('validateLoginCredentials', () => {
  test('should validate correct login credentials', () => {
    const result = validateLoginCredentials({
      email: TEST_VALID_EMAIL,
      password: TEST_VALID_PASSWORD,
      mfaCode: null
    });
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  test('should validate all fields independently', () => {
    const result = validateLoginCredentials({
      email: 'invalid@',
      password: 'weak',
      mfaCode: null
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveProperty('email');
    expect(result.errors).toHaveProperty('password');
  });
});

describe('validateRegistrationData', () => {
  test('should validate complete registration data', () => {
    const result = validateRegistrationData({
      email: TEST_VALID_EMAIL,
      password: TEST_VALID_PASSWORD,
      firstName: TEST_VALID_NAME,
      lastName: TEST_VALID_NAME,
      role: UserRole.USER,
      acceptedTerms: true,
      enableMfa: false
    });
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  test('should validate name requirements', () => {
    const result = validateRegistrationData({
      email: TEST_VALID_EMAIL,
      password: TEST_VALID_PASSWORD,
      firstName: '123', // Invalid characters
      lastName: 'A'.repeat(51), // Exceeds length
      role: UserRole.USER,
      acceptedTerms: true,
      enableMfa: false
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveProperty('firstName');
    expect(result.errors).toHaveProperty('lastName');
  });

  test('should sanitize special characters in names', () => {
    const result = validateRegistrationData({
      email: TEST_VALID_EMAIL,
      password: TEST_VALID_PASSWORD,
      firstName: "O'Connor-Smith", // Valid special characters
      lastName: "Smith<script>", // Invalid special characters
      role: UserRole.USER,
      acceptedTerms: true,
      enableMfa: false
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.lastName).toBeDefined();
    expect(result.errors.firstName).toBeUndefined();
  });
});

describe('validateTravellerDetails', () => {
  test('should validate complete traveller details', () => {
    const result = validateTravellerDetails({
      firstName: TEST_VALID_NAME,
      lastName: TEST_VALID_NAME,
      email: TEST_VALID_EMAIL,
      phone: TEST_VALID_PHONE,
      dateOfBirth: new Date(TEST_VALID_DOB),
      passportNumber: TEST_VALID_PASSPORT,
      passportExpiry: new Date()
    });
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  test('should validate phone number format', () => {
    const invalidPhones = [
      '123', // Too short
      'abc1234567890', // Invalid characters
      '+', // Invalid format
      '+0123456789012345' // Too long
    ];

    invalidPhones.forEach(phone => {
      const result = validateTravellerDetails({
        firstName: TEST_VALID_NAME,
        lastName: TEST_VALID_NAME,
        email: TEST_VALID_EMAIL,
        phone,
        dateOfBirth: new Date(TEST_VALID_DOB),
        passportNumber: TEST_VALID_PASSPORT,
        passportExpiry: new Date()
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveProperty('phone');
    });
  });

  test('should enforce minimum age requirement', () => {
    const today = new Date();
    const underageDate = new Date(today.setFullYear(today.getFullYear() - 17));
    
    const result = validateTravellerDetails({
      firstName: TEST_VALID_NAME,
      lastName: TEST_VALID_NAME,
      email: TEST_VALID_EMAIL,
      phone: TEST_VALID_PHONE,
      dateOfBirth: underageDate,
      passportNumber: TEST_VALID_PASSPORT,
      passportExpiry: new Date()
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.dateOfBirth).toBeDefined();
  });

  test('should validate passport number format', () => {
    const invalidPassports = [
      '12345', // Too short
      'ABCD123456', // Too long
      'AB12!@#', // Invalid characters
      '123456' // No letters
    ];

    invalidPassports.forEach(passport => {
      const result = validateTravellerDetails({
        firstName: TEST_VALID_NAME,
        lastName: TEST_VALID_NAME,
        email: TEST_VALID_EMAIL,
        phone: TEST_VALID_PHONE,
        dateOfBirth: new Date(TEST_VALID_DOB),
        passportNumber: passport,
        passportExpiry: new Date()
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveProperty('passportNumber');
    });
  });
});