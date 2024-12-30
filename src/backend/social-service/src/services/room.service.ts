/**
 * @fileoverview Enhanced service layer for chat room management with real-time features
 * @module social-service/services/room
 * @version 1.0.0
 */

import { injectable, inject } from 'inversify';
import { Server as WebSocketServer } from 'socket.io';
import mongoose from 'mongoose';
import { 
  IChatRoom, 
  RoomType, 
  RoomStatus, 
  ParticipantRole,
  IParticipant,
  IRoomSettings,
  MAX_ROOM_PARTICIPANTS,
  DEFAULT_RETENTION_PERIOD 
} from '../interfaces/room.interface';
import RoomModel from '../models/room.model';
import { logger } from '../../../shared/utils/logger.util';
import { ErrorCode, ErrorMessage } from '../../../shared/constants/error-codes';
import { HttpStatus } from '../../../shared/constants/status-codes';
import { MetricsCollector } from '../../../shared/utils/metrics.util';

// Room event types for WebSocket communication
enum RoomEvent {
  CREATED = 'room:created',
  UPDATED = 'room:updated',
  DELETED = 'room:deleted',
  PARTICIPANT_JOINED = 'room:participant:joined',
  PARTICIPANT_LEFT = 'room:participant:left',
  STATUS_CHANGED = 'room:status:changed'
}

// Room action types for access control
enum RoomAction {
  VIEW = 'view',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE_PARTICIPANTS = 'manage_participants'
}

// Default room configuration
const DEFAULT_ROOM_SETTINGS: IRoomSettings = {
  isPrivate: true,
  allowAIPersonas: true,
  maxParticipants: MAX_ROOM_PARTICIPANTS,
  retentionPeriod: DEFAULT_RETENTION_PERIOD,
  allowedFeatures: ['chat', 'file_sharing', 'voice_chat']
};

// Room metrics configuration
const ROOM_METRICS = {
  participantLimit: MAX_ROOM_PARTICIPANTS,
  messageRateLimit: 100, // messages per minute
  concurrentUpdates: 20,
  retryAttempts: 3
};

@injectable()
export class RoomService {
  constructor(
    @inject('Logger') private readonly logger: typeof logger,
    @inject('WebSocketServer') private readonly wsServer: WebSocketServer,
    @inject('RoomModel') private readonly roomModel: typeof RoomModel,
    @inject('MetricsCollector') private readonly metrics: MetricsCollector
  ) {
    this.initializeCleanupJob();
  }

  /**
   * Creates a new chat room with enhanced validation and security
   */
  public async createRoom(roomData: Partial<IChatRoom>): Promise<IChatRoom> {
    try {
      this.logger.debug('Creating new room', { roomData });
      
      // Validate room data
      await this.validateRoomData(roomData);

      // Apply default settings and security policies
      const room = new this.roomModel({
        ...roomData,
        settings: { ...DEFAULT_ROOM_SETTINGS, ...roomData.settings },
        status: RoomStatus.ACTIVE,
        metadata: {
          ...roomData.metadata,
          createdAt: new Date(),
          securityLevel: roomData.settings?.isPrivate ? 'high' : 'standard'
        }
      });

      // Save room with optimistic locking
      const savedRoom = await this.saveWithRetry(room);

      // Emit room creation event
      this.emitRoomEvent(RoomEvent.CREATED, savedRoom);

      // Track metrics
      this.metrics.incrementCounter('rooms_created');

      return savedRoom;
    } catch (error) {
      this.logger.error('Failed to create room', error as Error, { roomData });
      throw error;
    }
  }

  /**
   * Retrieves a room by ID with access control
   */
  public async getRoomById(roomId: string, userId: string): Promise<IChatRoom> {
    try {
      const room = await this.roomModel.findById(roomId).lean();
      
      if (!room) {
        throw new Error(ErrorMessage[ErrorCode.RESOURCE_NOT_FOUND]);
      }

      // Validate access
      if (!await this.validateRoomAccess(roomId, userId, RoomAction.VIEW)) {
        throw new Error(ErrorMessage[ErrorCode.AUTHORIZATION_ERROR]);
      }

      return room;
    } catch (error) {
      this.logger.error('Failed to get room', error as Error, { roomId, userId });
      throw error;
    }
  }

  /**
   * Updates room details with optimistic locking
   */
  public async updateRoom(
    roomId: string, 
    userId: string, 
    updates: Partial<IChatRoom>
  ): Promise<IChatRoom> {
    try {
      // Validate access
      if (!await this.validateRoomAccess(roomId, userId, RoomAction.UPDATE)) {
        throw new Error(ErrorMessage[ErrorCode.AUTHORIZATION_ERROR]);
      }

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const room = await this.roomModel.findById(roomId).session(session);
        
        if (!room) {
          throw new Error(ErrorMessage[ErrorCode.RESOURCE_NOT_FOUND]);
        }

        // Apply updates with validation
        Object.assign(room, updates);
        room.version = (room.version || 0) + 1;

        await room.save();
        await session.commitTransaction();

        // Emit update event
        this.emitRoomEvent(RoomEvent.UPDATED, room);

        return room.toObject();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } catch (error) {
      this.logger.error('Failed to update room', error as Error, { roomId, updates });
      throw error;
    }
  }

