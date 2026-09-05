import { api } from "@/services/api";
import type { User, UserListResponse, UserRole } from "@/types/user";
import { buildListParams, type ListParams } from "./apiHelpers";

const BASE_PATH = "/users";

export type UserListParams = ListParams & {
  distributor_ids?: number[];
  customer_ids?: number[];
  department_ids?: number[];
};

const buildUserListParams = (params: UserListParams) => {
  const listParams = buildListParams(params);
  if (params.distributor_ids?.length) {
    listParams.distributor_ids = params.distributor_ids.join(",");
  }
  if (params.customer_ids?.length) {
    listParams.customer_ids = params.customer_ids.join(",");
  }
  if (params.department_ids?.length) {
    listParams.department_ids = params.department_ids.join(",");
  }
  return listParams;
};

export const usersApi = {
  async list(params: UserListParams) {
    return api.get<UserListResponse>(`${BASE_PATH}/`, { params: buildUserListParams(params) });
  },

  async create(payload: { email: string; department_id?: number; department_ids?: number[]; role: UserRole }) {
    return api.post<User>(`${BASE_PATH}/`, payload);
  },

  async update(
    id: number,
    payload: {
      email?: string;
      role?: UserRole;
      is_verified?: boolean;
      is_active?: boolean;
      department_id?: number;
      department_ids?: number[];
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
