/**
 * Chat Redux Slice
 * Version: 1.0.0
 * 
 * Enterprise-grade Redux slice for managing chat state with support for:
 * - Real-time messaging with <200ms latency
 * - Offline message queueing
 * - AI persona interactions
 * - Performance optimizations
 * - Enhanced error handling
 */

import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.x
import { debounce } from 'lodash'; // ^4.17.x

import {
  ChatMessage,
  ChatRoom,
  MessageType,
  MessageStatus,
  RoomType,
  Participant,
  AIPersonaState,
  ConnectionQuality
} from '../../types/chat';
import { ChatService } from '../../services/chat';

// Constants for chat operations
const RETRY_ATTEMPTS = 3;
const LATENCY_THRESHOLD = 200;
const MESSAGE_BATCH_SIZE = 50;

// Interface for chat state
interface ChatState {
  rooms: Record<string, ChatRoom>;
  messages: Record<string, ChatMessage[]>;
  messageQueue: ChatMessage[];
  activeRoomId: string | null;
  connectionQuality: ConnectionQuality;
  aiPersonaStates: Record<string, AIPersonaState>;
  loading: boolean;
  error: string | null;
}

// Initial state
const INITIAL_STATE: ChatState = {
  rooms: {},
  messages: {},
  messageQueue: [],
  activeRoomId: null,
  connectionQuality: 'optimal',
  aiPersonaStates: {},
  loading: false,
  error: null
};

// Async thunks for chat operations
export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ content, roomId, aiPersonaId }: {
    content: string,
    roomId: string,
    aiPersonaId?: string
  }, { rejectWithValue }) => {
    try {
      const chatService = new ChatService();
      const message = await chatService.sendMessage(
        { text: content, metadata: {}, attachments: [], travelData: null },
        roomId,
        aiPersonaId ? { id: aiPersonaId } : undefined
      );
      return message;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const createRoom = createAsyncThunk(
  'chat/createRoom',
  async ({ name, type, participants }: {
    name: string,
    type: RoomType,
    participants: string[]
  }, { rejectWithValue }) => {
    try {
      const chatService = new ChatService();
      const room = await chatService.createRoom({ name, type, participants });
      return room;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const retryQueuedMessages = createAsyncThunk(
  'chat/retryQueuedMessages',
  async (_, { getState, dispatch }) => {
    const state = getState() as { chat: ChatState };
    const messages = [...state.chat.messageQueue];
    
    for (const message of messages) {
      try {
        await dispatch(sendMessage({
          content: message.content.text,
          roomId: message.roomId,
          aiPersonaId: message.aiContext?.personaId
        }));
      } catch (error) {
        console.error('Failed to retry message:', error);
      }
    }
  }
);

// Create the chat slice
const chatSlice = createSlice({
  name: 'chat',
  initialState: INITIAL_STATE,
  reducers: {
    setActiveRoom: (state, action: PayloadAction<string>) => {
      state.activeRoomId = action.payload;
    },
    updateConnectionQuality: (state, action: PayloadAction<ConnectionQuality>) => {
      state.connectionQuality = action.payload;
    },
    addMessageToQueue: (state, action: PayloadAction<ChatMessage>) => {
      state.messageQueue.push(action.payload);
    },
    removeMessageFromQueue: (state, action: PayloadAction<string>) => {
      state.messageQueue = state.messageQueue.filter(msg => msg.id !== action.payload);
    },
    updateAIPersonaState: (state, action: PayloadAction<{ 
      personaId: string, 
      state: AIPersonaState 
    }>) => {
      state.aiPersonaStates[action.payload.personaId] = action.payload.state;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Send Message
      .addCase(sendMessage.pending, (state) => {
        state.loading = true;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading = false;
        const { roomId } = action.payload;
        if (!state.messages[roomId]) {
          state.messages[roomId] = [];
        }
        state.messages[roomId].push(action.payload);
        state.rooms[roomId].lastMessageAt = new Date();
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create Room
      .addCase(createRoom.pending, (state) => {
        state.loading = true;
      })
      .addCase(createRoom.fulfilled, (state, action) => {
        state.loading = false;
        state.rooms[action.payload.id] = action.payload;
        state.messages[action.payload.id] = [];
      })
      .addCase(createRoom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Retry Queued Messages
      .addCase(retryQueuedMessages.fulfilled, (state) => {
        state.messageQueue = [];
      });
  }
});

// Export actions
export const {
  setActiveRoom,
  updateConnectionQuality,
  addMessageToQueue,
  removeMessageFromQueue,
  updateAIPersonaState,
  clearError
} = chatSlice.actions;

// Memoized selectors
export const selectActiveRoom = createSelector(
  [(state: { chat: ChatState }) => state.chat.rooms, 
   (state: { chat: ChatState }) => state.chat.activeRoomId],
  (rooms, activeRoomId) => activeRoomId ? rooms[activeRoomId] : null
);

export const selectRoomMessages = createSelector(
  [(state: { chat: ChatState }) => state.chat.messages,
   (_: any, roomId: string) => roomId],
  (messages, roomId) => messages[roomId] || []
);

export const selectConnectionQuality = (state: { chat: ChatState }) => 
  state.chat.connectionQuality;

export const selectMessageQueue = (state: { chat: ChatState }) => 
  state.chat.messageQueue;

export const selectAIPersonaState = createSelector(
  [(state: { chat: ChatState }) => state.chat.aiPersonaStates,
   (_: any, personaId: string) => personaId],
  (states, personaId) => states[personaId]
);

// Export reducer
export default chatSlice.reducer;