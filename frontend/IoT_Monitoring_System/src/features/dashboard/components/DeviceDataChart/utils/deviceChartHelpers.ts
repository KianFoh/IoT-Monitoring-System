import type { LineChartPoint } from "../../charts/Line/LineChart";
import type { ChartRangePreset, LineGranularity } from "../types/deviceDataChartTypes";

export const buildListKey = (items?: string[] | null) =>
  Array.isArray(items) ? items.map((item) => item.trim()).filter(Boolean).join(",") : "";

export const buildCaseColorsKey = (colors?: Record<string, string> | null) => {
  if (!colors) return "";
  return Object.keys(colors)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `${key.trim()}:${String(colors[key]).trim()}`)
    .join(",");
};

export const buildChartConfigKey = (parts: Array<string | number | null | undefined>) =>
  parts.map((part) => (part === null || part === undefined ? "" : String(part))).join("|");

export const getRangeGranularity = (preset: ChartRangePreset): LineGranularity => {
  switch (preset) {
    case "last_1_min":
      return "sec";
    case "last_1_hour":
      return "minute";
    case "last_1_day":
      return "hour";
    case "last_1_week":
    case "last_1_month":
      return "day";
    case "last_1_year":
      return "month";
    default:
      return "minute";
  }
};

export const normalizeCaseList = (cases: string[] | null | undefined) =>
  Array.isArray(cases) ? cases.map((item) => item.trim()).filter(Boolean) : [];

export const resolveCaseIndex = (cases: string[], value: unknown) => {
  if (!cases.length) return null;
  const raw =
    typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      ? String(value).trim().toLowerCase()
      : "";
  if (!raw) return null;
  const index = cases.findIndex((item) => item.toLowerCase() === raw);
  return index >= 0 ? index : null;
};

export const resolveListCount = (cases: string[], value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const normalizedCases = cases
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const hasCaseFilter = normalizedCases.length > 0;
  const caseSet = new Set(normalizedCases);

  if (Array.isArray(value)) {
    if (!hasCaseFilter) return value.length;
    let count = 0;
    value.forEach((item) => {
      if (item === null || item === undefined) return;
      const key = String(item).trim().toLowerCase();
      if (!key) return;
      if (caseSet.has(key)) count += 1;
    });
    return count;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (!entries.length) return 0;
    if (!hasCaseFilter) {
      return entries.reduce((sum, [, entryValue]) => {
        if (typeof entryValue === "number" && Number.isFinite(entryValue)) {
          return sum + entryValue;
        }
        if (entryValue === null || entryValue === undefined) return sum;
        return sum + 1;
      }, 0);
    }
    const entryMap = new Map<string, unknown>();
    entries.forEach(([key, entryValue]) => {
      const normalizedKey = key.trim().toLowerCase();
      if (!normalizedKey) return;
      entryMap.set(normalizedKey, entryValue);
    });
    return normalizedCases.reduce((sum, caseKey) => {
      const entryValue = entryMap.get(caseKey);
      if (entryValue === null || entryValue === undefined) return sum;
      if (typeof entryValue === "number" && Number.isFinite(entryValue)) {
        return sum + entryValue;
      }
      return sum + 1;
    }, 0);
  }

  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return null;
    if (!hasCaseFilter) return 1;
    return caseSet.has(raw.toLowerCase()) ? 1 : 0;
  }

  return null;
};

export const buildListCaseCounts = (cases: string[], value: unknown) => {
  const normalizedCases = cases.map((item) => item.trim()).filter(Boolean);
  const caseMap = new Map<string, string>();
  normalizedCases.forEach((label) => {
    caseMap.set(label.toLowerCase(), label);
  });
  const counts: Record<string, number> = {};
  normalizedCases.forEach((label) => {
    counts[label] = 0;
  });

  if (value === null || value === undefined) return counts;

  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (item === null || item === undefined) return;
      const key = String(item).trim().toLowerCase();
      const label = caseMap.get(key);
      if (!label) return;
      counts[label] += 1;
    });
    return counts;
  }

  if (value && typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, entryValue]) => {
      const normalizedKey = key.trim().toLowerCase();
      const label = caseMap.get(normalizedKey);
      if (!label) return;
      if (typeof entryValue === "number" && Number.isFinite(entryValue)) {
        counts[label] += entryValue;
        return;
      }
      if (entryValue === null || entryValue === undefined) return;
      counts[label] += 1;
    });
    return counts;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const key = String(value).trim().toLowerCase();
    const label = caseMap.get(key);
    if (label) {
      counts[label] += 1;
    }
  }

  return counts;
};

