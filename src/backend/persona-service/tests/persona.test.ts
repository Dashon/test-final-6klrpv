/**
 * @fileoverview Comprehensive test suite for PersonaService with ML integration
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing'; // v9.0.x
import { Repository } from 'typeorm'; // v0.3.x
import { PersonaService } from '../src/services/persona.service';
import { MLService } from '../src/services/ml.service';
import { PersonaType, PersonaState, PersonaPreferences } from '../src/interfaces/persona.interface';
import { ErrorCode } from '../../../shared/constants/error-codes';
import { Logger } from '../../../shared/utils/logger.util';

// Test configuration constants
const TEST_TIMEOUT = 10000;
const ML_OPERATION_TIMEOUT = 5000;
const MAX_PERSONAS_PER_USER = 5;
const TEST_USER_ID = 'test-user-123';
const MOCK_PERSONA_ID = 'mock-persona-456';

/**
 * Mock implementation of MLService for testing
 */
class MockMLService {
  private modelState: Map<string, any> = new Map();
  private learningHistory: Array<any> = [];
  private confidenceScores: Map<string, number> = new Map();

  async initializeModel() {
    return Promise.resolve();
  }

  async getRecommendations() {
    return Promise.resolve([
      {
        id: 'rec-1',
        destination: 'Paris',
        confidence: 0.85,
        activities: ['Museums', 'Dining']
      }
    ]);
  }

  async updatePersonaModel(persona: any, interactions: any[]) {
    this.learningHistory.push({ personaId: persona.id, interactions });
    this.confidenceScores.set(persona.id, 0.75);
    return Promise.resolve();
  }

  async calculateConfidence() {
    return Promise.resolve(0.75);
  }

  async updateLearningRate() {
    return Promise.resolve(0.01);
  }

  async deleteModel() {
    return Promise.resolve();
  }
}

/**
 * Mock implementation of Repository for testing
 */
class MockRepository {
  private store: Map<string, any> = new Map();

  async save(entity: any) {
    this.store.set(entity.id || MOCK_PERSONA_ID, entity);
    return { ...entity, id: entity.id || MOCK_PERSONA_ID };
  }

  async findOne(options: any) {
    return this.store.get(options.where.id);
  }

  async find(options: any) {
    return Array.from(this.store.values())
      .filter(entity => entity.userId === options.where.userId);
  }

  async count(options: any) {
    return Array.from(this.store.values())
      .filter(entity => entity.userId === options.where.userId).length;
  }

  async remove(entity: any) {
    this.store.delete(entity.id);
    return entity;
  }
}

