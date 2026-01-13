import config from "../config";

export type WSChannel = "customer" | "department" | "device" | "mqtt_user" | "user";
export type WSEventType = "add" | "update" | "delete";
export interface WSEvent<T = any> { type: WSEventType; data: T }
export type Listener<T = any> = (event: WSEvent<T>) => void;

export const ALL_CHANNELS: WSChannel[] = ["customer", "department", "device", "mqtt_user", "user"];

class WebSocketManager {
  private tokenGetter?: () => string | null;
  private connections = new Map<WSChannel, WebSocket>();
  private listeners = new Map<WSChannel, Set<Listener>>();
  private shouldReconnect = new Map<WSChannel, boolean>();

  setTokenGetter(getter: () => string | null) {
    this.tokenGetter = getter;
  }

  connect(channel: WSChannel): Promise<void> {
    return new Promise((resolve, reject) => {
      this.shouldReconnect.set(channel, true);
      const token = this.tokenGetter?.();
      if (!token) {
        console.warn(`[WS] No token, skip connect for ${channel}`);
        return reject("No token");
      }

      const existing = this.connections.get(channel);
      if (existing?.readyState === WebSocket.OPEN) return resolve();
      if (existing?.readyState === WebSocket.CONNECTING) {
        const onOpen = () => {
          existing.removeEventListener("error", onError);
          resolve();
        };
        const onError = (err: Event) => {
          existing.removeEventListener("open", onOpen);
          reject(err);
        };
        existing.addEventListener("open", onOpen, { once: true });
        existing.addEventListener("error", onError, { once: true });
        return;
      }

      const url =
        config.api.baseUrl.replace(/^http/, "ws") +
        `/ws/${channel}?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log(`[WS] Connected: ${channel}`);
        resolve();
      };
      ws.onmessage = (e) => {
        try {
          const evt: WSEvent = JSON.parse(e.data);
          this.listeners.get(channel)?.forEach((fn) => fn(evt));
        } catch (err) {
          console.error(`[WS] Parse error on ${channel}`, err);
        }
      };
      ws.onclose = (event: CloseEvent) => {
        console.log(
          `[WS] Closed: ${channel} (code ${event.code}, reason: ${event.reason || "n/a"}, clean: ${event.wasClean})`
        );
        if (event.code === 4401) {
          console.warn(`[WS] Auth failure for ${channel}: server closed with code 4401 (invalid or missing token)`);
        }
      };
      ws.onerror = (e) => {
        console.error(`[WS] Error on ${channel}`, e);
        reject(e);
      };

      this.connections.set(channel, ws);
    });
  }


  disconnect(channel: WSChannel) {
    this.shouldReconnect.set(channel, false);
    this.connections.get(channel)?.close();
    this.connections.delete(channel);
  }

  async connectAll(channels: WSChannel[] = ALL_CHANNELS) {
    await Promise.all(
      channels.map((channel) => this.connect(channel).catch(() => {}))
    );
  }

  async reconnectAll(channels: WSChannel[] = ALL_CHANNELS) {
    this.disconnectAll({ keepListeners: true });
    await this.connectAll(channels);
  }

  disconnectAll(options?: { keepListeners?: boolean }) {
    this.shouldReconnect.clear();
    this.connections.forEach((ws) => ws.close());
    this.connections.clear();
    if (!options?.keepListeners) {
      this.listeners.clear();
    }
  }

  on<T = any>(channel: WSChannel, listener: Listener<T>): () => void {
    if (!this.listeners.has(channel)) this.listeners.set(channel, new Set());
    this.listeners.get(channel)!.add(listener as Listener);
    return () => this.listeners.get(channel)?.delete(listener as Listener);
  }
}

export const wsManager = new WebSocketManager();
