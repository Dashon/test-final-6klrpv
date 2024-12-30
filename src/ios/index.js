/**
 * Entry point for iOS React Native Application
 * Implements comprehensive initialization, error handling, and performance monitoring
 * @version 1.0.0
 */

import { AppRegistry, LogBox, Platform } from 'react-native'; // v0.71.x
import Performance from '@react-native-firebase/perf'; // v18.x.x
import { App } from './src/App';
import { LOGGING_CONFIG } from './src/config/development';
import { Analytics } from './utils/analytics';

// Application constants
const APP_NAME = 'AITravelPlatform';
const APP_VERSION = process.env.APP_VERSION || '1.0.0';
const BUILD_NUMBER = process.env.BUILD_NUMBER || '1';

// Ignored warnings in development
const IGNORED_LOGS = [
  'Require cycle:',
  'new NativeEventEmitter()',
  'Module RCTImageLoader'
];

/**
 * Configures development-specific settings including LogBox,
 * console logging, and performance monitoring
 */
const setupDevelopmentSettings = async () => {
  if (__DEV__) {
    // Configure LogBox
    LogBox.ignoreLogs(IGNORED_LOGS);

    // Configure console logging based on logging config
    if (!LOGGING_CONFIG.ENABLE_CONSOLE_LOGS) {
      console.log = () => {};
      console.info = () => {};
      console.debug = () => {};
    }

    // Initialize performance monitoring in development
    if (LOGGING_CONFIG.ENABLE_PERFORMANCE_LOGS) {
      try {
        await Performance().setPerformanceCollectionEnabled(true);
        const trace = await Performance().newTrace('app_startup');
        trace.start();

        // Add startup metrics
        trace.putMetric('js_initialization_time', performance.now());
        trace.putAttribute('platform', Platform.OS);
        trace.putAttribute('version', APP_VERSION);

        await trace.stop();
      } catch (error) {
        console.error('Performance monitoring initialization failed:', error);
      }
    }

    // Configure error reporting settings
    if (LOGGING_CONFIG.ENABLE_CRASH_LOGS) {
      const originalError = global.ErrorUtils.getGlobalHandler();
      
      global.ErrorUtils.setGlobalHandler(async (error, isFatal) => {
        await Analytics.trackEvent('app_error', {
          error: error.message,
          stack: error.stack,
          isFatal: Boolean(isFatal),
          version: APP_VERSION,
          build: BUILD_NUMBER,
          platform: Platform.OS
        });
        originalError(error, isFatal);
      });
    }

    // Set up development-only debugging tools
    if (LOGGING_CONFIG.ENABLE_REDUX_LOGS) {
      global.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ = require('redux-devtools-extension').composeWithDevTools;
    }
  }
};

/**
 * Initializes error handling and reporting configuration
 */
const initializeErrorHandling = async () => {
  // Set up global error boundary
  global.ErrorUtils.setGlobalHandler(async (error, isFatal) => {
    try {
      // Track error in analytics
      await Analytics.trackEvent('app_error', {
        error: error.message,
        stack: error.stack,
        isFatal: Boolean(isFatal),
        version: APP_VERSION,
        build: BUILD_NUMBER,
        platform: Platform.OS,
        timestamp: new Date().toISOString()
      });

      // Log error details if enabled
      if (LOGGING_CONFIG.ENABLE_CRASH_LOGS) {
        console.error('Application Error:', {
          message: error.message,
          stack: error.stack,
          isFatal
        });
      }

      // Handle fatal errors
      if (isFatal) {
        // Attempt to save app state or cleanup if needed
        await Analytics.trackEvent('app_fatal_error', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    } catch (trackingError) {
      // Fallback error logging if analytics fails
      console.error('Error tracking failed:', trackingError);
    }
  });
};

// Initialize application settings and error handling
Promise.all([
  setupDevelopmentSettings(),
  initializeErrorHandling()
]).catch(error => {
  console.error('Application initialization failed:', error);
});

// Initialize startup performance trace
if (LOGGING_CONFIG.ENABLE_PERFORMANCE_LOGS) {
  Performance()
    .newTrace('app_initialization')
    .then(trace => {
      trace.start();
      AppRegistry.registerComponent(APP_NAME, () => App);
      trace.stop();
    })
    .catch(error => {
      console.error('Performance trace failed:', error);
      AppRegistry.registerComponent(APP_NAME, () => App);
    });
} else {
  // Register the application without performance tracing
  AppRegistry.registerComponent(APP_NAME, () => App);
}

// Track application launch
Analytics.trackEvent('app_launch', {
  version: APP_VERSION,
  build: BUILD_NUMBER,
  platform: Platform.OS,
  timestamp: new Date().toISOString()
}).catch(error => {
  console.error('Launch tracking failed:', error);
});