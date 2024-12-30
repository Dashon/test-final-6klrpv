/**
 * @fileoverview React hook for Android biometric authentication with enhanced security and error handling
 * @module android/hooks/useAndroidBiometric
 * @version 1.0.0
 */

import { useState, useCallback, useEffect } from 'react'; // v18.2.0
import { 
  isBiometricAvailable, 
  authenticateWithBiometrics 
} from '../services/androidBiometric';
import { 
  BiometricStatus, 
  BiometricAuthResult 
} from '../types/auth';

/**
 * Custom hook for managing Android biometric authentication
 * Provides simplified interface with comprehensive error handling
 * 
 * @returns {Object} Biometric authentication state and methods
 */
export const useAndroidBiometric = () => {
  // Track biometric availability status
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  
  // Track loading/checking state
  const [isChecking, setIsChecking] = useState<boolean>(true);
  
  // Track error state with proper typing
  const [error, setError] = useState<string | null>(null);
  
  // Track last successful authentication timestamp
  const [lastAuthTimestamp, setLastAuthTimestamp] = useState<number | null>(null);

  /**
   * Check biometric availability with enhanced error handling
   * Validates hardware capabilities and enrollment status
   */
  const checkAvailability = useCallback(async (): Promise<void> => {
    try {
      setIsChecking(true);
      setError(null);

      const status: BiometricStatus = await isBiometricAvailable();
      
      // Update availability based on status
      setIsAvailable(status === 'available');
      
      // Set appropriate error message for unavailable states
      if (status !== 'available') {
        switch (status) {
          case 'noHardware':
            setError('This device does not support biometric authentication');
            break;
          case 'notEnrolled':
            setError('No biometric credentials are enrolled on this device');
            break;
          case 'unavailable':
            setError('Biometric authentication is currently unavailable');
            break;
          default:
            setError('Unable to verify biometric capability');
        }
      }

    } catch (err) {
      setIsAvailable(false);
      setError(err instanceof Error ? err.message : 'Failed to check biometric availability');
      console.error('Biometric availability check failed:', err);
    } finally {
      setIsChecking(false);
    }
  }, []);

  /**
   * Authenticate using biometrics with comprehensive error handling
   * 
   * @param {string} title - Title for biometric prompt
   * @param {string} subtitle - Subtitle for biometric prompt
   * @returns {Promise<BiometricAuthResult>} Authentication result with timestamp
   */
  const authenticate = useCallback(async (
    title: string,
    subtitle: string
  ): Promise<BiometricAuthResult> => {
    try {
      // Validate input parameters
      if (!title || !subtitle) {
        throw new Error('Title and subtitle are required for authentication');
      }

      // Verify biometric availability
      if (!isAvailable) {
        throw new Error('Biometric authentication is not available');
      }

      // Clear any previous errors
      setError(null);

      // Attempt authentication
      const result = await authenticateWithBiometrics(title, subtitle);

      // Update timestamp on successful authentication
      if (result.success) {
        setLastAuthTimestamp(result.timestamp);
      } else {
        setError(result.error || 'Authentication failed');
      }

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      
      // Return standardized error result
      return {
        success: false,
        error: errorMessage,
        timestamp: Date.now()
      };
    }
  }, [isAvailable]);

  // Check biometric availability on mount
  useEffect(() => {
    checkAvailability();

    // Cleanup function to reset states
    return () => {
      setIsAvailable(false);
      setIsChecking(false);
      setError(null);
      setLastAuthTimestamp(null);
    };
  }, [checkAvailability]);

  return {
    isAvailable,
    isChecking,
    error,
    lastAuthTimestamp,
    authenticate,
    checkAvailability
  };
};