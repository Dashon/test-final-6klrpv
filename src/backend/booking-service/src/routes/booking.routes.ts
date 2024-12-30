/**
 * @fileoverview Booking service routes with comprehensive security and validation
 * @module booking-service/routes/booking
 * @version 1.0.0
 */

import { Router } from 'express'; // v4.18.x
import rateLimit from 'express-rate-limit'; // v6.7.x
import helmet from 'helmet'; // v7.0.x
import { BookingController } from '../controllers/booking.controller';
import { authMiddleware, roleGuard } from '../../../shared/middleware/auth.middleware';
import validationMiddleware from '../../../shared/middleware/validation.middleware';
import { logger } from '../../../shared/utils/logger.util';
import { ErrorCode } from '../../../shared/constants/error-codes';
import { HttpStatus } from '../../../shared/constants/status-codes';

// Constants for rate limiting and caching
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_REQUESTS = 1000;
const GROUP_BOOKING_LIMIT = 50;
const INVENTORY_CACHE_TTL = 300000; // 5 minutes

// Create booking router instance
const bookingRouter = Router();

// Apply security middleware
bookingRouter.use(helmet());

// Configure rate limiters
const standardRateLimit = rateLimit({
    windowMs: RATE_LIMIT_WINDOW,
    max: RATE_LIMIT_MAX_REQUESTS,
    message: {
        error: ErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Too many requests, please try again later'
    }
});

const inventoryRateLimit = rateLimit({
    windowMs: RATE_LIMIT_WINDOW,
    max: RATE_LIMIT_MAX_REQUESTS * 2, // Higher limit for inventory checks
    message: {
        error: ErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Too many inventory requests'
    }
});

// Initialize routes with controller
const initializeBookingRoutes = (bookingController: BookingController): Router => {
    try {
        // Middleware for all booking routes
        bookingRouter.use(authMiddleware);
        bookingRouter.use(standardRateLimit);

        // Create new booking
        bookingRouter.post('/',
            roleGuard(['user', 'admin']),
            validationMiddleware(BookingController.CreateBookingDTO),
            async (req, res) => {
                try {
                    const booking = await bookingController.createBooking(
                        req.body,
                        req.headers['x-correlation-id'] as string
                    );
                    res.status(HttpStatus.CREATED).json(booking);
                } catch (error) {
                    logger.error('Failed to create booking', error as Error, {
                        correlationId: req.headers['x-correlation-id'],
                        userId: req.user?.userId
                    });
                    res.status(HttpStatus.BAD_REQUEST).json({
                        error: ErrorCode.GDS_ERROR,
                        message: 'Failed to create booking'
                    });
                }
            }
        );

        // Get booking details
        bookingRouter.get('/:id',
            roleGuard(['user', 'admin']),
            async (req, res) => {
                try {
                    const booking = await bookingController.getBooking(
                        req.params.id,
                        req.headers['x-correlation-id'] as string
                    );
                    res.status(HttpStatus.OK).json(booking);
                } catch (error) {
                    logger.error('Failed to retrieve booking', error as Error, {
                        correlationId: req.headers['x-correlation-id'],
                        bookingId: req.params.id
                    });
                    res.status(HttpStatus.NOT_FOUND).json({
                        error: ErrorCode.RESOURCE_NOT_FOUND,
                        message: 'Booking not found'
                    });
                }
            }
        );

        // Update booking status
        bookingRouter.put('/:id/status',
            roleGuard(['user', 'admin']),
            validationMiddleware(BookingController.UpdateStatusDTO),
            async (req, res) => {
                try {
                    const booking = await bookingController.updateBookingStatus(
                        req.params.id,
                        req.body.status,
                        req.headers['x-correlation-id'] as string
                    );
                    res.status(HttpStatus.OK).json(booking);
                } catch (error) {
                    logger.error('Failed to update booking status', error as Error, {
                        correlationId: req.headers['x-correlation-id'],
                        bookingId: req.params.id
                    });
                    res.status(HttpStatus.BAD_REQUEST).json({
                        error: ErrorCode.VALIDATION_ERROR,
                        message: 'Invalid status update'
                    });
                }
            }
        );

        // Cancel booking
        bookingRouter.delete('/:id',
            roleGuard(['user', 'admin']),
            async (req, res) => {
                try {
                    const booking = await bookingController.cancelBooking(
                        req.params.id,
                        req.headers['x-correlation-id'] as string
                    );
                    res.status(HttpStatus.OK).json(booking);
                } catch (error) {
                    logger.error('Failed to cancel booking', error as Error, {
                        correlationId: req.headers['x-correlation-id'],
                        bookingId: req.params.id
                    });
                    res.status(HttpStatus.BAD_REQUEST).json({
                        error: ErrorCode.GDS_ERROR,
                        message: 'Failed to cancel booking'
                    });
                }
            }
        );

        // Check inventory availability
        bookingRouter.get('/inventory/:criteria',
            inventoryRateLimit,
            roleGuard(['user', 'admin']),
            async (req, res) => {
                try {
                    const inventory = await bookingController.checkInventory(
                        req.params.criteria,
                        req.headers['x-correlation-id'] as string
                    );
                    res.status(HttpStatus.OK).json(inventory);
                } catch (error) {
                    logger.error('Failed to check inventory', error as Error, {
                        correlationId: req.headers['x-correlation-id'],
                        criteria: req.params.criteria
                    });
                    res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
                        error: ErrorCode.GDS_ERROR,
                        message: 'Inventory check failed'
                    });
                }
            }
        );

        // Create group booking
        bookingRouter.post('/group',
            roleGuard(['user', 'admin']),
            validationMiddleware(BookingController.CreateGroupBookingDTO),
            async (req, res) => {
                try {
                    if (req.body.participants?.length > GROUP_BOOKING_LIMIT) {
                        return res.status(HttpStatus.BAD_REQUEST).json({
                            error: ErrorCode.VALIDATION_ERROR,
                            message: `Group size cannot exceed ${GROUP_BOOKING_LIMIT}`
                        });
                    }

                    const booking = await bookingController.createGroupBooking(
                        req.body,
                        req.headers['x-correlation-id'] as string
                    );
                    res.status(HttpStatus.CREATED).json(booking);
                } catch (error) {
                    logger.error('Failed to create group booking', error as Error, {
                        correlationId: req.headers['x-correlation-id'],
                        userId: req.user?.userId
                    });
                    res.status(HttpStatus.BAD_REQUEST).json({
                        error: ErrorCode.GDS_ERROR,
                        message: 'Failed to create group booking'
                    });
                }
            }
        );

        // Update split payment
        bookingRouter.put('/:id/split-payment',
            roleGuard(['user', 'admin']),
            validationMiddleware(BookingController.UpdateSplitPaymentDTO),
            async (req, res) => {
                try {
                    const booking = await bookingController.updateSplitPayment(
                        req.params.id,
                        req.body,
                        req.headers['x-correlation-id'] as string
                    );
                    res.status(HttpStatus.OK).json(booking);
                } catch (error) {
                    logger.error('Failed to update split payment', error as Error, {
                        correlationId: req.headers['x-correlation-id'],
                        bookingId: req.params.id
                    });
                    res.status(HttpStatus.BAD_REQUEST).json({
                        error: ErrorCode.PAYMENT_ERROR,
                        message: 'Failed to update split payment'
                    });
                }
            }
        );

        logger.info('Booking routes initialized successfully');
        return bookingRouter;
    } catch (error) {
        logger.error('Failed to initialize booking routes', error as Error);
        throw error;
    }
};

export { bookingRouter, initializeBookingRoutes };