import axios from "axios";
import type { AxiosInstance, AxiosRequestConfig } from "axios";
import { config } from "@/config";

class ApiClient {
  private client: AxiosInstance;
  private getToken: (() => string | null) | null = null;

  constructor(baseURL: string, timeout: number) {
    this.client = axios.create({
      baseURL,
      timeout,
      withCredentials: true, // needed for refresh cookie
      headers: {
        "Content-Type": "application/json",
      },
    });

    // 🔑 attach token automatically if it exists
    this.client.interceptors.request.use((config) => {
      const token = this.getToken?.();
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
        
      }
      return config;
    });

    this.client.interceptors.response.use(
      (res) => res,
      (error) => {
        if (error.code === "ECONNABORTED") {
          return Promise.reject(new Error("Request timed out"));
        }
        if (!error.response) {
          return Promise.reject(
            new Error("Network error. Please check your connection.")
          );
        }

        const { status, statusText, data } = error.response as {
          status: number;
          statusText: string;
          data?: any;
        };
        
        const detail = typeof data?.detail === "string" ? data.detail : undefined;
        const message =
          detail ||
          (typeof data?.message === "string" ? data.message : undefined) ||
          `HTTP ${status}: ${statusText}`;
        return Promise.reject(new Error(message));
      }
    );
  }

  // public API
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

  // 🔑 single bridge between auth & api
  setTokenGetter(getter: () => string | null) {
    this.getToken = getter;
  }
}

export const api = new ApiClient(
  config.api.baseUrl,
  config.api.timeout
);
