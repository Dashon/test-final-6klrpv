/**
 * @fileoverview WebSocket handler for managing real-time room events in the social service
 * @module social-service/websocket/room
 * @version 1.0.0
 */

import { injectable, inject } from 'inversify'; // v6.0.x
import { Socket } from 'socket.io'; // v4.6.x
import { IChatRoom, RoomType, ParticipantRole, IParticipant } from '../interfaces/room.interface';
import { RoomService } from '../services/room.service';
import { Logger } from '../../../shared/utils/logger.util';
import { ErrorCode } from '../../../shared/constants/error-codes';

// Room event constants
const ROOM_EVENTS = {
  JOIN: 'room:join',
  LEAVE: 'room:leave',
  UPDATE: 'room:update',
  STATE_CHANGE: 'room:state_change',
  ERROR: 'room:error',
  TIMEOUT: 'room:timeout'
} as const;

// Configuration constants
const SOCKET_TIMEOUT = 5000; // 5 seconds
const MAX_ROOM_PARTICIPANTS = 100;
const RETRY_OPTIONS = {
  maxRetries: 3,
  backoffMs: 1000,
  timeoutMs: 5000
};

// Types for room events
interface JoinRoomData {
  roomId: string;
  userId: string;
  isAIPersona?: boolean;
  metadata?: Record<string, any>;
}

interface LeaveRoomData {
  roomId: string;
  userId: string;
}

interface RoomUpdateData {
  roomId: string;
  userId: string;
  updates: Partial<IChatRoom>;
}

@injectable()
export class RoomHandler {
  constructor(
    @inject('Logger') private readonly logger: Logger,
    @inject('RoomService') private readonly roomService: RoomService
  ) {}

  /**
   * Handles user joining a chat room with enhanced security and performance monitoring
   */
  public async handleJoinRoom(socket: Socket, data: JoinRoomData): Promise<void> {
    const startTime = Date.now();
    const { roomId, userId, isAIPersona, metadata } = data;

    try {
      this.logger.debug('Processing join room request', { roomId, userId, isAIPersona });

      // Validate room access
      const room = await this.roomService.getRoomById(roomId, userId);
      
      // Check room capacity
      if (room.participants.length >= MAX_ROOM_PARTICIPANTS) {
        throw new Error(ErrorCode.VALIDATION_ERROR);
      }

      // Create participant object
      const participant: IParticipant = {
        userId,
        role: isAIPersona ? ParticipantRole.AI_PERSONA : ParticipantRole.MEMBER,
        joinedAt: new Date(),
        lastReadAt: new Date()
      };

      // Add participant with retry logic
      let retries = RETRY_OPTIONS.maxRetries;
      while (retries > 0) {
        try {
          await this.roomService.manageParticipants(roomId, userId, 'add', [participant]);
          break;
        } catch (error) {
          if (retries === 1) throw error;
          retries--;
          await new Promise(resolve => setTimeout(resolve, RETRY_OPTIONS.backoffMs));
        }
      }

      // Subscribe socket to room events with timeout handling
      const joinPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Join room timeout'));
        }, SOCKET_TIMEOUT);

        socket.join(roomId, (err?: Error) => {
          clearTimeout(timeout);
          if (err) reject(err);
          else resolve();
        });
      });

      await joinPromise;

      // Emit join success event
      socket.emit(ROOM_EVENTS.STATE_CHANGE, {
        type: ROOM_EVENTS.JOIN,
        roomId,
        participant,
        timestamp: new Date()
      });

      // Broadcast to other room participants
      socket.to(roomId).emit(ROOM_EVENTS.STATE_CHANGE, {
        type: ROOM_EVENTS.JOIN,
        roomId,
        participant,
        timestamp: new Date()
      });

      this.logger.info('User joined room successfully', {
        roomId,
        userId,
        latency: Date.now() - startTime,
        isAIPersona
      });

    } catch (error) {
      this.logger.error('Failed to join room', error as Error, {
        roomId,
        userId,
        latency: Date.now() - startTime
      });

      socket.emit(ROOM_EVENTS.ERROR, {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to join room',
        roomId
      });
    }
  }

  /**
   * Handles user leaving a chat room with cleanup and state management
   */
  public async handleLeaveRoom(socket: Socket, data: LeaveRoomData): Promise<void> {
    const startTime = Date.now();
    const { roomId, userId } = data;

    try {
      this.logger.debug('Processing leave room request', { roomId, userId });

      // Remove participant with retry logic
      let retries = RETRY_OPTIONS.maxRetries;
      while (retries > 0) {
        try {
          await this.roomService.manageParticipants(roomId, userId, 'remove', [{ userId } as IParticipant]);
          break;
        } catch (error) {
          if (retries === 1) throw error;
          retries--;
          await new Promise(resolve => setTimeout(resolve, RETRY_OPTIONS.backoffMs));
        }
      }

      // Unsubscribe socket from room
      await socket.leave(roomId);

      // Broadcast leave event
      socket.to(roomId).emit(ROOM_EVENTS.STATE_CHANGE, {
        type: ROOM_EVENTS.LEAVE,
        roomId,
        userId,
        timestamp: new Date()
      });

      this.logger.info('User left room successfully', {
        roomId,
        userId,
        latency: Date.now() - startTime
      });

    } catch (error) {
      this.logger.error('Failed to leave room', error as Error, {
        roomId,
        userId,
        latency: Date.now() - startTime
      });

      socket.emit(ROOM_EVENTS.ERROR, {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to leave room',
        roomId
      });
    }
  }

  /**
   * Handles room state updates with validation and synchronization
   */
  public async handleRoomUpdate(socket: Socket, data: RoomUpdateData): Promise<void> {
    const startTime = Date.now();
    const { roomId, userId, updates } = data;

    try {
      this.logger.debug('Processing room update request', { roomId, userId, updates });

      // Validate and apply updates
      const updatedRoom = await this.roomService.updateRoom(roomId, userId, updates);

      // Broadcast update to all room participants
      socket.to(roomId).emit(ROOM_EVENTS.STATE_CHANGE, {
        type: ROOM_EVENTS.UPDATE,
        roomId,
        updates,
        timestamp: new Date(),
        version: updatedRoom.version
      });

      this.logger.info('Room updated successfully', {
        roomId,
        userId,
        latency: Date.now() - startTime
      });

    } catch (error) {
      this.logger.error('Failed to update room', error as Error, {
        roomId,
        userId,
        latency: Date.now() - startTime
      });

      socket.emit(ROOM_EVENTS.ERROR, {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to update room',
        roomId
      });
    }
  }
}