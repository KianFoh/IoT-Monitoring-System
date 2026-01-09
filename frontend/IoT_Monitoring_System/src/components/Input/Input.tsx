import React from "react";
import type { InputHTMLAttributes } from "react";
import styles from "./Input.module.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode | React.ElementType;
  error?: string;
}

export const Input = ({ label, icon, error, id, ...props }: InputProps) => {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === "function" || typeof icon === "object") {
      const IconComp = icon as React.ElementType;
      return <IconComp />;
    }
    return icon;
  };

  return (
    <div className={styles["gen-inputGroup"]}>
      {label && (
        <label htmlFor={id} className={styles["gen-inputLabel"]}>
          {label}
        </label>
      )}
      <div className={styles["gen-inputContainer"]}>
        {icon && <span className={styles["gen-inputIconLeft"]}>{renderIcon()}</span>}
        <input
          id={id}
          className={`${styles["gen-inputField"]} ${icon ? styles.withIcon : ""} ${error ? styles.inputError : ""}`}
          {...props}
        />
      </div>
      {error && <span className={styles["gen-inputErrorMessage"]}>{error}</span>}
    </div>
  );
};
