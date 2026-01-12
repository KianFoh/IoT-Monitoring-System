import React from "react";
import styles from "./Switch.module.css";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  label?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const Switch = ({ checked, onChange, id, label, className = "", disabled }: SwitchProps) => {
  const generatedId = React.useId ? React.useId() : `gen-switch-${Math.random().toString(36).slice(2,9)}`;
  const inputId = id ?? generatedId;

  return (
    <div className={`${styles["gen-switch-wrapper"]} ${className}`}>
      <input
        id={inputId}
        className={styles["gen-switch-input"]}
        type="checkbox"
        role="switch"
        aria-checked={checked}
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
