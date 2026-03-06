import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import styles from "./MeterChart.module.css";
import {
  DEFAULT_MAX,
  DEFAULT_MIN,
  DEFAULT_TICKS,
  applyAlpha,
  buildMeterTheme,
  clampValue,
} from "./meterChartUtils";

type MeterChartProps = {
  value: number | null;
  unit?: string;
  min?: number;
  max?: number;
  tickCount?: number;
  valueDecimals?: number;
  color?: string;
};

export function MeterChart({
  value,
  unit,
  min,
  max,
  tickCount,
  valueDecimals,
  color,
}: MeterChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const hasValue = typeof value === "number" && Number.isFinite(value);
  const minValue = typeof min === "number" && Number.isFinite(min) ? min : DEFAULT_MIN;
  const rawMax = typeof max === "number" && Number.isFinite(max) ? max : DEFAULT_MAX;
  const maxValue = Math.max(rawMax, minValue + 1);
  const safeValue = hasValue ? clampValue(value as number, minValue, maxValue) : minValue;
  const resolvedTicks =
    typeof tickCount === "number" && Number.isFinite(tickCount) && tickCount >= 2
      ? Math.round(tickCount)
      : DEFAULT_TICKS;
  const resolvedDecimals =
    typeof valueDecimals === "number" && Number.isFinite(valueDecimals)
      ? Math.max(0, Math.round(valueDecimals))
      : null;
  const unitText = unit?.trim() ?? "";
  const resolvedColor = typeof color === "string" && color.trim() ? color.trim() : "";
  const theme = useMemo(() => buildMeterTheme(), []);
  const accent = resolvedColor || theme.defaultAccent;
  const accentStrong = useMemo(() => applyAlpha(accent, 0.85), [accent]);
  const trackColor = useMemo(() => applyAlpha(theme.text, 0.2), [theme.text]);
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const nextWidth = Math.round(entry.contentRect.width);
      const nextHeight = Math.round(entry.contentRect.height);
      setSize((prev) =>
        prev.width === nextWidth && prev.height === nextHeight
          ? prev
          : { width: nextWidth, height: nextHeight }
      );
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const geometry = useMemo(() => {
    const baseWidth = size.width || 260;
    const baseHeight = size.height || 180;
    const minDim = Math.max(1, Math.min(baseWidth, baseHeight));
    const fontSize = Math.round(minDim * 0.10);
    const labelFontSize = Math.round(minDim * 0.045);
    const padding = Math.max(40, Math.round(minDim * 0.15));
    const detailHeight = Math.round(fontSize * 0.7);
    const targetCenterY = Math.round(baseHeight * 0.6);
    const maxRadiusByWidth = Math.floor(baseWidth / 2) - padding;
    const radiusForCenter = (center: number) =>
      Math.max(1, Math.min(maxRadiusByWidth, center - padding));
    let centerY = Math.max(padding + 1, targetCenterY);
    let gaugeRadius = radiusForCenter(centerY);
    let detailOffset = -Math.round(gaugeRadius * 0.15);
    const detailTop = centerY + detailOffset - detailHeight / 2;
    if (detailTop < padding) {
      const shift = Math.round(padding - detailTop);
      centerY += shift;
      gaugeRadius = radiusForCenter(centerY);
      detailOffset = -Math.round(gaugeRadius * 0.15);
    }
    const centerX = Math.round(baseWidth / 2);
    const ringWidth = Math.max(12, Math.round(gaugeRadius * 0.18));
    const thinRingWidth = Math.max(6, Math.round(ringWidth * 0.27));
    const tickDistance = -Math.round(ringWidth * 1.5);
    const splitDistance = -Math.round(ringWidth * 1.73);
    const labelDistance = -Math.round(ringWidth * 0.67);
    const tickWidth = Math.max(1, Math.round(ringWidth * 0.07));
    const splitWidth = Math.max(2, Math.round(ringWidth * 0.1));
    const splitLength = Math.max(8, Math.round(ringWidth * 0.47));
    return {
      centerX,
      centerY,
      gaugeRadius,
      detailOffset,
      fontSize,
      labelFontSize,
      ringWidth,
      thinRingWidth,
      tickDistance,
      splitDistance,
      labelDistance,
      tickWidth,
      splitWidth,
      splitLength,
    };
  }, [size.width, size.height]);

  const formatValue = useCallback((val: number) => {
    if (!Number.isFinite(val)) return "0";
    if (resolvedDecimals === null) return String(val);
    if (resolvedDecimals === 0) return String(Math.round(val));
    const rounded = val.toFixed(resolvedDecimals);
    return rounded.replace(/(?:\.0+|(\.\d*?[1-9])0+)$/, "$1");
  }, [resolvedDecimals]);

  const detailFormatter = useMemo(() => {
    if (!hasValue) return () => "No data";
    return (val: number) => {
      const numeric = Number.isFinite(val) ? val : safeValue;
      const formatted = formatValue(numeric);
      return unitText ? `${formatted} ${unitText}` : formatted;
    };
  }, [hasValue, unitText, safeValue, formatValue]);

  const option = useMemo<EChartsOption>(
    () => ({
      animation: true,
      animationDuration: 1000,
      animationDurationUpdate: 1000,
      series: [
        {
          type: "gauge",
          center: [geometry.centerX, geometry.centerY],
          radius: geometry.gaugeRadius,
          startAngle: 200,
          endAngle: -20,
          min: minValue,
          max: maxValue,
          splitNumber: resolvedTicks,
          itemStyle: { color: accent },
          progress: { show: true, width: geometry.ringWidth },
          pointer: { show: false },
          axisLine: { lineStyle: { width: geometry.ringWidth, color: [[1, trackColor]] } },
          axisTick: {
            distance: geometry.tickDistance,
            splitNumber: 5,
            lineStyle: {
              width: geometry.tickWidth,
              color: theme.grid,
              shadowBlur: 0,
              shadowColor: "transparent",
            },
          },
          splitLine: {
            distance: geometry.splitDistance,
            length: geometry.splitLength,
            lineStyle: {
              width: geometry.splitWidth,
              color: theme.grid,
              shadowBlur: 0,
              shadowColor: "transparent",
            },
          },
          axisLabel: {
            distance: geometry.labelDistance,
            color: theme.grid,
            fontSize: geometry.labelFontSize,
            formatter: (val: number) => formatValue(val),
          },
          anchor: { show: false },
          title: { show: false },
          detail: {
            valueAnimation: true,
            width: "60%",
            lineHeight: Math.round(geometry.fontSize * 0.7),
            borderRadius: 8,
            offsetCenter: [0, geometry.detailOffset],
            fontSize: geometry.fontSize,
            fontWeight: "bolder",
            formatter: detailFormatter,
            color: theme.text,
          },
          data: [{ value: safeValue }],
        },
        {
          type: "gauge",
          center: [geometry.centerX, geometry.centerY],
          radius: geometry.gaugeRadius,
          startAngle: 200,
          endAngle: -20,
          min: minValue,
          max: maxValue,
          itemStyle: { color: accentStrong },
          progress: { show: true, width: geometry.thinRingWidth },
          pointer: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          detail: { show: false },
          data: [{ value: safeValue }],
        },
      ],
    }),
    [
      geometry,
      minValue,
      maxValue,
      resolvedTicks,
      accent,
      accentStrong,
      trackColor,
      theme,
      formatValue,
      detailFormatter,
      safeValue,
    ]
  );

  return (
    <div className={styles["meter-chart"]} ref={containerRef}>
      <ReactECharts
        option={option}
        style={{ width: "100%", height: "100%" }}
        opts={{ renderer: "canvas" }}
        notMerge={false}
        lazyUpdate={true}
      />
    </div>
  );
}
