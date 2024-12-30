/**
 * @fileoverview Root navigation component for the Android mobile app
 * Handles authentication state, biometric verification, and analytics tracking
 * @version 1.0.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, NavigationState } from '@react-navigation/native'; // ^6.0.0
import { createStackNavigator } from '@react-navigation/stack'; // ^6.0.0
import AsyncStorage from '@react-native-async-storage/async-storage'; // ^1.17.0
import { LoadingSpinner } from '@react-native-community/spinner'; // ^1.3.0
import analytics from '@react-native-firebase/analytics'; // ^14.0.0
import { Alert, AppState, AppStateStatus } from 'react-native';

// Internal imports
import { RootStackParamList } from './types';
import { useAuth } from '../hooks/useAuth';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { withErrorBoundary } from '../components/ErrorBoundary';
import { ErrorCode } from '../../../backend/shared/constants/error-codes';

// Navigation persistence key
const PERSISTENCE_KEY = 'navigation-state-v1';

// Initialize root stack navigator with type safety
const Stack = createStackNavigator<RootStackParamList>();

/**
 * Root navigation component with enhanced security and analytics
 */
const AppNavigator: React.FC = () => {
  // Authentication state and methods
  const { 
    isAuthenticated, 
    loading, 
    biometricStatus,
    handleBiometricLogin 
  } = useAuth();

  // Navigation state management
  const [isReady, setIsReady] = useState(false);
  const [initialState, setInitialState] = useState<NavigationState>();
  const routeNameRef = useRef<string>();
  const navigationRef = useRef(null);
  const appState = useRef(AppState.currentState);

  /**
   * Load persisted navigation state
   */
  useEffect(() => {
    const loadNavigationState = async () => {
      try {
        const jsonString = await AsyncStorage.getItem(PERSISTENCE_KEY);
        const state = jsonString ? JSON.parse(jsonString) : undefined;
        if (state) setInitialState(state);
      } catch (error) {
        console.error('Failed to load navigation state:', error);
      } finally {
        setIsReady(true);
      }
    };

    loadNavigationState();
  }, []);

  /**
   * Handle app state changes for security
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) && 
        nextAppState === 'active' &&
        isAuthenticated &&
        biometricStatus === 'available'
      ) {
        try {
          await handleBiometricLogin();
        } catch (error) {
          Alert.alert(
            'Authentication Required',
            'Please verify your identity to continue.',
            [{ text: 'OK', onPress: () => {} }]
          );
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, biometricStatus, handleBiometricLogin]);

  /**
   * Navigation state persistence and analytics tracking
   */
  const handleStateChange = async (state: NavigationState | undefined) => {
    if (!state) return;

    // Persist navigation state
    try {
      await AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save navigation state:', error);
    }

    // Track screen views
    const previousRouteName = routeNameRef.current;
    const currentRouteName = state.routes[state.index].name;

    if (previousRouteName !== currentRouteName) {
      await analytics().logScreenView({
        screen_name: currentRouteName,
        screen_class: currentRouteName,
      });
    }
    routeNameRef.current = currentRouteName;
  };

  // Show loading spinner while initializing
  if (!isReady || loading) {
    return <LoadingSpinner size="large" color="#1A73E8" />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      initialState={initialState}
      onStateChange={handleStateChange}
      onReady={() => {
        routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
      }}
      fallback={<LoadingSpinner size="large" color="#1A73E8" />}
      onError={(error) => {
        console.error('Navigation error:', error);
        analytics().logEvent('navigation_error', {
          error_code: ErrorCode.INTERNAL_SERVER_ERROR,
          error_message: error.message,
        });
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          animationEnabled: true,
        }}
      >
        {isAuthenticated ? (
          <Stack.Screen 
            name="Main" 
            component={MainNavigator}
            options={{ animationEnabled: false }}
          />
        ) : (
          <Stack.Screen 
            name="Auth" 
            component={AuthNavigator}
            options={{ animationEnabled: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Export with error boundary wrapper
export default withErrorBoundary(AppNavigator, {
  onError: (error) => {
    analytics().logEvent('navigation_crash', {
      error_code: ErrorCode.INTERNAL_SERVER_ERROR,
      error_message: error.message,
      stack_trace: error.stack,
    });
  },
});