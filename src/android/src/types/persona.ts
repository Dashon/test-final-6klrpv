/**
 * @fileoverview TypeScript definitions for AI personas in the Android mobile app
 * Supports real-time learning model integration and comprehensive persona management
 * @version 1.0.0
 */

/**
 * Available AI persona types for travel recommendations
 */
export enum PersonaType {
  EXPLORER = 'EXPLORER',
  LUXURY = 'LUXURY',
  ADVENTURE = 'ADVENTURE',
  BUDGET = 'BUDGET',
  CULTURAL = 'CULTURAL'
}

/**
 * Travel style options for persona preferences
 */
export enum TravelStyle {
  RELAXED = 'RELAXED',
  INTENSIVE = 'INTENSIVE',
  BALANCED = 'BALANCED'
}

/**
 * Accommodation type options
 */
export enum AccommodationType {
  HOTEL = 'HOTEL',
  RESORT = 'RESORT',
  APARTMENT = 'APARTMENT',
  HOSTEL = 'HOSTEL'
}

/**
 * Budget range type with currency support
 */
export type BudgetRange = {
  min: number;
  max: number;
  currency: string;
  preferredRange: number[];
};

/**
 * Interface for tracking persona learning state and model adaptation
 */
export interface PersonaState {
  /** Current adaptation level of the persona (0-1) */
  adaptationLevel: number;
  /** Timestamp of last user interaction */
  lastInteraction: Date;
  /** Learning progress indicator (0-1) */
  learningProgress: number;
  /** Total number of user interactions */
  interactionCount: number;
  /** Current ML model version */
  modelVersion: string;
  /** Last synchronization timestamp with backend */
  lastSyncTimestamp: number;
}

/**
 * Comprehensive persona preferences and settings
 */
export interface PersonaPreferences {
  /** Preferred travel destinations */
  destinations: string[];
  /** Preferred activities and experiences */
  activities: string[];
  /** Budget constraints and preferences */
  budget: BudgetRange;
  /** Travel style preferences */
  travelStyle: TravelStyle[];
  /** Accommodation preferences */
  accommodation: AccommodationType[];
  /** Seasonal preferences (month -> preference score) */
  seasonalPreferences: Record<string, number>;
  /** Dietary restrictions and preferences */
  dietaryRestrictions: string[];
}

/**
 * Main persona interface with comprehensive tracking and state management
 */
export interface Persona {
  /** Unique identifier for the persona */
  id: string;
  /** Associated user identifier */
  userId: string;
  /** Display name of the persona */
  name: string;
  /** Persona type category */
  type: PersonaType;
  /** Whether this is the currently active persona */
  isActive: boolean;
  /** Whether this is a paid/premium persona */
  isPaid: boolean;
  /** Current learning and adaptation state */
  state: PersonaState;
  /** Persona preferences and settings */
  preferences: PersonaPreferences;
  /** Current ML model version */
  modelVersion: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * DTO for creating new personas
 */
export type CreatePersonaDto = {
  /** Display name for the new persona */
  name: string;
  /** Persona type category */
  type: PersonaType;
  /** Initial preferences and settings */
  preferences: PersonaPreferences;
};

/**
 * DTO for updating existing personas with partial updates support
 */
export type UpdatePersonaDto = {
  /** Updated display name (optional) */
  name?: string;
  /** Partial preferences update */
  preferences?: Partial<PersonaPreferences>;
  /** Partial state update */
  state?: Partial<PersonaState>;
};