import { useEffect, useMemo, useState } from "react";
import type { Device } from "@/types/dashboard";
import { devicesApi } from "../api/devicesApi";
import { wsManager, type WSEvent } from "../../../services/ws";

export function useDevicesTable(initialPageSize = 5) {
  const [queryValue, setQueryValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [devices, setDevices] = useState<Device[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [refreshIndex, setRefreshIndex] = useState(0);

  const setQuery = (value: string) => {
    setCurrentPage(1);
    setQueryValue(value);
  };

  useEffect(() => {
    let cancelled = false;

    const fetchDevices = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await devicesApi.list({
          page: currentPage,
          page_size: pageSize,
          search: queryValue,
        });
        if (cancelled) return;
        setDevices(res.items);
        setTotal(res.total);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load devices";
        setError(message);
        setDevices([]);
        setTotal(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDevices();
    return () => {
      cancelled = true;
    };
  }, [queryValue, currentPage, pageSize, refreshIndex]);

  // subscribe to device channel for real-time updates
  useEffect(() => {
    const unsub = wsManager.on("device", (_event: WSEvent<any>) => {
      // any device event triggers a refresh
      setRefreshIndex((n) => n + 1);
    });

    return () => {
      unsub();
    };
  }, []);

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
    loading,
    error,
  } as const;
}
