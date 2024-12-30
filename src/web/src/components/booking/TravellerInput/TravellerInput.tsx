import React, { useCallback, useState, useEffect } from 'react';
import classnames from 'classnames';
import { debounce } from 'lodash';
import Input from '../../shared/Input/Input';
import { TravellerDetails } from '../../../types/booking';
import { validateTravellerDetails } from '../../../utils/validation';

/**
 * Props interface for the TravellerInput component
 */
export interface TravellerInputProps {
  /** Current traveller details */
  value: TravellerDetails;
  /** Change handler for traveller details updates */
  onChange: (details: TravellerDetails) => void;
  /** Validation errors for each field */
  errors?: Record<string, string>;
  /** Disabled state for all inputs */
  disabled?: boolean;
  /** Indicates if fields are required */
  isRequired?: boolean;
  /** Blur handler for field validation */
  onBlur?: (field: string) => void;
  /** Test identifier for component */
  testId?: string;
}

/**
 * A comprehensive form component for collecting and validating traveller information.
 * Features enhanced accessibility, real-time validation, and responsive design.
 *
 * @component
 * @example
 * ```tsx
 * <TravellerInput
 *   value={travellerDetails}
 *   onChange={handleTravellerChange}
 *   isRequired={true}
 * />
 * ```
 */
export const TravellerInput: React.FC<TravellerInputProps> = ({
  value,
  onChange,
  errors = {},
  disabled = false,
  isRequired = true,
  onBlur,
  testId = 'traveller-input'
}) => {
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Combine prop errors with local validation errors
  const combinedErrors = { ...localErrors, ...errors };

  // Debounced validation to prevent excessive validation calls
  const debouncedValidate = useCallback(
    debounce((details: TravellerDetails) => {
      const validationResult = validateTravellerDetails(details);
      if (!validationResult.isValid) {
        setLocalErrors(validationResult.errors);
      } else {
        setLocalErrors({});
      }
    }, 300),
    []
  );

  // Handle input changes with validation
  const handleInputChange = useCallback(
    (field: keyof TravellerDetails) => (value: string) => {
      const updatedDetails = {
        ...value,
        [field]: value
      };

      // Update parent component
      onChange(updatedDetails);

      // Mark field as touched
      setTouched(prev => ({ ...prev, [field]: true }));

      // Trigger validation
      debouncedValidate(updatedDetails);
    },
    [onChange, debouncedValidate]
  );

  // Handle input blur events
  const handleBlur = useCallback(
    (field: string) => {
      setTouched(prev => ({ ...prev, [field]: true }));
      onBlur?.(field);
    },
    [onBlur]
  );

  // Clear validation errors when component unmounts
  useEffect(() => {
    return () => {
      debouncedValidate.cancel();
    };
  }, [debouncedValidate]);

  return (
    <div 
      className="traveller-input-container p-4"
      data-testid={testId}
      role="form"
      aria-label="Traveller Information Form"
    >
      <div className="input-grid grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <Input
          label="First Name"
          value={value.firstName}
          onChange={handleInputChange('firstName')}
          onBlur={() => handleBlur('firstName')}
          error={touched.firstName ? combinedErrors.firstName : undefined}
          required={isRequired}
          disabled={disabled}
          id={`${testId}-firstName`}
          autoComplete="given-name"
        />

        <Input
          label="Last Name"
          value={value.lastName}
          onChange={handleInputChange('lastName')}
          onBlur={() => handleBlur('lastName')}
          error={touched.lastName ? combinedErrors.lastName : undefined}
          required={isRequired}
          disabled={disabled}
          id={`${testId}-lastName`}
          autoComplete="family-name"
        />

        <Input
          label="Email"
          type="email"
          value={value.email}
          onChange={handleInputChange('email')}
          onBlur={() => handleBlur('email')}
          error={touched.email ? combinedErrors.email : undefined}
          required={isRequired}
          disabled={disabled}
          id={`${testId}-email`}
          autoComplete="email"
        />

        <Input
          label="Phone"
          type="tel"
          value={value.phone}
          onChange={handleInputChange('phone')}
          onBlur={() => handleBlur('phone')}
          error={touched.phone ? combinedErrors.phone : undefined}
          required={isRequired}
          disabled={disabled}
          id={`${testId}-phone`}
          autoComplete="tel"
          inputMode="tel"
        />

        <Input
          label="Nationality"
          value={value.nationality}
          onChange={handleInputChange('nationality')}
          onBlur={() => handleBlur('nationality')}
          error={touched.nationality ? combinedErrors.nationality : undefined}
          required={isRequired}
          disabled={disabled}
          id={`${testId}-nationality`}
        />

        <Input
          label="Passport Number"
          value={value.passportNumber}
          onChange={handleInputChange('passportNumber')}
          onBlur={() => handleBlur('passportNumber')}
          error={touched.passportNumber ? combinedErrors.passportNumber : undefined}
          required={isRequired}
          disabled={disabled}
          id={`${testId}-passportNumber`}
          autoComplete="off"
        />
      </div>

      {/* Accessibility announcement for form errors */}
      {Object.keys(combinedErrors).length > 0 && (
        <div className="sr-only" role="alert">
          Please correct the following errors in the form:
          {Object.entries(combinedErrors).map(([field, error]) => (
            <span key={field}>{error}</span>
          ))}
        </div>
      )}
    </div>
  );
};

export default TravellerInput;