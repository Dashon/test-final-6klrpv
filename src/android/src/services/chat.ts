/**
 * @fileoverview Enhanced chat service module for Android mobile app
 * @version 1.0.0
 * 
 * Implements robust chat functionality with offline support, AI persona integration,
 * and mobile-optimized performance features.
 */

import { io, Socket } from 'socket.io-client'; // ^4.6.0
import { get, post } from './api';
import { config } from '../config/development';
import { 
  ChatMessage, 
  ChatRoom, 
  MessageType, 
  MessageStatus, 
  MessageContent,
  RoomType,
  ParticipantRole,
  MAX_MESSAGE_LENGTH,
  MESSAGE_BATCH_SIZE,
  OFFLINE_SYNC_INTERVAL
} from '../types/chat';

/**
 * Socket event constants for real-time communication
 */
const SOCKET_EVENTS = {
  MESSAGE_SENT: 'message:sent',
  MESSAGE_DELIVERED: 'message:delivered',
  MESSAGE_READ: 'message:read',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  PARTICIPANT_JOINED: 'participant:joined',
  PARTICIPANT_LEFT: 'participant:left',
  SYNC_REQUEST: 'sync:request',
  SYNC_COMPLETE: 'sync:complete',
  AI_RESPONSE: 'ai:response'
} as const;

/**
 * Network configuration for optimized mobile performance
 */
const NETWORK_CONFIG = {
  RETRY_ATTEMPTS: 3,
  BACKOFF_MULTIPLIER: 1.5,
  MAX_BATCH_SIZE: 50,
  COMPRESSION_THRESHOLD: 1024 // bytes
} as const;

/**
 * Interface for message queue management
 */
interface MessageQueue {
  messages: ChatMessage[];
  lastSyncAt: number;
  syncInProgress: boolean;
}

/**
 * Enhanced chat service with offline support and mobile optimizations
 */
export class ChatService {
  private socket: Socket | null = null;
  private messageQueue: MessageQueue;
  private rooms: Map<string, ChatRoom>;
  private networkStatus: boolean;
  private syncInterval: NodeJS.Timeout | null;
  private batteryOptimized: boolean;

  constructor() {
    this.messageQueue = {
      messages: [],
      lastSyncAt: Date.now(),
      syncInProgress: false
    };
    this.rooms = new Map();
    this.networkStatus = navigator.onLine;
    this.syncInterval = null;
    this.batteryOptimized = false;

    this.initializeNetworkListeners();
    this.initializeBatteryMonitoring();
  }

  /**
   * Initializes the WebSocket connection with enhanced reconnection strategy
   */
  public async initialize(userId: string, authToken: string): Promise<void> {
    try {
      this.socket = io(config.API_CONFIG.WEBSOCKET_URL, {
        auth: { token: authToken },
        reconnection: true,
        reconnectionAttempts: NETWORK_CONFIG.RETRY_ATTEMPTS,
        reconnectionDelay: config.CHAT_CONFIG.RECONNECT_INTERVAL,
        reconnectionDelayMax: config.CHAT_CONFIG.RECONNECT_INTERVAL * NETWORK_CONFIG.BACKOFF_MULTIPLIER,
        timeout: config.API_CONFIG.TIMEOUT,
        query: { userId }
      });

      this.setupSocketListeners();
      await this.syncOfflineMessages();
      this.startPeriodicSync();
    } catch (error) {
      console.error('Failed to initialize chat service:', error);
      throw error;
    }
  }

