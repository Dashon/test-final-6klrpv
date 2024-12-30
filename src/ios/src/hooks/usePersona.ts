/**
 * Custom React hook for managing AI personas in the iOS mobile app
 * Provides comprehensive persona management with real-time learning,
 * state synchronization, offline support, and enhanced error handling
 * @version 1.0.0
 */

import { useCallback, useEffect, useRef, useState } from 'react'; // ^18.2.0
import { useDispatch, useSelector } from 'react-redux'; // ^8.1.0
import {
  Persona,
  PersonaType,
  PersonaState,
  PersonaPreferences,
  CreatePersonaParams,
  UpdatePersonaParams,
  LearningInteraction
} from '../types/persona';
import {
  personaActions,
  personaSelectors,
  PersonaError,
  fetchPersonas,
  createPersona,
  updatePersonaState,
  setActivePersona,
  addToSyncQueue,
  removeFromSyncQueue,
  incrementSyncRetry,
  clearErrors
} from '../store/slices/personaSlice';

// Constants
const MAX_PERSONAS = 5;
const SYNC_INTERVAL = 30000; // 30 seconds
const RETRY_DELAY = 5000; // 5 seconds
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Result type for persona operations
 */
type Result<T, E = PersonaError> = {
  data?: T;
  error?: E;
};

/**
 * Hook for managing AI personas with comprehensive functionality
 */
