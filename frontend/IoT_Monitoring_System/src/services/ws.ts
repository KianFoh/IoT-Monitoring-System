import config from "../config";

// WebSocket event types
export type WSEventType = "add" | "update" | "delete";

// Channel types
export type WSChannel = "customer" | "department" | "device" | "mqtt_user" | "user";

// Event payload structure
export interface WSEvent<T = any> {
  type: WSEventType;
  data: T;
}

// Event listener callback
export type WSEventListener<T = any> = (event: WSEvent<T>) => void;

// WebSocket connection manager
class WebSocketManager {
  private connections: Map<WSChannel, WebSocket> = new Map();
  private listeners: Map<WSChannel, Set<WSEventListener>> = new Map();
  private reconnectTimers: Map<WSChannel, ReturnType<typeof setTimeout>> = new Map();
  private reconnectAttempts: Map<WSChannel, number> = new Map();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private getToken: (() => string | null) | null = null;

  /**
   * Set token getter (call from auth context)
   */
  setTokenGetter(getter: () => string | null): void {
    this.getToken = getter;
  }

  private getWSUrl(channel: WSChannel): string {
    const token = this.getToken?.();
    if (!token) {
      throw new Error("No authentication token available. Call setTokenGetter() first.");
    }
    const baseUrl = config.api.baseUrl.replace(/^http/, "ws");
    return `${baseUrl}/ws/${channel}?token=${encodeURIComponent(token)}`;
  }

  /**
   * Connect to a WebSocket channel
   */
  connect(channel: WSChannel): void {
    // Skip if already connected
    if (this.isConnected(channel)) {
      console.log(`[WS] Already connected to ${channel} channel`);
      return;
    }

    // Close existing connection if any
    if (this.connections.has(channel)) {
      this.disconnect(channel);
    }

    try {
      const wsUrl = this.getWSUrl(channel);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(`[WS] Connected to ${channel} channel`);
        this.reconnectAttempts.set(channel, 0);
        
        // Clear reconnect timer if exists
        const timer = this.reconnectTimers.get(channel);
        if (timer) {
          clearTimeout(timer);
          this.reconnectTimers.delete(channel);
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WSEvent = JSON.parse(event.data);
          this.notifyListeners(channel, message);
        } catch (error) {
          console.error(`[WS] Failed to parse message from ${channel}:`, error);
        }
      };

      ws.onerror = (error) => {
        console.error(`[WS] Error on ${channel} channel:`, error);
      };

      ws.onclose = (event) => {
        console.log(`[WS] Disconnected from ${channel} channel (code: ${event.code})`);
        this.connections.delete(channel);
        
        // Attempt reconnection for non-auth errors
        if (event.code !== 4401 && event.code !== 4403) {
          this.attemptReconnect(channel);
        }
      };

      this.connections.set(channel, ws);
    } catch (error) {
      console.error(`[WS] Failed to connect to ${channel}:`, error);
    }
  }

  /**
   * Disconnect from a WebSocket channel
   */
  disconnect(channel: WSChannel): void {
    const ws = this.connections.get(channel);
    if (ws) {
      ws.close();
      this.connections.delete(channel);
    }

    // Clear reconnect timer
    const timer = this.reconnectTimers.get(channel);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(channel);
    }
    
    this.reconnectAttempts.delete(channel);
  }

  /**
   * Disconnect all channels
   */
  disconnectAll(): void {
    this.connections.forEach((_, channel) => {
      this.disconnect(channel);
    });
    this.listeners.clear();
  }

  /**
   * Add event listener for a channel
   */
  on<T = any>(channel: WSChannel, listener: WSEventListener<T>): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    
    this.listeners.get(channel)!.add(listener as WSEventListener);

    // Return unsubscribe function
    return () => {
      this.off(channel, listener);
    };
  }

  /**
   * Remove event listener
   */
  off<T = any>(channel: WSChannel, listener: WSEventListener<T>): void {
    const channelListeners = this.listeners.get(channel);
    if (channelListeners) {
      channelListeners.delete(listener as WSEventListener);
    }
  }

  /**
   * Check if connected to a channel
   */
  isConnected(channel: WSChannel): boolean {
    const ws = this.connections.get(channel);
    return ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Notify all listeners for a channel
   */
  private notifyListeners(channel: WSChannel, event: WSEvent): void {
    const channelListeners = this.listeners.get(channel);
    if (channelListeners) {
      channelListeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error(`[WS] Error in listener for ${channel}:`, error);
        }
      });
    }
  }

  /**
   * Attempt to reconnect to a channel
   */
  private attemptReconnect(channel: WSChannel): void {
    const attempts = this.reconnectAttempts.get(channel) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      console.error(`[WS] Max reconnect attempts reached for ${channel}`);
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, attempts); // Exponential backoff
    console.log(`[WS] Reconnecting to ${channel} in ${delay}ms (attempt ${attempts + 1}/${this.maxReconnectAttempts})`);

    const timer = setTimeout(() => {
      this.reconnectAttempts.set(channel, attempts + 1);
      this.connect(channel);
    }, delay);

    this.reconnectTimers.set(channel, timer);
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();

// Export for cleanup (e.g., on logout)
export const disconnectAllChannels = () => {
  wsManager.disconnectAll();
};
