/**
 * Root Redux Store Configuration
 * Version: 1.0.0
 * 
 * Configures the global Redux store with:
 * - Feature slices combination
 * - Middleware setup including WebSocket
 * - State persistence with migration support
 * - TypeScript type safety
 * - Development tools integration
 */

import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit'; // ^1.9.5
import { persistStore, persistReducer, createMigrate } from 'redux-persist'; // ^6.0.0
import storage from 'redux-persist/lib/storage'; // ^6.0.0

// Import feature slices
import authReducer from './slices/authSlice';
import bookingReducer from './slices/bookingSlice';
import chatReducer from './slices/chatSlice';
import personaReducer from './slices/personaSlice';
import professionalReducer from './slices/professionalSlice';

// Import custom middleware
import { createWebSocketMiddleware } from '../middleware/websocket';

// Persistence configuration with migration support
const persistConfig = {
  version: 1,
  key: 'root',
  storage,
  whitelist: ['auth', 'persona'], // Only persist authentication and persona state
  blacklist: ['chat', 'booking', 'professional'], // Don't persist these states
  migrate: createMigrate({
    // Migration functions for state version updates
    1: (state) => {
      return {
        ...state,
        _persist: {
          version: 1,
          rehydrated: true
        }
      };
    }
  }, { debug: process.env.NODE_ENV === 'development' })
};

// Combine all reducers with persistence
const rootReducer = {
  auth: persistReducer(persistConfig, authReducer),
  booking: bookingReducer,
  chat: chatReducer,
  persona: persistReducer(persistConfig, personaReducer),
  professional: professionalReducer
};

// Configure development tools
const REDUX_DEVTOOLS_ENABLED = process.env.NODE_ENV === 'development';

// Configure store with middleware and persistence
const setupStore = () => {
  // Configure default middleware with type checking
  const middleware = getDefaultMiddleware({
    serializableCheck: {
      ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      ignoredPaths: ['_persist']
    },
    thunk: true,
    immutableCheck: true
  });

  // Add custom WebSocket middleware for real-time features
  middleware.push(createWebSocketMiddleware({
    url: process.env.SOCKET_URL || 'wss://api.aitravelplatform.com',
    reconnect: true,
    maxRetries: 3
  }));

  // Create store with all configurations
  const store = configureStore({
    reducer: rootReducer,
    middleware,
    devTools: REDUX_DEVTOOLS_ENABLED,
    preloadedState: undefined,
    enhancers: []
  });

  // Create persistor for state persistence
  const persistor = persistStore(store, null, () => {
    // Optional callback after rehydration
    console.log('Redux state rehydrated');
  });

  // Enable hot module replacement for reducers in development
  if (process.env.NODE_ENV === 'development' && module.hot) {
    module.hot.accept('./slices', () => {
      store.replaceReducer(rootReducer);
    });
  }

  return { store, persistor };
};

// Create store instance
const { store, persistor } = setupStore();

// Export store instance and types
export { store, persistor };

// Export type definitions
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Type guard for checking if a state key is persisted
export const isPersistedKey = (key: keyof RootState): boolean => {
  return persistConfig.whitelist.includes(key as string);
};

// Export configuration for testing and debugging
export const getStoreConfig = () => ({
  persistConfig,
  middleware: store.getState(),
  devToolsEnabled: REDUX_DEVTOOLS_ENABLED
});