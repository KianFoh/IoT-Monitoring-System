import { useEffect, useMemo, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { config } from "@/config";
import styles from "./BarChart.module.css";
import {
  buildBarChartTheme,
  createNumberFormatter,
  wrapLabel,
} from "./barChartUtils";

export type BarChartDatum = {
  name: string;
  value: number;
  color?: string;
};

type BarChartProps = {
  data: BarChartDatum[];
  orientation?: "horizontal" | "vertical";
  unit?: string;
  raceMode?: boolean;
};

export function BarChart({
  data,
  orientation = "horizontal",
  unit,
  raceMode = false,
}: BarChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReactECharts | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const effectiveOrientation = raceMode ? "horizontal" : orientation;
  const normalizedData = useMemo(
    () =>
      data
        .map((item) => ({
          name: item.name?.trim() ?? "",
          value: Number.isFinite(item.value) ? item.value : 0,
          color: typeof item.color === "string" ? item.color.trim() : undefined,
        }))
        .filter((item) => item.name),
    [data]
  );

  const sortedData = useMemo(() => {
    if (!raceMode) return normalizedData;
    return [...normalizedData].sort((a, b) => b.value - a.value);
  }, [normalizedData, raceMode]);
  const categories = useMemo(() => sortedData.map((item) => item.name), [sortedData]);
  const hasData = sortedData.length > 0;
  const tooltipUnit = unit?.trim() ?? "";
  const isCompact =
    containerSize.width > 0 &&
    (containerSize.width < 260 || containerSize.height < 180);
  const isTiny =
    containerSize.width > 0 &&
    (containerSize.width < 200 || containerSize.height < 120);
  const axisLabelVisible = !isTiny;
  const axisLabelFontSize = isCompact ? 10 : 12;
  const showValueLabels = !isTiny;
  const gridPadding = useMemo(() => {
    const bottomBase = effectiveOrientation === "vertical" ? 70 : 24;
    const bottom = axisLabelVisible ? bottomBase : 12;
    return axisLabelVisible
      ? { top: 12, right: 60, bottom: 5, left: 0 }
      : { top: 8, right: 8, bottom, left: 8 };
  }, [axisLabelVisible, effectiveOrientation]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    let frameId = 0;
    const updateSize = () => {
      const rect = node.getBoundingClientRect();
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
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);

  const theme = useMemo(() => buildBarChartTheme(), []);

  const fallbackColor = theme.fallback ?? theme.primary;

  const numberFormatter = useMemo(() => createNumberFormatter(), []);
  const formatValue = useMemo(
    () => (value: number) => {
      if (!Number.isFinite(value)) return "--";
      return numberFormatter.format(value);
    },
    [numberFormatter]
  );

  const seriesData = useMemo(
    () =>
      sortedData.map((item) => ({
        value: item.value,
        name: item.name,
        itemStyle: item.color ? { color: item.color } : { color: fallbackColor },
      })),
    [sortedData, fallbackColor]
  );

  const categoryAxis = useMemo(
    () => ({
      type: "category" as const,
      data: categories,
      axisLabel: {
        show: axisLabelVisible,
        color: theme.text,
        fontSize: axisLabelFontSize,
        hideOverlap: true,
        lineHeight: effectiveOrientation === "vertical" ? 14 : 12,
        margin:
          effectiveOrientation === "vertical"
            ? (axisLabelVisible ? 12 : 6)
            : axisLabelVisible
              ? 8
              : 4,
        formatter:
          effectiveOrientation === "vertical"
            ? (value: string) => wrapLabel(String(value), 10, 3)
            : undefined,
      },
      axisLine: { lineStyle: { color: theme.grid } },
      axisTick: axisLabelVisible ? { lineStyle: { color: theme.grid } } : { show: false },
    }),
    [categories, theme.text, theme.grid, effectiveOrientation, axisLabelVisible, axisLabelFontSize]
  );

  const valueAxis = useMemo(
    () => ({
      type: "value" as const,
      axisLabel: {
        show: axisLabelVisible,
        color: theme.text,
        fontSize: axisLabelFontSize,
        formatter: (value: number) => formatValue(value),
      },
      axisLine: { lineStyle: { color: theme.grid } },
      axisTick: axisLabelVisible ? { lineStyle: { color: theme.grid } } : { show: false },
      splitLine: {
        show: axisLabelVisible,
        lineStyle: { color: theme.grid, type: "dashed" as const },
      },
    }),
    [theme.text, theme.grid, formatValue, axisLabelVisible, axisLabelFontSize]
  );

  const option = useMemo<EChartsOption>(
    () => ({
      animation: true,
      animationDuration: config.chart.animationMs,
      animationDurationUpdate: config.chart.animationMs,
      animationEasingUpdate: raceMode ? "linear" : "cubicOut",
      grid: { ...gridPadding, containLabel: true },
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          const name = params?.name ?? "";
          const value = typeof params?.value === "number" ? params.value : Number(params?.value);
          const displayValue = Number.isFinite(value) ? formatValue(value) : "--";
          const color = typeof params?.color === "string" ? params.color : "";
          const labelHtml = color ? `<span style=\"color:${color}\">${name}</span>` : String(name);
          const unitLabel = tooltipUnit ? ` ${tooltipUnit}` : "";
          return `${labelHtml}: ${displayValue}${unitLabel}`;
        },
        confine: false,
        appendToBody: true,
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        borderWidth: 1,
        borderRadius: 8,
        padding: [8, 10],
        textStyle: { color: theme.text },
        extraCssText: "z-index: 9999;",
      },
      xAxis:
        effectiveOrientation === "horizontal"
          ? raceMode
            ? { ...valueAxis, max: "dataMax" }
            : valueAxis
          : categoryAxis,
      yAxis:
        effectiveOrientation === "horizontal"
          ? {
              ...categoryAxis,
              inverse: true,
              ...(raceMode
                ? {
                    animationDuration: config.chart.animationMs,
                    animationDurationUpdate: config.chart.animationMs,
                  }
                : {}),
            }
          : valueAxis,
      series: [
        {
          type: "bar",
          data: seriesData,
          barMaxWidth: 32,
          realtimeSort: raceMode,
          label: {
            show: showValueLabels,
            position: effectiveOrientation === "horizontal" ? "right" : "top",
            color: theme.text,
            valueAnimation: raceMode,
            fontFamily: raceMode ? "monospace" : undefined,
            formatter: (params: any) => {
              const value = typeof params?.value === "number" ? params.value : Number(params?.value);
              return Number.isFinite(value) ? formatValue(value) : "";
            },
          },
        },
      ],
    }),
    [
      effectiveOrientation,
      valueAxis,
      categoryAxis,
      seriesData,
      theme.tooltipBg,
      theme.tooltipBorder,
      theme.text,
      tooltipUnit,
      formatValue,
      gridPadding,
      showValueLabels,
      raceMode,
    ]
  );

  if (!hasData) {
    return <div className={styles["bar-chart-empty"]}>No Data</div>;
  }

  return (
    <div className={styles["bar-chart"]} ref={containerRef}>
      <ReactECharts ref={chartRef} option={option} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
