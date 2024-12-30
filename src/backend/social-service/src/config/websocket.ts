/**
 * @fileoverview WebSocket server configuration for the social service
 * @module social-service/config/websocket
 * @version 1.0.0
 */

import { Server, ServerOptions } from 'socket.io'; // v4.6.x
import cors from 'cors'; // v2.8.x
import rateLimit from 'socket.io-rate-limiter'; // v1.0.x
import { Logger } from '../../../shared/utils/logger.util';
import { ChatHandler } from '../websocket/chat.handler';
import { RoomHandler } from '../websocket/room.handler';
import { ErrorCode } from '../../../shared/constants/error-codes';

// WebSocket server configuration constants
const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT || 3002;
const PING_TIMEOUT = 5000; // 5 seconds
const PING_INTERVAL = 10000; // 10 seconds
const MAX_BUFFER_SIZE = 1e6; // 1MB
const MAX_CONNECTIONS = 10000;
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_MESSAGES_PER_WINDOW = 100;

/**
 * Interface for WebSocket server configuration options
 */
interface WebSocketConfig {
  port: number;
  cors: cors.CorsOptions;
  pingTimeout: number;
  pingInterval: number;
  maxBufferSize: number;
  rateLimit: {
    points: number;
    duration: number;
    blockDuration: number;
  };
  connectionPool: {
    maxSize: number;
    timeout: number;
  };
}

/**
 * Default WebSocket server configuration
 */
export const websocketConfig: WebSocketConfig = {
  port: Number(WEBSOCKET_PORT),
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
    maxAge: 86400 // 24 hours
  },
  pingTimeout: PING_TIMEOUT,
  pingInterval: PING_INTERVAL,
  maxBufferSize: MAX_BUFFER_SIZE,
  rateLimit: {
    points: MAX_MESSAGES_PER_WINDOW,
    duration: RATE_LIMIT_WINDOW,
    blockDuration: RATE_LIMIT_WINDOW
  },
  connectionPool: {
    maxSize: MAX_CONNECTIONS,
    timeout: 30000 // 30 seconds
  }
};

/**
 * Creates and configures a WebSocket server instance with enhanced features
 * @param options Optional configuration overrides
 * @returns Configured WebSocket server instance
 */
export function createWebSocketServer(options?: Partial<WebSocketConfig>): Server {
  const logger = Logger.getInstance();
  const config = { ...websocketConfig, ...options };

  // Initialize Socket.IO server with optimized settings
  const io = new Server({
    cors: config.cors,
    pingTimeout: config.pingTimeout,
    pingInterval: config.pingInterval,
    maxHttpBufferSize: config.maxBufferSize,
    transports: ['websocket'],
    allowEIO3: true,
    connectTimeout: config.connectionPool.timeout
  } as ServerOptions);

  // Initialize connection pool
  const connectionPool = new Map<string, any>();

  // Apply rate limiting middleware
  io.use(rateLimit.rateLimiterMiddleware({
    points: config.rateLimit.points,
    duration: config.rateLimit.duration,
    blockDuration: config.rateLimit.blockDuration,
    errorMessage: 'Rate limit exceeded'
  }));

  // Connection pool management middleware
  io.use((socket, next) => {
    if (connectionPool.size >= config.connectionPool.maxSize) {
      logger.warn('Connection pool full', {
        poolSize: connectionPool.size,
        maxSize: config.connectionPool.maxSize
      });
      next(new Error('Connection pool full'));
      return;
    }
    connectionPool.set(socket.id, socket);
    next();
  });

  // Initialize handlers
  const chatHandler = new ChatHandler(io, connectionPool);
  const roomHandler = new RoomHandler(io, connectionPool);

  // Connection event handling
  io.on('connection', async (socket) => {
    try {
      logger.info('Client connected', {
        socketId: socket.id,
        transport: socket.conn.transport.name
      });

      // Set up socket event handlers
      await chatHandler.handleConnection(socket);
      
      // Clean up on disconnect
      socket.on('disconnect', () => {
        connectionPool.delete(socket.id);
        logger.info('Client disconnected', { socketId: socket.id });
      });

      // Monitor socket health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

    } catch (error) {
      logger.error('Connection handler error', error as Error, {
        socketId: socket.id,
        errorCode: ErrorCode.INTERNAL_SERVER_ERROR
      });
      socket.disconnect(true);
    }
  });

  // Error event handling
  io.on('error', (error) => {
    logger.error('WebSocket server error', error as Error, {
      errorCode: ErrorCode.INTERNAL_SERVER_ERROR
    });
  });

  // Start server
  io.listen(config.port);
  logger.info('WebSocket server started', { port: config.port });

  return io;
}

// Export configuration and server factory
export default {
  config: websocketConfig,
  createServer: createWebSocketServer
};