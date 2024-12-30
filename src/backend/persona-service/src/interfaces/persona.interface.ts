/**
 * @fileoverview Core interfaces and types for AI personas in the travel platform
 * @module persona-service/interfaces/persona
 * @version 1.0.0
 */

import { BaseEntity } from '../../../shared/interfaces/base.interface';

/**
 * Enumeration of available persona types for travel preferences
 * Each type represents a distinct travel personality with specific characteristics
 */
export enum PersonaType {
  EXPLORER = 'EXPLORER',     // Seeks new destinations and experiences
  LUXURY = 'LUXURY',         // Prefers high-end accommodations and services
  ADVENTURE = 'ADVENTURE',   // Focuses on outdoor and active experiences
  BUDGET = 'BUDGET',        // Optimizes for cost-effective travel
  CULTURAL = 'CULTURAL'     // Prioritizes local customs and heritage
}

/**
 * Interface tracking the learning state and adaptation metrics of a persona
 * Monitors ML model performance and interaction patterns
 */
export interface PersonaState {
  /** Current level of persona adaptation (0-1) */
  adaptationLevel: number;
  
  /** Timestamp of last user interaction */
  lastInteraction: Date;
  
  /** Progress in learning user preferences (0-1) */
  learningProgress: number;
  
  /** Total number of meaningful interactions */
  interactionCount: number;
  
  /** ML model confidence score (0-1) */
  modelConfidence: number;
  
  /** Last ML model training update timestamp */
  lastTrainingUpdate: Date;
}

/**
 * Interface defining comprehensive travel preferences for a persona
 * Used for personalized recommendations and filtering
 */
export interface PersonaPreferences {
  /** Preferred or frequently visited destinations */
  destinations: string[];
  
  /** Preferred travel activities and experiences */
  activities: string[];
  
  /** Budget constraints and flexibility */
  budget: BudgetRange;
  
  /** Travel pace and style preferences */
  travelStyle: TravelStyle[];
  
  /** Preferred accommodation types */
  accommodation: AccommodationType[];
  
  /** Seasonal travel preferences (month -> preference score) */
  seasonalPreferences: Record<string, number>;
  
  /** Dietary restrictions and preferences */
  dietaryRestrictions: string[];
}

/**
 * Main persona interface extending BaseEntity
 * Represents an AI travel persona with learning capabilities
 */
export interface IPersona extends BaseEntity {
  /** Reference to the owning user */
  userId: string;
  
  /** Display name for the persona */
  name: string;
  
  /** Persona category/type */
  type: PersonaType;
  
  /** Indicates if this is the currently active persona */
  isActive: boolean;
  
  /** Indicates if this is a premium/paid persona */
  isPaid: boolean;
  
  /** Current learning state and metrics */
  state: PersonaState;
  
  /** Travel preferences and settings */
  preferences: PersonaPreferences;
  
  /** Current ML model version identifier */
  modelVersion: string;
  
  /** Last synchronization timestamp with ML service */
  lastSyncTimestamp: Date;
}

/**
 * Type defining budget range with flexibility
 * Used for price-based filtering and recommendations
 */
export type BudgetRange = {
  /** Minimum budget amount */
  min: number;
  
  /** Maximum budget amount */
  max: number;
  
  /** Currency code (ISO 4217) */
  currency: string;
  
  /** Budget flexibility factor (0-1) */
  flexibility: number;
};

/**
 * Enumeration of travel style options
 * Defines the pace and intensity of travel experiences
 */
export enum TravelStyle {
  RELAXED = 'RELAXED',     // Slower-paced, leisurely travel
  INTENSIVE = 'INTENSIVE', // Fast-paced, packed itineraries
  BALANCED = 'BALANCED'    // Mix of activities and relaxation
}

/**
 * Enumeration of accommodation types
 * Comprehensive list of lodging options
 */
export enum AccommodationType {
  HOTEL = 'HOTEL',         // Traditional hotels
  RESORT = 'RESORT',       // All-inclusive resorts
  APARTMENT = 'APARTMENT', // Serviced apartments
  HOSTEL = 'HOSTEL',       // Budget-friendly hostels
  VILLA = 'VILLA',         // Luxury villas
  BOUTIQUE = 'BOUTIQUE'    // Boutique hotels
}