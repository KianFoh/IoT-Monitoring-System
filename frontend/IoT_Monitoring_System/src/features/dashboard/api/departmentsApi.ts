import { api } from "@/services/api";
import type { Department, DepartmentListResponse, DepartmentSearch } from "@/types/department";
import { buildDepartmentSearchParams, buildListParams, type ListParams } from "./apiHelpers";

const BASE_PATH = "/departments";

export const departmentsApi = {
  async list(params: ListParams) {
    return api.get<DepartmentListResponse>(`${BASE_PATH}/`, { params: buildListParams(params) });
  },

  async create(payload: { name: string; customer_id: number }) {
    return api.post<Department>(`${BASE_PATH}/`, payload);
  },

  async search({ name, customer_id, limit = 10 }: { name: string; customer_id?: number | null; limit?: number }) {
    const params = buildDepartmentSearchParams({ name, customer_id, limit });
    if (!params) return [];
    return api.get<DepartmentSearch[]>(`${BASE_PATH}/search`, { params });
  },

  async update(id: number, payload: { name?: string; is_active?: boolean }) {
    return api.patch<Department>(`${BASE_PATH}/${id}`, payload);
  },

  async remove(id: number) {
    return api.delete<void>(`${BASE_PATH}/${id}`);
  },
};
