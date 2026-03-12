import { useEffect, useMemo, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { config } from "@/config";
import styles from "./PieChart.module.css";

export type PieChartDatum = {
  name: string;
  value: number;
  color?: string;
};

type PieChartProps = {
  data: PieChartDatum[];
  legendData?: string[];
  seriesName?: string;
  showLabels?: boolean;
};

const FALLBACK_TEXT = "#e2e8f0";
const FALLBACK_MUTED = "rgba(255,255,255,0.6)";
const FALLBACK_TOOLTIP_BG = "#0f172a";
const FALLBACK_TOOLTIP_BORDER = "rgba(255,255,255,0.12)";
const FALLBACK_SERIES = "#9ca3af";

const addThousandsSeparators = (raw: string) => {
  const [intPart, fracPart] = raw.split(".");
  const sign = intPart.startsWith("-") ? "-" : "";
  const digits = sign ? intPart.slice(1) : intPart;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${grouped}${fracPart ? `.${fracPart}` : ""}`;
};

export function PieChart({ data, legendData, seriesName, showLabels = true }: PieChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReactECharts | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [legendSelected, setLegendSelected] = useState<Record<string, boolean>>({});
  const sanitizedData = useMemo(
    () => data.filter((item) => Number.isFinite(item.value)),
    [data]
  );
  const legendLabels = useMemo(() => {
    if (legendData && legendData.length) {
      return legendData;
    }
    return [...sanitizedData.map((item) => item.name)].sort((a, b) => a.localeCompare(b));
  }, [legendData, sanitizedData]);
  const seriesData = useMemo(() => {
    const dataByName = new Map<string, PieChartDatum>();
    sanitizedData.forEach((item) => {
      dataByName.set(item.name, item);
    });
    const orderedNames = legendLabels.length
      ? legendLabels
      : [...sanitizedData.map((item) => item.name)].sort((a, b) => a.localeCompare(b));
    return orderedNames.map((name) => dataByName.get(name) ?? { name, value: 0 });
  }, [legendLabels, sanitizedData]);
  const total = useMemo(
    () => seriesData.reduce((sum, item) => sum + Math.max(0, item.value), 0),
    [seriesData]
  );
  const hasData = seriesData.length > 0 && total > 0;
  const isCompact =
    containerSize.width > 0 &&
    (containerSize.width < 280 || containerSize.height < 180);
  const isTiny =
    containerSize.width > 0 &&
    (containerSize.width < 220 || containerSize.height < 130);
  const showLegend = legendLabels.length > 0 && !isCompact;
  const showLabelsEffective = showLabels && !isTiny;
  const labelFontSize = isCompact ? 10 : 12;
  const chartCenter: [string, string] = showLegend ? ["40%", "50%"] : ["50%", "50%"];
  const chartRadius = showLegend ? "55%" : isTiny ? "70%" : "65%";

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

  useEffect(() => {
    if (!legendLabels.length) {
      setLegendSelected({});
      return;
    }
    setLegendSelected((prev) => {
      const next = { ...prev };
      let changed = false;
      legendLabels.forEach((label) => {
        if (next[label] === undefined) {
          next[label] = true;
          changed = true;
        }
      });
      Object.keys(next).forEach((label) => {
        if (!legendLabels.includes(label)) {
          delete next[label];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [legendLabels]);

  const theme = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        text: FALLBACK_TEXT,
        muted: FALLBACK_MUTED,
        tooltipBg: FALLBACK_TOOLTIP_BG,
        tooltipBorder: FALLBACK_TOOLTIP_BORDER,
        fallback: FALLBACK_SERIES,
      };
    }
    const rootStyles = getComputedStyle(document.documentElement);
    const readVar = (name: string, fallback: string) => {
      const value = rootStyles.getPropertyValue(name).trim();
      return value || fallback;
    };
    return {
      text: readVar("--color-primary-100", FALLBACK_TEXT),
      muted: readVar("--color-overlay-white-medium", FALLBACK_MUTED),
      tooltipBg: readVar("--color-dark-900", FALLBACK_TOOLTIP_BG),
      tooltipBorder: readVar("--color-dark-600", FALLBACK_TOOLTIP_BORDER),
      fallback: readVar("--color-neutral-400", FALLBACK_SERIES),
    };
  }, []);

  const seriesByName = useMemo(() => {
    const map = new Map<string, PieChartDatum>();
    seriesData.forEach((item) => map.set(item.name, item));
    return map;
  }, [seriesData]);

  const legendItems = useMemo(
    () =>
      legendLabels.map((label) => {
        const item = seriesByName.get(label);
        return {
          name: label,
          value: item?.value ?? 0,
          color: item?.color?.trim() || theme.fallback,
        };
      }),
    [legendLabels, seriesByName, theme.fallback]
  );

  const isItemSelected = (name: string) => legendSelected[name] ?? true;

  const pieSeriesData = useMemo(
    () =>
      legendItems
        .filter((item) => item.value > 0 && isItemSelected(item.name))
        .map((item) => ({
          id: item.name,
          name: item.name,
          value: item.value,
          itemStyle: { color: item.color },
        })),
    [legendItems, legendSelected]
  );

  const handleLegendToggle = (name: string) => {
    setLegendSelected((prev) => ({
      ...prev,
      [name]: !(prev[name] ?? true),
    }));
  };

  const option = useMemo<EChartsOption>(
    () => ({
      animationTypeUpdate: "transition",
      animation: true,
      animationDuration: config.chart.animationMs,
      animationDurationUpdate: config.chart.animationMs,
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          const name = params?.name ?? "";
          const value = params?.value ?? "";
          const percent = params?.percent ?? "";
          const color = typeof params?.color === "string" ? params.color : "";
          const numericValue = typeof value === "number" ? value : Number(value);
          const displayValue = Number.isFinite(numericValue)
            ? addThousandsSeparators(String(numericValue))
            : String(value);
          const labelHtml = color
            ? `<span style=\"color:${color}\">${name}</span>`
            : String(name);
          return `${labelHtml} : ${displayValue} (${percent}%)`;
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
      series: [
        {
          id: "pie-series",
          name: seriesName ?? "",
          type: "pie",
          animationType: "expansion",
          animationTypeUpdate: "transition",
          avoidLabelOverlap: !showLabelsEffective,
          radius: chartRadius,
          center: chartCenter,
          data: pieSeriesData,
          labelLayout: { hideOverlap: false },
          label: { color: theme.text, show: showLabelsEffective, fontSize: labelFontSize },
          labelLine: { show: showLabelsEffective },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
        },
      ],
    }),
    [
      pieSeriesData,
      seriesName,
      theme,
      showLabelsEffective,
      labelFontSize,
      chartCenter,
      chartRadius,
    ]
  );

  if (!hasData && legendLabels.length === 0) {
    return <div className={styles["pie-chart-empty"]}>No Data</div>;
  }

  return (
    <div className={styles["pie-chart"]} ref={containerRef}>
      <div className={styles["pie-chart-plot"]}>
        <ReactECharts ref={chartRef} option={option} style={{ width: "100%", height: "100%"}} />
      </div>
      {showLegend && (
        <div className={styles["pie-chart-legend"]}>
          <div className={styles["pie-chart-legend-list"]}>
            {legendItems.map((item) => {
              const selected = isItemSelected(item.name);
              return (
                <button
                  key={item.name}
                  type="button"
                  className={[
                    styles["pie-chart-legend-item"],
                    !selected ? styles["pie-chart-legend-item-muted"] : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleLegendToggle(item.name)}
                >
                  <span
                    className={styles["pie-chart-legend-swatch"]}
                    style={{ backgroundColor: item.color }}
                  />
                  <span className={styles["pie-chart-legend-label"]}>{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
