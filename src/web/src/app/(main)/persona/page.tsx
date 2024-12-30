'use client';

/**
 * Persona Management Page Component
 * Implements comprehensive persona management with real-time learning tracking
 * and accessibility features for the AI-Enhanced Social Travel Platform
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { useAnalytics } from '@segment/analytics-next';
import { PersonaSelector } from '../../../components/persona/PersonaSelector/PersonaSelector';
import { usePersona } from '../../../hooks/usePersona';
import { colors, typography, spacing, transitions } from '../../../constants/theme';
import { Persona, PersonaType, MAX_PERSONAS_PER_USER } from '../../../types/persona';

// Styled Components
const PageContainer = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${spacing.xl}px;
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: ${spacing.md}px;
  }
`;

const Header = styled.header`
  margin-bottom: ${spacing.xl}px;
`;

const Title = styled.h1`
  font-family: ${typography.fontFamilyHeadings};
  font-size: ${typography.fontSizeH1};
  color: ${colors.textPrimary};
  margin-bottom: ${spacing.md}px;
`;

const Subtitle = styled.p`
  font-size: ${typography.fontSizeBody};
  color: ${colors.textSecondary};
  margin-bottom: ${spacing.lg}px;
  max-width: 600px;
`;

const PersonaCount = styled.div<{ isNearLimit: boolean }>`
  font-size: ${typography.fontSizeSmall};
  color: ${props => props.isNearLimit ? colors.warning : colors.textSecondary};
  margin-bottom: ${spacing.md}px;
  transition: color ${transitions.default} ${transitions.easeInOut};
`;

const ErrorMessage = styled.div`
  color: ${colors.error};
  background-color: ${colors.errorLight}10;
  padding: ${spacing.md}px;
  border-radius: 8px;
  margin-bottom: ${spacing.md}px;
  display: flex;
  align-items: center;
  gap: ${spacing.sm}px;
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

/**
 * PersonaPage component for managing AI personas
 * Implements real-time learning tracking and comprehensive error handling
 */
const PersonaPage: React.FC = () => {
  // Analytics hook
  const { track } = useAnalytics();

  // Persona management hook
  const {
    personas,
    activePersona,
    loading,
    error,
    loadingState,
    createPersona,
    activatePersona
  } = usePersona();

  // Local state for UI management
  const [showError, setShowError] = useState<boolean>(false);

  /**
   * Handles persona selection with analytics tracking
   */
  const handlePersonaSelect = useCallback(async (personaId: string) => {
    try {
      const result = await activatePersona(personaId);
      if (result.success) {
        track('persona_activated', {
          personaId,
          personaType: result.data?.type
        });
      }
    } catch (error) {
      console.error('Failed to activate persona:', error);
      setShowError(true);
    }
  }, [activatePersona, track]);

  /**
   * Handles new persona creation with validation
   */
  const handleCreatePersona = useCallback(async (data: {
    name: string;
    type: PersonaType;
    preferences: any;
  }) => {
    try {
      const result = await createPersona(data);
      if (result.success) {
        track('persona_created', {
          personaType: data.type,
          isFirstPersona: personas.length === 0
        });
      }
    } catch (error) {
      console.error('Failed to create persona:', error);
      setShowError(true);
    }
  }, [createPersona, personas.length, track]);

  // Effect to clear error after timeout
  useEffect(() => {
    if (showError) {
      const timer = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showError]);

  // Calculate if near persona limit
  const isNearLimit = personas.length >= MAX_PERSONAS_PER_USER - 1;

  return (
    <PageContainer role="main" aria-label="Persona Management">
      <Header>
        <Title>AI Travel Personas</Title>
        <Subtitle>
          Create and manage your AI travel companions. Each persona learns from your
          interactions to provide personalized travel recommendations.
        </Subtitle>
        
        <PersonaCount 
          isNearLimit={isNearLimit}
          aria-live="polite"
        >
          {personas.length} of {MAX_PERSONAS_PER_USER} personas created
          {isNearLimit && ' (Approaching limit)'}
        </PersonaCount>

        {error && showError && (
          <ErrorMessage role="alert">
            <span>Error: {error}</span>
          </ErrorMessage>
        )}
      </Header>

      <PersonaSelector
        onSelect={handlePersonaSelect}
        maxPersonas={MAX_PERSONAS_PER_USER}
      />

      {loading && (
        <LoadingOverlay 
          role="progressbar" 
          aria-label="Loading personas"
        >
          Loading...
        </LoadingOverlay>
      )}
    </PageContainer>
  );
};

export default PersonaPage;