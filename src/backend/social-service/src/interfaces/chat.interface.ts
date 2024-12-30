/**
 * @fileoverview Chat interfaces for the social service supporting real-time communication
 * @module social-service/interfaces/chat
 * @version 1.0.0
 */

import { BaseEntity } from '../../../shared/interfaces/base.interface';

/**
 * Maximum length for a single chat message
 * Ensures reasonable message sizes for real-time delivery
 */
export const MAX_MESSAGE_LENGTH = 4000;

/**
 * Number of messages to fetch in a single batch
 * Optimizes pagination and initial load performance
 */
export const MESSAGE_BATCH_SIZE = 50;

/**
 * Enum defining supported message types in the chat system
 * Enables specialized handling for different content types
 */
export enum MessageType {
  /** Standard text message */
  TEXT = 'text',
  
  /** System-generated notification or alert */
  SYSTEM = 'system',
  
  /** Response from AI persona */
  AI_RESPONSE = 'ai_response',
  
  /** Travel planning specific content */
  TRAVEL_PLAN = 'travel_plan'
}

/**
 * Enum tracking message delivery and read status
 * Supports real-time delivery confirmation and read receipts
 */
export enum MessageStatus {
  /** Message sent to server */
  SENT = 'sent',
  
  /** Message delivered to recipient(s) */
  DELIVERED = 'delivered',
  
  /** Message read by recipient(s) */
  READ = 'read',
  
  /** Message delivery failed */
  FAILED = 'failed'
}

/**
 * Interface for structured message content
 * Supports rich content types with metadata
 */
export interface IMessageContent {
  /** Main message text */
  text: string;
  
  /** Additional metadata for specialized content types */
  metadata?: Record<string, any>;
}

/**
 * Comprehensive chat message interface
 * Extends BaseEntity for standard tracking fields
 */
export interface IChatMessage extends BaseEntity {
  /** ID of the chat room this message belongs to */
  roomId: string;
  
  /** ID of the message sender (user or AI persona) */
  senderId: string;
  
  /** Type of message for specialized handling */
  type: MessageType;
  
  /** Structured message content */
  content: IMessageContent;
  
  /** Current delivery/read status */
  status: MessageStatus;
  
  /** Array of user IDs who have read the message */
  readBy: string[];
  
  /** ID of the message this is replying to (for threading) */
  replyTo: string | null;
  
  /** Optional thread metadata for nested conversations */
  threadMetadata?: {
    /** ID of the root message in thread */
    rootMessageId: string;
    
    /** Count of replies in thread */
    replyCount: number;
    
    /** Last reply timestamp */
    lastReplyAt: Date;
    
    /** IDs of participants in thread */
    participants: string[];
  };
  
  /** Travel-specific metadata for travel plan messages */
  travelPlanMetadata?: {
    /** Associated travel plan ID */
    planId: string;
    
    /** Type of travel content */
    contentType: 'itinerary' | 'suggestion' | 'booking' | 'poll';
    
    /** Current status of travel item */
    status: 'draft' | 'proposed' | 'confirmed' | 'cancelled';
    
    /** User votes/responses for polls */
    responses?: Record<string, any>;
  };
  
  /** AI-specific metadata for AI responses */
  aiMetadata?: {
    /** ID of AI persona */
    personaId: string;
    
    /** Confidence score of response */
    confidence: number;
    
    /** Source references */
    sources?: string[];
    
    /** Alternative suggestions */
    alternatives?: IMessageContent[];
  };
}

/**
 * Interface for real-time typing indicators
 */
export interface ITypingIndicator {
  /** ID of chat room */
  roomId: string;
  
  /** ID of user who is typing */
  userId: string;
  
  /** Timestamp when typing started */
  startedAt: Date;
  
  /** Optional thread ID if typing in thread */
  threadId?: string;
}

/**
 * Interface for message delivery receipts
 */
export interface IDeliveryReceipt {
  /** ID of message */
  messageId: string;
  
  /** New status */
  status: MessageStatus;
  
  /** ID of user updating status */
  userId: string;
  
  /** Timestamp of status update */
  timestamp: Date;
}

/**
 * Interface for chat room presence
 */
export interface IPresenceInfo {
  /** ID of user */
  userId: string;
  
  /** Online status */
  status: 'online' | 'away' | 'offline';
  
  /** Last active timestamp */
  lastActiveAt: Date;
  
  /** Current active room ID */
  activeRoomId?: string;
}