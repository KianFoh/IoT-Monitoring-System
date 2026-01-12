import { useEffect, useState } from "react";
import { wsManager, type WSEvent } from "../../../services/ws";
import { dashboardApi } from "../api/dashboardApi";
import { useAuth } from "../../auth/context/AuthContext";
import type { DashboardStats } from "@/types/dashboard";
import type { DashboardOverviewDevice } from "@/types/dashboard";


export type Device = DashboardOverviewDevice;

export const useDashboardOverview = () => {

  const devices_limit = 6;
  const { access_token, isAuthChecked } = useAuth();

  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalDevices: 0,
    totalUsers: 0,
    mqttUsers: 0,
  });
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data after auth check, then listen for WS updates
  useEffect(() => {
    if (!isAuthChecked || !access_token) return;

    let isMounted = true;
    const unsubscribers: Array<() => void> = [];

    const setup = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("[Dashboard] Fetching API stats...");
        const [{ customers, devices: devicesCount, users, mqttUsers }, devicesData] = await Promise.all([
          dashboardApi.getCounts(),
          dashboardApi.getRecentDevices(devices_limit),
        ]); 

        if (!isMounted) return;

        setStats({
          totalCustomers: customers,
          totalDevices: devicesCount,
          totalUsers: users,
          mqttUsers: mqttUsers,
        });
        setDevices(devicesData);
        // Setup WS listeners

        unsubscribers.push(
          wsManager.on("customer", (event: WSEvent) => {
            setStats((prev) => {
              if (event.type === "add") return { ...prev, totalCustomers: prev.totalCustomers + 1 };
              if (event.type === "delete") return { ...prev, totalCustomers: Math.max(0, prev.totalCustomers - 1) };
              return prev;
            });
          })
        );

        unsubscribers.push(
          wsManager.on("device", async (event: WSEvent<any>) => {
            // Keep counts in sync for add/delete
            setStats((prev) => {
              if (event.type === "add") return { ...prev, totalDevices: prev.totalDevices + 1 };
              if (event.type === "delete") return { ...prev, totalDevices: Math.max(0, prev.totalDevices - 1) };
              return prev;
            });

            // Simple approach: always refetch the recent devices list
            try {
              const refreshed = await dashboardApi.getRecentDevices(devices_limit);
              setDevices(refreshed);
            } catch (e) {
              console.error("[Dashboard] Failed to refetch recent devices after device event", e);
            }
          })
        );

        unsubscribers.push(
          wsManager.on("user", (event: WSEvent) => {
            setStats((prev) => {
              if (event.type === "add") return { ...prev, totalUsers: prev.totalUsers + 1 };
              if (event.type === "delete") return { ...prev, totalUsers: Math.max(0, prev.totalUsers - 1) };
              return prev;
            });
          })
        );

        unsubscribers.push(
          wsManager.on("mqtt_user", (event: WSEvent) => {
            setStats((prev) => {
              if (event.type === "add") return { ...prev, mqttUsers: prev.mqttUsers + 1 };
              if (event.type === "delete") return { ...prev, mqttUsers: Math.max(0, prev.mqttUsers - 1) };
              return prev;
            });
          })
        );

        if (!isMounted) {
          unsubscribers.forEach((unsub) => unsub());
          return;
        }

        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : "Failed to setup dashboard";
        setError(message);
        console.error("Failed to setup dashboard:", err);
        setLoading(false);
      }
    };

    setup();

    return () => {
      isMounted = false;
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [isAuthChecked, access_token]);

  return { stats, devices, loading, error };
};
