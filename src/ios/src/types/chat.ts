/**
 * @fileoverview TypeScript type definitions for chat functionality in the iOS app
 * @version 1.0.0
 * @license MIT
 */

/**
 * Maximum length of a chat message in characters
 */
export const MAX_MESSAGE_LENGTH = 4000;

/**
 * Maximum number of participants allowed in a chat room
 */
export const MAX_ROOM_PARTICIPANTS = 50;

/**
 * Default message retention period in milliseconds (30 days)
 */
export const DEFAULT_RETENTION_PERIOD = 2592000000;

/**
 * Enumeration of supported message types in the chat system
 */
export enum MessageType {
    TEXT = 'TEXT',
    SYSTEM = 'SYSTEM',
    AI_RESPONSE = 'AI_RESPONSE',
    TRAVEL_PLAN = 'TRAVEL_PLAN'
}

/**
 * Enumeration of possible message delivery statuses
 */
export enum MessageStatus {
    SENT = 'SENT',
    DELIVERED = 'DELIVERED',
    READ = 'READ',
    FAILED = 'FAILED'
}

/**
 * Enumeration of supported chat room types
 */
export enum RoomType {
    DIRECT = 'DIRECT',
    GROUP = 'GROUP',
    TRAVEL_PLANNING = 'TRAVEL_PLANNING'
}

/**
 * Enumeration of possible chat room statuses
 */
export enum RoomStatus {
    ACTIVE = 'ACTIVE',
    ARCHIVED = 'ARCHIVED',
    DELETED = 'DELETED'
}

/**
 * Enumeration of participant roles in a chat room
 */
export enum ParticipantRole {
    OWNER = 'OWNER',
    ADMIN = 'ADMIN',
    MEMBER = 'MEMBER',
    AI_PERSONA = 'AI_PERSONA'
}

/**
 * Interface defining the structure of message content
 */
export interface MessageContent {
    /** The actual text content of the message */
    text: string;
    /** Additional metadata associated with the message */
    metadata: Record<string, any>;
}

/**
 * Interface defining the structure of a chat message
 */
export interface ChatMessage {
    /** Unique identifier for the message */
    id: string;
    /** ID of the room this message belongs to */
    roomId: string;
    /** ID of the user or AI persona who sent the message */
    senderId: string;
    /** Type of the message */
    type: MessageType;
    /** Content of the message */
    content: MessageContent;
    /** Current delivery status of the message */
    status: MessageStatus;
    /** Array of user IDs who have read the message */
    readBy: string[];
    /** ID of the message this is replying to, if any */
    replyTo: string | null;
    /** ISO timestamp of when the message was created */
    createdAt: string;
    /** ISO timestamp of when the message was last updated */
    updatedAt: string;
}

/**
 * Interface defining the structure of a room participant
 */
export interface Participant {
    /** ID of the participant user */
    userId: string;
    /** Role of the participant in the room */
    role: ParticipantRole;
    /** ISO timestamp of when the participant joined */
    joinedAt: string;
    /** ISO timestamp of when the participant last read messages */
    lastReadAt: string;
}

/**
 * Interface defining configurable settings for a chat room
 */
export interface RoomSettings {
    /** Whether the room is private or public */
    isPrivate: boolean;
    /** Whether AI personas are allowed in the room */
    allowAIPersonas: boolean;
    /** Maximum number of participants allowed */
    maxParticipants: number;
    /** Message retention period in milliseconds */
    retentionPeriod: number;
    /** Array of feature flags enabled for the room */
    allowedFeatures: string[];
}

/**
 * Interface defining the structure of a chat room
 */
export interface ChatRoom {
    /** Unique identifier for the room */
    id: string;
    /** Display name of the room */
    name: string;
    /** Type of the room */
    type: RoomType;
    /** Current status of the room */
    status: RoomStatus;
    /** Array of room participants */
    participants: Participant[];
    /** Room configuration settings */
    settings: RoomSettings;
    /** ISO timestamp of the last message in the room */
    lastMessageAt: string | null;
    /** Additional metadata associated with the room */
    metadata: Record<string, any>;
    /** ISO timestamp of when the room was created */
    createdAt: string;
    /** ISO timestamp of when the room was last updated */
    updatedAt: string;
}