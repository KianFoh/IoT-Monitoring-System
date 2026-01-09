import styles from "../styles/dashboard.module.css";

interface PageSizeSelectProps {
  value: number;
  onChange: (n: number) => void;
  options?: number[];
  className?: string;
}

export default function PageSizeSelect({ value, onChange, options = [5, 10, 20], className }: PageSizeSelectProps) {
  return (
    <div className={[styles["dashboard-page-size-select"], className].filter(Boolean).join(" ")}>
      <label className={styles["dashboard-page-size-label"]}>
        Show
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={styles["dashboard-page-size-select-input"]}
          aria-label="Select page size"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
