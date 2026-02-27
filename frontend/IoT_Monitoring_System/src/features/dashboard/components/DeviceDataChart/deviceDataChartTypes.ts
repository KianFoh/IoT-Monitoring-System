export type DisplayOption<T extends string> = {
  value: T;
  label: string;
};

export type ChartType = "meter" | "line" | "bar";

export type LineGranularity = "sec" | "minute" | "hour" | "day" | "week" | "month" | "year";

export type ChartItemConfig = {
  id: string;
  type: ChartType;
  field: string;
  name?: string | null;
  min?: number | null;
  max?: number | null;
  fields?: string[] | null;
  section_id?: string | null;
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
  fields?: string[];
  section_id?: string | null;
};

export type DeviceDataChartProps<T extends string> = {
  displayMode: T;
  options: DisplayOption<T>[];
  onDisplayChange: (value: T) => void;
  disabled?: boolean;
  readOnly?: boolean;
  availableFields: string[];
  getChartValue?: (field: string) => unknown;
  getChartUnit?: (field: string) => string;
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
