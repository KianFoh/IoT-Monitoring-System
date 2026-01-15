import { api } from "@/services/api";
import type { Customer, CustomerListResponse, CustomerSearch } from "@/types/customer";

type ListParams = {
  page?: number;
  page_size?: number;
  search?: string;
};

export const customersApi = {
  async list({ page = 1, page_size = 10, search }: ListParams) {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(page_size),
    });
    if (search && search.trim()) params.set("search", search.trim());
    return api.get<CustomerListResponse>(`/customers/?${params.toString()}`);
  },

  async search({ name, limit = 10 }: { name: string; limit?: number }) {
    const trimmed = name.trim();
    if (!trimmed) return [];
    const params = new URLSearchParams({
      name: trimmed,
      limit: String(limit),
    });
    return api.get<CustomerSearch[]>(`/customers/search?${params.toString()}`);
  },

  async create(payload: { name: string; phone_no?: string | null }) {
    return api.post<Customer>("/customers/", payload);
  },

  async update(id: number, payload: { name?: string; phone_no?: string | null; is_active?: boolean }) {
    return api.patch<Customer>(`/customers/${id}`, payload);
  },

  async remove(id: number) {
    return api.delete<void>(`/customers/${id}`);
  },
};
