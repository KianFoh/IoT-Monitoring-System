import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import styles from "./StatChart.module.css";

type StatChartProps = {
  value: string | number | null;
  color?: string;
  fontSize?: number | null;
};

type ParsedStatValue = {
  raw: string;
  isNumeric: boolean;
  numeric: number | null;
  suffix: string;
  decimals: number;
};

const addThousandsSeparators = (raw: string) => {
  const [intPart, fracPart] = raw.split(".");
  const sign = intPart.startsWith("-") ? "-" : "";
  const digits = sign ? intPart.slice(1) : intPart;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${grouped}${fracPart ? `.${fracPart}` : ""}`;
};

const parseStatValue = (value: string | number | null): ParsedStatValue => {
  if (value === null || value === undefined) {
    return { raw: "", isNumeric: false, numeric: null, suffix: "", decimals: 0 };
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return { raw: "", isNumeric: false, numeric: null, suffix: "", decimals: 0 };
    }
    const rawText = String(value);
    const decimals = rawText.includes(".") ? rawText.split(".")[1]?.length ?? 0 : 0;
    return {
      raw: rawText,
      isNumeric: true,
      numeric: value,
      suffix: "",
      decimals,
    };
  }
  const raw = String(value).trim();
  if (!raw) {
    return { raw: "", isNumeric: false, numeric: null, suffix: "", decimals: 0 };
  }
  const match = raw.match(/^([+-]?(?:\d+\.?\d*|\.\d+))(.*)$/);
  if (!match) {
    return { raw, isNumeric: false, numeric: null, suffix: "", decimals: 0 };
  }
  const numericPart = match[1];
  const numericValue = Number(numericPart);
  if (!Number.isFinite(numericValue)) {
    return { raw, isNumeric: false, numeric: null, suffix: "", decimals: 0 };
  }
  const decimals = numericPart.includes(".") ? numericPart.split(".")[1]?.length ?? 0 : 0;
  const suffix = match[2] ?? "";
  return {
    raw,
    isNumeric: true,
    numeric: numericValue,
    suffix,
    decimals,
  };
};

const formatNumericValue = (value: number, decimals: number) => {
  if (!Number.isFinite(value)) return "--";
  if (decimals <= 0) return addThousandsSeparators(String(Math.round(value)));
  const rounded = value.toFixed(decimals);
  const trimmed = rounded.replace(/(?:\.0+|(\.\d*?[1-9])0+)$/, "$1");
  return addThousandsSeparators(trimmed);
};

export function StatChart({ value, color, fontSize: preferredFontSize }: StatChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [displayValue, setDisplayValue] = useState(() => {
    const parsed = parseStatValue(value);
    if (!parsed.isNumeric || parsed.numeric === null) {
      return parsed.raw;
    }
    return `${formatNumericValue(parsed.numeric, parsed.decimals)}${parsed.suffix}`;
  });
  const animationFrameRef = useRef<number | null>(null);
  const hasValue = value !== null && value !== undefined && String(value).trim() !== "";
  const parsed = useMemo(() => parseStatValue(value), [value]);
  const previousNumericRef = useRef<number | null>(parsed.isNumeric ? parsed.numeric : null);

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

  useEffect(() => {
    if (!hasValue) return;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (!parsed.isNumeric || parsed.numeric === null) {
      setDisplayValue(parsed.raw);
      previousNumericRef.current = null;
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    }

    const target = parsed.numeric;
    const suffix = parsed.suffix;
    const start = previousNumericRef.current;
    previousNumericRef.current = target;
    const duration = 1000;
    if (start === null || !Number.isFinite(start) || start === target) {
      setDisplayValue(`${formatNumericValue(target, parsed.decimals)}${suffix}`);
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    }
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - startTime) / duration));
      const eased = easeOutCubic(progress);
      const current = start + (target - start) * eased;
      setDisplayValue(`${formatNumericValue(current, parsed.decimals)}${suffix}`);
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    };
    animationFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [value, hasValue, parsed]);

  const minDim = Math.max(1, Math.min(size.width || 0, size.height || 0));
  const autoBaseFont = minDim > 0 ? Math.round(minDim * 0.30) : 28;
  const autoFontSize = Math.min(84, Math.max(10, autoBaseFont));
  const userFontSize =
    typeof preferredFontSize === "number" && Number.isFinite(preferredFontSize) && preferredFontSize > 0
      ? Math.round(preferredFontSize)
      : null;
  const baseFontSize = userFontSize ?? autoFontSize;
  const [scaledFontSize, setScaledFontSize] = useState(baseFontSize);
  const hideValue = minDim > 0 && minDim < 28;

  useEffect(() => {
    setScaledFontSize(baseFontSize);
  }, [baseFontSize]);

  useLayoutEffect(() => {
    if (!hasValue || hideValue) return;
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;
    const containerRect = container.getBoundingClientRect();
    if (containerRect.width <= 0 || containerRect.height <= 0) return;
    const previousFontSize = text.style.fontSize;
    const previousMaxWidth = text.style.maxWidth;
    const previousOverflow = text.style.overflow;
    text.style.fontSize = `${baseFontSize}px`;
    text.style.maxWidth = "none";
    text.style.overflow = "visible";
    const rect = text.getBoundingClientRect();
    const textWidth = text.scrollWidth || rect.width;
    const textHeight = text.scrollHeight || rect.height;
    text.style.fontSize = previousFontSize;
    text.style.maxWidth = previousMaxWidth;
    text.style.overflow = previousOverflow;
    if (textWidth <= 0 || textHeight <= 0) return;
    const scale = Math.min(
      containerRect.width / textWidth,
      containerRect.height / textHeight,
      1
    );
    const nextFontSize = Math.max(1, Math.floor(baseFontSize * scale));
    if (Math.abs(nextFontSize - scaledFontSize) >= 1) {
      setScaledFontSize(nextFontSize);
    }
  }, [baseFontSize, displayValue, hasValue, hideValue, scaledFontSize, size.height, size.width]);

  if (!hasValue) {
    return <div className={styles["stat-chart-empty"]}>No Data</div>;
  }

  return (
    <div className={styles["stat-chart"]} ref={containerRef}>
      {!hideValue && (
        <span
          className={styles["stat-chart-value"]}
          ref={textRef}
          style={{ fontSize: scaledFontSize, ...(color ? { color } : {}) }}
        >
          {parsed.isNumeric ? displayValue : displayValue || parsed.raw || value}
        </span>
      )}
    </div>
  );
}
