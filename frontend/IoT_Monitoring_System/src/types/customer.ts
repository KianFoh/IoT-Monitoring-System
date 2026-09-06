export interface Customer {
  id: number;
  name: string;
  mqtt_topic: string;
  phone_no: string | null;
  distributor_id?: number | null;
  distributor_name?: string | null;
  is_active: boolean;
  created_at: string;
  is_deletable: boolean;
}

export interface CustomerListResponse {
  items: Customer[];
  total: number;
  page: number;
  page_size: number;
}

export interface CustomerSearch {
  id: number;
  name: string;
}
