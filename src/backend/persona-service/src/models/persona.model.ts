/**
 * @fileoverview TypeORM entity model for AI personas with enhanced learning capabilities
 * @module persona-service/models/persona
 * @version 1.0.0
 */

import { Entity, Column, Index } from 'typeorm'; // v0.3.x
import { BaseEntity } from '../../../shared/interfaces/base.interface';
import { 
  IPersona, 
  PersonaType, 
  PersonaState, 
  PersonaPreferences 
} from '../interfaces/persona.interface';
import { encrypt } from '../../../shared/utils/encryption.util';
import { Logger } from '../../../shared/utils/logger.util';

// Constants for persona management and validation
const MAX_PERSONAS_PER_USER = 5;
const MIN_MODEL_CONFIDENCE = 0.6;
const LEARNING_RATE = 0.01;
const DEFAULT_ADAPTATION_LEVEL = 0;
const STATE_UPDATE_LIMIT = 100;

/**
 * TypeORM entity class for AI personas with real-time learning capabilities
 * Implements comprehensive data management and security features
 */
@Entity('personas')
@Index(['userId', 'type'], { unique: true })
@Index(['isActive'])
@Index(['userId', 'lastInteraction'])
export class PersonaEntity implements IPersona, BaseEntity {
  // Base entity fields
  @Column('uuid', { primary: true, generated: 'uuid' })
  id: string;

