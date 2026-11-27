import type { CSSProperties, Dispatch, HTMLAttributes, SetStateAction } from "react";
import { forwardRef } from "react";
import { FaEllipsisV } from "react-icons/fa";
import { MeterChart } from "../charts/Meter/MeterChart";
import { LineChart } from "../charts/Line/LineChart";
import { PieChart } from "../charts/Pie/PieChart";
import { BarChart } from "../charts/Bar/BarChart";
import { StatChart } from "../charts/Stat/StatChart";
import { WaterTankChart } from "../charts/WaterTank/WaterTankChart";
import { ButtonChart } from "../outputs/Button/ButtonChart";
import styles from "./DeviceDataChart.module.css";
import type {
  ChartFilterMode,
  ChartItem,
  ChartRangePreset,
  DataFieldMetric,
  DataFieldType,
  LineGranularity,
} from "./types/deviceDataChartTypes";
import { parseNumericValue } from "./utils/deviceDataChartUtils";
import {
  buildCaseColorsKey,
  buildChartConfigKey,
  buildBooleanCaseCounts,
  buildDynamicListCounts,
  buildDynamicListLabels,
  buildLineData,
  buildListCaseCounts,
  buildListKey,
  formatStatNumber,
  formatStatUnitValue,
  getRangeGranularity,
  normalizeCaseList,
  resolveListCount,
} from "./utils/deviceChartHelpers";

const normalizeBooleanValue = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    if (value === 0) return false;
    if (value === 1) return true;
    return null;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return null;
};

const formatMapValue = (value: unknown) => {
  if (value === null || value === undefined) return "--";
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== null && item !== undefined);
    if (
      entries.length > 0 &&
      entries.every(([, item]) => ["string", "number", "boolean"].includes(typeof item))
    ) {
      return entries.map(([key, item]) => `${key}: ${String(item)}`).join(", ");
    }
    return JSON.stringify(value);
  }
  return String(value);
};

const getCountTotal = (value: unknown) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "boolean") return 1;
  if (Array.isArray(value)) return value.length;
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce<number>((sum, item) => {
      if (typeof item === "number" && Number.isFinite(item)) return sum + item;
      if (typeof item === "boolean") return sum + 1;
      if (typeof item === "string") {
        const parsed = Number(item.trim());
        return Number.isFinite(parsed) ? sum + parsed : sum + 1;
      }
      return item === null || item === undefined ? sum : sum + 1;
    }, 0);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : 1;
  }
  return 0;
};

type DeviceChartCardProps = HTMLAttributes<HTMLDivElement> & {
  chart: ChartItem;
  isEditing: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  allowOutputControl?: boolean;
  activeMenuId: string | null;
  setActiveMenuId: Dispatch<SetStateAction<string | null>>;
  onEdit: (chart: ChartItem) => void;
  onRemove: (chartId: string) => void;
  onViewDetails?: (chart: ChartItem) => void;
  onOutputSend?: (field: string, value: string | number | boolean) => void;
  filterMode: ChartFilterMode;
  rangePreset: ChartRangePreset;
  timeGranularity: LineGranularity;
  rawSeries: Array<{ ts: number; data: Record<string, unknown> }>;
  filteredRawData: Array<{ ts: number; data: Record<string, unknown> }>;
  filteredLatestValues: Record<string, unknown>;
  frozenValues?: Record<string, unknown> | null;
  zoomResetKey: string;
  getChartValue?: (field: string) => unknown;
  getChartUnit?: (field: string) => string;
  getChartLabel?: (field: string) => string;
  getChartType?: (field: string) => DataFieldType;
  getChartMetric?: (field: string) => DataFieldMetric | string;
  getChartColor?: (field: string) => string;
  getChartCases?: (field: string) => string[] | null | undefined;
  getChartCaseColors?: (field: string) => Record<string, string> | null | undefined;
  getChartBooleanColors?: (
    field: string
  ) => { trueColor?: string; falseColor?: string } | null | undefined;
  getChartBooleanLabels?: (
    field: string
  ) => { trueLabel?: string; falseLabel?: string } | null | undefined;
};

