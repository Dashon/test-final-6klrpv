/**
 * @fileoverview MongoDB schema and model for chat messages with enhanced features
 * @module social-service/models/chat
 * @version 1.0.0
 */

import mongoose, { Schema, Model } from 'mongoose'; // v6.0.0
import { IChatMessage, MessageType, MessageStatus, MAX_MESSAGE_LENGTH } from '../interfaces/chat.interface';
import { logger } from '../../../shared/utils/logger.util';
import { ErrorCode } from '../../../shared/constants/error-codes';

// Collection configuration constants
const COLLECTION_NAME = 'messages';
const MAX_METADATA_SIZE = 16384; // 16KB limit for metadata
const MAX_THREAD_DEPTH = 50;
const MESSAGE_BATCH_SIZE = 50;

/**
 * MongoDB schema for chat messages with comprehensive tracking
 */
const MessageSchema = new Schema<IChatMessage>({
  roomId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },
  senderId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: Object.values(MessageType),
    required: true,
    index: true
  },
  content: {
    text: {
      type: String,
      required: true,
      maxlength: MAX_MESSAGE_LENGTH,
      trim: true
    },
    metadata: {
      type: Schema.Types.Mixed,
      validate: {
        validator: (v: any) => 
          JSON.stringify(v).length <= MAX_METADATA_SIZE,
        message: 'Metadata size exceeds maximum allowed size'
      }
    }
  },
  status: {
    type: String,
    enum: Object.values(MessageStatus),
    default: MessageStatus.SENT,
    index: true
  },
  readBy: [{
    userId: {
      type: Schema.Types.ObjectId,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  replyTo: {
    type: Schema.Types.ObjectId,
    sparse: true,
    index: true
  },
  threadMetadata: {
    rootMessageId: Schema.Types.ObjectId,
    replyCount: {
      type: Number,
      default: 0
    },
    lastReplyAt: Date,
    participants: [Schema.Types.ObjectId]
  },
  travelPlanMetadata: {
    planId: String,
    contentType: {
      type: String,
      enum: ['itinerary', 'suggestion', 'booking', 'poll']
    },
    status: {
      type: String,
      enum: ['draft', 'proposed', 'confirmed', 'cancelled']
    },
    responses: Schema.Types.Mixed
  },
  aiMetadata: {
    personaId: String,
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    sources: [String],
    alternatives: [{
      text: String,
      metadata: Schema.Types.Mixed
    }]
  }
}, {
  timestamps: true,
  collection: COLLECTION_NAME,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indices for optimized queries
MessageSchema.index({ roomId: 1, createdAt: -1 });
MessageSchema.index({ roomId: 1, type: 1, createdAt: -1 });
MessageSchema.index({ 'threadMetadata.rootMessageId': 1, createdAt: 1 });

/**
 * Pre-save middleware for message validation and processing
 */
MessageSchema.pre('save', async function(next) {
  try {
    // Validate message content length
    if (this.content.text.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`);
    }

    // Validate thread depth
    if (this.replyTo) {
      let depth = 0;
      let currentMsg = await this.model(COLLECTION_NAME).findById(this.replyTo);
      while (currentMsg?.replyTo && depth < MAX_THREAD_DEPTH) {
        currentMsg = await this.model(COLLECTION_NAME).findById(currentMsg.replyTo);
        depth++;
      }
      if (depth >= MAX_THREAD_DEPTH) {
        throw new Error(`Thread depth exceeds maximum of ${MAX_THREAD_DEPTH}`);
      }
    }

    // Initialize readBy array if not present
    if (!this.readBy) {
      this.readBy = [];
    }

    // Set default status if not provided
    if (!this.status) {
      this.status = MessageStatus.SENT;
    }

    next();
  } catch (error) {
    logger.error('Pre-save message validation failed', error as Error, {
      component: 'chat.model',
      messageId: this._id,
      errorCode: ErrorCode.VALIDATION_ERROR
    });
    next(error as Error);
  }
});

/**
 * Method to mark message as read with delivery tracking
 */
MessageSchema.methods.markAsRead = async function(userId: string): Promise<boolean> {
  try {
    // Check if user has already read the message
    if (this.readBy.some(read => read.userId.toString() === userId)) {
      return true;
    }

    // Add user to readBy array with timestamp
    this.readBy.push({
      userId: new mongoose.Types.ObjectId(userId),
      timestamp: new Date()
    });

    // Update message status if all participants have read
    if (this.threadMetadata?.participants?.length === this.readBy.length) {
      this.status = MessageStatus.READ;
    }

    await this.save();
    return true;
  } catch (error) {
    logger.error('Failed to mark message as read', error as Error, {
      component: 'chat.model',
      messageId: this._id,
      userId,
      errorCode: ErrorCode.DATABASE_ERROR
    });
    return false;
  }
};

/**
 * Static method to find messages by room with pagination
 */
MessageSchema.statics.findByRoom = async function(
  roomId: string,
  page: number = 1,
  limit: number = MESSAGE_BATCH_SIZE
): Promise<IChatMessage[]> {
  return this.find({ roomId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .exec();
};

/**
 * Static method to find messages in a thread
 */
MessageSchema.statics.findByThread = async function(
  rootMessageId: string,
  page: number = 1,
  limit: number = MESSAGE_BATCH_SIZE
): Promise<IChatMessage[]> {
  return this.find({
    'threadMetadata.rootMessageId': rootMessageId
  })
    .sort({ createdAt: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .exec();
};

/**
 * Custom JSON serialization
 */
MessageSchema.methods.toJSON = function() {
  const obj = this.toObject();
  
  // Convert ObjectIds to strings
  obj.id = obj._id.toString();
  obj.roomId = obj.roomId.toString();
  obj.senderId = obj.senderId.toString();
  if (obj.replyTo) obj.replyTo = obj.replyTo.toString();
  
  // Format dates
  obj.createdAt = obj.createdAt.toISOString();
  obj.updatedAt = obj.updatedAt.toISOString();
  
  // Remove internal fields
  delete obj._id;
  delete obj.__v;
  
  return obj;
};

// Create and export the Message model
export const Message: Model<IChatMessage> = mongoose.model<IChatMessage>(
  'Message',
  MessageSchema
);