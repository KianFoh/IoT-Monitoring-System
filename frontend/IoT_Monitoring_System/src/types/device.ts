export interface Device {
  id: number;
  name: string;
  uid: string;
  is_online: boolean;
  department_name?: string | null;
  customer_name?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DeviceListResponse {
  items: Device[];
  total: number;
  page: number;
  page_size: number;
}
