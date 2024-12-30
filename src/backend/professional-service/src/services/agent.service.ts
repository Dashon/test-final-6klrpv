/**
 * @fileoverview Service responsible for managing AI agents in the professional service
 * @module professional-service/services/agent
 * @version 1.0.0
 */

import { Injectable, UseGuards, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, DataSource } from 'typeorm';
import { RateLimiterGuard } from '@app/security'; // v1.0.x
import { ErrorCode } from '@app/common'; // v1.0.x
import { IAgent, AgentStatus, AgentAnalytics, LanguageProficiency } from '../interfaces/agent.interface';
import { Agent } from '../entities/agent.entity';
import { MLService } from '../services/ml.service';
import { AnalyticsService } from '../services/analytics.service';
import { AgentValidationError } from '../errors/agent-validation.error';

// Constants for agent management
const MAX_AGENTS_PER_PROFESSIONAL = 5;
const DEFAULT_ANALYTICS: AgentAnalytics = {
  totalSessions: 0,
  averageRating: 0,
  totalRevenue: 0,
  activeSubscribers: 0,
  metrics: {
    daily: { sessions: 0, revenue: 0, ratings: [], responseTime: 0, resolutionRate: 0 },
    weekly: { sessions: 0, revenue: 0, ratings: [], responseTime: 0, resolutionRate: 0 },
    monthly: { sessions: 0, revenue: 0, ratings: [], responseTime: 0, resolutionRate: 0 }
  },
  performance: {
    responseTime: 0,
    resolutionRate: 0,
    satisfactionScore: 0
  }
};

const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // max requests per windowMs
};

/**
 * Service class for managing AI agents with enhanced capabilities
 */
@Injectable()
@UseGuards(RateLimiterGuard)
export class AgentService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    private readonly logger: Logger,
    private readonly mlService: MLService,
    private readonly analyticsService: AnalyticsService,
    private readonly dataSource: DataSource
  ) {
    this.logger.setContext('AgentService');
  }

  /**
   * Creates a new AI agent with enhanced validation and ML model integration
   * @param agentData Agent creation data
   * @returns Promise<Agent> Created agent entity
   * @throws AgentValidationError if validation fails
   */
  async createAgent(agentData: IAgent): Promise<Agent> {
    this.logger.debug(`Creating new agent for professional: ${agentData.professionalId}`);

    // Check professional's agent limit
    const existingAgentsCount = await this.agentRepository.count({
      where: { professionalId: agentData.professionalId, status: AgentStatus.PUBLISHED }
    });

    if (existingAgentsCount >= MAX_AGENTS_PER_PROFESSIONAL) {
      throw new AgentValidationError(
        ErrorCode.VALIDATION_ERROR,
        `Professional has reached maximum limit of ${MAX_AGENTS_PER_PROFESSIONAL} agents`
      );
    }

    // Validate language capabilities
    if (!this.validateLanguageCapabilities(agentData.capabilities.languages)) {
      throw new AgentValidationError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid language capabilities configuration'
      );
    }

    // Initialize ML model for the agent
    const mlModelConfig = await this.mlService.initializeAgentModel({
      languages: agentData.capabilities.languages,
      specialties: agentData.capabilities.specialties
    });

    // Start database transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create agent with default analytics
      const agent = this.agentRepository.create({
        ...agentData,
        analytics: DEFAULT_ANALYTICS,
        status: AgentStatus.DRAFT,
        version: '1.0.0',
        lastTrainingDate: new Date(),
        mlModelConfig
      });

      // Save agent
      const savedAgent = await queryRunner.manager.save(Agent, agent);

      // Initialize analytics tracking
      await this.analyticsService.initializeAgentAnalytics(savedAgent.id);

      // Commit transaction
      await queryRunner.commitTransaction();

      this.logger.log(`Successfully created agent: ${savedAgent.id}`);
      return savedAgent;

    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create agent: ${error.message}`, error.stack);
      throw error;

    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  /**
   * Updates agent analytics with comprehensive data validation
   * @param agentId Agent identifier
   * @param analyticsData Updated analytics data
   * @returns Promise<Agent> Updated agent entity
   */
  async updateAgentAnalytics(agentId: string, analyticsData: AgentAnalytics): Promise<Agent> {
    this.logger.debug(`Updating analytics for agent: ${agentId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Fetch current agent data
      const agent = await this.agentRepository.findOne({ where: { id: agentId } });
      if (!agent) {
        throw new AgentValidationError(ErrorCode.RESOURCE_NOT_FOUND, 'Agent not found');
      }

      // Validate analytics data
      this.validateAnalyticsData(analyticsData);

      // Calculate performance metrics
      const performanceMetrics = await this.analyticsService.calculatePerformanceMetrics(
        agent.id,
        analyticsData
      );

      // Update analytics with new metrics
      const updatedAnalytics: AgentAnalytics = {
        ...analyticsData,
        performance: performanceMetrics
      };

      // Update agent
      agent.analytics = updatedAnalytics;
      agent.version = this.incrementVersion(agent.version);

      // Save changes
      const updatedAgent = await queryRunner.manager.save(Agent, agent);

      // Trigger real-time analytics update
      await this.analyticsService.broadcastAnalyticsUpdate(agentId, updatedAnalytics);

      // Commit transaction
      await queryRunner.commitTransaction();

      this.logger.log(`Successfully updated analytics for agent: ${agentId}`);
      return updatedAgent;

    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to update agent analytics: ${error.message}`, error.stack);
      throw error;

    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  /**
   * Validates language capabilities configuration
   * @private
   */
  private validateLanguageCapabilities(languages: Array<{ code: string; proficiency: LanguageProficiency }>): boolean {
    if (!languages || languages.length === 0) return false;
    
    return languages.every(lang => 
      lang.code && 
      lang.proficiency && 
      Object.values(LanguageProficiency).includes(lang.proficiency)
    );
  }

  /**
   * Validates analytics data structure and values
   * @private
   */
  private validateAnalyticsData(analytics: AgentAnalytics): void {
    if (analytics.averageRating < 0 || analytics.averageRating > 5) {
      throw new AgentValidationError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid average rating value'
      );
    }

    if (analytics.totalSessions < 0 || analytics.totalRevenue < 0) {
      throw new AgentValidationError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid analytics metrics'
      );
    }
  }

  /**
   * Increments semantic version number
   * @private
   */
  private incrementVersion(currentVersion: string): string {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }
}