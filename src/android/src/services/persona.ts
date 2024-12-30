/**
 * @fileoverview Service module for managing AI personas in the Android mobile app
 * Implements offline-first approach with real-time learning synchronization
 * @version 1.0.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage'; // ^1.19.0
import { get, post, put, del, ApiError } from './api';
import type { Persona, CreatePersonaDto, UpdatePersonaDto, PersonaState } from '../types/persona';
import { config } from '../config/development';

// API endpoints for persona management
const API_ENDPOINTS = {
  GET_PERSONAS: '/personas',
  GET_PERSONA: '/personas/:id',
  CREATE_PERSONA: '/personas',
  UPDATE_PERSONA: '/personas/:id',
  DELETE_PERSONA: '/personas/:id',
  SYNC_LEARNING: '/personas/:id/sync'
} as const;

// Cache keys for local storage
const CACHE_KEYS = {
  PERSONAS: '@personas',
  LEARNING_STATES: '@learning_states'
} as const;

/**
 * Service class for managing AI personas with offline support and real-time learning
 */
export class PersonaService {
  private _learningStates: Map<string, PersonaState>;
  private _syncInterval: NodeJS.Timeout | null;
  private readonly _maxPersonas: number;
  private readonly _syncIntervalMs: number;

  constructor() {
    this._learningStates = new Map();
    this._syncInterval = null;
    this._maxPersonas = config.PERSONA_CONFIG.MAX_PERSONAS;
    this._syncIntervalMs = config.PERSONA_CONFIG.MODEL_UPDATE_INTERVAL;
    this.initializeService();
  }

  /**
   * Initializes the service and sets up synchronization
   */
  private async initializeService(): Promise<void> {
    try {
      await this.loadCachedLearningStates();
      this.startSyncInterval();
    } catch (error) {
      console.error('Failed to initialize PersonaService:', error);
    }
  }

  /**
   * Retrieves all personas with offline support
   * @returns Promise<Persona[]> List of user's personas
   */
  public async getPersonas(): Promise<Persona[]> {
    try {
      // Try to fetch from API first
      const personas = await get<Persona[]>(API_ENDPOINTS.GET_PERSONAS);
      await this.cachePersonas(personas);
      return personas;
    } catch (error) {
      // Fall back to cached data if offline
      const cachedPersonas = await this.getCachedPersonas();
      if (cachedPersonas) {
        return cachedPersonas;
      }
      throw error;
    }
  }

  /**
   * Retrieves a specific persona by ID
   * @param id Persona identifier
   * @returns Promise<Persona> Persona details
   */
  public async getPersonaById(id: string): Promise<Persona> {
    try {
      const endpoint = API_ENDPOINTS.GET_PERSONA.replace(':id', id);
      const persona = await get<Persona>(endpoint);
      await this.updateCachedPersona(persona);
      return persona;
    } catch (error) {
      const cachedPersona = await this.getCachedPersonaById(id);
      if (cachedPersona) {
        return cachedPersona;
      }
      throw error;
    }
  }

  /**
   * Creates a new AI persona with limit validation
   * @param data CreatePersonaDto Creation data
   * @returns Promise<Persona> Created persona
   */
  public async createPersona(data: CreatePersonaDto): Promise<Persona> {
    const existingPersonas = await this.getPersonas();
    if (existingPersonas.length >= this._maxPersonas) {
      throw new ApiError(
        `Maximum number of personas (${this._maxPersonas}) reached`,
        400,
        'VALIDATION_ERROR'
      );
    }

    const persona = await post<Persona>(API_ENDPOINTS.CREATE_PERSONA, data);
    await this.updateCachedPersona(persona);
    this.initializeLearningState(persona.id);
    return persona;
  }

  /**
   * Updates an existing persona
   * @param id Persona identifier
   * @param data UpdatePersonaDto Update data
   * @returns Promise<Persona> Updated persona
   */
  public async updatePersona(id: string, data: UpdatePersonaDto): Promise<Persona> {
    const endpoint = API_ENDPOINTS.UPDATE_PERSONA.replace(':id', id);
    const persona = await put<Persona>(endpoint, data);
    await this.updateCachedPersona(persona);
    return persona;
  }

  /**
   * Deletes a persona
   * @param id Persona identifier
   * @returns Promise<void>
   */
  public async deletePersona(id: string): Promise<void> {
    const endpoint = API_ENDPOINTS.DELETE_PERSONA.replace(':id', id);
    await del(endpoint);
    await this.removeCachedPersona(id);
    this._learningStates.delete(id);
  }

