import config from "../config";

export type WSChannel = "customer" | "department" | "device" | "mqtt_user" | "user";
export type WSEventType = "add" | "update" | "delete";
export interface WSEvent<T = any> { type: WSEventType; data: T }
export type Listener<T = any> = (event: WSEvent<T>) => void;

class WebSocketManager {
  private tokenGetter?: () => string | null;
  private connections = new Map<WSChannel, WebSocket>();
  private listeners = new Map<WSChannel, Set<Listener>>();

  setTokenGetter(getter: () => string | null) {
    this.tokenGetter = getter;
  }

  connect(channel: WSChannel): Promise<void> {
    return new Promise((resolve, reject) => {
        const token = this.tokenGetter?.();
        if (!token) {
        console.warn(`[WS] No token, skip connect for ${channel}`);
        return reject("No token");
        }

        const existing = this.connections.get(channel);
        if (existing?.readyState === WebSocket.OPEN) return resolve();

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
        ws.onclose = (e) => {
        console.log(`[WS] Closed: ${channel} code=${e.code}`);
        this.connections.delete(channel);
        };
        ws.onerror = (e) => {
        console.error(`[WS] Error on ${channel}`, e);
        reject(e);
        };

        this.connections.set(channel, ws);
    });
    }


  disconnect(channel: WSChannel) {
    this.connections.get(channel)?.close();
    this.connections.delete(channel);
  }

  on<T = any>(channel: WSChannel, listener: Listener<T>): () => void {
    if (!this.listeners.has(channel)) this.listeners.set(channel, new Set());
    this.listeners.get(channel)!.add(listener as Listener);
    return () => this.listeners.get(channel)?.delete(listener as Listener);
  }
}

export const wsManager = new WebSocketManager();