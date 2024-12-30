/**
 * @fileoverview Core TypeScript definitions for chat functionality including message types,
 * room management, and participant interactions with support for AI personas and travel planning.
 * @version 1.0.0
 */

/**
 * Defines the different types of messages supported in the chat system
 */
export enum MessageType {
  TEXT = 'text',
  SYSTEM = 'system',
  AI_RESPONSE = 'ai_response',
  TRAVEL_PLAN = 'travel_plan',
  BOOKING_UPDATE = 'booking_update',
  ITINERARY_SHARE = 'itinerary_share'
}

/**
 * Tracks the delivery and read status of messages
 */
export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  PENDING = 'pending'
}

/**
 * Defines the types of chat rooms available in the system
 */
export enum RoomType {
  DIRECT = 'direct',
  GROUP = 'group',
  TRAVEL_PLANNING = 'travel_planning',
  CONSULTATION = 'consultation'
}

/**
 * Tracks the current status of chat rooms
 */
export enum RoomStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
  SCHEDULED = 'scheduled'
}

/**
 * Defines the roles available for room participants
 */
export enum ParticipantRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  AI_PERSONA = 'ai_persona',
  PROFESSIONAL = 'professional'
}

/**
 * System-wide constants for chat functionality
 */
export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_ROOM_PARTICIPANTS = 50;
export const MAX_AI_PERSONAS_PER_ROOM = 5;
export const DEFAULT_MESSAGE_RETENTION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

/**
 * Represents an attachment in a message
 */
interface Attachment {
  id: string;
  type: string;
  url: string;
  name: string;
  size: number;
  metadata?: Record<string, any>;
}

/**
 * Represents travel-specific data in messages
 */
interface TravelPlanData {
  planId: string;
  destination?: string;
  dates?: {
    start: Date;
    end: Date;
  };
  activities?: Array<{
    id: string;
    type: string;
    details: Record<string, any>;
  }>;
  participants?: string[];
}

/**
 * Represents AI-specific context data for messages
 */
interface AIContextData {
  personaId: string;
  confidence: number;
  context: Record<string, any>;
  modelVersion: string;
}

/**
 * Represents AI persona-specific data
 */
interface AIPersonaData {
  personaId: string;
  type: string;
  capabilities: string[];
  learningModel: string;
  confidenceThreshold: number;
}

/**
 * Represents AI-specific room settings
 */
interface AIRoomSettings {
  enabledPersonas: string[];
  learningEnabled: boolean;
  contextRetention: number;
  confidenceThreshold: number;
}

/**
 * Represents travel planning specific room settings
 */
interface TravelPlanningSettings {
  destination?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  budget?: {
    min: number;
    max: number;
    currency: string;
  };
  preferences: Record<string, any>;
}

/**
 * Defines the structure for message content
 */
export interface MessageContent {
  text: string;
  metadata: Record<string, any>;
  attachments: Array<Attachment>;
  travelData: TravelPlanData | null;
}

/**
 * Main interface for chat messages
 */
export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  type: MessageType;
  content: MessageContent;
  status: MessageStatus;
  readBy: string[];
  replyTo: string | null;
  aiContext: AIContextData | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents a participant in a chat room
 */
export interface Participant {
  userId: string;
  role: ParticipantRole;
  joinedAt: Date;
  lastReadAt: Date;
  permissions: string[];
  aiPersonaData: AIPersonaData | null;
}

/**
 * Defines settings available for chat rooms
 */
export interface RoomSettings {
  isPrivate: boolean;
  allowAIPersonas: boolean;
  maxParticipants: number;
  retentionPeriod: number;
  allowedFeatures: string[];
  aiSettings: AIRoomSettings;
  travelPlanningSettings: TravelPlanningSettings;
}

/**
 * Main interface for chat rooms
 */
export interface ChatRoom {
  id: string;
  name: string;
  type: RoomType;
  status: RoomStatus;
  participants: Participant[];
  settings: RoomSettings;
  lastMessageAt: Date | null;
  metadata: Record<string, any>;
  travelPlanId: string | null;
  scheduledFor: Date | null;
  createdAt: Date;
  updatedAt: Date;
}