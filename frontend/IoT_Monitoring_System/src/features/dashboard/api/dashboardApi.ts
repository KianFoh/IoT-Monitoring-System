import { api } from "@/services/api";

export const dashboardApi = {
    getCustomerCounts: async () => {
        return api.get<{ valid: boolean }>("/customers/count");
    },

    getDeviceCounts: async () => {
        return api.get<{ valid: boolean }>("/devices/count");
    },

    getUserCounts: async () => {
        return api.get<{ valid: boolean }>("/users/count");
    },

    getMqttUserCounts: async () => {
        return api.get<{ valid: boolean }>("/mqtt_users/count");
    },
};