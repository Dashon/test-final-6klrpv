/**
 * @fileoverview Redux slice for chat state management in Android mobile app
 * Implements real-time messaging, offline support, and AI persona integration
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import { ChatMessage, ChatRoom, MessageType, MessageStatus } from '../../types/chat';
import { ChatService } from '../../services/chat';
import { ErrorCode } from '../../../../backend/shared/constants/error-codes';
import { config } from '../../config/development';

// Constants for chat state management
const SYNC_INTERVAL = config.CHAT_CONFIG.RECONNECT_INTERVAL;
const MAX_RETRY_ATTEMPTS = config.API_CONFIG.RETRY_ATTEMPTS;

/**
 * Interface for managing message sync status
 */
interface MessageSyncState {
  lastSync: number | null;
  isSyncing: boolean;
  pendingSync: string[];
}

/**
 * Interface for tracking typing indicators
 */
interface TypingIndicator {
  userId: string;
  timestamp: number;
}

/**
 * Interface for participant presence tracking
 */
interface ParticipantPresence {
  isOnline: boolean;
  lastSeen: number;
}

/**
 * Interface for AI persona state tracking
 */
interface AIPersonaState {
  isResponding: boolean;
  lastResponse: number;
  context: Record<string, unknown>;
}

/**
 * Main chat state interface
 */
interface ChatState {
  rooms: Record<string, ChatRoom>;
  messages: Record<string, ChatMessage[]>;
  messageQueue: ChatMessage[];
  activeRoomId: string | null;
  loading: boolean;
  error: string | null;
  typingUsers: Record<string, TypingIndicator>;
  participantPresence: Record<string, ParticipantPresence>;
  aiPersonaStates: Record<string, AIPersonaState>;
  syncStatus: MessageSyncState;
}

// Initial state
const initialState: ChatState = {
  rooms: {},
  messages: {},
  messageQueue: [],
  activeRoomId: null,
  loading: false,
  error: null,
  typingUsers: {},
  participantPresence: {},
  aiPersonaStates: {},
  syncStatus: {
    lastSync: null,
    isSyncing: false,
    pendingSync: []
  }
};

/**
 * Async thunk for sending messages with offline support
 */
export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (
    { content, roomId }: { content: string; roomId: string },
    { rejectWithValue }
  ) => {
    try {
      const chatService = new ChatService();
      const message = await chatService.sendMessage(roomId, {
        text: content,
        metadata: {},
        attachments: []
      }, MessageType.TEXT);
      return message;
    } catch (error) {
      return rejectWithValue({
        code: ErrorCode.NETWORK_ERROR,
        message: 'Failed to send message'
      });
    }
  }
);

/**
 * Async thunk for syncing offline messages
 */
export const syncOfflineMessages = createAsyncThunk(
  'chat/syncOfflineMessages',
  async (_, { getState, dispatch }) => {
    const chatService = new ChatService();
    await chatService.syncOfflineMessages();
  }
);

/**
 * Chat slice with reducers and actions
 */
const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveRoom(state, action: PayloadAction<string>) {
      state.activeRoomId = action.payload;
    },

    addMessage(state, action: PayloadAction<ChatMessage>) {
      const { roomId } = action.payload;
      if (!state.messages[roomId]) {
        state.messages[roomId] = [];
      }
      state.messages[roomId].push(action.payload);
    },

    updateMessageStatus(
      state,
      action: PayloadAction<{ messageId: string; status: MessageStatus }>
    ) {
      const { messageId, status } = action.payload;
      Object.values(state.messages).forEach(messages => {
        const message = messages.find(m => m.id === messageId);
        if (message) {
          message.status = status;
        }
      });
    },

    setTypingIndicator(
      state,
      action: PayloadAction<{ roomId: string; userId: string }>
    ) {
      const { roomId, userId } = action.payload;
      state.typingUsers[`${roomId}-${userId}`] = {
        userId,
        timestamp: Date.now()
      };
    },

    clearTypingIndicator(
      state,
      action: PayloadAction<{ roomId: string; userId: string }>
    ) {
      const { roomId, userId } = action.payload;
      delete state.typingUsers[`${roomId}-${userId}`];
    },

    updateParticipantPresence(
      state,
      action: PayloadAction<{ userId: string; isOnline: boolean }>
    ) {
      const { userId, isOnline } = action.payload;
      state.participantPresence[userId] = {
        isOnline,
        lastSeen: Date.now()
      };
    },

    updateAIPersonaState(
      state,
      action: PayloadAction<{ personaId: string; state: Partial<AIPersonaState> }>
    ) {
      const { personaId, state: personaState } = action.payload;
      state.aiPersonaStates[personaId] = {
        ...state.aiPersonaStates[personaId],
        ...personaState
      };
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading = false;
        const message = action.payload;
        if (!state.messages[message.roomId]) {
          state.messages[message.roomId] = [];
        }
        state.messages[message.roomId].push(message);
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        // Queue message for retry if offline
        if (action.payload === ErrorCode.NETWORK_ERROR) {
          state.messageQueue.push(action.meta.arg as ChatMessage);
        }
      })
      .addCase(syncOfflineMessages.pending, (state) => {
        state.syncStatus.isSyncing = true;
      })
      .addCase(syncOfflineMessages.fulfilled, (state) => {
        state.syncStatus.isSyncing = false;
        state.syncStatus.lastSync = Date.now();
        state.messageQueue = [];
      })
      .addCase(syncOfflineMessages.rejected, (state) => {
        state.syncStatus.isSyncing = false;
      });
  }
});

// Export actions and reducer
export const {
  setActiveRoom,
  addMessage,
  updateMessageStatus,
  setTypingIndicator,
  clearTypingIndicator,
  updateParticipantPresence,
  updateAIPersonaState
} = chatSlice.actions;

export default chatSlice.reducer;

// Selectors
export const selectActiveRoom = (state: { chat: ChatState }) =>
  state.chat.activeRoomId ? state.chat.rooms[state.chat.activeRoomId] : null;

export const selectRoomMessages = (state: { chat: ChatState }, roomId: string) =>
  state.chat.messages[roomId] || [];

export const selectTypingUsers = (state: { chat: ChatState }, roomId: string) =>
  Object.values(state.chat.typingUsers).filter(
    (indicator) => indicator.timestamp > Date.now() - config.CHAT_CONFIG.TYPING_TIMEOUT
  );

export const selectParticipantPresence = (state: { chat: ChatState }, userId: string) =>
  state.chat.participantPresence[userId];

export const selectAIPersonaState = (state: { chat: ChatState }, personaId: string) =>
  state.chat.aiPersonaStates[personaId];