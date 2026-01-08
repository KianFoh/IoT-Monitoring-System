import type { ButtonHTMLAttributes } from "react";
import styles from './Button.module.css';


interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
}

export const Button = ({
  children,
  isLoading = false,
  disabled,
}: ButtonProps) => {
  return (
    <button
      className={styles["gen-btn"]}
      disabled={disabled || isLoading}
    >
      {isLoading ? "Loading..." : children}
    </button>
  );
};
