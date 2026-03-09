import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Button3D } from "react-3d-button";
import "react-3d-button/dist/styles.css";
import styles from "./ButtonChart.module.css";

type ButtonChartProps = {
  isOn?: boolean;
};

export function ButtonChart({ isOn = false }: ButtonChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const label = isOn ? "On" : "Off";
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
    () =>
      ({
        ["--button-default-height" as string]: `${buttonHeight}px`,
        ["--button-horizontal-padding" as string]: "18px",
        ["--button-default-border-radius" as string]: "12px",
        ["--button-raise-level" as string]: "10px",
      }) as CSSProperties,
    [buttonHeight]
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
      >
        <span className={styles["toggle-content"]}>
          <span className={styles["toggle-indicator"]} aria-hidden="true" />
          <span className={styles["toggle-label"]}>{label.toUpperCase()}</span>
        </span>
      </Button3D>
    </div>
  );
}
