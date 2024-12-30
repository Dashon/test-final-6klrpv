/**
 * @fileoverview Main chat screen component for Android app
 * @version 1.0.0
 * 
 * Implements real-time messaging with support for:
 * - Human and AI persona interactions
 * - Offline capabilities
 * - Message history with pagination
 * - Participant management
 * - Optimized performance
 */

import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  AccessibilityInfo,
  Text
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';

// Internal components
import ChatBubble from '../../components/chat/ChatBubble';
import ChatInput from '../../components/chat/ChatInput';
import ParticipantsList from '../../components/chat/ParticipantsList';

// Hooks and services
import { useChat } from '../../hooks/useChat';

// Types and interfaces
import { ChatMessage, MessageType } from '../../types/chat';

interface ChatScreenParams {
  roomId: string;
  title: string;
  isAIEnabled?: boolean;
}

/**
 * Main chat screen component with optimized performance and offline support
 */
const ChatScreen: React.FC = () => {
  // Navigation and route
  const route = useRoute();
  const navigation = useNavigation();
  const { roomId, title, isAIEnabled } = route.params as ChatScreenParams;

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const lastMessageRef = useRef<string | null>(null);

  // Chat hook with all messaging functionality
  const {
    messages,
    loading,
    sendMessage,
    loadMoreMessages,
    isOffline,
    typingParticipants,
    setTyping,
    connectionState,
    offlineStatus,
    error
  } = useChat(roomId, isAIEnabled ? {
    personaId: 'default_ai',
    modelConfig: {},
    learningEnabled: true
  } : undefined);

  // Screen focus handling
  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        title,
        headerRight: () => (
          <ParticipantsList
            roomId={roomId}
            onParticipantPress={(participant) => {
              // Handle participant press
            }}
            typingParticipants={typingParticipants}
          />
        ),
      });

      // Mark messages as read when screen is focused
      if (messages.length > 0) {
        const unreadMessages = messages.filter(msg => !msg.readBy.includes('currentUserId'));
        if (unreadMessages.length > 0) {
          // Update read status
        }
      }
    }, [navigation, title, messages, typingParticipants])
  );

  /**
   * Handles sending new messages with offline support
   */
  const handleMessageSend = useCallback(async (content: string) => {
    try {
      await sendMessage({
        text: content,
        metadata: {},
        attachments: []
      }, {
        type: MessageType.TEXT
      });

      // Scroll to bottom after sending
      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Show error toast
    }
  }, [sendMessage]);

  /**
   * Handles loading more messages with optimized pagination
   */
  const handleLoadMore = useCallback(async () => {
    if (loading || !messages.length) return;

    try {
      await loadMoreMessages();
    } catch (error) {
      console.error('Failed to load more messages:', error);
    }
  }, [loading, messages.length, loadMoreMessages]);

  /**
   * Manages typing indicator states
   */
  const handleTypingIndicator = useCallback((isTyping: boolean) => {
    setTyping(isTyping);
  }, [setTyping]);

  /**
   * Renders individual chat messages with optimizations
   */
  const renderMessage = useCallback(({ item: message }: { item: ChatMessage }) => {
    const isCurrentUser = message.senderId === 'currentUserId';
    const isAIPersona = message.type === MessageType.AI_RESPONSE;

    return (
      <ChatBubble
        message={message}
        isCurrentUser={isCurrentUser}
        isAIPersona={isAIPersona}
        accessibility={{
          label: `Message from ${isCurrentUser ? 'you' : isAIPersona ? 'AI Assistant' : 'other user'}`,
          hint: 'Double tap to interact with message'
        }}
      />
    );
  }, []);

  /**
   * Memoized message key extractor
   */
  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  /**
   * Renders offline indicator when connection is lost
   */
  const renderOfflineIndicator = useMemo(() => {
    if (!isOffline) return null;

    return (
      <View style={styles.offlineIndicator}>
        <Text>You're offline. Messages will be sent when connection is restored.</Text>
      </View>
    );
  }, [isOffline]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {renderOfflineIndicator}
        
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          style={styles.messageList}
          inverted
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 0
          }}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={handleLoadMore}
              progressViewOffset={60}
            />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          accessibilityRole="list"
          accessibilityLabel="Chat messages"
        />

        <View style={styles.inputContainer}>
          <ChatInput
            roomId={roomId}
            onMessageSent={handleMessageSend}
            isOffline={isOffline}
            onTypingStart={() => handleTypingIndicator(true)}
            onTypingEnd={() => handleTypingIndicator(false)}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  messageList: {
    flex: 1,
    paddingHorizontal: 16
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    paddingBottom: Platform.select({ ios: 0, android: 4 })
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  offlineIndicator: {
    backgroundColor: '#FFE58F',
    padding: 8,
    alignItems: 'center'
  }
});

export default ChatScreen;