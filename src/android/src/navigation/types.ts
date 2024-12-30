/**
 * @fileoverview Navigation type definitions for the AI-Enhanced Social Travel Platform
 * Core navigation structure supporting AI features, social interactions, and professional tools
 * @version 1.0.0
 */

import { NavigationProp, RouteProp } from '@react-navigation/native'; // ^6.0.0

/**
 * Root level navigation stack parameter list
 * Defines the main sections of the application
 */
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

/**
 * Authentication flow navigation parameter list
 * Supports comprehensive authentication options including OAuth, MFA, and social auth
 */
export type AuthStackParamList = {
  Login: {
    provider?: 'email' | 'google' | 'facebook';
  };
  Register: {
    userType: 'traveler' | 'professional' | 'corporate';
  };
  ForgotPassword: {
    email?: string;
  };
  MFAVerification: {
    userId: string;
    method: 'totp' | 'sms';
  };
};

/**
 * Main application navigation parameter list
 * Comprehensive route parameters for all main application features
 */
export type MainStackParamList = {
  Dashboard: {
    userType: 'traveler' | 'professional' | 'corporate';
  };
  Booking: {
    bookingId?: string;
    groupId?: string;
    splitPayment?: boolean;
  };
  Chat: {
    roomId: string;
    personaId?: string;
    isGroupChat?: boolean;
  };
  Persona: {
    personaId?: string;
    mode?: 'view' | 'edit' | 'create';
  };
  Profile: {
    section?: 'personal' | 'preferences' | 'payment' | 'security';
  };
  AgentManagement: {
    agentId?: string;
    view?: 'list' | 'create' | 'edit' | 'analytics';
  };
  Analytics: {
    period?: 'day' | 'week' | 'month' | 'year';
    type?: 'revenue' | 'engagement' | 'performance';
  };
  Consultation: {
    consultationId?: string;
    status?: 'scheduled' | 'active' | 'completed';
    mode?: 'video' | 'chat';
  };
  MarketPlace: {
    category?: string;
    filter?: Record<string, any>;
    sort?: string;
  };
};

/**
 * Type-safe navigation prop for root navigation
 */
export type RootNavigationProp = NavigationProp<RootStackParamList>;

/**
 * Type-safe navigation prop for authentication flow
 */
export type AuthNavigationProp = NavigationProp<AuthStackParamList>;

/**
 * Type-safe navigation prop for main application navigation
 */
export type MainNavigationProp = NavigationProp<MainStackParamList>;

/**
 * Type-safe route props for each navigation stack
 */
export type RootRouteProp<T extends keyof RootStackParamList> = RouteProp<
  RootStackParamList,
  T
>;

export type AuthRouteProp<T extends keyof AuthStackParamList> = RouteProp<
  AuthStackParamList,
  T
>;

export type MainRouteProp<T extends keyof MainStackParamList> = RouteProp<
  MainStackParamList,
  T
>;