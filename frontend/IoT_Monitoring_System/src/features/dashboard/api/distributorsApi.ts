import { api } from "@/services/api";
import type { Distributor, DistributorListResponse, DistributorSearch } from "@/types/distributor";
import { buildListParams, buildNameSearchParams, type ListParams } from "./apiHelpers";

const BASE_PATH = "/distributors";

export const distributorsApi = {
  async list(params: ListParams) {
    return api.get<DistributorListResponse>(`${BASE_PATH}/`, { params: buildListParams(params) });
  },

  async search({ name, limit = 10 }: { name: string; limit?: number }) {
    const params = buildNameSearchParams({ name, limit });
    if (!params) return [];
    return api.get<DistributorSearch[]>(`${BASE_PATH}/search`, { params });
  },

  async create(payload: {
    name: string;
    subdomain?: string | null;
    mqtt_topic?: string | null;
    phone_no?: string | null;
    logo_url?: string | null;
  }) {
    return api.post<Distributor>(`${BASE_PATH}/`, payload);
  },

  async update(
    id: number,
    payload: {
      name?: string;
      subdomain?: string | null;
      mqtt_topic?: string | null;
      phone_no?: string | null;
      logo_url?: string | null;
      is_active?: boolean;
    }
  ) {
    return api.patch<Distributor>(`${BASE_PATH}/${id}`, payload);
  },

  async uploadLogo(id: number, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<Distributor>(`${BASE_PATH}/${id}/logo`, formData);
  },

  async removeLogo(id: number) {
    return api.delete<Distributor>(`${BASE_PATH}/${id}/logo`);
  },

  async remove(id: number) {
    return api.delete<void>(`${BASE_PATH}/${id}`);
  },
};
