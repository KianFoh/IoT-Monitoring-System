import styles from "./PageSizeSelect.module.css";

interface PageSizeSelectProps {
  value: number;
  onChange: (n: number) => void;
  options?: number[];
  className?: string;
}

export default function PageSizeSelect({ value, onChange, options = [5, 10, 20, 50, 100], className }: PageSizeSelectProps) {
  return (
    <label className={[styles["gen-page-size"], className].filter(Boolean).join(" ")}>
      <span className={styles["gen-page-size-label"]}>Show</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={styles["gen-page-size-select"]}
        aria-label="Select page size"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