export const buildDynamicListCounts = (value: unknown) => {
  const counts: Record<string, number> = {};
  const addCount = (label: string, amount = 1) => {
    const normalized = label.trim();
    if (!normalized) return;
    const nextValue = Number.isFinite(amount) ? amount : 0;
    counts[normalized] = (counts[normalized] ?? 0) + nextValue;
  };

  if (value === null || value === undefined) return counts;

  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (item === null || item === undefined) return;
      addCount(String(item), 1);
    });
    return counts;
  }

  if (value && typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, entryValue]) => {
      if (!key) return;
      if (typeof entryValue === "number" && Number.isFinite(entryValue)) {
        addCount(key, entryValue);
        return;
      }
      if (entryValue === null || entryValue === undefined) return;
      addCount(key, 1);
    });
    return counts;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    addCount(String(value), 1);
  }

  return counts;
};

export const buildDynamicListLabels = (
  rows: Array<{ ts: number; data: Record<string, unknown> }>,
  field: string
) => {
  const labels: string[] = [];
  const seen = new Set<string>();
  rows.forEach((row) => {
    const counts = buildDynamicListCounts(row.data[field]);
    Object.keys(counts).forEach((label) => {
      if (seen.has(label)) return;
      seen.add(label);
      labels.push(label);
    });
  });
  return labels;
};

export const formatStatNumber = (value: number, decimals?: number) => {
  if (!Number.isFinite(value)) return "--";
  if (typeof decimals !== "number" || !Number.isFinite(decimals)) {
    return String(value);
  }
  const safeDecimals = Math.max(0, Math.round(decimals));
  if (safeDecimals === 0) return String(Math.round(value));
  const rounded = value.toFixed(safeDecimals);
  return rounded.replace(/(?:\.0+|(\.\d*?[1-9])0+)$/, "$1");
};

export const formatStatUnitValue = (value: string | number, unit: string) => {
  const trimmedUnit = unit.trim();
  if (!trimmedUnit) return String(value);
  if (trimmedUnit.startsWith("%")) {
    return `${value}${trimmedUnit}`;
  }
  return `${value} ${trimmedUnit}`;
};

export const buildLineData = (
  rows: Array<{ ts: number; data: Record<string, unknown> }>,
  field: string,
  opts: {
    isLineList: boolean;
    isLineListMulti: boolean;
    isLineText: boolean;
    lineCases: string[];
    lineListLabels: string[];
    parseNumericValue: (value: unknown) => number | null;
  }
) => {
  const {
    isLineList,
    isLineListMulti,
    isLineText,
    lineCases,
    lineListLabels,
    parseNumericValue,
  } = opts;
  const listCaseBreakdowns =
    !isLineListMulti && isLineList && lineCases.length
      ? new Map<number, Record<string, number>>()
      : undefined;
  const lineData: LineChartPoint[] = rows.map((row) => {
    const rawValue = row.data[field];
    if (isLineList) {
      if (isLineListMulti) {
        const breakdown = lineCases.length
          ? buildListCaseCounts(lineListLabels, rawValue)
          : buildDynamicListCounts(rawValue);
        const rowData: LineChartPoint = { ts: row.ts };
        lineListLabels.forEach((label) => {
          rowData[label] = breakdown[label] ?? 0;
        });
        return rowData;
      }
      const value = lineCases.length
        ? (() => {
            const breakdown = buildListCaseCounts(lineCases, rawValue);
            if (listCaseBreakdowns) {
              listCaseBreakdowns.set(row.ts, breakdown);
            }
            return Object.values(breakdown).reduce((sum, count) => sum + count, 0);
          })()
        : resolveListCount(lineCases, rawValue);
      return { ts: row.ts, [field]: value } as LineChartPoint;
    }
    const value = isLineText ? resolveCaseIndex(lineCases, rawValue) : parseNumericValue(rawValue);
    return { ts: row.ts, [field]: value } as LineChartPoint;
  });
  return { lineData, listCaseBreakdowns };
};
