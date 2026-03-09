import type { CSSProperties, Dispatch, HTMLAttributes, SetStateAction } from "react";
import { forwardRef } from "react";
import { FaEllipsisV } from "react-icons/fa";
import { MeterChart } from "../charts/Meter/MeterChart";
import { LineChart } from "../charts/Line/LineChart";
import { PieChart } from "../charts/Pie/PieChart";
import { BarChart } from "../charts/Bar/BarChart";
import { StatChart } from "../charts/Stat/StatChart";
import { ButtonChart } from "../outputs/Button/ButtonChart";
import styles from "./DeviceDataChart.module.css";
import type {
  ChartFilterMode,
  ChartItem,
  ChartRangePreset,
  DataFieldType,
  LineGranularity,
} from "./types/deviceDataChartTypes";
import { parseNumericValue } from "./utils/deviceDataChartUtils";
import {
  buildCaseColorsKey,
  buildChartConfigKey,
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

type DeviceChartCardProps = HTMLAttributes<HTMLDivElement> & {
  chart: ChartItem;
  isEditing: boolean;
  activeMenuId: string | null;
  setActiveMenuId: Dispatch<SetStateAction<string | null>>;
  onEdit: (chart: ChartItem) => void;
  onRemove: (chartId: string) => void;
  filterMode: ChartFilterMode;
  rangePreset: ChartRangePreset;
  timeGranularity: LineGranularity;
  rawSeries: Array<{ ts: number; data: Record<string, unknown> }>;
  filteredRawData: Array<{ ts: number; data: Record<string, unknown> }>;
  filteredLatestValues: Record<string, unknown>;
  zoomResetKey: string;
  getChartValue?: (field: string) => unknown;
  getChartUnit?: (field: string) => string;
  getChartLabel?: (field: string) => string;
  getChartType?: (field: string) => DataFieldType;
  getChartColor?: (field: string) => string;
  getChartCases?: (field: string) => string[] | null | undefined;
  getChartCaseColors?: (field: string) => Record<string, string> | null | undefined;
};

export const DeviceChartCard = forwardRef<HTMLDivElement, DeviceChartCardProps>(function DeviceChartCard(
  {
    chart,
    isEditing,
    activeMenuId,
    setActiveMenuId,
    onEdit,
    onRemove,
    filterMode,
    rangePreset,
    timeGranularity,
    rawSeries,
    filteredRawData,
    filteredLatestValues,
    zoomResetKey,
    getChartValue,
    getChartUnit,
    getChartLabel,
    getChartType,
    getChartColor,
    getChartCases,
    getChartCaseColors,
    className,
    style,
    ...containerProps
  },
  ref
) {
  const cardClassName = `${styles["device-chart-card"]} ${
    isEditing ? styles["device-chart-card-editing"] : ""
  }${className ? ` ${className}` : ""}`;
  const rawValue =
    filterMode === "raw"
      ? getChartValue
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
  const isLineChart = chart.type === "line" || chart.type === "area";
  const lineFieldType = isLineChart ? fieldType : null;
  const isLineText = lineFieldType === "text";
  const isLineList = lineFieldType === "list";
  const isPieChart = chart.type === "pie";
  const isPieList = isPieChart && fieldType === "list";
  const isBarChart = chart.type === "bar";
  const isBarList = isBarChart && fieldType === "list";
  const isStatChart = chart.type === "stat";
  const isButtonChart = chart.type === "button";
  const panelCases = normalizeCaseList(getChartCases?.(chart.field));
  const chartCases = normalizeCaseList(chart.value_cases);
  const lineCases = isLineText || isLineList ? (panelCases.length ? panelCases : chartCases) : [];
  const pieCases = isPieChart ? (panelCases.length ? panelCases : chartCases) : [];
  const barCases = isBarChart ? (panelCases.length ? panelCases : chartCases) : [];
  const panelCaseColors = getChartCaseColors?.(chart.field) ?? null;
  const caseColors = panelCases.length ? panelCaseColors : null;
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
  const useCategoricalAxis = isLineText && lineCases.length > 0;
  const lineListMode = isLineList && chart.line_list_mode === "multi" ? "multi" : "single";
  const isLineListMulti = isLineList && lineListMode === "multi";
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
    chart.output_value_type ?? "",
    buildListKey(chart.value_cases),
    fieldType ?? "",
    buildListKey(panelCases),
    buildListKey(chartCases),
    buildCaseColorsKey(caseColors),
    lineColor,
    unit,
  ]);
  const statColor = (() => {
    if (!isStatChart) return lineColor || undefined;
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
    if (fieldType === "list") {
      const count = resolveListCount([], rawValue);
      const safeCount = typeof count === "number" && Number.isFinite(count) ? count : 0;
      return formatStatUnitValue(safeCount, unit);
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
    const fallback = String(rawValue);
    return formatStatUnitValue(fallback, unit);
  })();
  const buttonState = (() => {
    if (!isButtonChart) return false;
    if (rawValue === null || rawValue === undefined) return false;
    if (typeof rawValue === "boolean") return rawValue;
    if (typeof rawValue === "number") return Number.isFinite(rawValue) ? rawValue !== 0 : false;
    const normalized = String(rawValue).trim().toLowerCase();
    if (!normalized) return false;
    if (["true", "on", "yes", "1", "enabled", "active"].includes(normalized)) return true;
    if (["false", "off", "no", "0", "disabled", "inactive"].includes(normalized)) return false;
    return false;
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
    isLineText,
    lineCases,
    lineListLabels,
    parseNumericValue,
  });
  const pieCounts = isPieList
    ? pieCases.length
      ? buildListCaseCounts(pieCases, rawValue)
      : buildDynamicListCounts(rawValue)
    : {};
  const pieSeriesData = isPieList
    ? pieCases.length
      ? pieCases.map((label) => ({
          name: label,
          value: pieCounts[label] ?? 0,
          color: resolveCaseColor(label),
        }))
      : Object.entries(pieCounts).map(([label, value]) => ({
          name: label,
          value,
          color: resolveCaseColor(label),
        }))
    : [];
  const pieLegendData = pieCases.length ? pieCases : pieSeriesData.map((item) => item.name);
  const barCounts = isBarList
    ? barCases.length
      ? buildListCaseCounts(barCases, rawValue)
      : buildDynamicListCounts(rawValue)
    : {};
  const barSeriesData = isBarList
    ? barCases.length
      ? barCases.map((label) => ({
          name: label,
          value: barCounts[label] ?? 0,
          color: resolveCaseColor(label),
        }))
      : Object.entries(barCounts).map(([label, value]) => ({
          name: label,
          value,
          color: resolveCaseColor(label),
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
        caseColors={caseColors ?? undefined}
        lineColor={lineColor || undefined}
        variant={chart.type === "area" ? "area" : "line"}
        stackSeries={isLineListMulti && chart.type === "area"}
        totalLabel={isLineList ? fieldLabel : undefined}
        totalLabelColor={isLineList ? (lineColor || undefined) : undefined}
        resetZoomKey={zoomResetKey}
        timeGranularity={lineTimeGranularity}
        assumeSorted={filterMode !== "raw"}
      />
    ) : chart.type === "pie" ? (
      isPieList ? (
        <PieChart
          key={chartConfigKey}
          data={pieSeriesData}
          legendData={pieLegendData}
          seriesName={chart.name || fieldLabel}
          showLabels={chart.pie_show_labels ?? true}
        />
      ) : (
        <div className={styles["device-chart-placeholder"]}>
          Pie chart requires a list-type field.
        </div>
      )
    ) : chart.type === "bar" ? (
      isBarList ? (
        <BarChart
          key={chartConfigKey}
          data={barSeriesData}
          orientation={chart.bar_orientation ?? "horizontal"}
          raceMode={chart.bar_race_mode ?? false}
          unit={unit}
        />
      ) : (
        <div className={styles["device-chart-placeholder"]}>
          Bar chart requires a list-type field.
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
      <ButtonChart key={chartConfigKey} isOn={buttonState} />
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
          {isEditing && (
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
