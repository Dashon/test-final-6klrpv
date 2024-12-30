/**
 * @fileoverview ML Service for managing AI persona interactions and real-time learning
 * @module persona-service/services/ml
 * @version 1.0.0
 */

import { Injectable } from '@nestjs/common';
import { Subject, Observable, throwError } from 'rxjs';
import { retry, catchError, timeout } from 'rxjs/operators';
import axios, { AxiosInstance } from 'axios';
import { IPersona } from '../interfaces/persona.interface';
import { Logger } from '../../../shared/utils/logger.util';
import { ErrorCode } from '../../../shared/constants/error-codes';

// Environment configuration
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:3000';
const MODEL_VERSION = process.env.MODEL_VERSION || '1.0.0';
const RETRY_ATTEMPTS = Number(process.env.RETRY_ATTEMPTS) || 3;
const CACHE_TTL = Number(process.env.CACHE_TTL) || 300; // 5 minutes

/**
 * Interface for travel recommendations
 */
interface TravelRecommendation {
  id: string;
  destination: string;
  activities: string[];
  confidence: number;
  price: {
    amount: number;
    currency: string;
  };
  metadata: Record<string, unknown>;
}

/**
 * Interface for recommendation request options
 */
interface RecommendationOptions {
  limit?: number;
  minConfidence?: number;
  includeMetadata?: boolean;
  priceRange?: {
    min: number;
    max: number;
    currency: string;
  };
}

/**
 * Interface for model update options
 */
interface UpdateOptions {
  batchSize?: number;
  priority?: 'high' | 'normal' | 'low';
  validateResults?: boolean;
}

/**
 * Interface for model health status
 */
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  accuracy: number;
  errorRate: number;
  lastUpdate: Date;
  metrics: Record<string, number>;
}

/**
 * Service responsible for ML model interactions and persona recommendations
 */
@Injectable()
export class MLService {
  private readonly httpClient: AxiosInstance;
  private readonly healthMonitor$: Subject<HealthStatus>;

  constructor(
    private readonly logger: Logger
  ) {
    // Initialize HTTP client with configuration
    this.httpClient = axios.create({
      baseURL: ML_SERVICE_URL,
      timeout: 5000,
      headers: {
        'X-Model-Version': MODEL_VERSION,
        'Content-Type': 'application/json'
      }
    });

    // Initialize health monitoring
    this.healthMonitor$ = new Subject<HealthStatus>();
    this.setupHealthMonitoring();
  }

  /**
   * Get personalized travel recommendations for a persona
   */
  public async getRecommendations(
    persona: IPersona,
    options: RecommendationOptions = {}
  ): Promise<TravelRecommendation[]> {
    try {
      this.logger.info('Fetching recommendations', { 
        personaId: persona.id,
        options 
      });

      // Transform persona preferences to model input format
      const modelInput = this.transformPersonaToModelInput(persona);

      const response = await this.httpClient.post<TravelRecommendation[]>(
        '/recommendations',
        {
          input: modelInput,
          options: {
            limit: options.limit || 10,
            minConfidence: options.minConfidence || 0.7,
            ...options
          }
        }
      ).then(res => res.data);

      // Validate and enrich recommendations
      const validatedRecommendations = this.validateRecommendations(response);

      // Update persona learning state
      await this.updatePersonaLearningState(persona, validatedRecommendations);

      return validatedRecommendations;
    } catch (error) {
      this.logger.error('Failed to fetch recommendations', error as Error, {
        personaId: persona.id
      });
      throw this.handleMLError(error);
    }
  }

  /**
   * Update persona model with new interaction data
   */
  public async updatePersonaModel(
    persona: IPersona,
    interactions: any[],
    options: UpdateOptions = {}
  ): Promise<void> {
    try {
      this.logger.info('Updating persona model', {
        personaId: persona.id,
        interactionCount: interactions.length
      });

      // Batch interactions for efficient processing
      const batches = this.batchInteractions(
        interactions,
        options.batchSize || 100
      );

      for (const batch of batches) {
        await this.httpClient.post('/train', {
          personaId: persona.id,
          interactions: batch,
          options: {
            priority: options.priority || 'normal',
            validateResults: options.validateResults ?? true
          }
        });
      }

      // Validate model health after update
      await this.validateModelHealth(persona.id);
    } catch (error) {
      this.logger.error('Failed to update persona model', error as Error, {
        personaId: persona.id
      });
      throw this.handleMLError(error);
    }
  }

  /**
   * Get model health status observable
   */
  public getHealthStatus(): Observable<HealthStatus> {
    return this.healthMonitor$.asObservable();
  }

  /**
   * Validate model health and performance
   */
  private async validateModelHealth(personaId: string): Promise<HealthStatus> {
    try {
      const response = await this.httpClient.get<HealthStatus>(
        `/health/${personaId}`
      ).then(res => res.data);

      this.healthMonitor$.next(response);
      return response;
    } catch (error) {
      this.logger.error('Health check failed', error as Error, {
        personaId
      });
      throw this.handleMLError(error);
    }
  }

  /**
   * Transform persona data to ML model input format
   */
  private transformPersonaToModelInput(persona: IPersona): Record<string, unknown> {
    return {
      preferences: persona.preferences,
      state: persona.state,
      history: persona.state.interactionCount,
      modelVersion: MODEL_VERSION
    };
  }

  /**
   * Validate and enrich recommendations
   */
  private validateRecommendations(
    recommendations: TravelRecommendation[]
  ): TravelRecommendation[] {
    return recommendations.filter(rec => 
      rec.confidence >= 0.7 && 
      rec.destination && 
      rec.activities?.length > 0
    );
  }

  /**
   * Set up periodic health monitoring
   */
  private setupHealthMonitoring(): void {
    setInterval(async () => {
      try {
        const status = await this.httpClient.get<HealthStatus>('/health')
          .then(res => res.data);
        this.healthMonitor$.next(status);
      } catch (error) {
        this.logger.error('Health monitoring failed', error as Error);
      }
    }, 60000); // Check every minute
  }

  /**
   * Batch interactions for efficient processing
   */
  private batchInteractions(interactions: any[], batchSize: number): any[][] {
    const batches: any[][] = [];
    for (let i = 0; i < interactions.length; i += batchSize) {
      batches.push(interactions.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Handle ML service specific errors
   */
  private handleMLError(error: any): Error {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 503) {
        return new Error(ErrorCode.ML_SERVICE_ERROR);
      }
      if (error.response?.status === 400) {
        return new Error(ErrorCode.VALIDATION_ERROR);
      }
    }
    return new Error(ErrorCode.INTERNAL_SERVER_ERROR);
  }

  /**
   * Update persona learning state based on recommendations
   */
  private async updatePersonaLearningState(
    persona: IPersona,
    recommendations: TravelRecommendation[]
  ): Promise<void> {
    const avgConfidence = recommendations.reduce(
      (acc, rec) => acc + rec.confidence,
      0
    ) / recommendations.length;

    await this.httpClient.patch(`/personas/${persona.id}/state`, {
      modelConfidence: avgConfidence,
      lastInteraction: new Date(),
      interactionCount: persona.state.interactionCount + 1
    });
  }
}