/**
 * @fileoverview Entry point for the AI-Enhanced Social Travel Platform Android app
 * Handles app registration and initialization with comprehensive error handling
 * @version 1.0.0
 */

import { AppRegistry } from 'react-native'; // ^0.71.x
import App from './src/App';
import { AnalyticsService } from './src/utils/analytics';
import { ErrorCode } from '../backend/shared/constants/error-codes';

// Initialize analytics service for startup tracking
const analyticsService = new AnalyticsService();

// Global error handler for uncaught JavaScript errors
const errorHandler = (error, isFatal) => {
  analyticsService.trackError(error, {
    severity: isFatal ? 'critical' : 'high',
    tags: ['uncaught_error', `fatal_${isFatal}`],
    metadata: {
      isFatal,
      errorName: error.name,
      errorMessage: error.message,
    }
  });

  // Log error for development debugging
  if (__DEV__) {
    console.error('Uncaught error:', error);
  }
};

// Global promise rejection handler
const rejectionHandler = (event) => {
  analyticsService.trackError(event.reason, {
    severity: 'high',
    tags: ['unhandled_rejection'],
    metadata: {
      type: 'promise_rejection',
      reason: event.reason?.message || 'Unknown rejection reason'
    }
  });

  // Log rejection for development debugging
  if (__DEV__) {
    console.error('Unhandled promise rejection:', event.reason);
  }
};

/**
 * Initialize app performance monitoring and error tracking
 */
const initializeMonitoring = async () => {
  try {
    // Track app startup performance
    const startupTrace = await analyticsService.startTrace('app_startup');
    
    // Set up global error handlers
    global.ErrorUtils.setGlobalHandler(errorHandler);
    global.addEventListener('unhandledrejection', rejectionHandler);

    // Track successful initialization
    await analyticsService.trackEvent('app_initialized', {
      timestamp: Date.now(),
      success: true
    });

    // End startup trace
    await startupTrace.stop();
  } catch (error) {
    console.error('Failed to initialize monitoring:', error);
    analyticsService.trackError(error, {
      severity: 'high',
      tags: ['initialization_error'],
      metadata: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        context: 'app_initialization'
      }
    });
  }
};

/**
 * Register the app with React Native's AppRegistry
 * Includes error boundary and performance monitoring
 */
const registerApp = () => {
  // Initialize monitoring before app registration
  initializeMonitoring().catch(error => {
    console.error('Monitoring initialization failed:', error);
  });

  // Register the app component
  AppRegistry.registerComponent('AITravelPlatform', () => App);
};

// Execute app registration
registerApp();

// Export for testing purposes
export { registerApp, errorHandler, rejectionHandler };