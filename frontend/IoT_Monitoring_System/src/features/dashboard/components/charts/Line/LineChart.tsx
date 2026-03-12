import { useEffect, useMemo, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption, SeriesOption } from "echarts";
import styles from "./LineChart.module.css";

export type LineChartPoint = {
  ts: number;
  [field: string]: number | null;
};

type LineChartProps = {
  data: LineChartPoint[];
  fields: string[];
  unit?: string;
  min?: number;
  max?: number;
  tickCount?: number;
  valueDecimals?: number;
  getFieldLabel?: (field: string) => string;
  getFieldUnit?: (field: string) => string;
  cases?: string[];
  listCaseLabels?: string[];
  listCaseBreakdowns?: Map<number, Record<string, number>>;
  caseColors?: Record<string, string> | null;
  lineColor?: string;
  variant?: "line" | "area";
  stackSeries?: boolean;
  totalLabel?: string;
  totalLabelColor?: string;
  resetZoomKey?: string;
  timeGranularity?: "sec" | "minute" | "hour" | "day" | "week" | "month" | "year";
  assumeSorted?: boolean;
  smooth?: boolean;
};

const Y_TICK_COUNT = 6;
const FALLBACK_COLOR = "#9ca3af";
const FALLBACK_TEXT = "#e2e8f0";
const FALLBACK_GRID = "rgba(255,255,255,0.25)";
const FALLBACK_TOOLTIP_BG = "#0f172a";
const FALLBACK_TOOLTIP_BORDER = "rgba(255,255,255,0.12)";

