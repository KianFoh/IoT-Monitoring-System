import { api } from "@/services/api";
import type { Customer, CustomerListResponse, CustomerSearch } from "@/types/customer";
import { buildListParams, buildNameSearchParams, type ListParams } from "./apiHelpers";

const BASE_PATH = "/customers";

export type CustomerListParams = ListParams & {
  distributor_ids?: number[];
};

const buildCustomerListParams = (params: CustomerListParams) => {
  const listParams = buildListParams(params);
  if (params.distributor_ids?.length) {
    listParams.distributor_ids = params.distributor_ids.join(",");
  }
  return listParams;
};

export const customersApi = {
  async list(params: CustomerListParams) {
    return api.get<CustomerListResponse>(`${BASE_PATH}/`, { params: buildCustomerListParams(params) });
  },

  async search({ name, limit = 10 }: { name: string; limit?: number }) {
    const params = buildNameSearchParams({ name, limit });
    if (!params) return [];
    return api.get<CustomerSearch[]>(`${BASE_PATH}/search`, { params });
  },

  async create(payload: { name: string; phone_no?: string | null; distributor_id?: number | null }) {
    return api.post<Customer>(`${BASE_PATH}/`, payload);
  },

  async update(
    id: number,
    payload: { name?: string; phone_no?: string | null; is_active?: boolean; distributor_id?: number | null }
  ) {
    return api.patch<Customer>(`${BASE_PATH}/${id}`, payload);
  },

  async remove(id: number) {
    return api.delete<void>(`${BASE_PATH}/${id}`);
  },
};
