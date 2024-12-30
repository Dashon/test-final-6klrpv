/**
 * @fileoverview Comprehensive test suite for AI agent management functionality
 * @module professional-service/tests/agent
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing'; // v9.x
import { Repository } from 'typeorm'; // v0.3.x
import { AgentService } from '../src/services/agent.service';
import { IAgent, AgentStatus, LanguageProficiency, AgentAnalytics } from '../src/interfaces/agent.interface';
import { MLService } from '../src/services/ml.service';
import { AnalyticsService } from '../src/services/analytics.service';
import { AgentValidationError } from '../src/errors/agent-validation.error';
import { ErrorCode } from '@app/common';

// Constants for testing
const MOCK_PROFESSIONAL_ID = 'test-professional-id';
const MOCK_AGENT_ID = 'test-agent-id';
const MAX_AGENTS_PER_PROFESSIONAL = 5;
const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'zh'];

/**
 * Generates a mock agent for testing purposes
 */
const generateMockAgent = (overrides: Partial<IAgent> = {}): IAgent => ({
  id: MOCK_AGENT_ID,
  professionalId: MOCK_PROFESSIONAL_ID,
  name: 'Test Agent',
  description: 'A test AI agent',
  status: AgentStatus.DRAFT,
  version: '1.0.0',
  createdAt: new Date(),
  updatedAt: new Date(),
  capabilities: {
    languages: [
      { code: 'en', proficiency: LanguageProficiency.NATIVE },
      { code: 'es', proficiency: LanguageProficiency.ADVANCED }
    ],
    specialties: [
      { category: 'Travel', subcategories: ['Adventure', 'Luxury'] }
    ],
    availableHours: {
      timezone: 'UTC',
      schedule: {
        monday: [{ start: '09:00', end: '17:00' }],
        tuesday: [{ start: '09:00', end: '17:00' }],
        wednesday: [{ start: '09:00', end: '17:00' }],
        thursday: [{ start: '09:00', end: '17:00' }],
        friday: [{ start: '09:00', end: '17:00' }],
        saturday: [],
        sunday: []
      }
    },
    maxConcurrentChats: 5,
    responseTime: {
      min: 30,
      max: 120,
      unit: 'SECONDS'
    }
  },
  pricing: {
    basePrice: 10,
    currency: 'USD',
    subscriptionEnabled: true,
    subscriptionPrice: 50,
    subscriptionInterval: 'MONTHLY',
    trialPeriodDays: 7
  },
  analytics: {
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
  },
  lastTrainingDate: new Date(),
  ...overrides
});

describe('AgentService', () => {
  let module: TestingModule;
  let agentService: AgentService;
  let agentRepository: Repository<IAgent>;
  let mlService: MLService;
  let analyticsService: AnalyticsService;

  beforeEach(async () => {
    // Create mock repository
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      update: jest.fn()
    };

    // Create mock ML service
    const mockMLService = {
      initializeAgentModel: jest.fn(),
      validateModel: jest.fn()
    };

    // Create mock analytics service
    const mockAnalyticsService = {
      initializeAgentAnalytics: jest.fn(),
      calculatePerformanceMetrics: jest.fn(),
      broadcastAnalyticsUpdate: jest.fn()
    };

    module = await Test.createTestingModule({
      providers: [
        AgentService,
        {
          provide: 'AgentRepository',
          useValue: mockRepository
        },
        {
          provide: MLService,
          useValue: mockMLService
        },
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService
        }
      ]
    }).compile();

    agentService = module.get<AgentService>(AgentService);
    agentRepository = module.get<Repository<IAgent>>('AgentRepository');
    mlService = module.get<MLService>(MLService);
    analyticsService = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  describe('createAgent', () => {
    it('should successfully create an agent with valid data', async () => {
      const mockAgent = generateMockAgent();
      jest.spyOn(agentRepository, 'count').mockResolvedValue(0);
      jest.spyOn(agentRepository, 'create').mockReturnValue(mockAgent);
      jest.spyOn(agentRepository, 'save').mockResolvedValue(mockAgent);
      jest.spyOn(mlService, 'initializeAgentModel').mockResolvedValue({});
      jest.spyOn(analyticsService, 'initializeAgentAnalytics').mockResolvedValue(undefined);

      const result = await agentService.createAgent(mockAgent);

      expect(result).toEqual(mockAgent);
      expect(agentRepository.count).toHaveBeenCalled();
      expect(mlService.initializeAgentModel).toHaveBeenCalled();
      expect(analyticsService.initializeAgentAnalytics).toHaveBeenCalled();
    });

    it('should throw error when professional exceeds agent limit', async () => {
      jest.spyOn(agentRepository, 'count').mockResolvedValue(MAX_AGENTS_PER_PROFESSIONAL);

      await expect(agentService.createAgent(generateMockAgent()))
        .rejects
        .toThrow(AgentValidationError);
    });

    it('should validate language capabilities', async () => {
      const invalidAgent = generateMockAgent({
        capabilities: {
          ...generateMockAgent().capabilities,
          languages: []
        }
      });

      await expect(agentService.createAgent(invalidAgent))
        .rejects
        .toThrow(AgentValidationError);
    });
  });

  describe('updateAgentAnalytics', () => {
    it('should successfully update agent analytics', async () => {
      const mockAgent = generateMockAgent();
      const mockAnalytics: AgentAnalytics = {
        totalSessions: 100,
        averageRating: 4.5,
        totalRevenue: 1000,
        activeSubscribers: 50,
        metrics: {
          daily: { sessions: 10, revenue: 100, ratings: [4, 5], responseTime: 45, resolutionRate: 0.95 },
          weekly: { sessions: 50, revenue: 500, ratings: [4, 4, 5], responseTime: 50, resolutionRate: 0.92 },
          monthly: { sessions: 100, revenue: 1000, ratings: [4, 4, 5, 5], responseTime: 48, resolutionRate: 0.93 }
        },
        performance: {
          responseTime: 48,
          resolutionRate: 0.93,
          satisfactionScore: 0.9
        }
      };

      jest.spyOn(agentRepository, 'findOne').mockResolvedValue(mockAgent);
      jest.spyOn(agentRepository, 'save').mockResolvedValue({ ...mockAgent, analytics: mockAnalytics });
      jest.spyOn(analyticsService, 'calculatePerformanceMetrics').mockResolvedValue(mockAnalytics.performance);

      const result = await agentService.updateAgentAnalytics(MOCK_AGENT_ID, mockAnalytics);

      expect(result.analytics).toEqual(mockAnalytics);
      expect(analyticsService.calculatePerformanceMetrics).toHaveBeenCalled();
      expect(analyticsService.broadcastAnalyticsUpdate).toHaveBeenCalled();
    });

    it('should validate analytics data', async () => {
      const invalidAnalytics: AgentAnalytics = {
        ...generateMockAgent().analytics,
        averageRating: 6 // Invalid rating > 5
      };

      await expect(agentService.updateAgentAnalytics(MOCK_AGENT_ID, invalidAnalytics))
        .rejects
        .toThrow(AgentValidationError);
    });

    it('should handle non-existent agent', async () => {
      jest.spyOn(agentRepository, 'findOne').mockResolvedValue(null);

      await expect(agentService.updateAgentAnalytics(MOCK_AGENT_ID, generateMockAgent().analytics))
        .rejects
        .toThrow(new AgentValidationError(ErrorCode.RESOURCE_NOT_FOUND, 'Agent not found'));
    });
  });
});