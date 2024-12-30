'use client';

import React, { useCallback, useEffect } from 'react';
import styled from '@emotion/styled';
import { Analytics } from '@segment/analytics-next';
import { ErrorBoundary } from 'react-error-boundary';

import { Button } from '../../components/shared/Button/Button';
import { PersonaCard } from '../../components/persona/PersonaCard/PersonaCard';
import { useAuth } from '../../hooks/useAuth';
import { colors, typography, spacing, transitions } from '../../constants/theme';

// Initialize analytics
const analytics = new Analytics({
  writeKey: process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY || ''
});

// Styled components for layout
const HeroSection = styled.section`
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: ${spacing.xl}px;
  background: linear-gradient(
    to bottom,
    ${colors.backgroundPrimary},
    ${colors.backgroundSecondary}
  );
`;

const Title = styled.h1`
  font-family: ${typography.fontFamilyHeadings};
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: ${typography.fontWeightBold};
  color: ${colors.textPrimary};
  margin-bottom: ${spacing.md}px;
  line-height: 1.2;
`;

const Subtitle = styled.p`
  font-family: ${typography.fontFamilyUI};
  font-size: clamp(1rem, 2vw, 1.25rem);
  color: ${colors.textSecondary};
  max-width: 600px;
  margin-bottom: ${spacing.xl}px;
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${spacing.lg}px;
  max-width: 1200px;
  width: 100%;
  margin: ${spacing.xl}px auto;
  padding: 0 ${spacing.md}px;
`;

const FeatureCard = styled.div`
  background: ${colors.backgroundPrimary};
  border-radius: 8px;
  padding: ${spacing.lg}px;
  box-shadow: ${props => props.theme.shadows.md};
  transition: transform ${transitions.default} ${transitions.easeInOut};

  &:hover {
    transform: translateY(-4px);
  }
`;

const PersonaSection = styled.section`
  padding: ${spacing.xl}px;
  background: ${colors.backgroundSecondary};
`;

const PersonaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: ${spacing.lg}px;
  max-width: 1200px;
  margin: 0 auto;
`;

// Error Fallback component
const ErrorFallback = ({ error }: { error: Error }) => (
  <div role="alert">
    <h2>Something went wrong:</h2>
    <pre>{error.message}</pre>
    <Button onClick={() => window.location.reload()} variant="primary">
      Try again
    </Button>
  </div>
);

// Main page component
const HomePage = () => {
  const { isAuthenticated, user, loading } = useAuth();

  // Track page view
  useEffect(() => {
    analytics.page('Home Page View');
  }, []);

  // Handle CTA click
  const handleGetStarted = useCallback(async (event: React.MouseEvent) => {
    event.preventDefault();
    
    analytics.track('Get Started Click', {
      location: 'hero_section',
      authenticated: isAuthenticated
    });

    if (isAuthenticated) {
      window.location.href = '/dashboard';
    } else {
      window.location.href = '/register';
    }
  }, [isAuthenticated]);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <main>
        <HeroSection>
          <Title>Plan Smarter, Travel Better with AI</Title>
          <Subtitle>
            Transform your travel planning with personalized AI assistance,
            connect with fellow travelers, and access professional services
            all in one platform.
          </Subtitle>
          <Button
            variant="primary"
            size="large"
            onClick={handleGetStarted}
            loading={loading}
            aria-label="Get started with AI travel planning"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
          </Button>
        </HeroSection>

        <FeaturesGrid>
          <FeatureCard>
            <h3>AI Travel Personas</h3>
            <p>Create up to 5 unique AI personas tailored to your travel style</p>
          </FeatureCard>
          <FeatureCard>
            <h3>Social Planning</h3>
            <p>Collaborate with friends and AI agents in real-time</p>
          </FeatureCard>
          <FeatureCard>
            <h3>Professional Services</h3>
            <p>Access verified travel experts and custom experiences</p>
          </FeatureCard>
        </FeaturesGrid>

        <PersonaSection>
          <h2>Meet Your AI Travel Companions</h2>
          <PersonaGrid>
            {/* Example personas - in production these would be dynamic */}
            <PersonaCard
              persona={{
                id: '1',
                name: 'Explorer',
                type: 'EXPLORER',
                state: { learningProgress: 75 }
              }}
              isActive={false}
              testId="persona-explorer"
            />
            <PersonaCard
              persona={{
                id: '2',
                name: 'Luxury',
                type: 'LUXURY',
                state: { learningProgress: 85 }
              }}
              isActive={false}
              testId="persona-luxury"
            />
            <PersonaCard
              persona={{
                id: '3',
                name: 'Adventure',
                type: 'ADVENTURE',
                state: { learningProgress: 90 }
              }}
              isActive={false}
              testId="persona-adventure"
            />
          </PersonaGrid>
        </PersonaSection>
      </main>
    </ErrorBoundary>
  );
};

// Metadata for SEO
export const metadata = {
  title: 'AI-Enhanced Social Travel Platform - Plan Smarter, Travel Better',
  description: 'Transform your travel planning with AI personas, connect with fellow travelers, and access professional services all in one platform.',
  openGraph: {
    title: 'AI-Enhanced Social Travel Platform',
    description: 'Plan Smarter, Travel Better with AI',
    images: ['/images/og-image.jpg']
  }
};

export default HomePage;