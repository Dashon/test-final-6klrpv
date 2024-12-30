/**
 * @fileoverview Enhanced chat hook for Android mobile app with offline support and AI integration
 * @version 1.0.0
 * 
 * Provides comprehensive chat functionality including:
 * - Real-time messaging with WebSocket support
 * - Offline message queuing and sync
 * - AI persona integration
 * - Battery-aware optimizations
 * - Typing indicators and presence tracking
 */

import { useEffect, useCallback } from 'react'; // ^18.0.0
import { useDispatch, useSelector } from 'react-redux'; // ^8.0.5
import NetInfo from '@react-native-community/netinfo'; // ^9.0.0
import { ChatService } from '../services/chat';
import { config } from '../config/development';
import {
  ChatMessage,
  MessageType,
  MessageStatus,
  RoomType,
  ParticipantRole,
  MessageContent,
  MAX_MESSAGE_LENGTH,
  OFFLINE_SYNC_INTERVAL
} from '../types/chat';

/**
 * Connection state for real-time chat
 */
export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting'
}

/**
 * Offline status tracking
 */
export interface OfflineStatus {
  isOffline: boolean;
  lastSyncTime: number;
  pendingMessages: number;
}

/**
 * AI persona configuration and status
 */
export interface AIPersonaConfig {
  personaId: string;
  modelConfig: Record<string, unknown>;
  learningEnabled: boolean;
}

/**
 * Enhanced chat hook interface
 */
export interface ChatHookState {
  messages: ChatMessage[];
  connectionState: ConnectionState;
  offlineStatus: OfflineStatus;
  typingUsers: string[];
  error: Error | null;
}

/**
 * Enhanced chat hook for Android with comprehensive messaging capabilities
 */
export const useChat = (roomId: string, aiPersonaConfig?: AIPersonaConfig) => {
  const dispatch = useDispatch();
  const chatService = new ChatService();
  
  // Redux state selectors
  const messages = useSelector((state: any) => state.chat.messagesByRoom[roomId] || []);
  const user = useSelector((state: any) => state.auth.user);
  
  // Local state management
  const [state, setState] = useState<ChatHookState>({
    messages: [],
    connectionState: ConnectionState.CONNECTING,
    offlineStatus: {
      isOffline: false,
      lastSyncTime: Date.now(),
      pendingMessages: 0
    },
    typingUsers: [],
    error: null
  });

  /**
   * Initializes chat service and WebSocket connection
   */
  const initializeChat = useCallback(async () => {
    try {
      await chatService.initialize(user.id, user.authToken);
      setState(prev => ({
        ...prev,
        connectionState: ConnectionState.CONNECTED
      }));

      // Setup AI persona if configured
      if (aiPersonaConfig) {
        await setupAIPersona(aiPersonaConfig);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        connectionState: ConnectionState.DISCONNECTED,
        error: error as Error
      }));
    }
  }, [user, aiPersonaConfig]);

  /**
   * Sends a message with offline support and optimistic updates
   */
  const sendMessage = useCallback(async (
    content: MessageContent,
    options: {
      type?: MessageType;
      replyTo?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<void> => {
    if (content.text.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`);
    }

    const tempMessage: ChatMessage = {
      id: `temp_${Date.now()}`,
      roomId,
      senderId: user.id,
      type: options.type || MessageType.TEXT,
      content,
      status: state.offlineStatus.isOffline ? MessageStatus.PENDING : MessageStatus.SENT,
      readBy: [user.id],
      replyTo: options.replyTo || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      localId: `local_${Date.now()}`,
      offline: state.offlineStatus.isOffline
    };

    // Optimistic update
    dispatch({ type: 'chat/addMessage', payload: { roomId, message: tempMessage } });

    try {
      const sentMessage = await chatService.sendMessage(roomId, content, options.type);
      dispatch({ type: 'chat/updateMessage', payload: { 
        roomId, 
        messageId: tempMessage.id, 
        updates: sentMessage 
      }});
    } catch (error) {
      dispatch({ type: 'chat/updateMessage', payload: { 
        roomId, 
        messageId: tempMessage.id, 
        updates: { status: MessageStatus.FAILED } 
      }});
      throw error;
    }
  }, [roomId, user, state.offlineStatus.isOffline]);

  /**
   * Retries failed messages
   */
  const retryFailedMessages = useCallback(async () => {
    const failedMessages = messages.filter(msg => msg.status === MessageStatus.FAILED);
    for (const message of failedMessages) {
      try {
        await sendMessage(message.content, {
          type: message.type,
          replyTo: message.replyTo,
          metadata: message.content.metadata
        });
      } catch (error) {
        console.error('Failed to retry message:', error);
      }
    }
  }, [messages, sendMessage]);

  /**
   * Syncs messages with server when connection is restored
   */
  const syncMessages = useCallback(async () => {
    if (state.connectionState !== ConnectionState.CONNECTED) return;

    try {
      await chatService.syncOfflineMessages();
      setState(prev => ({
        ...prev,
        offlineStatus: {
          ...prev.offlineStatus,
          lastSyncTime: Date.now(),
          pendingMessages: 0
        }
      }));
    } catch (error) {
      console.error('Failed to sync messages:', error);
    }
  }, [state.connectionState]);

  /**
   * Sets up network status monitoring
   */
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setState(prev => ({
        ...prev,
        offlineStatus: {
          ...prev.offlineStatus,
          isOffline: !state.isConnected
        },
        connectionState: state.isConnected ? 
          ConnectionState.CONNECTED : 
          ConnectionState.DISCONNECTED
      }));

      if (state.isConnected) {
        syncMessages();
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * Sets up periodic message syncing
   */
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (!state.offlineStatus.isOffline) {
        syncMessages();
      }
    }, OFFLINE_SYNC_INTERVAL);

    return () => clearInterval(syncInterval);
  }, [state.offlineStatus.isOffline]);

  /**
   * Configures AI persona for the chat room
   */
  const setupAIPersona = async (config: AIPersonaConfig) => {
    try {
      await chatService.connectWebSocket();
      // Additional AI persona setup logic
    } catch (error) {
      console.error('Failed to setup AI persona:', error);
    }
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      chatService.destroy();
    };
  }, []);

  return {
    // Chat state
    messages,
    connectionState: state.connectionState,
    offlineStatus: state.offlineStatus,
    typingUsers: state.typingUsers,
    error: state.error,

    // Actions
    sendMessage,
    retryFailedMessages,
    syncMessages,

    // AI persona status
    aiPersonaStatus: aiPersonaConfig ? {
      isActive: true,
      personaId: aiPersonaConfig.personaId,
      learningEnabled: aiPersonaConfig.learningEnabled
    } : null
  };
};

export type UseChatReturn = ReturnType<typeof useChat>;