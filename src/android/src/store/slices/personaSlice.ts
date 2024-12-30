/**
 * @fileoverview Redux Toolkit slice for managing AI persona state in the Android mobile app
 * Implements comprehensive persona management with offline support and learning synchronization
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import { Persona, CreatePersonaDto, PersonaType } from '../../types/persona';
import { personaService } from '../../services/persona';
import { ErrorCode } from '../../../../backend/shared/constants/error-codes';
import { config } from '../../config/development';

// Constants
const SYNC_INTERVAL = config.PERSONA_CONFIG.MODEL_UPDATE_INTERVAL;
const MAX_PERSONAS = config.PERSONA_CONFIG.MAX_PERSONAS;
const RETRY_ATTEMPTS = 3;

// Types for pending changes during offline mode
interface PendingChange {
  type: 'create' | 'update' | 'delete';
  personaId?: string;
  data?: CreatePersonaDto | Partial<Persona>;
  timestamp: number;
}

// State interface
interface PersonaState {
  items: Persona[];
  activePersonaId: string | null;
  loading: boolean;
  error: string | null;
  syncStatus: {
    lastSyncAt: Date | null;
    isSyncing: boolean;
    failedSyncs: string[];
  };
  offline: {
    isOffline: boolean;
    pendingChanges: PendingChange[];
  };
}

// Initial state
const initialState: PersonaState = {
  items: [],
  activePersonaId: null,
  loading: false,
  error: null,
  syncStatus: {
    lastSyncAt: null,
    isSyncing: false,
    failedSyncs: [],
  },
  offline: {
    isOffline: false,
    pendingChanges: [],
  },
};

// Async thunks
export const fetchPersonas = createAsyncThunk(
  'personas/fetchPersonas',
  async (_, { rejectWithValue }) => {
    try {
      const personas = await personaService.getPersonas();
      return personas;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createPersona = createAsyncThunk(
  'personas/createPersona',
  async (personaData: CreatePersonaDto, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { personas: PersonaState };
      if (state.personas.items.length >= MAX_PERSONAS) {
        throw new Error(`Maximum number of personas (${MAX_PERSONAS}) reached`);
      }
      const persona = await personaService.createPersona(personaData);
      return persona;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const syncLearningState = createAsyncThunk(
  'personas/syncLearningState',
  async (personaId: string, { getState, rejectWithValue }) => {
    try {
      await personaService.syncLearningState(personaId);
      return personaId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Create the slice
const personaSlice = createSlice({
  name: 'personas',
  initialState,
  reducers: {
    setActivePersona(state, action: PayloadAction<string>) {
      state.activePersonaId = action.payload;
    },
    setOfflineMode(state, action: PayloadAction<boolean>) {
      state.offline.isOffline = action.payload;
    },
    addPendingChange(state, action: PayloadAction<PendingChange>) {
      state.offline.pendingChanges.push(action.payload);
    },
    clearPendingChanges(state) {
      state.offline.pendingChanges = [];
    },
    updatePersonaLearningState(
      state,
      action: PayloadAction<{ personaId: string; learningProgress: number }>
    ) {
      const persona = state.items.find(p => p.id === action.payload.personaId);
      if (persona) {
        persona.state.learningProgress = action.payload.learningProgress;
        persona.state.lastInteraction = new Date();
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch personas
      .addCase(fetchPersonas.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPersonas.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.syncStatus.lastSyncAt = new Date();
      })
      .addCase(fetchPersonas.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create persona
      .addCase(createPersona.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPersona.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
      })
      .addCase(createPersona.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Sync learning state
      .addCase(syncLearningState.pending, (state) => {
        state.syncStatus.isSyncing = true;
      })
      .addCase(syncLearningState.fulfilled, (state, action) => {
        state.syncStatus.isSyncing = false;
        state.syncStatus.lastSyncAt = new Date();
        const index = state.syncStatus.failedSyncs.indexOf(action.payload);
        if (index > -1) {
          state.syncStatus.failedSyncs.splice(index, 1);
        }
      })
      .addCase(syncLearningState.rejected, (state, action) => {
        state.syncStatus.isSyncing = false;
        const personaId = action.meta.arg;
        if (!state.syncStatus.failedSyncs.includes(personaId)) {
          state.syncStatus.failedSyncs.push(personaId);
        }
      });
  },
});

// Selectors
export const selectPersonas = (state: { personas: PersonaState }) => state.personas.items;

export const selectActivePersona = createSelector(
  [selectPersonas, (state: { personas: PersonaState }) => state.personas.activePersonaId],
  (personas, activeId) => personas.find(p => p.id === activeId)
);

export const selectPersonasByType = createSelector(
  [selectPersonas, (_: { personas: PersonaState }, type: PersonaType) => type],
  (personas, type) => personas.filter(p => p.type === type)
);

export const selectUnsyncedPersonas = createSelector(
  [selectPersonas],
  (personas) => personas.filter(p => {
    const lastSync = new Date(p.state.lastSyncTimestamp);
    return Date.now() - lastSync.getTime() > SYNC_INTERVAL;
  })
);

// Export actions and reducer
export const {
  setActivePersona,
  setOfflineMode,
  addPendingChange,
  clearPendingChanges,
  updatePersonaLearningState,
} = personaSlice.actions;

export default personaSlice.reducer;