// socket.io-client v4.6.x - WebSocket client implementation
import { io, Socket } from 'socket.io-client';
// events v3.3.x - Event handling
import { EventEmitter } from 'events';

/**
 * Enumeration of WebSocket events including connection and quality monitoring events
 */
export enum SOCKET_EVENTS {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  RECONNECT = 'reconnect',
  RECONNECT_ATTEMPT = 'reconnect_attempt',
  LATENCY_WARNING = 'latency_warning',
  CONNECTION_QUALITY = 'connection_quality',
  HEARTBEAT = 'heartbeat'
}

// Connection configuration constants
const RECONNECT_ATTEMPTS: number = 5;
const RECONNECT_INTERVAL: number = 1000;
const CONNECTION_TIMEOUT: number = 20000;
const MAX_LATENCY: number = 200;
const HEARTBEAT_INTERVAL: number = 30000;

/**
 * Interface for socket configuration options
 */
interface SocketConfig {
  url: string;
  path?: string;
  transports?: string[];
  secure?: boolean;
}

/**
 * Interface for authentication options
 */
interface AuthOptions {
  token: string;
  userId: string;
}

/**
 * Interface for quality monitoring options
 */
interface QualityMonitorOptions {
  maxLatency?: number;
  measurementInterval?: number;
  qualityThreshold?: number;
}

/**
 * Interface for network information
 */
interface NetworkInfo {
  type: string;
  downlink?: number;
  rtt?: number;
}

/**
 * Interface for queued events
 */
interface QueuedEvent {
  event: string;
  data: any;
  timestamp: number;
}

/**
 * Enhanced WebSocket manager with connection quality monitoring,
 * secure authentication, and comprehensive error handling
 */
export class SocketManager {
  private socket: Socket;
  private eventEmitter: EventEmitter;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private currentLatency: number = 0;
  private eventQueue: QueuedEvent[] = [];
  private heartbeatTimer: NodeJS.Timer | null = null;
  private qualityMonitorTimer: NodeJS.Timer | null = null;

  /**
   * Creates a new instance of SocketManager
   * @param config Socket configuration options
   * @param authOptions Authentication credentials
   * @param monitorOptions Quality monitoring options
   */
  constructor(
    private config: SocketConfig,
    private authOptions: AuthOptions,
    private monitorOptions: QualityMonitorOptions = {}
  ) {
    this.eventEmitter = new EventEmitter();
    this.initializeSocket();
  }

  /**
   * Initializes the socket instance with security and monitoring options
   */
  private initializeSocket(): void {
    this.socket = io(this.config.url, {
      path: this.config.path,
      transports: this.config.transports || ['websocket', 'polling'],
      secure: this.config.secure !== false,
      auth: {
        token: this.authOptions.token,
        userId: this.authOptions.userId
      },
      reconnectionAttempts: RECONNECT_ATTEMPTS,
      reconnectionDelay: RECONNECT_INTERVAL,
      timeout: CONNECTION_TIMEOUT,
      extraHeaders: {
        'X-Client-Version': process.env.VERSION || '1.0.0'
      }
    });

    this.setupEventListeners();
  }

  /**
   * Sets up socket event listeners
   */
  private setupEventListeners(): void {
    this.socket.on(SOCKET_EVENTS.CONNECT, () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.processEventQueue();
      this.startHeartbeat();
      this.eventEmitter.emit(SOCKET_EVENTS.CONNECT);
    });

