import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { wsManager, type WSEvent } from "@/services/ws";
import { dashboardApi } from "../../../api/dashboardApi";
import type { DashboardStats } from "@/types/dashboard";
import type { DashboardOverviewDevice } from "@/types/dashboard";

export type Device = DashboardOverviewDevice;

const DEFAULT_STATS: DashboardStats = {
  totalCustomers: 0,
  totalDevices: 0,
  totalUsers: 0,
  mqttUsers: 0,
};

export const useDashboardOverview = (enabled = true) => {
  const devices_limit = 6;
  const queryClient = useQueryClient();

  const { data, isPending, error } = useQuery({
    refetchOnMount: true,
    enabled,
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
    if (!enabled) return;
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

    unsubscribers.push(
      wsManager.on("device_status", (event: WSEvent<{ type: string; data: { uid: string; status: string } }>) => {
        // Expecting payload like: { type: "status", data: { uid: "...", status: "online" } }
        const evtType = (event as any).type || (event as any).eventType || (event as any).payload?.type;
        const data = (event as any).data ?? (event as any).payload?.data ?? (event as any).payload ?? (event as any);
        if (evtType !== "status" || !data) return;
        const uid = data.uid;
        const status = typeof data.status === "string" ? data.status.toLowerCase() : null;
        if (!uid || (status !== "online" && status !== "offline")) return;

        queryClient.setQueryData<{ stats: DashboardStats; devices: Device[] } | undefined>(
          ["dashboard", "overview"],
          (current) => {
            const base = current ?? { stats: DEFAULT_STATS, devices: [] };
            const devices = base.devices.map((d) => (d.uid === uid ? { ...d, is_online: status === "online" } : d));
            return { ...base, devices };
          }
        );
      })
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [queryClient, enabled]);

  return {
    stats: data?.stats ?? DEFAULT_STATS,
    devices: data?.devices ?? [],
    loading: enabled ? isPending : false,
    error: enabled && error instanceof Error ? error.message : null,
  };
};
