/**
 * @fileoverview Core service for managing AI personas with real-time learning capabilities
 * @module persona-service/services/persona
 * @version 1.0.0
 */

import { Injectable } from '@nestjs/common'; // v9.0.x
import { InjectRepository } from '@nestjs/typeorm'; // v9.0.x
import { Repository } from 'typeorm'; // v0.3.x
import {
  IPersona,
  PersonaType,
  PersonaState,
  PersonaPreferences,
} from '../interfaces/persona.interface';
import { PersonaEntity } from '../models/persona.model';
import { MLService } from './ml.service';
import { Logger } from '../../../shared/utils/logger.util';
import { ErrorCode } from '../../../shared/constants/error-codes';

// Global constants for persona management
const MAX_PERSONAS_PER_USER = 5;
const DEFAULT_ADAPTATION_LEVEL = 0.5;
const DEFAULT_LEARNING_RATE = 0.01;
const MIN_CONFIDENCE_THRESHOLD = 0.7;
const MAX_LEARNING_ITERATIONS = 1000;
const STATE_UPDATE_INTERVAL = 300000; // 5 minutes

/**
 * Service responsible for managing AI personas with real-time learning capabilities
 */
@Injectable()
export class PersonaService {
  constructor(
    @InjectRepository(PersonaEntity)
    private readonly personaRepository: Repository<PersonaEntity>,
    private readonly mlService: MLService,
    private readonly logger: Logger
  ) {}

  /**
   * Creates a new AI persona with initialized ML model
   * @param userId User identifier
   * @param personaData Initial persona configuration
   * @returns Newly created persona instance
   */
  public async createPersona(
    userId: string,
    personaData: Partial<IPersona>
  ): Promise<IPersona> {
    try {
      // Check user's persona limit
      const existingCount = await this.personaRepository.count({ where: { userId } });
      if (existingCount >= MAX_PERSONAS_PER_USER) {
        throw new Error(`Maximum personas (${MAX_PERSONAS_PER_USER}) reached for user`);
      }

      // Initialize persona with default state
      const persona = new PersonaEntity({
        ...personaData,
        userId,
        state: {
          adaptationLevel: DEFAULT_ADAPTATION_LEVEL,
          lastInteraction: new Date(),
          learningProgress: 0,
          interactionCount: 0,
          modelConfidence: MIN_CONFIDENCE_THRESHOLD,
          lastTrainingUpdate: new Date()
        }
      });

      // Initialize ML model for persona
      await this.mlService.initializeModel(persona);

      // Save persona to database
      const savedPersona = await this.personaRepository.save(persona);

      this.logger.info('Created new persona', {
        personaId: savedPersona.id,
        userId,
        type: savedPersona.type
      });

      return savedPersona;
    } catch (error) {
      this.logger.error('Failed to create persona', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Updates persona state with real-time learning adaptation
   * @param personaId Persona identifier
   * @param interactionData New interaction data for learning
   */
  public async updatePersonaState(
    personaId: string,
    interactionData: any
  ): Promise<void> {
    try {
      const persona = await this.personaRepository.findOne({ 
        where: { id: personaId }
      });

      if (!persona) {
        throw new Error(`Persona ${personaId} not found`);
      }

      // Update ML model with new interaction data
      await this.mlService.updatePersonaModel(persona, [interactionData], {
        priority: 'high',
        validateResults: true
      });

      // Calculate new confidence score
      const confidenceScore = await this.mlService.calculateConfidence(persona);

      // Update learning rate based on performance
      const newLearningRate = await this.mlService.updateLearningRate(
        persona,
        confidenceScore
      );

      // Update persona state
      await persona.updateState({
        adaptationLevel: Math.min(1, persona.state.adaptationLevel + newLearningRate),
        lastInteraction: new Date(),
        learningProgress: persona.state.interactionCount / MAX_LEARNING_ITERATIONS,
        interactionCount: persona.state.interactionCount + 1,
        modelConfidence: confidenceScore,
        lastTrainingUpdate: new Date()
      });

      await this.personaRepository.save(persona);

      this.logger.info('Updated persona state', {
        personaId,
        confidenceScore,
        learningProgress: persona.state.learningProgress
      });
    } catch (error) {
      this.logger.error('Failed to update persona state', error as Error, { personaId });
      throw error;
    }
  }

  /**
   * Retrieves a persona by ID with validation
   * @param personaId Persona identifier
   * @returns Persona instance
   */
  public async getPersonaById(personaId: string): Promise<IPersona> {
    const persona = await this.personaRepository.findOne({
      where: { id: personaId }
    });

    if (!persona) {
      throw new Error(`Persona ${personaId} not found`);
    }

    return persona;
  }

  /**
   * Retrieves all personas for a user
   * @param userId User identifier
   * @returns Array of user's personas
   */
  public async getUserPersonas(userId: string): Promise<IPersona[]> {
    return this.personaRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Updates persona preferences and triggers learning adaptation
   * @param personaId Persona identifier
   * @param preferences Updated preferences
   */
  public async updatePersonaPreferences(
    personaId: string,
    preferences: Partial<PersonaPreferences>
  ): Promise<void> {
    const persona = await this.getPersonaById(personaId);
    await persona.updatePreferences(preferences);
    await this.personaRepository.save(persona);

    // Trigger ML model update with new preferences
    await this.mlService.updatePersonaModel(persona, [], {
      priority: 'normal',
      validateResults: true
    });
  }

  /**
   * Deletes a persona and its associated ML model
   * @param personaId Persona identifier
   */
  public async deletePersona(personaId: string): Promise<void> {
    const persona = await this.getPersonaById(personaId);
    
    // Clean up ML model resources
    await this.mlService.deleteModel(persona.id);
    
    await this.personaRepository.remove(persona);

    this.logger.info('Deleted persona', { personaId });
  }

  /**
   * Gets personalized recommendations for a persona
   * @param personaId Persona identifier
   * @returns Array of recommendations
   */
  public async getPersonaRecommendations(
    personaId: string,
    options: any = {}
  ): Promise<any[]> {
    const persona = await this.getPersonaById(personaId);
    
    return this.mlService.getRecommendations(persona, {
      limit: options.limit || 10,
      minConfidence: MIN_CONFIDENCE_THRESHOLD,
      includeMetadata: true,
      ...options
    });
  }

  /**
   * Gets current confidence score for a persona
   * @param personaId Persona identifier
   * @returns Confidence score between 0 and 1
   */
  public async getPersonaConfidence(personaId: string): Promise<number> {
    const persona = await this.getPersonaById(personaId);
    return this.mlService.calculateConfidence(persona);
  }
}