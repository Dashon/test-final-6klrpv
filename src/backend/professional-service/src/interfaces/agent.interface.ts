/**
 * @fileoverview Defines comprehensive interfaces and types for AI agents in the professional service
 * @module professional-service/interfaces/agent
 * @version 1.0.0
 */

import { BaseEntity } from '../../../shared/interfaces/base.interface';

/**
 * Possible states of an AI agent
 */
export enum AgentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

/**
 * Supported currency codes for agent pricing
 */
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY';

/**
 * Subscription intervals for recurring billing
 */
export enum SubscriptionInterval {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY'
}

/**
 * Language proficiency levels for AI agents
 */
export enum LanguageProficiency {
  BASIC = 'BASIC',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  NATIVE = 'NATIVE'
}

/**
 * Time units for response time measurement
 */
export enum TimeUnit {
  SECONDS = 'SECONDS',
  MINUTES = 'MINUTES',
  HOURS = 'HOURS'
}

/**
 * Weekly schedule configuration
 */
export interface WeeklySchedule {
  monday: { start: string; end: string }[];
  tuesday: { start: string; end: string }[];
  wednesday: { start: string; end: string }[];
  thursday: { start: string; end: string }[];
  friday: { start: string; end: string }[];
  saturday: { start: string; end: string }[];
  sunday: { start: string; end: string }[];
}

/**
 * Pricing structure for AI agents including subscription models
 */
export interface AgentPricing {
  /** Base price for one-time access */
  basePrice: number;
  
  /** Currency for all monetary values */
  currency: CurrencyCode;
  
  /** Whether subscription model is enabled */
  subscriptionEnabled: boolean;
  
  /** Price per subscription interval */
  subscriptionPrice: number;
  
  /** Subscription billing interval */
  subscriptionInterval: SubscriptionInterval;
  
  /** Free trial period in days (0 for no trial) */
  trialPeriodDays: number;
}

/**
 * Detailed capabilities and limitations of AI agents
 */
export interface AgentCapabilities {
  /** Supported languages with proficiency levels */
  languages: Array<{
    code: string;
    proficiency: LanguageProficiency;
  }>;
  
  /** Agent specialties and expertise areas */
  specialties: Array<{
    category: string;
    subcategories: string[];
  }>;
  
  /** Availability schedule with timezone */
  availableHours: {
    timezone: string;
    schedule: WeeklySchedule;
  };
  
  /** Maximum concurrent chat sessions */
  maxConcurrentChats: number;
  
  /** Expected response time range */
  responseTime: {
    min: number;
    max: number;
    unit: TimeUnit;
  };
}

/**
 * Snapshot of agent metrics for a time period
 */
export interface MetricSnapshot {
  sessions: number;
  revenue: number;
  ratings: number[];
  responseTime: number;
  resolutionRate: number;
}

/**
 * Comprehensive analytics tracking for AI agents
 */
export interface AgentAnalytics {
  /** Total number of chat sessions */
  totalSessions: number;
  
  /** Average user rating (1-5) */
  averageRating: number;
  
  /** Total revenue generated */
  totalRevenue: number;
  
  /** Number of active subscribers */
  activeSubscribers: number;
  
  /** Time-based metric snapshots */
  metrics: {
    daily: MetricSnapshot;
    weekly: MetricSnapshot;
    monthly: MetricSnapshot;
  };
  
  /** Performance indicators */
  performance: {
    responseTime: number;
    resolutionRate: number;
    satisfactionScore: number;
  };
}

/**
 * Main interface for AI agents with comprehensive type coverage
 * Extends BaseEntity for common fields
 */
export interface IAgent extends BaseEntity {
  /** Reference to owning professional */
  professionalId: string;
  
  /** Display name of the agent */
  name: string;
  
  /** Detailed description of capabilities */
  description: string;
  
  /** Current agent status */
  status: AgentStatus;
  
  /** Pricing configuration */
  pricing: AgentPricing;
  
  /** Agent capabilities and limitations */
  capabilities: AgentCapabilities;
  
  /** Performance analytics */
  analytics: AgentAnalytics;
  
  /** Agent version for tracking updates */
  version: string;
  
  /** Last ML model training date */
  lastTrainingDate: Date;
}