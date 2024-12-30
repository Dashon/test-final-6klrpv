/**
 * Redux slice for managing AI persona state in the iOS mobile app
 * Implements real-time learning, offline capabilities, and robust error handling
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit';
import { Persona, PersonaType, PersonaState } from '../../types/persona';
import { PersonaService, personaService } from '../../services/persona';

// Constants
const MAX_PERSONAS = 5;
const SYNC_RETRY_LIMIT = 3;
const SYNC_RETRY_DELAY = 5000;

// State interface
interface PersonaSliceState {
  personas: Record<string, Persona>;
  activePersonaId: string | null;
  loading: {
    fetchPersonas: boolean;
    createPersona: boolean;
    updatePersona: boolean;
    syncState: boolean;
  };
  errors: {
    fetchPersonas: string | null;
    createPersona: string | null;
    updatePersona: string | null;
    syncState: string | null;
  };
  syncQueue: Array<{
    personaId: string;
    state: PersonaState;
    retryCount: number;
  }>;
  lastSync: string | null;
}

// Initial state
const initialState: PersonaSliceState = {
  personas: {},
  activePersonaId: null,
  loading: {
    fetchPersonas: false,
    createPersona: false,
    updatePersona: false,
    syncState: false
  },
  errors: {
    fetchPersonas: null,
    createPersona: null,
    updatePersona: null,
    syncState: null
  },
  syncQueue: [],
  lastSync: null
};

// Async thunks
export const fetchPersonas = createAsyncThunk(
  'persona/fetchPersonas',
  async (_, { rejectWithValue }) => {
    try {
      const personas = await personaService.getPersonas();
      return personas;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const createPersona = createAsyncThunk(
  'persona/createPersona',
  async (personaData: Omit<Persona, 'id'>, { getState, rejectWithValue }) => {
    const state = getState() as { persona: PersonaSliceState };
    const currentCount = Object.keys(state.persona.personas).length;

    if (currentCount >= MAX_PERSONAS) {
      return rejectWithValue(`Maximum number of personas (${MAX_PERSONAS}) reached`);
    }

    try {
      const newPersona = await personaService.createPersona(personaData);
      return newPersona;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const updatePersonaState = createAsyncThunk(
  'persona/updateState',
  async (
    { personaId, state }: { personaId: string; state: PersonaState },
    { dispatch, rejectWithValue }
  ) => {
    try {
      await personaService.syncPersonaState(personaId, state);
      return { personaId, state };
    } catch (error) {
      // Add to sync queue for offline support
      dispatch(personaSlice.actions.addToSyncQueue({ personaId, state }));
      return rejectWithValue((error as Error).message);
    }
  }
);

// Slice definition
export const personaSlice = createSlice({
  name: 'persona',
  initialState,
  reducers: {
    setActivePersona: (state, action: PayloadAction<string>) => {
      state.activePersonaId = action.payload;
    },
    addToSyncQueue: (
      state,
      action: PayloadAction<{ personaId: string; state: PersonaState }>
    ) => {
      state.syncQueue.push({
        ...action.payload,
        retryCount: 0
      });
    },
    removeFromSyncQueue: (state, action: PayloadAction<string>) => {
      state.syncQueue = state.syncQueue.filter(
        item => item.personaId !== action.payload
      );
    },
    incrementSyncRetry: (state, action: PayloadAction<string>) => {
      const queueItem = state.syncQueue.find(
        item => item.personaId === action.payload
      );
      if (queueItem) {
        queueItem.retryCount += 1;
      }
    },
    clearErrors: (state) => {
      state.errors = {
        fetchPersonas: null,
        createPersona: null,
        updatePersona: null,
        syncState: null
      };
    }
  },
  extraReducers: (builder) => {
    // fetchPersonas reducers
    builder
      .addCase(fetchPersonas.pending, (state) => {
        state.loading.fetchPersonas = true;
        state.errors.fetchPersonas = null;
      })
      .addCase(fetchPersonas.fulfilled, (state, action) => {
        state.loading.fetchPersonas = false;
        state.personas = action.payload.reduce((acc, persona) => {
          acc[persona.id] = persona;
          return acc;
        }, {} as Record<string, Persona>);
      })
      .addCase(fetchPersonas.rejected, (state, action) => {
        state.loading.fetchPersonas = false;
        state.errors.fetchPersonas = action.payload as string;
      });

    // createPersona reducers
    builder
      .addCase(createPersona.pending, (state) => {
        state.loading.createPersona = true;
        state.errors.createPersona = null;
      })
      .addCase(createPersona.fulfilled, (state, action) => {
        state.loading.createPersona = false;
        state.personas[action.payload.id] = action.payload;
      })
      .addCase(createPersona.rejected, (state, action) => {
        state.loading.createPersona = false;
        state.errors.createPersona = action.payload as string;
      });

    // updatePersonaState reducers
    builder
      .addCase(updatePersonaState.pending, (state) => {
        state.loading.syncState = true;
        state.errors.syncState = null;
      })
      .addCase(updatePersonaState.fulfilled, (state, action) => {
        state.loading.syncState = false;
        state.lastSync = new Date().toISOString();
        if (state.personas[action.payload.personaId]) {
          state.personas[action.payload.personaId].state = action.payload.state;
        }
      })
      .addCase(updatePersonaState.rejected, (state, action) => {
        state.loading.syncState = false;
        state.errors.syncState = action.payload as string;
      });
  }
});

// Selectors
export const selectPersonas = createSelector(
  [(state: { persona: PersonaSliceState }) => state.persona],
  (personaState) => Object.values(personaState.personas)
);

export const selectActivePersona = createSelector(
  [(state: { persona: PersonaSliceState }) => state.persona],
  (personaState) => 
    personaState.activePersonaId 
      ? personaState.personas[personaState.activePersonaId]
      : null
);

export const selectPersonaLoadingState = createSelector(
  [(state: { persona: PersonaSliceState }) => state.persona.loading],
  (loading) => loading
);

export const selectPersonaErrors = createSelector(
  [(state: { persona: PersonaSliceState }) => state.persona.errors],
  (errors) => errors
);

export const selectSyncQueue = createSelector(
  [(state: { persona: PersonaSliceState }) => state.persona.syncQueue],
  (syncQueue) => syncQueue
);

// Export actions
export const {
  setActivePersona,
  addToSyncQueue,
  removeFromSyncQueue,
  incrementSyncRetry,
  clearErrors
} = personaSlice.actions;

// Export reducer
export default personaSlice.reducer;