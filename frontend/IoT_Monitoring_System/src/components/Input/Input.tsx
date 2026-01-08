import type { InputHTMLAttributes } from "react";
import styles from "./Input.module.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: string;
  error?: string;
}

export const Input = ({ label, icon, error, id, ...props }: InputProps) => {
  return (
    <div className={styles["gen-inputGroup"]}>
      {label && (
        <label htmlFor={id} className={styles["gen-inputLabel"]}>
          {label}
        </label>
      )}
      <div className={styles["gen-inputContainer"]}>
        {icon && <span className={styles["gen-inputIconLeft"]}>{icon}</span>}
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
