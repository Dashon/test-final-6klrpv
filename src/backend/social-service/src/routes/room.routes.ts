/**
 * @fileoverview Express router configuration for chat room endpoints
 * @module social-service/routes/room
 * @version 1.0.0
 */

import { Router } from 'express'; // v4.18.x
import { injectable } from 'inversify'; // v6.0.x
import rateLimit from 'express-rate-limit'; // v6.7.x
import { RoomController } from '../controllers/room.controller';
import authMiddleware from '../../../shared/middleware/auth.middleware';
import validationMiddleware from '../../../shared/middleware/validation.middleware';
import { logger } from '../../../shared/utils/logger.util';
import { RoomType, ParticipantRole } from '../interfaces/room.interface';

// Base path for room routes
const BASE_PATH = '/api/v1/rooms';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100; // requests per window

@injectable()
export class RoomRoutes {
    private readonly router: Router;
    private readonly rateLimiter: any;

    constructor(private readonly roomController: RoomController) {
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
            message: { error: 'Too many requests, please try again later.' },
            standardHeaders: true,
            legacyHeaders: false
        });
    }

    /**
     * Initialize all room-related routes with middleware chains
     */
    private initializeRoutes(): void {
        // Apply global middleware
        this.router.use(authMiddleware);
        this.router.use(this.rateLimiter);

        // Room management routes
        this.router.post(
            '/',
            validationMiddleware(CreateRoomDTO),
            this.roomController.createRoom.bind(this.roomController)
        );

        this.router.get(
            '/:roomId',
            this.validateRoomAccess.bind(this),
            this.roomController.getRoom.bind(this.roomController)
        );

        this.router.put(
            '/:roomId',
            this.validateRoomAccess.bind(this),
            validationMiddleware(UpdateRoomDTO),
            this.roomController.updateRoom.bind(this.roomController)
        );

        this.router.delete(
            '/:roomId',
            this.validateRoomAccess.bind(this),
            this.roomController.deleteRoom.bind(this.roomController)
        );

        // Participant management routes
        this.router.post(
            '/:roomId/participants',
            this.validateRoomAccess.bind(this),
            validationMiddleware(AddParticipantDTO),
            this.roomController.addParticipant.bind(this.roomController)
        );

        this.router.delete(
            '/:roomId/participants/:userId',
            this.validateRoomAccess.bind(this),
            this.roomController.removeParticipant.bind(this.roomController)
        );

        // AI persona integration routes
        this.router.post(
            '/:roomId/ai-personas',
            this.validateRoomAccess.bind(this),
            validationMiddleware(AddAIPersonaDTO),
            this.roomController.addAIPersona.bind(this.roomController)
        );

        // Error handling middleware
        this.router.use(this.errorHandler.bind(this));
    }

    /**
     * Middleware to validate room access permissions
     */
    private async validateRoomAccess(req: any, res: any, next: any): Promise<void> {
        try {
            const { roomId } = req.params;
            const userId = req.user.id;

            const hasAccess = await this.roomController.validateRoomAccess(roomId, userId);
            if (!hasAccess) {
                logger.warn('Room access denied', {
                    userId,
                    roomId,
                    action: req.method
                });
                return res.status(403).json({
                    error: 'Access denied',
                    message: 'You do not have permission to access this room'
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    }

    /**
     * Global error handler for room routes
     */
    private errorHandler(error: any, req: any, res: any, next: any): void {
        logger.error('Room route error', error, {
            path: req.path,
            method: req.method,
            userId: req.user?.id
        });

        res.status(error.status || 500).json({
            error: error.code || 'INTERNAL_ERROR',
            message: error.message || 'An unexpected error occurred'
        });
    }

    /**
     * Get configured router instance
     */
    public getRouter(): Router {
        return this.router;
    }
}

// DTO interfaces for request validation
interface CreateRoomDTO {
    name: string;
    type: RoomType;
    participants: Array<{
        userId: string;
        role: ParticipantRole;
    }>;
    settings?: {
        isPrivate: boolean;
        allowAIPersonas: boolean;
        maxParticipants?: number;
    };
}

interface UpdateRoomDTO {
    name?: string;
    settings?: {
        isPrivate?: boolean;
        allowAIPersonas?: boolean;
        maxParticipants?: number;
    };
}

interface AddParticipantDTO {
    userId: string;
    role: ParticipantRole;
}

interface AddAIPersonaDTO {
    personaId: string;
    settings?: {
        learningEnabled: boolean;
        contextRetention: number;
    };
}

// Export configured router
export const roomRouter = new RoomRoutes(new RoomController()).getRouter();