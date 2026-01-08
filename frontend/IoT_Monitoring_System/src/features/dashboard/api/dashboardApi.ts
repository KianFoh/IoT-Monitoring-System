import { api } from "@/services/api";
import type { DashboardOverviewDevice } from "@/types/dashboard";

export const dashboardApi = {
    getCounts: async (): Promise<{ customers: number; devices: number; users: number; mqttUsers: number }> => {
        const [customers, devices, users, mqttUsers] = await Promise.all([
            api.get<number>("/customers/count"),
            api.get<number>("/devices/count"),
            api.get<number>("/users/count"),
            api.get<number>("/mqtt_users/count"),
        ]);

        return { customers, devices, users, mqttUsers };
    },

    getRecentDevices: async (limit: number): Promise<DashboardOverviewDevice[]> => {
        return api.get<DashboardOverviewDevice[]>(`/devices/recent?limit=${limit}`);
    },
};