import { api } from "@/services/api";
import type { Device, DeviceDashboardConfig, DeviceListResponse } from "@/types/device";
import { buildListParams, type ListParams } from "./apiHelpers";

const BASE_PATH = "/devices";

export const devicesApi = {
  async list(params: ListParams) {
    return api.get<DeviceListResponse>(`${BASE_PATH}/`, { params: buildListParams(params) });
  },

  async create(payload: {
    name: string;
    uid: string;
    department_id: number;
    machine?: string | null;
    data_interval: number;
    connectivity?: "wifi" | "cellular";
    mobile_number?: string | null;
    sim_id?: string | null;
  }) {
    return api.post<Device>(`${BASE_PATH}/`, payload);
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
      dashboard_config: DeviceDashboardConfig | null;
      connectivity: "wifi" | "cellular";
      mobile_number: string | null;
      sim_id: string | null;
    }>
  ) {
    return api.patch<Device>(`${BASE_PATH}/${deviceId}`, payload);
  },

  async latestData(deviceUid: string) {
    return api.get<Record<string, unknown> | null>(`${BASE_PATH}/data/${deviceUid}/latest`);
  },

  async data(
    deviceUid: string,
    params?: {
      start?: string;
      end?: string;
      granularity?: string;
    }
  ) {
    return api.get<Array<Record<string, unknown>>>(`${BASE_PATH}/data/${deviceUid}`, { params });
  },

  async remove(deviceId: number) {
    return api.delete<void>(`${BASE_PATH}/${deviceId}`);
  },
};
