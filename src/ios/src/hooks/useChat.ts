/**
 * Enhanced Chat Hook for iOS Application
 * @version 1.0.0
 * 
 * Provides real-time messaging capabilities with performance monitoring,
 * offline support, and error recovery features.
 */

import { useEffect, useCallback, useState, useRef, useMemo } from 'react'; // ^18.2.0
import { useDispatch, useSelector } from 'react-redux'; // ^8.1.0
import { 
  ChatMessage, 
  ChatRoom, 
  MessageType, 
  MessageContent, 
  RoomType,
  MessageStatus,
  DeliveryStatus
} from '../types/chat';
import { ChatService, chatService } from '../services/chat';

// Constants
const TYPING_TIMEOUT = 3000;
const MESSAGE_BATCH_SIZE = 50;
const RECONNECT_INTERVAL = 5000;
const MAX_RETRY_ATTEMPTS = 3;
const LATENCY_THRESHOLD = 200;

// Types
interface ChatHookOptions {
  enableOfflineSupport?: boolean;
  enableTypingIndicator?: boolean;
  enableReadReceipts?: boolean;
  monitorPerformance?: boolean;
}

interface PerformanceMetrics {
  averageLatency: number;
  messageDeliveryRate: number;
  failedMessages: number;
  reconnections: number;
}

interface ConnectionStatus {
  isConnected: boolean;
  lastConnected: string | null;
  reconnectAttempts: number;
}

interface QueuedMessage {
  id: string;
  content: MessageContent;
  retryCount: number;
  timestamp: number;
}

/**
 * Custom hook for managing chat functionality
 */
