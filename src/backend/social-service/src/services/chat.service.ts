/**
 * @fileoverview Enhanced chat service implementation with reliability and monitoring
 * @module social-service/services/chat
 * @version 1.0.0
 */

import { Server } from 'socket.io';
import { Queue } from 'bull';
import { injectable, inject } from 'inversify';
import { createHash } from 'crypto';
import DOMPurify from 'isomorphic-dompurify';

import { IChatMessage, MessageType, MessageStatus } from '../interfaces/chat.interface';
import { Logger } from '../../../shared/utils/logger.util';
import { ErrorCode, ErrorMetadata } from '../../../shared/constants/error-codes';
import { HttpStatus } from '../../../shared/constants/status-codes';

// Constants for configuration
const MESSAGE_BATCH_SIZE = 50;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const MAX_MESSAGE_LENGTH = 4096;
const SOCKET_TIMEOUT = 30000;

/**
 * Interface for message validation results
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Interface for connection tracking
 */
interface ConnectionStatus {
  connected: boolean;
  lastHeartbeat: Date;
  roomIds: Set<string>;
}

/**
 * Enhanced chat service with reliability and monitoring features
 */
@injectable()
export class ChatService {
  private readonly connectionTracker: Map<string, ConnectionStatus>;
  private readonly messageCache: Map<string, IChatMessage>;
  private readonly deliveryTracker: Map<string, Set<string>>;

  constructor(
    @inject('MessageModel') private readonly messageModel: any,
    @inject('WebSocketServer') private readonly websocketServer: Server,
    @inject('Logger') private readonly logger: Logger,
    @inject('MessageQueue') private readonly messageQueue: Queue
  ) {
    this.connectionTracker = new Map();
    this.messageCache = new Map();
    this.deliveryTracker = new Map();
    this.initializeWebSocket();
  }

  /**
   * Initialize WebSocket server with enhanced monitoring
   */
  private initializeWebSocket(): void {
    this.websocketServer.on('connection', (socket) => {
      const userId = socket.handshake.auth.userId;
      
      this.connectionTracker.set(userId, {
        connected: true,
        lastHeartbeat: new Date(),
        roomIds: new Set()
      });

      // Setup heartbeat monitoring
      const heartbeatInterval = setInterval(() => {
        socket.emit('heartbeat');
      }, SOCKET_TIMEOUT / 2);

      socket.on('heartbeat', () => {
        const status = this.connectionTracker.get(userId);
        if (status) {
          status.lastHeartbeat = new Date();
        }
      });

      socket.on('disconnect', () => {
        clearInterval(heartbeatInterval);
        const status = this.connectionTracker.get(userId);
        if (status) {
          status.connected = false;
        }
        this.logger.info('Client disconnected', { userId });
      });
    });
  }

  /**
   * Validate message content and permissions
   */
  private async validateMessage(message: IChatMessage): Promise<ValidationResult> {
    const errors: string[] = [];

    // Sanitize content
    message.content.text = DOMPurify.sanitize(message.content.text);

    // Validate message length
    if (message.content.text.length > MAX_MESSAGE_LENGTH) {
      errors.push(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`);
    }

    // Validate room membership
    const isRoomMember = await this.messageModel.validateRoomMembership(
      message.roomId,
      message.senderId
    );
    if (!isRoomMember) {
      errors.push('Sender is not a member of the room');
    }

    // Validate thread if it's a reply
    if (message.replyTo) {
      const parentExists = await this.messageModel.findById(message.replyTo);
      if (!parentExists) {
        errors.push('Parent message not found');
      }
    }

    // Validate AI persona messages
    if (message.type === MessageType.AI_RESPONSE) {
      const isValidPersona = await this.messageModel.validateAIPersona(
        message.senderId
      );
      if (!isValidPersona) {
        errors.push('Invalid AI persona');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Send message with enhanced reliability and monitoring
   */
  public async sendMessage(message: IChatMessage): Promise<IChatMessage> {
    try {
      // Validate message
      const validation = await this.validateMessage(message);
      if (!validation.isValid) {
        throw new Error(`Message validation failed: ${validation.errors.join(', ')}`);
      }

      // Generate message hash for deduplication
      const messageHash = createHash('sha256')
        .update(JSON.stringify(message))
        .digest('hex');

      // Check for duplicate message
      if (this.messageCache.has(messageHash)) {
        return this.messageCache.get(messageHash)!;
      }

      // Queue message for reliable delivery
      const job = await this.messageQueue.add('sendMessage', message, {
        attempts: MAX_RETRIES,
        backoff: {
          type: 'exponential',
          delay: RETRY_DELAY
        }
      });

      // Process message delivery
      const deliveredMessage = await job.finished();
      message.status = MessageStatus.DELIVERED;

      // Update delivery tracking
      this.deliveryTracker.set(message.id, new Set());
      this.messageCache.set(messageHash, deliveredMessage);

      // Emit to room members with retry logic
      await this.emitToRoom(message.roomId, 'newMessage', deliveredMessage);

      this.logger.info('Message sent successfully', {
        messageId: message.id,
        roomId: message.roomId,
        senderId: message.senderId
      });

      return deliveredMessage;
    } catch (error) {
      this.logger.error('Failed to send message', error as Error, {
        messageId: message.id,
        roomId: message.roomId
      });
      throw error;
    }
  }

  /**
   * Emit event to room members with retry logic
   */
  private async emitToRoom(
    roomId: string,
    event: string,
    data: any,
    retries = MAX_RETRIES
  ): Promise<void> {
    try {
      const roomMembers = await this.messageModel.getRoomMembers(roomId);
      const onlineMembers = roomMembers.filter(
        (memberId: string) => this.connectionTracker.get(memberId)?.connected
      );

      // Emit to all online members
      onlineMembers.forEach((memberId: string) => {
        this.websocketServer.to(memberId).emit(event, data);
      });

      // Track delivery status
      if (data.id) {
        const delivered = this.deliveryTracker.get(data.id) || new Set();
        onlineMembers.forEach((memberId: string) => delivered.add(memberId));
        this.deliveryTracker.set(data.id, delivered);
      }
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        await this.emitToRoom(roomId, event, data, retries - 1);
      } else {
        throw error;
      }
    }
  }

  /**
   * Track message delivery status
   */
  public async trackDeliveryStatus(messageId: string): Promise<Set<string>> {
    return this.deliveryTracker.get(messageId) || new Set();
  }

  /**
   * Mark message as read with delivery confirmation
   */
  public async markMessageAsRead(
    messageId: string,
    userId: string
  ): Promise<void> {
    try {
      await this.messageModel.markAsRead(messageId, userId);
      const message = await this.messageModel.findById(messageId);
      
      if (message) {
        await this.emitToRoom(message.roomId, 'messageRead', {
          messageId,
          userId,
          timestamp: new Date()
        });
      }
    } catch (error) {
      this.logger.error('Failed to mark message as read', error as Error, {
        messageId,
        userId
      });
      throw error;
    }
  }
}