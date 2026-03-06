import type { Layout, LayoutItem } from "react-grid-layout";
import {
  DEFAULT_PANEL_SIZE,
  GRID_COLS,
  SECTION_PREFIX,
  SECTION_ROW_HEIGHT,
} from "./deviceDataChartConstants";
import type {
  ChartItem,
  ChartItemConfig,
  ChartLayoutItem,
  ChartSection,
  LineGranularity,
} from "../types/deviceDataChartTypes";

export const getSectionKey = (sectionId: string) => `${SECTION_PREFIX}${sectionId}`;
export const isSectionKey = (key: string) => key.startsWith(SECTION_PREFIX);
export const getSectionIdFromKey = (key: string) =>
  isSectionKey(key) ? key.slice(SECTION_PREFIX.length) : key;

export const getLayoutMaxY = (layout: ReadonlyArray<{ y: number; h: number }>) =>
  layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);

export const getNextPosition = (layout: Layout) => ({ x: 0, y: getLayoutMaxY(layout) });

// Normalize incoming chart configs into a stable, UI-friendly shape.
export const normalizeChart = (chart: ChartItemConfig): ChartItem => {
  const rawType = chart.type as string;
  const safeType = rawType === "meter_echart" ? "meter" : chart.type;
  const primaryField =
    chart.field ||
    (Array.isArray(chart.fields) && chart.fields.length ? String(chart.fields[0]) : "");
  const normalizedFields =
    safeType === "line" || safeType === "area"
      ? primaryField
        ? [primaryField]
        : []
      : undefined;
  const normalizedCases = Array.isArray(chart.value_cases)
    ? chart.value_cases.map((item) => String(item).trim()).filter(Boolean)
    : undefined;
  const barOrientation =
    safeType === "bar"
      ? chart.bar_orientation && chart.bar_orientation !== null
        ? chart.bar_orientation
        : "horizontal"
      : undefined;
  const barRaceMode = safeType === "bar" ? Boolean(chart.bar_race_mode) : undefined;
  const lineListMode =
    safeType === "line" || safeType === "area"
      ? chart.line_list_mode === "multi"
        ? "multi"
        : chart.line_list_mode === "single"
          ? "single"
          : undefined
      : undefined;
  const pieShowLabels =
    safeType === "pie"
      ? chart.pie_show_labels === false
        ? false
        : true
      : undefined;
  return {
    ...chart,
    type: safeType,
    name: chart.name?.trim() || "New panel",
    field: primaryField || chart.field,
    min: typeof chart.min === "number" ? chart.min : undefined,
    max: typeof chart.max === "number" ? chart.max : undefined,
    tick_count: typeof chart.tick_count === "number" ? chart.tick_count : undefined,
    value_decimals: typeof chart.value_decimals === "number" ? chart.value_decimals : undefined,
    value_cases: normalizedCases?.length ? normalizedCases : undefined,
    fields: normalizedFields,
    bar_orientation: barOrientation ?? chart.bar_orientation ?? undefined,
    bar_race_mode: barRaceMode ?? chart.bar_race_mode ?? undefined,
    pie_show_labels: pieShowLabels ?? chart.pie_show_labels ?? undefined,
    line_list_mode: lineListMode ?? chart.line_list_mode ?? undefined,
  };
};

export const normalizeLayoutItem = (item: LayoutItem | ChartLayoutItem): ChartLayoutItem => {
  if (isSectionKey(item.i)) {
    return {
      i: item.i,
      x: 0,
      y: item.y,
      w: GRID_COLS,
      h: SECTION_ROW_HEIGHT,
      minW: GRID_COLS,
      maxW: GRID_COLS,
      minH: SECTION_ROW_HEIGHT,
      isResizable: false,
      isDraggable: false,
    };
  }
  return {
    i: item.i,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: item.minW,
    minH: item.minH,
  };
};

