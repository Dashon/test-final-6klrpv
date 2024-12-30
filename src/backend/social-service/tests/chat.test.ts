/**
 * @fileoverview Comprehensive test suite for chat functionality in the social service
 * @module social-service/tests/chat
 * @version 1.0.0
 */

import { MongoMemoryServer } from 'mongodb-memory-server'; // v8.12.0
import SocketIOMock from 'socket.io-mock'; // v1.3.2
import now from 'performance-now'; // v2.1.0
import mongoose from 'mongoose';

import { ChatService } from '../src/services/chat.service';
import { Message } from '../src/models/chat.model';
import { IChatMessage, MessageType, MessageStatus } from '../src/interfaces/chat.interface';
import { logger } from '../../../shared/utils/logger.util';
import { ErrorCode } from '../../../shared/constants/error-codes';

// Test configuration constants
const TEST_TIMEOUT = 10000;
const MOCK_USER_ID = 'test-user-id';
const MOCK_ROOM_ID = 'test-room-id';
const LATENCY_THRESHOLD = 200; // 200ms as per technical spec
const CONCURRENT_MESSAGES = 100;

/**
 * Interface for tracking performance metrics
 */
interface PerformanceMetrics {
  messageLatency: number[];
  aiResponseTime: number[];
  deliverySuccess: number;
  deliveryFailure: number;
}

