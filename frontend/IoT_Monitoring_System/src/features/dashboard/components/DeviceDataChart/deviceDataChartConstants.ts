import { getCompactor, type ResizeHandleAxis } from "react-grid-layout";
import type { ChartType, LineGranularity } from "./deviceDataChartTypes";

export const CHART_OPTIONS: Array<{ value: ChartType; label: string }> = [
  { value: "meter", label: "Meter" },
  { value: "line", label: "Line" },
  { value: "bar", label: "Bar" },
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

export const GRID_COLS = 12;
export const GRID_ROW_HEIGHT = 80;
export const DEFAULT_PANEL_SIZE = { w: 4, h: 3 };
export const GRID_MARGIN: [number, number] = [16, 16];
export const GRID_PADDING: [number, number] = [0, 0];
export const RESIZE_HANDLES: ResizeHandleAxis[] = ["se"];
export const GRID_COMPACTOR = getCompactor("vertical", false, false);
export const RESIZE_HANDLE_INSET = 10;
export const SECTION_PREFIX = "section:";
export const SECTION_ROW_HEIGHT = 1;
