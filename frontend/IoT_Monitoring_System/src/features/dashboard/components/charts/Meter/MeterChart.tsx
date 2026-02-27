import { useEffect, useMemo, useRef, useState } from "react";
import ReactSpeedometer from "react-d3-speedometer";
import styles from "./MeterChart.module.css";

type MeterChartProps = {
  value: number | null;
  unit?: string;
  min?: number;
  max?: number;
};

type Size = {
  width: number;
  height: number;
};

const DEFAULT_MIN = 0;
const DEFAULT_MAX = 100;
const FALLBACK_WIDTH = 180;
const FALLBACK_HEIGHT = 140;
// react-d3-speedometer replaces this token with the formatted value.
const VALUE_PLACEHOLDER = "${value}";

const clampValue = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function MeterChart({
  value,
  unit,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
}: MeterChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  const hasValue = Number.isFinite(value);
  const numericValue = Number.isFinite(value) ? value! : min;
  const unitText = unit?.trim() ?? "";
  const valueText = unitText ? `${VALUE_PLACEHOLDER} ${unitText}` : VALUE_PLACEHOLDER;

  const maxValue = Math.max(max, min + 1, numericValue);
  const safeValue = clampValue(numericValue, min, maxValue);

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

  const { width, height, paddingHorizontal, paddingVertical } = useMemo(() => {
    const baseWidth = size.width || FALLBACK_WIDTH;
    const baseHeight = size.height || FALLBACK_HEIGHT;

    const paddingHorizontal = Math.max(4, Math.round(baseWidth * 0.06));
    const paddingVertical = Math.max(4, Math.round(baseHeight * 0.06));

    // Space reserved for value text + labels
    const textSafePadding = Math.round(baseHeight * 0.14);

    const usableWidth = Math.max(1, baseWidth - paddingHorizontal * 2);
    const usableHeight = Math.max(1, baseHeight - paddingVertical * 2 - textSafePadding);

    // Natural speedometer aspect ratio
    const ASPECT_RATIO = 0.7; // height = width * 0.7

    // Max size allowed by each constraint
    const maxWidthFromHeight = usableHeight / ASPECT_RATIO;

    // Uniform scaling: pick the limiting dimension
    const width = Math.max(1, Math.floor(Math.min(usableWidth, maxWidthFromHeight)));
    const height = Math.max(1, Math.floor(width * ASPECT_RATIO));

    return {
      width,
      height,
      paddingHorizontal,
      paddingVertical,
    };
  }, [size.width, size.height]);


  const ringWidth = Math.max(18, Math.round(width * 0.12));
  const valueTextFontSize = Math.max(13, Math.round(width * 0.075));
  const labelFontSize = Math.max(11, Math.round(width * 0.05));

  const needleColor = "var(--color-primary-200)";
  const textColor = "var(--text-white)";
  const currentValueText = hasValue ? valueText : "No data";

  const renderKey = `${width}x${height}-min${min}-max${max}`;

  return (
    <div ref={containerRef} className={styles["meter-chart"]}>
      <ReactSpeedometer
        key={renderKey}
        minValue={min}
        maxValue={maxValue}
        value={safeValue}
        segments={4}
        segmentColors={["#22c55e", "#e5ff00", "#f59e0b", "#ef4444"]}
        needleColor={needleColor}
        textColor={textColor}
        currentValueText={currentValueText}
        valueFormat=".2~f"
        width={width}
        height={height}
        ringWidth={ringWidth}
        needleHeightRatio={0.75}
        valueTextFontSize={`${valueTextFontSize}px`}
        labelFontSize={`${labelFontSize}px`}
        paddingHorizontal={paddingHorizontal}
        paddingVertical={paddingVertical}
      />
    </div>
  );
}
