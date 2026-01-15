import { api } from "@/services/api";
import type { Department, DepartmentListResponse } from "@/types/department";

type ListParams = {
  page?: number;
  page_size?: number;
  search?: string;
};

export const departmentsApi = {
  async list({ page = 1, page_size = 10, search }: ListParams) {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(page_size),
    });
    if (search && search.trim()) params.set("search", search.trim());
    return api.get<DepartmentListResponse>(`/departments/?${params.toString()}`);
  },

  async create(payload: { name: string; customer_id: number }) {
    return api.post<Department>("/departments/", payload);
  },

  async update(id: number, payload: { name?: string; is_active?: boolean }) {
    return api.patch<Department>(`/departments/${id}`, payload);
  },

  async remove(id: number) {
    return api.delete<void>(`/departments/${id}`);
  },
};
