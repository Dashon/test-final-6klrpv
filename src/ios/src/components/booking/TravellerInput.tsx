/**
 * @fileoverview Accessible form component for collecting traveller details
 * Implements WCAG 2.1 Level AA accessibility standards with iOS-specific optimizations
 * @version 1.0.0
 */

import React, { useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, AccessibilityInfo } from 'react-native';
import DatePickerIOS from '@react-native-community/datetimepicker'; // v3.x
import debounce from 'lodash/debounce'; // v4.x

import Input from '../shared/Input';
import { TravellerDetails } from '../../types/booking';
import { validateTravellerDetails } from '../../utils/validation';
import { colors } from '../../constants/colors';
import { textStyles } from '../../constants/typography';

/**
 * Props interface for the TravellerInput component
 */
interface TravellerInputProps {
  traveller: TravellerDetails;
  onUpdate: (details: TravellerDetails, isValid: boolean) => void;
  index: number;
  errors?: Record<string, string>;
  locale?: string;
}

/**
 * TravellerInput component for collecting and validating traveller information
 * Implements WCAG 2.1 Level AA accessibility standards
 */
const TravellerInput: React.FC<TravellerInputProps> = ({
  traveller,
  onUpdate,
  index,
  errors = {},
  locale = 'en-US'
}) => {
  // Local state for form validation
  const [localErrors, setLocalErrors] = useState<Record<string, string>>(errors);
  const [isValid, setIsValid] = useState<boolean>(false);

  /**
   * Handles input changes with validation and sanitization
   * Implements debouncing to prevent excessive validation calls
   */
  const handleInputChange = useCallback(
    debounce((field: keyof TravellerDetails, value: string) => {
      const updatedTraveller = {
        ...traveller,
        [field]: value
      };

      // Perform field-specific validation
      const validationResult = validateTravellerDetails(updatedTraveller);
      
      setLocalErrors(validationResult.errors);
      setIsValid(validationResult.isValid);

      // Announce validation errors to screen readers
      if (validationResult.errors[field]) {
        AccessibilityInfo.announceForAccessibility(validationResult.errors[field][0]);
      }

      onUpdate(updatedTraveller, validationResult.isValid);
    }, 300),
    [traveller, onUpdate]
  );

  /**
   * Handles date picker changes with validation
   */
  const handleDateChange = useCallback((date: Date) => {
    const updatedTraveller = {
      ...traveller,
      dateOfBirth: date
    };

    const validationResult = validateTravellerDetails(updatedTraveller);
    setLocalErrors(validationResult.errors);
    setIsValid(validationResult.isValid);

    onUpdate(updatedTraveller, validationResult.isValid);
  }, [traveller, onUpdate]);

  // Effect to handle initial validation
  useEffect(() => {
    const validationResult = validateTravellerDetails(traveller);
    setLocalErrors(validationResult.errors);
    setIsValid(validationResult.isValid);
  }, [traveller]);

  return (
    <View 
      style={styles.container}
      accessibilityRole="group"
      accessibilityLabel={`Traveller ${index + 1} Information`}
    >
      <Input
        value={traveller.firstName}
        onChangeText={(value) => handleInputChange('firstName', value)}
        placeholder="First Name"
        error={localErrors.firstName}
        accessibilityLabel="First Name"
        accessibilityHint="Enter traveller's first name"
        testID={`traveller-${index}-firstName`}
        autoCapitalize="words"
        maxLength={50}
      />

      <Input
        value={traveller.lastName}
        onChangeText={(value) => handleInputChange('lastName', value)}
        placeholder="Last Name"
        error={localErrors.lastName}
        accessibilityLabel="Last Name"
        accessibilityHint="Enter traveller's last name"
        testID={`traveller-${index}-lastName`}
        autoCapitalize="words"
        maxLength={50}
      />

      <Input
        value={traveller.email}
        onChangeText={(value) => handleInputChange('email', value)}
        placeholder="Email"
        error={localErrors.email}
        accessibilityLabel="Email Address"
        accessibilityHint="Enter traveller's email address"
        testID={`traveller-${index}-email`}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Input
        value={traveller.phone}
        onChangeText={(value) => handleInputChange('phone', value)}
        placeholder="Phone Number"
        error={localErrors.phone}
        accessibilityLabel="Phone Number"
        accessibilityHint="Enter traveller's phone number"
        testID={`traveller-${index}-phone`}
        keyboardType="phone-pad"
        mask="+# (###) ###-####"
      />

      <Input
        value={traveller.passportNumber}
        onChangeText={(value) => handleInputChange('passportNumber', value)}
        placeholder="Passport Number"
        error={localErrors.passportNumber}
        accessibilityLabel="Passport Number"
        accessibilityHint="Enter traveller's passport number"
        testID={`traveller-${index}-passport`}
        autoCapitalize="characters"
        maxLength={9}
      />

      <DatePickerIOS
        value={traveller.dateOfBirth || new Date()}
        onChange={(event, date) => date && handleDateChange(date)}
        mode="date"
        maximumDate={new Date()}
        accessibilityLabel="Date of Birth"
        accessibilityHint="Select traveller's date of birth"
        testID={`traveller-${index}-dob`}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    marginVertical: 8,
    ...textStyles.body
  }
});

export default TravellerInput;