import { api } from "@/services/api";
import type { Device, DeviceDashboardConfig, DeviceListResponse } from "@/types/device";
import { buildListParams, type ListParams } from "./apiHelpers";

const BASE_PATH = "/devices";

export type DeviceListParams = ListParams & {
  distributor_ids?: number[];
  customer_ids?: number[];
  department_ids?: number[];
};

const buildDeviceListParams = (params: DeviceListParams) => {
  const listParams = buildListParams(params);
  if (params.distributor_ids?.length) {
    listParams.distributor_ids = params.distributor_ids.join(",");
  }
  if (params.customer_ids?.length) {
    listParams.customer_ids = params.customer_ids.join(",");
  }
  if (params.department_ids?.length) {
    listParams.department_ids = params.department_ids.join(",");
  }
  return listParams;
};

export const devicesApi = {
  async list(params: DeviceListParams) {
    return api.get<DeviceListResponse>(`${BASE_PATH}/`, { params: buildDeviceListParams(params) });
  },

  async create(payload: {
    name: string;
    uid: string;
    machine_series_number?: string | null;
    installation_date?: string | null;
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
      machine_series_number: string | null;
      installation_date: string | null;
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
      tz_offset?: number;
    }
  ) {
    return api.get<Array<Record<string, unknown>>>(`${BASE_PATH}/data/${deviceUid}`, { params });
  },

  async remove(deviceId: number) {
    return api.delete<void>(`${BASE_PATH}/${deviceId}`);
  },
};