export const ensureChartLayout = (
  charts: Array<{ id: string }>,
  sections: ChartSection[],
  layout: ReadonlyArray<LayoutItem>
) => {
  const chartIds = new Set(charts.map((chart) => chart.id));
  const sectionKeys = new Set(sections.map((section) => getSectionKey(section.id)));
  let nextLayout = layout
    .filter((item) => chartIds.has(item.i) || sectionKeys.has(item.i))
    .map((item) => normalizeLayoutItem(item));
  const usedIds = new Set(nextLayout.map((item) => item.i));
  let nextY = getLayoutMaxY(nextLayout);
  charts.forEach((chart) => {
    if (usedIds.has(chart.id)) return;
    nextLayout.push({
      i: chart.id,
      x: 0,
      y: nextY,
      w: DEFAULT_PANEL_SIZE.w,
      h: DEFAULT_PANEL_SIZE.h,
    });
    nextY += DEFAULT_PANEL_SIZE.h;
  });
  sections.forEach((section) => {
    const key = getSectionKey(section.id);
    if (usedIds.has(key)) return;
    nextLayout.push({
      i: key,
      x: 0,
      y: nextY,
      w: GRID_COLS,
      h: SECTION_ROW_HEIGHT,
      minW: GRID_COLS,
      maxW: GRID_COLS,
      minH: SECTION_ROW_HEIGHT,
      isResizable: false,
      isDraggable: false,
    });
    nextY += SECTION_ROW_HEIGHT;
  });
  return nextLayout.map((item) => normalizeLayoutItem(item));
};

export const buildSectionAssignments = (
  layout: ReadonlyArray<LayoutItem>,
  sections: ChartSection[],
  currentAssignments: Record<string, string | null>,
  recomputeIds: Set<string> | null = null
) => {
  const sectionMap = new Map(sections.map((section) => [section.id, section]));
  const headers = layout
    .filter((item) => isSectionKey(item.i))
    .map((item) => ({
      id: getSectionIdFromKey(item.i),
      y: item.y,
      x: item.x,
      collapsed: Boolean(sectionMap.get(getSectionIdFromKey(item.i))?.collapsed),
    }))
    .filter((item) => sectionMap.has(item.id))
    .sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
  const assignments: Record<string, string | null> = {};
  layout.forEach((item) => {
    if (isSectionKey(item.i)) return;
    const currentAssignment = currentAssignments[item.i] ?? null;
    if (!recomputeIds || !recomputeIds.has(item.i)) {
      assignments[item.i] = currentAssignment ?? null;
      return;
    }
    let lastHeader: (typeof headers)[number] | null = null;
    for (const header of headers) {
      if (header.y <= item.y) {
        lastHeader = header;
      } else {
        break;
      }
    }
    if (!lastHeader) {
      assignments[item.i] = null;
      return;
    }
    if (lastHeader.collapsed) {
      assignments[item.i] = currentAssignment === lastHeader.id ? lastHeader.id : null;
      return;
    }
    assignments[item.i] = lastHeader.id;
  });
  return assignments;
};

export const mergeLayout = (prev: Layout, next: Layout) => {
  const nextMap = new Map(next.map((item) => [item.i, item]));
  const prevIds = new Set(prev.map((item) => item.i));
  const merged = prev.map((item) => nextMap.get(item.i) ?? item);
  next.forEach((item) => {
    if (!prevIds.has(item.i)) {
      merged.push(item);
    }
  });
  return merged;
};

export const orderSectionsByLayout = (sections: ChartSection[], layout: ReadonlyArray<LayoutItem>) => {
  const positions = new Map<string, number>();
  layout.forEach((item) => {
    if (isSectionKey(item.i)) {
      positions.set(getSectionIdFromKey(item.i), item.y);
    }
  });
  return [...sections].sort((a, b) => {
    const posA = positions.get(a.id);
    const posB = positions.get(b.id);
    if (posA == null && posB == null) return 0;
    if (posA == null) return 1;
    if (posB == null) return -1;
    if (posA === posB) return 0;
    return posA - posB;
  });
};

export const parseNumericValue = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const getCustomRangeLimitEnd = (startTimeMs: number, granularity: LineGranularity) => {
  if (!Number.isFinite(startTimeMs)) return null;
  const limit = new Date(startTimeMs);
  // Upper bounds for custom range selection per granularity to prevent huge queries.
  switch (granularity) {
    case "sec":
      limit.setMinutes(limit.getMinutes() + 1);
      break;
    case "minute":
      limit.setHours(limit.getHours() + 1);
      break;
    case "hour":
      limit.setDate(limit.getDate() + 1);
      break;
    case "day":
      limit.setMonth(limit.getMonth() + 1);
      break;
    case "week":
      limit.setMonth(limit.getMonth() + 6);
      break;
    case "month":
      limit.setFullYear(limit.getFullYear() + 2);
      break;
    case "year":
      limit.setFullYear(limit.getFullYear() + 30);
      break;
    default:
      return null;
  }
  return limit.getTime();
};

export const parseOptionalNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const parseOptionalInteger = (value: string, min?: number) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return undefined;
  const rounded = Math.round(parsed);
  if (typeof min === "number" && rounded < min) return undefined;
  return rounded;
};