  /**
   * Manages room participants with security checks
   */
  public async manageParticipants(
    roomId: string,
    userId: string,
    action: 'add' | 'remove',
    participants: IParticipant[]
  ): Promise<IChatRoom> {
    try {
      // Validate access
      if (!await this.validateRoomAccess(roomId, userId, RoomAction.MANAGE_PARTICIPANTS)) {
        throw new Error(ErrorMessage[ErrorCode.AUTHORIZATION_ERROR]);
      }

      const room = await this.roomModel.findById(roomId);
      
      if (!room) {
        throw new Error(ErrorMessage[ErrorCode.RESOURCE_NOT_FOUND]);
      }

      if (action === 'add') {
        // Validate participant limit
        if (room.participants.length + participants.length > room.settings.maxParticipants) {
          throw new Error('Participant limit exceeded');
        }

        room.participants.push(...participants);
        this.emitRoomEvent(RoomEvent.PARTICIPANT_JOINED, { roomId, participants });
      } else {
        const participantIds = participants.map(p => p.userId);
        room.participants = room.participants.filter(p => !participantIds.includes(p.userId));
        this.emitRoomEvent(RoomEvent.PARTICIPANT_LEFT, { roomId, participants });
      }

      await room.save();
      return room.toObject();
    } catch (error) {
      this.logger.error('Failed to manage participants', error as Error, { roomId, action });
      throw error;
    }
  }

  /**
   * Validates room access rights and permissions
   */
  public async validateRoomAccess(
    roomId: string,
    userId: string,
    action: RoomAction
  ): Promise<boolean> {
    try {
      const room = await this.roomModel.findById(roomId);
      
      if (!room) {
        return false;
      }

      const participant = room.participants.find(p => p.userId === userId);

      if (!participant) {
        return false;
      }

      // Define action permissions
      const permissions = {
        [RoomAction.VIEW]: [ParticipantRole.OWNER, ParticipantRole.ADMIN, ParticipantRole.MEMBER],
        [RoomAction.UPDATE]: [ParticipantRole.OWNER, ParticipantRole.ADMIN],
        [RoomAction.DELETE]: [ParticipantRole.OWNER],
        [RoomAction.MANAGE_PARTICIPANTS]: [ParticipantRole.OWNER, ParticipantRole.ADMIN]
      };

      return permissions[action].includes(participant.role);
    } catch (error) {
      this.logger.error('Access validation failed', error as Error, { roomId, userId, action });
      return false;
    }
  }

  /**
   * Handles real-time room events via WebSocket
   */
  private emitRoomEvent(event: RoomEvent, payload: any): void {
    try {
      this.wsServer.to(payload.roomId).emit(event, payload);
      this.logger.debug('Room event emitted', { event, payload });
    } catch (error) {
      this.logger.error('Failed to emit room event', error as Error, { event, payload });
    }
  }

  /**
   * Saves room with retry mechanism for handling race conditions
   */
  private async saveWithRetry(room: any, attempts = ROOM_METRICS.retryAttempts): Promise<IChatRoom> {
    try {
      return await room.save();
    } catch (error) {
      if (error instanceof mongoose.Error.VersionError && attempts > 0) {
        const freshRoom = await this.roomModel.findById(room._id);
        if (freshRoom) {
          room.version = freshRoom.version;
          return this.saveWithRetry(room, attempts - 1);
        }
      }
      throw error;
    }
  }

  /**
   * Initializes cleanup job for inactive rooms
   */
  private initializeCleanupJob(): void {
    setInterval(async () => {
      try {
        const cutoffDate = new Date(Date.now() - DEFAULT_RETENTION_PERIOD);
        await this.roomModel.updateMany(
          { 
            lastMessageAt: { $lt: cutoffDate },
            status: RoomStatus.ACTIVE
          },
          { status: RoomStatus.ARCHIVED }
        );
      } catch (error) {
        this.logger.error('Room cleanup job failed', error as Error);
      }
    }, 24 * 60 * 60 * 1000); // Run daily
  }

  /**
   * Validates room data before creation/update
   */
  private async validateRoomData(roomData: Partial<IChatRoom>): Promise<void> {
    if (!roomData.name || roomData.name.length > 100) {
      throw new Error('Invalid room name');
    }

    if (roomData.type === RoomType.DIRECT && roomData.participants?.length !== 2) {
      throw new Error('Direct rooms must have exactly 2 participants');
    }

    if (roomData.participants?.length > MAX_ROOM_PARTICIPANTS) {
      throw new Error(`Maximum ${MAX_ROOM_PARTICIPANTS} participants allowed`);
    }
  }
}