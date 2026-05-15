export type DisplayOption<T extends string> = {
  value: T;
  label: string;
};

export type DataFieldType = "number" | "text" | "list" | "boolean";

export type ChartType = "meter" | "line" | "area" | "pie" | "stat" | "bar" | "button";

export type BarOrientation = "horizontal" | "vertical";

export type LineListMode = "single" | "multi";

export type LineGranularity = "sec" | "minute" | "hour" | "day" | "week" | "month" | "year";

export type ChartFilterMode = "raw" | "range" | "custom";

export type ChartRangePreset =
  | "last_1_min"
  | "last_1_hour"
  | "last_1_day"
  | "last_1_week"
  | "last_1_month"
  | "last_1_year";

export type ChartItemConfig = {
  id: string;
  type: ChartType;
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
  bar_orientation?: BarOrientation | null;
  bar_race_mode?: boolean | null;
  pie_show_labels?: boolean | null;
  line_list_mode?: LineListMode | null;
  line_smooth?: boolean | null;
  output_value_type?: "boolean" | "multi" | null;
};

export type ChartLayoutItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  isResizable?: boolean;
  isDraggable?: boolean;
  static?: boolean;
  maxW?: number;
};

export type ChartSection = {
  id: string;
  name: string;
  collapsed?: boolean;
};

export type ChartItem = {
  id: string;
  type: ChartType;
  field: string;
  name: string;
  min?: number;
  max?: number;
  tick_count?: number;
  value_decimals?: number;
  stat_font_size?: number;
  value_cases?: string[];
  fields?: string[];
  section_id?: string | null;
  bar_orientation?: BarOrientation;
  bar_race_mode?: boolean;
  pie_show_labels?: boolean;
  line_list_mode?: LineListMode;
  line_smooth?: boolean;
  output_value_type?: "boolean" | "multi";
};

export type DeviceDataChartProps<T extends string> = {
  displayMode: T;
  options: DisplayOption<T>[];
  onDisplayChange: (value: T) => void;
  deviceUid: string;
  dataIntervalSeconds?: number | null;
  disabled?: boolean;
  readOnly?: boolean;
  allowOutputControl?: boolean;
  availableFields: string[];
  getChartValue?: (field: string) => unknown;
  getChartUnit?: (field: string) => string;
  getChartLabel?: (field: string) => string;
  getChartType?: (field: string) => DataFieldType;
  getChartColor?: (field: string) => string;
  getChartCases?: (field: string) => string[] | null | undefined;
  getChartCaseColors?: (field: string) => Record<string, string> | null | undefined;
  getChartBooleanColors?: (
    field: string
  ) => { trueColor?: string; falseColor?: string } | null | undefined;
  getChartBooleanLabels?: (
    field: string
  ) => { trueLabel?: string; falseLabel?: string } | null | undefined;
  onOutputSend?: (field: string, value: string | number | boolean) => void;
  onFilterModeChange?: (value: ChartFilterMode) => void;
  rawTimestamp?: Date | null;
  savedCharts?: ChartItemConfig[];
  savedLayout?: ChartLayoutItem[];
  savedSections?: ChartSection[];
  onSave?: (
    charts: ChartItemConfig[],
    layout: ChartLayoutItem[],
    sections: ChartSection[]
  ) => Promise<void>;
  saving?: boolean;
  saveError?: string | null;
};
