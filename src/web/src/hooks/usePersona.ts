/**
 * usePersona Custom Hook
 * Version: 1.0.0
 * 
 * Enterprise-grade React hook for managing AI personas with comprehensive lifecycle
 * management and real-time learning state tracking.
 */

import { useState, useCallback, useEffect, useMemo } from 'react'; // ^18.2.0
import { useDispatch, useSelector } from 'react-redux'; // ^8.1.0
import {
  Persona,
  PersonaType,
  PersonaState,
  PersonaPreferences,
  MAX_PERSONAS_PER_USER,
  hasValidPreferences
} from '../types/persona';
import {
  fetchPersonas,
  createPersona,
  updateLearningProgress,
  setActivePersona,
  selectPersonas,
  selectActivePersona,
  selectPersonaLoading,
  selectPersonaError,
  selectPersonaModelVersion
} from '../store/slices/personaSlice';

// Constants for learning progress tracking
const LEARNING_PROGRESS_INTERVAL = 1000; // 1 second
const LEARNING_PROGRESS_INCREMENT = 0.5;

/**
 * Interface for persona loading states
 */
interface PersonaLoadingState {
  creating: boolean;
  updating: boolean;
  fetching: boolean;
  activating: boolean;
}

/**
 * Interface for persona operation results
 */
interface PersonaOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Custom hook for comprehensive persona management
 * @returns Object containing persona state and management functions
 */
export const usePersona = () => {
  const dispatch = useDispatch();
  
  // Redux state selectors
  const personas = useSelector(selectPersonas);
  const activePersona = useSelector(selectActivePersona);
  const loading = useSelector(selectPersonaLoading);
  const error = useSelector(selectPersonaError);
  const modelVersion = useSelector(selectPersonaModelVersion);

  // Local state for granular loading states
  const [loadingState, setLoadingState] = useState<PersonaLoadingState>({
    creating: false,
    updating: false,
    fetching: false,
    activating: false
  });

  // Local state for learning progress tracking
  const [learningProgress, setLearningProgress] = useState<number>(0);

  /**
   * Handles persona creation with validation and error handling
   */
  const handleCreatePersona = useCallback(async (
    data: {
      name: string;
      type: PersonaType;
      preferences: PersonaPreferences;
    }
  ): Promise<PersonaOperationResult<Persona>> => {
    try {
      setLoadingState(prev => ({ ...prev, creating: true }));

      // Validate maximum persona limit
      if (personas.length >= MAX_PERSONAS_PER_USER) {
        throw new Error(`Maximum limit of ${MAX_PERSONAS_PER_USER} personas reached`);
      }

      // Validate preferences
      if (!hasValidPreferences(data.preferences)) {
        throw new Error('Invalid persona preferences');
      }

      const result = await dispatch(createPersona({
        ...data,
        modelVersion: modelVersion || '1.0.0'
      })).unwrap();

      return { success: true, data: result };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create persona'
      };
    } finally {
      setLoadingState(prev => ({ ...prev, creating: false }));
    }
  }, [dispatch, personas.length, modelVersion]);

  /**
   * Handles persona updates with learning state tracking
   */
  const handleUpdatePersona = useCallback(async (
    personaId: string,
    updates: Partial<Persona>
  ): Promise<PersonaOperationResult<Persona>> => {
    try {
      setLoadingState(prev => ({ ...prev, updating: true }));

      const result = await dispatch(updateLearningProgress({
        personaId,
        progress: {
          ...updates.state,
          lastInteraction: new Date()
        }
      })).unwrap();

      return { success: true, data: result };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update persona'
      };
    } finally {
      setLoadingState(prev => ({ ...prev, updating: false }));
    }
  }, [dispatch]);

  /**
   * Handles persona activation with learning progress initialization
   */
  const handleActivatePersona = useCallback(async (
    personaId: string
  ): Promise<PersonaOperationResult<Persona>> => {
    try {
      setLoadingState(prev => ({ ...prev, activating: true }));

      // Find persona to activate
      const persona = personas.find(p => p.id === personaId);
      if (!persona) {
        throw new Error('Persona not found');
      }

      await dispatch(setActivePersona(personaId));
      setLearningProgress(persona.state.learningProgress);

      return { success: true, data: persona };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to activate persona'
      };
    } finally {
      setLoadingState(prev => ({ ...prev, activating: false }));
    }
  }, [dispatch, personas]);

  /**
   * Effect for real-time learning progress tracking
   */
  useEffect(() => {
    let progressInterval: NodeJS.Timeout;

    if (activePersona) {
      progressInterval = setInterval(() => {
        setLearningProgress(prev => {
          const newProgress = Math.min(100, prev + LEARNING_PROGRESS_INCREMENT);
          
          // Update persona learning state when progress changes
          if (newProgress !== prev) {
            handleUpdatePersona(activePersona.id, {
              state: {
                ...activePersona.state,
                learningProgress: newProgress
              }
            });
          }

          return newProgress;
        });
      }, LEARNING_PROGRESS_INTERVAL);
    }

    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [activePersona, handleUpdatePersona]);

  /**
   * Effect for initial personas fetch
   */
  useEffect(() => {
    const fetchInitialPersonas = async () => {
      setLoadingState(prev => ({ ...prev, fetching: true }));
      try {
        await dispatch(fetchPersonas()).unwrap();
      } finally {
        setLoadingState(prev => ({ ...prev, fetching: false }));
      }
    };

    fetchInitialPersonas();
  }, [dispatch]);

  // Memoized loading state
  const isLoading = useMemo(() => 
    Object.values(loadingState).some(state => state) || loading,
    [loadingState, loading]
  );

  return {
    // State
    personas,
    activePersona,
    loading: isLoading,
    error,
    learningProgress,

    // Actions
    createPersona: handleCreatePersona,
    updatePersona: handleUpdatePersona,
    activatePersona: handleActivatePersona,

    // Loading states
    loadingState
  };
};