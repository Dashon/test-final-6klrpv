/**
 * Professional Features Redux Slice
 * Version: 1.0.0
 * 
 * Manages state for professional features including AI agents, consultations,
 * analytics, and real-time updates with comprehensive error handling
 */

import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import { Agent, AgentStatus, ProfessionalError } from '../../types/professional';
import professionalApi from '../../services/professional';
import { ErrorCode, ErrorMetadata } from '../../../backend/shared/constants/error-codes';

// Cache duration constants
const CACHE_DURATIONS = {
  AGENTS_LIST: 5 * 60 * 1000, // 5 minutes
  ANALYTICS: 60 * 1000,       // 1 minute
  CONSULTATIONS: 3 * 60 * 1000 // 3 minutes
} as const;

// Interface for filtering agents
interface AgentFilters {
  status?: AgentStatus;
  searchTerm?: string;
  specialties?: string[];
  languages?: string[];
}

// Interface for professional slice state
interface ProfessionalState {
  agents: Agent[];
  consultations: any[]; // Type will be expanded when consultation features are implemented
  analytics: Record<string, any>;
  loading: boolean;
  error: ProfessionalError | null;
  lastUpdated: {
    agents?: number;
    consultations?: number;
    analytics?: number;
  };
  selectedAgentId: string | null;
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
  };
}

// Initial state
const initialState: ProfessionalState = {
  agents: [],
  consultations: [],
  analytics: {},
  loading: false,
  error: null,
  lastUpdated: {},
  selectedAgentId: null,
  pagination: {
    currentPage: 1,
    pageSize: 10,
    totalItems: 0
  }
};

/**
 * Async thunk for fetching AI agents with retry logic and cache validation
 */
export const fetchAgentsWithRetry = createAsyncThunk(
  'professional/fetchAgents',
  async (
    { filters, options }: { 
      filters?: AgentFilters; 
      options?: { retryCount?: number; signal?: AbortSignal } 
    },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { professional: ProfessionalState };
      const lastUpdate = state.professional.lastUpdated.agents;
      
      // Check cache validity
      if (lastUpdate && Date.now() - lastUpdate < CACHE_DURATIONS.AGENTS_LIST) {
        return state.professional.agents;
      }

      const response = await professionalApi.getAgentsList(
        'current-professional-id', // This should come from auth state
        filters?.status
      );

      return response;
    } catch (error: any) {
      const errorCode = error.code || ErrorCode.INTERNAL_SERVER_ERROR;
      const errorMetadata = ErrorMetadata[errorCode];

      // Implement retry logic based on error metadata
      if (
        errorMetadata.retryStrategy &&
        (!options?.retryCount || options.retryCount < errorMetadata.retryStrategy.maxAttempts)
      ) {
        return fetchAgentsWithRetry({
          filters,
          options: {
            ...options,
            retryCount: (options?.retryCount || 0) + 1
          }
        });
      }

      return rejectWithValue({
        code: errorCode,
        message: error.message,
        retryable: !!errorMetadata.retryStrategy
      });
    }
  }
);

/**
 * Async thunk for creating a new AI agent
 */
export const createAgent = createAsyncThunk(
  'professional/createAgent',
  async (agentData: Partial<Agent>, { rejectWithValue }) => {
    try {
      const response = await professionalApi.createAgent(agentData);
      return response;
    } catch (error: any) {
      return rejectWithValue({
        code: error.code || ErrorCode.INTERNAL_SERVER_ERROR,
        message: error.message
      });
    }
  }
);

// Create the professional slice
const professionalSlice = createSlice({
  name: 'professional',
  initialState,
  reducers: {
    setSelectedAgent: (state, action: PayloadAction<string | null>) => {
      state.selectedAgentId = action.payload;
    },
    updatePagination: (state, action: PayloadAction<Partial<typeof initialState.pagination>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch agents cases
      .addCase(fetchAgentsWithRetry.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAgentsWithRetry.fulfilled, (state, action) => {
        state.loading = false;
        state.agents = action.payload;
        state.lastUpdated.agents = Date.now();
      })
      .addCase(fetchAgentsWithRetry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as ProfessionalError;
      })
      // Create agent cases
      .addCase(createAgent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAgent.fulfilled, (state, action) => {
        state.loading = false;
        state.agents.push(action.payload);
        state.lastUpdated.agents = Date.now();
      })
      .addCase(createAgent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as ProfessionalError;
      });
  }
});

// Export actions
export const { setSelectedAgent, updatePagination, clearError } = professionalSlice.actions;

// Memoized selectors
export const selectAllAgents = (state: { professional: ProfessionalState }) => state.professional.agents;

export const selectFilteredAgents = createSelector(
  [selectAllAgents, (state: { professional: ProfessionalState }, filters: AgentFilters) => filters],
  (agents, filters) => {
    if (!filters) return agents;

    return agents.filter(agent => {
      const matchesStatus = !filters.status || agent.status === filters.status;
      const matchesSearch = !filters.searchTerm || 
        agent.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        agent.description.toLowerCase().includes(filters.searchTerm.toLowerCase());
      const matchesSpecialties = !filters.specialties?.length || 
        filters.specialties.every(specialty => 
          agent.capabilities.specialties.includes(specialty)
        );
      const matchesLanguages = !filters.languages?.length ||
        filters.languages.every(language =>
          agent.capabilities.languages.includes(language)
        );

      return matchesStatus && matchesSearch && matchesSpecialties && matchesLanguages;
    });
  }
);

export const selectPaginatedAgents = createSelector(
  [selectFilteredAgents, (state: { professional: ProfessionalState }) => state.professional.pagination],
  (filteredAgents, pagination) => {
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return filteredAgents.slice(startIndex, endIndex);
  }
);

export default professionalSlice.reducer;