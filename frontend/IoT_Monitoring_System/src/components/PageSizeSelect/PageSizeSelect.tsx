interface PageSizeSelectProps {
  value: number;
  onChange: (n: number) => void;
  options?: number[];
  className?: string;
}

export default function PageSizeSelect({ value, onChange, options = [5, 10, 20, 50, 100], className }: PageSizeSelectProps) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }} className={className}>
      <span style={{ fontSize: 12, color: "var(--text-inverse)" }}>Show</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid var(--color-overlay-white-medium)", background: "var(--color-overlay-white-light)", color: "var(--text-inverse)" }}
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
