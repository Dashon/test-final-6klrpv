/**
 * Persona Service Module
 * Version: 1.0.0
 * 
 * Enterprise-grade service for managing AI personas with real-time learning capabilities
 * and enhanced model version tracking.
 */

import { AxiosError, AxiosResponse } from 'axios'; // ^1.4.0
import {
  Persona,
  PersonaType,
  PersonaState,
  PersonaPreferences,
  MAX_PERSONAS_PER_USER,
  hasValidPreferences,
  needsTraining
} from '../types/persona';
import { makeRequest, handleApiError } from '../utils/api';
import { API_ENDPOINTS } from '../constants/api';

/**
 * Interface for creating a new persona with learning capabilities
 */
interface CreatePersonaDto {
  name: string;
  type: PersonaType;
  preferences: PersonaPreferences;
  modelVersion: string;
  initialLearningState: PersonaState;
}

/**
 * Interface for updating an existing persona
 */
interface UpdatePersonaDto {
  name: string;
  preferences: PersonaPreferences;
  isActive: boolean;
  learningProgress: PersonaState;
  modelVersion: string;
}

/**
 * Service class for managing AI personas with enhanced learning capabilities
 */
class PersonaService {
  /**
   * Retrieves all personas for the current user with validation
   * @returns Promise resolving to array of personas
   * @throws Error if user exceeds maximum persona limit
   */
  async getPersonas(): Promise<Persona[]> {
    try {
      const response = await makeRequest<Persona[]>({
        method: 'GET',
        endpoint: API_ENDPOINTS.persona.list,
        requiresAuth: true
      });

      if (response.length > MAX_PERSONAS_PER_USER) {
        throw new Error(`User cannot have more than ${MAX_PERSONAS_PER_USER} personas`);
      }

      return response.map(persona => ({
        ...persona,
        state: this.validateLearningState(persona.state)
      }));
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }

  /**
   * Retrieves a specific persona by ID with learning state
   * @param id - Persona identifier
   * @returns Promise resolving to persona details
   */
  async getPersonaById(id: string): Promise<Persona> {
    try {
      const response = await makeRequest<Persona>({
        method: 'GET',
        endpoint: API_ENDPOINTS.persona.details,
        params: { id },
        requiresAuth: true
      });

      return {
        ...response,
        state: this.validateLearningState(response.state)
      };
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }

  /**
   * Creates a new persona with initial learning state
   * @param personaData - Data for creating new persona
   * @returns Promise resolving to created persona
   */
  async createPersona(personaData: CreatePersonaDto): Promise<Persona> {
    try {
      // Validate preferences before creation
      if (!hasValidPreferences(personaData.preferences)) {
        throw new Error('Invalid persona preferences');
      }

      const response = await makeRequest<Persona>({
        method: 'POST',
        endpoint: API_ENDPOINTS.persona.create,
        data: {
          ...personaData,
          initialLearningState: this.initializeLearningState()
        },
        requiresAuth: true
      });

      return {
        ...response,
        state: this.validateLearningState(response.state)
      };
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }

  /**
   * Updates an existing persona with learning progress
   * @param id - Persona identifier
   * @param personaData - Updated persona data
   * @returns Promise resolving to updated persona
   */
  async updatePersona(id: string, personaData: UpdatePersonaDto): Promise<Persona> {
    try {
      // Validate model version compatibility
      await this.validateModelVersion(personaData.modelVersion);

      const response = await makeRequest<Persona>({
        method: 'PUT',
        endpoint: API_ENDPOINTS.persona.update,
        params: { id },
        data: personaData,
        requiresAuth: true
      });

      return {
        ...response,
        state: this.validateLearningState(response.state)
      };
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }

  /**
   * Updates persona preferences and triggers learning adaptation
   * @param id - Persona identifier
   * @param preferences - Updated preferences
   * @returns Promise resolving to updated persona
   */
  async updatePersonaPreferences(
    id: string,
    preferences: PersonaPreferences
  ): Promise<Persona> {
    try {
      if (!hasValidPreferences(preferences)) {
        throw new Error('Invalid persona preferences');
      }

      const response = await makeRequest<Persona>({
        method: 'PUT',
        endpoint: API_ENDPOINTS.persona.preferences,
        params: { id },
        data: { preferences },
        requiresAuth: true
      });

      // Trigger learning adaptation
      await this.triggerLearningAdaptation(id, preferences);

      return {
        ...response,
        state: this.validateLearningState(response.state)
      };
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }

  /**
   * Deletes a persona and its associated learning data
   * @param id - Persona identifier
   * @returns Promise resolving to void
   */
  async deletePersona(id: string): Promise<void> {
    try {
      await makeRequest({
        method: 'DELETE',
        endpoint: API_ENDPOINTS.persona.delete,
        params: { id },
        requiresAuth: true
      });
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }

  /**
   * Initializes default learning state for new personas
   * @private
   * @returns Initial learning state
   */
  private initializeLearningState(): PersonaState {
    return {
      adaptationLevel: 0,
      lastInteraction: new Date(),
      learningProgress: 0,
      interactionCount: 0,
      confidenceScore: 0.5,
      specializations: []
    };
  }

  /**
   * Validates and normalizes learning state
   * @private
   * @param state - Current learning state
   * @returns Validated learning state
   */
  private validateLearningState(state: PersonaState): PersonaState {
    return {
      ...state,
      adaptationLevel: Math.max(0, Math.min(100, state.adaptationLevel)),
      learningProgress: Math.max(0, Math.min(100, state.learningProgress)),
      confidenceScore: Math.max(0, Math.min(1, state.confidenceScore || 0.5))
    };
  }

  /**
   * Validates ML model version compatibility
   * @private
   * @param version - Model version to validate
   * @returns Promise resolving to boolean
   */
  private async validateModelVersion(version: string): Promise<boolean> {
    try {
      const response = await makeRequest<{ compatible: boolean }>({
        method: 'POST',
        endpoint: API_ENDPOINTS.persona.learning,
        data: { version },
        requiresAuth: true
      });
      return response.compatible;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }

  /**
   * Triggers learning adaptation based on new preferences
   * @private
   * @param id - Persona identifier
   * @param preferences - Updated preferences
   */
  private async triggerLearningAdaptation(
    id: string,
    preferences: PersonaPreferences
  ): Promise<void> {
    try {
      await makeRequest({
        method: 'POST',
        endpoint: API_ENDPOINTS.persona.interactions,
        params: { id },
        data: {
          type: 'PREFERENCE_UPDATE',
          preferences,
          timestamp: new Date()
        },
        requiresAuth: true
      });
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }
}

// Export singleton instance
export const personaService = new PersonaService();