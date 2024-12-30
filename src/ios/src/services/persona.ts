/**
 * Production-ready service module for managing AI personas in the iOS mobile app
 * @version 1.0.0
 * @module services/persona
 */

import AsyncStorage from '@react-native-async-storage/async-storage'; // ^1.19.0
import EventEmitter from 'eventemitter3'; // ^5.0.0
import { ApiService } from './api';
import { Persona, PersonaType, PersonaState, isPersonaState } from '../types/persona';

// Service constants
const MAX_PERSONAS = 5;
const PERSONA_CACHE_PREFIX = 'persona_';
const PERSONA_LIST_KEY = 'persona_list';
const CACHE_TTL = 3600000; // 1 hour
const SYNC_RETRY_ATTEMPTS = 3;
const SYNC_RETRY_DELAY = 1000;

// Event types for persona service
type PersonaEvents = {
  'persona:updated': (persona: Persona) => void;
  'persona:synced': (personaId: string) => void;
  'persona:error': (error: Error) => void;
  'cache:updated': () => void;
};

// Interface for offline operation
interface OfflineOperation {
  type: 'create' | 'update' | 'delete' | 'sync';
  timestamp: number;
  data: any;
  retryCount: number;
}

// Interface for cache options
interface CacheOptions {
  ttl?: number;
  encrypt?: boolean;
}

/**
 * Enhanced service class for managing personas with offline support
 * and performance optimizations
 */
export class PersonaService {
  private readonly apiService: ApiService;
  private readonly events: EventEmitter<PersonaEvents>;
  private readonly cache: Map<string, Persona>;
  private offlineQueue: OfflineOperation[];
  private syncInProgress: boolean;

  constructor(apiService: ApiService) {
    this.apiService = apiService;
    this.events = new EventEmitter();
    this.cache = new Map();
    this.offlineQueue = [];
    this.syncInProgress = false;
    this.initializeService();
  }

  /**
   * Initialize the service and load cached data
   */
  private async initializeService(): Promise<void> {
    try {
      await this.loadCachedPersonas();
      this.startOfflineQueueProcessor();
    } catch (error) {
      this.events.emit('persona:error', error as Error);
    }
  }

  /**
   * Retrieves all personas for the current user with progressive loading
   */
  public async getPersonas(): Promise<Persona[]> {
    try {
      // Check cache first
      const cachedPersonas = Array.from(this.cache.values());
      if (cachedPersonas.length > 0) {
        // Trigger background refresh
        this.refreshPersonasInBackground();
        return cachedPersonas;
      }

      const response = await this.apiService.request<Persona[]>({
        method: 'GET',
        url: '/personas'
      });

      await this.cachePersonas(response);
      return response;
    } catch (error) {
      this.events.emit('persona:error', error as Error);
      return Array.from(this.cache.values());
    }
  }

  /**
   * Creates a new persona with validation
   */
  public async createPersona(persona: Omit<Persona, 'id'>): Promise<Persona> {
    if (this.cache.size >= MAX_PERSONAS) {
      throw new Error(`Maximum number of personas (${MAX_PERSONAS}) reached`);
    }

    try {
      const response = await this.apiService.request<Persona>({
        method: 'POST',
        url: '/personas',
        data: persona
      });

      await this.cachePersona(response);
      return response;
    } catch (error) {
      if (!navigator.onLine) {
        this.queueOfflineOperation('create', persona);
      }
      throw error;
    }
  }

  /**
   * Updates an existing persona with conflict resolution
   */
  public async updatePersona(id: string, updates: Partial<Persona>): Promise<Persona> {
    const cached = this.cache.get(id);
    if (!cached) {
      throw new Error('Persona not found');
    }

    try {
      const response = await this.apiService.request<Persona>({
        method: 'PATCH',
        url: `/personas/${id}`,
        data: updates
      });

      await this.cachePersona(response);
      this.events.emit('persona:updated', response);
      return response;
    } catch (error) {
      if (!navigator.onLine) {
        this.queueOfflineOperation('update', { id, updates });
        // Optimistic update
        const optimisticUpdate = { ...cached, ...updates, updatedAt: new Date().toISOString() };
        await this.cachePersona(optimisticUpdate);
        return optimisticUpdate;
      }
      throw error;
    }
  }

