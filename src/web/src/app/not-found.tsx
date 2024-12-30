'use client';

import React from 'react'; // v18.x
import { useRouter } from 'next/navigation'; // v13.x
import styled from '@emotion/styled'; // v11.x
import Button from '../components/shared/Button/Button';
import { MAIN_ROUTES } from '../constants/routes';

// Styled components using design system tokens
const NotFoundContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background-color: var(--color-background-primary);

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const Title = styled.h1`
  font-family: var(--font-playfair);
  font-size: 3rem;
  color: var(--color-text-primary);
  margin-bottom: 1rem;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Description = styled.p`
  font-family: var(--font-roboto);
  font-size: 1.125rem;
  color: var(--color-text-secondary);
  margin-bottom: 2rem;
  text-align: center;
  max-width: 600px;
  line-height: 1.5;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const ErrorCode = styled.span`
  font-family: var(--font-roboto);
  font-size: 1.25rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.5rem;
`;

/**
 * NotFound component - Custom 404 page with error tracking and accessibility features
 * Implements WCAG 2.1 Level AA compliance with proper heading hierarchy and ARIA attributes
 */
const NotFound: React.FC = () => {
  const router = useRouter();

  /**
   * Handles navigation back to the dashboard/home page
   * Includes error tracking for analytics
   */
  const handleReturnHome = React.useCallback(() => {
    // Track 404 navigation event
    try {
      // Note: Replace with actual error tracking implementation
      console.info('404 Navigation Event: User returned to dashboard from not-found page');
      
      router.push(MAIN_ROUTES.DASHBOARD);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [router]);

  // Log 404 occurrence for monitoring
  React.useEffect(() => {
    // Note: Replace with actual error tracking implementation
    console.info('404 Page View: User accessed non-existent route');
  }, []);

  return (
    <NotFoundContainer role="main" aria-labelledby="not-found-title">
      <ErrorCode aria-hidden="true">404</ErrorCode>
      <Title id="not-found-title">Page Not Found</Title>
      <Description>
        We couldn't find the page you're looking for. It might have been moved,
        deleted, or never existed. Let's get you back on track.
      </Description>
      <Button
        variant="primary"
        size="large"
        onClick={handleReturnHome}
        ariaLabel="Return to dashboard"
      >
        Return to Dashboard
      </Button>
    </NotFoundContainer>
  );
};

export default NotFound;