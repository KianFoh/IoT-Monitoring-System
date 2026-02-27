import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { MqttUserListResponse } from "@/types/mqttUser";
import { mqttUsersApi } from "../../../api/mqttUsersApi";
import { wsManager, type WSEvent } from "@/services/ws";

export function useMqttUsersTable(initialPageSize = 5) {
  const [queryValue, setQueryValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const queryClient = useQueryClient();

  const setQuery = (value: string) => {
    setCurrentPage(1);
    setQueryValue(value);
  };

  const { data, isPending, error } = useQuery<MqttUserListResponse, Error>({
    queryKey: ["mqtt_users", "list", { page: currentPage, pageSize, query: queryValue }],
    refetchOnMount: true,
    queryFn: async () =>
      mqttUsersApi.list({
        page: currentPage,
        page_size: pageSize,
        search: queryValue,
      }),
    placeholderData: (prev) =>
      prev ?? { items: [], total: 0, page: currentPage, page_size: pageSize },
  });

  useEffect(() => {
    const unsub = wsManager.on("mqtt_user", (_event: WSEvent<any>) => {
      queryClient.invalidateQueries({ queryKey: ["mqtt_users", "list"] });
    });
    return () => unsub();
  }, [queryClient]);

  const total = data?.total ?? 0;
  const mqttUsers = data?.items ?? [];

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
    mqttUsers,
    total,
    totalPages,
    loading: isPending,
    error: error instanceof Error ? error.message : null,
  } as const;
}
