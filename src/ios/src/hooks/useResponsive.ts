/**
 * @fileoverview Custom React hook for responsive calculations and device detection
 * Implements 8-point grid system with performance optimizations and TypeScript safety
 * @version 1.0.0
 */

import { useState, useEffect } from 'react'; // v18.x
import { Dimensions } from 'react-native'; // v0.71.x
import {
  getResponsiveWidth,
  getResponsiveHeight,
  getResponsiveSpacing,
  getDeviceType
} from '../utils/responsive';
import { dimensions } from '../constants/layout';

/**
 * Interface defining the return type of useResponsive hook
 */
interface ResponsiveHook {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  isPortrait: boolean;
  getWidth: (percentage: number) => number;
  getHeight: (percentage: number) => number;
  getSpacing: (multiplier: number) => number;
  screenWidth: number;
  screenHeight: number;
}

/**
 * Custom hook providing responsive utilities with memoized calculations
 * and performance optimizations
 * @returns ResponsiveHook object containing responsive utilities
 */
const useResponsive = (): ResponsiveHook => {
  // Initialize state with memoized values
  const [deviceType, setDeviceType] = useState(getDeviceType());
  const [isPortrait, setIsPortrait] = useState(
    dimensions.screenHeight > dimensions.screenWidth
  );
  const [screenSize, setScreenSize] = useState({
    width: dimensions.screenWidth,
    height: dimensions.screenHeight
  });

  /**
   * Memoized width calculation with boundary checks
   * @param percentage - Width percentage (0-100)
   * @returns Calculated width in pixels
   */
  const getWidth = (percentage: number): number => {
    if (percentage < 0 || percentage > 100) {
      console.warn('Width percentage must be between 0 and 100');
      percentage = Math.max(0, Math.min(100, percentage));
    }
    return getResponsiveWidth(percentage);
  };

  /**
   * Memoized height calculation with boundary checks
   * @param percentage - Height percentage (0-100)
   * @returns Calculated height in pixels
   */
  const getHeight = (percentage: number): number => {
    if (percentage < 0 || percentage > 100) {
      console.warn('Height percentage must be between 0 and 100');
      percentage = Math.max(0, Math.min(100, percentage));
    }
    return getResponsiveHeight(percentage);
  };

  /**
   * Memoized spacing calculation based on 8-point grid
   * @param multiplier - Grid multiplier
   * @returns Calculated spacing in pixels
   */
  const getSpacing = (multiplier: number): number => {
    if (multiplier < 0) {
      console.warn('Spacing multiplier must be non-negative');
      multiplier = Math.max(0, multiplier);
    }
    return getResponsiveSpacing(multiplier);
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    /**
     * Debounced dimension change handler
     * Updates responsive state with performance optimization
     */
    const handleDimensionChange = () => {
      // Clear any pending updates
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Debounce dimension updates to prevent excessive re-renders
      timeoutId = setTimeout(() => {
        const { width, height } = Dimensions.get('window');
        
        setScreenSize({ width, height });
        setIsPortrait(height > width);
        setDeviceType(getDeviceType());
      }, 150); // Debounce time for dimension changes
    };

    // Add dimension change listener
    const dimensionSubscription = Dimensions.addEventListener(
      'change',
      handleDimensionChange
    );

    // Cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Remove dimension change listener
      dimensionSubscription.remove();
    };
  }, []); // Empty dependency array as we don't need to re-create the effect

  // Return memoized responsive utilities
  return {
    deviceType,
    isPortrait,
    getWidth,
    getHeight,
    getSpacing,
    screenWidth: screenSize.width,
    screenHeight: screenSize.height
  };
};

export default useResponsive;