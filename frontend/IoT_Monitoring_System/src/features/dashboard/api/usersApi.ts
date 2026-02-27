import { api } from "@/services/api";
import type { User, UserListResponse, UserRole } from "@/types/user";
import { buildListParams, type ListParams } from "./apiHelpers";

const BASE_PATH = "/users";

export const usersApi = {
  async list(params: ListParams) {
    return api.get<UserListResponse>(`${BASE_PATH}/`, { params: buildListParams(params) });
  },

  async create(payload: { email: string; department_id: number; role: UserRole }) {
    return api.post<User>(`${BASE_PATH}/`, payload);
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
    return api.patch<User>(`${BASE_PATH}/${id}`, payload);
  },

  async changePassword(payload: {
    old_password: string;
    new_password: string;
    confirm_password: string;
  }) {
    return api.post<{ message: string }>(`${BASE_PATH}/me/change-password`, payload);
  },

  async uploadProfilePicture(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<User>(`${BASE_PATH}/me/profile-picture`, formData);
  },

  async removeProfilePicture() {
    return api.delete<User>(`${BASE_PATH}/me/profile-picture`);
  },

  async remove(id: number) {
    return api.delete<void>(`${BASE_PATH}/${id}`);
  },
};
