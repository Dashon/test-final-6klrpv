/**
 * @fileoverview Chat room interfaces for the social service
 * @module social-service/interfaces/room
 * @version 1.0.0
 */

import { BaseEntity } from '../../../shared/interfaces/base.interface';

/**
 * Enum defining supported chat room types
 */
export enum RoomType {
  /** One-on-one chat between users or user and AI persona */
  DIRECT = 'direct',
  /** Multi-participant chat room */
  GROUP = 'group',
  /** Specialized room for collaborative travel planning */
  TRAVEL_PLANNING = 'travel_planning'
}

/**
 * Enum defining possible room statuses
 */
export enum RoomStatus {
  /** Room is currently active and accessible */
  ACTIVE = 'active',
  /** Room is archived but messages are preserved */
  ARCHIVED = 'archived',
  /** Room is marked for deletion */
  DELETED = 'deleted'
}

/**
 * Enum defining participant roles within a room
 */
export enum ParticipantRole {
  /** Room creator with full control */
  OWNER = 'owner',
  /** Participant with moderation capabilities */
  ADMIN = 'admin',
  /** Regular room participant */
  MEMBER = 'member',
  /** AI persona participant */
  AI_PERSONA = 'ai_persona'
}

/**
 * Interface defining a room participant
 */
export interface IParticipant {
  /** Unique identifier of the participant (user ID or AI persona ID) */
  userId: string;
  /** Participant's role in the room */
  role: ParticipantRole;
  /** Timestamp when participant joined the room */
  joinedAt: Date;
  /** Timestamp of participant's last message read */
  lastReadAt: Date;
}

/**
 * Interface defining configurable room settings
 */
export interface IRoomSettings {
  /** Whether the room is private (invite-only) */
  isPrivate: boolean;
  /** Whether AI personas are allowed to participate */
  allowAIPersonas: boolean;
  /** Maximum number of participants allowed */
  maxParticipants: number;
  /** Message retention period in milliseconds */
  retentionPeriod: number;
  /** List of enabled features for the room */
  allowedFeatures: string[];
}

/**
 * Main interface for chat rooms extending BaseEntity
 */
export interface IChatRoom extends BaseEntity {
  /** Room display name */
  name: string;
  /** Type of chat room */
  type: RoomType;
  /** Current room status */
  status: RoomStatus;
  /** List of room participants */
  participants: IParticipant[];
  /** Room configuration settings */
  settings: IRoomSettings;
  /** Timestamp of last message in room */
  lastMessageAt: Date | null;
  /** Additional room metadata */
  metadata: Record<string, any>;
}

/**
 * Global constants for room configuration
 */
export const MAX_ROOM_PARTICIPANTS: number = 50;
export const DEFAULT_RETENTION_PERIOD: number = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

/**
 * Type guard to check if a room is a travel planning room
 */
export const isTravelPlanningRoom = (room: IChatRoom): boolean => {
  return room.type === RoomType.TRAVEL_PLANNING;
};

/**
 * Type guard to check if a participant is an AI persona
 */
export const isAIPersona = (participant: IParticipant): boolean => {
  return participant.role === ParticipantRole.AI_PERSONA;
};