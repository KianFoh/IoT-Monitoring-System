import axios, { AxiosError } from "axios";
import type { AxiosInstance, AxiosRequestConfig } from "axios";
import { config } from "@/config";

type RetryableRequest = AxiosRequestConfig & { _retry?: boolean };

type AuthHandlers = {
  getToken?: () => string | null;
  refreshToken?: () => Promise<string | null>;
  onRefreshFailure?: () => void;
};

class ApiClient {
  private client: AxiosInstance;
  private authHandlers: AuthHandlers | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  private setUpInterceptors(instance: AxiosInstance) {
    instance.interceptors.request.use((config) => {
      const token = this.authHandlers?.getToken?.();
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as RetryableRequest;

        // Don't retry if no config, already retried, or is the refresh endpoint itself
        if (!originalRequest || originalRequest._retry || originalRequest.url?.includes("/auth/refresh")) {
          return Promise.reject(error);
        }

        if (error.response?.status === 401 && this.authHandlers?.refreshToken) {
          try {
            const refreshedToken = await this.queueRefresh();
            const token = refreshedToken ?? this.authHandlers.getToken?.();
            if (!token) throw error;

            originalRequest._retry = true;
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return instance(originalRequest);
          } catch (refreshError) {
            this.authHandlers?.onRefreshFailure?.();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
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

  constructor(baseURL: string, timeout: number) {
    this.client = axios.create({
      baseURL,
      timeout,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
    });
    this.setUpInterceptors(this.client);
  }

  get<T>(url: string, config?: AxiosRequestConfig) {
    return this.client.get<T>(url, config).then((r) => r.data);
  }

  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return this.client.post<T>(url, data, config).then((r) => r.data);
  }

  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return this.client.put<T>(url, data, config).then((r) => r.data);
  }

  delete<T>(url: string, config?: AxiosRequestConfig) {
    return this.client.delete<T>(url, config).then((r) => r.data);
  }

  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return this.client.patch<T>(url, data, config).then((r) => r.data);
  }

  setTokenGetter(getter: () => string | null) {
    this.authHandlers = { ...(this.authHandlers ?? {}), getToken: getter };
  }

  setAuthHandlers(handlers: AuthHandlers) {
    this.authHandlers = handlers;
  }
}

export const api = new ApiClient(
  config.api.baseUrl,
  config.api.timeout
);
