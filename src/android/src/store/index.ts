/**
 * @fileoverview Root Redux store configuration for Android mobile app
 * Implements centralized state management with persistence, offline support,
 * and real-time synchronization capabilities
 * @version 1.0.0
 */

import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit'; // ^1.9.5
import { persistStore, persistReducer, createMigrate } from 'redux-persist'; // ^6.0.0
import AsyncStorage from '@react-native-async-storage/async-storage'; // ^1.19.0
import { createLogger } from 'redux-logger'; // ^3.0.6
import { encryptTransform } from 'redux-persist-transform-encrypt';
import createCompressor from 'redux-persist-transform-compress';

// Import reducers
import authReducer from './slices/authSlice';
import bookingReducer from './slices/bookingSlice';
import chatReducer from './slices/chatSlice';
import personaReducer from './slices/personaSlice';

// Import config
import { config } from '../config/development';

/**
 * Redux persist configuration with encryption and compression
 */
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  version: 1,
  // Only persist auth and persona states for security and performance
  whitelist: ['auth', 'persona'],
  // Don't persist real-time data
  blacklist: ['chat', 'booking'],
  // Add encryption for sensitive data
  transforms: [
    encryptTransform({
      secretKey: 'your-secret-key', // Should be stored securely in production
      onError: (error) => {
        console.error('Persist encryption error:', error);
      },
    }),
    createCompressor({
      whitelist: ['persona'], // Compress large persona data
    }),
  ],
  // Migration configuration
  migrate: createMigrate({
    // Add migrations as needed
    1: (state) => {
      return { ...state };
    },
  }),
  timeout: 10000, // 10 seconds
  debug: __DEV__,
};

/**
 * Redux DevTools configuration for development
 */
const devToolsOptions = {
  name: 'AI Travel Platform - Android',
  maxAge: 50,
  serialize: true,
  actionSanitizer: (action: any) => {
    // Sanitize sensitive data from actions in development
    const sensitiveKeys = ['password', 'token', 'creditCard'];
    if (action.payload) {
      const sanitized = { ...action.payload };
      sensitiveKeys.forEach(key => {
        if (sanitized[key]) {
          sanitized[key] = '[REDACTED]';
        }
      });
      return { ...action, payload: sanitized };
    }
    return action;
  },
  stateSanitizer: (state: any) => {
    // Sanitize sensitive data from state in development
    if (state.auth?.tokens) {
      return {
        ...state,
        auth: {
          ...state.auth,
          tokens: '[REDACTED]',
        },
      };
    }
    return state;
  },
};

/**
 * Configure middleware based on environment
 */
const configureMiddleware = (isDevelopment: boolean) => {
  const middleware = getDefaultMiddleware({
    serializableCheck: {
      ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      ignoredPaths: ['chat.socket'],
    },
    thunk: {
      extraArgument: {
        api: config.API_CONFIG,
      },
    },
  });

  if (isDevelopment) {
    middleware.push(
      createLogger({
        collapsed: true,
        duration: true,
        timestamp: true,
        colors: {
          title: () => '#139BFE',
          prevState: () => '#9E9E9E',
          action: () => '#149945',
          nextState: () => '#A47104',
        },
      })
    );
  }

  return middleware;
};

/**
 * Combine reducers with persistence configuration
 */
const rootReducer = {
  auth: persistReducer(persistConfig, authReducer),
  booking: bookingReducer,
  chat: chatReducer,
  persona: persistReducer(persistConfig, personaReducer),
};

/**
 * Configure and create the Redux store
 */
export const store = configureStore({
  reducer: rootReducer,
  middleware: configureMiddleware(__DEV__),
  devTools: __DEV__ ? devToolsOptions : false,
  preloadedState: undefined,
  enhancers: [],
});

/**
 * Create the persistor for Redux persist
 */
export const persistor = persistStore(store, null, () => {
  // Optional callback after rehydration
  console.log('Redux persist rehydration complete');
});

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Type guard for checking if store is initialized
export const isStoreInitialized = (state: RootState): boolean => {
  return state.auth._persist?.rehydrated === true;
};

// Utility for resetting persisted state (useful for logout)
export const resetPersistedState = async () => {
  await persistor.purge();
  store.dispatch({ type: 'RESET_STATE' });
};

// Export store instance
export default store;