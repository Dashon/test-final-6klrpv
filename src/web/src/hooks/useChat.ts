/**
 * useChat Hook
 * Version: 1.0.0
 * 
 * Enterprise-grade React hook for managing real-time chat functionality with:
 * - Mixed human/AI conversations
 * - Offline message queueing
 * - Connection quality monitoring
 * - Optimistic updates
 * - <200ms latency target
 * 
 * @packageDocumentation
 */

import { useCallback, useEffect, useState, useRef } from 'react'; // ^18.2.0
import { useDispatch, useSelector } from 'react-redux'; // ^8.1.0
import { debounce } from 'lodash'; // ^4.17.21

import {
  IChatMessage,
  IChatRoom,
  MessageType,
  MessageStatus,
  RoomType,
  IMessageContent,
  NetworkQuality
} from '../types/chat';

import { ChatService } from '../services/chat';
import {
  chatActions,
  chatSelectors,
  selectConnectionQuality,
  selectRoomMessages,
  selectMessageQueue
} from '../store/slices/chatSlice';

// Constants for chat operations
const TYPING_DEBOUNCE_MS = 1000;
const MESSAGE_BATCH_SIZE = 50;
const CONNECTION_QUALITY_CHECK_INTERVAL = 5000;
const MESSAGE_RETRY_ATTEMPTS = 3;
const OFFLINE_QUEUE_MAX_SIZE = 100;

/**
 * Custom hook for managing real-time chat functionality
 * @param roomId - The ID of the chat room to connect to
 */
export const useChat = (roomId: string) => {
  const dispatch = useDispatch();
  const chatServiceRef = useRef<ChatService>(new ChatService());
  
  // Local state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [hasOfflineMessages, setHasOfflineMessages] = useState(false);

  // Redux selectors
  const messages = useSelector((state) => selectRoomMessages(state, roomId));
  const connectionQuality = useSelector(selectConnectionQuality);
  const messageQueue = useSelector(selectMessageQueue);
  const room = useSelector((state) => state.chat.rooms[roomId]);

  /**
   * Initialize chat room and event listeners
   */
  useEffect(() => {
    const chatService = chatServiceRef.current;
    setIsLoading(true);

    const initializeRoom = async () => {
      try {
        await chatService.joinRoom(roomId);
        dispatch(chatActions.setActiveRoom(roomId));
        setIsLoading(false);
      } catch (err) {
        setError((err as Error).message);
        setIsLoading(false);
      }
    };

    // Set up event listeners
    chatService.on('message:received', handleMessageReceived);
    chatService.on('typing:update', handleTypingUpdate);
    chatService.on('connection:quality', handleConnectionQualityChange);

    initializeRoom();

    // Cleanup function
    return () => {
      chatService.off('message:received', handleMessageReceived);
      chatService.off('typing:update', handleTypingUpdate);
      chatService.off('connection:quality', handleConnectionQualityChange);
    };
  }, [roomId, dispatch]);

  /**
   * Handle received messages and update state
   */
  const handleMessageReceived = useCallback((message: IChatMessage) => {
    if (message.roomId === roomId) {
      dispatch(chatActions.addMessage(message));
      if (message.status === MessageStatus.DELIVERED) {
        dispatch(chatActions.removeMessageFromQueue(message.id));
      }
    }
  }, [roomId, dispatch]);

  /**
   * Handle typing indicator updates
   */
  const handleTypingUpdate = useCallback((data: { userId: string; isTyping: boolean }) => {
    setTypingUsers(current => {
      if (data.isTyping) {
        return [...new Set([...current, data.userId])];
      }
      return current.filter(id => id !== data.userId);
    });
  }, []);

  /**
   * Monitor and handle connection quality changes
   */
  const handleConnectionQualityChange = useCallback(({ quality, latency }: { quality: number; latency: number }) => {
    const networkQuality: NetworkQuality = 
      latency < 200 ? 'optimal' :
      latency < 500 ? 'degraded' : 'poor';
    
    dispatch(chatActions.setNetworkQuality(networkQuality));
    
    // Auto-retry messages if connection improves
    if (networkQuality === 'optimal' && messageQueue.length > 0) {
      retryFailedMessages();
    }
  }, [dispatch, messageQueue]);

  /**
   * Send a new message with offline support and optimistic updates
   */
  const sendMessage = useCallback(async (content: IMessageContent) => {
    const chatService = chatServiceRef.current;
    const optimisticMessage: IChatMessage = {
      id: crypto.randomUUID(),
      roomId,
      content,
      status: MessageStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Optimistic update
    dispatch(chatActions.addMessage(optimisticMessage));

    try {
      if (connectionQuality === 'poor') {
        if (messageQueue.length < OFFLINE_QUEUE_MAX_SIZE) {
          dispatch(chatActions.addMessageToQueue(optimisticMessage));
          setHasOfflineMessages(true);
        } else {
          throw new Error('Offline message queue is full');
        }
        return optimisticMessage;
      }

      const sentMessage = await chatService.sendMessage(content, roomId);
      dispatch(chatActions.updateMessageStatus({
        messageId: optimisticMessage.id,
        status: MessageStatus.DELIVERED
      }));
      return sentMessage;
    } catch (err) {
      dispatch(chatActions.updateMessageStatus({
        messageId: optimisticMessage.id,
        status: MessageStatus.FAILED
      }));
      setError((err as Error).message);
      throw err;
    }
  }, [roomId, dispatch, connectionQuality, messageQueue.length]);

  /**
   * Mark messages as read
   */
  const markAsRead = useCallback(async (messageIds: string[]) => {
    const chatService = chatServiceRef.current;
    try {
      await chatService.markMessagesAsRead(roomId, messageIds);
      dispatch(chatActions.updateMessageStatus({
        messageIds,
        status: MessageStatus.READ
      }));
    } catch (err) {
      setError((err as Error).message);
    }
  }, [roomId, dispatch]);

  /**
   * Update typing status with debounce
   */
  const setTyping = useCallback(
    debounce(async (isTyping: boolean) => {
      const chatService = chatServiceRef.current;
      try {
        await chatService.setTypingStatus(roomId, isTyping);
      } catch (err) {
        console.error('Failed to update typing status:', err);
      }
    }, TYPING_DEBOUNCE_MS),
    [roomId]
  );

  /**
   * Retry failed messages
   */
  const retryFailedMessages = useCallback(async () => {
    const failedMessages = messageQueue.filter(msg => msg.status === MessageStatus.FAILED);
    for (const message of failedMessages) {
      try {
        await sendMessage(message.content);
        dispatch(chatActions.removeMessageFromQueue(message.id));
      } catch (err) {
        console.error('Failed to retry message:', err);
      }
    }
    setHasOfflineMessages(messageQueue.length > 0);
  }, [messageQueue, sendMessage, dispatch]);

  return {
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
  };
};

export default useChat;