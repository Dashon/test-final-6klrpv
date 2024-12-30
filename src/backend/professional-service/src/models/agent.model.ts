/**
 * @fileoverview TypeORM entity model for AI agents in the professional service
 * @module professional-service/models/agent
 * @version 1.0.0
 */

import { Entity, Column, Index, PrimaryGeneratedColumn, VersionColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'; // v0.3.x
import { IsNotEmpty, IsOptional } from 'class-validator'; // v0.14.x
import { IAgent, AgentStatus, AgentPricing, AgentCapabilities, AgentAnalytics } from '../interfaces/agent.interface';

/**
 * TypeORM entity model for AI agents with enhanced schema definition
 * including subscription support and analytics tracking
 */
@Entity('agents')
@Index(['professionalId'])
@Index(['status'])
@Index(['name', 'status'])
export class Agent implements IAgent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty()
  @Index()
  professionalId: string;

  @Column()
  @IsNotEmpty()
  name: string;

  @Column('text')
  @IsNotEmpty()
  description: string;

  @Column({
    type: 'enum',
    enum: AgentStatus,
    default: AgentStatus.DRAFT
  })
  status: AgentStatus;

  @Column('jsonb')
  @IsNotEmpty()
  pricing: AgentPricing;

  @Column('jsonb')
  @IsNotEmpty()
  capabilities: AgentCapabilities;

  @Column('jsonb')
  @IsOptional()
  analytics: AgentAnalytics;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  lastTrainingDate: Date;

  @VersionColumn()
  version: number;

  /**
   * Transforms entity to a JSON representation with sensitive data handling
   * @returns Sanitized JSON object of the agent
   */
  toJSON(): Partial<Agent> {
    const agent = {
      id: this.id,
      professionalId: this.professionalId,
      name: this.name,
      description: this.description,
      status: this.status,
      capabilities: {
        ...this.capabilities,
        // Remove internal capability flags
        restrictions: undefined
      },
      analytics: {
        // Only include public analytics data
        totalSessions: this.analytics?.totalSessions,
        averageRating: this.analytics?.averageRating,
        performance: {
          responseTime: this.analytics?.performance?.responseTime,
          satisfactionScore: this.analytics?.performance?.satisfactionScore
        }
      },
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      version: this.version
    };

    // Only include pricing for published agents
    if (this.status === AgentStatus.PUBLISHED) {
      agent.pricing = {
        basePrice: this.pricing.basePrice,
        currency: this.pricing.currency,
        subscriptionEnabled: this.pricing.subscriptionEnabled,
        trialPeriodDays: this.pricing.trialPeriodDays
      };
    }

    return agent;
  }
}