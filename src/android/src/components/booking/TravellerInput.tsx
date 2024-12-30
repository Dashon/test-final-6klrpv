/**
 * @fileoverview Enhanced form component for collecting traveller details
 * Implements WCAG 2.1 Level AA compliance, real-time validation,
 * and secure data handling for the Android booking flow.
 * @version 1.0.0
 */

import React, { useCallback, useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useDebounce } from 'use-debounce'; // v9.0.0
import Input from '../shared/Input';
import { TravellerDetails } from '../../types/booking';
import { validateTravellerDetails } from '../../utils/validation';
import { colors } from '../../constants/colors';
import { fontSizes } from '../../constants/typography';

/**
 * Props interface for the TravellerInput component
 */
interface TravellerInputProps {
  traveller: TravellerDetails;
  onUpdate: (details: TravellerDetails, isValid: boolean) => void;
  index: number;
  errors?: { [key: string]: string };
  isLoading?: boolean;
}

/**
 * Enhanced form component for secure traveller details input
 * Supports real-time validation and accessibility features
 */
const TravellerInput: React.FC<TravellerInputProps> = ({
  traveller,
  onUpdate,
  index,
  errors = {},
  isLoading = false,
}) => {
  // Local state for field-level validation
  const [localErrors, setLocalErrors] = useState<{ [key: string]: string }>({});
  const [debouncedValidation] = useDebounce(validateTravellerDetails, 300);

  /**
   * Handles changes to input fields with debounced validation
   */
  const handleInputChange = useCallback(
    (field: keyof TravellerDetails, value: string) => {
      // Create new traveller details object with updated field
      const updatedTraveller = {
        ...traveller,
        [field]: value,
      };

      // Perform field-level validation
      const fieldError = validateField(field, value);
      setLocalErrors(prev => ({
        ...prev,
        [field]: fieldError,
      }));

      // Debounced full validation check
      debouncedValidation(updatedTraveller).then(validationResult => {
        onUpdate(updatedTraveller, validationResult.isValid);
      });
    },
    [traveller, onUpdate, debouncedValidation]
  );

  /**
   * Performs field-level validation with security checks
   */
  const validateField = (field: keyof TravellerDetails, value: string): string => {
    if (!value.trim()) {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    }

    switch (field) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'Invalid email format';
      case 'phone':
        return /^\+?[1-9]\d{1,14}$/.test(value) ? '' : 'Invalid phone number';
      case 'passportNumber':
        return value.length >= 6 ? '' : 'Invalid passport number';
      case 'dateOfBirth':
        return isValidDate(value) ? '' : 'Invalid date format (YYYY-MM-DD)';
      default:
        return '';
    }
  };

  /**
   * Validates date format and age requirements
   */
  const isValidDate = (dateString: string): boolean => {
    const date = new Date(dateString);
    const today = new Date();
    if (isNaN(date.getTime())) return false;
    
    // Check if date is not in future and person is at least 2 years old
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(today.getFullYear() - 2);
    return date <= today && date <= twoYearsAgo;
  };

  return (
    <ScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      accessible={true}
      accessibilityLabel={`Traveller ${index + 1} details form`}
    >
      {isLoading && <View style={styles.loadingOverlay} />}

      <Text style={styles.title}>
        Traveller {index + 1} Details
      </Text>

      <View style={styles.inputGroup}>
        <Input
          label="First Name"
          value={traveller.firstName}
          onChangeText={(text) => handleInputChange('firstName', text)}
          error={localErrors.firstName || errors.firstName}
          testID={`traveller-${index}-firstName`}
          maxLength={50}
          autoComplete="name-given"
        />
      </View>

      <View style={styles.inputGroup}>
        <Input
          label="Last Name"
          value={traveller.lastName}
          onChangeText={(text) => handleInputChange('lastName', text)}
          error={localErrors.lastName || errors.lastName}
          testID={`traveller-${index}-lastName`}
          maxLength={50}
          autoComplete="name-family"
        />
      </View>

      <View style={styles.inputGroup}>
        <Input
          label="Email"
          value={traveller.email}
          onChangeText={(text) => handleInputChange('email', text)}
          error={localErrors.email || errors.email}
          type="email"
          testID={`traveller-${index}-email`}
          maxLength={100}
          autoComplete="email"
        />
      </View>

      <View style={styles.inputGroup}>
        <Input
          label="Phone"
          value={traveller.phone}
          onChangeText={(text) => handleInputChange('phone', text)}
          error={localErrors.phone || errors.phone}
          type="phone"
          testID={`traveller-${index}-phone`}
          maxLength={15}
          autoComplete="tel"
        />
      </View>

      <View style={styles.inputGroup}>
        <Input
          label="Date of Birth"
          value={traveller.dateOfBirth}
          onChangeText={(text) => handleInputChange('dateOfBirth', text)}
          error={localErrors.dateOfBirth || errors.dateOfBirth}
          placeholder="YYYY-MM-DD"
          testID={`traveller-${index}-dateOfBirth`}
          maxLength={10}
        />
      </View>

      <View style={styles.inputGroup}>
        <Input
          label="Passport Number"
          value={traveller.passportNumber}
          onChangeText={(text) => handleInputChange('passportNumber', text)}
          error={localErrors.passportNumber || errors.passportNumber}
          testID={`traveller-${index}-passportNumber`}
          maxLength={20}
        />
      </View>

      <View style={styles.inputGroup}>
        <Input
          label="Passport Expiry"
          value={traveller.passportExpiry}
          onChangeText={(text) => handleInputChange('passportExpiry', text)}
          error={localErrors.passportExpiry || errors.passportExpiry}
          placeholder="YYYY-MM-DD"
          testID={`traveller-${index}-passportExpiry`}
          maxLength={10}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    marginBottom: 16,
    color: colors.text.primary,
  },
  inputGroup: {
    marginBottom: 12,
  },
  errorContainer: {
    backgroundColor: colors.error.surface,
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay.light,
    zIndex: 1,
  },
});

export default TravellerInput;