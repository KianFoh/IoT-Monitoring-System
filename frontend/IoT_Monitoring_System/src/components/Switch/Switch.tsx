import { useId } from "react";
import type { ReactNode } from "react";
import styles from "./Switch.module.css";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  label?: ReactNode;
  className?: string;
  disabled?: boolean;
}

export const Switch = ({ checked, onChange, id, label, className = "", disabled }: SwitchProps) => {
  const inputId = id ?? useId();

  return (
    <div className={`${styles["gen-switch-wrapper"]} ${className}`}>
      <input
        id={inputId}
        className={styles["gen-switch-input"]}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />

      <label htmlFor={inputId} className={styles["gen-switch-toggle"]}>
        <span className={styles["gen-switch"]} aria-hidden />
      </label>

      {label ? <span className={styles["gen-switch-text"]}>{label}</span> : null}
    </div>
  );
};

export default Switch;
