/**
 * Authentication Navigation Stack for iOS
 * Implements secure navigation between authentication screens with iOS-specific
 * transitions and accessibility support
 * @version 1.0.0
 */

import React from 'react';
import { Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';

// Import authentication screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import { AuthStackParamList } from './types';

// Create authentication stack navigator
const Stack = createStackNavigator<AuthStackParamList>();

/**
 * Authentication navigator component implementing OAuth 2.0 flow
 * with enhanced iOS-specific patterns and transitions
 */
const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        // Global screen options
        headerShown: false,
        cardStyle: { backgroundColor: 'white' },
        presentation: Platform.select({
          ios: 'card',
          default: 'transparentModal',
        }),
        // Enable iOS-specific gestures and animations
        gestureEnabled: Platform.OS === 'ios',
        gestureResponseDistance: 30,
        cardOverlayEnabled: true,
        animationEnabled: true,
        // Accessibility configurations
        screenReaderEnabled: true,
        accessibilityViewIsModal: true,
      }}
    >
      {/* Login Screen - Initial route */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          animationTypeForReplace: 'push',
          gestureDirection: 'horizontal',
        }}
      />

      {/* Registration Screen */}
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          presentation: Platform.select({
            ios: 'formSheet',
            default: 'card',
          }),
          gestureDirection: 'horizontal',
          cardStyleInterpolator: Platform.select({
            ios: undefined, // Use default iOS animation
            default: ({ current, layouts }) => ({
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
          }),
        }}
      />

      {/* Forgot Password Screen */}
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          presentation: Platform.select({
            ios: 'formSheet',
            default: 'transparentModal',
          }),
          gestureDirection: 'vertical',
          cardStyleInterpolator: Platform.select({
            ios: undefined, // Use default iOS animation
            default: ({ current, layouts }) => ({
              cardStyle: {
                transform: [
                  {
                    translateY: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.height, 0],
                    }),
                  },
                ],
              },
              overlayStyle: {
                opacity: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.5],
                }),
              },
            }),
          }),
        }}
      />
    </Stack.Navigator>
  );
};

/**
 * Type guard to check if a route name is a valid auth route
 */
export const isAuthRoute = (routeName: string): routeName is keyof AuthStackParamList => {
  return ['Login', 'Register', 'ForgotPassword'].includes(routeName);
};

export default AuthNavigator;