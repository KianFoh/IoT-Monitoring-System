import { api } from "@/services/api";
import type { User, UserListResponse, UserRole } from "@/types/user";

type ListParams = {
  page?: number;
  page_size?: number;
  search?: string;
};

export const usersApi = {
  async list({ page = 1, page_size = 10, search }: ListParams) {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(page_size),
    });
    if (search && search.trim()) params.set("search", search.trim());
    return api.get<UserListResponse>(`/users/?${params.toString()}`);
  },

  async create(payload: { email: string; department_id: number; role: UserRole }) {
    return api.post<User>("/users/", payload);
  },

  async update(id: number, payload: { email?: string; role?: UserRole; is_verified?: boolean; is_active?: boolean }) {
    return api.patch<User>(`/users/${id}`, payload);
  },

  async remove(id: number) {
    return api.delete<void>(`/users/${id}`);
  },
};
