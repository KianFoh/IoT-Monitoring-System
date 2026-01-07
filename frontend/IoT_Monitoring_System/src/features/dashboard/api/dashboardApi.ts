import { api } from "@/services/api";

export interface DashboardDevice {
    id: number;
    name: string;
    uid: string;
    is_online: boolean;
    customer_name: string;
    department_name: string;
    last_seen?: string;
}

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

    getRecentDevices: async (limit: number): Promise<DashboardDevice[]> => {
        return api.get<DashboardDevice[]>(`/devices/recent?limit=${limit}`);
    },
};