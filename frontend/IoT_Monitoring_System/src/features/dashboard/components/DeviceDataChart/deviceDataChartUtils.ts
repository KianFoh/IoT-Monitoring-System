import type { Layout, LayoutItem } from "react-grid-layout";
import {
  DEFAULT_PANEL_SIZE,
  GRID_COLS,
  SECTION_PREFIX,
  SECTION_ROW_HEIGHT,
} from "./deviceDataChartConstants";
import type { ChartItem, ChartItemConfig, ChartLayoutItem, ChartSection } from "./deviceDataChartTypes";

export const getSectionKey = (sectionId: string) => `${SECTION_PREFIX}${sectionId}`;
export const isSectionKey = (key: string) => key.startsWith(SECTION_PREFIX);
export const getSectionIdFromKey = (key: string) => key.replace(SECTION_PREFIX, "");

export const getLayoutMaxY = (layout: Array<{ y: number; h: number }>) =>
  layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);

export const getNextPosition = (layout: Layout) => {
  if (layout.length === 0) return { x: 0, y: 0 };
  const maxY = Math.max(...layout.map((item) => item.y + item.h));
  return { x: 0, y: maxY };
};

export const normalizeChart = (chart: ChartItemConfig): ChartItem => {
  const normalizedFields =
    chart.type === "line"
      ? Array.isArray(chart.fields) && chart.fields.length
        ? chart.fields
        : chart.field
          ? [chart.field]
          : []
      : undefined;

  return {
    ...chart,
    name: chart.name?.trim() || "New panel",
    min: typeof chart.min === "number" ? chart.min : undefined,
    max: typeof chart.max === "number" ? chart.max : undefined,
    fields: normalizedFields,
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
  charts: ChartItem[],
  sections: ChartSection[],
  layout: ChartLayoutItem[]
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
  layout: ChartLayoutItem[],
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
    let assigned: string | null = null;
    for (const header of headers) {
      if (header.y <= item.y) {
        if (header.collapsed) {
          assigned = null;
          break;
        } else {
          assigned = header.id;
        }
      } else {
        break;
      }
    }
    assignments[item.i] = assigned;
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

export const orderSectionsByLayout = (sections: ChartSection[], layout: ChartLayoutItem[]) => {
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

export const parseOptionalNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};
