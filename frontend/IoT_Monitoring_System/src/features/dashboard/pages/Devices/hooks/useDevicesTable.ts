import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { DeviceListResponse } from "@/types/device";
import { devicesApi } from "../../../api/devicesApi";
import { wsManager, type WSEvent } from "@/services/ws";

export function useDevicesTable(initialPageSize = 5) {
  const [queryValue, setQueryValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const queryClient = useQueryClient();

  const setQuery = (value: string) => {
    setCurrentPage(1);
    setQueryValue(value);
  };

  const { data, isPending, error } = useQuery<DeviceListResponse, Error>({
    queryKey: ["devices", "list", { page: currentPage, pageSize, query: queryValue }],
    refetchOnMount: true,
    queryFn: async () => {
      return devicesApi.list({
        page: currentPage,
        page_size: pageSize,
        search: queryValue,
      });
    },
    placeholderData: (prev) =>
      prev ?? { items: [], total: 0, page: currentPage, page_size: pageSize },
  });

  useEffect(() => {
    const unsub = wsManager.on("device", (_event: WSEvent<any>) => {
      queryClient.invalidateQueries({ queryKey: ["devices", "list"] });
    });
    return () => unsub();
  }, [queryClient]);

  // Apply device_status updates to cached device lists (update in-place if present)
  useEffect(() => {
    const unsub = wsManager.on("device_status", (event: WSEvent<any>) => {
      const evtType = (event as any).type || (event as any).eventType || (event as any).payload?.type;
      const data = (event as any).data ?? (event as any).payload?.data ?? (event as any).payload ?? (event as any);
      if (evtType !== "status" || !data) return;
      const uid = data.uid;
      const status = typeof data.status === "string" ? data.status.toLowerCase() : null;
      if (!uid || (status !== "online" && status !== "offline")) return;
      const isOnline = status === "online";

      // update all cached "devices","list" queries (different pages / filters)
      const cached = queryClient.getQueriesData({ queryKey: ["devices", "list"] });

      cached.forEach(([queryKey, _value]) => {
        queryClient.setQueryData(queryKey, (current: any) => {
          if (!current || !Array.isArray(current.items)) return current;
          return {
            ...current,
            items: current.items.map((d: any) => (d.uid === uid ? { ...d, is_online: isOnline } : d)),
          };
        });
      });
    });
    return () => unsub();
  }, [queryClient]);

  const total = data?.total ?? 0;
  const devices = data?.items ?? [];

  const totalPages = useMemo(() => {
    if (!pageSize) return 1;
    const pages = Math.ceil(total / pageSize);
    return pages > 0 ? pages : 1;
  }, [total, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return {
    query: queryValue,
    setQuery,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    devices,
    total,
    totalPages,
    loading: isPending,
    error: error instanceof Error ? error.message : null,
  } as const;
}
