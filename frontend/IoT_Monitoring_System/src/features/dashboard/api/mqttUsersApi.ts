import { api } from "@/services/api";
import type { MqttUser, MqttUserListResponse } from "@/types/mqttUser";
import { buildListParams, type ListParams } from "./apiHelpers";

const BASE_PATH = "/mqtt_users";

export const mqttUsersApi = {
  async list(params: ListParams) {
    return api.get<MqttUserListResponse>(`${BASE_PATH}/`, { params: buildListParams(params) });
  },

  async getWithPassword(id: number) {
    return api.get<MqttUser>(`${BASE_PATH}/${id}`);
  },

  async create(payload: { username: string; password: string; customer_id: number }) {
    return api.post<MqttUser>(`${BASE_PATH}/`, payload);
  },

  async update(id: number, payload: { username?: string; password?: string; is_active?: boolean }) {
    return api.patch<MqttUser>(`${BASE_PATH}/${id}`, payload);
  },

  async remove(id: number) {
    return api.delete<void>(`${BASE_PATH}/${id}`);
  },
};
