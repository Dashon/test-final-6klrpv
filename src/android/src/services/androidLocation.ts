/**
 * Android Location Service Module
 * Version: 1.0.0
 * React Native Version: 0.71.x
 * 
 * Provides a secure and battery-efficient bridge between React Native and native Android location services.
 * Implements real-time location tracking, geofencing capabilities, and comprehensive error management.
 */

import { NativeModules, NativeEventEmitter } from 'react-native'; // v0.71.x
import { checkLocationPermission, requestLocationPermission } from '../utils/permissions';

// Native module interface
const LocationModule = NativeModules.LocationModule;
const locationEventEmitter = new NativeEventEmitter(LocationModule);

// Default configuration constants
const DEFAULT_UPDATE_INTERVAL = 10000; // 10 seconds
const DEFAULT_HIGH_ACCURACY = true;
const DEFAULT_FASTEST_INTERVAL = 5000; // 5 seconds
const DEFAULT_MAX_WAIT_TIME = 30000; // 30 seconds
const DEFAULT_SMALLEST_DISPLACEMENT = 10; // 10 meters

/**
 * Comprehensive interface for location data with accuracy metrics
 */
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  speed: number | null;
  bearing: number | null;
  timestamp: number;
  provider: string;
  mockLocation: boolean;
}

/**
 * Configurable options for location service behavior
 */
export interface LocationOptions {
  enableHighAccuracy: boolean;
  updateInterval: number;
  fastestInterval: number;
  maxWaitTime: number;
  smallestDisplacement: number;
  timeout: number;
  enableBackgroundUpdates: boolean;
  batteryOptimization: boolean;
}

/**
 * Interface defining location service error types
 */
export interface LocationError {
  code: number;
  message: string;
  details: object | null;
}

/**
 * Gets the current device location with timeout and error handling
 * @param options Partial location options to override defaults
 * @returns Promise resolving to location data
 */
export const getCurrentLocation = async (
  options: Partial<LocationOptions> = {}
): Promise<LocationData> => {
  try {
    // Merge options with defaults
    const finalOptions: LocationOptions = {
      enableHighAccuracy: options.enableHighAccuracy ?? DEFAULT_HIGH_ACCURACY,
      updateInterval: options.updateInterval ?? DEFAULT_UPDATE_INTERVAL,
      fastestInterval: options.fastestInterval ?? DEFAULT_FASTEST_INTERVAL,
      maxWaitTime: options.maxWaitTime ?? DEFAULT_MAX_WAIT_TIME,
      smallestDisplacement: options.smallestDisplacement ?? DEFAULT_SMALLEST_DISPLACEMENT,
      timeout: options.timeout ?? 15000,
      enableBackgroundUpdates: false,
      batteryOptimization: true,
    };

    // Check location permission
    const permissionStatus = await checkLocationPermission();
    if (!permissionStatus.foreground) {
      throw new Error('Location permission not granted');
    }

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Location request timeout'));
      }, finalOptions.timeout);
    });

    // Request location with timeout
    const locationPromise = new Promise<LocationData>((resolve, reject) => {
      LocationModule.getCurrentLocation(finalOptions)
        .then((location: LocationData) => {
          if (!location) {
            reject(new Error('No location data received'));
            return;
          }
          
          // Validate location data
          if (!isValidLocation(location)) {
            reject(new Error('Invalid location data received'));
            return;
          }

          resolve(location);
        })
        .catch(reject);
    });

    // Race between location request and timeout
    const location = await Promise.race([locationPromise, timeoutPromise]);
    return location;

  } catch (error) {
    throw formatLocationError(error);
  }
};

/**
 * Starts battery-efficient continuous location updates
 * @param options Location configuration options
 * @param callback Success callback with location data
 * @param errorCallback Error callback
 * @returns Cleanup function
 */
export const startLocationUpdates = async (
  options: Partial<LocationOptions> = {},
  callback: (location: LocationData) => void,
  errorCallback: (error: LocationError) => void
): Promise<() => void> => {
  try {
    // Merge options with defaults
    const finalOptions: LocationOptions = {
      enableHighAccuracy: options.enableHighAccuracy ?? DEFAULT_HIGH_ACCURACY,
      updateInterval: options.updateInterval ?? DEFAULT_UPDATE_INTERVAL,
      fastestInterval: options.fastestInterval ?? DEFAULT_FASTEST_INTERVAL,
      maxWaitTime: options.maxWaitTime ?? DEFAULT_MAX_WAIT_TIME,
      smallestDisplacement: options.smallestDisplacement ?? DEFAULT_SMALLEST_DISPLACEMENT,
      timeout: options.timeout ?? 0, // No timeout for continuous updates
      enableBackgroundUpdates: options.enableBackgroundUpdates ?? false,
      batteryOptimization: options.batteryOptimization ?? true,
    };

    // Verify permissions including background if needed
    const permissionStatus = await checkLocationPermission({
      background: finalOptions.enableBackgroundUpdates
    });

    if (!permissionStatus.foreground || 
        (finalOptions.enableBackgroundUpdates && !permissionStatus.background)) {
      throw new Error('Required location permissions not granted');
    }

    // Set up location update listener
    const locationSubscription = locationEventEmitter.addListener(
      'locationUpdate',
      (location: LocationData) => {
        if (isValidLocation(location)) {
          callback(location);
        } else {
          errorCallback({
            code: 1,
            message: 'Invalid location data received',
            details: location
          });
        }
      }
    );

    // Set up error listener
    const errorSubscription = locationEventEmitter.addListener(
      'locationError',
      (error: LocationError) => {
        errorCallback(formatLocationError(error));
      }
    );

    // Start native location updates
    await LocationModule.startLocationUpdates(finalOptions);

    // Return cleanup function
    return () => {
      locationSubscription.remove();
      errorSubscription.remove();
      stopLocationUpdates().catch(console.error);
    };

  } catch (error) {
    throw formatLocationError(error);
  }
};

/**
 * Safely stops continuous location updates and cleans up resources
 */
export const stopLocationUpdates = async (): Promise<void> => {
  try {
    await LocationModule.stopLocationUpdates();
  } catch (error) {
    throw formatLocationError(error);
  }
};

/**
 * Validates location data structure and values
 * @param location Location data to validate
 * @returns boolean indicating validity
 */
const isValidLocation = (location: LocationData): boolean => {
  return (
    typeof location === 'object' &&
    typeof location.latitude === 'number' &&
    typeof location.longitude === 'number' &&
    location.latitude >= -90 &&
    location.latitude <= 90 &&
    location.longitude >= -180 &&
    location.longitude <= 180 &&
    typeof location.accuracy === 'number' &&
    location.accuracy >= 0 &&
    typeof location.timestamp === 'number' &&
    typeof location.provider === 'string' &&
    typeof location.mockLocation === 'boolean'
  );
};

/**
 * Formats location errors into a consistent structure
 * @param error Raw error object
 * @returns Formatted LocationError
 */
const formatLocationError = (error: any): LocationError => {
  return {
    code: error.code || 0,
    message: error.message || 'Unknown location error',
    details: error.details || null
  };
};