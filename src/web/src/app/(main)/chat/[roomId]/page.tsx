'use client';

import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import styled from '@emotion/styled';
import { useVirtualizer } from '@tanstack/react-virtual';
import ChatBubble from '../../../components/chat/ChatBubble/ChatBubble';
import ChatInput from '../../../components/chat/ChatInput/ChatInput';
import ParticipantsList from '../../../components/chat/ParticipantsList/ParticipantsList';
import { useChat } from '../../../hooks/useChat';
import { colors, typography, spacing } from '../../../constants/theme';

// Styled components for layout and responsiveness
const ChatContainer = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: ${spacing.md}px;
  height: calc(100vh - 64px);
  padding: ${spacing.md}px;
  background-color: ${colors.backgroundSecondary};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
    height: calc(100vh - 56px);
  }
`;

const MessagesContainer = styled.div`
  display: flex;
  flex-direction: column;
  background-color: ${colors.backgroundPrimary};
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const MessagesList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${spacing.md}px;
  scroll-behavior: smooth;
  will-change: transform;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: ${colors.primary}20;
    border-radius: 3px;
  }
`;

const ConnectionStatus = styled.div<{ quality: string }>`
  position: fixed;
  top: ${spacing.md}px;
  right: ${spacing.md}px;
  padding: ${spacing.xs}px ${spacing.sm}px;
  border-radius: 4px;
  font-size: ${typography.fontSizeSmall};
  background-color: ${props => 
    props.quality === 'optimal' ? colors.successLight :
    props.quality === 'degraded' ? colors.warningLight :
    colors.errorLight
  };
  color: ${colors.textPrimary};
  transition: all 0.3s ease;
  z-index: 100;
`;

// Page props interface
interface PageProps {
  params: {
    roomId: string;
  };
}

// Main chat room component
const ChatRoomPage: React.FC<PageProps> = ({ params }) => {
  const { roomId } = params;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    room,
    sendMessage,
    markAsRead,
    setTyping,
    typingUsers,
    connectionQuality,
    hasOfflineMessages,
    retryFailedMessages
  } = useChat(roomId);

  // Virtual list configuration for performance
  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => 80, []),
    overscan: 5
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Mark messages as read when visible
  useEffect(() => {
    const unreadMessages = messages
      .filter(msg => !msg.readBy?.includes(localStorage.getItem('userId') || ''))
      .map(msg => msg.id);

    if (unreadMessages.length > 0) {
      markAsRead(unreadMessages);
    }
  }, [messages, markAsRead]);

  // Retry failed messages when connection improves
  useEffect(() => {
    if (connectionQuality === 'optimal' && hasOfflineMessages) {
      retryFailedMessages();
    }
  }, [connectionQuality, hasOfflineMessages, retryFailedMessages]);

  // Memoized message handler for performance
  const handleMessageSend = useCallback(async (content: string) => {
    try {
      await sendMessage({
        text: content,
        metadata: {},
        attachments: [],
        travelData: null
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [sendMessage]);

  // Render typing indicators
  const renderTypingIndicator = useMemo(() => {
    if (typingUsers.length === 0) return null;
    
    const typingText = typingUsers.length === 1
      ? `${typingUsers[0]} is typing...`
      : `${typingUsers.length} people are typing...`;

    return (
      <div style={{ 
        padding: spacing.sm,
        color: colors.textSecondary,
        fontSize: typography.fontSizeSmall
      }}>
        {typingText}
      </div>
    );
  }, [typingUsers]);

  if (!room) {
    return <div>Loading...</div>;
  }

  return (
    <ChatContainer>
      <MessagesContainer>
        <MessagesList ref={parentRef}>
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative'
            }}
          >
            {rowVirtualizer.getVirtualItems().map(virtualRow => {
              const message = messages[virtualRow.index];
              return (
                <div
                  key={message.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`
                  }}
                >
                  <ChatBubble
                    message={message}
                    isOwnMessage={message.senderId === localStorage.getItem('userId')}
                  />
                </div>
              );
            })}
          </div>
          {renderTypingIndicator}
          <div ref={messagesEndRef} />
        </MessagesList>
        <ChatInput
          roomId={roomId}
          disabled={connectionQuality === 'poor'}
          onTypingStart={() => setTyping(true)}
          onTypingEnd={() => setTyping(false)}
        />
      </MessagesContainer>
      <ParticipantsList roomId={roomId} />
      <ConnectionStatus quality={connectionQuality}>
        {connectionQuality === 'optimal' ? 'Connected' :
         connectionQuality === 'degraded' ? 'Slow Connection' :
         'Poor Connection'}
      </ConnectionStatus>
    </ChatContainer>
  );
};

export default ChatRoomPage;