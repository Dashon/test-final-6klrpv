/**
 * ParticipantsList Component Tests
 * Version: 1.0.0
 * 
 * Comprehensive test suite for the ParticipantsList component verifying:
 * - Participant display and sorting
 * - Role indicators and styling
 * - Online/offline status
 * - Typing indicators
 * - Accessibility compliance
 * - Performance with large lists
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';

import { ParticipantsList } from './ParticipantsList';
import { ParticipantRole } from '../../../types/chat';

// Mock the useChat hook
jest.mock('../../../hooks/useChat', () => ({
  useChat: jest.fn()
}));

// Mock styled-components to avoid styled-component specific test issues
jest.mock('@emotion/styled', () => ({
  default: (component: any) => component
}));

describe('ParticipantsList', () => {
  // Test data setup
  const mockParticipants = [
    {
      userId: 'owner-1',
      name: 'Room Owner',
      role: ParticipantRole.OWNER,
      joinedAt: new Date(),
      lastReadAt: new Date(),
      permissions: ['manage_room'],
      aiPersonaData: null
    },
    {
      userId: 'member-1',
      name: 'Regular Member',
      role: ParticipantRole.MEMBER,
      joinedAt: new Date(),
      lastReadAt: new Date(),
      permissions: ['send_messages'],
      aiPersonaData: null
    },
    {
      userId: 'ai-1',
      name: 'Travel Assistant',
      role: ParticipantRole.AI_PERSONA,
      joinedAt: new Date(),
      lastReadAt: new Date(),
      permissions: ['send_messages'],
      aiPersonaData: {
        personaId: 'ai-1',
        type: 'travel_assistant',
        capabilities: ['recommendations'],
        learningModel: 'gpt-4',
        confidenceThreshold: 0.8
      }
    }
  ];

  const mockRoom = {
    id: 'room-1',
    name: 'Test Room',
    participants: mockParticipants,
    type: 'group',
    status: 'active',
    settings: {},
    lastMessageAt: new Date(),
    metadata: {},
    travelPlanId: null,
    scheduledFor: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    (useChat as jest.Mock).mockReturnValue({
      room: mockRoom,
      typingUsers: []
    });
  });

  it('renders participant list correctly with role-based sorting', () => {
    render(<ParticipantsList roomId="room-1" />);

    const participantElements = screen.getAllByTestId(/participant-/);
    
    // Verify correct number of participants
    expect(participantElements).toHaveLength(mockParticipants.length);
    
    // Verify sorting (owner should be first)
    const firstParticipant = within(participantElements[0]).getByText(/Room Owner/);
    expect(firstParticipant).toBeInTheDocument();
  });

  it('displays correct role indicators and styling', () => {
    render(<ParticipantsList roomId="room-1" />);

    // Check owner role indicator
    const ownerElement = screen.getByTestId('participant-owner-1');
    expect(ownerElement).toHaveStyle({
      fontWeight: '700',
      color: expect.stringContaining('#1A73E8')
    });

    // Check AI persona styling
    const aiElement = screen.getByTestId('participant-ai-1');
    expect(aiElement).toHaveStyle({
      fontStyle: 'italic'
    });
  });

  it('handles online status indicators correctly', async () => {
    const onlineParticipants = ['owner-1', 'ai-1'];
    (useChat as jest.Mock).mockReturnValue({
      room: mockRoom,
      typingUsers: [],
      onlineParticipants: new Set(onlineParticipants)
    });

    render(<ParticipantsList roomId="room-1" />);

    // Verify online status indicators
    for (const userId of onlineParticipants) {
      const participant = screen.getByTestId(`participant-${userId}`);
      const statusIndicator = within(participant).getByRole('presentation');
      expect(statusIndicator).toHaveStyle({
        backgroundColor: expect.stringContaining('#0F9D58')
      });
    }
  });

  it('shows typing indicators for active participants', async () => {
    (useChat as jest.Mock).mockReturnValue({
      room: mockRoom,
      typingUsers: ['member-1']
    });

    render(<ParticipantsList roomId="room-1" />);

    // Verify typing indicator
    const typingIndicator = screen.getByText('typing...');
    expect(typingIndicator).toBeInTheDocument();
    expect(typingIndicator).toHaveStyle({
      animation: expect.stringContaining('pulse')
    });
  });

  it('handles participant click events', async () => {
    const onParticipantClick = jest.fn();
    render(
      <ParticipantsList 
        roomId="room-1" 
        onParticipantClick={onParticipantClick}
      />
    );

    // Click a participant
    const participant = screen.getByTestId('participant-member-1');
    fireEvent.click(participant);

    // Verify click handler was called with correct participant
    expect(onParticipantClick).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'member-1'
      })
    );
  });

  it('maintains performance with large participant lists', async () => {
    // Generate large participant list
    const largeParticipantList = Array.from({ length: 1000 }, (_, i) => ({
      ...mockParticipants[1],
      userId: `member-${i}`,
      name: `Member ${i}`
    }));

    (useChat as jest.Mock).mockReturnValue({
      room: { ...mockRoom, participants: largeParticipantList },
      typingUsers: []
    });

    const startTime = performance.now();
    render(<ParticipantsList roomId="room-1" />);
    const renderTime = performance.now() - startTime;

    // Verify render time is acceptable (under 100ms)
    expect(renderTime).toBeLessThan(100);

    // Verify list virtualization
    const participantElements = screen.getAllByTestId(/participant-/);
    expect(participantElements.length).toBeLessThanOrEqual(50);
  });

  it('implements proper accessibility features', () => {
    render(<ParticipantsList roomId="room-1" />);

    // Verify ARIA roles and labels
    expect(screen.getByRole('list')).toHaveAttribute('aria-label', 'Chat participants');

    // Verify participant accessibility labels
    const ownerParticipant = screen.getByTestId('participant-owner-1');
    expect(ownerParticipant).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Room Owner - owner')
    );
  });

  it('handles empty or loading states gracefully', () => {
    // Test loading state
    (useChat as jest.Mock).mockReturnValue({
      room: null,
      typingUsers: []
    });

    const { container } = render(<ParticipantsList roomId="room-1" />);
    expect(container).toBeEmptyDOMElement();

    // Test empty participant list
    (useChat as jest.Mock).mockReturnValue({
      room: { ...mockRoom, participants: [] },
      typingUsers: []
    });

    render(<ParticipantsList roomId="room-1" />);
    expect(screen.queryByTestId(/participant-/)).not.toBeInTheDocument();
  });
});