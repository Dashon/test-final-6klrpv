'use client';

import React, { useCallback, useEffect, useState, Suspense } from 'react';
import styled from '@emotion/styled';
import PersonaCard from '../../../components/persona/PersonaCard/PersonaCard';
import BookingCard from '../../../components/booking/BookingCard/BookingCard';
import ChatBubble from '../../../components/chat/ChatBubble/ChatBubble';
import { usePersona } from '../../../hooks/usePersona';
import { useAuth } from '../../../hooks/useAuth';
import { useWebSocket } from '@hooks/index';
import { logger } from '@utils/logger';
import { analytics } from '@utils/analytics';
import { Persona } from '../../../types/persona';
import { Booking } from '../../../types/booking';
import { ChatMessage, MessageType, MessageStatus } from '../../../types/chat';
import { colors, typography, spacing } from '../../../constants/theme';

// Styled Components
const DashboardContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${spacing.md}px;
  padding: ${spacing.md}px;
  max-width: 1440px;
  margin: 0 auto;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Section = styled.section`
  background: ${colors.backgroundPrimary};
  border-radius: 8px;
  padding: ${spacing.md}px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const SectionTitle = styled.h2`
  font-family: ${typography.fontFamilyHeadings};
  font-size: ${typography.fontSizeH2};
  color: ${colors.textPrimary};
  margin: 0 0 ${spacing.md}px 0;
`;

const LoadingPlaceholder = styled.div`
  padding: ${spacing.md}px;
  text-align: center;
  color: ${colors.textSecondary};
`;

const ErrorMessage = styled.div`
  color: ${colors.error};
  padding: ${spacing.sm}px;
  margin: ${spacing.sm}px 0;
  border-radius: 4px;
  background-color: ${colors.errorLight}20;
`;

// Dashboard Component
const DashboardPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { 
    personas, 
    activePersona, 
    loading: personaLoading, 
    error: personaError,
    activatePersona 
  } = usePersona();

  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [recentChats, setRecentChats] = useState<ChatMessage[]>([]);
  const [wsError, setWsError] = useState<string | null>(null);

  // WebSocket connection for real-time updates
  const { connect, disconnect } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000/ws',
    onMessage: handleWebSocketMessage,
    onError: (error) => {
      logger.error('WebSocket connection error:', error);
      setWsError('Failed to connect to real-time updates');
    }
  });

  // Handle WebSocket messages
  function handleWebSocketMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'BOOKING_UPDATE':
          updateBookings(data.booking);
          break;
        case 'CHAT_MESSAGE':
          updateChats(data.message);
          break;
        case 'PERSONA_UPDATE':
          // Handle persona updates if needed
          break;
      }
    } catch (error) {
      logger.error('Error processing WebSocket message:', error);
    }
  }

  // Initialize WebSocket connection
  useEffect(() => {
    if (isAuthenticated) {
      connect();
      analytics.trackEvent('dashboard_view', { userId: user?.id });
    }
    return () => disconnect();
  }, [isAuthenticated, connect, disconnect, user?.id]);

  // Handle persona activation
  const handlePersonaActivation = useCallback(async (personaId: string) => {
    try {
      const result = await activatePersona(personaId);
      if (result.success) {
        analytics.trackEvent('persona_activated', { personaId });
      }
    } catch (error) {
      logger.error('Failed to activate persona:', error);
    }
  }, [activatePersona]);

  // Handle booking details navigation
  const handleBookingDetails = useCallback((bookingId: string) => {
    analytics.trackEvent('booking_details_view', { bookingId });
    window.location.href = `/bookings/${bookingId}`;
  }, []);

  // Update bookings state
  const updateBookings = useCallback((booking: Booking) => {
    setRecentBookings(prev => {
      const updated = [...prev];
      const index = updated.findIndex(b => b.id === booking.id);
      if (index !== -1) {
        updated[index] = booking;
      } else {
        updated.unshift(booking);
      }
      return updated.slice(0, 5); // Keep only 5 most recent bookings
    });
  }, []);

  // Update chats state
  const updateChats = useCallback((message: ChatMessage) => {
    setRecentChats(prev => {
      const updated = [...prev];
      const index = updated.findIndex(m => m.id === message.id);
      if (index !== -1) {
        updated[index] = message;
      } else {
        updated.unshift(message);
      }
      return updated.slice(0, 10); // Keep only 10 most recent messages
    });
  }, []);

  return (
    <DashboardContainer>
      <Suspense fallback={<LoadingPlaceholder>Loading personas...</LoadingPlaceholder>}>
        <Section>
          <SectionTitle>Active Personas</SectionTitle>
          {personaError && (
            <ErrorMessage>Failed to load personas: {personaError}</ErrorMessage>
          )}
          {personas.map((persona: Persona) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              isActive={activePersona?.id === persona.id}
              onActivate={handlePersonaActivation}
              testId={`persona-card-${persona.id}`}
            />
          ))}
        </Section>
      </Suspense>

      <Suspense fallback={<LoadingPlaceholder>Loading bookings...</LoadingPlaceholder>}>
        <Section>
          <SectionTitle>Recent Bookings</SectionTitle>
          {recentBookings.map((booking: Booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onViewDetails={() => handleBookingDetails(booking.id)}
              testId={`booking-card-${booking.id}`}
            />
          ))}
        </Section>
      </Suspense>

      <Suspense fallback={<LoadingPlaceholder>Loading chats...</LoadingPlaceholder>}>
        <Section>
          <SectionTitle>Recent Conversations</SectionTitle>
          {wsError && (
            <ErrorMessage>{wsError}</ErrorMessage>
          )}
          {recentChats.map((message: ChatMessage) => (
            <ChatBubble
              key={message.id}
              message={message}
              isOwnMessage={message.senderId === user?.id}
              testId={`chat-message-${message.id}`}
            />
          ))}
        </Section>
      </Suspense>
    </DashboardContainer>
  );
};

export default DashboardPage;