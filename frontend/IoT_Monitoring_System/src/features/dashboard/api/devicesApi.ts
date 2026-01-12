import { api } from "@/services/api";
import type { DeviceListResponse } from "@/types/dashboard";

type ListParams = {
  page?: number;
  page_size?: number;
  search?: string;
};

export const devicesApi = {
  async list({ page = 1, page_size = 10, search }: ListParams) {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(page_size),
    });

    if (search && search.trim()) {
      params.set("search", search.trim());
    }

    return api.get<DeviceListResponse>(`/devices/?${params.toString()}`);
  },
};
