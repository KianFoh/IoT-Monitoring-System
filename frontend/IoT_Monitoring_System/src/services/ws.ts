import config from "../config";

export type WSChannel = "customer" | "department" | "device" | "mqtt_user" | "user" | "device_status";
export type WSEventType = "add" | "update" | "delete";
export interface WSEvent<T = any> { type: WSEventType; data: T }
export type Listener<T = any> = (event: WSEvent<T>) => void;
export type StreamListener<T = unknown> = (data: T) => void;

export const ALL_CHANNELS: WSChannel[] = ["customer", "department", "device", "mqtt_user", "user", "device_status"];

type AuthHandlers = {
  refreshToken?: () => Promise<string | null>;
  onAuthFailure?: () => void;
};

class WebSocketManager {
  private tokenGetter?: () => string | null;
  private authHandlers?: AuthHandlers;
  private connections = new Map<WSChannel, WebSocket>();
  private listeners = new Map<WSChannel, Set<Listener>>();
  private shouldReconnect = new Map<WSChannel, boolean>();
  private hasConnected = new Map<WSChannel, boolean>();
  private streamConnections = new Map<string, WebSocket>();
  private streamListeners = new Map<string, Set<StreamListener>>();
  private streamShouldReconnect = new Map<string, boolean>();
  private streamPaths = new Map<string, string>();
  private reconnectListeners = new Set<() => void>();
  private reconnectNotifyScheduled = false;
  private refreshPromise: Promise<string | null> | null = null;
  private manualReconnect = false;
  private readonly RECONNECT_DELAY = 2000;
  private readonly REFRESH_RETRY_DELAY = 3000;
  private readonly CLOSE_TIMEOUT = 1500;

  setTokenGetter(getter: () => string | null) {
    this.tokenGetter = getter;
  }

  setAuthHandlers(handlers: AuthHandlers) {
    this.authHandlers = handlers;
  }

  onReconnect(listener: () => void) {
    this.reconnectListeners.add(listener);
    return () => this.reconnectListeners.delete(listener);
  }

  private notifyReconnect() {
    if (this.reconnectNotifyScheduled) return;
    this.reconnectNotifyScheduled = true;
    setTimeout(() => {
      this.reconnectNotifyScheduled = false;
      this.reconnectListeners.forEach((fn) => fn());
    }, 0);
  }

  private wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isAuthClose(event?: CloseEvent) {
    const code = event?.code;
    const reason = event?.reason?.toLowerCase?.() ?? "";
    return code === 4401 || code === 4403 || code === 1008 || reason.includes("auth") || reason.includes("token");
  }

  private async queueRefresh() {
    if (!this.authHandlers?.refreshToken) return null;
    if (!this.refreshPromise) {
      this.refreshPromise = this.authHandlers
        .refreshToken()
        .finally(() => {
          this.refreshPromise = null;
        });
    }
    return this.refreshPromise;
  }

  private async refreshWithRetry(channel: WSChannel, event?: CloseEvent) {
    if (!this.authHandlers?.refreshToken) return true;

    const isAuthRelated = this.isAuthClose(event);

    while (this.shouldReconnect.get(channel)) {
      try {
        const token = await this.queueRefresh();
        if (!token) throw new Error("WS auth refresh returned no token");
        return true;
      } catch (err: any) {
        const status = err?.response?.status ?? err?.status;
        const authFail = status === 401 || status === 403 || isAuthRelated;
        if (authFail) {
          this.authHandlers?.onAuthFailure?.();
          return false;
        }
        await this.wait(this.REFRESH_RETRY_DELAY);
      }
    }

    return false;
  }

  private async refreshWithRetryStream(key: string, event?: CloseEvent) {
    if (!this.authHandlers?.refreshToken) return true;

    const isAuthRelated = this.isAuthClose(event);

    while (this.streamShouldReconnect.get(key)) {
      try {
        const token = await this.queueRefresh();
        if (!token) throw new Error("WS auth refresh returned no token");
        return true;
      } catch (err: unknown) {
        const details = err && typeof err === "object"
          ? (err as { response?: { status?: number }; status?: number })
          : undefined;
        const status = details?.response?.status ?? details?.status;
        const authFail = status === 401 || status === 403 || isAuthRelated;
        if (authFail) {
          this.authHandlers?.onAuthFailure?.();
          return false;
        }
        await this.wait(this.REFRESH_RETRY_DELAY);
      }
    }

    return false;
  }

  private async handleReconnect(channel: WSChannel, event?: CloseEvent) {
    if (!this.shouldReconnect.get(channel) || this.manualReconnect) return;

    const refreshed = await this.refreshWithRetry(channel, event);
    if (!refreshed) return;

    await this.wait(this.RECONNECT_DELAY);
    if (!this.shouldReconnect.get(channel)) return;
    this.connect(channel).catch(() => {});
  }

  private async handleStreamReconnect(key: string, event?: CloseEvent) {
    if (!this.streamShouldReconnect.get(key)) return;

    const refreshed = await this.refreshWithRetryStream(key, event);
    if (!refreshed) return;

    await this.wait(this.RECONNECT_DELAY);
    if (!this.streamShouldReconnect.get(key)) return;
    const path = this.streamPaths.get(key);
    if (!path) return;
    this.connectStream(key, path).catch(() => {});
  }