const addThousandsSeparators = (raw: string) => {
  const [intPart, fracPart] = raw.split(".");
  const sign = intPart.startsWith("-") ? "-" : "";
  const digits = sign ? intPart.slice(1) : intPart;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${grouped}${fracPart ? `.${fracPart}` : ""}`;
};

const formatTime = (value: number) =>
  new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const pad2 = (value: number) => String(value).padStart(2, "0");

const formatDate = (value: number) => {
  const date = new Date(value);
  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  return `${day}/${month}/${date.getFullYear()}`;
};

const formatDateShort = (value: number) => {
  const date = new Date(value);
  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

const formatTimeWithShortDate = (
  value: number,
  { includeSeconds = true, includeMinutes = true } = {}
) => {
  const time = new Date(value).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: includeMinutes ? "2-digit" : undefined,
    second: includeSeconds ? "2-digit" : undefined,
    hour12: true,
  });
  return `${formatDateShort(value)} ${time}`;
};

const formatTimeByGranularity = (
  value: number,
  granularity: "sec" | "minute" | "hour" | "day" | "week" | "month" | "year"
) => {
  const date = new Date(value);
  switch (granularity) {
    case "sec":
      return date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    case "minute":
      return date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
    case "hour":
      return `${formatDate(value)} ${pad2(date.getHours())}:00`;
    case "day":
    case "week":
    case "month":
    case "year":
      return formatDate(value);
    default:
      return formatTime(value);
  }
};

export function LineChart({
  data,
  fields,
  unit,
  min,
  max,
  tickCount,
  valueDecimals,
  getFieldLabel,
  getFieldUnit,
  cases,
  listCaseLabels,
  listCaseBreakdowns,
  caseColors,
  lineColor,
  variant = "line",
  stackSeries = false,
  totalLabel,
  totalLabelColor,
  resetZoomKey,
  timeGranularity,
  assumeSorted = false,
  smooth,
}: LineChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReactECharts | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const chartKey = resetZoomKey ?? "line-chart";
  const sortedData = useMemo(() => {
    if (!data.length) return data;
    if (assumeSorted) return data;
    if (data.length < 2) return data;
    for (let i = 1; i < data.length; i += 1) {
      if (data[i].ts < data[i - 1].ts) {
        return [...data].sort((a, b) => a.ts - b.ts);
      }
    }
    return data;
  }, [data, assumeSorted]);
  const plotData = useMemo(() => {
    if (!sortedData.length || !fields.length) return [];
    return sortedData.filter((point) =>
      fields.some((field) => {
        const rawValue = point[field];
        if (rawValue === null || rawValue === undefined) return false;
        const numeric = typeof rawValue === "number" ? rawValue : Number(rawValue);
        return Number.isFinite(numeric);
      })
    );
  }, [sortedData, fields]);
  const hasData = plotData.length > 0 && fields.length > 0;
  const [hoveredAxisTime, setHoveredAxisTime] = useState<number | null>(null);
  const lastPointerMoveRef = useRef(0);
  const tooltipUnit = unit?.trim() ?? "";
  const [zoomState, setZoomState] = useState<{ start: number; end: number } | null>(null);
  const theme = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        series: FALLBACK_COLOR,
        text: FALLBACK_TEXT,
        grid: FALLBACK_GRID,
        tooltipBg: FALLBACK_TOOLTIP_BG,
        tooltipBorder: FALLBACK_TOOLTIP_BORDER,
        muted: "rgba(255,255,255,0.6)",
      };
    }
    const rootStyles = getComputedStyle(document.documentElement);
    const readVar = (name: string, fallback: string) => {
      const value = rootStyles.getPropertyValue(name).trim();
      return value || fallback;
    };
    return {
      series: readVar("--color-neutral-400", FALLBACK_COLOR),
      text: readVar("--color-primary-100", FALLBACK_TEXT),
      grid: readVar("--color-overlay-white-medium", FALLBACK_GRID),
      tooltipBg: readVar("--color-dark-900", FALLBACK_TOOLTIP_BG),
      tooltipBorder: readVar("--color-dark-600", FALLBACK_TOOLTIP_BORDER),
      muted: readVar("--color-overlay-white-medium", "rgba(255,255,255,0.6)"),
    };
  }, []);
  const palette = useMemo(() => [theme.series], [theme.series]);
  const resolvedLineColor = typeof lineColor === "string" && lineColor.trim() ? lineColor.trim() : "";
  const isCompact =
    containerSize.width > 0 &&
    (containerSize.width < 260 || containerSize.height < 180);
  const isTiny =
    containerSize.width > 0 &&
    (containerSize.width < 200 || containerSize.height < 120);
  const axisLabelVisible = !isTiny;
  const axisLabelFontSize = isCompact ? 10 : 13;
  const normalizedCases = useMemo(
    () => (Array.isArray(cases) ? cases.map((item) => item.trim()).filter(Boolean) : []),
    [cases]
  );
  const hasCases = normalizedCases.length >= 2;
  const smoothLine = hasCases ? false : typeof smooth === "boolean" ? smooth : true;
  // For categorical area charts, use a value axis so the fill anchors to the baseline.
  const useValueAxisForCases = hasCases && variant === "area";
  const caseColorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!caseColors) return map;
    Object.entries(caseColors).forEach(([label, color]) => {
      const trimmedLabel = label.trim().toLowerCase();
      const trimmedColor = typeof color === "string" ? color.trim() : "";
      if (!trimmedLabel || !trimmedColor) return;
      map.set(trimmedLabel, trimmedColor);
    });
    return map;
  }, [caseColors]);
  const caseStyleMap = useMemo(() => {
    const map = new Map<string, { styleKey: string; color: string }>();
    normalizedCases.forEach((label, index) => {
      const color = caseColorMap.get(label.toLowerCase());
      if (!color) return;
      map.set(label.toLowerCase(), { styleKey: `case${index}`, color });
    });
    return map;
  }, [normalizedCases, caseColorMap]);
  const caseLabelRich = useMemo(() => {
    const rich: Record<string, { color: string }> = {};
    caseStyleMap.forEach((value) => {
      rich[value.styleKey] = { color: value.color };
    });
    return rich;
  }, [caseStyleMap]);
  const formatCaseAxisLabel = useMemo(() => {
    if (!caseStyleMap.size) return undefined;
    return (value: string) => {
      const key = String(value).trim().toLowerCase();
      const entry = caseStyleMap.get(key);
      return entry ? `{${entry.styleKey}|${value}}` : String(value);
    };
  }, [caseStyleMap]);
  const formatCaseAxisLabelValue = useMemo(() => {
    return (value: number) => {
      const idx = Math.round(Number(value));
      const label = normalizedCases[idx] ?? "";
      if (!label) return "";
      const entry = caseStyleMap.get(label.toLowerCase());
      return entry ? `{${entry.styleKey}|${label}}` : label;
    };
  }, [normalizedCases, caseStyleMap]);
  const resolvedTickCount = useMemo(() => {
    if (hasCases) return undefined;
    if (typeof tickCount !== "number" || !Number.isFinite(tickCount)) return undefined;
    const rounded = Math.round(tickCount);
    return rounded >= 2 ? rounded : undefined;
  }, [tickCount, hasCases]);
  const resolvedValueDecimals = useMemo(() => {
    if (typeof valueDecimals !== "number" || !Number.isFinite(valueDecimals)) return null;
    return Math.max(0, Math.round(valueDecimals));
  }, [valueDecimals]);

  const safeMin = typeof min === "number" && Number.isFinite(min) ? min : undefined;
  const safeMaxRaw = typeof max === "number" && Number.isFinite(max) ? max : undefined;
  const safeMax =
    safeMin !== undefined && safeMaxRaw !== undefined
      ? safeMaxRaw > safeMin
        ? safeMaxRaw
        : safeMin + 1
      : safeMaxRaw;
  const dataRange = useMemo(() => {
    if (!plotData.length || !fields.length) return null;
    let minValue = Infinity;
    let maxValue = -Infinity;
    plotData.forEach((point) => {
      fields.forEach((field) => {
        const rawValue = point[field];
        if (rawValue === null || rawValue === undefined) return;
        const numeric = typeof rawValue === "number" ? rawValue : Number(rawValue);
        if (!Number.isFinite(numeric)) return;
        if (numeric < minValue) minValue = numeric;
        if (numeric > maxValue) maxValue = numeric;
      });
    });
    if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) return null;
    if (minValue === maxValue) {
      const pad = minValue === 0 ? 1 : Math.abs(minValue) * 0.1;
      return { min: minValue - pad, max: maxValue + pad };
    }
    return { min: minValue, max: maxValue };
  }, [plotData, fields]);
  const autoRange = useMemo(() => {
    if (hasCases) return null;
    if (resolvedTickCount === undefined) return null;
    if (safeMin !== undefined || safeMax !== undefined) return null;
    return dataRange;
  }, [hasCases, resolvedTickCount, safeMin, safeMax, dataRange]);
  const finalMin = safeMin ?? autoRange?.min;
  const finalMax = safeMax ?? autoRange?.max;
  const yAxisInterval = useMemo(() => {
    if (hasCases) return undefined;
    if (resolvedTickCount === undefined) return undefined;
    if (finalMin === undefined || finalMax === undefined) return undefined;
    if (finalMax <= finalMin) return undefined;
    if (resolvedTickCount < 2) return undefined;
    return (finalMax - finalMin) / (resolvedTickCount - 1);
  }, [hasCases, resolvedTickCount, finalMin, finalMax]);

  const formatCaseValue = (value: number | string) => {
    if (!hasCases) return String(value);
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    const idx = Math.round(numeric);
    return normalizedCases[idx] ?? "";
  };

  const formatNumericValue = (value: number | string) => {
    if (hasCases) return formatCaseValue(value);
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    if (resolvedValueDecimals === null) return addThousandsSeparators(String(numeric));
    if (resolvedValueDecimals === 0) {
      return addThousandsSeparators(String(Math.round(numeric)));
    }
    const rounded = numeric.toFixed(resolvedValueDecimals);
    const trimmed = rounded.replace(/(?:\.0+|(\.\d*?[1-9])0+)$/, "$1");
    return addThousandsSeparators(trimmed);
  };

  const getNearestTime = useMemo(() => {
    return (axisValue: number) => {
      if (!plotData.length) return null;
      let bestIndex = 0;
      let bestDelta = Math.abs(plotData[0].ts - axisValue);
      for (let i = 1; i < plotData.length; i += 1) {
        const delta = Math.abs(plotData[i].ts - axisValue);
        if (delta < bestDelta) {
          bestDelta = delta;
          bestIndex = i;
        }
      }
      return plotData[bestIndex]?.ts ?? null;
    };
  }, [plotData]);
  const hoveredDataIndex = useMemo(() => {
    if (hoveredAxisTime === null) return null;
    if (!plotData.length) return null;
    const idx = plotData.findIndex((point) => point.ts === hoveredAxisTime);
    return idx >= 0 ? idx : null;
  }, [hoveredAxisTime, plotData]);

  const fieldMeta = useMemo(
    () =>
      fields.map((field) => {
        const label = getFieldLabel ? getFieldLabel(field).trim() : "";
        const unitValue = getFieldUnit ? getFieldUnit(field).trim() : "";
        return {
          field,
          label: label || field,
          unit: unitValue,
        };
      }),
    [fields, getFieldLabel, getFieldUnit]
  );

  const metaByField = useMemo(() => {
    const map = new Map<string, { label: string; unit: string }>();
    fieldMeta.forEach((meta) => map.set(meta.field, meta));
    return map;
  }, [fieldMeta]);

  const legendItems = useMemo(
    () =>
      fields.map((field, index) => {
        const meta = metaByField.get(field);
        const label = meta?.label ?? field;
        const colorFromMap = caseColorMap.get(label.trim().toLowerCase());
        const fallbackColor = resolvedLineColor || palette[index % palette.length];
        const color = colorFromMap || fallbackColor;
        return { field, label, color };
      }),
    [fields, metaByField, caseColorMap, resolvedLineColor, palette]
  );
  const showLegend = legendItems.length > 1 && !isCompact;
  const [legendSelected, setLegendSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!legendItems.length) {
      setLegendSelected({});
      return;
    }
    setLegendSelected((prev) => {
      const next = { ...prev };
      let changed = false;
      legendItems.forEach((item) => {
        if (next[item.field] === undefined) {
          next[item.field] = true;
          changed = true;
        }
      });
      Object.keys(next).forEach((field) => {
        if (!legendItems.some((item) => item.field === field)) {
          delete next[field];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [legendItems]);

  const visibleFields = useMemo(
    () => fields.filter((field) => legendSelected[field] ?? true),
    [fields, legendSelected]
  );

  const hasSinglePoint = plotData.length === 1;
  const series = useMemo<SeriesOption[]>(
    () =>
      visibleFields.map((field, index) => {
        const meta = metaByField.get(field);
        const label = meta?.label ?? field;
        const colorFromMap = caseColorMap.get(label.trim().toLowerCase());
        const fallbackColor = resolvedLineColor || palette[index % palette.length];
        const color = colorFromMap || fallbackColor;
        const seriesData = plotData.map((point) => {
          const rawValue = point[field];
          if (rawValue === null || rawValue === undefined) {
            return [point.ts, null];
          }
          const numeric = typeof rawValue === "number" ? rawValue : Number(rawValue);
          if (!Number.isFinite(numeric)) return [point.ts, null];
          return [point.ts, numeric];
        });
        return {
          id: field,
          name: meta?.label ?? field,
          type: "line",
          stack: stackSeries ? "total" : undefined,
          encode: { x: 0, y: 1 },
          smooth: smoothLine,
          step: hasCases ? "end" : false,
          showSymbol: true,
          symbol: "circle",
          symbolSize: (_value: unknown, params: { dataIndex?: number }) => {
            if (hoveredDataIndex === null) {
              return hasSinglePoint ? 8 : 0;
            }
            return params?.dataIndex === hoveredDataIndex ? 10 : 0;
          },
          connectNulls: false,
          lineStyle: { width: 2.6, color, shadowColor: color, shadowBlur: 6 },
          itemStyle: { color, borderColor: color, borderWidth: 0 },
          emphasis: {
            scale: true,
            itemStyle: { color, borderColor: color, borderWidth: 0 },
          },
          areaStyle:
            variant === "area"
              ? {
                  opacity: 0.22,
                  color,
                  origin: hasCases ? ("end" as const) : ("start" as const),
                }
              : undefined,
          data: seriesData,
      } satisfies SeriesOption;
    }),
    [
      plotData,
      visibleFields,
      metaByField,
      hasCases,
      variant,
      palette,
      resolvedLineColor,
      caseColorMap,
      stackSeries,
      hoveredDataIndex,
      hasSinglePoint,
      smoothLine,
    ]
  );

  const timeRange = useMemo(() => {
    if (!plotData.length) return null;
    const min = plotData[0]?.ts;
    const max = plotData[plotData.length - 1]?.ts;
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    return { min, max, span: Math.abs(max - min) };
  }, [plotData]);
  const visibleTimeRange = useMemo(() => {
    if (!timeRange) return null;
    if (!zoomState) return timeRange;
    if (!Number.isFinite(timeRange.span) || timeRange.span <= 0) return timeRange;
    const start = Math.min(100, Math.max(0, zoomState.start));
    const end = Math.min(100, Math.max(0, zoomState.end));
    const from = timeRange.min + (timeRange.span * start) / 100;
    const to = timeRange.min + (timeRange.span * end) / 100;
    return { min: Math.min(from, to), max: Math.max(from, to), span: Math.abs(to - from) };
  }, [timeRange, zoomState]);

  const minTimeStep = useMemo(() => {
    if (plotData.length < 2) return null;
    let min = Infinity;
    for (let i = 1; i < plotData.length; i += 1) {
      const prev = plotData[i - 1]?.ts;
      const next = plotData[i]?.ts;
      if (!Number.isFinite(prev) || !Number.isFinite(next)) continue;
      const delta = next - prev;
      if (delta > 0 && delta < min) {
        min = delta;
      }
    }
    return Number.isFinite(min) ? min : null;
  }, [plotData]);

  const formatAxisTime = useMemo(() => {
    if (timeGranularity) {
      return (value: number) => formatTimeByGranularity(value, timeGranularity);
    }
    if (!timeRange) return formatTime;
    const oneDay = 24 * 60 * 60 * 1000;
    if (typeof minTimeStep === "number" && minTimeStep >= oneDay) {
      return (value: number) => formatDate(value);
    }
    if (timeRange.span <= oneDay) {
      return (value: number) =>
        new Date(value).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
    }
    return (value: number) => formatDate(value);
  }, [timeRange, minTimeStep, timeGranularity]);

  const formatTooltipTime = useMemo(() => {
    if (timeGranularity) {
      switch (timeGranularity) {
        case "sec":
          return (value: number) => formatTimeWithShortDate(value, { includeSeconds: true });
        case "minute":
          return (value: number) =>
            formatTimeWithShortDate(value, { includeSeconds: false, includeMinutes: true });
        case "hour":
          return (value: number) =>
            formatTimeWithShortDate(value, { includeSeconds: false, includeMinutes: true });
        case "day":
        case "week":
        case "month":
        case "year":
          return (value: number) => formatDateShort(value);
        default:
          return (value: number) => formatTimeByGranularity(value, timeGranularity);
      }
    }
    return (value: number) => formatTimeWithShortDate(value, { includeSeconds: true });
  }, [timeGranularity]);

  useEffect(() => {
    setZoomState(null);
  }, [resetZoomKey]);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let frameId = 0;
    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const nextWidth = Math.max(0, Math.round(rect.width));
      const nextHeight = Math.max(0, Math.round(rect.height));
      setContainerSize((prev) =>
        prev.width === nextWidth && prev.height === nextHeight
          ? prev
          : { width: nextWidth, height: nextHeight }
      );
      chartRef.current?.getEchartsInstance()?.resize();
    };
    updateSize();
    const observer = new ResizeObserver(() => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updateSize);
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);
  useEffect(() => {
    if (!hasData) return;
    let attempts = 0;
    const run = () => {
      chartRef.current?.getEchartsInstance()?.resize();
      attempts += 1;
      if (attempts >= 6) {
        window.clearInterval(intervalId);
      }
    };
    run();
    const intervalId = window.setInterval(run, 150);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasData, plotData.length, resetZoomKey]);
  useEffect(() => {
    if (!hasData) return;
    const fontSet = document.fonts;
    if (!fontSet || !fontSet.ready) return;
    let cancelled = false;
    fontSet.ready.then(() => {
      if (cancelled) return;
      chartRef.current?.getEchartsInstance()?.resize();
    });
    return () => {
      cancelled = true;
    };
  }, [hasData]);
  const gridLineStyle = useMemo(
    () => ({
      color: theme.grid,
      width: 1.4,
      type: "dashed" as const,
      opacity: 1,
    }), 
    [theme.grid]
  );

  const xAxis = useMemo(
    () => ({
      type: "time" as const,
      boundaryGap: [0, 0] as [number, number],
      scale: false,
      axisLabel: {
        show: axisLabelVisible,
        color: theme.text,
        fontSize: axisLabelFontSize,
        formatter: (value: number) => formatAxisTime(value),
        hideOverlap: true,
      },
      axisLine: { lineStyle: { color: theme.grid }, onZero: false },
      axisTick: axisLabelVisible ? { lineStyle: { color: theme.grid } } : { show: false },
      splitLine: { show: axisLabelVisible, lineStyle: gridLineStyle },
    }),
    [axisLabelVisible, axisLabelFontSize, formatAxisTime, gridLineStyle, theme.grid, theme.text]
  );

  const yAxis = useMemo(
    () =>
      hasCases
        ? useValueAxisForCases
          ? {
              type: "value" as const,
              min: 0,
              max: Math.max(0, normalizedCases.length - 1),
              interval: 1,
              inverse: true,
              axisLabel: {
                show: axisLabelVisible,
                color: theme.text,
                fontSize: axisLabelFontSize,
                hideOverlap: true,
                formatter: (value: number) => formatCaseAxisLabelValue(value),
                rich: caseStyleMap.size ? caseLabelRich : undefined,
              },
              axisLine: { lineStyle: { color: theme.grid } },
              axisTick: axisLabelVisible ? { lineStyle: { color: theme.grid } } : { show: false },
              axisPointer: { show: false },
              splitLine: { show: axisLabelVisible, lineStyle: gridLineStyle },
            }
          : {
              type: "category" as const,
              data: normalizedCases,
              axisLabel: {
                show: axisLabelVisible,
                color: theme.text,
                fontSize: axisLabelFontSize,
                hideOverlap: true,
                formatter: formatCaseAxisLabel,
                rich: caseStyleMap.size ? caseLabelRich : undefined,
              },
              axisLine: { lineStyle: { color: theme.grid } },
              axisTick: axisLabelVisible ? { lineStyle: { color: theme.grid } } : { show: false },
              axisPointer: { show: false },
              splitLine: { show: axisLabelVisible, lineStyle: gridLineStyle },
            }
        : {
            type: "value" as const,
            min: finalMin,
            max: finalMax,
            splitNumber: resolvedTickCount ?? Y_TICK_COUNT,
            interval: yAxisInterval,
            axisLabel: {
              show: axisLabelVisible,
              color: theme.text,
              fontSize: axisLabelFontSize,
              formatter: (value: number) => formatNumericValue(value),
              hideOverlap: true,
            },
            axisLine: { lineStyle: { color: theme.grid } },
            axisTick: axisLabelVisible ? { lineStyle: { color: theme.grid } } : { show: false },
            splitLine: { show: axisLabelVisible, lineStyle: gridLineStyle },
          },
    [
      hasCases,
      useValueAxisForCases,
      normalizedCases,
      theme.text,
      formatCaseAxisLabel,
      formatCaseAxisLabelValue,
      caseLabelRich,
      caseStyleMap,
      theme.grid,
      gridLineStyle,
      finalMin,
      finalMax,
      resolvedTickCount,
      yAxisInterval,
      formatNumericValue,
      axisLabelVisible,
      axisLabelFontSize,
    ]
  );

  const gridPadding = useMemo(() => {
    const bottom = axisLabelVisible ? 36 : 12;
    return axisLabelVisible
      ? { top: 12, right: 16, bottom: 15, left: 16 }
      : { top: 8, right: 8, bottom, left: 8 };
  }, [axisLabelVisible]);

  const option: EChartsOption = useMemo(
    () => ({
      animation: false,
      color: palette,
      textStyle: { color: theme.text },
      grid: { ...gridPadding, containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "line", axis: "x", lineStyle: { color: theme.grid }, snap: true },
        confine: false,
        appendToBody: true,
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        borderWidth: 1,
        borderRadius: 8,
        padding: [8, 10],
        textStyle: { color: theme.text },
        extraCssText: "z-index: 9999;",
        formatter: (params: any) => {
          const items = Array.isArray(params) ? params : [params];
          if (!items.length) return "";
          const axisValue = items[0].axisValue;
          const firstValue = items[0]?.value;
          const rawTime =
            Array.isArray(firstValue) && firstValue.length ? firstValue[0] : axisValue;
          const timeValue = typeof rawTime === "number" ? rawTime : Number(rawTime);
          const header = Number.isFinite(timeValue)
            ? formatTooltipTime(timeValue)
            : String(axisValue);
          if (
            Number.isFinite(timeValue) &&
            listCaseBreakdowns &&
            Array.isArray(listCaseLabels) &&
            listCaseLabels.length
          ) {
            const breakdown = listCaseBreakdowns.get(timeValue) ?? {};
            const total = listCaseLabels.reduce((sum, label) => {
              const count = breakdown[label] ?? 0;
              return sum + count;
            }, 0);
            const formatCount = (val: number) => addThousandsSeparators(String(Math.round(val)));
            const totalLabel = fieldMeta[0]?.label ?? "Total";
            const fallbackColor =
              Array.isArray(items) && typeof items[0]?.color === "string" ? items[0].color : "";
            const resolvedTotalColor = totalLabelColor?.trim() || fallbackColor;
            const totalText = `Total ${totalLabel}`;
            const totalLabelHtml = resolvedTotalColor
              ? `<span style=\"color:${resolvedTotalColor}\">${totalText}</span>`
              : totalText;
            const lines = [
              `${totalLabelHtml}: ${formatCount(total)}`,
              ...listCaseLabels.map((label) => {
                const count = breakdown[label] ?? 0;
                const color = caseColorMap.get(label.toLowerCase());
                const labelHtml = color ? `<span style=\"color:${color}\">${label}</span>` : label;
                return `${labelHtml}: ${formatCount(count)}`;
              }),
            ];
            return [header, ...lines].join("<br/>");
          }
          const seen = new Set<string>();
          const uniqueItems = items.filter((item: any) => {
            const key =
              (typeof item.seriesId === "string" && item.seriesId) ||
              (typeof item.seriesName === "string" && item.seriesName) ||
              String(item.seriesIndex ?? "");
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          const lines: string[] = [];
          const shouldShowTotal = Boolean(totalLabel) || stackSeries;
          if (shouldShowTotal) {
            const total = uniqueItems.reduce((sum: number, item: any) => {
              const raw = Array.isArray(item.value) ? item.value[1] : item.value;
              const numeric = typeof raw === "number" ? raw : Number(raw);
              return Number.isFinite(numeric) ? sum + numeric : sum;
            }, 0);
            if (Number.isFinite(total)) {
              const totalDisplay = formatNumericValue(total);
              const totalUnit = tooltipUnit ? ` ${tooltipUnit}` : "";
              const totalText = totalLabel ? `Total ${totalLabel}` : "Total";
              const fallbackColor =
                typeof uniqueItems[0]?.color === "string" ? uniqueItems[0].color : "";
              const resolvedTotalColor = totalLabelColor?.trim() || fallbackColor;
              const totalLabelHtml = resolvedTotalColor
                ? `<span style=\"color:${resolvedTotalColor}\">${totalText}</span>`
                : totalText;
              lines.push(`${totalLabelHtml}: ${totalDisplay}${totalUnit}`);
            }
          }
          lines.push(
            ...uniqueItems.map((item: any) => {
            const seriesId = typeof item.seriesId === "string" ? item.seriesId : "";
            const meta = metaByField.get(seriesId);
            const label = meta?.label ?? item.seriesName ?? seriesId;
            const unitValue = meta?.unit ?? "";
            const value = Array.isArray(item.value) ? item.value[1] : item.value;
            if (value === null || value === undefined || value === "") {
              return `${label}: --`;
            }
            if (hasCases) {
              const caseLabel =
                typeof value === "number" || typeof value === "string"
                  ? formatCaseValue(value)
                  : String(value);
              const caseColor = caseColorMap.get(caseLabel.toLowerCase());
              const caseLabelHtml = caseColor
                ? `<span style=\"color:${caseColor}\">${caseLabel}</span>`
                : caseLabel;
              const labelColor = typeof item.color === "string" ? item.color : "";
              const labelHtml = labelColor
                ? `<span style=\"color:${labelColor}\">${label}</span>`
                : label;
              return `${labelHtml}: ${caseLabelHtml}`;
            }
            const displayValue =
              typeof value === "number" || typeof value === "string"
                ? formatNumericValue(value)
                : String(value);
            const finalUnit = unitValue || tooltipUnit;
            const labelColor = typeof item.color === "string" ? item.color : "";
            const labelHtml = labelColor
              ? `<span style=\"color:${labelColor}\">${label}</span>`
              : label;
            return finalUnit
              ? `${labelHtml}: ${displayValue} ${finalUnit}`
              : `${labelHtml}: ${displayValue}`;
          })
          );
          return [header, ...lines].join("<br/>");
        },
      },
      xAxis,
      yAxis,
      series,
      dataZoom: [
        {
          type: "inside",
          xAxisIndex: 0,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: true,
          throttle: 50,
          filterMode: "none",
          start: zoomState?.start ?? 0,
          end: zoomState?.end ?? 100,
        },
      ],
    }),
    [
      xAxis,
      yAxis,
      series,
      metaByField,
      tooltipUnit,
      formatNumericValue,
      formatAxisTime,
      formatTooltipTime,
      timeRange,
      palette,
      theme,
      gridPadding,
      gridLineStyle,
      zoomState,
      listCaseBreakdowns,
      listCaseLabels,
      caseColorMap,
      fieldMeta,
      totalLabel,
      totalLabelColor,
    ]
  );

  const chartEvents = useMemo(
    () => ({
      datazoom: (params: any) => {
        const batch = Array.isArray(params?.batch) ? params.batch[0] : null;
        if (!batch) return;
        const { start, end } = batch;
        if (typeof start === "number" && typeof end === "number") {
          setZoomState({ start, end });
        }
      },
      updateAxisPointer: (params: any) => {
        if (Date.now() - lastPointerMoveRef.current > 200) return;
        const axesInfo = Array.isArray(params?.axesInfo) ? params.axesInfo : [];
        const axisInfo = axesInfo.find((info: any) => info?.axisDim === "x") ?? axesInfo[0];
        const axisValue = axisInfo?.value;
        const nextValue = typeof axisValue === "number" ? axisValue : Number(axisValue);
        if (!Number.isFinite(nextValue)) return;
        const nearestTime = getNearestTime(nextValue);
        if (!Number.isFinite(nearestTime ?? NaN)) return;
        setHoveredAxisTime(nearestTime as number);
      },
      showTip: (params: any) => {
        if (Date.now() - lastPointerMoveRef.current > 200) return;
        const axisValue = params?.axisValue;
        const nextValue = typeof axisValue === "number" ? axisValue : Number(axisValue);
        if (!Number.isFinite(nextValue)) return;
        const nearestTime = getNearestTime(nextValue);
        if (!Number.isFinite(nearestTime ?? NaN)) return;
        setHoveredAxisTime(nearestTime as number);
      },
      hideTip: () => {
        setHoveredAxisTime(null);
      },
    }),
    [getNearestTime]
  );

  useEffect(() => {
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart) return;
    chart.dispatchAction({ type: "downplay" });
    if (!hasData) return;
    if (hoveredAxisTime === null) return;
    if (
      visibleTimeRange &&
      (hoveredAxisTime < visibleTimeRange.min || hoveredAxisTime > visibleTimeRange.max)
    ) {
      setHoveredAxisTime(null);
      chart.dispatchAction({ type: "hideTip" });
      return;
    }
    if (hoveredDataIndex === null) {
      setHoveredAxisTime(null);
      chart.dispatchAction({ type: "hideTip" });
      return;
    }
    if (!visibleFields.length) return;
    visibleFields.forEach((_field, seriesIndex) => {
      chart.dispatchAction({
        type: "highlight",
        seriesIndex,
        dataIndex: hoveredDataIndex,
      });
    });
    chart.dispatchAction({
      type: "showTip",
      seriesIndex: 0,
      dataIndex: hoveredDataIndex,
    });
  }, [
    visibleFields,
    hasData,
    hoveredAxisTime,
    visibleTimeRange,
    hoveredDataIndex,
  ]);

  return (
    <div className={styles["line-chart"]} ref={containerRef}>
      {!hasData ? (
        <div className={styles["line-chart-empty"]}>No Data</div>
      ) : (
        <>
          <div
            className={styles["line-chart-plot"]}
            onMouseMove={() => {
              lastPointerMoveRef.current = Date.now();
            }}
            onMouseLeave={() => {
              lastPointerMoveRef.current = 0;
              setHoveredAxisTime(null);
            }}
          >
            <ReactECharts
              key={chartKey}
              ref={chartRef}
              option={option}
              style={{ width: "100%", height: "100%" }}
              replaceMerge={["series"]}
              lazyUpdate
              onEvents={chartEvents}
            />
          </div>
          {showLegend && (
            <div className={styles["line-chart-legend"]}>
              {legendItems.map((item) => {
                const selected = legendSelected[item.field] ?? true;
                return (
                  <button
                    key={item.field}
                    type="button"
                    className={[
                      styles["line-chart-legend-item"],
                      !selected ? styles["line-chart-legend-item-muted"] : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() =>
                      setLegendSelected((prev) => ({
                        ...prev,
                        [item.field]: !(prev[item.field] ?? true),
                      }))
                    }
                  >
                    <span
                      className={styles["line-chart-legend-swatch"]}
                      style={{ backgroundColor: item.color }}
                    />
                    <span className={styles["line-chart-legend-label"]}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
