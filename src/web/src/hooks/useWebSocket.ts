// react v18.2.0 - React hooks for state and lifecycle management
import { useState, useEffect, useCallback, useRef } from 'react';

// Internal imports for WebSocket management and types
import { SocketManager, SOCKET_EVENTS } from '../lib/socket';
import { MessageType } from '../types/chat';

// Connection quality enum for monitoring WebSocket performance
export enum ConnectionQuality {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  POOR = 'poor',
  DISCONNECTED = 'disconnected'
}

// Constants for WebSocket configuration
const DEFAULT_RECONNECT_ATTEMPTS = 3;
const DEFAULT_RECONNECT_INTERVAL = 1000;
const MAX_RECONNECT_INTERVAL = 30000;
const HEARTBEAT_INTERVAL = 30000;

// Interface for message queue items
interface QueuedMessage {
  message: any;
  timestamp: number;
  retries: number;
}

// Interface for WebSocket hook configuration
interface WebSocketConfig {
  url: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  onQualityChange?: (quality: ConnectionQuality) => void;
  enableHeartbeat?: boolean;
}

/**
 * Advanced React hook for managing WebSocket connections with enhanced reliability features
 * @param config WebSocket configuration options
 * @returns WebSocket state and control methods
 */
export const useWebSocket = ({
  url,
  autoConnect = true,
  reconnectAttempts = DEFAULT_RECONNECT_ATTEMPTS,
  reconnectInterval = DEFAULT_RECONNECT_INTERVAL,
  onQualityChange,
  enableHeartbeat = true
}: WebSocketConfig) => {
  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>(ConnectionQuality.DISCONNECTED);
  const [error, setError] = useState<Error | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // Refs for persistent data across renders
  const socketManagerRef = useRef<SocketManager | null>(null);
  const messageQueueRef = useRef<QueuedMessage[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();

  /**
   * Initializes the SocketManager instance with configuration
   */
  const initializeSocket = useCallback(() => {
    if (!socketManagerRef.current) {
      socketManagerRef.current = new SocketManager({
        url,
        secure: true,
        transports: ['websocket']
      }, {
        token: '', // Token should be provided through authentication context
        userId: '' // User ID should be provided through authentication context
      }, {
        maxLatency: 200,
        measurementInterval: 5000,
        qualityThreshold: 0.8
      });
    }
  }, [url]);

  /**
   * Handles connection quality updates
   */
  const handleQualityUpdate = useCallback((metrics: { latency: number, isStable: boolean }) => {
    let quality: ConnectionQuality;
    
    if (!isConnected) {
      quality = ConnectionQuality.DISCONNECTED;
    } else if (metrics.latency < 100 && metrics.isStable) {
      quality = ConnectionQuality.EXCELLENT;
    } else if (metrics.latency < 200 && metrics.isStable) {
      quality = ConnectionQuality.GOOD;
    } else {
      quality = ConnectionQuality.POOR;
    }

    setConnectionQuality(quality);
    onQualityChange?.(quality);
  }, [isConnected, onQualityChange]);

  /**
   * Establishes WebSocket connection with retry logic
   */
  const connect = useCallback(async () => {
    try {
      if (!socketManagerRef.current) {
        initializeSocket();
      }

      await socketManagerRef.current?.connect();
      setIsConnected(true);
      setError(null);
      setReconnectAttempt(0);
    } catch (err) {
      setError(err as Error);
      handleReconnect();
    }
  }, [initializeSocket]);

  /**
   * Implements exponential backoff for reconnection attempts
   */
  const handleReconnect = useCallback(() => {
    if (reconnectAttempt < reconnectAttempts) {
      const backoffTime = Math.min(
        reconnectInterval * Math.pow(2, reconnectAttempt),
        MAX_RECONNECT_INTERVAL
      );

      reconnectTimeoutRef.current = setTimeout(() => {
        setReconnectAttempt(prev => prev + 1);
        connect();
      }, backoffTime);
    }
  }, [reconnectAttempt, reconnectAttempts, reconnectInterval, connect]);

  /**
   * Gracefully disconnects WebSocket
   */
  const disconnect = useCallback(() => {
    socketManagerRef.current?.disconnect();
    setIsConnected(false);
    setConnectionQuality(ConnectionQuality.DISCONNECTED);
    clearInterval(heartbeatIntervalRef.current);
  }, []);

  /**
   * Sends message with automatic queuing when offline
   */
  const sendMessage = useCallback(async (message: any) => {
    if (!socketManagerRef.current) {
      throw new Error('Socket connection not initialized');
    }

    if (!isConnected) {
      messageQueueRef.current.push({
        message,
        timestamp: Date.now(),
        retries: 0
      });
      return;
    }

    try {
      socketManagerRef.current.emit('message', message);
    } catch (err) {
      setError(err as Error);
      messageQueueRef.current.push({
        message,
        timestamp: Date.now(),
        retries: 0
      });
    }
  }, [isConnected]);

  /**
   * Subscribes to WebSocket events
   */
  const subscribe = useCallback((event: string, callback: (data: any) => void) => {
    socketManagerRef.current?.on(event, callback);
  }, []);

  /**
   * Unsubscribes from WebSocket events
   */
  const unsubscribe = useCallback((event: string, callback: (data: any) => void) => {
    socketManagerRef.current?.off(event, callback);
  }, []);

  /**
   * Processes queued messages after reconnection
   */
  const processMessageQueue = useCallback(() => {
    const now = Date.now();
    const validMessages = messageQueueRef.current.filter(
      item => now - item.timestamp < 300000 && item.retries < 3
    );

    validMessages.forEach(item => {
      sendMessage(item.message);
      item.retries++;
    });

    messageQueueRef.current = validMessages;
  }, [sendMessage]);

  // Initialize socket and set up event listeners
  useEffect(() => {
    initializeSocket();

    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
      clearTimeout(reconnectTimeoutRef.current);
      clearInterval(heartbeatIntervalRef.current);
    };
  }, [initializeSocket, autoConnect, connect, disconnect]);

  // Set up heartbeat monitoring
  useEffect(() => {
    if (enableHeartbeat && isConnected) {
      heartbeatIntervalRef.current = setInterval(() => {
        socketManagerRef.current?.emit(SOCKET_EVENTS.HEARTBEAT, null);
      }, HEARTBEAT_INTERVAL);
    }

    return () => {
      clearInterval(heartbeatIntervalRef.current);
    };
  }, [enableHeartbeat, isConnected]);

  // Process message queue on reconnection
  useEffect(() => {
    if (isConnected) {
      processMessageQueue();
    }
  }, [isConnected, processMessageQueue]);

  return {
    isConnected,
    connectionQuality,
    connect,
    disconnect,
    sendMessage,
    subscribe,
    unsubscribe,
    error,
    reconnectAttempt
  };
};