import { useEffect, useMemo, useState } from "react";
import type { Device } from "@/types/dashboard";

export function useDevicesTable(initialData: Device[], initialPageSize = 5) {
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filtered = useMemo(() => {
    if (!query.trim()) return initialData;
    const q = query.toLowerCase();
    return initialData.filter(
      (d) =>
        String(d.uid).toLowerCase().includes(q) ||
        String(d.name ?? "").toLowerCase().includes(q) ||
        String((d as any).customer_name ?? "").toLowerCase().includes(q) ||
        String((d as any).department_name ?? "").toLowerCase().includes(q)
    );
  }, [initialData, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [currentPage, totalPages]);

  // Reset to first page when query or pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query, pageSize]);

  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return {
    query,
    setQuery,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    filtered,
    pagedData,
    totalPages,
  } as const;
}