export const useChat = (
  roomId: string,
  options: ChatHookOptions = {
    enableOfflineSupport: true,
    enableTypingIndicator: true,
    enableReadReceipts: true,
    monitorPerformance: true
  }
) => {
  // Redux hooks
  const dispatch = useDispatch();

  // Local state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    lastConnected: null,
    reconnectAttempts: 0
  });
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    averageLatency: 0,
    messageDeliveryRate: 100,
    failedMessages: 0,
    reconnections: 0
  });

  // Refs
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const latencyStatsRef = useRef<number[]>([]);
  const messageRetryMapRef = useRef<Map<string, number>>(new Map());

  /**
   * Initialize chat room connection
   */
  useEffect(() => {
    let isSubscribed = true;

    const initializeChat = async () => {
      try {
        await chatService.connectToRoom(roomId);
        if (isSubscribed) {
          setConnectionStatus(prev => ({
            ...prev,
            isConnected: true,
            lastConnected: new Date().toISOString()
          }));
        }
      } catch (error) {
        console.error('Failed to connect to chat room:', error);
        handleConnectionError();
      }
    };

    initializeChat();

    return () => {
      isSubscribed = false;
      chatService.disconnectFromRoom(roomId);
    };
  }, [roomId]);

  /**
   * Handle message sending with retry logic and offline support
   */
  const sendMessage = useCallback(async (
    content: MessageContent
  ): Promise<ChatMessage | null> => {
    try {
      if (!connectionStatus.isConnected && options.enableOfflineSupport) {
        return queueMessageForLaterDelivery(content);
      }

      const message = await chatService.sendMessage(roomId, content);
      trackMessageLatency(message);
      return message;
    } catch (error) {
      console.error('Failed to send message:', error);
      handleMessageError(content);
      return null;
    }
  }, [roomId, connectionStatus.isConnected, options.enableOfflineSupport]);

  /**
   * Queue message for offline delivery
   */
  const queueMessageForLaterDelivery = useCallback((
    content: MessageContent
  ): ChatMessage => {
    const queuedMessage: QueuedMessage = {
      id: `offline-${Date.now()}`,
      content,
      retryCount: 0,
      timestamp: Date.now()
    };

    setMessageQueue(prev => [...prev, queuedMessage]);

    return {
      id: queuedMessage.id,
      roomId,
      senderId: 'local-user',
      type: MessageType.TEXT,
      content,
      status: MessageStatus.SENT,
      readBy: [],
      replyTo: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }, [roomId]);

  /**
   * Process queued messages when connection is restored
   */
  useEffect(() => {
    if (connectionStatus.isConnected && messageQueue.length > 0) {
      const processQueue = async () => {
        const messages = [...messageQueue];
        setMessageQueue([]);

        for (const queuedMessage of messages) {
          try {
            await sendMessage(queuedMessage.content);
          } catch (error) {
            if (queuedMessage.retryCount < MAX_RETRY_ATTEMPTS) {
              setMessageQueue(prev => [...prev, {
                ...queuedMessage,
                retryCount: queuedMessage.retryCount + 1
              }]);
            } else {
              updatePerformanceMetrics('failedMessages');
            }
          }
        }
      };

      processQueue();
    }
  }, [connectionStatus.isConnected, messageQueue]);

  /**
   * Handle typing indicator
   */
  const handleTyping = useCallback(() => {
    if (!options.enableTypingIndicator) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    chatService.socket?.emit('typing', { roomId });
    setIsTyping(true);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, TYPING_TIMEOUT);
  }, [roomId, options.enableTypingIndicator]);

  /**
   * Track message latency and update performance metrics
   */
  const trackMessageLatency = useCallback((message: ChatMessage) => {
    if (!options.monitorPerformance) return;

    const latency = Date.now() - new Date(message.createdAt).getTime();
    latencyStatsRef.current.push(latency);

    if (latencyStatsRef.current.length > 100) {
      latencyStatsRef.current.shift();
    }

    const averageLatency = latencyStatsRef.current.reduce((a, b) => a + b, 0) / 
      latencyStatsRef.current.length;

    setPerformanceMetrics(prev => ({
      ...prev,
      averageLatency
    }));

    if (latency > LATENCY_THRESHOLD) {
      console.warn(`High message latency detected: ${latency}ms`);
    }
  }, [options.monitorPerformance]);

  /**
   * Handle connection errors with reconnection logic
   */
  const handleConnectionError = useCallback(() => {
    setConnectionStatus(prev => ({
      ...prev,
      isConnected: false,
      reconnectAttempts: prev.reconnectAttempts + 1
    }));

    if (connectionStatus.reconnectAttempts < MAX_RETRY_ATTEMPTS) {
      setTimeout(() => {
        chatService.connectToRoom(roomId);
      }, RECONNECT_INTERVAL * Math.pow(2, connectionStatus.reconnectAttempts));
    }
  }, [roomId, connectionStatus.reconnectAttempts]);

  /**
   * Handle message errors
   */
  const handleMessageError = useCallback((content: MessageContent) => {
    if (options.enableOfflineSupport) {
      queueMessageForLaterDelivery(content);
    }
    updatePerformanceMetrics('failedMessages');
  }, [options.enableOfflineSupport]);

  /**
   * Update performance metrics
   */
  const updatePerformanceMetrics = useCallback((metric: keyof PerformanceMetrics) => {
    if (!options.monitorPerformance) return;

    setPerformanceMetrics(prev => ({
      ...prev,
      [metric]: prev[metric] + 1
    }));
  }, [options.monitorPerformance]);

  /**
   * Retry failed message
   */
  const retryFailedMessage = useCallback(async (messageId: string) => {
    const queuedMessage = messageQueue.find(msg => msg.id === messageId);
    if (!queuedMessage) return;

    try {
      await sendMessage(queuedMessage.content);
      setMessageQueue(prev => prev.filter(msg => msg.id !== messageId));
    } catch (error) {
      console.error('Failed to retry message:', error);
    }
  }, [messageQueue, sendMessage]);

  // Memoized return values
  return useMemo(() => ({
    messages,
    sendMessage,
    isTyping,
    handleTyping,
    connectionStatus,
    performanceMetrics,
    messageQueue,
    retryFailedMessage
  }), [
    messages,
    sendMessage,
    isTyping,
    handleTyping,
    connectionStatus,
    performanceMetrics,
    messageQueue,
    retryFailedMessage
  ]);
};