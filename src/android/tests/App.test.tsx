/**
 * @fileoverview Comprehensive test suite for the root Android application component
 * Tests core initialization, provider hierarchy, navigation setup, error handling,
 * and state management across the application
 * @version 1.0.0
 */

import React from 'react';
import { render, act, cleanup, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import analytics from '@react-native-firebase/analytics';
import { ErrorBoundary } from '../components/shared/ErrorBoundary';
import App from '../App';
import { store, persistor } from '../store';
import { config } from '../config/development';
import { ErrorCode } from '../../../backend/shared/constants/error-codes';

// Mock external dependencies
jest.mock('@react-native-firebase/analytics', () => ({
  __esModule: true,
  default: () => ({
    setAnalyticsCollectionEnabled: jest.fn().mockResolvedValue(true),
    logEvent: jest.fn().mockResolvedValue(true)
  })
}));

jest.mock('react-native', () => ({
  StatusBar: jest.fn(),
  Platform: {
    OS: 'android',
    select: jest.fn()
  }
}));

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useNavigationContainerRef: () => ({
    current: {
      navigate: jest.fn(),
      reset: jest.fn()
    }
  })
}));

// Test suite setup
describe('App Component', () => {
  // Setup before each test
  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  // Cleanup after each test
  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
  });

  it('renders correctly with all providers', async () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <App />
        </PersistGate>
      </Provider>
    );

    await waitFor(() => {
      expect(getByTestId('app-root')).toBeTruthy();
    });
  });

  it('initializes analytics when enabled', async () => {
    const analyticsInstance = analytics();
    
    render(
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <App />
        </PersistGate>
      </Provider>
    );

    await waitFor(() => {
      expect(analyticsInstance.setAnalyticsCollectionEnabled).toHaveBeenCalledWith(
        config.FEATURE_FLAGS.ENABLE_ANALYTICS
      );
      expect(analyticsInstance.logEvent).toHaveBeenCalledWith('app_launch', {
        version: process.env.APP_VERSION,
        platform: 'android',
        environment: config.ENV
      });
    });
  });

  it('handles global errors appropriately', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const analyticsInstance = analytics();
    const errorMessage = 'Test error';

    const ThrowError = () => {
      throw new Error(errorMessage);
    };

    render(
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
        </PersistGate>
      </Provider>
    );

    await waitFor(() => {
      expect(analyticsInstance.logEvent).toHaveBeenCalledWith('app_error', {
        error_code: ErrorCode.INTERNAL_SERVER_ERROR,
        error_message: errorMessage,
        error_stack: expect.any(String)
      });
    });

    errorSpy.mockRestore();
  });

  it('handles persistor loading state', async () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <PersistGate 
          loading={<SafeAreaProvider testID="loading-state" />}
          persistor={persistor}
        >
          <App />
        </PersistGate>
      </Provider>
    );

    // Initially shows loading state
    expect(getByTestId('loading-state')).toBeTruthy();

    // Wait for persistence to complete
    await waitFor(() => {
      expect(() => getByTestId('loading-state')).toThrow();
      expect(getByTestId('app-root')).toBeTruthy();
    });
  });

  it('handles persistor errors', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const analyticsInstance = analytics();
    const persistError = new Error('Persistence error');

    render(
      <Provider store={store}>
        <PersistGate
          loading={null}
          persistor={persistor}
          onError={(error) => {
            analyticsInstance.logEvent('persistor_error', {
              error_message: error.message,
              error_stack: error.stack
            });
          }}
        >
          <App />
        </PersistGate>
      </Provider>
    );

    // Simulate persistor error
    act(() => {
      persistor.dispatch({
        type: 'persist/ERROR',
        payload: persistError
      });
    });

    await waitFor(() => {
      expect(analyticsInstance.logEvent).toHaveBeenCalledWith('persistor_error', {
        error_message: persistError.message,
        error_stack: persistError.stack
      });
    });

    errorSpy.mockRestore();
  });

  it('maintains provider hierarchy correctly', async () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <App />
        </PersistGate>
      </Provider>
    );

    await waitFor(() => {
      const appRoot = getByTestId('app-root');
      
      // Verify provider nesting order
      expect(appRoot.findByType(ErrorBoundary)).toBeTruthy();
      expect(appRoot.findByType(Provider)).toBeTruthy();
      expect(appRoot.findByType(PersistGate)).toBeTruthy();
      expect(appRoot.findByType(SafeAreaProvider)).toBeTruthy();
    });
  });

  it('configures StatusBar correctly', async () => {
    const { StatusBar } = require('react-native');

    render(
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <App />
        </PersistGate>
      </Provider>
    );

    await waitFor(() => {
      expect(StatusBar).toHaveBeenCalledWith(
        expect.objectContaining({
          barStyle: 'dark-content',
          backgroundColor: '#FFFFFF',
          translucent: true
        }),
        {}
      );
    });
  });
});