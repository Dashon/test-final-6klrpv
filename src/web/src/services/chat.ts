/**
 * Chat Service Implementation
 * Version: 1.0.0
 * 
 * Enterprise-grade chat service with support for:
 * - Real-time communication (<200ms latency)
 * - Offline message queueing
 * - Mixed human/AI conversations
 * - Network quality monitoring
 * - Optimistic updates
 */

import { EventEmitter } from 'events'; // ^3.3.x
import localforage from 'localforage'; // ^1.10.x
import { debounce } from 'lodash'; // ^4.17.x

import {
  ChatMessage,
  ChatRoom,
  MessageType,
  MessageStatus,
  RoomType,
  MessageContent,
  Participant,
  RoomSettings,
  AIPersona
} from '../types/chat';

import {
  SocketManager,
  SOCKET_EVENTS,
  ConnectionState
} from '../lib/socket';

import axiosInstance from '../lib/axios';

// Chat-specific event types
export enum CHAT_EVENTS {
  MESSAGE_RECEIVED = 'message:received',
  MESSAGE_SENT = 'message:sent',
  MESSAGE_DELIVERED = 'message:delivered',
  MESSAGE_FAILED = 'message:failed',
  ROOM_UPDATED = 'room:updated',
  TYPING_START = 'typing:start',
  TYPING_END = 'typing:end',
  CONNECTION_QUALITY_CHANGE = 'connection:quality',
  AI_PERSONA_ACTIVE = 'ai:active',
  AI_PERSONA_INACTIVE = 'ai:inactive'
}

// API endpoints for chat operations
const API_ENDPOINTS = {
  ROOMS: '/api/v1/chat/rooms',
  MESSAGES: '/api/v1/chat/messages',
  PARTICIPANTS: '/api/v1/chat/participants',
  AI_PERSONAS: '/api/v1/chat/ai-personas',
  MESSAGE_SEARCH: '/api/v1/chat/search'
};

// Configuration for retry and offline handling
const RETRY_CONFIG = {
  maxRetries: 3,
  backoffFactor: 1.5,
  timeout: 200
};

/**
 * Enhanced chat service class implementing real-time communication,
 * offline support, and AI interactions
 */
export class ChatService {
  private socketManager: SocketManager;
  private eventEmitter: EventEmitter;
  private messageQueue: Map<string, ChatMessage>;
  private typingDebounce: Map<string, NodeJS.Timeout>;
  private offlineStore: typeof localforage;
  private networkQuality: number = 100;

  constructor() {
    this.socketManager = new SocketManager({
      url: process.env.SOCKET_URL || 'wss://api.aitravelplatform.com',
      path: '/ws/chat',
      secure: true
    }, {
      token: localStorage.getItem('accessToken') || '',
      userId: localStorage.getItem('userId') || ''
    }, {
      maxLatency: 200,
      measurementInterval: 5000
    });

    this.eventEmitter = new EventEmitter();
    this.messageQueue = new Map();
    this.typingDebounce = new Map();

    // Initialize offline storage
    this.offlineStore = localforage.createInstance({
      name: 'chatOfflineStore',
      storeName: 'messages'
    });

    this.initializeEventListeners();
  }

  /**
   * Initializes WebSocket event listeners and connection monitoring
   */
  private initializeEventListeners(): void {
    // Socket connection events
    this.socketManager.on(SOCKET_EVENTS.CONNECT, () => {
      this.processOfflineQueue();
      this.eventEmitter.emit(CHAT_EVENTS.CONNECTION_QUALITY_CHANGE, {
        quality: 100,
        latency: 0
      });
    });

    this.socketManager.on(SOCKET_EVENTS.DISCONNECT, () => {
      this.eventEmitter.emit(CHAT_EVENTS.CONNECTION_QUALITY_CHANGE, {
        quality: 0,
        latency: Infinity
      });
    });

    // Connection quality monitoring
    this.socketManager.on(SOCKET_EVENTS.CONNECTION_QUALITY, ({ latency, isStable }) => {
      this.networkQuality = isStable ? 100 : Math.max(0, 100 - (latency / 2));
      this.eventEmitter.emit(CHAT_EVENTS.CONNECTION_QUALITY_CHANGE, {
        quality: this.networkQuality,
        latency
      });
    });

    // Message events
    this.socketManager.on(CHAT_EVENTS.MESSAGE_RECEIVED, this.handleMessageReceived.bind(this));
    this.socketManager.on(CHAT_EVENTS.MESSAGE_DELIVERED, this.handleMessageDelivered.bind(this));
  }