  private buildStreamUrl(path: string, token: string) {
    const base = config.api.baseUrl.replace(/^http/, "ws");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const separator = normalizedPath.includes("?") ? "&" : "?";
    return `${base}${normalizedPath}${separator}token=${encodeURIComponent(token)}`;
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
        const seen = this.hasConnected.get(channel) ?? false;
        this.hasConnected.set(channel, true);
        if (seen) {
          this.notifyReconnect();
        }
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
      ws.onclose = (event) => {
        console.log(
          `[WS] Closed: ${channel} (code ${event.code}, reason: ${event.reason || "n/a"}, clean: ${event.wasClean})`
        );
        this.connections.delete(channel);
        this.handleReconnect(channel, event).catch(() => {});
      };
      ws.onerror = (e) => {
        console.error(`[WS] Error on ${channel}`, e);
        reject(e);
      };

      this.connections.set(channel, ws);
    });
  }

  connectStream(key: string, path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.streamShouldReconnect.set(key, true);
      this.streamPaths.set(key, path);
      const token = this.tokenGetter?.();
      if (!token) {
        console.warn(`[WS] No token, skip stream connect for ${key}`);
        return reject("No token");
      }

      const existing = this.streamConnections.get(key);
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

      const url = this.buildStreamUrl(path, token);
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log(`[WS] Connected stream: ${key}`);
        resolve();
      };
      ws.onmessage = (e) => {
        let payload: unknown = e.data;
        if (typeof e.data === "string") {
          try {
            payload = JSON.parse(e.data) as unknown;
          } catch {
            payload = e.data;
          }
        }
        this.streamListeners.get(key)?.forEach((fn) => fn(payload));
      };
      ws.onclose = (event) => {
        console.log(
          `[WS] Closed stream: ${key} (code ${event.code}, reason: ${event.reason || "n/a"}, clean: ${event.wasClean})`
        );
        this.streamConnections.delete(key);
        this.handleStreamReconnect(key, event).catch(() => {});
      };
      ws.onerror = (e) => {
        console.error(`[WS] Error on stream ${key}`, e);
        reject(e);
      };

      this.streamConnections.set(key, ws);
    });
  }

  disconnect(channel: WSChannel) {
    this.shouldReconnect.set(channel, false);
    this.connections.get(channel)?.close();
    this.connections.delete(channel);
  }

  disconnectStream(key: string) {
    this.streamShouldReconnect.set(key, false);
    this.streamConnections.get(key)?.close();
    this.streamConnections.delete(key);
    this.streamPaths.delete(key);
  }

  private waitForClose(ws: WebSocket) {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => resolve(), this.CLOSE_TIMEOUT);
      ws.addEventListener("close", () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
    });
  }

  async connectAll(channels: WSChannel[] = ALL_CHANNELS, options?: { strict?: boolean }) {
    const results = await Promise.allSettled(
      channels.map((channel) => this.connect(channel))
    );

    if (options?.strict) {
      const rejected = results.find((res) => res.status === "rejected");
      if (rejected && rejected.status === "rejected") {
        throw rejected.reason;
      }
    }

    return results;
  }

  async reconnectAll(channels: WSChannel[] = ALL_CHANNELS, options?: { strict?: boolean; manual?: boolean; keepListeners?: boolean }) {
    const isManual = options?.manual ?? false;
    if (isManual) this.manualReconnect = true;
    try {
      if (isManual) {
        this.hasConnected.clear();
      }
      const sockets = Array.from(this.connections.entries());
      sockets.forEach(([channel, ws]) => {
        this.shouldReconnect.set(channel, false);
        ws.close();
      });
      await Promise.all(sockets.map(([, ws]) => this.waitForClose(ws)));
      this.connections.clear();
      if (!options?.keepListeners) {
        this.listeners.clear();
      }
      await this.connectAll(channels, options);
      if (isManual) {
        this.notifyReconnect();
      }
    } finally {
      if (isManual) this.manualReconnect = false;
    }
  }

  disconnectAll(options?: { keepListeners?: boolean }) {
    this.shouldReconnect.clear();
    this.connections.forEach((ws) => ws.close());
    this.connections.clear();
    this.streamShouldReconnect.clear();
    this.streamConnections.forEach((ws) => ws.close());
    this.streamConnections.clear();
    this.streamPaths.clear();
    if (!options?.keepListeners) {
      this.listeners.clear();
      this.streamListeners.clear();
    }
  }

  on<T = any>(channel: WSChannel, listener: Listener<T>): () => void {
    if (!this.listeners.has(channel)) this.listeners.set(channel, new Set());
    this.listeners.get(channel)!.add(listener as Listener);
    return () => this.listeners.get(channel)?.delete(listener as Listener);
  }

  onStream<T = any>(key: string, listener: StreamListener<T>): () => void {
    if (!this.streamListeners.has(key)) this.streamListeners.set(key, new Set());
    this.streamListeners.get(key)!.add(listener as StreamListener);
    return () => this.streamListeners.get(key)?.delete(listener as StreamListener);
  }
}

export const wsManager = new WebSocketManager();
