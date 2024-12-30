/**
 * @fileoverview Main navigation stack component for the Android app
 * Implements core navigation features with enhanced state management,
 * deep linking, analytics tracking, and accessibility support
 * @version 1.0.0
 */

import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack'; // ^6.3.0
import { useTheme, useNavigationContainerRef } from '@react-navigation/native'; // ^6.0.0
import analytics from '@react-native-firebase/analytics'; // ^18.0.0
import { Platform, StatusBar } from 'react-native';

import { MainStackParamList } from './types';

// Screen imports (to be implemented separately)
import DashboardScreen from '../screens/DashboardScreen';
import BookingScreen from '../screens/BookingScreen';
import ChatScreen from '../screens/ChatScreen';
import PersonaScreen from '../screens/PersonaScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createStackNavigator<MainStackParamList>();

/**
 * Custom hook for screen transition analytics tracking
 */
const useScreenTracking = () => {
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    const unsubscribe = navigationRef.addListener('state', async () => {
      const currentRoute = navigationRef.getCurrentRoute();
      if (currentRoute) {
        // Track screen view
        await analytics().logScreenView({
          screen_name: currentRoute.name,
          screen_class: currentRoute.name,
          params: currentRoute.params,
        });

        // Track additional navigation metrics
        await analytics().logEvent('screen_navigation', {
          route_name: currentRoute.name,
          timestamp: new Date().toISOString(),
        });
      }
    });

    return unsubscribe;
  }, [navigationRef]);

  return navigationRef;
};

/**
 * Enhanced screen options configuration
 */
const screenOptions = ({ route, navigation }) => {
  const theme = useTheme();

  return {
    headerStyle: {
      backgroundColor: theme.colors.card,
      elevation: Platform.OS === 'android' ? 4 : 0,
      shadowOpacity: Platform.OS === 'ios' ? 0.3 : 0,
    },
    headerTintColor: theme.colors.text,
    headerTitleStyle: {
      fontWeight: '600',
      fontSize: 18,
    },
    // Enhanced animations
    cardStyleInterpolator: ({ current, layouts }) => ({
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.width, 0],
            }),
          },
        ],
      },
    }),
    // Accessibility configurations
    headerAccessibilityLabel: `${route.name} Screen Header`,
    screenReaderInstructions: {
      hint: `Navigate through ${route.name} screen content`,
    },
    // Deep linking configuration
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
 * MainNavigator Component
 * Implements the main navigation stack with enhanced features
 */
const MainNavigator: React.FC = () => {
  const navigationRef = useScreenTracking();
  const theme = useTheme();

  // Configure status bar based on theme
  useEffect(() => {
    StatusBar.setBarStyle(theme.dark ? 'light-content' : 'dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(theme.colors.card);
    }
  }, [theme]);

  return (
    <Stack.Navigator
      ref={navigationRef}
      screenOptions={screenOptions}
      initialRouteName="Dashboard"
    >
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={({ route }) => ({
          headerTitle: `Dashboard - ${route.params?.userType || 'traveler'}`,
          headerAccessibilityLabel: 'Dashboard Screen',
        })}
      />

      <Stack.Screen
        name="Booking"
        component={BookingScreen}
        options={({ route }) => ({
          headerTitle: route.params?.bookingId 
            ? 'Booking Details' 
            : 'New Booking',
          headerAccessibilityLabel: 'Booking Screen',
        })}
      />

      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({
          headerTitle: route.params?.isGroupChat 
            ? 'Group Chat' 
            : 'Chat',
          headerAccessibilityLabel: 'Chat Screen',
        })}
      />

      <Stack.Screen
        name="Persona"
        component={PersonaScreen}
        options={({ route }) => ({
          headerTitle: route.params?.mode === 'create' 
            ? 'Create Persona' 
            : 'Persona Details',
          headerAccessibilityLabel: 'Persona Screen',
        })}
      />

      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={({ route }) => ({
          headerTitle: route.params?.section 
            ? `Profile - ${route.params.section}` 
            : 'Profile',
          headerAccessibilityLabel: 'Profile Screen',
        })}
      />
    </Stack.Navigator>
  );
};

export default MainNavigator;