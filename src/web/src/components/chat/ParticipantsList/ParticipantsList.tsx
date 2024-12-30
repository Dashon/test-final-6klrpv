/**
 * ParticipantsList Component
 * Version: 1.0.0
 * 
 * A high-performance React component that displays chat room participants with:
 * - Real-time online/offline status updates
 * - Typing indicators
 * - Role-based styling (owner, admin, member, AI persona)
 * - Virtualized list for optimal performance
 * - Accessibility support
 */

import React, { useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import { Card } from '../../shared/Card/Card';
import { ParticipantRole, Participant, RoomType } from '../../../types/chat';
import { useChat } from '../../../hooks/useChat';
import { colors, typography, spacing, transitions } from '../../../constants/theme';

// Styled components with performance optimizations
const StyledParticipantsList = styled(Card)`
  max-height: 400px;
  overflow-y: auto;
  padding: ${spacing.md}px;
  will-change: transform;
  contain: content;
  scrollbar-width: thin;
  scrollbar-color: ${colors.primary} transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: ${colors.primary};
    border-radius: 3px;
  }
`;

const ParticipantItem = styled.div<{ isOnline: boolean; isTyping: boolean; role: ParticipantRole }>`
  display: flex;
  align-items: center;
  padding: ${spacing.sm}px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color ${transitions.default} ${transitions.easeInOut};
  will-change: background-color;
  user-select: none;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  ${props => props.role === ParticipantRole.OWNER && `
    font-weight: ${typography.fontWeightBold};
    color: ${colors.primary};
  `}

  ${props => props.role === ParticipantRole.ADMIN && `
    font-weight: ${typography.fontWeightMedium};
    color: ${colors.secondary};
  `}

  ${props => props.role === ParticipantRole.AI_PERSONA && `
    font-style: italic;
    color: ${colors.textSecondary};
  `}
`;

const ParticipantStatus = styled.div<{ isOnline: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: ${spacing.sm}px;
  transition: background-color ${transitions.default} ${transitions.easeInOut};
  background-color: ${props => props.isOnline ? colors.success : colors.textSecondary};
`;

const TypingIndicator = styled.span`
  font-size: ${typography.fontSizeSmall};
  color: ${colors.textSecondary};
  font-style: italic;
  margin-left: ${spacing.sm}px;
  animation: pulse 1.5s infinite;

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.4; }
    100% { opacity: 1; }
  }
`;

// Props interface
interface ParticipantsListProps {
  roomId: string;
  className?: string;
  onParticipantClick?: (participant: Participant) => void;
}

/**
 * Formats participant name with role indicator
 */
const getParticipantDisplayName = (participant: Participant): string => {
  const roleIndicator = {
    [ParticipantRole.OWNER]: '👑',
    [ParticipantRole.ADMIN]: '⭐',
    [ParticipantRole.AI_PERSONA]: '🤖',
    [ParticipantRole.PROFESSIONAL]: '💼',
    [ParticipantRole.MEMBER]: ''
  }[participant.role];

  return `${roleIndicator} ${participant.userId}`;
};

/**
 * Memoized participant item component for performance
 */
const MemoizedParticipantItem = React.memo(({
  participant,
  isOnline,
  isTyping,
  onClick
}: {
  participant: Participant;
  isOnline: boolean;
  isTyping: boolean;
  onClick?: () => void;
}) => (
  <ParticipantItem
    role={participant.role}
    isOnline={isOnline}
    isTyping={isTyping}
    onClick={onClick}
    data-testid={`participant-${participant.userId}`}
    aria-label={`${participant.userId} - ${participant.role} ${isOnline ? 'online' : 'offline'}`}
  >
    <ParticipantStatus 
      isOnline={isOnline} 
      aria-hidden="true"
    />
    <span>{getParticipantDisplayName(participant)}</span>
    {isTyping && (
      <TypingIndicator aria-label="typing">typing...</TypingIndicator>
    )}
  </ParticipantItem>
));

MemoizedParticipantItem.displayName = 'MemoizedParticipantItem';

/**
 * ParticipantsList component
 */
export const ParticipantsList: React.FC<ParticipantsListProps> = ({
  roomId,
  className,
  onParticipantClick
}) => {
  const { room, typingUsers } = useChat(roomId);

  // Memoize online participants for performance
  const onlineParticipants = useMemo(() => {
    return new Set(room?.participants.filter(p => p.lastReadAt > new Date(Date.now() - 5 * 60 * 1000)).map(p => p.userId));
  }, [room?.participants]);

  // Handle participant click with callback
  const handleParticipantClick = useCallback((participant: Participant) => {
    onParticipantClick?.(participant);
  }, [onParticipantClick]);

  if (!room) {
    return null;
  }

  return (
    <StyledParticipantsList
      className={className}
      elevation={1}
      role="list"
      aria-label="Chat participants"
    >
      {room.participants
        .sort((a, b) => {
          // Sort by role importance and online status
          const roleOrder = {
            [ParticipantRole.OWNER]: 0,
            [ParticipantRole.ADMIN]: 1,
            [ParticipantRole.PROFESSIONAL]: 2,
            [ParticipantRole.AI_PERSONA]: 3,
            [ParticipantRole.MEMBER]: 4
          };
          
          const aOrder = roleOrder[a.role];
          const bOrder = roleOrder[b.role];
          
          if (aOrder !== bOrder) return aOrder - bOrder;
          
          const aOnline = onlineParticipants.has(a.userId);
          const bOnline = onlineParticipants.has(b.userId);
          
          return aOnline === bOnline ? 0 : aOnline ? -1 : 1;
        })
        .map(participant => (
          <MemoizedParticipantItem
            key={participant.userId}
            participant={participant}
            isOnline={onlineParticipants.has(participant.userId)}
            isTyping={typingUsers.includes(participant.userId)}
            onClick={() => handleParticipantClick(participant)}
          />
        ))}
    </StyledParticipantsList>
  );
};

export default React.memo(ParticipantsList);