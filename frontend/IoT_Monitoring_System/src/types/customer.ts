export interface Customer {
  id: number;
  name: string;
  phone_no: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CustomerListResponse {
  items: Customer[];
  total: number;
  page: number;
  page_size: number;
}