    this.socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      this.isConnected = false;
      this.stopHeartbeat();
      this.eventEmitter.emit(SOCKET_EVENTS.DISCONNECT);
    });

    this.socket.on(SOCKET_EVENTS.ERROR, (error: Error) => {
      this.eventEmitter.emit(SOCKET_EVENTS.ERROR, error);
    });

    this.socket.on(SOCKET_EVENTS.RECONNECT_ATTEMPT, (attempt: number) => {
      this.reconnectAttempts = attempt;
      this.eventEmitter.emit(SOCKET_EVENTS.RECONNECT_ATTEMPT, attempt);
    });
  }

  /**
   * Establishes secure WebSocket connection with enhanced retry logic
   * @returns Promise that resolves when connected
   */
  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, CONNECTION_TIMEOUT);

      this.socket.connect();

      this.socket.once(SOCKET_EVENTS.CONNECT, () => {
        clearTimeout(timeout);
        this.startQualityMonitoring();
        resolve();
      });

      this.socket.once(SOCKET_EVENTS.ERROR, (error: Error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Gracefully closes WebSocket connection with cleanup
   */
  public disconnect(): void {
    this.stopQualityMonitoring();
    this.stopHeartbeat();
    this.socket.disconnect();
    this.isConnected = false;
    this.eventQueue = [];
    this.eventEmitter.emit(SOCKET_EVENTS.DISCONNECT);
  }

  /**
   * Monitors WebSocket connection quality and latency
   */
  public monitorConnectionQuality(): void {
    const startTime = Date.now();
    
    this.socket.emit(SOCKET_EVENTS.HEARTBEAT, null, () => {
      this.currentLatency = Date.now() - startTime;
      
      if (this.currentLatency > (this.monitorOptions.maxLatency || MAX_LATENCY)) {
        this.eventEmitter.emit(SOCKET_EVENTS.LATENCY_WARNING, {
          latency: this.currentLatency,
          threshold: this.monitorOptions.maxLatency || MAX_LATENCY
        });
      }

      this.eventEmitter.emit(SOCKET_EVENTS.CONNECTION_QUALITY, {
        latency: this.currentLatency,
        reconnectAttempts: this.reconnectAttempts,
        isStable: this.currentLatency <= (this.monitorOptions.maxLatency || MAX_LATENCY)
      });
    });
  }

  /**
   * Handles network condition changes and adjusts connection parameters
   * @param networkInfo Current network information
   */
  public handleNetworkChange(networkInfo: NetworkInfo): void {
    if (networkInfo.type === 'slow-2g' || networkInfo.type === '2g') {
      this.socket.io.opts.timeout = CONNECTION_TIMEOUT * 2;
    } else {
      this.socket.io.opts.timeout = CONNECTION_TIMEOUT;
    }

    if (this.isConnected && networkInfo.rtt && networkInfo.rtt > MAX_LATENCY) {
      this.socket.disconnect().connect();
    }
  }

  /**
   * Starts the heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.socket.emit(SOCKET_EVENTS.HEARTBEAT);
      }
    }, HEARTBEAT_INTERVAL);
  }

  /**
   * Stops the heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Starts connection quality monitoring
   */
  private startQualityMonitoring(): void {
    this.qualityMonitorTimer = setInterval(() => {
      this.monitorConnectionQuality();
    }, this.monitorOptions.measurementInterval || 5000);
  }

  /**
   * Stops connection quality monitoring
   */
  private stopQualityMonitoring(): void {
    if (this.qualityMonitorTimer) {
      clearInterval(this.qualityMonitorTimer);
      this.qualityMonitorTimer = null;
    }
  }

  /**
   * Processes queued events after reconnection
   */
  private processEventQueue(): void {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event && Date.now() - event.timestamp < CONNECTION_TIMEOUT) {
        this.socket.emit(event.event, event.data);
      }
    }
  }

  /**
   * Adds event listener for socket events
   * @param event Event name
   * @param listener Event handler function
   */
  public on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Removes event listener
   * @param event Event name
   * @param listener Event handler function
   */
  public off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  /**
   * Emits event with automatic queueing when disconnected
   * @param event Event name
   * @param data Event data
   */
  public emit(event: string, data: any): void {
    if (this.isConnected) {
      this.socket.emit(event, data);
    } else {
      this.eventQueue.push({
        event,
        data,
        timestamp: Date.now()
      });
    }
  }
}