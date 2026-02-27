import { api } from "@/services/api";
import type { DashboardOverviewDevice } from "@/types/dashboard";

const PATHS = {
  customers: "/customers",
  devices: "/devices",
  users: "/users",
  mqttUsers: "/mqtt_users",
};

export const dashboardApi = {
  getCounts: async (): Promise<{ customers: number; devices: number; users: number; mqttUsers: number }> => {
    const [customers, devices, users, mqttUsers] = await Promise.all([
      api.get<number>(`${PATHS.customers}/count`),
      api.get<number>(`${PATHS.devices}/count`),
      api.get<number>(`${PATHS.users}/count`),
      api.get<number>(`${PATHS.mqttUsers}/count`),
    ]);

    return { customers, devices, users, mqttUsers };
  },

  getRecentDevices: async (limit: number): Promise<DashboardOverviewDevice[]> => {
    return api.get<DashboardOverviewDevice[]>(`${PATHS.devices}/recent`, { params: { limit } });
  },
};
