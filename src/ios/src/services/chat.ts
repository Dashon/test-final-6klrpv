/**
 * Enhanced Chat Service Module for iOS Application
 * @version 1.0.0
 * @module services/chat
 * 
 * Implements real-time chat functionality with performance monitoring,
 * message encryption, offline support, and WebSocket communication.
 */

import { Socket, io } from 'socket.io-client'; // ^4.6.1
import CryptoJS from 'crypto-js'; // ^4.1.1
import { ApiService } from './api';
import { ChatMessage, ChatRoom, MessageContent, MessageStatus, MessageType } from '../types/chat';
import { WEBSOCKET_CONFIG, FEATURE_FLAGS } from '../config/development';

// Socket event constants
const SOCKET_EVENTS = {
  MESSAGE_RECEIVED: 'chat:message_received',
  MESSAGE_READ: 'chat:message_read',
  USER_TYPING: 'chat:user_typing',
  ROOM_UPDATED: 'chat:room_updated',
  LATENCY_CHECK: 'chat:latency_check',
  DELIVERY_CONFIRMATION: 'chat:delivery_confirmation'
} as const;

// Configuration constants
const MAX_RECONNECTION_ATTEMPTS = 5;
const RECONNECTION_DELAY = 3000;
const LATENCY_THRESHOLD_MS = 200;
const ENCRYPTION_ALGORITHM = 'AES-256-GCM';

/**
 * Interface for connection options
 */
interface ConnectionOptions {
  enableEncryption?: boolean;
  enableOfflineSupport?: boolean;
  monitorPerformance?: boolean;
}

/**
 * Interface for message queue entry
 */
interface QueuedMessage {
  roomId: string;
  content: MessageContent;
  retryCount: number;
  timestamp: number;
}

/**
 * Enhanced chat service with performance monitoring, encryption, and offline support
 */
export class ChatService {
  private socket: Socket | null = null;
  private messageQueue: QueuedMessage[] = [];
  private encryptionKey: string;
  private latencyStats: number[] = [];
  private reconnectAttempts = 0;
  private isConnected = false;
  private roomSubscriptions: Set<string> = new Set();

  constructor(
    private readonly apiService: ApiService,
    private readonly options: ConnectionOptions = {
      enableEncryption: true,
      enableOfflineSupport: true,
      monitorPerformance: true
    }
  ) {
    this.encryptionKey = this.generateEncryptionKey();
    this.initializeService();
  }

  /**
   * Initializes the chat service and sets up event handlers
   */
  private initializeService(): void {
    if (FEATURE_FLAGS.ENABLE_NETWORK_LOGGING) {
      console.log('Initializing chat service...');
    }

    this.setupSocketConnection();
    this.setupPerformanceMonitoring();
    this.startOfflineMessageProcessor();
  }

  /**
   * Sets up WebSocket connection with retry logic
   */
  private setupSocketConnection(): void {
    this.socket = io(WEBSOCKET_CONFIG.URL, {
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECTION_ATTEMPTS,
      reconnectionDelay: RECONNECTION_DELAY,
      timeout: WEBSOCKET_CONFIG.PING_INTERVAL
    });

    this.setupSocketEventHandlers();
  }

