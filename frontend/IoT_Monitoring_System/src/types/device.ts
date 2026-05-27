export type DataFieldType = "number" | "text" | "list" | "boolean";

export type GridLayoutItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

export type DashboardSection = {
  id: string;
  name: string;
  collapsed?: boolean;
};

export type DataPanelFieldConfig = {
  label?: string;
  unit?: string;
  type?: DataFieldType;
  color?: string;
  cases?: string[] | null;
  case_colors?: Record<string, string> | null;
  true_label?: string;
  false_label?: string;
  true_color?: string;
  false_color?: string;
  section_id?: string | null;
};

export type DashboardPanelConfig = {
  fields?: string[];
  config?: Record<string, DataPanelFieldConfig>;
  layout?: GridLayoutItem[];
  sections?: DashboardSection[];
};

export type DashboardChartItem = {
  id: string;
  type: "meter" | "line" | "area" | "pie" | "stat" | "bar" | "button";
  field: string;
  name?: string | null;
  min?: number | null;
  max?: number | null;
  tick_count?: number | null;
  value_decimals?: number | null;
  stat_font_size?: number | null;
  value_cases?: string[] | null;
  fields?: string[] | null;
  section_id?: string | null;
  bar_orientation?: "horizontal" | "vertical" | null;
  bar_race_mode?: boolean | null;
  pie_show_labels?: boolean | null;
  line_list_mode?: "single" | "multi" | null;
  output_value_type?: "boolean" | "multi" | null;
};

export type DashboardChartConfig = {
  items?: DashboardChartItem[];
  layout?: GridLayoutItem[];
  sections?: DashboardSection[];
};

export type DashboardConfig = {
  data_panel?: DashboardPanelConfig;
  data_chart?: DashboardChartConfig;
};

export type LegacyDashboardConfig = {
  data_panel_fields?: string[];
  data_panel_config?: Record<string, DataPanelFieldConfig>;
  data_panel_layout?: GridLayoutItem[];
  data_panel_sections?: DashboardSection[];
  data_chart_items?: DashboardChartItem[];
  data_chart_layout?: GridLayoutItem[];
  data_chart_sections?: DashboardSection[];
};

export type DeviceDashboardConfig = DashboardConfig | LegacyDashboardConfig;

export type DeviceConnectivity = "wifi" | "cellular";

export interface Device {
  id: number;
  name: string;
  uid: string;
  machine?: string | null;
  connectivity: DeviceConnectivity;
  mobile_number?: string | null;
  sim_id?: string | null;
  sub?: string | null;
  pub?: string | null;
  data_interval: number;
  dashboard_config?: DeviceDashboardConfig | null;
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
