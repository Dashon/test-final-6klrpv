/**
 * Persona Redux Slice
 * Version: 1.0.0
 * 
 * Manages AI persona state with real-time learning capabilities, caching,
 * and comprehensive error handling for the AI-Enhanced Social Travel Platform.
 */

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'; // ^1.9.5
import {
  Persona,
  PersonaType,
  PersonaState,
  PersonaPreferences,
  MAX_PERSONAS_PER_USER,
  hasValidPreferences,
  needsTraining
} from '../../types/persona';
import { personaService } from '../../services/persona';
import { ErrorCode } from '../../../backend/shared/constants/error-codes';

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 300000;

/**
 * State interface for persona management
 */
interface PersonaSliceState {
  personas: Persona[];
  activePersonaId: string | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  modelVersion: string | null;
  validationState: {
    isValid: boolean;
    errors: string[];
  };
  cache: {
    timestamp: Date;
    data: Record<string, Persona>;
  };
}

/**
 * Initial state configuration
 */
const initialState: PersonaSliceState = {
  personas: [],
  activePersonaId: null,
  loading: false,
  error: null,
  lastUpdated: null,
  modelVersion: null,
  validationState: {
    isValid: true,
    errors: []
  },
  cache: {
    timestamp: new Date(),
    data: {}
  }
};

/**
 * Async thunk for fetching all personas with caching
 */
export const fetchPersonas = createAsyncThunk(
  'persona/fetchPersonas',
  async (_, { rejectWithValue }) => {
    try {
      const personas = await personaService.getPersonas();
      return personas;
    } catch (error: any) {
      return rejectWithValue({
        code: error.code || ErrorCode.INTERNAL_SERVER_ERROR,
        message: error.message
      });
    }
  }
);

/**
 * Async thunk for creating a new persona
 */
export const createPersona = createAsyncThunk(
  'persona/createPersona',
  async (personaData: {
    name: string;
    type: PersonaType;
    preferences: PersonaPreferences;
  }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { persona: PersonaSliceState };
      if (state.persona.personas.length >= MAX_PERSONAS_PER_USER) {
        throw new Error(`Maximum limit of ${MAX_PERSONAS_PER_USER} personas reached`);
      }

      if (!hasValidPreferences(personaData.preferences)) {
        throw new Error('Invalid persona preferences');
      }

      const newPersona = await personaService.createPersona({
        ...personaData,
        modelVersion: state.persona.modelVersion || '1.0.0',
        initialLearningState: {
          adaptationLevel: 0,
          lastInteraction: new Date(),
          learningProgress: 0,
          interactionCount: 0,
          confidenceScore: 0.5,
          specializations: []
        }
      });

      return newPersona;
    } catch (error: any) {
      return rejectWithValue({
        code: error.code || ErrorCode.VALIDATION_ERROR,
        message: error.message
      });
    }
  }
);

/**
 * Async thunk for updating persona learning progress
 */
export const updateLearningProgress = createAsyncThunk(
  'persona/updateLearningProgress',
  async ({ 
    personaId, 
    progress 
  }: { 
    personaId: string; 
    progress: Partial<PersonaState>;
  }, { rejectWithValue }) => {
    try {
      const updatedPersona = await personaService.updatePersona(personaId, {
        learningProgress: progress
      });
      return updatedPersona;
    } catch (error: any) {
      return rejectWithValue({
        code: error.code || ErrorCode.ML_SERVICE_ERROR,
        message: error.message
      });
    }
  }
);

/**
 * Persona slice with reducers and actions
 */
const personaSlice = createSlice({
  name: 'persona',
  initialState,
  reducers: {
    setActivePersona(state, action: PayloadAction<string>) {
      state.activePersonaId = action.payload;
    },
    clearPersonaError(state) {
      state.error = null;
    },
    invalidateCache(state) {
      state.cache = {
        timestamp: new Date(),
        data: {}
      };
    },
    updateModelVersion(state, action: PayloadAction<string>) {
      state.modelVersion = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch personas handlers
      .addCase(fetchPersonas.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPersonas.fulfilled, (state, action) => {
        state.loading = false;
        state.personas = action.payload;
        state.lastUpdated = new Date();
        state.cache = {
          timestamp: new Date(),
          data: action.payload.reduce((acc, persona) => ({
            ...acc,
            [persona.id]: persona
          }), {})
        };
      })
      .addCase(fetchPersonas.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch personas';
      })
      // Create persona handlers
      .addCase(createPersona.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPersona.fulfilled, (state, action) => {
        state.loading = false;
        state.personas.push(action.payload);
        state.cache.data[action.payload.id] = action.payload;
      })
      .addCase(createPersona.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to create persona';
      })
      // Update learning progress handlers
      .addCase(updateLearningProgress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateLearningProgress.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.personas.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.personas[index] = action.payload;
          state.cache.data[action.payload.id] = action.payload;
        }
      })
      .addCase(updateLearningProgress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to update learning progress';
      });
  }
});

// Export actions
export const {
  setActivePersona,
  clearPersonaError,
  invalidateCache,
  updateModelVersion
} = personaSlice.actions;

// Export selectors
export const selectPersonas = (state: { persona: PersonaSliceState }) => state.persona.personas;
export const selectActivePersona = (state: { persona: PersonaSliceState }) => {
  const activeId = state.persona.activePersonaId;
  return activeId ? state.persona.personas.find(p => p.id === activeId) : null;
};
export const selectPersonaById = (state: { persona: PersonaSliceState }, id: string) => 
  state.persona.cache.data[id] || state.persona.personas.find(p => p.id === id);
export const selectPersonaLoading = (state: { persona: PersonaSliceState }) => state.persona.loading;
export const selectPersonaError = (state: { persona: PersonaSliceState }) => state.persona.error;
export const selectPersonaModelVersion = (state: { persona: PersonaSliceState }) => state.persona.modelVersion;

// Export reducer
export default personaSlice.reducer;