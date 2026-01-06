import { useEffect, useState } from "react";
import { api } from "../../../services/api";

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
  
  return { stats, loading, error };
};
