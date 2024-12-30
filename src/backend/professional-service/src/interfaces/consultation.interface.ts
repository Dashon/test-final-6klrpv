/**
 * @fileoverview Defines comprehensive interfaces and types for professional consultations
 * @module professional-service/interfaces/consultation
 * @version 1.0.0
 */

import { BaseEntity } from '../../../shared/interfaces/base.interface';
import { IAgent } from './agent.interface';

/**
 * Types of available consultations
 */
export enum ConsultationType {
  /** Real-time video consultation */
  VIDEO = 'VIDEO',
  /** Text-based chat consultation */
  CHAT = 'CHAT',
  /** AI agent interaction */
  AI_AGENT = 'AI_AGENT'
}

/**
 * Status tracking for consultation sessions
 */
export enum ConsultationStatus {
  /** Consultation is booked but not started */
  SCHEDULED = 'SCHEDULED',
  /** Consultation is currently active */
  IN_PROGRESS = 'IN_PROGRESS',
  /** Consultation has been completed */
  COMPLETED = 'COMPLETED',
  /** Consultation was cancelled */
  CANCELLED = 'CANCELLED'
}

/**
 * Payment status tracking for consultations
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED'
}

/**
 * Comprehensive payment tracking for consultations
 */
export interface ConsultationPayment {
  /** Payment amount in smallest currency unit */
  amount: number;
  
  /** Three-letter currency code */
  currency: string;
  
  /** Current payment status */
  status: PaymentStatus;
  
  /** Payment processor transaction ID */
  transactionId: string;
  
  /** Payment method used (e.g., 'card', 'paypal') */
  paymentMethod: string;
  
  /** Timestamp of payment processing */
  paymentDate: Date;
  
  /** Current refund status if applicable */
  refundStatus?: PaymentStatus;
  
  /** Refund transaction ID if applicable */
  refundTransactionId?: string;
  
  /** Refund amount if partially refunded */
  refundAmount?: number;
  
  /** Reason for refund if applicable */
  refundReason?: string;
}

/**
 * Detailed feedback collection for consultations
 */
export interface ConsultationFeedback {
  /** Numerical rating (1-5) */
  rating: number;
  
  /** Written feedback from user */
  comment: string;
  
  /** When feedback was submitted */
  submittedAt: Date;
  
  /** Categorized feedback aspects */
  categories: string[];
  
  /** Internal notes not shown to professional */
  privateNotes?: string;
  
  /** Specific aspect ratings */
  aspectRatings?: {
    knowledge: number;
    communication: number;
    helpfulness: number;
    professionalism: number;
  };
  
  /** Whether user would recommend */
  recommended?: boolean;
}

/**
 * Main interface for consultation sessions
 * Extends BaseEntity for common tracking fields
 */
export interface IConsultation extends BaseEntity {
  /** User requesting consultation */
  userId: string;
  
  /** Professional providing consultation */
  professionalId: string;
  
  /** AI agent ID if applicable */
  agentId?: string;
  
  /** Type of consultation */
  type: ConsultationType;
  
  /** Current status */
  status: ConsultationStatus;
  
  /** Planned start time */
  scheduledStartTime: Date;
  
  /** Planned end time */
  scheduledEndTime: Date;
  
  /** Actual start time when session began */
  actualStartTime?: Date;
  
  /** Actual end time when session completed */
  actualEndTime?: Date;
  
  /** Payment information */
  payment: ConsultationPayment;
  
  /** User feedback */
  feedback?: ConsultationFeedback;
  
  /** Video meeting URL for video consultations */
  meetingUrl?: string;
  
  /** Session notes */
  notes?: string;
  
  /** Reason if cancelled */
  cancellationReason?: string;
  
  /** Recording URL if session was recorded */
  recordingUrl?: string;
  
  /** Number of participants */
  participantCount: number;
  
  /** Session duration in minutes */
  duration: number;
  
  /** Consultation topic or focus area */
  topic?: string;
  
  /** Any pre-consultation questionnaire responses */
  preConsultationData?: Record<string, unknown>;
  
  /** Technical issues encountered */
  technicalIssues?: Array<{
    type: string;
    timestamp: Date;
    description: string;
  }>;
  
  /** Follow-up actions or recommendations */
  followUpActions?: Array<{
    action: string;
    dueDate?: Date;
    completed: boolean;
  }>;
  
  /** Related resources shared during session */
  sharedResources?: Array<{
    type: string;
    url: string;
    title: string;
    sharedAt: Date;
  }>;
}