/**
 * @fileoverview Express router configuration for AI agent management endpoints
 * @module professional-service/routes/agent
 * @version 1.0.0
 */

import { Router } from 'express'; // v4.18.x
import { body, param, query } from 'express-validator'; // v7.0.x
import correlator from 'express-correlation-id'; // v2.0.x
import rateLimit from 'express-rate-limit'; // v6.x.x
import { AgentController } from '../controllers/agent.controller';
import { IAgent } from '../interfaces/agent.interface';
import { roleGuard } from '../../../shared/middleware/auth.middleware';
import { logger } from '../../../shared/utils/logger.util';
import { ErrorCode } from '../../../shared/constants/error-codes';

// Constants for route configuration
const ROUTE_PREFIX = '/api/v1/professional/agents';
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100;

// Rate limiter configurations
const createAgentLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW,
    max: 10, // Stricter limit for creation
    message: 'Too many agent creation attempts'
});

const standardLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW,
    max: RATE_LIMIT_MAX_REQUESTS,
    message: 'Too many requests'
});

/**
 * Initializes and configures agent management routes
 * @param controller AgentController instance
 * @returns Configured Express router
 */
export function initializeAgentRoutes(controller: AgentController): Router {
    const router = Router();

    // Apply common middleware
    router.use(correlator());
    router.use(roleGuard(['professional']));

    // Create new agent
    router.post('/',
        createAgentLimiter,
        [
            body('name').trim().isLength({ min: 3, max: 100 }).escape(),
            body('description').trim().isLength({ min: 10, max: 1000 }).escape(),
            body('capabilities.languages').isArray().notEmpty(),
            body('capabilities.specialties').isArray().notEmpty(),
            body('pricing.basePrice').isFloat({ min: 0 }),
            body('pricing.currency').isIn(['USD', 'EUR', 'GBP', 'JPY'])
        ],
        async (req, res) => {
            try {
                const agent = await controller.createAgent(req.body);
                logger.info('Agent created successfully', {
                    agentId: agent.id,
                    professionalId: agent.professionalId,
                    correlationId: req.correlationId
                });
                res.status(201).json(agent);
            } catch (error) {
                logger.error('Failed to create agent', error as Error, {
                    correlationId: req.correlationId,
                    errorCode: ErrorCode.INTERNAL_SERVER_ERROR
                });
                res.status(500).json({
                    error: ErrorCode.INTERNAL_SERVER_ERROR,
                    message: 'Failed to create agent'
                });
            }
        }
    );

    // Update existing agent
    router.put('/:agentId',
        standardLimiter,
        [
            param('agentId').isUUID(),
            body('name').optional().trim().isLength({ min: 3, max: 100 }).escape(),
            body('description').optional().trim().isLength({ min: 10, max: 1000 }).escape(),
            body('capabilities').optional().isObject(),
            body('pricing').optional().isObject()
        ],
        async (req, res) => {
            try {
                const agent = await controller.updateAgent(req.params.agentId, req.body);
                logger.info('Agent updated successfully', {
                    agentId: agent.id,
                    correlationId: req.correlationId
                });
                res.json(agent);
            } catch (error) {
                logger.error('Failed to update agent', error as Error, {
                    correlationId: req.correlationId,
                    errorCode: ErrorCode.INTERNAL_SERVER_ERROR
                });
                res.status(500).json({
                    error: ErrorCode.INTERNAL_SERVER_ERROR,
                    message: 'Failed to update agent'
                });
            }
        }
    );

    // Get agent details
    router.get('/:agentId',
        standardLimiter,
        [param('agentId').isUUID()],
        async (req, res) => {
            try {
                const agent = await controller.getAgent(req.params.agentId);
                res.json(agent);
            } catch (error) {
                logger.error('Failed to retrieve agent', error as Error, {
                    correlationId: req.correlationId,
                    errorCode: ErrorCode.INTERNAL_SERVER_ERROR
                });
                res.status(500).json({
                    error: ErrorCode.INTERNAL_SERVER_ERROR,
                    message: 'Failed to retrieve agent'
                });
            }
        }
    );

    // List professional's agents
    router.get('/',
        standardLimiter,
        [
            query('page').optional().isInt({ min: 1 }),
            query('limit').optional().isInt({ min: 1, max: 100 }),
            query('status').optional().isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
        ],
        async (req, res) => {
            try {
                const agents = await controller.listAgents(
                    parseInt(req.query.page as string) || 1,
                    parseInt(req.query.limit as string) || 10,
                    req.query.status as string
                );
                res.json(agents);
            } catch (error) {
                logger.error('Failed to list agents', error as Error, {
                    correlationId: req.correlationId,
                    errorCode: ErrorCode.INTERNAL_SERVER_ERROR
                });
                res.status(500).json({
                    error: ErrorCode.INTERNAL_SERVER_ERROR,
                    message: 'Failed to list agents'
                });
            }
        }
    );

    // Update agent analytics
    router.put('/:agentId/analytics',
        standardLimiter,
        [
            param('agentId').isUUID(),
            body('totalSessions').isInt({ min: 0 }),
            body('averageRating').isFloat({ min: 0, max: 5 }),
            body('totalRevenue').isFloat({ min: 0 })
        ],
        async (req, res) => {
            try {
                const agent = await controller.updateAnalytics(req.params.agentId, req.body);
                res.json(agent);
            } catch (error) {
                logger.error('Failed to update analytics', error as Error, {
                    correlationId: req.correlationId,
                    errorCode: ErrorCode.INTERNAL_SERVER_ERROR
                });
                res.status(500).json({
                    error: ErrorCode.INTERNAL_SERVER_ERROR,
                    message: 'Failed to update analytics'
                });
            }
        }
    );

    // Archive agent
    router.delete('/:agentId',
        standardLimiter,
        [param('agentId').isUUID()],
        async (req, res) => {
            try {
                await controller.archiveAgent(req.params.agentId);
                logger.info('Agent archived successfully', {
                    agentId: req.params.agentId,
                    correlationId: req.correlationId
                });
                res.status(204).send();
            } catch (error) {
                logger.error('Failed to archive agent', error as Error, {
                    correlationId: req.correlationId,
                    errorCode: ErrorCode.INTERNAL_SERVER_ERROR
                });
                res.status(500).json({
                    error: ErrorCode.INTERNAL_SERVER_ERROR,
                    message: 'Failed to archive agent'
                });
            }
        }
    );

    return router;
}

// Export configured router
export const agentRouter = initializeAgentRoutes(new AgentController());