/**
 * Root Component for iOS Mobile Application
 * Implements Redux store provider, error boundary, and navigation container
 * with comprehensive error tracking and accessibility support
 * @version 1.0.0
 */

import React, { useEffect } from 'react';
import { StatusBar, Platform } from 'react-native';
import { Provider } from 'react-redux'; // ^8.1.0
import { SafeAreaProvider } from 'react-native-safe-area-context'; // ^4.5.0

// Import core components and services
import AppNavigator from './navigation/AppNavigator';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { store } from './store';

// Import analytics for error tracking
import { Analytics } from './utils/analytics';

/**
 * Default status bar configuration
 */
const DEFAULT_STATUSBAR_CONFIG = {
  barStyle: Platform.select({
    ios: 'dark-content',
    default: 'default'
  }),
  backgroundColor: '#FFFFFF'
} as const;

/**
 * Root application component implementing core providers and error handling
 */
const App: React.FC = () => {
  /**
   * Configure global error tracking
   */
  useEffect(() => {
    const handleGlobalError = async (error: Error, isFatal?: boolean) => {
      try {
        await Analytics.trackEvent('app_error', {
          error: error.message,
          stack: error.stack,
          isFatal: Boolean(isFatal),
          timestamp: new Date().toISOString()
        });
      } catch (trackingError) {
        console.error('Failed to track error:', trackingError);
      }
    };

    // Set up global error handler
    if (ErrorUtils) {
      ErrorUtils.setGlobalHandler(handleGlobalError);
    }

    return () => {
      // Reset global error handler on cleanup
      if (ErrorUtils) {
        ErrorUtils.setGlobalHandler(() => {});
      }
    };
  }, []);

  /**
   * Custom error boundary handler for component errors
   */
  const handleError = async (error: Error, errorInfo: React.ErrorInfo) => {
    try {
      await Analytics.trackEvent('component_error', {
        error: error.message,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      });
    } catch (trackingError) {
      console.error('Failed to track component error:', trackingError);
    }
  };

  return (
    <ErrorBoundary
      onError={handleError}
      fallback={
        <SafeAreaProvider>
          <StatusBar {...DEFAULT_STATUSBAR_CONFIG} />
          {/* Add custom error UI here if needed */}
        </SafeAreaProvider>
      }
    >
      <Provider store={store}>
        <SafeAreaProvider>
          <StatusBar {...DEFAULT_STATUSBAR_CONFIG} />
          <AppNavigator />
        </SafeAreaProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;