/**
 * @fileoverview Navigation type definitions for the iOS mobile app
 * Provides type safety for navigation stacks, route parameters, and screen props
 * @version 1.0.0
 * 
 * React Navigation Version: ^6.1.0
 */

import { NavigationProp, RouteProp } from '@react-navigation/native';
import { User } from '../types/auth';
import { Booking } from '../types/booking';
import { ChatRoom } from '../types/chat';
import { Persona } from '../types/persona';

/**
 * Root navigation stack parameter list
 * Defines the main navigation flows based on user authentication and role
 */
export interface RootStackParamList {
  /** Authentication flow screens */
  Auth: undefined;
  /** Main app flow screens */
  Main: undefined;
  /** Professional user flow screens */
  Professional: undefined;
}

/**
 * Authentication flow navigation parameters
 * Supports deep linking and referral flows
 */
export interface AuthStackParamList {
  /** Login screen */
  Login: undefined;
  /** Registration screen with optional referral */
  Register: {
    referralCode?: string;
  };
  /** Password recovery with optional pre-filled email */
  ForgotPassword: {
    email?: string;
  };
}

/**
 * Main app navigation parameters
 * Comprehensive type safety for all user flows
 */
export interface MainStackParamList {
  /** Main dashboard screen */
  Dashboard: undefined;

  /** Booking management screen */
  Booking: {
    /** Optional booking ID for viewing/editing existing booking */
    bookingId?: string;
    /** Screen mode for viewing or editing */
    mode?: 'view' | 'edit';
  };

  /** Chat interface screen */
  Chat: {
    /** Optional room ID for existing chats */
    roomId?: string;
    /** Optional persona ID for AI-assisted chats */
    personaId?: string;
  };

  /** Persona management screen */
  Persona: {
    /** Optional persona ID for editing */
    personaId?: string;
    /** Action to perform on the persona */
    action?: 'create' | 'edit';
  };

  /** User profile screen */
  Profile: {
    /** Optional section to display */
    section?: 'personal' | 'preferences' | 'payment';
  };
}

/**
 * Professional user navigation parameters
 * Extended functionality for professional users
 */
export interface ProfessionalStackParamList {
  /** AI agent management screen */
  AgentManagement: {
    /** Optional agent ID for specific agent */
    agentId?: string;
    /** View mode for the screen */
    view?: 'list' | 'detail' | 'edit';
  };

  /** Analytics dashboard screen */
  Analytics: {
    /** Time period for analytics */
    period?: 'day' | 'week' | 'month' | 'year';
    /** Specific metric to display */
    metric?: string;
  };

  /** Consultation management screen */
  Consultation: {
    /** Optional session ID */
    sessionId?: string;
    /** Session status filter */
    status?: 'upcoming' | 'active' | 'completed';
  };
}

/**
 * Type-safe navigation props for components
 * Provides IntelliSense support for navigation actions
 */
export type NavigationProps<T extends keyof RootStackParamList> = {
  navigation: NavigationProp<RootStackParamList, T>;
};

/**
 * Type-safe route props for screens
 * Ensures type safety for route parameters
 */
export type RouteProps<T extends keyof RootStackParamList> = {
  route: RouteProp<RootStackParamList, T>;
};

/**
 * Combined props type for screens
 * Includes both navigation and route props
 */
export type ScreenProps<T extends keyof RootStackParamList> = 
  NavigationProps<T> & RouteProps<T>;

/**
 * Type guard to check if user can access professional routes
 */
export const canAccessProfessionalRoutes = (user: User): boolean => {
  return user.role === 'PROFESSIONAL' || user.role === 'ADMIN';
};

/**
 * Type guard to check if booking is editable
 */
export const isBookingEditable = (booking: Booking): boolean => {
  return booking.status === 'PENDING' || booking.status === 'CONFIRMED';
};

/**
 * Type guard to check if chat room is accessible
 */
export const isChatRoomAccessible = (room: ChatRoom, user: User): boolean => {
  return room.participants.some(p => p.userId === user.id);
};

/**
 * Type guard to check if persona is manageable
 */
export const isPersonaManageable = (persona: Persona, user: User): boolean => {
  return persona.userId === user.id;
};