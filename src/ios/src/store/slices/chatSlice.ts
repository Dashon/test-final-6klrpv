/**
 * Chat Redux Slice
 * @version 1.0.0
 * 
 * Manages chat state including real-time messaging, room management,
 * offline support, and optimistic updates for the iOS application.
 */

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'; // ^1.9.5
import { 
  ChatMessage, 
  ChatRoom, 
  MessageContent, 
  MessageStatus, 
  MessageType,
  RoomType,
  ParticipantRole
} from '../../types/chat';
import { ChatService, chatService } from '../../services/chat';
import { FEATURE_FLAGS } from '../../config/development';

// Interfaces for normalized state
interface NormalizedMessages {
  byId: Record<string, ChatMessage>;
  allIds: string[];
}

interface NormalizedRooms {
  byId: Record<string, ChatRoom>;
  allIds: string[];
}

interface PaginationState {
  currentPage: number;
  hasMore: boolean;
  loading: boolean;
}

interface ErrorState {
  code: string;
  message: string;
}

// Chat slice state interface
interface ChatState {
  activeRoomId: string | null;
  messages: Record<string, NormalizedMessages>;
  messageQueue: ChatMessage[];
  rooms: NormalizedRooms;
  loading: boolean;
  error: ErrorState | null;
  pagination: Record<string, PaginationState>;
  offline: boolean;
}

// Initial state
const initialState: ChatState = {
  activeRoomId: null,
  messages: {},
  messageQueue: [],
  rooms: {
    byId: {},
    allIds: []
  },
  loading: false,
  error: null,
  pagination: {},
  offline: false
};

// Async thunks
export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ content, roomId }: { content: MessageContent; roomId: string }, { dispatch, getState }) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      roomId,
      senderId: 'local-user', // Will be replaced by actual user ID
      type: MessageType.TEXT,
      content,
      status: MessageStatus.SENT,
      readBy: [],
      replyTo: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Optimistic update
    dispatch(chatSlice.actions.addMessage(optimisticMessage));

    try {
      const sentMessage = await chatService.sendMessage(roomId, content);
      dispatch(chatSlice.actions.updateMessageStatus({
        messageId: tempId,
        actualId: sentMessage.id,
        status: MessageStatus.DELIVERED
      }));
      return sentMessage;
    } catch (error) {
      dispatch(chatSlice.actions.updateMessageStatus({
        messageId: tempId,
        status: MessageStatus.FAILED
      }));
      throw error;
    }
  }
);

export const loadMessages = createAsyncThunk(
  'chat/loadMessages',
  async ({ 
    roomId, 
    options = { page: 1, limit: 50 } 
  }: { 
    roomId: string; 
    options?: { page: number; limit: number; } 
  }, { dispatch }) => {
    dispatch(chatSlice.actions.setLoading(true));
    try {
      const messages = await chatService.getRoomMessages(roomId, options);
      return { roomId, messages, page: options.page };
    } catch (error) {
      throw error;
    } finally {
      dispatch(chatSlice.actions.setLoading(false));
    }
  }
);

// Chat slice
const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveRoom: (state, action: PayloadAction<string>) => {
      state.activeRoomId = action.payload;
    },

    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      const { roomId, id } = action.payload;
      
      // Initialize room messages if not exists
      if (!state.messages[roomId]) {
        state.messages[roomId] = { byId: {}, allIds: [] };
      }

      // Add message to normalized state
      state.messages[roomId].byId[id] = action.payload;
      if (!state.messages[roomId].allIds.includes(id)) {
        state.messages[roomId].allIds.push(id);
      }
    },

    updateMessageStatus: (state, action: PayloadAction<{
      messageId: string;
      actualId?: string;
      status: MessageStatus;
    }>) => {
      const { messageId, actualId, status } = action.payload;
      
      // Find message in all rooms
      Object.values(state.messages).forEach(roomMessages => {
        if (roomMessages.byId[messageId]) {
          if (actualId) {
            // Replace temporary ID with actual ID
            const message = roomMessages.byId[messageId];
            delete roomMessages.byId[messageId];
            roomMessages.byId[actualId] = { ...message, id: actualId, status };
            const idIndex = roomMessages.allIds.indexOf(messageId);
            if (idIndex !== -1) {
              roomMessages.allIds[idIndex] = actualId;
            }
          } else {
            roomMessages.byId[messageId].status = status;
          }
        }
      });
    },

    setTypingStatus: (state, action: PayloadAction<{
      roomId: string;
      userId: string;
      isTyping: boolean;
    }>) => {
      const { roomId, userId, isTyping } = action.payload;
      const room = state.rooms.byId[roomId];
      if (room) {
        const typingUsers = new Set(room.participants
          .filter(p => p.role !== ParticipantRole.AI_PERSONA)
          .map(p => p.userId));
        
        if (isTyping) {
          typingUsers.add(userId);
        } else {
          typingUsers.delete(userId);
        }
        
        room.participants = room.participants.map(p => ({
          ...p,
          isTyping: typingUsers.has(p.userId)
        }));
      }
    },

    updateReadStatus: (state, action: PayloadAction<{
      roomId: string;
      userId: string;
      messageId: string;
    }>) => {
      const { roomId, userId, messageId } = action.payload;
      const message = state.messages[roomId]?.byId[messageId];
      if (message && !message.readBy.includes(userId)) {
        message.readBy.push(userId);
      }
    },

    setOfflineStatus: (state, action: PayloadAction<boolean>) => {
      state.offline = action.payload;
      if (FEATURE_FLAGS.ENABLE_NETWORK_LOGGING) {
        console.log(`Chat offline status: ${action.payload}`);
      }
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    setError: (state, action: PayloadAction<ErrorState | null>) => {
      state.error = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMessages.fulfilled, (state, action) => {
        const { roomId, messages, page } = action.payload;
        
        // Initialize room messages if not exists
        if (!state.messages[roomId]) {
          state.messages[roomId] = { byId: {}, allIds: [] };
        }

        // Update pagination state
        state.pagination[roomId] = {
          currentPage: page,
          hasMore: messages.length > 0,
          loading: false
        };

        // Normalize and merge messages
        messages.forEach(message => {
          state.messages[roomId].byId[message.id] = message;
          if (!state.messages[roomId].allIds.includes(message.id)) {
            state.messages[roomId].allIds.push(message.id);
          }
        });
      })
      .addCase(loadMessages.rejected, (state, action) => {
        state.error = {
          code: 'LOAD_MESSAGES_ERROR',
          message: action.error.message || 'Failed to load messages'
        };
      });
  }
});

// Export actions and reducer
export const chatActions = chatSlice.actions;
export default chatSlice.reducer;

// Selectors
export const selectActiveRoom = (state: { chat: ChatState }) => 
  state.chat.activeRoomId ? state.chat.rooms.byId[state.chat.activeRoomId] : null;

export const selectRoomMessages = (state: { chat: ChatState }, roomId: string) => 
  state.chat.messages[roomId]?.allIds.map(id => state.chat.messages[roomId].byId[id]) || [];

export const selectRoomTypingUsers = (state: { chat: ChatState }, roomId: string) => 
  state.chat.rooms.byId[roomId]?.participants.filter(p => p.isTyping) || [];

export const selectIsOffline = (state: { chat: ChatState }) => state.chat.offline;

export const selectUnreadCount = (state: { chat: ChatState }, roomId: string) => {
  const messages = state.chat.messages[roomId];
  if (!messages) return 0;
  
  return messages.allIds.reduce((count, messageId) => {
    const message = messages.byId[messageId];
    return message.readBy.length === 0 ? count + 1 : count;
  }, 0);
};