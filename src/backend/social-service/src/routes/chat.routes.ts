/**
 * @fileoverview Express router configuration for chat endpoints in the social service
 * @module social-service/routes/chat
 * @version 1.0.0
 */

import { Router } from 'express'; // v4.18.x
import rateLimit from 'express-rate-limit'; // v6.7.x
import { ChatController } from '../controllers/chat.controller';
import authMiddleware, { roleGuard } from '../../../shared/middleware/auth.middleware';
import validationMiddleware from '../../../shared/middleware/validation.middleware';
import { ErrorCode } from '../../../shared/constants/error-codes';
import { HttpStatus } from '../../../shared/constants/status-codes';
import { logger } from '../../../shared/utils/logger.util';

// Constants for rate limiting and caching
const MESSAGE_RATE_LIMIT = 100; // messages per minute
const CACHE_DURATION = 300; // 5 minutes in seconds

/**
 * Configures and returns the chat router with all endpoints
 * @param chatController Instance of ChatController for handling chat operations
 * @returns Configured Express router
 */
const initializeChatRoutes = (chatController: ChatController): Router => {
    const router = Router({ strict: true, caseSensitive: true });

    // Apply global middleware
    router.use(authMiddleware);

    // Configure security headers
    router.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        next();
    });

    // Rate limiter for chat endpoints
    const chatRateLimiter = rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: MESSAGE_RATE_LIMIT,
        message: {
            error: ErrorCode.RATE_LIMIT_EXCEEDED,
            message: 'Too many messages. Please try again later.',
            status: HttpStatus.TOO_MANY_REQUESTS
        },
        standardHeaders: true,
        legacyHeaders: false
    });

    // Send message endpoint
    router.post(
        '/messages',
        chatRateLimiter,
        roleGuard(['user', 'professional']),
        chatController.sendMessage
    );

    // Get messages for a room with pagination
    router.get(
        '/rooms/:roomId/messages',
        rateLimit({
            windowMs: 60 * 1000,
            max: 120,
            message: {
                error: ErrorCode.RATE_LIMIT_EXCEEDED,
                message: 'Too many requests. Please try again later.'
            }
        }),
        roleGuard(['user', 'professional']),
        (req, res, next) => {
            // Set cache headers for GET requests
            res.setHeader('Cache-Control', `private, max-age=${CACHE_DURATION}`);
            next();
        },
        chatController.getMessages
    );

    // Mark message as read
    router.patch(
        '/messages/:messageId/read',
        rateLimit({
            windowMs: 60 * 1000,
            max: 180
        }),
        roleGuard(['user', 'professional']),
        chatController.markAsRead
    );

    // Get room participants
    router.get(
        '/rooms/:roomId/participants',
        rateLimit({
            windowMs: 60 * 1000,
            max: 150
        }),
        roleGuard(['user', 'professional']),
        chatController.getRoomParticipants
    );

    // Handle typing status updates via WebSocket
    router.post(
        '/rooms/:roomId/typing',
        rateLimit({
            windowMs: 60 * 1000,
            max: 200
        }),
        roleGuard(['user', 'professional']),
        chatController.handleTypingStatus
    );

    // Error handling middleware
    router.use((err: Error, req: any, res: any, next: any) => {
        logger.error('Chat route error', err, {
            path: req.path,
            method: req.method,
            correlationId: req.headers['x-correlation-id']
        });

        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: ErrorCode.INTERNAL_SERVER_ERROR,
            message: 'An unexpected error occurred',
            referenceId: req.headers['x-request-id']
        });
    });

    return router;
};

// Export configured router
export const chatRouter = initializeChatRoutes(new ChatController());

// Export initialization function for testing and dependency injection
export default initializeChatRoutes;