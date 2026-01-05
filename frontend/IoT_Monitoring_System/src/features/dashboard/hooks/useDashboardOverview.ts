import { useEffect, useState } from "react";
import { api } from "../../../services/api";
import { wsManager } from "../../../services/ws";
import type { WSEvent } from "../../../services/ws";

interface DashboardStats {
  totalCustomers: number;
  totalDevices: number;
  totalUsers: number;
  mqttUsers: number;
}

export const useDashboardOverview = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalDevices: 0,
    totalUsers: 0,
    mqttUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial counts from API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const [customers, devices, users, mqttUsers] = await Promise.all([
          api.get<number>("/customers/count"),
          api.get<number>("/devices/count"),
          api.get<number>("/users/count"),
          api.get<number>("/mqtt_users/count"),
        ]);

        setStats({
          totalCustomers: customers,
          totalDevices: devices,
          totalUsers: users,
          mqttUsers: mqttUsers,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch stats";
        setError(message);
        console.error("Failed to fetch dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Setup WebSocket listeners for real-time updates
  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    // Listen to customer events
    const unsubCustomer = wsManager.on("customer", (event: WSEvent) => {
      setStats((prev) => {
        if (event.type === "add") {
          return { ...prev, totalCustomers: prev.totalCustomers + 1 };
        } else if (event.type === "delete") {
          return { ...prev, totalCustomers: Math.max(0, prev.totalCustomers - 1) };
        }
        return prev;
      });
    });
    unsubscribers.push(unsubCustomer);

    // Listen to device events
    const unsubDevice = wsManager.on("device", (event: WSEvent) => {
      setStats((prev) => {
        if (event.type === "add") {
          return { ...prev, totalDevices: prev.totalDevices + 1 };
        } else if (event.type === "delete") {
          return { ...prev, totalDevices: Math.max(0, prev.totalDevices - 1) };
        }
        return prev;
      });
    });
    unsubscribers.push(unsubDevice);

    // Listen to user events
    const unsubUser = wsManager.on("user", (event: WSEvent) => {
      setStats((prev) => {
        if (event.type === "add") {
          return { ...prev, totalUsers: prev.totalUsers + 1 };
        } else if (event.type === "delete") {
          return { ...prev, totalUsers: Math.max(0, prev.totalUsers - 1) };
        }
        return prev;
      });
    });
    unsubscribers.push(unsubUser);

    // Listen to mqtt_user events
    const unsubMqttUser = wsManager.on("mqtt_user", (event: WSEvent) => {
      setStats((prev) => {
        if (event.type === "add") {
          return { ...prev, mqttUsers: prev.mqttUsers + 1 };
        } else if (event.type === "delete") {
          return { ...prev, mqttUsers: Math.max(0, prev.mqttUsers - 1) };
        }
        return prev;
      });
    });
    unsubscribers.push(unsubMqttUser);

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  return { stats, loading, error };
};
