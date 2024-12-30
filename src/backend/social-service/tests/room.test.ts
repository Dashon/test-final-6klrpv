/**
 * @fileoverview Comprehensive test suite for chat room functionality
 * @version 1.0.0
 */

import { Server as WebSocketServer } from 'socket.io';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import { RoomService } from '../src/services/room.service';
import { logger } from '../../../shared/utils/logger.util';
import { MetricsCollector } from '../../../shared/utils/metrics.util';
import {
  IChatRoom,
  RoomType,
  RoomStatus,
  ParticipantRole,
  IParticipant
} from '../src/interfaces/room.interface';
import { ErrorCode } from '../../../shared/constants/error-codes';

describe('RoomService Tests', () => {
  let roomService: RoomService;
  let mongoServer: MongoMemoryServer;
  let wsServer: jest.Mocked<WebSocketServer>;
  let metricsCollector: jest.Mocked<MetricsCollector>;

  // Test data generators
  const generateUserId = () => faker.string.uuid();
  const generateRoomName = () => faker.lorem.words(3);

  beforeAll(async () => {
    // Setup MongoDB memory server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Mock WebSocket server
    wsServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    } as unknown as jest.Mocked<WebSocketServer>;

    // Mock metrics collector
    metricsCollector = {
      incrementCounter: jest.fn(),
      recordDuration: jest.fn(),
      gaugeValue: jest.fn()
    } as unknown as jest.Mocked<MetricsCollector>;

    // Initialize RoomService with mocks
    roomService = new RoomService(
      logger,
      wsServer,
      mongoose.model('Room'),
      metricsCollector
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Room Creation Tests', () => {
    it('should create a direct message room successfully', async () => {
      const participants = [
        { userId: generateUserId(), role: ParticipantRole.MEMBER },
        { userId: generateUserId(), role: ParticipantRole.MEMBER }
      ];

      const roomData = {
        name: generateRoomName(),
        type: RoomType.DIRECT,
        participants
      };

      const room = await roomService.createRoom(roomData);

      expect(room).toBeDefined();
      expect(room.type).toBe(RoomType.DIRECT);
      expect(room.participants).toHaveLength(2);
      expect(room.status).toBe(RoomStatus.ACTIVE);
      expect(wsServer.emit).toHaveBeenCalledWith('room:created', expect.any(Object));
      expect(metricsCollector.incrementCounter).toHaveBeenCalledWith('rooms_created');
    });

    it('should create a group chat room with AI persona', async () => {
      const participants = [
        { userId: generateUserId(), role: ParticipantRole.OWNER },
        { userId: generateUserId(), role: ParticipantRole.MEMBER },
        { userId: 'ai-persona-1', role: ParticipantRole.AI_PERSONA }
      ];

      const roomData = {
        name: generateRoomName(),
        type: RoomType.GROUP,
        participants,
        settings: {
          allowAIPersonas: true,
          isPrivate: true
        }
      };

      const room = await roomService.createRoom(roomData);

      expect(room).toBeDefined();
      expect(room.type).toBe(RoomType.GROUP);
      expect(room.participants).toHaveLength(3);
      expect(room.settings.allowAIPersonas).toBe(true);
      expect(room.settings.isPrivate).toBe(true);
    });

    it('should fail to create room with invalid participant count', async () => {
      const participants = Array(51).fill(null).map(() => ({
        userId: generateUserId(),
        role: ParticipantRole.MEMBER
      }));

      const roomData = {
        name: generateRoomName(),
        type: RoomType.GROUP,
        participants
      };

      await expect(roomService.createRoom(roomData))
        .rejects
        .toThrow('Maximum 50 participants allowed');
    });
  });

  describe('Real-time Operations Tests', () => {
    let testRoom: IChatRoom;
    let testUserId: string;

    beforeEach(async () => {
      testUserId = generateUserId();
      const roomData = {
        name: generateRoomName(),
        type: RoomType.GROUP,
        participants: [
          { userId: testUserId, role: ParticipantRole.OWNER }
        ]
      };
      testRoom = await roomService.createRoom(roomData);
    });

    it('should emit events when adding participants', async () => {
      const newParticipant: IParticipant = {
        userId: generateUserId(),
        role: ParticipantRole.MEMBER,
        joinedAt: new Date(),
        lastReadAt: new Date()
      };

      await roomService.manageParticipants(
        testRoom.id,
        testUserId,
        'add',
        [newParticipant]
      );

      expect(wsServer.to).toHaveBeenCalledWith(testRoom.id);
      expect(wsServer.emit).toHaveBeenCalledWith(
        'room:participant:joined',
        expect.objectContaining({
          roomId: testRoom.id,
          participants: [newParticipant]
        })
      );
    });

    it('should handle concurrent participant updates', async () => {
      const participantPromises = Array(5).fill(null).map(() => {
        const participant: IParticipant = {
          userId: generateUserId(),
          role: ParticipantRole.MEMBER,
          joinedAt: new Date(),
          lastReadAt: new Date()
        };
        return roomService.manageParticipants(
          testRoom.id,
          testUserId,
          'add',
          [participant]
        );
      });

      const results = await Promise.all(participantPromises);
      const finalRoom = results[results.length - 1];

      expect(finalRoom.participants.length).toBe(6); // Initial owner + 5 new participants
      expect(wsServer.emit).toHaveBeenCalledTimes(5);
    });
  });

  describe('Performance and Scale Tests', () => {
    it('should handle large participant groups efficiently', async () => {
      const participants = Array(50).fill(null).map(() => ({
        userId: generateUserId(),
        role: ParticipantRole.MEMBER,
        joinedAt: new Date(),
        lastReadAt: new Date()
      }));

      const start = Date.now();
      const room = await roomService.createRoom({
        name: generateRoomName(),
        type: RoomType.GROUP,
        participants: [
          { userId: generateUserId(), role: ParticipantRole.OWNER },
          ...participants
        ]
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(room.participants).toHaveLength(51);
    });

    it('should maintain consistency under concurrent room updates', async () => {
      const room = await roomService.createRoom({
        name: generateRoomName(),
        type: RoomType.GROUP,
        participants: [{ userId: generateUserId(), role: ParticipantRole.OWNER }]
      });

      const updatePromises = Array(10).fill(null).map((_, index) => {
        return roomService.updateRoom(room.id, room.participants[0].userId, {
          name: `Updated Room ${index}`
        });
      });

      const results = await Promise.all(updatePromises);
      const versions = results.map(r => r.version);
      const uniqueVersions = new Set(versions);

      expect(uniqueVersions.size).toBe(10); // Each update should have a unique version
      expect(wsServer.emit).toHaveBeenCalledTimes(10);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle unauthorized access attempts', async () => {
      const room = await roomService.createRoom({
        name: generateRoomName(),
        type: RoomType.GROUP,
        participants: [{ userId: generateUserId(), role: ParticipantRole.OWNER }]
      });

      const unauthorizedUserId = generateUserId();
      await expect(roomService.updateRoom(room.id, unauthorizedUserId, {
        name: 'Unauthorized Update'
      })).rejects.toThrow(ErrorCode.AUTHORIZATION_ERROR);
    });

    it('should prevent invalid room configurations', async () => {
      // Test direct message room with wrong participant count
      await expect(roomService.createRoom({
        name: generateRoomName(),
        type: RoomType.DIRECT,
        participants: [
          { userId: generateUserId(), role: ParticipantRole.MEMBER },
          { userId: generateUserId(), role: ParticipantRole.MEMBER },
          { userId: generateUserId(), role: ParticipantRole.MEMBER }
        ]
      })).rejects.toThrow('Direct rooms must have exactly 2 participants');

      // Test group room without owner
      await expect(roomService.createRoom({
        name: generateRoomName(),
        type: RoomType.GROUP,
        participants: [
          { userId: generateUserId(), role: ParticipantRole.MEMBER },
          { userId: generateUserId(), role: ParticipantRole.MEMBER }
        ]
      })).rejects.toThrow('Group room must have at least one owner');
    });
  });
});