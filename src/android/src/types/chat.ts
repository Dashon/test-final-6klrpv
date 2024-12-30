/**
 * @fileoverview TypeScript definitions for chat functionality in the Android mobile app
 * Supports real-time communication, offline capabilities, and travel-specific features
 * @version 1.0.0
 */

// Global constants for chat configuration
export const MAX_MESSAGE_LENGTH = 4000;
export const MESSAGE_BATCH_SIZE = 50;
export const MAX_ROOM_PARTICIPANTS = 50;
export const DEFAULT_RETENTION_PERIOD = 2592000000; // 30 days in milliseconds
export const OFFLINE_SYNC_INTERVAL = 300000; // 5 minutes in milliseconds
export const MAX_ATTACHMENT_SIZE = 10485760; // 10MB in bytes

/**
 * Defines the types of messages supported in the chat system
 * Includes travel-specific message types for enhanced collaboration
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
 * Supports offline scenarios with pending state
 */
export enum MessageStatus {
    SENT = 'sent',
    DELIVERED = 'delivered',
    READ = 'read',
    FAILED = 'failed',
    PENDING = 'pending'
}

/**
 * Defines different types of chat rooms including specialized travel planning rooms
 */
export enum RoomType {
    DIRECT = 'direct',
    GROUP = 'group',
    TRAVEL_PLANNING = 'travel_planning',
    AI_CONSULTATION = 'ai_consultation'
}

/**
 * Tracks the status of chat rooms with travel-specific states
 */
export enum RoomStatus {
    ACTIVE = 'active',
    ARCHIVED = 'archived',
    DELETED = 'deleted',
    PLANNING_COMPLETE = 'planning_complete'
}

/**
 * Defines roles for room participants including AI and expert roles
 */
export enum ParticipantRole {
    OWNER = 'owner',
    ADMIN = 'admin',
    MEMBER = 'member',
    AI_PERSONA = 'ai_persona',
    TRAVEL_EXPERT = 'travel_expert'
}

/**
 * Structure for message content with support for rich media and metadata
 */
export interface MessageContent {
    text: string;
    metadata: Record<string, any>;
    attachments: Array<{
        type: string;
        url: string;
        metadata: Record<string, any>;
    }>;
}

/**
 * Main chat message interface with offline support and local message handling
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
    createdAt: string;
    updatedAt: string;
    localId: string;
    offline: boolean;
}

/**
 * Structure for room participants with enhanced permissions system
 */
export interface Participant {
    userId: string;
    role: ParticipantRole;
    joinedAt: string;
    lastReadAt: string;
    permissions: string[];
    metadata: Record<string, any>;
}

/**
 * Configurable settings for chat rooms with security and offline features
 */
export interface RoomSettings {
    isPrivate: boolean;
    allowAIPersonas: boolean;
    maxParticipants: number;
    retentionPeriod: number;
    allowedFeatures: string[];
    encryptionEnabled: boolean;
    offlineSupport: boolean;
}

/**
 * Main chat room interface with enhanced offline and sync support
 */
export interface ChatRoom {
    id: string;
    name: string;
    type: RoomType;
    status: RoomStatus;
    participants: Participant[];
    settings: RoomSettings;
    lastMessageAt: string | null;
    metadata: Record<string, any>;
    createdAt: string;
    updatedAt: string;
    unreadCount: number;
    lastSyncedAt: string;
}