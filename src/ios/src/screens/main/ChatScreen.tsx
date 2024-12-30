/**
 * ChatScreen Component for iOS
 * Implements real-time messaging with AI and human participants
 * @version 1.0.0
 */

import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Keyboard,
  KeyboardAvoidingView
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import analytics from '@react-native-firebase/analytics';
import { useNetworkState } from '@react-native-community/netinfo';
import * as Haptics from 'expo-haptics';

// Internal imports
import ChatBubble from '../../components/chat/ChatBubble';
import ChatInput from '../../components/chat/ChatInput';
import ParticipantsList from '../../components/chat/ParticipantsList';
import { useChat } from '../../hooks/useChat';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/layout';
import { ChatMessage, MessageType } from '../../types/chat';

// Constants
const BATCH_SIZE = 20;
const KEYBOARD_OFFSET = Platform.select({ ios: 90, default: 0 });

/**
 * Props interface for ChatScreen
 */
interface ChatScreenProps {
  route: RouteProp<{
    Chat: {
      roomId: string;
    };
  }, 'Chat'>;
  navigation: any;
}

/**
 * ChatScreen component providing real-time messaging functionality
 */
export const ChatScreen: React.FC<ChatScreenProps> = ({ route, navigation }) => {
  // Refs
  const messageListRef = useRef<FlatList>(null);
  const isRefreshing = useRef(false);

  // Network state
  const networkState = useNetworkState();

  // Chat hook with enhanced features
  const {
    messages,
    sendMessage,
    isTyping,
    handleTyping,
    connectionStatus,
    performanceMetrics
  } = useChat(route.params.roomId, {
    enableOfflineSupport: true,
    enableTypingIndicator: true,
    monitorPerformance: true
  });

  /**
   * Analytics tracking for screen view
   */
  useEffect(() => {
    analytics().logScreenView({
      screen_name: 'ChatScreen',
      screen_class: 'ChatScreen'
    });
  }, []);

  /**
   * Handles message press with haptic feedback
   */
  const handleMessagePress = useCallback(async (message: ChatMessage) => {
    await Haptics.selectionAsync();

    if (message.type === MessageType.TRAVEL_PLAN) {
      navigation.navigate('TravelPlanDetails', {
        planId: message.content.metadata?.planId
      });
    }
  }, [navigation]);

  /**
   * Handles participant press with accessibility
   */
  const handleParticipantPress = useCallback((participant: any) => {
    Haptics.selectionAsync();
    navigation.navigate('ParticipantProfile', {
      participantId: participant.userId
    });
  }, [navigation]);

  /**
   * Scrolls to bottom of message list
   */
  const scrollToBottom = useCallback(() => {
    if (messageListRef.current && messages.length > 0) {
      messageListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  /**
   * Handles pull-to-refresh
   */
  const handleRefresh = useCallback(async () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;

    try {
      // Implement refresh logic
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      isRefreshing.current = false;
    }
  }, []);

  /**
   * Renders individual message items
   */
  const renderMessage = useCallback(({ item: message }: { item: ChatMessage }) => (
    <ChatBubble
      message={message}
      isOwnMessage={message.senderId === 'currentUser'} // Replace with actual user ID
      onPress={handleMessagePress}
      accessibilityLabel={`Message from ${message.senderId}: ${message.content.text}`}
    />
  ), [handleMessagePress]);

  /**
   * Memoized key extractor for message list
   */
  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  /**
   * Render loading state
   */
  if (!messages) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={colors.primary.default}
            accessibilityLabel="Loading chat messages"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={KEYBOARD_OFFSET}
      >
        {!networkState.isConnected && (
          <View style={styles.offlineIndicator}>
            <Text>You are currently offline</Text>
          </View>
        )}

        <View style={styles.participantsContainer}>
          <ParticipantsList
            roomId={route.params.roomId}
            onParticipantPress={handleParticipantPress}
          />
        </View>

        <FlatList
          ref={messageListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          style={styles.messageList}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
          initialNumToRender={BATCH_SIZE}
          maxToRenderPerBatch={BATCH_SIZE}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing.current}
              onRefresh={handleRefresh}
              tintColor={colors.primary.default}
              style={styles.refreshControl}
            />
          }
          accessibilityLabel="Chat messages"
          accessibilityRole="list"
        />

        <ChatInput
          roomId={route.params.roomId}
          onTyping={handleTyping}
          disabled={!networkState.isConnected}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/**
 * Styles optimized with StyleSheet
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary
  },
  keyboardAvoidingView: {
    flex: 1
  },
  messageList: {
    flex: 1,
    paddingHorizontal: spacing.medium
  },
  participantsContainer: {
    maxHeight: 100,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.default
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  offlineIndicator: {
    backgroundColor: colors.error.background,
    padding: spacing.small,
    alignItems: 'center'
  },
  refreshControl: {
    tintColor: colors.primary.default
  }
});

export default ChatScreen;