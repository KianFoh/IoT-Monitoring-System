import { api } from "@/services/api";
import type { MqttUser, MqttUserListResponse } from "@/types/mqttUser";

type ListParams = {
  page?: number;
  page_size?: number;
  search?: string;
};

export const mqttUsersApi = {
  async list({ page = 1, page_size = 10, search }: ListParams) {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(page_size),
    });
    if (search && search.trim()) params.set("search", search.trim());
    return api.get<MqttUserListResponse>(`/mqtt_users/?${params.toString()}`);
  },

  async getWithPassword(id: number) {
    return api.get<MqttUser>(`/mqtt_users/${id}`);
  },

  async create(payload: { username: string; password: string; customer_id: number }) {
    return api.post<MqttUser>("/mqtt_users/", payload);
  },

  async update(id: number, payload: { username?: string; password?: string; is_active?: boolean }) {
    return api.patch<MqttUser>(`/mqtt_users/${id}`, payload);
  },

  async remove(id: number) {
    return api.delete<void>(`/mqtt_users/${id}`);
  },
};
