export type ListParams = {
  page?: number;
  page_size?: number;
  search?: string;
};

export const buildListParams = ({ page = 1, page_size = 10, search }: ListParams) => {
  const params: Record<string, string> = {
    page: String(page),
    page_size: String(page_size),
  };
  const trimmed = search?.trim();
  if (trimmed) params.search = trimmed;
  return params;
};

type NameSearchParams = {
  name: string;
  limit?: number;
};

export const buildNameSearchParams = ({ name, limit = 10 }: NameSearchParams) => {
  const trimmed = name.trim();
  if (!trimmed) return null;
  return {
    name: trimmed,
    limit: String(limit),
  };
};

type DepartmentSearchParams = {
  name: string;
  customer_id?: number | null;
  limit?: number;
};

export const buildDepartmentSearchParams = ({ name, customer_id, limit = 10 }: DepartmentSearchParams) => {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const params: Record<string, string> = {
    name: trimmed,
    limit: String(limit),
  };
  if (customer_id != null) params.customer_id = String(customer_id);
  return params;
};
