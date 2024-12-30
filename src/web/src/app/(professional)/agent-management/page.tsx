'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import { debounce } from 'lodash';
import { VirtualList } from 'react-window';
import { ErrorBoundary } from 'react-error-boundary';

import { AgentCard } from '@/components/professional/AgentCard/AgentCard';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  selectAllAgents,
  selectFilteredAgents,
  selectPaginatedAgents,
  fetchAgentsWithRetry,
  createAgent,
  setSelectedAgent,
  updatePagination,
  clearError
} from '@/store/slices/professionalSlice';

// Styled Components
const PageContainer = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: var(--background-primary);
  color: var(--text-primary);

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: var(--background-primary);
  padding: 16px 0;
  border-bottom: 1px solid var(--border-color);
`;

const SearchInput = styled.input`
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  width: 300px;
  font-size: 16px;

  &:focus {
    outline: none;
    border-color: var(--primary);
  }

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const FiltersContainer = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
`;

const CreateButton = styled.button`
  padding: 8px 24px;
  background-color: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--primary-dark);
  }

  &:disabled {
    background-color: var(--disabled);
    cursor: not-allowed;
  }
`;

const AgentsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  width: 100%;
  min-height: 400px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const ErrorContainer = styled.div`
  padding: 16px;
  background-color: var(--error-bg);
  color: var(--error);
  border-radius: 8px;
  margin-bottom: 16px;
`;

// Main Component
const AgentManagementPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const agents = useAppSelector(selectAllAgents);
  const loading = useAppSelector(state => state.professional.loading);
  const error = useAppSelector(state => state.professional.error);
  const pagination = useAppSelector(state => state.professional.pagination);

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: undefined,
    specialties: [],
    languages: []
  });

  // Initialize data fetching
  useEffect(() => {
    dispatch(fetchAgentsWithRetry({ filters }));

    // Set up WebSocket connection for real-time updates
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'AGENT_UPDATE') {
        dispatch(fetchAgentsWithRetry({ filters }));
      }
    };

    return () => {
      ws.close();
    };
  }, [dispatch, filters]);

  // Debounced search handler
  const handleSearch = debounce((term: string) => {
    setSearchTerm(term);
    dispatch(updatePagination({ currentPage: 1 }));
  }, 300);

  // Filter agents based on search and filters
  const filteredAgents = useMemo(() => {
    return selectFilteredAgents({ professional: { agents } }, {
      searchTerm,
      ...filters
    });
  }, [agents, searchTerm, filters]);

  // Handle agent creation
  const handleCreateAgent = useCallback(async () => {
    try {
      const newAgent = {
        name: 'New Agent',
        status: 'DRAFT',
        pricing: {
          basePrice: 0,
          currency: 'USD',
          subscriptionEnabled: false,
          subscriptionPrice: 0
        },
        capabilities: {
          languages: ['en'],
          specialties: [],
          maxConcurrentChats: 1
        }
      };

      await dispatch(createAgent(newAgent)).unwrap();
    } catch (error) {
      console.error('Failed to create agent:', error);
    }
  }, [dispatch]);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    dispatch(updatePagination({ currentPage: page }));
  }, [dispatch]);

  // Error handler for ErrorBoundary
  const handleError = useCallback((error: Error) => {
    console.error('Agent Management Error:', error);
    return (
      <ErrorContainer>
        <h3>Something went wrong</h3>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>Refresh Page</button>
      </ErrorContainer>
    );
  }, []);

  return (
    <ErrorBoundary FallbackComponent={({ error }) => handleError(error)}>
      <PageContainer>
        <Header>
          <h1>AI Agents</h1>
          <FiltersContainer>
            <SearchInput
              type="text"
              placeholder="Search agents..."
              onChange={(e) => handleSearch(e.target.value)}
              aria-label="Search agents"
            />
            <CreateButton
              onClick={handleCreateAgent}
              disabled={loading}
              aria-label="Create new agent"
            >
              Create Agent
            </CreateButton>
          </FiltersContainer>
        </Header>

        {error && (
          <ErrorContainer>
            <p>{error.message}</p>
            <button onClick={() => dispatch(clearError())}>Dismiss</button>
          </ErrorContainer>
        )}

        <AgentsGrid role="grid" aria-busy={loading}>
          {loading ? (
            <div>Loading agents...</div>
          ) : filteredAgents.length === 0 ? (
            <div>No agents found</div>
          ) : (
            filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                showAnalytics={true}
                onClick={() => dispatch(setSelectedAgent(agent.id))}
                testId={`agent-card-${agent.id}`}
              />
            ))
          )}
        </AgentsGrid>

        {filteredAgents.length > pagination.pageSize && (
          <div>
            {/* Pagination controls */}
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
            >
              Previous
            </button>
            <span>
              Page {pagination.currentPage} of{' '}
              {Math.ceil(filteredAgents.length / pagination.pageSize)}
            </span>
            <button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={
                pagination.currentPage ===
                Math.ceil(filteredAgents.length / pagination.pageSize)
              }
            >
              Next
            </button>
          </div>
        )}
      </PageContainer>
    </ErrorBoundary>
  );
};

export default AgentManagementPage;