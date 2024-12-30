/**
 * @fileoverview WebSocket handler for real-time chat functionality with enhanced security and performance
 * @module social-service/websocket/chat
 * @version 1.0.0
 */

import { Socket, Server } from 'socket.io'; // v4.6.x
import { RateLimiterRedis } from 'rate-limiter-flexible'; // v2.4.x
import { IChatMessage, MessageType } from '../interfaces/chat.interface';
import { Logger } from '../../../shared/utils/logger.util';
import authMiddleware from '../../../shared/middleware/auth.middleware';

/**
 * Constants for WebSocket events and configuration
 */
const CHAT_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  MESSAGE: 'message',
  TYPING: 'typing',
  READ_RECEIPT: 'read_receipt',
  DELIVERY_ACK: 'delivery_acknowledgment',
  ERROR: 'error',
  RECONNECT: 'reconnect',
  HEALTH_CHECK: 'health_check'
} as const;

const MAX_RECONNECTION_ATTEMPTS = 5;
const RECONNECTION_DELAY = 1000;
const MESSAGE_BATCH_SIZE = 50;
const CONNECTION_POOL_SIZE = 1000;
const RATE_LIMIT_WINDOW = 60000; // 1 minute

/**
 * Decorator for rate limiting message handling
 */
function RateLimit() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const socket: Socket = args[0];
      try {
        await this.rateLimiter.consume(socket.handshake.address);
        return await originalMethod.apply(this, args);
      } catch (error) {
        socket.emit(CHAT_EVENTS.ERROR, { message: 'Rate limit exceeded' });
        Logger.getInstance().warn('Rate limit exceeded for chat messages', {
          userId: socket.data.user?.id,
          ip: socket.handshake.address
        });
      }
    };
    return descriptor;
  };
}

/**
 * Decorator for message validation
 */
function ValidateMessage() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const message: IChatMessage = args[1];
      if (!message?.roomId || !message?.content || !message?.type) {
        args[0].emit(CHAT_EVENTS.ERROR, { message: 'Invalid message format' });
        return;
      }
      return await originalMethod.apply(this, args);
    };
    return descriptor;
  };
}

/**
 * WebSocket handler for chat functionality with enhanced security and performance
 */
@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  },
  transports: ['websocket'],
  pingTimeout: 10000,
  pingInterval: 5000
})
export class ChatHandler {
  private readonly logger = Logger.getInstance();
  private readonly activeRooms: Map<string, Set<string>> = new Map();
  private readonly messageQueue: Map<string, IChatMessage[]> = new Map();
  private readonly rateLimiter: RateLimiterRedis;

  constructor(
    private readonly io: Server,
    private readonly connectionPool: Map<string, Socket>,
    private readonly redisClient: Redis
  ) {
    this.setupServer();
    this.initializeRateLimiter();
  }

  /**
   * Initialize server configuration and middleware
   */
  private setupServer(): void {
    this.io.use(authMiddleware);
    this.io.use(async (socket: Socket, next) => {
      try {
        if (this.connectionPool.size >= CONNECTION_POOL_SIZE) {
          throw new Error('Connection pool full');
        }
        next();
      } catch (error) {
        next(error);
      }
    });
  }

