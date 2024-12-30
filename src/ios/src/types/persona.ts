/**
 * @fileoverview TypeScript type definitions for AI personas in the iOS mobile app.
 * Ensures type safety and consistency with backend persona data structures.
 * @version 1.0.0
 */

/**
 * Available persona types representing different travel styles and preferences.
 * Limited to 5 types as per technical specifications.
 */
export enum PersonaType {
    EXPLORER = 'EXPLORER',
    LUXURY = 'LUXURY',
    ADVENTURE = 'ADVENTURE',
    BUDGET = 'BUDGET',
    CULTURAL = 'CULTURAL'
}

/**
 * Budget range type for persona preferences
 */
export type BudgetRange = {
    readonly min: number;
    readonly max: number;
    readonly currency: string;
};

/**
 * Travel style options for persona preferences
 */
export type TravelStyle = 
    | 'SOLO' 
    | 'COUPLE' 
    | 'FAMILY' 
    | 'GROUP' 
    | 'BUSINESS';

/**
 * Accommodation types for persona preferences
 */
export type AccommodationType = 
    | 'HOTEL' 
    | 'RESORT' 
    | 'HOSTEL' 
    | 'APARTMENT' 
    | 'BOUTIQUE' 
    | 'VILLA';

/**
 * Interface tracking persona learning state and adaptation metrics
 * Implements real-time learning and adaptation state tracking
 */
export interface PersonaState {
    /** Learning adaptation level (0-100) */
    adaptationLevel: number;
    /** ISO timestamp of last interaction */
    lastInteraction: string;
    /** Learning progress percentage (0-100) */
    learningProgress: number;
    /** Total number of interactions with users */
    interactionCount: number;
    /** AI confidence score in recommendations (0-1) */
    confidenceScore: number;
    /** ISO timestamp of last model training */
    lastTrainingDate: string;
}

/**
 * Interface defining comprehensive persona travel preferences
 * Uses immutable arrays to prevent accidental modifications
 */
export interface PersonaPreferences {
    /** Preferred travel destinations */
    readonly destinations: readonly string[];
    /** Preferred travel activities */
    readonly activities: readonly string[];
    /** Budget constraints */
    budget: BudgetRange;
    /** Travel style preferences */
    readonly travelStyle: readonly TravelStyle[];
    /** Accommodation preferences */
    readonly accommodation: readonly AccommodationType[];
    /** Seasonal preference scores (0-1) keyed by season */
    seasonalPreferences: Record<string, number>;
    /** Dietary restrictions and preferences */
    readonly dietaryRestrictions: readonly string[];
}

/**
 * Main persona interface with comprehensive type safety
 * Implements multiple persona management requirements with strict typing
 */
export interface Persona {
    /** Unique identifier for the persona */
    readonly id: string;
    /** Associated user identifier */
    readonly userId: string;
    /** Display name for the persona */
    name: string;
    /** Persona type classification */
    type: PersonaType;
    /** Whether this persona is currently active */
    isActive: boolean;
    /** Whether this is a paid/premium persona */
    isPaid: boolean;
    /** Current learning and adaptation state */
    state: PersonaState;
    /** Persona preferences and settings */
    preferences: PersonaPreferences;
    /** AI model version used by this persona */
    readonly modelVersion: string;
    /** ISO timestamp of persona creation */
    readonly createdAt: string;
    /** ISO timestamp of last update */
    updatedAt: string;
}

/**
 * Type guard to check if a value is a valid PersonaType
 */
export const isPersonaType = (value: any): value is PersonaType => {
    return Object.values(PersonaType).includes(value as PersonaType);
};

/**
 * Type guard to check if a value is a valid BudgetRange
 */
export const isBudgetRange = (value: any): value is BudgetRange => {
    return (
        typeof value === 'object' &&
        typeof value.min === 'number' &&
        typeof value.max === 'number' &&
        typeof value.currency === 'string' &&
        value.min <= value.max
    );
};

/**
 * Type guard to check if a value is a valid PersonaState
 */
export const isPersonaState = (value: any): value is PersonaState => {
    return (
        typeof value === 'object' &&
        typeof value.adaptationLevel === 'number' &&
        typeof value.lastInteraction === 'string' &&
        typeof value.learningProgress === 'number' &&
        typeof value.interactionCount === 'number' &&
        typeof value.confidenceScore === 'number' &&
        typeof value.lastTrainingDate === 'string' &&
        value.adaptationLevel >= 0 &&
        value.adaptationLevel <= 100 &&
        value.learningProgress >= 0 &&
        value.learningProgress <= 100 &&
        value.confidenceScore >= 0 &&
        value.confidenceScore <= 1
    );
};