export const usePersona = () => {
  const dispatch = useDispatch();
  
  // Redux selectors
  const personas = useSelector(personaSelectors.selectPersonas);
  const activePersona = useSelector(personaSelectors.selectActivePersona);
  const loading = useSelector(personaSelectors.selectPersonaLoadingState);
  const error = useSelector(personaSelectors.selectPersonaErrors);
  const syncQueue = useSelector(personaSelectors.selectSyncQueue);

  // Local state
  const [isInitialized, setIsInitialized] = useState(false);
  const syncIntervalRef = useRef<NodeJS.Timeout>();
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const pendingOperationsRef = useRef<Set<string>>(new Set());

  /**
   * Initialize personas and sync mechanism
   */
  useEffect(() => {
    const initializePersonas = async () => {
      try {
        await dispatch(fetchPersonas()).unwrap();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize personas:', error);
      }
    };

    if (!isInitialized) {
      initializePersonas();
    }

    // Set up periodic sync
    syncIntervalRef.current = setInterval(() => {
      if (syncQueue.length > 0) {
        processSyncQueue();
      }
    }, SYNC_INTERVAL);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [dispatch, isInitialized, syncQueue]);

  /**
   * Create a new persona with validation
   */
  const createNewPersona = useCallback(async (
    params: CreatePersonaParams
  ): Promise<Result<Persona>> => {
    if (personas.length >= MAX_PERSONAS) {
      return {
        error: {
          code: 'MAX_PERSONAS_REACHED',
          message: `Maximum number of personas (${MAX_PERSONAS}) reached`
        }
      };
    }

    try {
      const operationId = `create_${Date.now()}`;
      pendingOperationsRef.current.add(operationId);
      
      const persona = await dispatch(createPersona(params)).unwrap();
      pendingOperationsRef.current.delete(operationId);
      
      return { data: persona };
    } catch (error) {
      return {
        error: {
          code: 'CREATE_FAILED',
          message: (error as Error).message
        }
      };
    }
  }, [dispatch, personas.length]);

  /**
   * Update existing persona with optimistic updates
   */
  const updateExistingPersona = useCallback(async (
    id: string,
    params: UpdatePersonaParams
  ): Promise<Result<Persona>> => {
    const existingPersona = personas.find(p => p.id === id);
    if (!existingPersona) {
      return {
        error: {
          code: 'PERSONA_NOT_FOUND',
          message: 'Persona not found'
        }
      };
    }

    try {
      const operationId = `update_${id}_${Date.now()}`;
      pendingOperationsRef.current.add(operationId);

      // Optimistic update
      const updatedPersona = { ...existingPersona, ...params };
      dispatch(personaActions.updatePersonaOptimistic(updatedPersona));

      const result = await dispatch(updatePersonaState({
        personaId: id,
        state: updatedPersona.state
      })).unwrap();

      pendingOperationsRef.current.delete(operationId);
      return { data: result };
    } catch (error) {
      // Rollback optimistic update
      dispatch(personaActions.updatePersonaOptimistic(existingPersona));
      return {
        error: {
          code: 'UPDATE_FAILED',
          message: (error as Error).message
        }
      };
    }
  }, [dispatch, personas]);

  /**
   * Delete persona with offline support
   */
  const deleteExistingPersona = useCallback(async (
    id: string
  ): Promise<Result<void>> => {
    try {
      const operationId = `delete_${id}_${Date.now()}`;
      pendingOperationsRef.current.add(operationId);

      await dispatch(personaActions.deletePersona(id)).unwrap();
      pendingOperationsRef.current.delete(operationId);

      return {};
    } catch (error) {
      return {
        error: {
          code: 'DELETE_FAILED',
          message: (error as Error).message
        }
      };
    }
  }, [dispatch]);

  /**
   * Set active persona with validation
   */
  const setActivePersonaById = useCallback(async (
    id: string
  ): Promise<Result<void>> => {
    const targetPersona = personas.find(p => p.id === id);
    if (!targetPersona) {
      return {
        error: {
          code: 'PERSONA_NOT_FOUND',
          message: 'Persona not found'
        }
      };
    }

    try {
      await dispatch(setActivePersona(id)).unwrap();
      return {};
    } catch (error) {
      return {
        error: {
          code: 'ACTIVATION_FAILED',
          message: (error as Error).message
        }
      };
    }
  }, [dispatch, personas]);

  /**
   * Submit learning interactions for persona adaptation
   */
  const submitLearningInteractions = useCallback(async (
    personaId: string,
    interactions: LearningInteraction[]
  ): Promise<Result<void>> => {
    const targetPersona = personas.find(p => p.id === personaId);
    if (!targetPersona) {
      return {
        error: {
          code: 'PERSONA_NOT_FOUND',
          message: 'Persona not found'
        }
      };
    }

    try {
      const operationId = `learn_${personaId}_${Date.now()}`;
      pendingOperationsRef.current.add(operationId);

      await dispatch(personaActions.submitLearning({
        personaId,
        interactions
      })).unwrap();

      pendingOperationsRef.current.delete(operationId);
      return {};
    } catch (error) {
      return {
        error: {
          code: 'LEARNING_FAILED',
          message: (error as Error).message
        }
      };
    }
  }, [dispatch, personas]);

  /**
   * Process sync queue with retry logic
   */
  const processSyncQueue = useCallback(async () => {
    for (const item of syncQueue) {
      try {
        await dispatch(updatePersonaState({
          personaId: item.personaId,
          state: item.state
        })).unwrap();
        
        dispatch(removeFromSyncQueue(item.personaId));
      } catch (error) {
        if (item.retryCount < MAX_RETRY_ATTEMPTS) {
          dispatch(incrementSyncRetry(item.personaId));
          retryTimeoutRef.current = setTimeout(() => {
            processSyncQueue();
          }, RETRY_DELAY);
        } else {
          dispatch(removeFromSyncQueue(item.personaId));
        }
      }
    }
  }, [dispatch, syncQueue]);

  /**
   * Retry failed operations
   */
  const retryFailedOperations = useCallback(async () => {
    const operations = Array.from(pendingOperationsRef.current);
    for (const operationId of operations) {
      if (operationId.startsWith('create_')) {
        // Retry create operations
        dispatch(fetchPersonas());
      } else if (operationId.startsWith('update_')) {
        // Retry update operations
        const [, personaId] = operationId.split('_');
        const persona = personas.find(p => p.id === personaId);
        if (persona) {
          dispatch(updatePersonaState({
            personaId,
            state: persona.state
          }));
        }
      }
    }
  }, [dispatch, personas]);

  return {
    // State
    personas,
    activePersona,
    loading,
    error,

    // Operations
    createPersona: createNewPersona,
    updatePersona: updateExistingPersona,
    deletePersona: deleteExistingPersona,
    setActivePersona: setActivePersonaById,
    submitLearning: submitLearningInteractions,
    
    // Sync and retry
    syncState: processSyncQueue,
    retryFailedOperations,
    clearError: () => dispatch(clearErrors())
  };
};

export default usePersona;