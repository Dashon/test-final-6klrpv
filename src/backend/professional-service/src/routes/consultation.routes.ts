/**
 * @fileoverview Professional consultation routes with enhanced security and video support
 * @module professional-service/routes/consultation
 * @version 1.0.0
 */

import { Router } from 'express'; // v4.18.x
import rateLimit from 'express-rate-limit'; // v6.7.x
import { ConsultationController } from '../controllers/consultation.controller';
import { authMiddleware, roleGuard } from '../../../shared/middleware/auth.middleware';
import validationMiddleware from '../../../shared/middleware/validation.middleware';
import { logger } from '../../../shared/utils/logger.util';

// Constants for rate limiting and security
const PROFESSIONAL_ROLES = ['professional', 'admin'];
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100;

/**
 * Configure rate limiting for consultation endpoints
 */
const consultationRateLimit = rateLimit({
    windowMs: RATE_LIMIT_WINDOW,
    max: RATE_LIMIT_MAX,
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Initialize consultation router with enhanced security
 */
const consultationRouter = Router();
const controller = new ConsultationController();

// Apply rate limiting to all consultation routes
consultationRouter.use(consultationRateLimit);

// List consultations with filtering
consultationRouter.get(
    '/',
    authMiddleware,
    roleGuard(PROFESSIONAL_ROLES),
    validationMiddleware(Object),
    async (req, res, next) => {
        try {
            logger.info('Listing consultations', { filters: req.query });
            const consultations = await controller.listConsultations(req.query);
            res.json(consultations);
        } catch (error) {
            next(error);
        }
    }
);

// Get consultation details
consultationRouter.get(
    '/:id',
    authMiddleware,
    roleGuard(PROFESSIONAL_ROLES),
    async (req, res, next) => {
        try {
            logger.info('Retrieving consultation', { id: req.params.id });
            const consultation = await controller.getConsultation(req.params.id);
            res.json(consultation);
        } catch (error) {
            next(error);
        }
    }
);

// Create new consultation
consultationRouter.post(
    '/',
    authMiddleware,
    roleGuard(PROFESSIONAL_ROLES),
    validationMiddleware(Object),
    async (req, res, next) => {
        try {
            logger.info('Creating consultation', { data: req.body });
            const consultation = await controller.createConsultation(req.body);
            res.status(201).json(consultation);
        } catch (error) {
            next(error);
        }
    }
);

// Update consultation
consultationRouter.put(
    '/:id',
    authMiddleware,
    roleGuard(PROFESSIONAL_ROLES),
    validationMiddleware(Object),
    async (req, res, next) => {
        try {
            logger.info('Updating consultation', { 
                id: req.params.id, 
                updates: req.body 
            });
            const consultation = await controller.updateConsultation(
                req.params.id,
                req.body
            );
            res.json(consultation);
        } catch (error) {
            next(error);
        }
    }
);

// Initiate video consultation session
consultationRouter.post(
    '/:id/video',
    authMiddleware,
    roleGuard(PROFESSIONAL_ROLES),
    async (req, res, next) => {
        try {
            logger.info('Initiating video session', { id: req.params.id });
            const videoSession = await controller.initiateVideoSession(req.params.id);
            res.json(videoSession);
        } catch (error) {
            next(error);
        }
    }
);

// End video consultation session
consultationRouter.delete(
    '/:id/video',
    authMiddleware,
    roleGuard(PROFESSIONAL_ROLES),
    async (req, res, next) => {
        try {
            logger.info('Ending video session', { id: req.params.id });
            await controller.endVideoSession(req.params.id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
);

// Error handling middleware
consultationRouter.use((error: Error, req: any, res: any, next: any) => {
    logger.error('Consultation route error', error, {
        path: req.path,
        method: req.method,
        correlationId: req.headers['x-correlation-id']
    });
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

export default consultationRouter;