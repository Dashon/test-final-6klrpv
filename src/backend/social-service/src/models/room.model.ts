/**
 * @fileoverview MongoDB schema and model definition for chat rooms
 * @module social-service/models/room
 * @version 1.0.0
 */

import mongoose, { Schema, Model } from 'mongoose'; // v6.0.0
import { 
  IChatRoom, 
  RoomType, 
  RoomStatus, 
  ParticipantRole,
  IParticipant,
  IRoomSettings,
  MAX_ROOM_PARTICIPANTS,
  DEFAULT_RETENTION_PERIOD
} from '../interfaces/room.interface';

// Collection name constant
const ROOM_COLLECTION = 'rooms';

// Optimized indexes for common queries
const ROOM_INDEXES: mongoose.IndexDefinition[] = [
  { participants: 1 },
  { lastMessageAt: -1 },
  { 'metadata.travelPlanId': 1 },
  { createdAt: 1, type: 1 },
  { status: 1 },
  { 'participants.userId': 1, 'participants.role': 1 },
  { name: 1, type: 1 }
];

// Interface for room query options
interface FindRoomOptions {
  page?: number;
  limit?: number;
  type?: RoomType[];
  status?: RoomStatus[];
  includeMetadata?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Mongoose schema definition for chat room participants
 */
const ParticipantSchema = new Schema<IParticipant>({
  userId: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: Object.values(ParticipantRole),
    required: true 
  },
  joinedAt: { 
    type: Date, 
    default: Date.now 
  },
  lastReadAt: { 
    type: Date, 
    default: Date.now 
  }
}, { _id: false });

/**
 * Mongoose schema definition for room settings
 */
const RoomSettingsSchema = new Schema<IRoomSettings>({
  isPrivate: { 
    type: Boolean, 
    default: false 
  },
  allowAIPersonas: { 
    type: Boolean, 
    default: true 
  },
  maxParticipants: { 
    type: Number, 
    default: MAX_ROOM_PARTICIPANTS 
  },
  retentionPeriod: { 
    type: Number, 
    default: DEFAULT_RETENTION_PERIOD 
  },
  allowedFeatures: [{ 
    type: String 
  }]
}, { _id: false });

/**
 * Enhanced Mongoose schema for chat rooms with advanced features
 */
@Schema({ 
  timestamps: true, 
  collection: ROOM_COLLECTION,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})
class RoomSchema extends Schema<IChatRoom> {
  constructor() {
    super({
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
      },
      type: {
        type: String,
        enum: Object.values(RoomType),
        required: true,
        index: true
      },
      status: {
        type: String,
        enum: Object.values(RoomStatus),
        default: RoomStatus.ACTIVE,
        index: true
      },
      participants: {
        type: [ParticipantSchema],
        validate: [
          {
            validator: (participants: IParticipant[]) => participants.length <= MAX_ROOM_PARTICIPANTS,
            message: `Room cannot have more than ${MAX_ROOM_PARTICIPANTS} participants`
          }
        ]
      },
      settings: {
        type: RoomSettingsSchema,
        default: () => ({})
      },
      lastMessageAt: {
        type: Date,
        default: null
      },
      metadata: {
        type: Schema.Types.Mixed,
        default: {}
      }
    });

    // Add indexes for optimization
    ROOM_INDEXES.forEach(index => this.index(index));

    // Virtual for participant count
    this.virtual('participantCount').get(function() {
      return this.participants?.length || 0;
    });

    // Add hooks and methods
    this.pre('save', this.preSave);
    this.pre('remove', this.preRemove);
  }

  /**
   * Pre-save middleware for validation and data normalization
   */
  private async preSave(next: mongoose.CallbackWithoutResultAndOptionalError): Promise<void> {
    try {
      // Validate participant count
      if (this.participants?.length > this.settings.maxParticipants) {
        throw new Error(`Maximum participants (${this.settings.maxParticipants}) exceeded`);
      }

      // Ensure at least one owner for group rooms
      if (this.type === RoomType.GROUP) {
        const hasOwner = this.participants.some(p => p.role === ParticipantRole.OWNER);
        if (!hasOwner) {
          throw new Error('Group room must have at least one owner');
        }
      }

      // Validate direct message rooms
      if (this.type === RoomType.DIRECT) {
        if (this.participants.length !== 2) {
          throw new Error('Direct message rooms must have exactly 2 participants');
        }
      }

      // Update participant count in metadata
      this.metadata = {
        ...this.metadata,
        participantCount: this.participants.length
      };

      next();
    } catch (error) {
      next(error as Error);
    }
  }

  /**
   * Pre-remove middleware for cleanup
   */
  private async preRemove(next: mongoose.CallbackWithoutResultAndOptionalError): Promise<void> {
    try {
      // Perform any necessary cleanup before room deletion
      this.status = RoomStatus.DELETED;
      next();
    } catch (error) {
      next(error as Error);
    }
  }

  /**
   * Find active rooms with advanced filtering and pagination
   */
  static async findActiveRooms(options: FindRoomOptions = {}): Promise<IChatRoom[]> {
    const {
      page = 1,
      limit = 20,
      type,
      status = [RoomStatus.ACTIVE],
      includeMetadata = false,
      sortBy = 'lastMessageAt',
      sortOrder = 'desc'
    } = options;

    const query: any = {
      status: { $in: status }
    };

    if (type) {
      query.type = { $in: type };
    }

    const projection = includeMetadata ? {} : { metadata: 0 };

    return this.find(query)
      .select(projection)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  /**
   * Find rooms for a specific participant with role-based filtering
   */
  static async findRoomsByParticipant(
    userId: string,
    options: FindRoomOptions = {}
  ): Promise<IChatRoom[]> {
    const {
      page = 1,
      limit = 20,
      type,
      status = [RoomStatus.ACTIVE],
      sortBy = 'lastMessageAt',
      sortOrder = 'desc'
    } = options;

    const query: any = {
      status: { $in: status },
      'participants.userId': userId
    };

    if (type) {
      query.type = { $in: type };
    }

    return this.find(query)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
}

// Create and export the Mongoose model
const RoomModel = mongoose.model<IChatRoom, Model<IChatRoom>>('Room', RoomSchema);
export default RoomModel;