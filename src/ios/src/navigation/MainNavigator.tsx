/**
 * @fileoverview Main navigation stack for authenticated users in the iOS mobile app
 * Implements navigation between core app screens with accessibility and analytics
 * @version 1.0.0
 * 
 * React Navigation Version: ^6.3.0
 */

import React, { useEffect, useCallback } from 'react';
import { Platform, AccessibilityInfo, Haptics } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme, useNavigationState } from '@react-navigation/native';
import type { MainStackParamList } from './types';

// Screen imports
import DashboardScreen from '../screens/DashboardScreen';
import BookingScreen from '../screens/BookingScreen';
import ChatScreen from '../screens/ChatScreen';
import PersonaScreen from '../screens/PersonaScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Analytics and error handling
import { ErrorCode, ErrorMetadata } from '../../../backend/shared/constants/error-codes';
import { trackScreenView, trackError } from '../utils/analytics';

const Stack = createStackNavigator<MainStackParamList>();

/**
 * Enhanced screen options with theme and accessibility support
 * Implements WCAG 2.1 Level AA compliance
 */
const screenOptions = () => {
  const { colors, dark } = useTheme();

  return {
    headerStyle: {
      backgroundColor: colors.background.primary,
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 0,
    },
    headerTitleStyle: {
      fontFamily: 'Roboto-Bold',
      fontSize: 18,
      color: colors.text.primary,
      accessibilityRole: 'header',
    },
    headerTintColor: colors.text.primary,
    cardStyle: { backgroundColor: colors.background.primary },
    gestureEnabled: Platform.OS === 'ios',
    gestureDirection: 'horizontal',
    animationEnabled: true,
    presentation: 'card',
    headerBackTitleVisible: false,
    headerLeftContainerStyle: {
      paddingLeft: 16,
    },
    headerRightContainerStyle: {
      paddingRight: 16,
    },
  };
};

/**
 * Custom hook for screen view tracking and navigation analytics
 * Implements comprehensive user journey tracking
 */
const useScreenTracking = () => {
  const navigationState = useNavigationState(state => state);

  const handleScreenFocus = useCallback((route: string) => {
    trackScreenView({
      screenName: route,
      timestamp: new Date().toISOString(),
    });
  }, []);

  const handleScreenBlur = useCallback((route: string) => {
    // Track screen exit analytics
  }, []);

  const handleStateChange = useCallback(() => {
    if (navigationState) {
      const currentRoute = navigationState.routes[navigationState.index];
      handleScreenFocus(currentRoute.name);
    }
  }, [navigationState, handleScreenFocus]);

  return {
    handleScreenFocus,
    handleScreenBlur,
    handleStateChange,
  };
};

/**
 * MainNavigator component implementing the main app navigation stack
 * Provides accessible navigation between core app screens
 */
const MainNavigator: React.FC = () => {
  const tracking = useScreenTracking();

  // Configure accessibility announcements
  useEffect(() => {
    const configureAccessibility = async () => {
      try {
        await AccessibilityInfo.announceForAccessibility('Main navigation loaded');
        if (Platform.OS === 'ios') {
          await Haptics.selectionAsync();
        }
      } catch (error) {
        trackError({
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to configure accessibility',
          error,
        });
      }
    };

    configureAccessibility();
  }, []);

  return (
    <Stack.Navigator
      initialRouteName="Dashboard"
      screenOptions={screenOptions}
      screenListeners={{
        focus: (e) => tracking.handleScreenFocus(e.target?.split('-')[0] || ''),
        blur: (e) => tracking.handleScreenBlur(e.target?.split('-')[0] || ''),
        state: tracking.handleStateChange,
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          accessibilityLabel: 'Dashboard Screen',
          accessibilityRole: 'header',
        }}
      />

      <Stack.Screen
        name="Booking"
        component={BookingScreen}
        options={{
          title: 'Booking Details',
          accessibilityLabel: 'Booking Details Screen',
          accessibilityRole: 'header',
        }}
      />

      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          title: 'Chat',
          accessibilityLabel: 'Chat Screen',
          accessibilityRole: 'header',
        }}
      />

      <Stack.Screen
        name="Persona"
        component={PersonaScreen}
        options={({ route }) => ({
          title: route.params?.mode === 'edit' ? 'Edit Persona' : 'Persona',
          accessibilityLabel: `Persona ${route.params?.mode === 'edit' ? 'Edit' : ''} Screen`,
          accessibilityRole: 'header',
        })}
      />

      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={({ route }) => ({
          title: route.params?.section 
            ? `Profile - ${route.params.section.charAt(0).toUpperCase() + route.params.section.slice(1)}`
            : 'Profile',
          accessibilityLabel: 'User Profile Screen',
          accessibilityRole: 'header',
        })}
      />
    </Stack.Navigator>
  );
};

export default MainNavigator;