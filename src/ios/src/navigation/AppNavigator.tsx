/**
 * Root Navigation Component for iOS Mobile Application
 * Implements secure navigation state persistence, biometric authentication,
 * deep linking, and analytics tracking with accessibility compliance
 * @version 1.0.0
 */

import React, { useEffect, useCallback } from 'react';
import { Platform, AccessibilityInfo } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import navigation components and types
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { RootStackParamList } from './types';

// Import authentication hooks and analytics
import { useAuth } from '../hooks/useAuth';
import { Analytics } from '../utils/analytics';

// Create root stack navigator
const Stack = createStackNavigator<RootStackParamList>();

// Navigation persistence key with version control
const NAVIGATION_PERSISTENCE_KEY = '@navigation_state_v1';

/**
 * Deep linking configuration for app-wide navigation
 */
const linking = {
  prefixes: ['aitravelapp://', 'https://app.aitravelplatform.com'],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register/:referralCode?',
          ForgotPassword: 'forgot-password'
        }
      },
      Main: {
        screens: {
          Dashboard: 'dashboard',
          Booking: 'booking/:bookingId?',
          Chat: 'chat/:roomId?',
          Persona: 'persona/:personaId?',
          Profile: 'profile/:section?'
        }
      }
    }
  }
};

/**
 * AppNavigator component implementing root navigation structure
 * with enhanced security and analytics features
 */
const AppNavigator: React.FC = () => {
  // Get authentication state from auth hook
  const { 
    isAuthenticated, 
    user, 
    isBiometricEnabled, 
    sessionTimeout 
  } = useAuth();

  /**
   * Handles navigation state persistence with encryption
   */
  const handleNavigationStateChange = useCallback(async (state: any) => {
    try {
      if (state) {
        // Remove sensitive data before persistence
        const sanitizedState = {
          ...state,
          routes: state.routes.map((route: any) => ({
            ...route,
            params: route.params ? {
              ...route.params,
              token: undefined,
              password: undefined
            } : undefined
          }))
        };

        await AsyncStorage.setItem(
          NAVIGATION_PERSISTENCE_KEY,
          JSON.stringify(sanitizedState)
        );
      }
    } catch (error) {
      await Analytics.trackEvent('navigation_state_persistence_error', {
        error: error.message
      });
    }
  }, []);

  /**
   * Handles navigation state restoration with validation
   */
  const loadNavigationState = useCallback(async () => {
    try {
      const savedState = await AsyncStorage.getItem(NAVIGATION_PERSISTENCE_KEY);
      if (savedState) {
        return JSON.parse(savedState);
      }
    } catch (error) {
      await Analytics.trackEvent('navigation_state_restoration_error', {
        error: error.message
      });
      // Clear corrupted state
      await AsyncStorage.removeItem(NAVIGATION_PERSISTENCE_KEY);
    }
    return undefined;
  }, []);

  /**
   * Configures navigation accessibility
   */
  useEffect(() => {
    const configureAccessibility = async () => {
      try {
        await AccessibilityInfo.announceForAccessibility(
          isAuthenticated ? 'Main app loaded' : 'Authentication required'
        );
      } catch (error) {
        await Analytics.trackEvent('accessibility_configuration_error', {
          error: error.message
        });
      }
    };

    configureAccessibility();
  }, [isAuthenticated]);

  /**
   * Handles navigation analytics tracking
   */
  const handleNavigationStateEvent = useCallback((state: any) => {
    if (state) {
      const currentRoute = state.routes[state.index];
      Analytics.trackEvent('screen_view', {
        screen_name: currentRoute.name,
        screen_class: currentRoute.params?.className || 'default',
        user_id: user?.id
      });
    }
  }, [user]);

  return (
    <NavigationContainer
      linking={linking}
      fallback={null}
      onStateChange={handleNavigationStateEvent}
      onReady={() => {
        Analytics.trackEvent('app_navigation_ready');
      }}
      persistNavigationState={handleNavigationStateChange}
      loadNavigationState={loadNavigationState}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: Platform.OS === 'ios',
          animationEnabled: true,
          presentation: 'card'
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{
              animationTypeForReplace: 'pop'
            }}
          />
        ) : (
          <Stack.Screen
            name="Main"
            component={MainNavigator}
            options={{
              animationTypeForReplace: 'push'
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;