export interface Device {
  id: number;
  name: string;
  uid: string;
  machine?: string | null;
  data_interval: number;
  dashboard_config?: {
    data_panel_fields?: string[];
    data_panel_config?: Record<string, { label?: string; unit?: string }>;
    data_chart_items?: Array<{
      id: string;
      type: "meter" | "line" | "bar";
      field: string;
      name?: string | null;
    }>;
    data_chart_layout?: Array<{
      i: string;
      x: number;
      y: number;
      w: number;
      h: number;
      minW?: number;
      minH?: number;
    }>;
  } | null;
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
