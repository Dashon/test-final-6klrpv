/**
 * @fileoverview Custom React hook for managing AI personas with offline support
 * Provides comprehensive persona state management and real-time learning adaptations
 * @version 1.0.0
 */

import { useDispatch, useSelector } from 'react-redux'; // ^8.1.0
import { useCallback, useEffect } from 'react'; // ^18.2.0
import AsyncStorage from '@react-native-async-storage/async-storage'; // ^1.19.0

import { Persona, PersonaType, CreatePersonaDto, UpdatePersonaDto } from '../types/persona';
import {
  fetchPersonas,
  createPersona,
  updatePersona,
  deletePersona,
  processInteraction,
  syncLearningState,
  selectPersonas,
  selectActivePersona,
  setActivePersona
} from '../store/slices/personaSlice';
import { config } from '../config/development';
import { ErrorCode } from '../../../backend/shared/constants/error-codes';

// Constants
const PERSONA_STORAGE_KEY = '@personas_cache';
const SYNC_INTERVAL = config.PERSONA_CONFIG.MODEL_UPDATE_INTERVAL;
const MAX_PERSONAS = config.PERSONA_CONFIG.MAX_PERSONAS;

// Types
type Result<T> = {
  data?: T;
  error?: PersonaError;
};

interface PersonaError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';

/**
 * Custom hook for managing AI personas with offline support and real-time synchronization
 */
export const usePersona = () => {
  const dispatch = useDispatch();
  const personas = useSelector(selectPersonas);
  const activePersona = useSelector(selectActivePersona);
  const loading = useSelector((state: any) => state.personas.loading);
  const error = useSelector((state: any) => state.personas.error);
  const syncStatus = useSelector((state: any) => state.personas.syncStatus);

  /**
   * Initialize personas and setup sync interval
   */
  useEffect(() => {
    let syncTimer: NodeJS.Timeout;

    const initializePersonas = async () => {
      try {
        // Load cached personas first
        const cachedPersonas = await AsyncStorage.getItem(PERSONA_STORAGE_KEY);
        if (cachedPersonas) {
          // Dispatch cached personas while fetching fresh data
          dispatch({ type: 'personas/setCachedPersonas', payload: JSON.parse(cachedPersonas) });
        }

        // Fetch fresh data from API
        await dispatch(fetchPersonas());
      } catch (error) {
        console.error('Failed to initialize personas:', error);
      }
    };

    initializePersonas();

    // Setup periodic sync
    syncTimer = setInterval(() => {
      personas.forEach(persona => {
        if (persona.state.lastSyncTimestamp + SYNC_INTERVAL < Date.now()) {
          dispatch(syncLearningState(persona.id));
        }
      });
    }, SYNC_INTERVAL);

    return () => {
      if (syncTimer) {
        clearInterval(syncTimer);
      }
    };
  }, [dispatch]);

  /**
   * Cache personas whenever they change
   */
  useEffect(() => {
    if (personas.length > 0) {
      AsyncStorage.setItem(PERSONA_STORAGE_KEY, JSON.stringify(personas));
    }
  }, [personas]);

  /**
   * Create a new persona with validation
   */
  const createNewPersona = useCallback(async (data: CreatePersonaDto): Promise<Result<Persona>> => {
    try {
      if (personas.length >= MAX_PERSONAS) {
        throw new Error(`Maximum number of personas (${MAX_PERSONAS}) reached`);
      }

      const result = await dispatch(createPersona(data));
      if (result.error) {
        throw result.error;
      }

      return { data: result.payload as Persona };
    } catch (error: any) {
      return {
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: error.message,
          details: error.details
        }
      };
    }
  }, [dispatch, personas.length]);

  /**
   * Update existing persona with offline support
   */
  const updateExistingPersona = useCallback(async (
    id: string,
    data: UpdatePersonaDto
  ): Promise<Result<Persona>> => {
    try {
      const result = await dispatch(updatePersona({ id, ...data }));
      if (result.error) {
        throw result.error;
      }

      return { data: result.payload as Persona };
    } catch (error: any) {
      // Cache update for offline support
      const updatedPersona = personas.find(p => p.id === id);
      if (updatedPersona) {
        await AsyncStorage.setItem(
          `${PERSONA_STORAGE_KEY}_${id}`,
          JSON.stringify({ ...updatedPersona, ...data })
        );
      }

      return {
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message: 'Update cached for offline sync',
          details: { offlineCached: true }
        }
      };
    }
  }, [dispatch, personas]);

  /**
   * Delete persona with offline queue
   */
  const deleteExistingPersona = useCallback(async (id: string): Promise<Result<void>> => {
    try {
      const result = await dispatch(deletePersona(id));
      if (result.error) {
        throw result.error;
      }

      await AsyncStorage.removeItem(`${PERSONA_STORAGE_KEY}_${id}`);
      return {};
    } catch (error: any) {
      return {
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message: error.message,
          details: { pendingDeletion: true }
        }
      };
    }
  }, [dispatch]);

  /**
   * Process real-time interaction with debouncing
   */
  const processPersonaInteraction = useCallback(async (
    personaId: string,
    interactionData: any
  ): Promise<Result<void>> => {
    try {
      const result = await dispatch(processInteraction({ personaId, data: interactionData }));
      if (result.error) {
        throw result.error;
      }
      return {};
    } catch (error: any) {
      return {
        error: {
          code: ErrorCode.ML_SERVICE_ERROR,
          message: 'Failed to process interaction',
          details: error.details
        }
      };
    }
  }, [dispatch]);

  /**
   * Force immediate synchronization
   */
  const syncNow = useCallback(async (): Promise<Result<void>> => {
    try {
      const syncPromises = personas.map(persona => 
        dispatch(syncLearningState(persona.id))
      );
      await Promise.all(syncPromises);
      return {};
    } catch (error: any) {
      return {
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message: 'Sync failed',
          details: error.details
        }
      };
    }
  }, [dispatch, personas]);

  return {
    // State
    personas,
    activePersona,
    loading,
    error,
    syncStatus,

    // Actions
    createPersona: createNewPersona,
    updatePersona: updateExistingPersona,
    deletePersona: deleteExistingPersona,
    setActivePersona: (id: string) => dispatch(setActivePersona(id)),
    processInteraction: processPersonaInteraction,
    syncNow
  };
};