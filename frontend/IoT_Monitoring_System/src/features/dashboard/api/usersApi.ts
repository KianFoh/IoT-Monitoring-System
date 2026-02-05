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

  async update(
    id: number,
    payload: {
      email?: string;
      role?: UserRole;
      is_verified?: boolean;
      is_active?: boolean;
      username?: string | null;
      profile_picture?: string | null;
      password?: string;
    }
  ) {
    return api.patch<User>(`/users/${id}`, payload);
  },

  async changePassword(payload: {
    old_password: string;
    new_password: string;
    confirm_password: string;
  }) {
    return api.post<{ message: string }>("/users/me/change-password", payload);
  },

  async uploadProfilePicture(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<User>("/users/me/profile-picture", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  async removeProfilePicture() {
    return api.delete<User>("/users/me/profile-picture");
  },

  async remove(id: number) {
    return api.delete<void>(`/users/${id}`);
  },
};
