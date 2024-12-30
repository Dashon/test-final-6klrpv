/**
 * @fileoverview Controller handling HTTP requests for chat room operations
 * @module social-service/controllers/room
 * @version 1.0.0
 */

import { Router, Request, Response, NextFunction } from 'express'; // v4.18.x
import { injectable, inject } from 'inversify'; // v6.0.x
import rateLimit from 'express-rate-limit'; // v6.7.x
import { validate } from 'class-validator'; // v0.14.x
import { RoomService } from '../services/room.service';
import { 
  IChatRoom, 
  RoomType, 
  ParticipantRole,
  IParticipant,
  MAX_ROOM_PARTICIPANTS 
} from '../interfaces/room.interface';
import { logger } from '../../../shared/utils/logger.util';
import { ErrorCode, ErrorMessage } from '../../../shared/constants/error-codes';
import { HttpStatus } from '../../../shared/constants/status-codes';
import { BaseResponse, ErrorResponse } from '../../../shared/interfaces/base.interface';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100; // requests per window

@injectable()
export class RoomController {
  private readonly router: Router;
  private readonly rateLimiter: any;

  constructor(
    @inject('RoomService') private readonly roomService: RoomService,
    @inject('Logger') private readonly logger: typeof logger
  ) {
    this.router = Router();
    this.initializeRateLimiter();
    this.initializeRoutes();
  }

  /**
   * Initialize rate limiting middleware
   */
  private initializeRateLimiter(): void {
    this.rateLimiter = rateLimit({
      windowMs: RATE_LIMIT_WINDOW,
      max: RATE_LIMIT_MAX,
      message: { error: ErrorMessage[ErrorCode.RATE_LIMIT_EXCEEDED] },
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  /**
   * Initialize controller routes with middleware
   */
  private initializeRoutes(): void {
    // Room management routes
    this.router.post('/', this.rateLimiter, this.createRoom.bind(this));
    this.router.get('/:roomId', this.getRoom.bind(this));
    this.router.put('/:roomId', this.rateLimiter, this.updateRoom.bind(this));
    this.router.delete('/:roomId', this.deleteRoom.bind(this));

    // Participant management routes
    this.router.get('/:roomId/participants', this.getRoomParticipants.bind(this));
    this.router.post('/:roomId/participants', this.rateLimiter, this.addParticipant.bind(this));
    this.router.delete('/:roomId/participants/:userId', this.removeParticipant.bind(this));
  }

  /**
   * Create a new chat room
   */
  public async createRoom(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const { name, type, participants, settings } = req.body;
      const userId = req.user.id; // Assuming auth middleware sets user

      // Validate request data
      if (!name || !type || !participants) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: ErrorCode.VALIDATION_ERROR,
          message: 'Missing required fields'
        } as ErrorResponse);
      }

      // Validate room type
      if (!Object.values(RoomType).includes(type)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: ErrorCode.VALIDATION_ERROR,
          message: 'Invalid room type'
        } as ErrorResponse);
      }

      // Add creator as owner
      const enrichedParticipants: IParticipant[] = [
        {
          userId,
          role: ParticipantRole.OWNER,
          joinedAt: new Date(),
          lastReadAt: new Date()
        },
        ...participants
      ];

      const room = await this.roomService.createRoom({
        name,
        type,
        participants: enrichedParticipants,
        settings
      });

      this.logger.info('Room created successfully', { roomId: room.id, userId });

      return res.status(HttpStatus.CREATED).json({
        success: true,
        status: HttpStatus.CREATED,
        data: room
      } as BaseResponse<IChatRoom>);

    } catch (error) {
      this.logger.error('Failed to create room', error as Error, { userId: req.user.id });
      next(error);
    }
  }

  /**
   * Get room details by ID
   */
  public async getRoom(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const { roomId } = req.params;
      const userId = req.user.id;

      const room = await this.roomService.getRoomById(roomId, userId);

      return res.status(HttpStatus.OK).json({
        success: true,
        status: HttpStatus.OK,
        data: room
      } as BaseResponse<IChatRoom>);

    } catch (error) {
      this.logger.error('Failed to get room', error as Error, { roomId: req.params.roomId });
      next(error);
    }
  }

  /**
   * Update room details
   */
  public async updateRoom(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const { roomId } = req.params;
      const userId = req.user.id;
      const updates = req.body;

      const updatedRoom = await this.roomService.updateRoom(roomId, userId, updates);

      return res.status(HttpStatus.OK).json({
        success: true,
        status: HttpStatus.OK,
        data: updatedRoom
      } as BaseResponse<IChatRoom>);

    } catch (error) {
      this.logger.error('Failed to update room', error as Error, { roomId: req.params.roomId });
      next(error);
    }
  }

  /**
   * Delete a room
   */
  public async deleteRoom(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const { roomId } = req.params;
      const userId = req.user.id;

      await this.roomService.deleteRoom(roomId, userId);

      return res.status(HttpStatus.NO_CONTENT).send();

    } catch (error) {
      this.logger.error('Failed to delete room', error as Error, { roomId: req.params.roomId });
      next(error);
    }
  }

  /**
   * Get room participants
   */
  public async getRoomParticipants(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const { roomId } = req.params;
      const userId = req.user.id;

      const participants = await this.roomService.getRoomParticipants(roomId, userId);

      return res.status(HttpStatus.OK).json({
        success: true,
        status: HttpStatus.OK,
        data: participants
      } as BaseResponse<IParticipant[]>);

    } catch (error) {
      this.logger.error('Failed to get room participants', error as Error, { roomId: req.params.roomId });
      next(error);
    }
  }

  /**
   * Add participant to room
   */
  public async addParticipant(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const { roomId } = req.params;
      const userId = req.user.id;
      const { participantId, role } = req.body;

      if (!participantId || !role) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: ErrorCode.VALIDATION_ERROR,
          message: 'Missing required fields'
        } as ErrorResponse);
      }

      const participant: IParticipant = {
        userId: participantId,
        role,
        joinedAt: new Date(),
        lastReadAt: new Date()
      };

      const updatedRoom = await this.roomService.addParticipant(roomId, userId, participant);

      return res.status(HttpStatus.OK).json({
        success: true,
        status: HttpStatus.OK,
        data: updatedRoom
      } as BaseResponse<IChatRoom>);

    } catch (error) {
      this.logger.error('Failed to add participant', error as Error, { roomId: req.params.roomId });
      next(error);
    }
  }

  /**
   * Remove participant from room
   */
  public async removeParticipant(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const { roomId, userId: participantId } = req.params;
      const userId = req.user.id;

      await this.roomService.removeParticipant(roomId, userId, participantId);

      return res.status(HttpStatus.NO_CONTENT).send();

    } catch (error) {
      this.logger.error('Failed to remove participant', error as Error, { 
        roomId: req.params.roomId, 
        participantId: req.params.userId 
      });
      next(error);
    }
  }

  /**
   * Get router instance
   */
  public getRouter(): Router {
    return this.router;
  }
}