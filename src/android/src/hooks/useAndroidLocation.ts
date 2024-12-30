/**
 * Android Location Hook
 * Version: 1.0.0
 * React Native Version: 0.71.x
 * 
 * Custom hook providing comprehensive location functionality for Android devices
 * with built-in privacy controls, battery optimization, and automatic error recovery.
 */

import { useState, useEffect, useCallback, useRef } from 'react'; // v18.x
import {
  LocationData,
  LocationOptions,
  getCurrentLocation,
  startLocationUpdates,
  stopLocationUpdates,
} from '../services/androidLocation';

// Default options optimized for battery life and accuracy
const DEFAULT_OPTIONS: LocationOptions = {
  enableHighAccuracy: true,
  updateInterval: 10000, // 10 seconds
  fastestInterval: 5000, // 5 seconds
  maxWaitTime: 30000, // 30 seconds
  smallestDisplacement: 10, // 10 meters
  timeout: 15000, // 15 seconds
  enableBackgroundUpdates: false,
  batteryOptimization: true,
};

// Accuracy level configurations
const ACCURACY_LEVELS = {
  high: {
    enableHighAccuracy: true,
    updateInterval: 5000,
    smallestDisplacement: 5,
  },
  balanced: {
    enableHighAccuracy: true,
    updateInterval: 10000,
    smallestDisplacement: 10,
  },
  low: {
    enableHighAccuracy: false,
    updateInterval: 30000,
    smallestDisplacement: 50,
  },
};

type AccuracyLevel = 'high' | 'balanced' | 'low';

/**
 * Custom hook for managing Android device location
 * @param options Optional location configuration options
 */
export const useAndroidLocation = (options: Partial<LocationOptions> = {}) => {
  // State management
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [accuracy, setAccuracy] = useState<AccuracyLevel>('balanced');

  // Refs for tracking subscriptions and update status
  const locationSubscription = useRef<(() => void) | null>(null);
  const retryAttempts = useRef<number>(0);
  const maxRetries = 3;

  /**
   * Handles location update events
   */
  const handleLocationUpdate = useCallback((newLocation: LocationData) => {
    setLocation(newLocation);
    setError(null);
    retryAttempts.current = 0;
  }, []);

  /**
   * Handles location errors with automatic recovery
   */
  const handleLocationError = useCallback((error: Error) => {
    setError(error);
    if (retryAttempts.current < maxRetries) {
      retryAttempts.current++;
      // Exponential backoff for retries
      setTimeout(() => {
        startTracking().catch(console.error);
      }, Math.pow(2, retryAttempts.current) * 1000);
    }
  }, []);

  /**
   * Gets current device position
   */
  const getCurrentPosition = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const currentLocation = await getCurrentLocation({
        ...DEFAULT_OPTIONS,
        ...ACCURACY_LEVELS[accuracy],
        ...options,
      });
      setLocation(currentLocation);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get location'));
    } finally {
      setIsLoading(false);
    }
  }, [accuracy, options]);

  /**
   * Starts continuous location tracking
   */
  const startTracking = useCallback(async () => {
    try {
      if (locationSubscription.current) {
        await stopTracking();
      }

      setIsLoading(true);
      setError(null);

      const cleanup = await startLocationUpdates(
        {
          ...DEFAULT_OPTIONS,
          ...ACCURACY_LEVELS[accuracy],
          ...options,
        },
        handleLocationUpdate,
        handleLocationError
      );

      locationSubscription.current = cleanup;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to start tracking'));
    } finally {
      setIsLoading(false);
    }
  }, [accuracy, options, handleLocationUpdate, handleLocationError]);

  /**
   * Stops location tracking and cleans up resources
   */
  const stopTracking = useCallback(async () => {
    try {
      if (locationSubscription.current) {
        locationSubscription.current();
        locationSubscription.current = null;
      }
      await stopLocationUpdates();
    } catch (err) {
      console.error('Error stopping location updates:', err);
    }
  }, []);

  /**
   * Updates accuracy level with corresponding configuration
   */
  const setAccuracyLevel = useCallback((level: AccuracyLevel) => {
    setAccuracy(level);
    if (locationSubscription.current) {
      // Restart tracking with new accuracy settings
      startTracking().catch(console.error);
    }
  }, [startTracking]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopTracking().catch(console.error);
    };
  }, [stopTracking]);

  return {
    location,
    error,
    isLoading,
    isAvailable,
    accuracy,
    getCurrentPosition,
    startTracking,
    stopTracking,
    setAccuracy: setAccuracyLevel,
  };
};

export default useAndroidLocation;