export const DeviceChartCard = forwardRef<HTMLDivElement, DeviceChartCardProps>(function DeviceChartCard(
  {
    chart,
    isEditing,
    disabled,
    readOnly,
    allowOutputControl = false,
    activeMenuId,
    setActiveMenuId,
    onEdit,
    onRemove,
    onViewDetails,
    onOutputSend,
    filterMode,
    rangePreset,
    timeGranularity,
    rawSeries,
    filteredRawData,
    filteredLatestValues,
    frozenValues,
    zoomResetKey,
    getChartValue,
    getChartUnit,
    getChartLabel,
    getChartType,
    getChartMetric,
    getChartColor,
    getChartCases,
    getChartCaseColors,
    getChartBooleanColors,
    getChartBooleanLabels,
    className,
    style,
    ...containerProps
  },
  ref
) {
  void readOnly;
  const cardClassName = `${styles["device-chart-card"]} ${
    isEditing ? styles["device-chart-card-editing"] : ""
  }${className ? ` ${className}` : ""}`;
  const rawValue =
    filterMode === "raw"
      ? isEditing && frozenValues
        ? frozenValues[chart.field] ?? null
        : getChartValue
          ? getChartValue(chart.field)
          : null
      : filteredLatestValues[chart.field] ?? null;
  const numericValue = parseNumericValue(rawValue);
  const unit = getChartUnit ? getChartUnit(chart.field) : "";
  const fieldLabel = getChartLabel ? getChartLabel(chart.field) : chart.field;
  const meterMin = typeof chart.min === "number" ? chart.min : undefined;
  const meterMax = typeof chart.max === "number" ? chart.max : undefined;
  const tickCount = typeof chart.tick_count === "number" ? chart.tick_count : undefined;
  const valueDecimals = typeof chart.value_decimals === "number" ? chart.value_decimals : undefined;
  const fieldType = getChartType?.(chart.field) ?? null;
  const fieldMetric = getChartMetric?.(chart.field);
  const isLineChart = chart.type === "line" || chart.type === "area";
  const lineFieldType = isLineChart ? fieldType : null;
  const isLineText = lineFieldType === "text";
  const isLineBoolean = lineFieldType === "boolean";
  const isLineList = lineFieldType === "list";
  const isLineTextCount =
    isLineText && fieldMetric === "count" && filterMode !== "raw";
  const isLineBooleanCount =
    isLineBoolean && fieldMetric === "count" && filterMode !== "raw";
  const isPieChart = chart.type === "pie";
  const isPieList = isPieChart && fieldType === "list";
  const isPieTextCount = isPieChart && fieldType === "text" && fieldMetric === "count";
  const isPieBooleanCount = isPieChart && fieldType === "boolean" && fieldMetric === "count";
  const canRenderPie = isPieList || isPieTextCount || isPieBooleanCount;
  const isBarChart = chart.type === "bar";
  const isBarList = isBarChart && fieldType === "list";
  const isBarTextCount = isBarChart && fieldType === "text" && fieldMetric === "count";
  const isBarBooleanCount = isBarChart && fieldType === "boolean" && fieldMetric === "count";
  const canRenderBar = isBarList || isBarTextCount || isBarBooleanCount;
  const isStatChart = chart.type === "stat";
  const canViewStatDetails =
    isStatChart &&
    (fieldType === "list" ||
      (filterMode !== "raw" &&
        (fieldType === "text" || fieldType === "boolean") &&
        fieldMetric === "count")) &&
    typeof onViewDetails === "function";
  const isWaterTankChart = chart.type === "water_tank";
  const isButtonChart = chart.type === "button";
  const panelCases = normalizeCaseList(getChartCases?.(chart.field));
  const chartCases = normalizeCaseList(chart.value_cases);
  const booleanCaseLabels = (() => {
    if (fieldType !== "boolean") return [];
    const labels = getChartBooleanLabels?.(chart.field) ?? null;
    const trueLabel = labels?.trueLabel?.trim() || "True";
    const falseLabel = labels?.falseLabel?.trim() || "False";
    return [falseLabel, trueLabel];
  })();
  const lineCases =
    isLineText || isLineList
      ? (panelCases.length ? panelCases : chartCases)
      : isLineBoolean
        ? booleanCaseLabels
        : [];
  const pieCases = isPieBooleanCount
    ? booleanCaseLabels
    : isPieChart
      ? (panelCases.length ? panelCases : chartCases)
      : [];
  const barCases = isBarBooleanCount
    ? booleanCaseLabels
    : isBarChart
      ? (panelCases.length ? panelCases : chartCases)
      : [];
  const panelCaseColors = getChartCaseColors?.(chart.field) ?? null;
  const caseColors = panelCases.length ? panelCaseColors : null;
  const booleanCaseColors = (() => {
    if (fieldType !== "boolean") return null;
    const colors = getChartBooleanColors?.(chart.field) ?? null;
    const trueColor = colors?.trueColor?.trim() || "";
    const falseColor = colors?.falseColor?.trim() || "";
    const [falseLabel, trueLabel] = booleanCaseLabels;
    const map: Record<string, string> = {};
    if (falseLabel && falseColor) map[falseLabel] = falseColor;
    if (trueLabel && trueColor) map[trueLabel] = trueColor;
    return Object.keys(map).length ? map : null;
  })();
  const lineCaseColors = isLineBoolean ? booleanCaseColors : caseColors;
  const waterTankCaseColorSource = (() => {
    if (fieldType === "boolean") {
      const colors = getChartBooleanColors?.(chart.field) ?? null;
      const trueColor = colors?.trueColor?.trim() || "";
      const falseColor = colors?.falseColor?.trim() || "";
      const [falseLabel, trueLabel] = booleanCaseLabels;
      const map: Record<string, string> = {};
      if (falseLabel && falseColor) map[falseLabel] = falseColor;
      if (trueLabel && trueColor) map[trueLabel] = trueColor;
      return Object.keys(map).length ? map : null;
    }
    return caseColors;
  })();
  const caseColorMap = caseColors
    ? (() => {
        const map = new Map<string, string>();
        Object.entries(caseColors).forEach(([label, color]) => {
          const key = label.trim().toLowerCase();
          const value = typeof color === "string" ? color.trim() : "";
          if (!key || !value) return;
          map.set(key, value);
        });
        return map;
      })()
    : null;
  const resolveCaseColor = (label: string) => {
    if (!caseColorMap) return undefined;
    const color = caseColorMap.get(label.trim().toLowerCase());
    return color || undefined;
  };
  const waterTankCaseColorMap = waterTankCaseColorSource
    ? (() => {
        const map = new Map<string, string>();
        Object.entries(waterTankCaseColorSource).forEach(([label, color]) => {
          const key = label.trim().toLowerCase();
          const value = typeof color === "string" ? color.trim() : "";
          if (!key || !value) return;
          map.set(key, value);
        });
        return map;
      })()
    : null;
  const resolveWaterTankCaseColor = (label: string) => {
    if (!waterTankCaseColorMap) return undefined;
    return waterTankCaseColorMap.get(label.trim().toLowerCase()) || undefined;
  };
  const outputCase = chart.value_cases?.[0] ?? "";
  const outputCaseLabel = outputCase.trim();
  const outputCaseColor = outputCaseLabel ? resolveCaseColor(outputCaseLabel) : undefined;
  const useCategoricalAxis =
    ((isLineText && !isLineTextCount) || (isLineBoolean && !isLineBooleanCount)) &&
    lineCases.length > 0;
  const canUseLineListMode = isLineList || isLineTextCount || isLineBooleanCount;
  const lineListMode = canUseLineListMode && chart.line_list_mode === "multi" ? "multi" : "single";
  const isLineListMulti = canUseLineListMode && lineListMode === "multi";
  const lineMin = useCategoricalAxis ? undefined : meterMin;
  const lineMax = useCategoricalAxis ? undefined : meterMax;
  const lineTickCount = useCategoricalAxis ? undefined : tickCount;
  const lineColor = getChartColor ? (getChartColor(chart.field) || "").trim() : "";
  const chartConfigKey = buildChartConfigKey([
    chart.id,
    chart.type,
    chart.field,
    chart.name ?? "",
    chart.min ?? "",
    chart.max ?? "",
    chart.tick_count ?? "",
    chart.value_decimals ?? "",
    chart.stat_font_size ?? "",
    chart.bar_orientation ?? "",
    chart.bar_race_mode ? 1 : 0,
    (chart.pie_show_labels ?? true) ? 1 : 0,
    chart.line_list_mode ?? "",
    typeof chart.line_smooth === "boolean" ? (chart.line_smooth ? 1 : 0) : "",
    chart.output_value_type ?? "",
    buildListKey(chart.value_cases),
    fieldType ?? "",
    buildListKey(panelCases),
    buildListKey(chartCases),
    buildCaseColorsKey(fieldType === "boolean" ? booleanCaseColors : caseColors),
    lineColor,
    unit,
  ]);
  const statColor = (() => {
    if (!isStatChart) return lineColor || undefined;
    if (fieldType === "boolean") {
      const colors = getChartBooleanColors?.(chart.field) ?? null;
      const trueColor = colors?.trueColor?.trim() || "";
      const falseColor = colors?.falseColor?.trim() || "";
      const normalized = normalizeBooleanValue(rawValue);
      if (normalized === true) return trueColor || lineColor || undefined;
      if (normalized === false) return falseColor || lineColor || undefined;
      return lineColor || undefined;
    }
    if (fieldType === "text") {
      const caseColors = getChartCaseColors?.(chart.field) ?? null;
      if (caseColors && rawValue !== null && rawValue !== undefined) {
        const key = String(rawValue).trim();
        if (key) {
          return caseColors[key] || caseColors[key.toLowerCase()] || lineColor || undefined;
        }
      }
    }
    return lineColor || undefined;
  })();
  const statValue = (() => {
    if (!isStatChart) return null;
    if (
      fieldMetric === "count" &&
      !(filterMode === "raw" && (fieldType === "boolean" || fieldType === "text"))
    ) {
      return formatStatUnitValue(getCountTotal(rawValue), unit);
    }
    if (fieldType === "list") {
      const count = resolveListCount([], rawValue);
      const safeCount = typeof count === "number" && Number.isFinite(count) ? count : 0;
      return formatStatUnitValue(safeCount, unit);
    }
    if (fieldType === "boolean") {
      const labels = getChartBooleanLabels?.(chart.field) ?? null;
      const trueLabel = labels?.trueLabel?.trim() || "True";
      const falseLabel = labels?.falseLabel?.trim() || "False";
      const normalized = normalizeBooleanValue(rawValue);
      if (normalized === true) return trueLabel;
      if (normalized === false) return falseLabel;
      if (rawValue === null || rawValue === undefined) return "--";
      const fallback = String(rawValue);
      return fallback || "--";
    }
    if (fieldType === "text") {
      if (rawValue === null || rawValue === undefined) return "--";
      const text = String(rawValue).trim();
      return text || "--";
    }
    if (numericValue !== null) {
      const formatted = formatStatNumber(numericValue, valueDecimals);
      return formatStatUnitValue(formatted, unit);
    }
    if (rawValue === null || rawValue === undefined) return "--";
    const fallback = formatMapValue(rawValue);
    return formatStatUnitValue(fallback, unit);
  })();
  const waterTankCases = (() => {
    if (!isWaterTankChart) return [];
    if (fieldType === "boolean") {
      const labels = getChartBooleanLabels?.(chart.field) ?? null;
      const falseLabel = labels?.falseLabel?.trim() || "False";
      const trueLabel = labels?.trueLabel?.trim() || "True";
      return [falseLabel, trueLabel];
    }
    return panelCases.length ? panelCases : chartCases;
  })();
  const waterTankState = (() => {
    if (!isWaterTankChart) {
      return {
        fillPercent: null,
        valueLabel: "--",
        activeCase: null as string | null,
        valueColor: undefined as string | undefined,
      };
    }
    if (fieldType === "number" || fieldType === null) {
      const minValue = typeof meterMin === "number" ? meterMin : 0;
      const maxValue = Math.max(typeof meterMax === "number" ? meterMax : 100, minValue + 1);
      const fillPercent =
        numericValue === null ? null : ((numericValue - minValue) / (maxValue - minValue)) * 100;
      const valueLabel =
        numericValue === null
          ? "--"
          : formatStatUnitValue(formatStatNumber(numericValue, valueDecimals), unit);
      return { fillPercent, valueLabel, activeCase: null, valueColor: lineColor || undefined };
    }
    if (fieldType === "boolean") {
      const normalized = normalizeBooleanValue(rawValue);
      const activeCase =
        normalized === true
          ? waterTankCases[1] ?? "True"
          : normalized === false
            ? waterTankCases[0] ?? "False"
            : null;
      return {
        fillPercent: normalized === true ? 100 : normalized === false ? 0 : null,
        valueLabel: activeCase ?? "--",
        activeCase,
        valueColor: activeCase ? resolveWaterTankCaseColor(activeCase) : undefined,
      };
    }
    if (fieldType === "text") {
      const rawLabel = rawValue === null || rawValue === undefined ? "" : String(rawValue).trim();
      const matchedIndex = rawLabel
        ? waterTankCases.findIndex((item) => item.toLowerCase() === rawLabel.toLowerCase())
        : -1;
      const fillPercent =
        matchedIndex >= 0 && waterTankCases.length
          ? ((matchedIndex + 1) / waterTankCases.length) * 100
          : rawLabel
            ? 100
            : null;
      const activeCase = matchedIndex >= 0 ? waterTankCases[matchedIndex] : rawLabel || null;
      return {
        fillPercent,
        valueLabel: rawLabel || "--",
        activeCase,
        valueColor: activeCase ? resolveWaterTankCaseColor(activeCase) : undefined,
      };
    }
    if (fieldType === "list") {
      const activeCase =
        waterTankCases.find((label) => {
          const count = resolveListCount([label], rawValue);
          return typeof count === "number" && count > 0;
        }) ?? null;
      const matchedIndex = activeCase
        ? waterTankCases.findIndex((item) => item.toLowerCase() === activeCase.toLowerCase())
        : -1;
      const fillPercent =
        matchedIndex >= 0 && waterTankCases.length
          ? ((matchedIndex + 1) / waterTankCases.length) * 100
          : null;
      const totalCount = resolveListCount([], rawValue);
      const fallbackLabel =
        typeof totalCount === "number" && Number.isFinite(totalCount)
          ? formatStatUnitValue(totalCount, unit)
          : "--";
      return {
        fillPercent,
        valueLabel: activeCase ?? fallbackLabel,
        activeCase,
        valueColor: activeCase ? resolveWaterTankCaseColor(activeCase) : undefined,
      };
    }
    return { fillPercent: null, valueLabel: "--", activeCase: null, valueColor: undefined };
  })();
  const waterTankCaseLabels = waterTankCases.map((label) => ({
    label,
    color: resolveWaterTankCaseColor(label),
  }));
  const isLiveMode = filterMode === "raw";
  const isOutputEnabled =
    isButtonChart &&
    isLiveMode &&
    !isEditing &&
    !disabled &&
    allowOutputControl &&
    typeof onOutputSend === "function";
  const buttonState = (() => {
    if (!isButtonChart) return false;
    if (rawValue === null || rawValue === undefined) return false;
    if ((fieldType === "text" || fieldType === "list") && outputCaseLabel) {
      if (fieldType === "list") {
        const count = resolveListCount([outputCaseLabel], rawValue);
        return typeof count === "number" ? count > 0 : false;
      }
      const normalizedValue = String(rawValue).trim().toLowerCase();
      if (!normalizedValue) return false;
      return normalizedValue === outputCaseLabel.toLowerCase();
    }
    if (typeof rawValue === "boolean") return rawValue;
    if (typeof rawValue === "number") return Number.isFinite(rawValue) ? rawValue !== 0 : false;
    const normalized = String(rawValue).trim().toLowerCase();
    if (!normalized) return false;
    if (["true", "on", "yes", "1", "enabled", "active"].includes(normalized)) return true;
    if (["false", "off", "no", "0", "disabled", "inactive"].includes(normalized)) return false;
    return false;
  })();
  const outputSendValue = (() => {
    if (!isButtonChart) return null;
    if (fieldType === "boolean") {
      return buttonState ? "false" : "true";
    }
    if ((fieldType === "text" || fieldType === "list") && outputCaseLabel) {
      return outputCaseLabel;
    }
    return null;
  })();
  const handleButtonPress = () => {
    if (!isOutputEnabled || outputSendValue === null) return;
    onOutputSend?.(chart.field, outputSendValue);
  };
  const { buttonOnColor, buttonOffColor } = (() => {
    if (!isButtonChart) {
      return { buttonOnColor: undefined, buttonOffColor: undefined };
    }
    if (fieldType === "boolean") {
      const booleanColors = getChartBooleanColors?.(chart.field) ?? null;
      const trueColor = booleanColors?.trueColor?.trim() || "";
      const falseColor = booleanColors?.falseColor?.trim() || "";
      return {
        buttonOnColor: trueColor || undefined,
        buttonOffColor: falseColor || undefined,
      };
    }
    if (fieldType === "text" || fieldType === "list") {
      const caseColor = outputCaseColor?.trim() || "";
      if (!caseColor) {
        return { buttonOnColor: undefined, buttonOffColor: undefined };
      }
      return { buttonOnColor: caseColor, buttonOffColor: caseColor };
    }
    const numericColor = lineColor?.trim() || "";
    if (!numericColor) {
      return { buttonOnColor: undefined, buttonOffColor: undefined };
    }
    return { buttonOnColor: numericColor, buttonOffColor: numericColor };
  })();
  const { buttonOnLabel, buttonOffLabel } = (() => {
    if (!isButtonChart) {
      return { buttonOnLabel: undefined, buttonOffLabel: undefined };
    }
    if (fieldType === "boolean") {
      const booleanLabels = getChartBooleanLabels?.(chart.field) ?? null;
      const trueLabel = booleanLabels?.trueLabel?.trim() || "True";
      const falseLabel = booleanLabels?.falseLabel?.trim() || "False";
      return { buttonOnLabel: trueLabel, buttonOffLabel: falseLabel };
    }
    if ((fieldType === "text" || fieldType === "list") && outputCaseLabel) {
      return { buttonOnLabel: outputCaseLabel, buttonOffLabel: outputCaseLabel };
    }
    return { buttonOnLabel: undefined, buttonOffLabel: undefined };
  })();
  const statFontSize =
    isStatChart && typeof chart.stat_font_size === "number" && Number.isFinite(chart.stat_font_size)
      ? chart.stat_font_size
      : undefined;
  const sourceRows = filterMode === "raw" ? rawSeries : filteredRawData;
  const lineListLabels = isLineListMulti
    ? lineCases.length
      ? lineCases
      : buildDynamicListLabels(sourceRows, chart.field)
    : lineCases;
  const { lineData, listCaseBreakdowns } = buildLineData(sourceRows, chart.field, {
    isLineList,
    isLineListMulti,
    isLineTextCount,
    isLineBooleanCount,
    isLineText,
    isLineBoolean,
    lineCases,
    lineListLabels,
    parseNumericValue,
  });
  const pieCaseColors = isPieBooleanCount ? booleanCaseColors : caseColors;
  const resolvePieCaseColor = (label: string) => {
    if (!pieCaseColors) return undefined;
    const match = Object.entries(pieCaseColors).find(
      ([key]) => key.trim().toLowerCase() === label.trim().toLowerCase()
    );
    const color = typeof match?.[1] === "string" ? match[1].trim() : "";
    return color || undefined;
  };
  const pieCounts = canRenderPie
    ? isPieBooleanCount
      ? buildBooleanCaseCounts(pieCases, rawValue)
      : pieCases.length
        ? buildListCaseCounts(pieCases, rawValue)
        : buildDynamicListCounts(rawValue)
    : {};
  const pieSeriesData = canRenderPie
    ? pieCases.length
      ? pieCases.map((label) => ({
          name: label,
          value: pieCounts[label] ?? 0,
          color: resolvePieCaseColor(label),
        }))
      : Object.entries(pieCounts).map(([label, value]) => ({
          name: label,
          value,
          color: resolvePieCaseColor(label),
        }))
    : [];
  const pieLegendData = pieCases.length ? pieCases : pieSeriesData.map((item) => item.name);
  const barCounts = isBarList
    ? barCases.length
      ? buildListCaseCounts(barCases, rawValue)
      : buildDynamicListCounts(rawValue)
    : canRenderBar
      ? isBarBooleanCount
        ? buildBooleanCaseCounts(barCases, rawValue)
        : barCases.length
          ? buildListCaseCounts(barCases, rawValue)
          : buildDynamicListCounts(rawValue)
    : {};
  const barCaseColors = isBarBooleanCount ? booleanCaseColors : caseColors;
  const resolveBarCaseColor = (label: string) => {
    if (!barCaseColors) return undefined;
    const match = Object.entries(barCaseColors).find(
      ([key]) => key.trim().toLowerCase() === label.trim().toLowerCase()
    );
    const color = typeof match?.[1] === "string" ? match[1].trim() : "";
    return color || undefined;
  };
  const barSeriesData = canRenderBar
    ? barCases.length
      ? barCases.map((label) => ({
          name: label,
          value: barCounts[label] ?? 0,
          color: resolveBarCaseColor(label),
        }))
      : Object.entries(barCounts).map(([label, value]) => ({
          name: label,
          value,
          color: resolveBarCaseColor(label),
        }))
    : [];
  const lineTimeGranularity =
    filterMode === "range"
      ? getRangeGranularity(rangePreset)
      : filterMode === "custom"
        ? timeGranularity
        : undefined;
  const chartContent =
    chart.type === "meter" ? (
      <MeterChart
        key={chartConfigKey}
        value={numericValue}
        unit={unit}
        min={meterMin}
        max={meterMax}
        tickCount={tickCount}
        valueDecimals={valueDecimals}
        color={lineColor}
      />
    ) : chart.type === "water_tank" ? (
      <WaterTankChart
        key={chartConfigKey}
        fillPercent={waterTankState.fillPercent}
        valueLabel={waterTankState.valueLabel}
        caseLabels={waterTankCaseLabels}
        activeCase={waterTankState.activeCase}
        valueColor={waterTankState.valueColor}
      />
    ) : chart.type === "line" || chart.type === "area" ? (
      <LineChart
        key={`${chartConfigKey}:${zoomResetKey}`}
        data={lineData}
        fields={
          isLineListMulti
            ? lineListLabels
            : chart.field
              ? [chart.field]
              : []
        }
        unit={unit}
        getFieldLabel={getChartLabel}
        getFieldUnit={getChartUnit}
        min={lineMin}
        max={lineMax}
        tickCount={lineTickCount}
        valueDecimals={useCategoricalAxis ? undefined : valueDecimals}
        cases={useCategoricalAxis ? lineCases : undefined}
        listCaseLabels={listCaseBreakdowns ? lineCases : undefined}
        listCaseBreakdowns={listCaseBreakdowns}
        caseColors={lineCaseColors ?? undefined}
        lineColor={lineColor || undefined}
        smooth={chart.line_smooth}
        variant={chart.type === "area" ? "area" : "line"}
        stackSeries={isLineListMulti && chart.type === "area"}
        totalLabel={canUseLineListMode ? fieldLabel : undefined}
        totalLabelColor={canUseLineListMode ? (lineColor || undefined) : undefined}
        resetZoomKey={zoomResetKey}
        timeGranularity={lineTimeGranularity}
        assumeSorted={filterMode !== "raw"}
      />
    ) : chart.type === "pie" ? (
      canRenderPie ? (
        <PieChart
          key={chartConfigKey}
          data={pieSeriesData}
          legendData={pieLegendData}
          seriesName={chart.name || fieldLabel}
          showLabels={chart.pie_show_labels ?? true}
        />
      ) : (
        <div className={styles["device-chart-placeholder"]}>
          Pie chart requires a list field or a text/boolean count field.
        </div>
      )
    ) : chart.type === "bar" ? (
      canRenderBar ? (
        <BarChart
          key={chartConfigKey}
          data={barSeriesData}
          orientation={chart.bar_orientation ?? "horizontal"}
          raceMode={chart.bar_race_mode ?? false}
          unit={unit}
        />
      ) : (
        <div className={styles["device-chart-placeholder"]}>
          Bar chart requires a list field or a text/boolean count field.
        </div>
      )
    ) : chart.type === "stat" ? (
      <StatChart
        key={chartConfigKey}
        value={statValue}
        color={statColor}
        fontSize={statFontSize}
      />
    ) : chart.type === "button" ? (
      <ButtonChart
        key={chartConfigKey}
        isOn={buttonState}
        onColor={buttonOnColor}
        offColor={buttonOffColor}
        onLabel={buttonOnLabel}
        offLabel={buttonOffLabel}
        filledIndicator={fieldType === "boolean" || fieldType === "text" || fieldType === "list"}
        onPress={handleButtonPress}
        disabled={!isOutputEnabled}
      />
    ) : (
      <div className={styles["device-chart-placeholder"]}>Chart type not supported.</div>
    );

  return (
    <div
      ref={ref}
      className={cardClassName}
      style={style as CSSProperties}
      {...containerProps}
    >
      <div className={styles["device-chart-card-header"]}>
        <span className={styles["device-chart-card-title"]}>
          {chart.name || fieldLabel || "New panel"}
        </span>
        <div className={styles["device-chart-card-actions"]} data-chart-menu={chart.id}>
          {(isEditing || canViewStatDetails) && (
            <>
              <button
                type="button"
                className={`${styles["device-chart-menu-button"]} ${
                  activeMenuId === chart.id ? styles["device-chart-menu-button-active"] : ""
                }`}
                aria-label="Chart options"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveMenuId((prev) => (prev === chart.id ? null : chart.id));
                }}
              >
                <FaEllipsisV />
              </button>
              {activeMenuId === chart.id && (
                <div
                  className={styles["device-chart-menu"]}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  {canViewStatDetails && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenuId(null);
                        onViewDetails?.(chart);
                      }}
                      disabled={getCountTotal(rawValue) === 0}
                    >
                      View details
                    </button>
                  )}
                  {isEditing && (
                    <>
                      <button type="button" onClick={() => onEdit(chart)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className={styles["device-chart-menu-remove"]}
                        onClick={() => onRemove(chart.id)}
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className={styles["device-chart-card-body"]}>{chartContent}</div>
    </div>
  );
});
