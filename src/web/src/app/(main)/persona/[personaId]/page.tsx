'use client';

import React, { useEffect, useState, useCallback } from 'react';
import styled from '@emotion/styled';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next/types';
import { Persona } from '../../../types/persona';
import { personaService } from '../../../services/persona';
import { PersonaCard } from '../../../components/persona/PersonaCard/PersonaCard';
import { colors, typography, spacing, transitions } from '../../../constants/theme';

// Types
interface PageProps {
  params: {
    personaId: string;
  };
}

// Styled Components
const Container = styled.div`
  padding: ${spacing.lg}px;
  max-width: 1200px;
  margin: 0 auto;
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

const Section = styled.section`
  margin-bottom: ${spacing.xl}px;
  background: ${colors.backgroundPrimary};
  border-radius: 8px;
  padding: ${spacing.lg}px;
  box-shadow: ${props => props.theme.shadows.sm};
`;

const ProgressContainer = styled.div`
  margin-top: ${spacing.lg}px;
`;

const ProgressBar = styled.div<{ progress: number }>`
  height: 8px;
  background: ${colors.backgroundSecondary};
  border-radius: 4px;
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${props => props.progress}%;
    background: ${colors.primary};
    transition: width ${transitions.default} ${transitions.easeInOut};
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${spacing.lg}px;
  margin-top: ${spacing.lg}px;
`;

const MetricCard = styled.div`
  padding: ${spacing.md}px;
  background: ${colors.backgroundSecondary};
  border-radius: 8px;
  text-align: center;
`;

const MetricValue = styled.div`
  font-size: ${typography.fontSizeH2};
  color: ${colors.primary};
  font-weight: ${typography.fontWeightBold};
  margin-bottom: ${spacing.xs}px;
`;

const MetricLabel = styled.div`
  font-size: ${typography.fontSizeSmall};
  color: ${colors.textSecondary};
`;

// Metadata Generator
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const persona = await personaService.getPersonaById(params.personaId);
    return {
      title: `${persona.name} - AI Persona Details`,
      description: `Manage and track learning progress for your ${persona.type} AI travel persona`,
      openGraph: {
        title: `${persona.name} - AI Persona`,
        description: `AI travel persona specialized in ${persona.type.toLowerCase()} experiences`,
      },
    };
  } catch (error) {
    return {
      title: 'AI Persona Details',
      description: 'Manage your AI travel persona',
    };
  }
}

// Page Component
export default async function PersonaPage({ params }: PageProps) {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch persona data
  const fetchPersonaData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await personaService.getPersonaById(params.personaId);
      setPersona(data);
    } catch (error) {
      setError('Failed to load persona details');
      console.error('Error fetching persona:', error);
    } finally {
      setLoading(false);
    }
  }, [params.personaId]);

  // Initialize data fetching
  useEffect(() => {
    fetchPersonaData();
  }, [fetchPersonaData]);

  // Handle real-time learning progress updates
  useEffect(() => {
    if (!persona) return;

    const progressInterval = setInterval(async () => {
      try {
        const updatedPersona = await personaService.trackLearningProgress(persona.id);
        setPersona(updatedPersona);
      } catch (error) {
        console.error('Error updating learning progress:', error);
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(progressInterval);
  }, [persona]);

  // Handle loading and error states
  if (loading) {
    return (
      <Container>
        <div>Loading persona details...</div>
      </Container>
    );
  }

  if (error || !persona) {
    notFound();
  }

  return (
    <Container>
      <Header>
        <Title>{persona.name}</Title>
      </Header>

      <Section>
        <PersonaCard
          persona={persona}
          isActive={true}
          testId="persona-details-card"
        />

        <ProgressContainer>
          <h2>Learning Progress</h2>
          <ProgressBar progress={persona.state.learningProgress} />
        </ProgressContainer>

        <MetricsGrid>
          <MetricCard>
            <MetricValue>{persona.state.adaptationLevel}%</MetricValue>
            <MetricLabel>Adaptation Level</MetricLabel>
          </MetricCard>
          <MetricCard>
            <MetricValue>{persona.state.interactionCount}</MetricValue>
            <MetricLabel>Total Interactions</MetricLabel>
          </MetricCard>
          <MetricCard>
            <MetricValue>{(persona.state.confidenceScore * 100).toFixed(1)}%</MetricValue>
            <MetricLabel>Confidence Score</MetricLabel>
          </MetricCard>
        </MetricsGrid>
      </Section>

      <Section>
        <h2>Preferences</h2>
        <div>
          <h3>Travel Style</h3>
          <ul>
            {persona.preferences.travelStyle.map(style => (
              <li key={style}>{style}</li>
            ))}
          </ul>

          <h3>Preferred Destinations</h3>
          <ul>
            {persona.preferences.destinations.map(destination => (
              <li key={destination}>{destination}</li>
            ))}
          </ul>

          <h3>Budget Range</h3>
          <p>
            {persona.preferences.budget.currency} {persona.preferences.budget.min} - {persona.preferences.budget.max}
          </p>
        </div>
      </Section>

      <Section>
        <h2>Specializations</h2>
        <ul>
          {persona.state.specializations?.map(specialization => (
            <li key={specialization}>{specialization}</li>
          ))}
        </ul>
      </Section>
    </Container>
  );
}