  /**
   * Synchronizes persona learning state with backend
   * @param personaId Persona identifier
   * @returns Promise<void>
   */
  public async syncLearningState(personaId: string): Promise<void> {
    const learningState = this._learningStates.get(personaId);
    if (!learningState) return;

    try {
      const endpoint = API_ENDPOINTS.SYNC_LEARNING.replace(':id', personaId);
      await post(endpoint, {
        learningState,
        timestamp: Date.now()
      });
      learningState.lastSyncTimestamp = Date.now();
      this._learningStates.set(personaId, learningState);
      await this.cacheLearningStates();
    } catch (error) {
      console.error(`Failed to sync learning state for persona ${personaId}:`, error);
    }
  }

  /**
   * Updates learning state for a persona
   * @param personaId Persona identifier
   * @param update Partial<PersonaState> State update
   */
  public async updateLearningState(personaId: string, update: Partial<PersonaState>): Promise<void> {
    const currentState = this._learningStates.get(personaId) || this.initializeLearningState(personaId);
    const updatedState = {
      ...currentState,
      ...update,
      lastInteraction: new Date(),
      interactionCount: (currentState.interactionCount || 0) + 1
    };
    
    this._learningStates.set(personaId, updatedState);
    await this.cacheLearningStates();
  }

  /**
   * Initializes learning state for a new persona
   * @param personaId Persona identifier
   * @returns PersonaState Initial state
   */
  private initializeLearningState(personaId: string): PersonaState {
    const initialState: PersonaState = {
      adaptationLevel: 0,
      lastInteraction: new Date(),
      learningProgress: 0,
      interactionCount: 0,
      modelVersion: '1.0.0',
      lastSyncTimestamp: Date.now()
    };
    this._learningStates.set(personaId, initialState);
    return initialState;
  }

  /**
   * Starts the learning state synchronization interval
   */
  private startSyncInterval(): void {
    if (this._syncInterval) {
      clearInterval(this._syncInterval);
    }
    this._syncInterval = setInterval(async () => {
      for (const personaId of this._learningStates.keys()) {
        await this.syncLearningState(personaId);
      }
    }, this._syncIntervalMs);
  }

  /**
   * Caches personas in local storage
   * @param personas Persona[] Personas to cache
   */
  private async cachePersonas(personas: Persona[]): Promise<void> {
    await AsyncStorage.setItem(CACHE_KEYS.PERSONAS, JSON.stringify(personas));
  }

  /**
   * Retrieves cached personas
   * @returns Promise<Persona[]> Cached personas
   */
  private async getCachedPersonas(): Promise<Persona[] | null> {
    const cached = await AsyncStorage.getItem(CACHE_KEYS.PERSONAS);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * Updates a single cached persona
   * @param persona Persona Updated persona
   */
  private async updateCachedPersona(persona: Persona): Promise<void> {
    const personas = await this.getCachedPersonas() || [];
    const index = personas.findIndex(p => p.id === persona.id);
    if (index >= 0) {
      personas[index] = persona;
    } else {
      personas.push(persona);
    }
    await this.cachePersonas(personas);
  }

  /**
   * Retrieves a cached persona by ID
   * @param id string Persona identifier
   * @returns Promise<Persona> Cached persona
   */
  private async getCachedPersonaById(id: string): Promise<Persona | null> {
    const personas = await this.getCachedPersonas();
    return personas?.find(p => p.id === id) || null;
  }

  /**
   * Removes a persona from cache
   * @param id string Persona identifier
   */
  private async removeCachedPersona(id: string): Promise<void> {
    const personas = await this.getCachedPersonas();
    if (personas) {
      await this.cachePersonas(personas.filter(p => p.id !== id));
    }
  }

  /**
   * Caches learning states
   */
  private async cacheLearningStates(): Promise<void> {
    const states = Object.fromEntries(this._learningStates);
    await AsyncStorage.setItem(CACHE_KEYS.LEARNING_STATES, JSON.stringify(states));
  }

  /**
   * Loads cached learning states
   */
  private async loadCachedLearningStates(): Promise<void> {
    const cached = await AsyncStorage.getItem(CACHE_KEYS.LEARNING_STATES);
    if (cached) {
      const states = JSON.parse(cached);
      this._learningStates = new Map(Object.entries(states));
    }
  }

  /**
   * Cleanup method to be called when service is no longer needed
   */
  public dispose(): void {
    if (this._syncInterval) {
      clearInterval(this._syncInterval);
      this._syncInterval = null;
    }
  }
}

// Export singleton instance
export const personaService = new PersonaService();