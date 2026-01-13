import config from "../config";

export type WSChannel = "customer" | "department" | "device" | "mqtt_user" | "user";
export type WSEventType = "add" | "update" | "delete";
export interface WSEvent<T = any> { type: WSEventType; data: T }
export type Listener<T = any> = (event: WSEvent<T>) => void;

export const ALL_CHANNELS: WSChannel[] = ["customer", "department", "device", "mqtt_user", "user"];

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

  private async handleReconnect(channel: WSChannel, event?: CloseEvent) {
    if (!this.shouldReconnect.get(channel) || this.manualReconnect) return;

    const refreshed = await this.refreshWithRetry(channel, event);
    if (!refreshed) return;

    await this.wait(this.RECONNECT_DELAY);
    if (!this.shouldReconnect.get(channel)) return;
    this.connect(channel).catch(() => {});
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

  disconnect(channel: WSChannel) {
    this.shouldReconnect.set(channel, false);
    this.connections.get(channel)?.close();
    this.connections.delete(channel);
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

  async reconnectAll(channels: WSChannel[] = ALL_CHANNELS, options?: { strict?: boolean; manual?: boolean, keepListeners?: boolean }) {
    const isManual = options?.manual ?? false;
    if (isManual) this.manualReconnect = true;
    try {
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
    } finally {
      if (isManual) this.manualReconnect = false;
    }
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
