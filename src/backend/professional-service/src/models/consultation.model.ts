/**
 * @fileoverview TypeORM entity model for professional consultations with comprehensive tracking
 * @module professional-service/models/consultation
 * @version 1.0.0
 */

import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn,
  Index
} from 'typeorm'; // v0.3.x

import { 
  IConsultation,
  ConsultationType,
  ConsultationStatus,
  ConsultationPayment,
  ConsultationFeedback
} from '../interfaces/consultation.interface';

/**
 * TypeORM entity model for professional consultations
 * Implements comprehensive tracking for video/chat sessions with enhanced analytics
 */
@Entity('consultations')
@Index(['userId', 'professionalId'], { unique: false })
@Index(['scheduledStartTime', 'status'], { unique: false })
@Index(['payment.status'], { unique: false })
export class ConsultationModel implements IConsultation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @Column('uuid')
  @Index()
  professionalId: string;

  @Column('uuid', { nullable: true })
  agentId?: string;

  @Column({
    type: 'enum',
    enum: ConsultationType,
    default: ConsultationType.VIDEO
  })
  type: ConsultationType;

  @Column({
    type: 'enum',
    enum: ConsultationStatus,
    default: ConsultationStatus.SCHEDULED
  })
  status: ConsultationStatus;

  @Column('timestamp with time zone')
  scheduledStartTime: Date;

  @Column('timestamp with time zone')
  scheduledEndTime: Date;

  @Column('timestamp with time zone', { nullable: true })
  actualStartTime?: Date;

  @Column('timestamp with time zone', { nullable: true })
  actualEndTime?: Date;

  @Column('jsonb')
  payment: ConsultationPayment;

  @Column('jsonb', { nullable: true })
  feedback?: ConsultationFeedback;

  @Column({ nullable: true })
  meetingUrl?: string;

  @Column('text', { nullable: true })
  notes?: string;

  @Column('text', { nullable: true })
  cancellationReason?: string;

  @Column({ nullable: true })
  recordingUrl?: string;

  @Column('int', { default: 0 })
  participantCount: number;

  @Column('int', { default: 0 })
  duration: number;

  @Column('text', { nullable: true })
  topic?: string;

  @Column('jsonb', { nullable: true })
  preConsultationData?: Record<string, unknown>;

  @Column('jsonb', { nullable: true })
  technicalIssues?: Array<{
    type: string;
    timestamp: Date;
    description: string;
  }>;

  @Column('jsonb', { nullable: true })
  followUpActions?: Array<{
    action: string;
    dueDate?: Date;
    completed: boolean;
  }>;

  @Column('jsonb', { nullable: true })
  sharedResources?: Array<{
    type: string;
    url: string;
    title: string;
    sharedAt: Date;
  }>;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  /**
   * Converts consultation model to JSON representation with sensitive data handling
   * @returns Sanitized JSON representation of consultation
   */
  toJSON(): Record<string, unknown> {
    const consultation = { ...this };
    
    // Convert dates to ISO strings
    const dateFields = [
      'scheduledStartTime', 
      'scheduledEndTime', 
      'actualStartTime', 
      'actualEndTime',
      'createdAt',
      'updatedAt'
    ];
    
    dateFields.forEach(field => {
      if (consultation[field]) {
        consultation[field] = consultation[field].toISOString();
      }
    });

    // Mask sensitive payment data
    if (consultation.payment) {
      consultation.payment = {
        ...consultation.payment,
        transactionId: `****${consultation.payment.transactionId.slice(-4)}`
      };
    }

    // Include calculated metrics
    consultation.metrics = this.calculateMetrics();

    return consultation;
  }

  /**
   * Calculates consultation metrics for analytics
   * @returns Consultation metrics including duration, cost, and satisfaction scores
   */
  private calculateMetrics(): Record<string, unknown> {
    const metrics = {
      duration: this.duration,
      cost: this.payment.amount,
      satisfactionScore: 0,
      responseTime: 0,
      completionRate: 0
    };

    // Calculate satisfaction score if feedback exists
    if (this.feedback) {
      metrics.satisfactionScore = this.feedback.rating;
      if (this.feedback.aspectRatings) {
        metrics.satisfactionScore = (
          this.feedback.aspectRatings.knowledge +
          this.feedback.aspectRatings.communication +
          this.feedback.aspectRatings.helpfulness +
          this.feedback.aspectRatings.professionalism
        ) / 4;
      }
    }

    // Calculate response time if consultation is completed
    if (this.actualStartTime && this.scheduledStartTime) {
      metrics.responseTime = 
        (this.actualStartTime.getTime() - this.scheduledStartTime.getTime()) / 1000;
    }

    // Calculate completion rate based on follow-up actions
    if (this.followUpActions && this.followUpActions.length > 0) {
      const completed = this.followUpActions.filter(action => action.completed).length;
      metrics.completionRate = (completed / this.followUpActions.length) * 100;
    }

    return metrics;
  }
}