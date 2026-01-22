import { api } from "@/services/api";
import type { Device, DeviceListResponse } from "@/types/device";

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

  async create(payload: { name: string; uid: string; department_id: number; machine?: string | null; data_interval: number }) {
    return api.post<Device>("/devices/", payload);
  },

  async update(
    deviceId: number,
    payload: Partial<{
      name: string;
      machine: string | null;
      data_interval: number;
      department_id: number | null;
      is_online: boolean;
      is_active: boolean;
      dashboard_config: {
        data_panel_fields?: string[];
        data_panel_config?: Record<string, { label?: string; unit?: string }>;
        data_chart_items?: Array<{
          id: string;
          type: "meter" | "line" | "bar";
          field: string;
          name?: string | null;
        }>;
        data_chart_layout?: Array<{
          i: string;
          x: number;
          y: number;
          w: number;
          h: number;
          minW?: number;
          minH?: number;
        }>;
      } | null;
    }>
  ) {
    return api.patch<Device>(`/devices/${deviceId}`, payload);
  },

  async latestData(deviceUid: string) {
    return api.get<Record<string, unknown> | null>(`/devices/data/${deviceUid}/latest`);
  },

  async remove(deviceId: number) {
    return api.delete<void>(`/devices/${deviceId}`);
  },
};
