// @ts-check
import { z } from 'zod'; // v3.21.4 - Runtime type validation

/**
 * Possible states of an AI agent in the system
 */
export enum AgentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

/**
 * Available types of consultations that can be offered
 */
export enum ConsultationType {
  VIDEO = 'VIDEO',
  CHAT = 'CHAT',
  AI_AGENT = 'AI_AGENT'
}

/**
 * Tracks the current state of a consultation session
 */
export enum ConsultationStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

/**
 * Payment status enum used in ConsultationPayment
 */
enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

/**
 * Defines the pricing structure for AI agents including subscription options
 */
export interface AgentPricing {
  readonly basePrice: number;
  readonly currency: string;
  readonly subscriptionEnabled: boolean;
  readonly subscriptionPrice: number;
  readonly customPricing: Record<string, number>;
}

/**
 * Defines the capabilities and operational parameters of an AI agent
 */
export interface AgentCapabilities {
  readonly languages: readonly string[];
  readonly specialties: readonly string[];
  readonly availableHours: Record<string, {
    start: string;
    end: string;
    timeZone: string;
  }>;
  readonly maxConcurrentChats: number;
  readonly supportedFeatures: Set<string>;
}

/**
 * Tracks performance and usage metrics for AI agents
 */
export interface AgentAnalytics {
  readonly totalSessions: number;
  readonly averageRating: number;
  readonly totalRevenue: number;
  readonly activeSubscribers: number;
  readonly metrics: Record<string, number>;
}

/**
 * Manages payment information for consultation sessions
 */
export interface ConsultationPayment {
  readonly amount: number;
  readonly currency: string;
  readonly status: PaymentStatus;
  readonly transactionId: string;
  readonly metadata: Record<string, unknown>;
}

/**
 * Stores user feedback and ratings for consultations
 */
export interface ConsultationFeedback {
  readonly rating: number;
  readonly comment: string;
  readonly submittedAt: Date;
  readonly categories: string[];
}

/**
 * Main interface representing an AI agent in the system
 */
export interface Agent {
  readonly id: string;
  readonly professionalId: string;
  readonly name: string;
  readonly description: string;
  readonly status: AgentStatus;
  readonly pricing: AgentPricing;
  readonly capabilities: AgentCapabilities;
  readonly analytics: AgentAnalytics;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly settings: Record<string, unknown>;
}

/**
 * Main interface representing a consultation session
 */
export interface Consultation {
  readonly id: string;
  readonly userId: string;
  readonly professionalId: string;
  readonly agentId: string;
  readonly type: ConsultationType;
  readonly status: ConsultationStatus;
  readonly scheduledStartTime: Date;
  readonly scheduledEndTime: Date;
  readonly actualStartTime: Date;
  readonly actualEndTime: Date;
  readonly payment: ConsultationPayment;
  readonly feedback: ConsultationFeedback;
  readonly meetingUrl: string;
  readonly notes: string;
  readonly metadata: Record<string, unknown>;
}

// Zod schemas for runtime validation
export const AgentPricingSchema = z.object({
  basePrice: z.number().min(0),
  currency: z.string().length(3),
  subscriptionEnabled: z.boolean(),
  subscriptionPrice: z.number().min(0),
  customPricing: z.record(z.string(), z.number().min(0))
});

export const AgentCapabilitiesSchema = z.object({
  languages: z.array(z.string()),
  specialties: z.array(z.string()),
  availableHours: z.record(z.object({
    start: z.string(),
    end: z.string(),
    timeZone: z.string()
  })),
  maxConcurrentChats: z.number().min(1),
  supportedFeatures: z.set(z.string())
});

export const AgentSchema = z.object({
  id: z.string().uuid(),
  professionalId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string(),
  status: z.nativeEnum(AgentStatus),
  pricing: AgentPricingSchema,
  capabilities: AgentCapabilitiesSchema,
  analytics: z.object({
    totalSessions: z.number(),
    averageRating: z.number(),
    totalRevenue: z.number(),
    activeSubscribers: z.number(),
    metrics: z.record(z.string(), z.number())
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
  settings: z.record(z.string(), z.unknown())
});

export const ConsultationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  professionalId: z.string().uuid(),
  agentId: z.string().uuid(),
  type: z.nativeEnum(ConsultationType),
  status: z.nativeEnum(ConsultationStatus),
  scheduledStartTime: z.date(),
  scheduledEndTime: z.date(),
  actualStartTime: z.date(),
  actualEndTime: z.date(),
  payment: z.object({
    amount: z.number().min(0),
    currency: z.string().length(3),
    status: z.nativeEnum(PaymentStatus),
    transactionId: z.string(),
    metadata: z.record(z.string(), z.unknown())
  }),
  feedback: z.object({
    rating: z.number().min(1).max(5),
    comment: z.string(),
    submittedAt: z.date(),
    categories: z.array(z.string())
  }),
  meetingUrl: z.string().url(),
  notes: z.string(),
  metadata: z.record(z.string(), z.unknown())
});