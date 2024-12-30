/**
 * @fileoverview Controller handling HTTP requests for AI agent management in the professional service
 * @module professional-service/controllers/agent
 * @version 1.0.0
 */

import { 
    Controller, 
    Post, 
    Get, 
    Put, 
    Delete, 
    Body, 
    Param, 
    Query, 
    UseGuards,
    UseInterceptors
} from '@nestjs/common'; // v9.x
import { RateLimit } from '@nestjs/throttler'; // v4.x
import { AgentService } from '../services/agent.service';
import { IAgent } from '../interfaces/agent.interface';
import { roleGuard } from '../../../shared/middleware/auth.middleware';
import { logger } from '../../../shared/utils/logger.util';
import { ErrorCode } from '../../../shared/constants/error-codes';

/**
 * Controller for managing AI agents with enhanced analytics and security
 */
@Controller('agents')
@UseGuards(roleGuard(['professional']))
@UseInterceptors(LoggingInterceptor)
@RateLimit({ ttl: 60, limit: 100 })
export class AgentController {
    constructor(private readonly agentService: AgentService) {
        logger.info('AgentController initialized');
    }

    /**
     * Creates a new AI agent with enhanced validation and analytics initialization
     */
    @Post()
    @RateLimit({ ttl: 60, limit: 10 })
    async createAgent(@Body() agentData: IAgent): Promise<IAgent> {
        logger.debug('Creating new agent', { agentData });

        try {
            const createdAgent = await this.agentService.createAgent(agentData);
            
            logger.info('Agent created successfully', {
                agentId: createdAgent.id,
                professionalId: createdAgent.professionalId
            });

            return createdAgent;
        } catch (error) {
            logger.error('Failed to create agent', error as Error, {
                errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
                professionalId: agentData.professionalId
            });
            throw error;
        }
    }

    /**
     * Updates an existing AI agent with validation and analytics refresh
     */
    @Put(':agentId')
    async updateAgent(
        @Param('agentId') agentId: string,
        @Body() updateData: Partial<IAgent>
    ): Promise<IAgent> {
        logger.debug('Updating agent', { agentId, updateData });

        try {
            const updatedAgent = await this.agentService.updateAgent(agentId, updateData);
            
            logger.info('Agent updated successfully', {
                agentId,
                professionalId: updatedAgent.professionalId
            });

            return updatedAgent;
        } catch (error) {
            logger.error('Failed to update agent', error as Error, {
                errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
                agentId
            });
            throw error;
        }
    }

    /**
     * Retrieves agent details with performance metrics
     */
    @Get(':agentId')
    async getAgent(@Param('agentId') agentId: string): Promise<IAgent> {
        logger.debug('Retrieving agent', { agentId });

        try {
            const agent = await this.agentService.getAgentById(agentId);
            
            logger.info('Agent retrieved successfully', {
                agentId,
                professionalId: agent.professionalId
            });

            return agent;
        } catch (error) {
            logger.error('Failed to retrieve agent', error as Error, {
                errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
                agentId
            });
            throw error;
        }
    }

    /**
     * Lists all agents for a professional with filtering and pagination
     */
    @Get()
    async listAgents(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('status') status?: string,
        @Query('sortBy') sortBy: string = 'createdAt'
    ): Promise<IAgent[]> {
        logger.debug('Listing agents', { page, limit, status, sortBy });

        try {
            const agents = await this.agentService.getProfessionalAgents({
                page,
                limit,
                status,
                sortBy
            });
            
            logger.info('Agents listed successfully', {
                count: agents.length,
                page,
                limit
            });

            return agents;
        } catch (error) {
            logger.error('Failed to list agents', error as Error, {
                errorCode: ErrorCode.INTERNAL_SERVER_ERROR
            });
            throw error;
        }
    }

    /**
     * Updates agent analytics with comprehensive performance metrics
     */
    @Put(':agentId/analytics')
    async updateAnalytics(
        @Param('agentId') agentId: string,
        @Body() analyticsData: IAgent['analytics']
    ): Promise<IAgent> {
        logger.debug('Updating agent analytics', { agentId, analyticsData });

        try {
            const updatedAgent = await this.agentService.updateAgentAnalytics(
                agentId,
                analyticsData
            );
            
            logger.info('Agent analytics updated successfully', {
                agentId,
                professionalId: updatedAgent.professionalId
            });

            return updatedAgent;
        } catch (error) {
            logger.error('Failed to update agent analytics', error as Error, {
                errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
                agentId
            });
            throw error;
        }
    }

    /**
     * Archives an AI agent with cleanup and analytics snapshot
     */
    @Delete(':agentId')
    async archiveAgent(@Param('agentId') agentId: string): Promise<void> {
        logger.debug('Archiving agent', { agentId });

        try {
            await this.agentService.archiveAgent(agentId);
            
            logger.info('Agent archived successfully', { agentId });
        } catch (error) {
            logger.error('Failed to archive agent', error as Error, {
                errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
                agentId
            });
            throw error;
        }
    }

    /**
     * Performs bulk updates on multiple agents
     */
    @Put('bulk')
    @RateLimit({ ttl: 60, limit: 5 })
    async bulkUpdateAgents(@Body() updateData: {
        agentIds: string[],
        updates: Partial<IAgent>
    }): Promise<{ 
        success: string[],
        failed: { id: string, error: string }[]
    }> {
        logger.debug('Performing bulk agent update', { 
            agentCount: updateData.agentIds.length 
        });

        try {
            const result = await this.agentService.bulkUpdateAgents(
                updateData.agentIds,
                updateData.updates
            );
            
            logger.info('Bulk agent update completed', {
                successCount: result.success.length,
                failedCount: result.failed.length
            });

            return result;
        } catch (error) {
            logger.error('Failed to perform bulk agent update', error as Error, {
                errorCode: ErrorCode.INTERNAL_SERVER_ERROR
            });
            throw error;
        }
    }
}