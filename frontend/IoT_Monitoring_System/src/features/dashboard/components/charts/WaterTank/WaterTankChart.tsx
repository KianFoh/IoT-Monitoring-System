import styles from "./WaterTankChart.module.css";

type WaterTankChartProps = {
  fillPercent: number | null;
  valueLabel: string;
  caseLabels?: Array<{ label: string; color?: string }>;
  activeCase?: string | null;
  valueColor?: string;
};

const clampPercent = (value: number | null) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
};

export function WaterTankChart({
  fillPercent,
  valueLabel,
  caseLabels = [],
  activeCase,
  valueColor,
}: WaterTankChartProps) {
  const safePercent = clampPercent(fillPercent);
  const normalizedActiveCase = activeCase?.trim().toLowerCase() ?? "";
  const visibleCases = caseLabels
    .map((item) => ({ label: item.label.trim(), color: item.color?.trim() || undefined }))
    .filter((item) => item.label);

  return (
    <div className={styles["water-tank-chart"]}>
      <div className={styles["water-tank-layout"]}>
        <div
          className={styles["water-tank-shell"]}
          aria-label={`Water tank level ${safePercent}%`}
        >
          <div className={styles["water-tank-body"]}>
            <div
              className={styles["water-tank-water"]}
              style={{ height: `${safePercent}%` }}
            >
              <div className={styles["water-tank-wave"]} />
            </div>
            <div className={styles["water-tank-highlight"]} />
            <div className={styles["water-tank-band"]} style={{ top: "33.33%" }} />
            <div className={styles["water-tank-band"]} style={{ top: "66.66%" }} />
            {visibleCases.length > 0 && (
              <div className={styles["water-tank-case-list"]}>
                {visibleCases.map(({ label, color }) => {
                  const isActive = label.toLowerCase() === normalizedActiveCase;
                  return (
                    <span
                      key={label}
                      className={isActive ? styles["water-tank-case-active"] : undefined}
                      style={color ? { backgroundColor: color } : undefined}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          <div className={styles["water-tank-feet"]}>
            <span />
            <span />
          </div>
        </div>
      </div>
      <div
        className={styles["water-tank-value"]}
        style={valueColor ? { color: valueColor } : undefined}
      >
        {valueLabel}
      </div>
    </div>
  );
}
