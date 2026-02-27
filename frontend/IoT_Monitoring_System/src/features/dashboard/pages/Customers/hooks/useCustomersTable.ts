import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CustomerListResponse } from "@/types/customer";
import { customersApi } from "../../../api/customersApi";
import { wsManager, type WSEvent } from "@/services/ws";

export function useCustomersTable(initialPageSize = 5) {
  const [queryValue, setQueryValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const queryClient = useQueryClient();

  const setQuery = (value: string) => {
    setCurrentPage(1);
    setQueryValue(value);
  };

  const { data, isPending, error } = useQuery<CustomerListResponse, Error>({
    queryKey: ["customers", "list", { page: currentPage, pageSize, query: queryValue }],
    refetchOnMount: true,
    queryFn: async () =>
      customersApi.list({
        page: currentPage,
        page_size: pageSize,
        search: queryValue,
      }),
    placeholderData: (prev) =>
      prev ?? { items: [], total: 0, page: currentPage, page_size: pageSize },
  });

  useEffect(() => {
    const unsub = wsManager.on("customer", (_event: WSEvent<any>) => {
      queryClient.invalidateQueries({ queryKey: ["customers", "list"] });
    });
    return () => unsub();
  }, [queryClient]);

  useEffect(() => {
    const unsub = wsManager.on("distributor", (_event: WSEvent<any>) => {
      queryClient.invalidateQueries({ queryKey: ["customers", "list"] });
    });
    return () => unsub();
  }, [queryClient]);

  const total = data?.total ?? 0;
  const customers = data?.items ?? [];

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
    customers,
    total,
    totalPages,
    loading: isPending,
    error: error instanceof Error ? error.message : null,
  } as const;
}
