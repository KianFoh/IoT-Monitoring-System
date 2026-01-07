import axios, { AxiosError } from "axios";
import type { AxiosInstance, AxiosRequestConfig } from "axios";
import { config } from "@/config";
import { authApi } from "../features/auth/api/authApi";

type RetryableRequest = AxiosRequestConfig & { _retry?: boolean };

class ApiClient {
  private client: AxiosInstance;
  private getToken: (() => string | null) | null = null;
  private isRefreshing = false;
  private refreshQueue: Array<() => void> = [];

  private setUpInterceptors(instance: AxiosInstance) {
    instance.interceptors.request.use((config) => {
      const token = this.getToken?.();
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
        if (!originalRequest || originalRequest._retry || originalRequest.url?.includes('/auth/refresh')) {
          return Promise.reject(error);
        }

        if (error.response?.status === 401) {
          // Avoid multiple refresh calls
          if (this.isRefreshing) {
            await new Promise<void>((resolve) => this.refreshQueue.push(resolve));
          } else {
            this.isRefreshing = true;
            try {
              const data = await authApi.refreshToken();
              // Update token getter
              this.setTokenGetter(() => data.access_token);
            } catch (e) {
              this.isRefreshing = false;
              this.refreshQueue = [];
              // Don't retry, let the error propagate so user gets redirected
              return Promise.reject(error);
            }
            this.isRefreshing = false;
            this.refreshQueue.forEach((resolve) => resolve());
            this.refreshQueue = [];
          }

          originalRequest._retry = true;
          const token = this.getToken?.();
          if (token) {
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return instance(originalRequest);
          }
        }

        return Promise.reject(error);
      }
    );
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
    this.getToken = getter;
  }
}

export const api = new ApiClient(
  config.api.baseUrl,
  config.api.timeout
);
