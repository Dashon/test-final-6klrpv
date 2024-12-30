/**
 * @fileoverview Comprehensive test suite for validation utilities
 * Tests form validation, data structure validation, and business rule validation
 * with focus on security, accessibility, and mobile-specific requirements.
 * @version 1.0.0
 */

import { describe, expect, test, beforeEach, afterEach } from '@jest/globals';
import { testData } from '@testing-library/jest-dom';
import { validateEmail, validatePassword, validateTravellerDetails } from '../../src/utils/validation';
import { BookingStatus, TravellerDetails } from '../../src/types/booking';

// Test timeout configuration
jest.setTimeout(10000);

describe('Email Validation Tests', () => {
  describe('Standard Email Format Validation', () => {
    test('should validate correct email format', () => {
      const result = validateEmail('user@example.com');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('should reject empty email', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Email is required');
    });

    test('should reject invalid email format', () => {
      const result = validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Invalid email format');
    });
  });

  describe('International Email Format Support', () => {
    test('should validate international domain names', () => {
      const result = validateEmail('user@münchen.de');
      expect(result.isValid).toBe(true);
    });

    test('should validate emails with non-ASCII characters', () => {
      const result = validateEmail('用户@example.cn');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Email Validation Cache Behavior', () => {
    test('should cache validation results', () => {
      const email = 'test@example.com';
      const firstResult = validateEmail(email);
      const secondResult = validateEmail(email);
      expect(firstResult).toEqual(secondResult);
    });

    test('should respect cache TTL', async () => {
      const email = 'test@example.com';
      const firstResult = validateEmail(email);
      await new Promise(resolve => setTimeout(resolve, 5000));
      const secondResult = validateEmail(email);
      expect(firstResult).not.toBe(secondResult);
    });
  });
});

describe('Password Validation Tests', () => {
  describe('Password Complexity Requirements', () => {
    test('should validate strong password', () => {
      const result = validatePassword('StrongP@ss123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('should reject short password', () => {
      const result = validatePassword('Weak1');
      expect(result.isValid).toBe(false);
      expect(result.errors.password).toContain('must be at least');
    });

    test('should require uppercase letter', () => {
      const result = validatePassword('weakpassword123!');
      expect(result.isValid).toBe(false);
      expect(result.errors.password).toContain('must contain uppercase');
    });

    test('should require special character', () => {
      const result = validatePassword('WeakPassword123');
      expect(result.isValid).toBe(false);
      expect(result.errors.password).toContain('special character');
    });
  });

  describe('Password Strength Indicators', () => {
    test('should reject weak passwords', () => {
      const result = validatePassword('Password123!');
      expect(result.isValid).toBe(false);
      expect(result.errors.password).toBe('Password is too weak');
    });

    test('should accept high-entropy passwords', () => {
      const result = validatePassword('xK9#mP2$vL5@nQ8');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Password Validation Accessibility', () => {
    test('should provide clear error messages', () => {
      const result = validatePassword('weak');
      expect(result.errors.password).toBeDefined();
      expect(typeof result.errors.password).toBe('string');
      expect(result.errors.password.length).toBeLessThan(100);
    });
  });
});

describe('Traveller Details Validation Tests', () => {
  let validTravellerDetails: TravellerDetails;

  beforeEach(() => {
    validTravellerDetails = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      dateOfBirth: '1990-01-01',
      passportNumber: 'A1234567',
      passportExpiry: '2025-01-01',
      nationality: 'US',
      frequentFlyerNumber: 'FF123456'
    };
  });

  describe('GDS Compliance Validation', () => {
    test('should validate GDS-compliant traveller details', () => {
      const result = validateTravellerDetails(validTravellerDetails);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('should validate international phone numbers', () => {
      const testCases = [
        '+44.1234567890', // UK
        '+81-3-1234-5678', // Japan
        '+33 1 23 45 67 89' // France
      ];

      testCases.forEach(phone => {
        const details = { ...validTravellerDetails, phone };
        const result = validateTravellerDetails(details);
        expect(result.isValid).toBe(true);
      });
    });

    test('should validate passport numbers by nationality', () => {
      const testCases = [
        { nationality: 'US', passport: 'A12345678' },
        { nationality: 'GB', passport: '123456789' },
        { nationality: 'JP', passport: 'TK1234567' }
      ];

      testCases.forEach(({ nationality, passport }) => {
        const details = { 
          ...validTravellerDetails, 
          nationality, 
          passportNumber: passport 
        };
        const result = validateTravellerDetails(details);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Date Format Validation', () => {
    test('should validate ISO date formats', () => {
      const dates = [
        '2023-12-31',
        '2024-01-01',
        '2025-06-15'
      ];

      dates.forEach(date => {
        const details = { 
          ...validTravellerDetails, 
          dateOfBirth: date,
          passportExpiry: date 
        };
        const result = validateTravellerDetails(details);
        expect(result.isValid).toBe(true);
      });
    });

    test('should reject invalid dates', () => {
      const invalidDates = [
        '2023-13-01', // Invalid month
        '2023-04-31', // Invalid day
        'invalid-date'
      ];

      invalidDates.forEach(date => {
        const details = { ...validTravellerDetails, dateOfBirth: date };
        const result = validateTravellerDetails(details);
        expect(result.isValid).toBe(false);
        expect(result.errors.dateOfBirth).toBeDefined();
      });
    });
  });

  describe('Error Message Localization', () => {
    test('should provide localized error messages', () => {
      const locales = ['en', 'es', 'ja'];
      const invalidDetails = { ...validTravellerDetails, email: 'invalid' };

      locales.forEach(locale => {
        const result = validateTravellerDetails(invalidDetails, locale);
        expect(result.locale).toBe(locale);
        expect(result.errors.email).toBeDefined();
      });
    });
  });

  describe('Accessibility Compliance', () => {
    test('should provide screen reader friendly error messages', () => {
      const result = validateTravellerDetails({
        ...validTravellerDetails,
        firstName: '',
        email: 'invalid'
      });

      Object.values(result.errors).forEach(error => {
        expect(typeof error).toBe('string');
        expect(error.length).toBeLessThan(100);
        expect(error).not.toContain('Error:');
      });
    });
  });
});