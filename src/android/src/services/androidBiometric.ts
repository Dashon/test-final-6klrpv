/**
 * @fileoverview Android Biometric Authentication Service
 * Provides secure biometric authentication interface for Android devices
 * @module android/services/androidBiometric
 * @version 1.0.0
 */

import { NativeModules } from 'react-native'; // v0.71.x
import { BiometricStatus, BiometricAuthResult } from '../types/auth';

// Native Android BiometricModule interface
const { BiometricModule } = NativeModules;

// Constants for biometric operations
const BIOMETRIC_TIMEOUT_MS = 30000; // 30 seconds
const AVAILABILITY_TIMEOUT_MS = 5000; // 5 seconds
const MIN_ANDROID_VERSION = 23; // Android 6.0 (Marshmallow)
const STRONG_BIOMETRIC_LEVEL = 3;

/**
 * Error messages for biometric operations
 */
const BiometricErrors = {
  MODULE_NOT_FOUND: 'Biometric module not available on this device',
  ANDROID_VERSION: 'Android version not supported',
  TIMEOUT: 'Biometric operation timed out',
  INVALID_PARAMS: 'Invalid parameters provided',
  HARDWARE_UNAVAILABLE: 'Biometric hardware not available',
  NOT_ENROLLED: 'No biometric credentials enrolled',
  SECURITY_LEVEL: 'Biometric security level insufficient',
} as const;

/**
 * Validates the BiometricModule existence and Android compatibility
 * @throws {Error} If module is not available or Android version is unsupported
 */
const validateBiometricModule = (): void => {
  if (!BiometricModule) {
    throw new Error(BiometricErrors.MODULE_NOT_FOUND);
  }

  if (BiometricModule.getAndroidVersion() < MIN_ANDROID_VERSION) {
    throw new Error(BiometricErrors.ANDROID_VERSION);
  }
};

/**
 * Checks if biometric authentication is available on the device
 * Performs comprehensive validation of hardware, enrollment, and security level
 * 
 * @returns {Promise<BiometricStatus>} Current status of biometric availability
 * @throws {Error} If operation times out or encounters critical error
 */
export const isBiometricAvailable = async (): Promise<BiometricStatus> => {
  try {
    validateBiometricModule();

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(BiometricErrors.TIMEOUT)), AVAILABILITY_TIMEOUT_MS);
    });

    // Check hardware and enrollment status
    const availabilityPromise = Promise.all([
      BiometricModule.isBiometricHardwareAvailable(),
      BiometricModule.isBiometricEnrolled(),
      BiometricModule.getBiometricSecurityLevel()
    ]);

    // Race against timeout
    const [hasHardware, isEnrolled, securityLevel] = await Promise.race([
      availabilityPromise,
      timeoutPromise
    ]);

    // Validate hardware availability
    if (!hasHardware) {
      return 'noHardware';
    }

    // Check enrollment status
    if (!isEnrolled) {
      return 'notEnrolled';
    }

    // Validate security level meets minimum requirements
    if (securityLevel < STRONG_BIOMETRIC_LEVEL) {
      return 'unavailable';
    }

    // Log successful availability check for security audit
    console.info('Biometric availability verified successfully');
    
    return 'available';

  } catch (error) {
    // Log error for security monitoring
    console.error('Biometric availability check failed:', error);
    
    if (error instanceof Error && error.message === BiometricErrors.TIMEOUT) {
      throw error;
    }
    
    return 'unavailable';
  }
};

/**
 * Initiates biometric authentication with enhanced security features
 * 
 * @param {string} title - Title for biometric prompt
 * @param {string} subtitle - Subtitle for biometric prompt
 * @returns {Promise<BiometricAuthResult>} Result of authentication attempt
 * @throws {Error} If parameters are invalid or operation times out
 */
export const authenticateWithBiometrics = async (
  title: string,
  subtitle: string
): Promise<BiometricAuthResult> => {
  try {
    // Validate input parameters
    if (!title || !subtitle) {
      throw new Error(BiometricErrors.INVALID_PARAMS);
    }

    validateBiometricModule();

    // Initialize secure hardware keystore
    await BiometricModule.initializeKeystore();

    // Configure authentication options
    const authConfig = {
      title,
      subtitle,
      confirmationRequired: true,
      invalidateOnEnrollment: true, // Invalidate keys when new biometrics enrolled
      accessibilityEnabled: true,
      timeoutMs: BIOMETRIC_TIMEOUT_MS
    };

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(BiometricErrors.TIMEOUT)), BIOMETRIC_TIMEOUT_MS);
    });

    // Attempt authentication with timeout
    const authResultPromise = BiometricModule.authenticate(authConfig);
    const authResult = await Promise.race([authResultPromise, timeoutPromise]);

    // Log authentication attempt for security audit
    console.info('Biometric authentication attempt completed', {
      success: authResult.success,
      timestamp: new Date().toISOString()
    });

    return {
      success: authResult.success,
      error: authResult.error,
      timestamp: Date.now()
    };

  } catch (error) {
    // Log authentication error for security monitoring
    console.error('Biometric authentication failed:', error);

    // Clean up any pending authentication state
    await BiometricModule.cancelAuthentication();

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: Date.now()
    };
  } finally {
    // Ensure proper cleanup of cryptographic resources
    await BiometricModule.cleanupKeystore();
  }
};