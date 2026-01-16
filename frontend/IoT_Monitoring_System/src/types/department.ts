export interface Department {
  id: number;
  name: string;
  customer_id: number;
  customer_name?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DepartmentListResponse {
  items: Department[];
  total: number;
  page: number;
  page_size: number;
}

export interface DepartmentSearch {
  id: number;
  name: string;
}
