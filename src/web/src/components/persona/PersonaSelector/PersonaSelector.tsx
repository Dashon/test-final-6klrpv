/**
 * PersonaSelector Component
 * A highly interactive component for managing and selecting AI personas with real-time learning progress
 * Implements virtualization, accessibility, and comprehensive error handling
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import styled from '@emotion/styled';
import { useVirtual } from 'react-virtual';
import { Persona } from '../../../types/persona';
import { PersonaCard } from '../PersonaCard/PersonaCard';
import { usePersona } from '../../../hooks/usePersona';
import { colors, spacing, transitions } from '../../../constants/theme';

/**
 * Props interface for PersonaSelector component
 */
export interface PersonaSelectorProps {
  /** Optional CSS class name */
  className?: string;
  /** Optional error handler callback */
  onError?: (error: Error) => void;
}

/**
 * Styled container with enhanced scrolling behavior
 */
const SelectorContainer = styled.div`
  display: flex;
  overflow-x: auto;
  gap: ${spacing.md}px;
  padding: ${spacing.md}px 0;
  scrollbar-width: thin;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  position: relative;

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: ${colors.backgroundSecondary};
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${colors.primary}40;
    border-radius: 3px;
  }

  /* Touch device optimization */
  @media (hover: none) {
    overflow-x: scroll;
  }
`;

/**
 * Styled wrapper for individual persona cards
 */
const PersonaWrapper = styled.div`
  flex: 0 0 auto;
  width: 280px;
  scroll-snap-align: start;
  transition: transform ${transitions.default} ${transitions.easeInOut};

  /* Responsive adjustments */
  @media (max-width: 768px) {
    width: 240px;
  }

  @media (max-width: 480px) {
    width: 200px;
  }
`;

/**
 * Loading placeholder component
 */
const LoadingPlaceholder = styled.div`
  width: 280px;
  height: 160px;
  background: ${colors.backgroundSecondary};
  border-radius: 8px;
  animation: pulse 1.5s infinite;

  @keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 0.8; }
    100% { opacity: 0.6; }
  }
`;

/**
 * Error message component
 */
const ErrorMessage = styled.div`
  color: ${colors.error};
  padding: ${spacing.md}px;
  text-align: center;
  width: 100%;
`;

/**
 * PersonaSelector component for managing and selecting AI personas
 */
export const PersonaSelector: React.FC<PersonaSelectorProps> = ({
  className,
  onError
}) => {
  const {
    personas,
    activePersona,
    activatePersona,
    loading,
    error,
    loadingState
  } = usePersona();

  // Virtual list configuration for performance
  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtual({
    horizontal: true,
    size: personas.length,
    parentRef,
    estimateSize: useCallback(() => 280, []),
    overscan: 2
  });

  /**
   * Handles persona activation with error handling
   */
  const handlePersonaActivate = useCallback(async (personaId: string) => {
    try {
      await activatePersona(personaId);
    } catch (error) {
      console.error('Failed to activate persona:', error);
      onError?.(error as Error);
    }
  }, [activatePersona, onError]);

  /**
   * Handles scroll events with debouncing
   */
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    // Implementation handled by virtual list
  }, []);

  // Error effect
  useEffect(() => {
    if (error) {
      onError?.(new Error(error));
    }
  }, [error, onError]);

  // Memoized persona items
  const personaItems = useMemo(() => 
    rowVirtualizer.virtualItems.map(virtualRow => {
      const persona = personas[virtualRow.index];
      return (
        <PersonaWrapper
          key={virtualRow.key}
          style={{
            transform: `translateX(${virtualRow.start}px)`,
            position: 'absolute',
            top: 0,
            left: 0
          }}
        >
          <PersonaCard
            persona={persona}
            isActive={activePersona?.id === persona.id}
            onActivate={handlePersonaActivate}
            testId={`persona-card-${persona.id}`}
          />
        </PersonaWrapper>
      );
    }),
    [rowVirtualizer.virtualItems, personas, activePersona, handlePersonaActivate]
  );

  if (error) {
    return (
      <ErrorMessage role="alert">
        Failed to load personas. Please try again later.
      </ErrorMessage>
    );
  }

  return (
    <SelectorContainer
      ref={parentRef}
      className={className}
      onScroll={handleScroll}
      role="listbox"
      aria-label="AI Personas"
      style={{ height: '200px', width: '100%', position: 'relative' }}
    >
      <div
        style={{
          width: `${rowVirtualizer.totalSize}px`,
          height: '100%',
          position: 'relative'
        }}
      >
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <LoadingPlaceholder
              key={`loading-${index}`}
              role="progressbar"
              aria-label="Loading personas"
            />
          ))
        ) : (
          personaItems
        )}
      </div>
    </SelectorContainer>
  );
};

export default PersonaSelector;