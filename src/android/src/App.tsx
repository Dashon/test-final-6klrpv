/**
 * @fileoverview Root component for the AI-Enhanced Social Travel Platform Android app
 * Implements core providers, error handling, and navigation structure
 * @version 1.0.0
 */

import React, { useEffect } from 'react';
import { Provider } from 'react-redux'; // ^8.1.0
import { PersistGate } from 'redux-persist/integration/react'; // ^6.0.0
import { SafeAreaProvider } from 'react-native-safe-area-context'; // ^4.5.0
import { StatusBar } from 'react-native'; // ^0.71.0
import analytics from '@react-native-firebase/analytics'; // ^18.0.0

// Internal imports
import AppNavigator from './navigation/AppNavigator';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { store, persistor } from './store';
import { config } from './config/development';

// Global constants
const STATUSBAR_CONFIG = {
  barStyle: 'dark-content',
  backgroundColor: '#FFFFFF',
  translucent: true,
} as const;

/**
 * Root application component that sets up providers and core structure
 * Implements error boundaries, analytics, and state persistence
 */
const App: React.FC = () => {
  /**
   * Initialize analytics tracking on app launch
   */
  useEffect(() => {
    const initializeAnalytics = async () => {
      if (config.FEATURE_FLAGS.ENABLE_ANALYTICS) {
        await analytics().setAnalyticsCollectionEnabled(true);
        await analytics().logEvent('app_launch', {
          version: process.env.APP_VERSION,
          platform: 'android',
          environment: config.ENV,
        });
      }
    };

    initializeAnalytics().catch(error => {
      console.error('Failed to initialize analytics:', error);
    });
  }, []);

  /**
   * Handle persistence loading state
   */
  const renderLoading = () => {
    return (
      <SafeAreaProvider>
        <StatusBar {...STATUSBAR_CONFIG} />
        {/* Add loading spinner or splash screen here */}
      </SafeAreaProvider>
    );
  };

  /**
   * Handle persistence errors
   */
  const handlePersistorError = (error: Error) => {
    console.error('Persistor error:', error);
    analytics().logEvent('persistor_error', {
      error_message: error.message,
      error_stack: error.stack,
    });
  };

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        analytics().logEvent('app_error', {
          error_message: error.message,
          error_stack: error.stack,
          component_stack: errorInfo.componentStack,
        });
      }}
    >
      <Provider store={store}>
        <PersistGate
          loading={renderLoading()}
          persistor={persistor}
          onBeforeLift={() => {
            // Perform any necessary state rehydration checks
            console.log('State rehydration complete');
          }}
          onError={handlePersistorError}
        >
          <SafeAreaProvider>
            <StatusBar {...STATUSBAR_CONFIG} />
            <AppNavigator />
          </SafeAreaProvider>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
};

// Export with display name for debugging
App.displayName = 'App';

export default App;