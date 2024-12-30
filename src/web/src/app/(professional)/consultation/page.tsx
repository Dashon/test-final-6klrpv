/**
 * Professional Consultation Management Page Component
 * Provides real-time management of both human and AI agent consultations
 * with integrated video capabilities and analytics
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback } from 'react'; // v18.x
import styled from '@emotion/styled'; // v11.x
import TwilioVideo from '@twilio/video'; // v2.x

import { ConsultationCard } from '@/components/professional/ConsultationCard/ConsultationCard';
import { useWebSocket } from '@/hooks/useWebSocket';
import { colors, spacing, breakpoints } from '@/constants/theme';

// Types
interface ConsultationStats {
  total: number;
  completed: number;
  upcoming: number;
  revenue: number;
}

interface Consultation {
  id: string;
  title: string;
  scheduledTime: Date;
  duration: number;
  status: 'scheduled' | 'inProgress' | 'completed' | 'cancelled';
  videoStatus: 'ready' | 'connecting' | 'error';
  professional: {
    id: string;
    name: string;
    isAiAgent: boolean;
  };
  client: {
    id: string;
    name: string;
  };
  price: number;
  timezone: string;
}

// Styled Components
const PageContainer = styled.div`
  padding: ${spacing.md}px;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: ${spacing.md}px;
`;

const AnalyticsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${spacing.sm}px;
  padding: ${spacing.sm}px;
  background: ${colors.backgroundSecondary};
  border-radius: 8px;
`;

const StatCard = styled.div`
  padding: ${spacing.sm}px;
  background: ${colors.backgroundPrimary};
  border-radius: 4px;
  box-shadow: ${props => props.theme.shadows.sm};

  h3 {
    margin: 0 0 ${spacing.xs}px 0;
    color: ${colors.textSecondary};
    font-size: 0.875rem;
  }

  p {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 500;
    color: ${colors.textPrimary};
  }
`;

const ConsultationGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${spacing.md}px;
  width: 100%;

  @media (max-width: ${breakpoints.mobile}px) {
    grid-template-columns: 1fr;
  }
`;

const ConsultationPage: React.FC = () => {
  // State
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [stats, setStats] = useState<ConsultationStats>({
    total: 0,
    completed: 0,
    upcoming: 0,
    revenue: 0,
  });

  // WebSocket setup for real-time updates
  const {
    isConnected,
    connectionQuality,
    connect,
    subscribe,
    unsubscribe,
  } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'wss://api.example.com/ws',
    autoConnect: true,
  });

  // Handlers
  const handleJoinConsultation = useCallback(async (consultationId: string) => {
    try {
      // Get video token from backend
      const response = await fetch(`/api/consultations/${consultationId}/token`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to get video token');
      
      const { token, roomId } = await response.json();

      // Connect to Twilio video room
      const room = await TwilioVideo.connect(token, {
        name: roomId,
        audio: true,
        video: { width: 640, height: 480 },
      });

      // Update consultation status
      setConsultations(prev =>
        prev.map(c =>
          c.id === consultationId
            ? { ...c, status: 'inProgress', videoStatus: 'ready' }
            : c
        )
      );

      return room;
    } catch (error) {
      console.error('Failed to join consultation:', error);
      // Update video status to error
      setConsultations(prev =>
        prev.map(c =>
          c.id === consultationId
            ? { ...c, videoStatus: 'error' }
            : c
        )
      );
      throw error;
    }
  }, []);

  const handleCancelConsultation = useCallback(async (consultationId: string) => {
    try {
      const response = await fetch(`/api/consultations/${consultationId}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to cancel consultation');

      setConsultations(prev =>
        prev.map(c =>
          c.id === consultationId
            ? { ...c, status: 'cancelled' }
            : c
        )
      );
    } catch (error) {
      console.error('Failed to cancel consultation:', error);
      throw error;
    }
  }, []);

  const handleRescheduleConsultation = useCallback(async (consultationId: string) => {
    try {
      // Open reschedule modal/form
      // Implementation would depend on your UI components
      console.log('Reschedule consultation:', consultationId);
    } catch (error) {
      console.error('Failed to reschedule consultation:', error);
      throw error;
    }
  }, []);

  // Real-time updates handler
  const handleRealTimeUpdates = useCallback(() => {
    const handleConsultationUpdate = (data: any) => {
      setConsultations(prev =>
        prev.map(c =>
          c.id === data.consultationId
            ? { ...c, ...data.updates }
            : c
        )
      );
    };

    const handleStatsUpdate = (data: ConsultationStats) => {
      setStats(data);
    };

    subscribe('consultation:update', handleConsultationUpdate);
    subscribe('stats:update', handleStatsUpdate);

    return () => {
      unsubscribe('consultation:update', handleConsultationUpdate);
      unsubscribe('stats:update', handleStatsUpdate);
    };
  }, [subscribe, unsubscribe]);

  // Initial data fetch
  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        const response = await fetch('/api/consultations', {
          credentials: 'include',
        });
        
        if (!response.ok) throw new Error('Failed to fetch consultations');
        
        const data = await response.json();
        setConsultations(data.consultations);
        setStats(data.stats);
      } catch (error) {
        console.error('Failed to fetch consultations:', error);
      }
    };

    fetchConsultations();
  }, []);

  // Set up real-time updates
  useEffect(() => {
    if (isConnected) {
      const cleanup = handleRealTimeUpdates();
      return () => cleanup();
    }
  }, [isConnected, handleRealTimeUpdates]);

  return (
    <PageContainer>
      <h1>Consultations</h1>
      
      <AnalyticsSection>
        <StatCard>
          <h3>Total Consultations</h3>
          <p>{stats.total}</p>
        </StatCard>
        <StatCard>
          <h3>Completed</h3>
          <p>{stats.completed}</p>
        </StatCard>
        <StatCard>
          <h3>Upcoming</h3>
          <p>{stats.upcoming}</p>
        </StatCard>
        <StatCard>
          <h3>Revenue</h3>
          <p>${stats.revenue.toLocaleString()}</p>
        </StatCard>
      </AnalyticsSection>

      <ConsultationGrid>
        {consultations.map(consultation => (
          <ConsultationCard
            key={consultation.id}
            consultation={consultation}
            onJoin={handleJoinConsultation}
            onCancel={handleCancelConsultation}
            onReschedule={handleRescheduleConsultation}
          />
        ))}
      </ConsultationGrid>
    </PageContainer>
  );
};

export default ConsultationPage;