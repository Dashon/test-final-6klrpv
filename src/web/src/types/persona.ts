/**
 * @fileoverview TypeScript definitions for AI personas with real-time learning capabilities
 * @module web/types/persona
 * @version 1.0.0
 */

import { User } from '../types/auth';

/**
 * Available AI persona types with distinct characteristics
 */
export enum PersonaType {
  EXPLORER = 'EXPLORER',     // Balanced discovery-focused persona
  LUXURY = 'LUXURY',         // High-end travel preferences
  ADVENTURE = 'ADVENTURE',   // Activity and thrill-seeking focused
  BUDGET = 'BUDGET',         // Cost-conscious travel planning
  CULTURAL = 'CULTURAL'      // Cultural immersion and local experiences
}

/**
 * Real-time learning and adaptation state tracking
 */
export interface PersonaState {
  /** Learning model adaptation level (0-100) */
  adaptationLevel: number;
  /** Timestamp of last user interaction */
  lastInteraction: Date;
  /** Overall learning progress (0-100) */
  learningProgress: number;
  /** Total number of meaningful interactions */
  interactionCount: number;
  /** Confidence score in recommendations (0-1) */
  confidenceScore?: number;
  /** Specialized areas of knowledge */
  specializations?: string[];
}

/**
 * Budget range definition with currency support
 */
export interface BudgetRange {
  /** Minimum budget amount */
  min: number;
  /** Maximum budget amount */
  max: number;
  /** ISO currency code */
  currency: string;
}

/**
 * Travel style preferences enumeration
 */
export enum TravelStyle {
  RELAXED = 'RELAXED',     // Slower-paced, comfort-focused
  INTENSIVE = 'INTENSIVE', // Fast-paced, activity-packed
  BALANCED = 'BALANCED'    // Mix of activities and relaxation
}

/**
 * Accommodation type preferences
 */
export enum AccommodationType {
  HOTEL = 'HOTEL',         // Traditional hotel stays
  RESORT = 'RESORT',       // All-inclusive resorts
  APARTMENT = 'APARTMENT', // Vacation rentals/apartments
  HOSTEL = 'HOSTEL'       // Budget-friendly hostels
}

/**
 * Comprehensive persona preferences configuration
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
  /** Dietary restrictions/preferences */
  dietaryRestrictions?: string[];
  /** Preferred transportation modes */
  transportation?: string[];
  /** Language preferences */
  languages?: string[];
  /** Accessibility requirements */
  accessibility?: {
    mobilityNeeds?: boolean;
    dietaryNeeds?: boolean;
    visualNeeds?: boolean;
    audioNeeds?: boolean;
  };
}

/**
 * Main persona interface with complete learning capabilities
 */
export interface Persona {
  /** Unique identifier */
  id: string;
  /** Associated user ID */
  userId: string;
  /** Display name */
  name: string;
  /** Persona type */
  type: PersonaType;
  /** Active status */
  isActive: boolean;
  /** Premium/paid status */
  isPaid: boolean;
  /** Learning and adaptation state */
  state: PersonaState;
  /** Travel preferences */
  preferences: PersonaPreferences;
  /** ML model version */
  modelVersion: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Interaction history summary */
  interactionSummary?: {
    successfulRecommendations: number;
    bookingsInitiated: number;
    userFeedbackScore: number;
  };
  /** Specialized capabilities */
  capabilities?: string[];
}

/**
 * Type guard to check if persona is premium
 */
export const isPremiumPersona = (persona: Persona): boolean => {
  return persona.isPaid && persona.state.adaptationLevel >= 50;
};

/**
 * Type guard to check if persona needs training
 */
export const needsTraining = (persona: Persona): boolean => {
  const TRAINING_THRESHOLD = 20;
  return persona.state.interactionCount < TRAINING_THRESHOLD || 
         persona.state.adaptationLevel < 30;
};

/**
 * Type guard to validate persona preferences
 */
export const hasValidPreferences = (preferences: PersonaPreferences): boolean => {
  return preferences.destinations.length > 0 &&
         preferences.activities.length > 0 &&
         preferences.travelStyle.length > 0 &&
         preferences.accommodation.length > 0;
};

/**
 * Maximum number of personas per user
 * @constant
 */
export const MAX_PERSONAS_PER_USER = 5;

/**
 * Minimum interaction threshold for reliable recommendations
 * @constant
 */
export const MIN_INTERACTIONS_FOR_RECOMMENDATIONS = 10;