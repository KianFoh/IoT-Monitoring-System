import { getCompactor, type ResizeHandleAxis } from "react-grid-layout";
import type { ChartFilterMode, ChartRangePreset, ChartType, LineGranularity, LineListMode } from "../types/deviceDataChartTypes";

export const CHART_OPTIONS: Array<{ value: ChartType; label: string }> = [
  { value: "meter", label: "Meter" },
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
  { value: "pie", label: "Pie" },
  { value: "bar", label: "Bar" },
  { value: "stat", label: "Stat" },
];

export const BAR_ORIENTATION_OPTIONS: Array<{ value: "horizontal" | "vertical"; label: string }> = [
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" },
];

export const LINE_LIST_MODE_OPTIONS: Array<{ value: LineListMode; label: string }> = [
  { value: "single", label: "Single line (total)" },
  { value: "multi", label: "Multi line (per case)" },
];

export const LINE_GRANULARITY_OPTIONS: Array<{ value: LineGranularity; label: string }> = [
  { value: "sec", label: "Second" },
  { value: "minute", label: "Minute" },
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

export const FILTER_MODE_OPTIONS: Array<{ value: ChartFilterMode; label: string }> = [
  { value: "raw", label: "Live" },
  { value: "range", label: "Range" },
  { value: "custom", label: "Custom" },
];

export const RANGE_PRESET_OPTIONS: Array<{ value: ChartRangePreset; label: string }> = [
  { value: "last_1_min", label: "Last 1 min (sec)" },
  { value: "last_1_hour", label: "Last 1 hour (min)" },
  { value: "last_1_day", label: "Last 1 day (hour)" },
  { value: "last_1_week", label: "Last 1 week (day)" },
  { value: "last_1_month", label: "Last 1 month (day)" },
  { value: "last_1_year", label: "Last 1 year (month)" },
];

export const GRID_COLS = 18;
export const GRID_ROW_HEIGHT = 60;
export const DEFAULT_PANEL_SIZE = { w: 4, h: 4 };
export const GRID_MARGIN: [number, number] = [12, 12];
export const GRID_PADDING: [number, number] = [0, 0];
export const RESIZE_HANDLES: ResizeHandleAxis[] = ["se"];
export const GRID_COMPACTOR = getCompactor("vertical", false, false);
export const RESIZE_HANDLE_INSET = 10;
export const SECTION_PREFIX = "section:";
export const SECTION_ROW_HEIGHT = 1;
