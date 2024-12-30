/**
 * @fileoverview Express router configuration for AI persona management endpoints
 * @module persona-service/routes/persona
 * @version 1.0.0
 */

import { Router } from 'express'; // v4.18.x
import { ValidationPipe } from '@nestjs/common'; // v9.0.x
import rateLimit from 'express-rate-limit'; // v6.7.x
import cache from 'express-cache-controller'; // v1.1.x
import { PersonaController } from '../controllers/persona.controller';
import { authMiddleware, roleGuard } from '../../../shared/middleware/auth.middleware';
import { Logger } from '../../../shared/utils/logger.util';
import { ErrorCode } from '../../../shared/constants/error-codes';
import { HttpStatus } from '../../../shared/constants/status-codes';

// Initialize router and logger
const router = Router();
const logger = Logger.getInstance();

// Rate limiting configuration
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: ErrorCode.RATE_LIMIT_EXCEEDED,
    message: 'Too many requests, please try again later.'
  }
};

// Cache configuration for different endpoints
const cacheConfig = {
  getPersona: { maxAge: 300, private: true }, // 5 minutes for single persona
  listPersonas: { maxAge: 60, private: true }, // 1 minute for persona list
  noCache: { noCache: true } // No cache for mutations
};

/**
 * Initialize persona routes with comprehensive security and monitoring
 * @param controller PersonaController instance
 */
export function initializePersonaRoutes(controller: PersonaController): Router {
  try {
    // Apply base middleware
    router.use(authMiddleware);
    router.use(rateLimit(rateLimitConfig));

    // POST /personas - Create new persona
    router.post('/',
      cache(cacheConfig.noCache),
      roleGuard(['user']),
      async (req, res) => {
        try {
          const persona = await controller.createPersona(req, req.body);
          logger.info('Persona created successfully', {
            userId: req.user!.userId,
            personaId: persona.id
          });
          res.status(HttpStatus.CREATED).json(persona);
        } catch (error) {
          logger.error('Failed to create persona', error as Error, {
            userId: req.user!.userId,
            errorCode: ErrorCode.VALIDATION_ERROR
          });
          res.status(HttpStatus.BAD_REQUEST).json({
            error: ErrorCode.VALIDATION_ERROR,
            message: (error as Error).message
          });
        }
      }
    );

    // GET /personas - List user's personas
    router.get('/',
      cache(cacheConfig.listPersonas),
      roleGuard(['user']),
      async (req, res) => {
        try {
          const { page, limit } = req.query;
          const personas = await controller.getUserPersonas(req, {
            page: Number(page) || 1,
            limit: Number(limit) || 10
          });
          res.json(personas);
        } catch (error) {
          logger.error('Failed to retrieve personas', error as Error, {
            userId: req.user!.userId
          });
          res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            error: ErrorCode.INTERNAL_SERVER_ERROR,
            message: 'Failed to retrieve personas'
          });
        }
      }
    );

    // GET /personas/:personaId - Get specific persona
    router.get('/:personaId',
      cache(cacheConfig.getPersona),
      roleGuard(['user']),
      async (req, res) => {
        try {
          const persona = await controller.getPersonaById(req.params.personaId, req);
          if (!persona) {
            return res.status(HttpStatus.NOT_FOUND).json({
              error: ErrorCode.RESOURCE_NOT_FOUND,
              message: 'Persona not found'
            });
          }
          res.json(persona);
        } catch (error) {
          logger.error('Failed to retrieve persona', error as Error, {
            personaId: req.params.personaId,
            userId: req.user!.userId
          });
          res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            error: ErrorCode.INTERNAL_SERVER_ERROR,
            message: 'Failed to retrieve persona'
          });
        }
      }
    );

    // PUT /personas/:personaId - Update persona
    router.put('/:personaId',
      cache(cacheConfig.noCache),
      roleGuard(['user']),
      async (req, res) => {
        try {
          const persona = await controller.updatePersona(
            req.params.personaId,
            req.body,
            req
          );
          res.json(persona);
        } catch (error) {
          logger.error('Failed to update persona', error as Error, {
            personaId: req.params.personaId,
            userId: req.user!.userId
          });
          res.status(HttpStatus.BAD_REQUEST).json({
            error: ErrorCode.VALIDATION_ERROR,
            message: (error as Error).message
          });
        }
      }
    );

    // DELETE /personas/:personaId - Delete persona
    router.delete('/:personaId',
      cache(cacheConfig.noCache),
      roleGuard(['user']),
      async (req, res) => {
        try {
          await controller.deletePersona(req.params.personaId, req);
          res.status(HttpStatus.NO_CONTENT).send();
        } catch (error) {
          logger.error('Failed to delete persona', error as Error, {
            personaId: req.params.personaId,
            userId: req.user!.userId
          });
          res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            error: ErrorCode.INTERNAL_SERVER_ERROR,
            message: 'Failed to delete persona'
          });
        }
      }
    );

    // PATCH /personas/:personaId/activate - Activate specific persona
    router.patch('/:personaId/activate',
      cache(cacheConfig.noCache),
      roleGuard(['user']),
      async (req, res) => {
        try {
          const persona = await controller.activatePersona(req.params.personaId, req);
          res.json(persona);
        } catch (error) {
          logger.error('Failed to activate persona', error as Error, {
            personaId: req.params.personaId,
            userId: req.user!.userId
          });
          res.status(HttpStatus.BAD_REQUEST).json({
            error: ErrorCode.VALIDATION_ERROR,
            message: (error as Error).message
          });
        }
      }
    );

    logger.info('Persona routes initialized successfully');
    return router;
  } catch (error) {
    logger.error('Failed to initialize persona routes', error as Error);
    throw error;
  }
}

export default router;