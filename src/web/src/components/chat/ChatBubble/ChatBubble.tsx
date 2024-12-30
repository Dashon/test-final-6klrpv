/**
 * ChatBubble Component
 * Version: 1.0.0
 * 
 * A React component that renders individual chat messages with support for:
 * - Multiple message types (text, AI responses, system messages, travel plans)
 * - Real-time status updates
 * - Accessibility features
 * - Responsive design
 * - Interactive features (reply, delete, retry)
 */

import React, { memo, useCallback } from 'react';
import styled, { keyframes } from '@emotion/styled';
import { format } from 'date-fns';
import { ChatMessage, MessageType, MessageStatus } from '../../types/chat';
import { colors, typography, spacing, shadows } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';

// Animation for message appearance
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Styled components with proper TypeScript interfaces
interface BubbleContainerProps {
  isOwnMessage: boolean;
  messageType: MessageType;
}

const BubbleContainer = styled.div<BubbleContainerProps>`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.isOwnMessage ? 'flex-end' : 'flex-start'};
  margin: ${spacing.sm}px 0;
  max-width: 70%;
  animation: ${fadeIn} 0.3s ease-in-out;
  position: relative;

  @media (max-width: 768px) {
    max-width: 85%;
  }
`;

interface MessageContentProps {
  messageType: MessageType;
  isOwnMessage: boolean;
  status: MessageStatus;
}

const MessageContent = styled.div<MessageContentProps>`
  background-color: ${props => getBackgroundColor(props)};
  color: ${props => getTextColor(props)};
  border-radius: 12px;
  padding: ${spacing.sm}px;
  box-shadow: ${shadows.sm};
  font-family: ${typography.fontFamilyUI};
  font-size: ${typography.fontSizeBody};
  line-height: 1.5;
  word-break: break-word;
  transition: all 0.2s ease-in-out;
  opacity: ${props => props.status === MessageStatus.FAILED ? 0.7 : 1};

  ${props => props.isOwnMessage ? `
    border-bottom-right-radius: 4px;
  ` : `
    border-bottom-left-radius: 4px;
  `}
`;

const MessageTime = styled.span`
  font-size: ${typography.fontSizeSmall};
  color: ${colors.textSecondary};
  margin-top: 4px;
  opacity: 0.8;
`;

const MessageStatus = styled.span<{ status: MessageStatus }>`
  font-size: 12px;
  margin-left: 4px;
  color: ${props => getStatusColor(props.status)};
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: ${colors.primary};
  font-size: ${typography.fontSizeSmall};
  padding: 4px 8px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease-in-out;

  ${BubbleContainer}:hover & {
    opacity: 1;
  }

  &:hover {
    text-decoration: underline;
  }
`;

// Helper functions for styling
const getBackgroundColor = (props: MessageContentProps): string => {
  if (props.isOwnMessage) {
    return colors.primary;
  }
  switch (props.messageType) {
    case MessageType.AI_RESPONSE:
      return colors.secondaryLight;
    case MessageType.SYSTEM:
      return colors.backgroundSecondary;
    case MessageType.TRAVEL_PLAN:
      return colors.successLight;
    default:
      return colors.backgroundPrimary;
  }
};

const getTextColor = (props: MessageContentProps): string => {
  if (props.isOwnMessage || props.messageType === MessageType.AI_RESPONSE) {
    return colors.backgroundPrimary;
  }
  return colors.textPrimary;
};

const getStatusColor = (status: MessageStatus): string => {
  switch (status) {
    case MessageStatus.DELIVERED:
      return colors.success;
    case MessageStatus.FAILED:
      return colors.error;
    case MessageStatus.PENDING:
      return colors.warning;
    default:
      return colors.textSecondary;
  }
};

// Format message time with memoization
const formatMessageTime = (timestamp: Date): string => {
  return format(timestamp, 'HH:mm');
};

// Props interface
interface ChatBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  onReply?: (message: ChatMessage) => void;
  onDelete?: (messageId: string) => void;
  onRetry?: (messageId: string) => void;
  className?: string;
}

// Memoized component
const ChatBubble: React.FC<ChatBubbleProps> = memo(({
  message,
  isOwnMessage,
  onReply,
  onDelete,
  onRetry,
  className
}) => {
  const { user } = useAuth();

  // Handlers with useCallback
  const handleReply = useCallback(() => {
    onReply?.(message);
  }, [message, onReply]);

  const handleDelete = useCallback(() => {
    onDelete?.(message.id);
  }, [message.id, onDelete]);

  const handleRetry = useCallback(() => {
    onRetry?.(message.id);
  }, [message.id, onRetry]);

  return (
    <BubbleContainer
      isOwnMessage={isOwnMessage}
      messageType={message.type}
      className={className}
      role="listitem"
      aria-label={`Message from ${isOwnMessage ? 'you' : 'other'}`}
    >
      <MessageContent
        messageType={message.type}
        isOwnMessage={isOwnMessage}
        status={message.status}
      >
        {message.content.text}
        {message.content.travelData && (
          <div aria-label="Travel plan details">
            {/* Travel plan specific content rendering */}
            {message.content.travelData.destination && (
              <strong>Destination: {message.content.travelData.destination}</strong>
            )}
          </div>
        )}
      </MessageContent>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <MessageTime>
          {formatMessageTime(message.createdAt)}
        </MessageTime>
        <MessageStatus status={message.status}>
          {message.status.toLowerCase()}
        </MessageStatus>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        {onReply && (
          <ActionButton
            onClick={handleReply}
            aria-label="Reply to message"
          >
            Reply
          </ActionButton>
        )}
        {isOwnMessage && onDelete && (
          <ActionButton
            onClick={handleDelete}
            aria-label="Delete message"
          >
            Delete
          </ActionButton>
        )}
        {message.status === MessageStatus.FAILED && onRetry && (
          <ActionButton
            onClick={handleRetry}
            aria-label="Retry sending message"
          >
            Retry
          </ActionButton>
        )}
      </div>
    </BubbleContainer>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return (
    prevProps.message.content.text === nextProps.message.content.text &&
    prevProps.message.status === nextProps.message.status &&
    prevProps.isOwnMessage === nextProps.isOwnMessage
  );
});

ChatBubble.displayName = 'ChatBubble';

export default ChatBubble;