  /**
   * Sends a message with offline support and optimistic updates
   */
  public async sendMessage(
    roomId: string, 
    content: MessageContent, 
    type: MessageType = MessageType.TEXT
  ): Promise<ChatMessage> {
    if (content.text.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`);
    }

    const message: ChatMessage = {
      id: `local_${Date.now()}`,
      roomId,
      senderId: this.socket?.auth?.userId,
      type,
      content,
      status: this.networkStatus ? MessageStatus.SENT : MessageStatus.PENDING,
      readBy: [],
      replyTo: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      localId: `local_${Date.now()}`,
      offline: !this.networkStatus
    };

    // Optimistic update
    this.updateLocalRoom(roomId, message);

    if (!this.networkStatus) {
      this.messageQueue.messages.push(message);
      return message;
    }

    try {
      const compressedContent = this.compressMessageContent(content);
      const response = await this.socket?.emitWithAck(SOCKET_EVENTS.MESSAGE_SENT, {
        roomId,
        content: compressedContent,
        type
      });

      return {
        ...message,
        ...response,
        status: MessageStatus.DELIVERED
      };
    } catch (error) {
      message.status = MessageStatus.FAILED;
      this.messageQueue.messages.push(message);
      throw error;
    }
  }

  /**
   * Synchronizes offline messages when connection is restored
   */
  private async syncOfflineMessages(): Promise<void> {
    if (this.messageQueue.syncInProgress || !this.networkStatus) {
      return;
    }

    this.messageQueue.syncInProgress = true;

    try {
      const messages = [...this.messageQueue.messages];
      const batches = this.createMessageBatches(messages, MESSAGE_BATCH_SIZE);

      for (const batch of batches) {
        await this.syncMessageBatch(batch);
      }

      this.messageQueue.messages = this.messageQueue.messages.filter(
        msg => msg.createdAt > new Date(this.messageQueue.lastSyncAt).toISOString()
      );
      
      this.messageQueue.lastSyncAt = Date.now();
    } catch (error) {
      console.error('Failed to sync offline messages:', error);
    } finally {
      this.messageQueue.syncInProgress = false;
    }
  }

  /**
   * Handles AI persona message routing and responses
   */
  private async handleAIPersonaMessage(
    roomId: string,
    message: ChatMessage
  ): Promise<void> {
    const room = this.rooms.get(roomId);
    
    if (!room || !room.settings.allowAIPersonas) {
      return;
    }

    const aiParticipants = room.participants.filter(
      p => p.role === ParticipantRole.AI_PERSONA
    );

    if (aiParticipants.length > 0) {
      this.socket?.emit(SOCKET_EVENTS.AI_RESPONSE, {
        roomId,
        messageId: message.id,
        aiPersonas: aiParticipants.map(p => p.userId)
      });
    }
  }

  /**
   * Sets up WebSocket event listeners with retry logic
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.networkStatus = true;
      this.syncOfflineMessages();
    });

    this.socket.on('disconnect', () => {
      this.networkStatus = false;
    });

    this.socket.on(SOCKET_EVENTS.MESSAGE_DELIVERED, (message: ChatMessage) => {
      this.updateMessageStatus(message.id, MessageStatus.DELIVERED);
    });

    this.socket.on(SOCKET_EVENTS.MESSAGE_READ, ({ messageId, userId }) => {
      this.updateMessageReadStatus(messageId, userId);
    });

    this.socket.on(SOCKET_EVENTS.AI_RESPONSE, (response) => {
      this.handleAIResponse(response);
    });
  }

  /**
   * Initializes network status monitoring
   */
  private initializeNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.networkStatus = true;
      this.syncOfflineMessages();
    });

    window.addEventListener('offline', () => {
      this.networkStatus = false;
    });
  }

  /**
   * Initializes battery-aware optimizations
   */
  private async initializeBatteryMonitoring(): Promise<void> {
    try {
      const battery = await (navigator as any).getBattery();
      
      this.batteryOptimized = battery.level < 0.2;
      
      battery.addEventListener('levelchange', () => {
        this.batteryOptimized = battery.level < 0.2;
        this.adjustSyncInterval();
      });
    } catch (error) {
      console.warn('Battery API not supported:', error);
    }
  }

  /**
   * Adjusts sync interval based on battery status and network conditions
   */
  private adjustSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    const interval = this.batteryOptimized ? 
      OFFLINE_SYNC_INTERVAL * 2 : 
      OFFLINE_SYNC_INTERVAL;

    this.syncInterval = setInterval(() => {
      if (this.networkStatus && !this.messageQueue.syncInProgress) {
        this.syncOfflineMessages();
      }
    }, interval);
  }

  /**
   * Compresses message content for efficient transmission
   */
  private compressMessageContent(content: MessageContent): MessageContent {
    if (!content.text || content.text.length < NETWORK_CONFIG.COMPRESSION_THRESHOLD) {
      return content;
    }

    // Implement compression logic here
    return content;
  }

  /**
   * Updates local room state with new message
   */
  private updateLocalRoom(roomId: string, message: ChatMessage): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.lastMessageAt = message.createdAt;
      room.unreadCount += 1;
      this.rooms.set(roomId, room);
    }
  }

  /**
   * Creates batches of messages for efficient syncing
   */
  private createMessageBatches(
    messages: ChatMessage[], 
    batchSize: number
  ): ChatMessage[][] {
    const batches: ChatMessage[][] = [];
    for (let i = 0; i < messages.length; i += batchSize) {
      batches.push(messages.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Syncs a batch of messages with the server
   */
  private async syncMessageBatch(messages: ChatMessage[]): Promise<void> {
    try {
      await post('/chat/sync', { messages });
      
      messages.forEach(msg => {
        const index = this.messageQueue.messages.findIndex(m => m.id === msg.id);
        if (index !== -1) {
          this.messageQueue.messages.splice(index, 1);
        }
      });
    } catch (error) {
      console.error('Failed to sync message batch:', error);
      throw error;
    }
  }

  /**
   * Handles AI persona responses
   */
  private handleAIResponse(response: any): void {
    const { roomId, message } = response;
    this.updateLocalRoom(roomId, message);
  }

  /**
   * Updates message status in local state
   */
  private updateMessageStatus(messageId: string, status: MessageStatus): void {
    this.messageQueue.messages = this.messageQueue.messages.map(msg => 
      msg.id === messageId ? { ...msg, status } : msg
    );
  }

  /**
   * Updates message read status in local state
   */
  private updateMessageReadStatus(messageId: string, userId: string): void {
    this.messageQueue.messages = this.messageQueue.messages.map(msg => 
      msg.id === messageId ? { 
        ...msg, 
        readBy: [...new Set([...msg.readBy, userId])] 
      } : msg
    );
  }

  /**
   * Cleans up resources on service destruction
   */
  public destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.socket?.disconnect();
    this.socket = null;
    this.rooms.clear();
    this.messageQueue.messages = [];
  }
}