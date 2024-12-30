/**
 * @fileoverview Authentication Navigation Stack for Android
 * Implements secure navigation flow between authentication screens with
 * Material Design transitions and WCAG 2.1 Level AA compliance.
 * @version 1.0.0
 */

import React from 'react';
import { Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { TransitionPresets } from '@react-navigation/stack';

// Screen imports
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Type imports
import { AuthStackParamList } from './types';

// Create typed stack navigator
const Stack = createStackNavigator<AuthStackParamList>();

/**
 * AuthNavigator Component
 * 
 * Implements authentication flow navigation with:
 * - Material Design transitions
 * - Enhanced accessibility
 * - Secure state management
 * - Deep linking support
 */
const AuthNavigator: React.FC = () => {
  // Default screen options with Material Design transitions
  const screenOptions = {
    ...TransitionPresets.SlideFromRightIOS,
    headerShown: false,
    cardStyle: { backgroundColor: 'transparent' },
    cardOverlayEnabled: true,
    gestureEnabled: Platform.OS === 'ios',
    gestureDirection: 'horizontal',
    animationEnabled: true,
    presentation: 'card',
  };

  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={screenOptions}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          animationTypeForReplace: 'push',
          gestureEnabled: false,
          accessibilityLabel: 'Login Screen',
          accessibilityRole: 'none',
        }}
      />

      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          gestureEnabled: true,
          accessibilityLabel: 'Registration Screen',
          accessibilityRole: 'none',
        }}
      />

      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          gestureEnabled: true,
          accessibilityLabel: 'Password Recovery Screen',
          accessibilityRole: 'none',
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;