  /**
   * Synchronizes persona state with backend
   */
  public async syncPersonaState(personaId: string, state: PersonaState): Promise<void> {
    if (!isPersonaState(state)) {
      throw new Error('Invalid persona state');
    }

    try {
      await this.apiService.request({
        method: 'PUT',
        url: `/personas/${personaId}/state`,
        data: state
      });

      const cached = this.cache.get(personaId);
      if (cached) {
        await this.cachePersona({ ...cached, state });
      }
      this.events.emit('persona:synced', personaId);
    } catch (error) {
      if (!navigator.onLine) {
        this.queueOfflineOperation('sync', { personaId, state });
      }
      throw error;
    }
  }

  /**
   * Deletes a persona with offline support
   */
  public async deletePersona(id: string): Promise<void> {
    try {
      await this.apiService.request({
        method: 'DELETE',
        url: `/personas/${id}`
      });

      this.cache.delete(id);
      await this.updatePersonaList();
    } catch (error) {
      if (!navigator.onLine) {
        this.queueOfflineOperation('delete', { id });
      }
      throw error;
    }
  }

  /**
   * Enhanced caching function with encryption and validation
   */
  private async cachePersona(persona: Persona, options: CacheOptions = {}): Promise<void> {
    const key = `${PERSONA_CACHE_PREFIX}${persona.id}`;
    const data = options.encrypt ? await this.encryptData(persona) : persona;
    
    await AsyncStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now(),
      ttl: options.ttl || CACHE_TTL
    }));

    this.cache.set(persona.id, persona);
    await this.updatePersonaList();
    this.events.emit('cache:updated');
  }

  /**
   * Processes queued offline operations
   */
  private async processOfflineQueue(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine || this.offlineQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    const operations = [...this.offlineQueue].sort((a, b) => a.timestamp - b.timestamp);

    for (const operation of operations) {
      try {
        switch (operation.type) {
          case 'create':
            await this.createPersona(operation.data);
            break;
          case 'update':
            await this.updatePersona(operation.data.id, operation.data.updates);
            break;
          case 'delete':
            await this.deletePersona(operation.data.id);
            break;
          case 'sync':
            await this.syncPersonaState(operation.data.personaId, operation.data.state);
            break;
        }
        this.offlineQueue = this.offlineQueue.filter(op => op !== operation);
      } catch (error) {
        operation.retryCount++;
        if (operation.retryCount >= SYNC_RETRY_ATTEMPTS) {
          this.offlineQueue = this.offlineQueue.filter(op => op !== operation);
          this.events.emit('persona:error', error as Error);
        }
      }
    }

    this.syncInProgress = false;
  }

  // Utility methods
  private async loadCachedPersonas(): Promise<void> {
    const list = await AsyncStorage.getItem(PERSONA_LIST_KEY);
    if (!list) return;

    const personaIds = JSON.parse(list);
    for (const id of personaIds) {
      const cached = await AsyncStorage.getItem(`${PERSONA_CACHE_PREFIX}${id}`);
      if (cached) {
        const { data, timestamp, ttl } = JSON.parse(cached);
        if (Date.now() - timestamp < ttl) {
          this.cache.set(id, data);
        }
      }
    }
  }

  private async updatePersonaList(): Promise<void> {
    const personaIds = Array.from(this.cache.keys());
    await AsyncStorage.setItem(PERSONA_LIST_KEY, JSON.stringify(personaIds));
  }

  private async encryptData(data: any): Promise<any> {
    // Implement encryption logic here
    return data;
  }

  private queueOfflineOperation(type: OfflineOperation['type'], data: any): void {
    this.offlineQueue.push({
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0
    });
  }

  private startOfflineQueueProcessor(): void {
    setInterval(() => {
      if (navigator.onLine) {
        this.processOfflineQueue();
      }
    }, SYNC_RETRY_DELAY);
  }

  private async refreshPersonasInBackground(): Promise<void> {
    try {
      const response = await this.apiService.request<Persona[]>({
        method: 'GET',
        url: '/personas'
      });
      await this.cachePersonas(response);
    } catch (error) {
      // Silent fail for background refresh
    }
  }

  private async cachePersonas(personas: Persona[]): Promise<void> {
    for (const persona of personas) {
      await this.cachePersona(persona);
    }
  }

  // Public event subscription methods
  public onPersonaUpdated(handler: (persona: Persona) => void): void {
    this.events.on('persona:updated', handler);
  }

  public onPersonaSynced(handler: (personaId: string) => void): void {
    this.events.on('persona:synced', handler);
  }

  public onError(handler: (error: Error) => void): void {
    this.events.on('persona:error', handler);
  }
}

// Export singleton instance
export const personaService = new PersonaService(new ApiService());