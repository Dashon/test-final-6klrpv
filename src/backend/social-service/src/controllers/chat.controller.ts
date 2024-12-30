/**
 * @fileoverview Chat controller handling HTTP endpoints for real-time communication
 * @module social-service/controllers/chat
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { IsString, IsUUID, IsInt, Min, Max } from 'class-validator';
import rateLimit from 'express-rate-limit';
import { Logger } from 'winston';

import { ChatService } from '../services/chat.service';
import { IChatMessage } from '../interfaces/chat.interface';
import validationMiddleware from '../../../shared/middleware/validation.middleware';
import { ErrorCode, ErrorMetadata } from '../../../shared/constants/error-codes';
import { HttpStatus } from '../../../shared/constants/status-codes';
import { BaseResponse, ErrorResponse } from '../../../shared/interfaces/base.interface';

// Constants for rate limiting and pagination
const MESSAGE_RATE_LIMIT = 60; // messages per minute
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

/**
 * DTO for sending new messages
 */
class SendMessageDto {
  @IsUUID()
  roomId!: string;

  @IsString()
  content!: string;

  @IsUUID()
  senderId!: string;
}

/**
 * DTO for retrieving messages
 */
class GetMessagesDto {
  @IsUUID()
  roomId!: string;

  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number = DEFAULT_PAGE_SIZE;
}

/**
 * DTO for marking messages as read
 */
class MarkAsReadDto {
  @IsUUID()
  messageId!: string;
}

/**
 * Controller handling chat-related HTTP endpoints
 */
@injectable()
export class ChatController {
  constructor(
    @inject('ChatService') private readonly chatService: ChatService,
    @inject('Logger') private readonly logger: Logger
  ) {}

  /**
   * Send a new chat message
   * @route POST /api/chat/messages
   */
  public sendMessage = [
    validationMiddleware(SendMessageDto),
    rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: MESSAGE_RATE_LIMIT,
      message: 'Too many messages sent. Please try again later.'
    }),
    async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
      try {
        const correlationId = req.headers['x-correlation-id'] as string;
        this.logger.info('Sending new message', { correlationId });

        const messageData: IChatMessage = {
          ...req.body,
          content: { text: req.body.content },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const message = await this.chatService.sendMessage(messageData);

        // Set cache control headers
        res.setHeader('Cache-Control', 'no-cache');

        const response: BaseResponse<IChatMessage> = {
          success: true,
          status: HttpStatus.CREATED,
          data: message
        };

        this.logger.info('Message sent successfully', {
          correlationId,
          messageId: message.id
        });

        return res.status(HttpStatus.CREATED).json(response);
      } catch (error) {
        this.logger.error('Failed to send message', error as Error, {
          correlationId: req.headers['x-correlation-id']
        });
        next(error);
      }
    }
  ];

  /**
   * Retrieve paginated messages for a chat room
   * @route GET /api/chat/rooms/:roomId/messages
   */
  public getMessages = [
    validationMiddleware(GetMessagesDto),
    rateLimit({
      windowMs: 60 * 1000,
      max: 120,
      message: 'Too many requests. Please try again later.'
    }),
    async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
      try {
        const correlationId = req.headers['x-correlation-id'] as string;
        const { roomId } = req.params;
        const { page = 1, limit = DEFAULT_PAGE_SIZE } = req.query;

        this.logger.info('Retrieving messages', {
          correlationId,
          roomId,
          page,
          limit
        });

        const messages = await this.chatService.getMessages(
          roomId,
          Number(page),
          Number(limit)
        );

        // Set cache control headers with short TTL
        res.setHeader('Cache-Control', 'private, max-age=10');

        const response: BaseResponse<IChatMessage[]> = {
          success: true,
          status: HttpStatus.OK,
          data: messages
        };

        this.logger.info('Messages retrieved successfully', {
          correlationId,
          count: messages.length
        });

        return res.status(HttpStatus.OK).json(response);
      } catch (error) {
        this.logger.error('Failed to retrieve messages', error as Error, {
          correlationId: req.headers['x-correlation-id']
        });
        next(error);
      }
    }
  ];

  /**
   * Mark a message as read
   * @route PATCH /api/chat/messages/:messageId/read
   */
  public markAsRead = [
    validationMiddleware(MarkAsReadDto),
    rateLimit({
      windowMs: 60 * 1000,
      max: 180,
      message: 'Too many read receipts. Please try again later.'
    }),
    async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
      try {
        const correlationId = req.headers['x-correlation-id'] as string;
        const { messageId } = req.params;
        const userId = req.user?.id; // Assuming user is attached by auth middleware

        if (!userId) {
          const errorResponse: ErrorResponse = {
            success: false,
            status: HttpStatus.UNAUTHORIZED,
            error: ErrorCode.AUTHENTICATION_ERROR,
            message: 'User not authenticated'
          };
          return res.status(HttpStatus.UNAUTHORIZED).json(errorResponse);
        }

        this.logger.info('Marking message as read', {
          correlationId,
          messageId,
          userId
        });

        await this.chatService.markMessageAsRead(messageId, userId);

        // Set cache control headers
        res.setHeader('Cache-Control', 'no-cache');

        const response: BaseResponse<null> = {
          success: true,
          status: HttpStatus.OK,
          data: null
        };

        this.logger.info('Message marked as read', {
          correlationId,
          messageId,
          userId
        });

        return res.status(HttpStatus.OK).json(response);
      } catch (error) {
        this.logger.error('Failed to mark message as read', error as Error, {
          correlationId: req.headers['x-correlation-id']
        });
        next(error);
      }
    }
  ];
}