  /**
   * Sets up WebSocket event handlers
   */
  private setupSocketEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.processOfflineMessages();
      this.resubscribeToRooms();
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.handleDisconnection();
    });

    this.socket.on(SOCKET_EVENTS.MESSAGE_RECEIVED, this.handleMessageReceived.bind(this));
    this.socket.on(SOCKET_EVENTS.DELIVERY_CONFIRMATION, this.handleDeliveryConfirmation.bind(this));
    this.socket.on(SOCKET_EVENTS.LATENCY_CHECK, this.handleLatencyCheck.bind(this));
  }

  /**
   * Connects to a specific chat room
   */
  public async connectToRoom(roomId: string): Promise<void> {
    try {
      if (!this.socket?.connected) {
        throw new Error('Socket connection not established');
      }

      await this.socket.emit('room:join', { roomId });
      this.roomSubscriptions.add(roomId);

      if (FEATURE_FLAGS.ENABLE_NETWORK_LOGGING) {
        console.log(`Connected to room: ${roomId}`);
      }
    } catch (error) {
      console.error('Failed to connect to room:', error);
      throw error;
    }
  }

  /**
   * Disconnects from a specific chat room
   */
  public async disconnectFromRoom(roomId: string): Promise<void> {
    try {
      if (this.socket?.connected) {
        await this.socket.emit('room:leave', { roomId });
        this.roomSubscriptions.delete(roomId);
      }
    } catch (error) {
      console.error('Failed to disconnect from room:', error);
      throw error;
    }
  }

  /**
   * Sends a message to a chat room with encryption and delivery confirmation
   */
  public async sendMessage(roomId: string, content: MessageContent): Promise<ChatMessage> {
    try {
      const encryptedContent = this.options.enableEncryption
        ? this.encryptMessage(content)
        : content;

      if (!this.isConnected) {
        return this.queueOfflineMessage(roomId, content);
      }

      const message: Partial<ChatMessage> = {
        roomId,
        type: MessageType.TEXT,
        content: encryptedContent,
        status: MessageStatus.SENT,
        createdAt: new Date().toISOString()
      };

      const response = await new Promise<ChatMessage>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message delivery timeout'));
        }, WEBSOCKET_CONFIG.PING_INTERVAL);

        this.socket?.emit('message:send', message, (confirmation: ChatMessage) => {
          clearTimeout(timeout);
          resolve(confirmation);
        });
      });

      this.trackMessageLatency(response);
      return response;

    } catch (error) {
      console.error('Failed to send message:', error);
      if (this.options.enableOfflineSupport) {
        return this.queueOfflineMessage(roomId, content);
      }
      throw error;
    }
  }

  /**
   * Encrypts message content using AES-256-GCM
   */
  private encryptMessage(content: MessageContent): MessageContent {
    const contentString = JSON.stringify(content);
    const encrypted = CryptoJS.AES.encrypt(contentString, this.encryptionKey, {
      mode: CryptoJS.mode.GCM
    });
    return {
      text: encrypted.toString(),
      metadata: { encrypted: true }
    };
  }

  /**
   * Decrypts message content
   */
  private decryptMessage(encryptedContent: MessageContent): MessageContent {
    const decrypted = CryptoJS.AES.decrypt(encryptedContent.text, this.encryptionKey, {
      mode: CryptoJS.mode.GCM
    });
    return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
  }

  /**
   * Queues a message for offline delivery
   */
  private queueOfflineMessage(roomId: string, content: MessageContent): Promise<ChatMessage> {
    const queuedMessage: QueuedMessage = {
      roomId,
      content,
      retryCount: 0,
      timestamp: Date.now()
    };
    this.messageQueue.push(queuedMessage);
    return Promise.resolve({
      id: `offline-${Date.now()}`,
      roomId,
      senderId: 'local-user',
      type: MessageType.TEXT,
      content,
      status: MessageStatus.SENT,
      readBy: [],
      replyTo: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Processes queued offline messages
   */
  private async processOfflineMessages(): Promise<void> {
    if (!this.isConnected || this.messageQueue.length === 0) return;

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of messages) {
      try {
        await this.sendMessage(message.roomId, message.content);
      } catch (error) {
        if (message.retryCount < MAX_RECONNECTION_ATTEMPTS) {
          message.retryCount++;
          this.messageQueue.push(message);
        }
      }
    }
  }

  /**
   * Handles received messages
   */
  private handleMessageReceived(message: ChatMessage): void {
    if (message.content.metadata.encrypted && this.options.enableEncryption) {
      message.content = this.decryptMessage(message.content);
    }
    this.socket?.emit(SOCKET_EVENTS.MESSAGE_READ, { messageId: message.id });
  }

  /**
   * Handles message delivery confirmation
   */
  private handleDeliveryConfirmation(confirmation: { messageId: string, status: MessageStatus }): void {
    if (FEATURE_FLAGS.ENABLE_NETWORK_LOGGING) {
      console.log('Message delivery confirmed:', confirmation);
    }
  }

  /**
   * Handles latency check responses
   */
  private handleLatencyCheck(timestamp: number): void {
    const latency = Date.now() - timestamp;
    this.latencyStats.push(latency);

    if (latency > LATENCY_THRESHOLD_MS && FEATURE_FLAGS.ENABLE_PERFORMANCE_MONITORING) {
      console.warn(`High latency detected: ${latency}ms`);
    }
  }

  /**
   * Sets up performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    if (!this.options.monitorPerformance) return;

    setInterval(() => {
      this.socket?.emit(SOCKET_EVENTS.LATENCY_CHECK, Date.now());
    }, WEBSOCKET_CONFIG.PING_INTERVAL);
  }

  /**
   * Tracks message delivery latency
   */
  private trackMessageLatency(message: ChatMessage): void {
    if (!this.options.monitorPerformance) return;

    const latency = Date.now() - new Date(message.createdAt).getTime();
    this.latencyStats.push(latency);
  }

  /**
   * Generates a secure encryption key
   */
  private generateEncryptionKey(): string {
    return CryptoJS.lib.WordArray.random(256 / 8).toString();
  }

  /**
   * Handles socket disconnection
   */
  private handleDisconnection(): void {
    this.isConnected = false;
    if (this.reconnectAttempts < MAX_RECONNECTION_ATTEMPTS) {
      this.reconnectAttempts++;
      setTimeout(() => this.setupSocketConnection(), RECONNECTION_DELAY * this.reconnectAttempts);
    }
  }

  /**
   * Resubscribes to active rooms after reconnection
   */
  private async resubscribeToRooms(): Promise<void> {
    for (const roomId of this.roomSubscriptions) {
      try {
        await this.connectToRoom(roomId);
      } catch (error) {
        console.error(`Failed to resubscribe to room ${roomId}:`, error);
      }
    }
  }

  /**
   * Starts the offline message processor
   */
  private startOfflineMessageProcessor(): void {
    if (!this.options.enableOfflineSupport) return;

    setInterval(() => {
      if (this.isConnected) {
        this.processOfflineMessages();
      }
    }, WEBSOCKET_CONFIG.RECONNECT_INTERVAL);
  }
}

// Export singleton instance
export const chatService = new ChatService(new ApiService());