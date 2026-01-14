import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { wsManager, type WSEvent } from "../../../services/ws";
import { dashboardApi } from "../api/dashboardApi";
import type { DashboardStats } from "@/types/dashboard";
import type { DashboardOverviewDevice } from "@/types/dashboard";

export type Device = DashboardOverviewDevice;

const DEFAULT_STATS: DashboardStats = {
  totalCustomers: 0,
  totalDevices: 0,
  totalUsers: 0,
  mqttUsers: 0,
};

export const useDashboardOverview = () => {
  const devices_limit = 6;
  const queryClient = useQueryClient();

  const { data, isPending, error } = useQuery({
    refetchOnMount: true,
    queryKey: ["dashboard", "overview"],
    queryFn: async () => {
      const [{ customers, devices: devicesCount, users, mqttUsers }, devicesData] = await Promise.all([
        dashboardApi.getCounts(),
        dashboardApi.getRecentDevices(devices_limit),
      ]);

      return {
        stats: {
          totalCustomers: customers,
          totalDevices: devicesCount,
          totalUsers: users,
          mqttUsers: mqttUsers,
        },
        devices: devicesData,
      };
    },
  });

  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    unsubscribers.push(
      wsManager.on("customer", (event: WSEvent) => {
        queryClient.setQueryData<{ stats: DashboardStats; devices: Device[] } | undefined>(
          ["dashboard", "overview"],
          (current) => {
            const base = current ?? { stats: DEFAULT_STATS, devices: [] };
            if (event.type === "add") return { ...base, stats: { ...base.stats, totalCustomers: base.stats.totalCustomers + 1 } };
            if (event.type === "delete")
              return { ...base, stats: { ...base.stats, totalCustomers: Math.max(0, base.stats.totalCustomers - 1) } };
            return base;
          }
        );
      })
    );

    unsubscribers.push(
      wsManager.on("device", async (event: WSEvent<any>) => {
        queryClient.setQueryData<{ stats: DashboardStats; devices: Device[] } | undefined>(
          ["dashboard", "overview"],
          (current) => {
            const base = current ?? { stats: DEFAULT_STATS, devices: [] };
            if (event.type === "add") return { ...base, stats: { ...base.stats, totalDevices: base.stats.totalDevices + 1 } };
            if (event.type === "delete")
              return { ...base, stats: { ...base.stats, totalDevices: Math.max(0, base.stats.totalDevices - 1) } };
            return base;
          }
        );

        try {
          const refreshed = await dashboardApi.getRecentDevices(devices_limit);
          queryClient.setQueryData<{ stats: DashboardStats; devices: Device[] } | undefined>(
            ["dashboard", "overview"],
            (current) => {
              const base = current ?? { stats: DEFAULT_STATS, devices: [] };
              return { ...base, devices: refreshed };
            }
          );
        } catch (err) {
          console.error("[Dashboard] Failed to refetch recent devices after device event", err);
        }
      })
    );

    unsubscribers.push(
      wsManager.on("user", (event: WSEvent) => {
        queryClient.setQueryData<{ stats: DashboardStats; devices: Device[] } | undefined>(
          ["dashboard", "overview"],
          (current) => {
            const base = current ?? { stats: DEFAULT_STATS, devices: [] };
            if (event.type === "add") return { ...base, stats: { ...base.stats, totalUsers: base.stats.totalUsers + 1 } };
            if (event.type === "delete")
              return { ...base, stats: { ...base.stats, totalUsers: Math.max(0, base.stats.totalUsers - 1) } };
            return base;
          }
        );
      })
    );

    unsubscribers.push(
      wsManager.on("mqtt_user", (event: WSEvent) => {
        queryClient.setQueryData<{ stats: DashboardStats; devices: Device[] } | undefined>(
          ["dashboard", "overview"],
          (current) => {
            const base = current ?? { stats: DEFAULT_STATS, devices: [] };
            if (event.type === "add") return { ...base, stats: { ...base.stats, mqttUsers: base.stats.mqttUsers + 1 } };
            if (event.type === "delete")
              return { ...base, stats: { ...base.stats, mqttUsers: Math.max(0, base.stats.mqttUsers - 1) } };
            return base;
          }
        );
      })
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [queryClient]);

  return {
    stats: data?.stats ?? DEFAULT_STATS,
    devices: data?.devices ?? [],
    loading: isPending,
    error: error instanceof Error ? error.message : null,
  };
};