describe('ChatService Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let chatService: ChatService;
  let mockSocket: SocketIOMock;
  let mockMessageQueue: any;
  let mockAIPersona: any;
  let performanceMetrics: PerformanceMetrics;

  beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Initialize mocks
    mockSocket = new SocketIOMock();
    mockMessageQueue = {
      add: jest.fn().mockImplementation((type, message) => ({
        finished: () => Promise.resolve(message)
      }))
    };
    mockAIPersona = {
      generateResponse: jest.fn().mockImplementation(() => 
        Promise.resolve({ text: 'AI response', confidence: 0.95 })
      )
    };

    // Initialize performance metrics
    performanceMetrics = {
      messageLatency: [],
      aiResponseTime: [],
      deliverySuccess: 0,
      deliveryFailure: 0
    };

    // Initialize ChatService with mocks
    chatService = new ChatService(
      Message,
      mockSocket,
      logger,
      mockMessageQueue
    );
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear collections
    await Message.deleteMany({});
    
    // Reset mocks
    jest.clearAllMocks();
    mockSocket.emit('disconnect');
    
    // Reset metrics
    performanceMetrics = {
      messageLatency: [],
      aiResponseTime: [],
      deliverySuccess: 0,
      deliveryFailure: 0
    };
  });

  describe('Message Delivery Tests', () => {
    it('should deliver messages within latency threshold', async () => {
      const testMessage: Partial<IChatMessage> = {
        roomId: MOCK_ROOM_ID,
        senderId: MOCK_USER_ID,
        type: MessageType.TEXT,
        content: { text: 'Test message' }
      };

      const start = now();
      const result = await chatService.sendMessage(testMessage as IChatMessage);
      const end = now();
      const latency = end - start;

      performanceMetrics.messageLatency.push(latency);

      expect(result).toBeDefined();
      expect(result.status).toBe(MessageStatus.DELIVERED);
      expect(latency).toBeLessThan(LATENCY_THRESHOLD);
    }, TEST_TIMEOUT);

    it('should handle concurrent message delivery', async () => {
      const messages = Array.from({ length: CONCURRENT_MESSAGES }, (_, i) => ({
        roomId: MOCK_ROOM_ID,
        senderId: MOCK_USER_ID,
        type: MessageType.TEXT,
        content: { text: `Concurrent message ${i}` }
      }));

      const start = now();
      const results = await Promise.all(
        messages.map(msg => chatService.sendMessage(msg as IChatMessage))
      );
      const end = now();

      const avgLatency = (end - start) / CONCURRENT_MESSAGES;
      performanceMetrics.messageLatency.push(avgLatency);

      expect(results).toHaveLength(CONCURRENT_MESSAGES);
      expect(avgLatency).toBeLessThan(LATENCY_THRESHOLD);
      results.forEach(result => {
        expect(result.status).toBe(MessageStatus.DELIVERED);
      });
    }, TEST_TIMEOUT);
  });

  describe('AI Persona Interaction Tests', () => {
    it('should handle AI persona responses', async () => {
      const testMessage: Partial<IChatMessage> = {
        roomId: MOCK_ROOM_ID,
        senderId: MOCK_USER_ID,
        type: MessageType.TEXT,
        content: { text: 'Hello AI' }
      };

      const start = now();
      const result = await chatService.handleAIResponse(testMessage as IChatMessage);
      const end = now();

      performanceMetrics.aiResponseTime.push(end - start);

      expect(result).toBeDefined();
      expect(result.type).toBe(MessageType.AI_RESPONSE);
      expect(result.aiMetadata).toBeDefined();
      expect(result.aiMetadata?.confidence).toBeGreaterThan(0.8);
    });

    it('should maintain context in AI conversations', async () => {
      const messages = [
        { text: 'Plan a trip to Paris' },
        { text: 'What about hotels?' },
        { text: 'Show me restaurants' }
      ];

      const responses = await Promise.all(
        messages.map(async (msg) => {
          const message: Partial<IChatMessage> = {
            roomId: MOCK_ROOM_ID,
            senderId: MOCK_USER_ID,
            type: MessageType.TEXT,
            content: msg
          };
          return chatService.handleAIResponse(message as IChatMessage);
        })
      );

      responses.forEach(response => {
        expect(response.aiMetadata?.confidence).toBeGreaterThan(0.8);
        expect(response.content.text).toBeDefined();
      });
    });
  });

  describe('Message Threading Tests', () => {
    it('should create and manage message threads', async () => {
      // Create root message
      const rootMessage = await chatService.sendMessage({
        roomId: MOCK_ROOM_ID,
        senderId: MOCK_USER_ID,
        type: MessageType.TEXT,
        content: { text: 'Root message' }
      } as IChatMessage);

      // Create thread
      const thread = await chatService.createMessageThread(rootMessage.id);
      expect(thread).toBeDefined();

      // Add replies
      const replies = await Promise.all([
        chatService.sendMessage({
          roomId: MOCK_ROOM_ID,
          senderId: MOCK_USER_ID,
          type: MessageType.TEXT,
          content: { text: 'Reply 1' },
          threadId: thread.id
        } as IChatMessage),
        chatService.sendMessage({
          roomId: MOCK_ROOM_ID,
          senderId: MOCK_USER_ID,
          type: MessageType.TEXT,
          content: { text: 'Reply 2' },
          threadId: thread.id
        } as IChatMessage)
      ]);

      expect(replies).toHaveLength(2);
      replies.forEach(reply => {
        expect(reply.threadMetadata?.rootMessageId).toBe(rootMessage.id);
      });
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle invalid message content', async () => {
      const invalidMessage: Partial<IChatMessage> = {
        roomId: MOCK_ROOM_ID,
        senderId: MOCK_USER_ID,
        type: MessageType.TEXT,
        content: { text: 'a'.repeat(5000) } // Exceeds max length
      };

      await expect(
        chatService.sendMessage(invalidMessage as IChatMessage)
      ).rejects.toThrow();
    });

    it('should handle network disconnections gracefully', async () => {
      mockSocket.emit('disconnect');
      
      const testMessage: Partial<IChatMessage> = {
        roomId: MOCK_ROOM_ID,
        senderId: MOCK_USER_ID,
        type: MessageType.TEXT,
        content: { text: 'Test message' }
      };

      const result = await chatService.sendMessage(testMessage as IChatMessage);
      expect(result.status).toBe(MessageStatus.SENT);
    });
  });
});