  /**
   * Sends a new message with offline support and delivery confirmation
   */
  public async sendMessage(
    content: MessageContent,
    roomId: string,
    aiPersona?: AIPersona
  ): Promise<ChatMessage> {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      roomId,
      senderId: localStorage.getItem('userId') || '',
      type: aiPersona ? MessageType.AI_RESPONSE : MessageType.TEXT,
      content,
      status: MessageStatus.PENDING,
      readBy: [],
      replyTo: null,
      aiContext: aiPersona ? { personaId: aiPersona.id } : null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Optimistic update
    this.messageQueue.set(message.id, message);
    this.eventEmitter.emit(CHAT_EVENTS.MESSAGE_SENT, message);

    try {
      if (this.networkQuality < 50) {
        await this.queueOfflineMessage(message);
        return message;
      }

      const response = await this.socketManager.emit('message:send', {
        message,
        aiPersona
      });

      message.status = MessageStatus.DELIVERED;
      this.messageQueue.delete(message.id);
      this.eventEmitter.emit(CHAT_EVENTS.MESSAGE_DELIVERED, message);

      return response.data;
    } catch (error) {
      message.status = MessageStatus.FAILED;
      this.eventEmitter.emit(CHAT_EVENTS.MESSAGE_FAILED, message);
      await this.queueOfflineMessage(message);
      throw error;
    }
  }

  /**
   * Handles received messages and updates local state
   */
  private handleMessageReceived(message: ChatMessage): void {
    if (message.senderId !== localStorage.getItem('userId')) {
      this.eventEmitter.emit(CHAT_EVENTS.MESSAGE_RECEIVED, message);
    }
  }

  /**
   * Handles message delivery confirmations
   */
  private handleMessageDelivered(messageId: string): void {
    const message = this.messageQueue.get(messageId);
    if (message) {
      message.status = MessageStatus.DELIVERED;
      this.messageQueue.delete(messageId);
      this.eventEmitter.emit(CHAT_EVENTS.MESSAGE_DELIVERED, message);
    }
  }

  /**
   * Queues messages for offline storage
   */
  private async queueOfflineMessage(message: ChatMessage): Promise<void> {
    try {
      await this.offlineStore.setItem(message.id, message);
    } catch (error) {
      console.error('Failed to store offline message:', error);
    }
  }

  /**
   * Processes queued offline messages when connection is restored
   */
  private async processOfflineQueue(): Promise<void> {
    try {
      const keys = await this.offlineStore.keys();
      for (const key of keys) {
        const message = await this.offlineStore.getItem<ChatMessage>(key);
        if (message && message.status === MessageStatus.PENDING) {
          await this.sendMessage(message.content, message.roomId);
          await this.offlineStore.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Failed to process offline queue:', error);
    }
  }

  /**
   * Subscribes to chat events
   */
  public on(event: CHAT_EVENTS, listener: (data: any) => void): void {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Unsubscribes from chat events
   */
  public off(event: CHAT_EVENTS, listener: (data: any) => void): void {
    this.eventEmitter.off(event, listener);
  }

  /**
   * Cleans up resources and connections
   */
  public destroy(): void {
    this.socketManager.disconnect();
    this.eventEmitter.removeAllListeners();
    this.messageQueue.clear();
    this.typingDebounce.clear();
  }
}

// Export singleton instance
export const chatService = new ChatService();