describe('PersonaService', () => {
  let module: TestingModule;
  let personaService: PersonaService;
  let mlService: MLService;
  let repository: Repository<any>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        PersonaService,
        {
          provide: MLService,
          useClass: MockMLService
        },
        {
          provide: 'PersonaEntityRepository',
          useClass: MockRepository
        },
        Logger
      ]
    }).compile();

    personaService = module.get<PersonaService>(PersonaService);
    mlService = module.get<MLService>(MLService);
    repository = module.get('PersonaEntityRepository');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Persona Creation', () => {
    it('should create a new persona with initialized ML model', async () => {
      const personaData = {
        name: 'Adventure Seeker',
        type: PersonaType.ADVENTURE,
        preferences: {
          destinations: ['Mountains', 'Forests'],
          activities: ['Hiking', 'Camping'],
          budget: {
            min: 1000,
            max: 5000,
            currency: 'USD',
            flexibility: 0.3
          }
        }
      };

      const result = await personaService.createPersona(TEST_USER_ID, personaData);

      expect(result).toBeDefined();
      expect(result.id).toBe(MOCK_PERSONA_ID);
      expect(result.type).toBe(PersonaType.ADVENTURE);
      expect(result.state.adaptationLevel).toBeDefined();
      expect(result.state.modelConfidence).toBeGreaterThan(0);
    }, TEST_TIMEOUT);

    it('should enforce maximum personas per user limit', async () => {
      // Create max number of personas
      for (let i = 0; i < MAX_PERSONAS_PER_USER; i++) {
        await personaService.createPersona(TEST_USER_ID, {
          name: `Persona ${i}`,
          type: PersonaType.EXPLORER
        });
      }

      await expect(personaService.createPersona(TEST_USER_ID, {
        name: 'Extra Persona',
        type: PersonaType.EXPLORER
      })).rejects.toThrow(`Maximum personas (${MAX_PERSONAS_PER_USER}) reached for user`);
    });
  });

  describe('ML Integration', () => {
    it('should update persona state with learning progress', async () => {
      const interactionData = {
        action: 'select_destination',
        destination: 'Paris',
        timestamp: new Date()
      };

      await personaService.updatePersonaState(MOCK_PERSONA_ID, interactionData);

      const updatedPersona = await personaService.getPersonaById(MOCK_PERSONA_ID);
      expect(updatedPersona.state.interactionCount).toBeGreaterThan(0);
      expect(updatedPersona.state.modelConfidence).toBeGreaterThan(0);
    }, ML_OPERATION_TIMEOUT);

    it('should generate personalized recommendations', async () => {
      const recommendations = await personaService.getPersonaRecommendations(
        MOCK_PERSONA_ID,
        { limit: 5, minConfidence: 0.7 }
      );

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations[0]).toHaveProperty('confidence');
      expect(recommendations[0].confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should handle ML service errors gracefully', async () => {
      jest.spyOn(mlService, 'updatePersonaModel').mockRejectedValue(
        new Error(ErrorCode.ML_SERVICE_ERROR)
      );

      await expect(personaService.updatePersonaState(
        MOCK_PERSONA_ID,
        { action: 'test' }
      )).rejects.toThrow(ErrorCode.ML_SERVICE_ERROR);
    });
  });

  describe('State Management', () => {
    it('should track learning progress accurately', async () => {
      const initialState = (await personaService.getPersonaById(MOCK_PERSONA_ID)).state;
      
      // Simulate multiple interactions
      for (let i = 0; i < 5; i++) {
        await personaService.updatePersonaState(MOCK_PERSONA_ID, {
          action: 'interaction',
          data: { index: i }
        });
      }

      const finalState = (await personaService.getPersonaById(MOCK_PERSONA_ID)).state;
      expect(finalState.interactionCount).toBe(initialState.interactionCount + 5);
      expect(finalState.learningProgress).toBeGreaterThan(initialState.learningProgress);
    });

    it('should validate state transitions', async () => {
      const invalidState: Partial<PersonaState> = {
        adaptationLevel: 2, // Invalid: should be between 0 and 1
        modelConfidence: -1 // Invalid: should be between 0 and 1
      };

      await expect(personaService.updatePersonaState(
        MOCK_PERSONA_ID,
        { state: invalidState }
      )).rejects.toThrow();
    });
  });

  describe('Preference Management', () => {
    it('should update preferences and trigger learning adaptation', async () => {
      const newPreferences: Partial<PersonaPreferences> = {
        destinations: ['Tokyo', 'Kyoto'],
        activities: ['Cultural Tours', 'Food Tasting'],
        budget: {
          min: 2000,
          max: 8000,
          currency: 'USD',
          flexibility: 0.2
        }
      };

      await personaService.updatePersonaPreferences(MOCK_PERSONA_ID, newPreferences);
      const updatedPersona = await personaService.getPersonaById(MOCK_PERSONA_ID);

      expect(updatedPersona.preferences.destinations).toContain('Tokyo');
      expect(updatedPersona.preferences.activities).toContain('Cultural Tours');
      expect(updatedPersona.state.lastInteraction).toBeDefined();
    });

    it('should validate preference updates', async () => {
      const invalidPreferences = {
        budget: {
          min: 5000,
          max: 1000 // Invalid: min > max
        }
      };

      await expect(personaService.updatePersonaPreferences(
        MOCK_PERSONA_ID,
        invalidPreferences
      )).rejects.toThrow();
    });
  });

  describe('Security', () => {
    it('should validate persona ownership', async () => {
      const unauthorizedUserId = 'unauthorized-user';
      await expect(personaService.getUserPersonas(unauthorizedUserId))
        .resolves.toHaveLength(0);
    });

    it('should handle persona deletion securely', async () => {
      await personaService.deletePersona(MOCK_PERSONA_ID);
      await expect(personaService.getPersonaById(MOCK_PERSONA_ID))
        .rejects.toThrow();
    });
  });
});