import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/context/AuthContext";
import { devicesApi } from "../../../api/devicesApi";
import type { Device } from "@/types/device";
import { wsManager, type WSEvent } from "@/services/ws";

type UserDashboardStats = {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
};

type UserDashboardOverview = {
  stats: UserDashboardStats;
  devices: Device[];
  allDevices: Device[];
};

const DEFAULT_STATS: UserDashboardStats = {
  totalDevices: 0,
  onlineDevices: 0,
  offlineDevices: 0,
};

const EMPTY_OVERVIEW: UserDashboardOverview = {
  stats: DEFAULT_STATS,
  devices: [],
  allDevices: [],
};

const PAGE_SIZE = 100;
const RECENT_LIMIT = 6;

const fetchAllDevices = async (): Promise<Device[]> => {
  const first = await devicesApi.list({ page: 1, page_size: PAGE_SIZE });
  const items = [...(first.items ?? [])];
  const total = first.total ?? items.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (totalPages <= 1) {
    return items;
  }

  const remainingPages = Array.from({ length: totalPages - 1 }, (_, idx) => idx + 2);
  const responses = await Promise.all(
    remainingPages.map((page) => devicesApi.list({ page, page_size: PAGE_SIZE }))
  );
  responses.forEach((response) => {
    if (response?.items?.length) {
      items.push(...response.items);
    }
  });

  return items;
};

const buildStats = (devices: Device[]): UserDashboardStats => {
  const totalDevices = devices.length;
  const onlineDevices = devices.filter((device) => device.is_online).length;
  return {
    totalDevices,
    onlineDevices,
    offlineDevices: Math.max(0, totalDevices - onlineDevices),
  };
};

const getRecentDevices = (devices: Device[]): Device[] => {
  return [...devices]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, RECENT_LIMIT);
};

export const useUserDashboardOverview = (enabled = true) => {
  const { user } = useAuth();
  const departmentId = user?.department_id ?? null;
  const isEnabled = enabled && Boolean(user);
  const queryClient = useQueryClient();

  const { data, isPending, error } = useQuery<UserDashboardOverview>({
    queryKey: ["dashboard", "overview", "user", departmentId],
    enabled: isEnabled,
    queryFn: async () => {
      if (!departmentId) {
        return EMPTY_OVERVIEW;
      }
      const devices = await fetchAllDevices();
      return {
        stats: buildStats(devices),
        devices: getRecentDevices(devices),
        allDevices: devices,
      };
    },
    placeholderData: (prev) => prev ?? EMPTY_OVERVIEW,
  });

  useEffect(() => {
    if (!isEnabled) return;
    const queryKey = ["dashboard", "overview", "user", departmentId];
    const unsub = wsManager.on("device", () => {
      queryClient.invalidateQueries({ queryKey });
    });
    return () => unsub();
  }, [queryClient, departmentId, isEnabled]);

  useEffect(() => {
    if (!isEnabled) return;
    const queryKey = ["dashboard", "overview", "user", departmentId];
    const unsub = wsManager.on("device_status", (event: WSEvent<any>) => {
      const evtType = (event as any).type || (event as any).eventType || (event as any).payload?.type;
      const payload = (event as any).data ?? (event as any).payload?.data ?? (event as any).payload ?? event;
      if (evtType !== "status" || !payload) return;
      const uid = payload.uid;
      const status = typeof payload.status === "string" ? payload.status.toLowerCase() : null;
      if (!uid || (status !== "online" && status !== "offline")) return;
      const isOnline = status === "online";

      queryClient.setQueryData<UserDashboardOverview | undefined>(queryKey, (current) => {
        if (!current || !current.allDevices.length) return current;
        const deviceIndex = current.allDevices.findIndex((device) => device.uid === uid);
        if (deviceIndex === -1) return current;

        const prevDevice = current.allDevices[deviceIndex];
        if (prevDevice.is_online === isOnline) {
          return current;
        }

        const nextAllDevices = [...current.allDevices];
        nextAllDevices[deviceIndex] = { ...prevDevice, is_online: isOnline };

        const nextDevices = current.devices.map((device) =>
          device.uid === uid ? { ...device, is_online: isOnline } : device
        );

        const nextStats = (() => {
          let onlineDevices = current.stats.onlineDevices;
          let offlineDevices = current.stats.offlineDevices;
          if (isOnline) {
            onlineDevices += 1;
            offlineDevices -= 1;
          } else {
            onlineDevices -= 1;
            offlineDevices += 1;
          }
          if (onlineDevices < 0) onlineDevices = 0;
          if (offlineDevices < 0) offlineDevices = 0;
          return {
            ...current.stats,
            onlineDevices,
            offlineDevices,
          };
        })();

        return {
          ...current,
          stats: nextStats,
          devices: nextDevices,
          allDevices: nextAllDevices,
        };
      });
    });

    return () => unsub();
  }, [queryClient, departmentId, isEnabled]);

  return {
    stats: data?.stats ?? DEFAULT_STATS,
    devices: data?.devices ?? [],
    loading: isEnabled ? isPending : false,
    error: isEnabled && error instanceof Error ? error.message : null,
  } as const;
};
