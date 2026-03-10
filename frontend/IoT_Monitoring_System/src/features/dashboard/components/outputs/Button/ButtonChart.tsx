import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Button3D } from "react-3d-button";
import "react-3d-button/dist/styles.css";
import styles from "./ButtonChart.module.css";

type ButtonChartProps = {
  isOn?: boolean;
  onColor?: string;
  offColor?: string;
  onLabel?: string;
  offLabel?: string;
  filledIndicator?: boolean;
  onPress?: () => void;
  disabled?: boolean;
};

const clampColor = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const parseHexColor = (value: string) => {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const hex = match[1];
  if (hex.length === 3) {
    const r = Number.parseInt(hex[0] + hex[0], 16);
    const g = Number.parseInt(hex[1] + hex[1], 16);
    const b = Number.parseInt(hex[2] + hex[2], 16);
    return { r, g, b };
  }
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return { r, g, b };
};

const parseRgbColor = (value: string) => {
  const match =
    /^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\)$/i.exec(
      value.trim()
    );
  if (!match) return null;
  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  const a = match[4] !== undefined ? Number(match[4]) : null;
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null;
  const alpha = a !== null && Number.isFinite(a) ? Math.max(0, Math.min(1, a)) : null;
  return { r, g, b, a: alpha };
};

const toDarkerColor = (value: string, ratio = 0.18) => {
  const parsed = parseHexColor(value) ?? parseRgbColor(value);
  if (!parsed) return value;
  const r = clampColor(parsed.r * (1 - ratio));
  const g = clampColor(parsed.g * (1 - ratio));
  const b = clampColor(parsed.b * (1 - ratio));
  if ("a" in parsed && parsed.a !== null) {
    return `rgba(${r}, ${g}, ${b}, ${parsed.a})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
};

export function ButtonChart({
  isOn = false,
  onColor,
  offColor,
  onLabel,
  offLabel,
  filledIndicator = false,
  onPress,
  disabled = false,
}: ButtonChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const resolvedOnLabel = onLabel?.trim() || "On";
  const resolvedOffLabel = offLabel?.trim() || "Off";
  const label = isOn ? resolvedOnLabel : resolvedOffLabel;
  const stateClass = isOn ? styles["toggle-on"] : styles["toggle-off"];

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

  const buttonWidth =
    size.width > 0 ? Math.max(90, Math.min(size.width, Math.round(size.width * 0.78))) : 160;
  const buttonHeight =
    size.height > 0 ? Math.max(36, Math.min(size.height, Math.round(size.height * 0.32))) : 50;
  const buttonVars = useMemo<CSSProperties>(
    () => {
      const vars: CSSProperties & Record<string, string> = {
        ["--button-default-height" as string]: `${buttonHeight}px`,
        ["--button-horizontal-padding" as string]: "18px",
        ["--button-default-border-radius" as string]: "12px",
        ["--button-raise-level" as string]: "10px",
      };
      const safeOnColor = onColor?.trim() || "";
      const safeOffColor = offColor?.trim() || "";
      if (safeOnColor) {
        vars["--button-success-color" as string] = safeOnColor;
        vars["--button-success-color-dark" as string] = toDarkerColor(safeOnColor);
        vars["--button-success-color-hover" as string] = toDarkerColor(safeOnColor, 0.25);
      }
      if (safeOffColor) {
        vars["--button-danger-color" as string] = safeOffColor;
        vars["--button-danger-color-dark" as string] = toDarkerColor(safeOffColor);
        vars["--button-danger-color-hover" as string] = toDarkerColor(safeOffColor, 0.25);
      }
      return vars;
    },
    [buttonHeight, onColor, offColor]
  );

  return (
    <div className={styles["button-chart"]} ref={containerRef}>
      <Button3D
        type={isOn ? "success" : "danger"}
        rounded="md"
        placeholder={false}
        className={`${styles["button-3d"]} ${stateClass}`}
        style={{ width: buttonWidth, ...buttonVars }}
        aria-label={`Button ${label}`}
        onPress={onPress}
        disabled={disabled}
      >
        <span className={styles["toggle-content"]}>
          <span
            className={`${styles["toggle-indicator"]} ${
              isOn && filledIndicator ? styles["toggle-indicator-filled"] : ""
            }`}
            aria-hidden="true"
          />
          <span className={styles["toggle-label"]}>{label.toUpperCase()}</span>
        </span>
      </Button3D>
    </div>
  );
}
