'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { VariableSizeList as VirtualList } from 'react-window';
import { useIntersectionObserver } from 'react-intersection-observer';

import ChatBubble from '../../../components/chat/ChatBubble/ChatBubble';
import ChatInput from '../../../components/chat/ChatInput/ChatInput';
import ParticipantsList from '../../../components/chat/ParticipantsList/ParticipantsList';
import { useChat } from '../../../hooks/useChat';
import { colors, spacing, breakpoints } from '../../../constants/theme';

// Constants for chat functionality
const MESSAGES_BATCH_SIZE = 50;
const SCROLL_THRESHOLD = 100;
const MESSAGE_HEIGHT = 80;
const RETRY_INTERVAL = 3000;

// Styled components
const ChatContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: ${spacing.md}px;
  height: calc(100vh - 64px);
  padding: ${spacing.md}px;
  background-color: ${colors.backgroundSecondary};

  @media (max-width: ${breakpoints.tablet}px) {
    grid-template-columns: 1fr;
  }
`;

const MessagesContainer = styled.div`
  display: flex;
  flex-direction: column;
  background-color: ${colors.backgroundPrimary};
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const MessagesList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${spacing.md}px;
  scroll-behavior: smooth;
`;

const NetworkIndicator = styled.div<{ quality: 'optimal' | 'degraded' | 'poor' }>`
  position: fixed;
  top: 16px;
  right: 16px;
  padding: 8px 16px;
  border-radius: 4px;
  background-color: ${({ quality }) => 
    quality === 'optimal' ? colors.success :
    quality === 'degraded' ? colors.warning :
    colors.error
  };
  color: ${colors.backgroundPrimary};
  font-size: 14px;
  transition: all 0.3s ease;
  z-index: 1000;
`;

const ChatPage: React.FC = () => {
  // Chat hook integration
  const {
    messages,
    room,
    sendMessage,
    markAsRead,
    setTyping,
    typingUsers,
    isLoading,
    error,
    connectionQuality,
    hasOfflineMessages,
    retryFailedMessages
  } = useChat('default-room'); // Replace with actual room ID logic

  // Refs and state
  const listRef = useRef<VirtualList>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

  // Intersection observer for infinite scroll
  const { ref: topRef, inView: isTopVisible } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px'
  });

  // Load more messages when reaching the top
  useEffect(() => {
    if (isTopVisible && hasMoreMessages && !isLoading) {
      // Implement loading more messages logic here
      setHasMoreMessages(false); // Update based on actual data
    }
  }, [isTopVisible, hasMoreMessages, isLoading]);

  // Auto-retry failed messages
  useEffect(() => {
    let retryTimer: NodeJS.Timeout;
    if (hasOfflineMessages && connectionQuality === 'optimal') {
      retryTimer = setInterval(retryFailedMessages, RETRY_INTERVAL);
    }
    return () => clearInterval(retryTimer);
  }, [hasOfflineMessages, connectionQuality, retryFailedMessages]);

  // Handle message sending
  const handleSendMessage = useCallback(async (content: string) => {
    try {
      await sendMessage({ text: content, metadata: {}, attachments: [], travelData: null });
      if (listRef.current && autoScrollEnabled) {
        listRef.current.scrollToItem(messages.length - 1);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [sendMessage, messages.length, autoScrollEnabled]);

  // Handle scroll
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const isNearBottom = 
      target.scrollHeight - target.scrollTop - target.clientHeight < SCROLL_THRESHOLD;
    
    setIsAtBottom(isNearBottom);
    setAutoScrollEnabled(isNearBottom);

    // Mark messages as read when scrolling
    const visibleMessages = messages
      .filter(msg => !msg.readBy?.includes('current-user-id')) // Replace with actual user ID
      .map(msg => msg.id);
    
    if (visibleMessages.length > 0) {
      markAsRead(visibleMessages);
    }
  }, [messages, markAsRead]);

  // Virtual list row renderer
  const renderMessage = useCallback(({ index, style }) => {
    const message = messages[index];
    const isOwnMessage = message.senderId === 'current-user-id'; // Replace with actual user ID

    return (
      <div style={style}>
        <ChatBubble
          message={message}
          isOwnMessage={isOwnMessage}
          onRetry={retryFailedMessages}
        />
      </div>
    );
  }, [messages, retryFailedMessages]);

  // Calculate message heights for virtual list
  const getMessageHeight = useCallback((index: number) => {
    const message = messages[index];
    const baseHeight = MESSAGE_HEIGHT;
    const contentLength = message.content.text.length;
    const lines = Math.ceil(contentLength / 50); // Approximate characters per line
    return baseHeight * lines;
  }, [messages]);

  if (error) {
    return (
      <div role="alert" className="error-container">
        Error loading chat: {error}
      </div>
    );
  }

  return (
    <ChatContainer>
      <MessagesContainer>
        <MessagesList onScroll={handleScroll}>
          <div ref={topRef} />
          <VirtualList
            ref={listRef}
            height={window.innerHeight - 200} // Adjust based on layout
            width="100%"
            itemCount={messages.length}
            itemSize={getMessageHeight}
            overscanCount={5}
          >
            {renderMessage}
          </VirtualList>
        </MessagesList>
        
        <ChatInput
          roomId={room?.id || ''}
          disabled={connectionQuality === 'poor'}
          onTypingStart={() => setTyping(true)}
          onTypingEnd={() => setTyping(false)}
        />
      </MessagesContainer>

      <ParticipantsList
        roomId={room?.id || ''}
        onParticipantClick={(participant) => {
          // Implement participant click handling
          console.log('Participant clicked:', participant);
        }}
      />

      <NetworkIndicator quality={connectionQuality}>
        {connectionQuality === 'optimal' ? 'Connected' :
         connectionQuality === 'degraded' ? 'Slow Connection' :
         'Poor Connection'}
      </NetworkIndicator>
    </ChatContainer>
  );
};

export default ChatPage;