  @Column('timestamp with time zone', { default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column('timestamp with time zone', { default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  // Persona-specific fields
  @Column('uuid')
  userId: string;

  @Column('varchar', { length: 100 })
  name: string;

  @Column('enum', { enum: PersonaType })
  type: PersonaType;

  @Column('boolean', { default: false })
  isActive: boolean;

  @Column('boolean', { default: false })
  isPaid: boolean;

  @Column('jsonb')
  state: PersonaState;

  @Column('jsonb')
  preferences: PersonaPreferences;

  @Column('varchar', { length: 50 })
  modelVersion: string;

  @Column('float', { default: DEFAULT_ADAPTATION_LEVEL })
  adaptationLevel: number;

  @Column('float', { default: MIN_MODEL_CONFIDENCE })
  modelConfidence: number;

  @Column('timestamp with time zone', { default: () => 'CURRENT_TIMESTAMP' })
  lastInteraction: Date;

  @Column('integer', { default: 0 })
  interactionCount: number;

  @Column('timestamp with time zone', { nullable: true })
  lastSyncTimestamp: Date;

  /**
   * Creates a new persona entity with enhanced validation and security
   * @param data Partial persona data for initialization
   */
  constructor(data: Partial<IPersona>) {
    // Initialize base entity
    Object.assign(this, data);

    // Set default state if not provided
    if (!this.state) {
      this.state = {
        adaptationLevel: DEFAULT_ADAPTATION_LEVEL,
        lastInteraction: new Date(),
        learningProgress: 0,
        interactionCount: 0,
        modelConfidence: MIN_MODEL_CONFIDENCE,
        lastTrainingUpdate: new Date()
      };
    }

    // Set default preferences if not provided
    if (!this.preferences) {
      this.preferences = {
        destinations: [],
        activities: [],
        budget: {
          min: 0,
          max: 0,
          currency: 'USD',
          flexibility: 0.5
        },
        travelStyle: [],
        accommodation: [],
        seasonalPreferences: {},
        dietaryRestrictions: []
      };
    }

    // Encrypt sensitive preference data
    this.encryptSensitiveData();
  }

  /**
   * Updates persona state with enhanced learning progress tracking
   * @param newState Partial state update
   */
  async updateState(newState: Partial<PersonaState>): Promise<void> {
    try {
      // Validate model version compatibility
      this.validateModelCompatibility();

      // Update state with learning metrics
      this.state = {
        ...this.state,
        ...newState,
        lastInteraction: new Date(),
        interactionCount: this.state.interactionCount + 1
      };

      // Update adaptation metrics
      this.adaptationLevel = Math.min(
        1,
        this.adaptationLevel + (LEARNING_RATE * this.calculateLearningProgress())
      );

      // Update model confidence
      this.modelConfidence = this.calculateModelConfidence();

      // Log state update
      Logger.getInstance().info('Persona state updated', {
        personaId: this.id,
        adaptationLevel: this.adaptationLevel,
        modelConfidence: this.modelConfidence
      });

      // Trigger optimization if needed
      if (this.state.interactionCount % STATE_UPDATE_LIMIT === 0) {
        await this.optimizeState();
      }
    } catch (error) {
      Logger.getInstance().error(
        'Failed to update persona state',
        error instanceof Error ? error : new Error('Unknown error'),
        { personaId: this.id }
      );
      throw error;
    }
  }

  /**
   * Updates persona preferences with enhanced security
   * @param newPreferences Partial preferences update
   */
  async updatePreferences(newPreferences: Partial<PersonaPreferences>): Promise<void> {
    try {
      // Validate preference schema
      this.validatePreferences(newPreferences);

      // Merge with existing preferences
      this.preferences = {
        ...this.preferences,
        ...newPreferences
      };

      // Encrypt sensitive data
      await this.encryptSensitiveData();

      // Update last interaction
      this.lastInteraction = new Date();

      Logger.getInstance().info('Persona preferences updated', {
        personaId: this.id,
        preferencesUpdated: Object.keys(newPreferences)
      });
    } catch (error) {
      Logger.getInstance().error(
        'Failed to update persona preferences',
        error instanceof Error ? error : new Error('Unknown error'),
        { personaId: this.id }
      );
      throw error;
    }
  }

  /**
   * Validates model version compatibility
   * @throws Error if model version is incompatible
   */
  private validateModelCompatibility(): void {
    const currentVersion = this.modelVersion.split('.');
    const minVersion = '1.0.0'.split('.');

    for (let i = 0; i < 3; i++) {
      if (parseInt(currentVersion[i]) < parseInt(minVersion[i])) {
        throw new Error('Incompatible model version');
      }
    }
  }

  /**
   * Encrypts sensitive preference data
   */
  private async encryptSensitiveData(): Promise<void> {
    if (this.preferences.budget) {
      const encryptedBudget = await encrypt(
        JSON.stringify(this.preferences.budget),
        Buffer.from(process.env.ENCRYPTION_KEY || '')
      );
      this.preferences.budget = encryptedBudget as any;
    }
  }

  /**
   * Calculates current learning progress
   * @returns Learning progress value between 0 and 1
   */
  private calculateLearningProgress(): number {
    return Math.min(
      1,
      this.state.interactionCount / STATE_UPDATE_LIMIT
    );
  }

  /**
   * Calculates current model confidence
   * @returns Confidence score between MIN_MODEL_CONFIDENCE and 1
   */
  private calculateModelConfidence(): number {
    return Math.max(
      MIN_MODEL_CONFIDENCE,
      Math.min(1, this.modelConfidence + (LEARNING_RATE * this.adaptationLevel))
    );
  }

  /**
   * Validates preference updates
   * @param preferences Preferences to validate
   * @throws Error if preferences are invalid
   */
  private validatePreferences(preferences: Partial<PersonaPreferences>): void {
    if (preferences.budget) {
      if (preferences.budget.min > preferences.budget.max) {
        throw new Error('Invalid budget range');
      }
    }

    if (preferences.seasonalPreferences) {
      Object.values(preferences.seasonalPreferences).forEach(score => {
        if (score < 0 || score > 1) {
          throw new Error('Invalid seasonal preference score');
        }
      });
    }
  }

  /**
   * Optimizes persona state for improved performance
   */
  private async optimizeState(): Promise<void> {
    // Implement state optimization logic
    this.state.lastTrainingUpdate = new Date();
    Logger.getInstance().info('Persona state optimized', { personaId: this.id });
  }
}