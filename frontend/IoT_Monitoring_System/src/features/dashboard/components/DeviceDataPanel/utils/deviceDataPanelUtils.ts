import type { Layout, LayoutItem } from "react-grid-layout";
import {
  DEFAULT_PANEL_SIZE,
  GRID_COLS,
  SECTION_PREFIX,
  SECTION_ROW_HEIGHT,
} from "./deviceDataPanelConstants";
import type { ListModalItem, PanelLayoutItem, PanelSection } from "../types/deviceDataPanelTypes";

export const getSectionKey = (sectionId: string) => `${SECTION_PREFIX}${sectionId}`;
export const isSectionKey = (key: string) => key.startsWith(SECTION_PREFIX);
export const getSectionIdFromKey = (key: string) =>
  isSectionKey(key) ? key.slice(SECTION_PREFIX.length) : key;

export const getLayoutMaxY = (layout: Array<{ y: number; h: number }>) =>
  layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);

export const normalizeLayoutItem = (item: LayoutItem | PanelLayoutItem): PanelLayoutItem => {
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
    minW: DEFAULT_PANEL_SIZE.minW,
    minH: DEFAULT_PANEL_SIZE.minH,
  };
};

export const ensurePanelLayout = (
  fields: string[],
  sections: PanelSection[],
  layout: PanelLayoutItem[]
) => {
  const fieldSet = new Set(fields);
  const sectionKeys = new Set(sections.map((section) => getSectionKey(section.id)));
  let nextLayout = layout
    .filter((item) => fieldSet.has(item.i) || sectionKeys.has(item.i))
    .map((item) => normalizeLayoutItem(item));
  const usedIds = new Set(nextLayout.map((item) => item.i));
  const sectionHeaderYs = nextLayout
    .filter((item) => isSectionKey(item.i))
    .map((item) => item.y)
    .sort((a, b) => a - b);
  let insertY = sectionHeaderYs.length ? sectionHeaderYs[0] : getLayoutMaxY(nextLayout);
  fields.forEach((field) => {
    if (usedIds.has(field)) return;
    if (sectionHeaderYs.length) {
      nextLayout = nextLayout.map((item) =>
        item.y >= insertY ? { ...item, y: item.y + DEFAULT_PANEL_SIZE.h } : item
      );
    }
    nextLayout.push({
      i: field,
      x: 0,
      y: insertY,
      w: DEFAULT_PANEL_SIZE.w,
      h: DEFAULT_PANEL_SIZE.h,
      minW: DEFAULT_PANEL_SIZE.minW,
      minH: DEFAULT_PANEL_SIZE.minH,
    });
    usedIds.add(field);
    insertY += DEFAULT_PANEL_SIZE.h;
  });
  let nextY = getLayoutMaxY(nextLayout);
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
  layout: PanelLayoutItem[],
  sections: PanelSection[],
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

export const getListCount = (rawValue: unknown) => {
  if (Array.isArray(rawValue)) {
    return rawValue.length;
  }
  if (rawValue && typeof rawValue === "object") {
    return Object.values(rawValue as Record<string, unknown>).reduce<number>((sum, value) => {
      if (typeof value === "number") return sum + value;
      return sum + 1;
    }, 0);
  }
  if (typeof rawValue === "string" && rawValue.trim()) {
    return 1;
  }
  return 0;
};

export const buildListModalItems = (rawValue: unknown): ListModalItem[] => {
  if (Array.isArray(rawValue)) {
    return rawValue.map((item) => {
      const label = String(item);
      return { label, matchKey: label };
    });
  }
  if (rawValue && typeof rawValue === "object") {
    return Object.entries(rawValue as Record<string, unknown>).map(([key, value]) => {
      const label =
        typeof value === "number" ? `${key} (${value})` : `${key}: ${String(value)}`;
      return { label, matchKey: key };
    });
  }
  if (typeof rawValue === "string" && rawValue.trim()) {
    return [{ label: rawValue, matchKey: rawValue }];
  }
  return [];
};