  /**
   * Initialize rate limiter with Redis
   */
  private initializeRateLimiter(): void {
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redisClient,
      points: 100, // Number of messages
      duration: RATE_LIMIT_WINDOW,
      blockDuration: RATE_LIMIT_WINDOW
    });
  }

  /**
   * Handle new WebSocket connections
   */
  public async handleConnection(socket: Socket): Promise<void> {
    try {
      this.connectionPool.set(socket.id, socket);
      
      this.setupSocketEventListeners(socket);
      
      this.logger.info('Client connected to chat', {
        socketId: socket.id,
        userId: socket.data.user?.id
      });

      socket.emit(CHAT_EVENTS.CONNECTION, { status: 'connected' });
    } catch (error) {
      this.handleError(socket, error);
    }
  }

  /**
   * Set up event listeners for a socket connection
   */
  private setupSocketEventListeners(socket: Socket): void {
    socket.on(CHAT_EVENTS.DISCONNECT, () => this.handleDisconnect(socket));
    socket.on(CHAT_EVENTS.MESSAGE, (message) => this.handleMessage(socket, message));
    socket.on(CHAT_EVENTS.TYPING, (data) => this.handleTyping(socket, data));
    socket.on(CHAT_EVENTS.READ_RECEIPT, (data) => this.handleReadReceipt(socket, data));
    socket.on(CHAT_EVENTS.HEALTH_CHECK, () => this.handleHealthCheck(socket));
  }

  /**
   * Handle incoming chat messages with validation and delivery
   */
  @RateLimit()
  @ValidateMessage()
  private async handleMessage(socket: Socket, message: IChatMessage): Promise<void> {
    try {
      // Validate user's access to room
      if (!await this.validateRoomAccess(socket.data.user?.id, message.roomId)) {
        throw new Error('Unauthorized room access');
      }

      // Process message based on type
      const processedMessage = await this.processMessage(message);

      // Queue message for batch processing
      await this.queueMessage(processedMessage);

      // Broadcast to room participants
      await this.broadcastMessage(processedMessage);

      // Send delivery acknowledgment
      socket.emit(CHAT_EVENTS.DELIVERY_ACK, {
        messageId: processedMessage.id,
        status: 'delivered'
      });

      this.logger.info('Message processed successfully', {
        messageId: processedMessage.id,
        roomId: message.roomId
      });
    } catch (error) {
      this.handleError(socket, error);
    }
  }

  /**
   * Handle typing indicators
   */
  private async handleTyping(socket: Socket, data: { roomId: string, isTyping: boolean }): Promise<void> {
    try {
      socket.to(data.roomId).emit(CHAT_EVENTS.TYPING, {
        userId: socket.data.user?.id,
        isTyping: data.isTyping
      });
    } catch (error) {
      this.handleError(socket, error);
    }
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnect(socket: Socket): void {
    try {
      this.connectionPool.delete(socket.id);
      this.logger.info('Client disconnected from chat', {
        socketId: socket.id,
        userId: socket.data.user?.id
      });
    } catch (error) {
      this.logger.error('Error handling disconnect', error as Error);
    }
  }

  /**
   * Handle errors with appropriate logging and client notification
   */
  private handleError(socket: Socket, error: Error): void {
    this.logger.error('Chat error occurred', error, {
      socketId: socket.id,
      userId: socket.data.user?.id
    });
    socket.emit(CHAT_EVENTS.ERROR, {
      message: 'An error occurred processing your request'
    });
  }

  /**
   * Process messages for delivery and storage
   */
  private async processMessage(message: IChatMessage): Promise<IChatMessage> {
    // Handle AI responses if message type is appropriate
    if (message.type === MessageType.AI_RESPONSE) {
      return await this.processAIResponse(message);
    }
    return message;
  }

  /**
   * Queue messages for batch processing
   */
  private async queueMessage(message: IChatMessage): Promise<void> {
    const queue = this.messageQueue.get(message.roomId) || [];
    queue.push(message);
    
    if (queue.length >= MESSAGE_BATCH_SIZE) {
      await this.processBatch(message.roomId);
    }
    
    this.messageQueue.set(message.roomId, queue);
  }

  /**
   * Process a batch of messages
   */
  private async processBatch(roomId: string): Promise<void> {
    const messages = this.messageQueue.get(roomId) || [];
    if (messages.length > 0) {
      // Bulk insert messages to database
      await this.saveBatchToDatabase(messages);
      this.messageQueue.set(roomId, []);
    }
  }

  /**
   * Health check handler
   */
  private handleHealthCheck(socket: Socket): void {
    socket.emit(CHAT_EVENTS.HEALTH_CHECK, {
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  }
}