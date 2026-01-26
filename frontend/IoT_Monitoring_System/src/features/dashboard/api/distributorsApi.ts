import { api } from "@/services/api";
import type { Distributor, DistributorListResponse, DistributorSearch } from "@/types/distributor";

type ListParams = {
  page?: number;
  page_size?: number;
  search?: string;
};

export const distributorsApi = {
  async list({ page = 1, page_size = 10, search }: ListParams) {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(page_size),
    });
    if (search && search.trim()) params.set("search", search.trim());
    return api.get<DistributorListResponse>(`/distributors/?${params.toString()}`);
  },

  async search({ name, limit = 10 }: { name: string; limit?: number }) {
    const trimmed = name.trim();
    if (!trimmed) return [];
    const params = new URLSearchParams({
      name: trimmed,
      limit: String(limit),
    });
    return api.get<DistributorSearch[]>(`/distributors/search?${params.toString()}`);
  },

  async create(payload: { name: string; phone_no?: string | null }) {
    return api.post<Distributor>("/distributors/", payload);
  },

  async update(id: number, payload: { name?: string; phone_no?: string | null; is_active?: boolean }) {
    return api.patch<Distributor>(`/distributors/${id}`, payload);
  },

  async remove(id: number) {
    return api.delete<void>(`/distributors/${id}`);
  },
};
