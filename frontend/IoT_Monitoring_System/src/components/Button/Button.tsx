import React from "react";
import styles from "./Button.module.css";

interface ButtonProps {
  children?: React.ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  icon?: React.ElementType | React.ReactNode;
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "danger" | "cancel";
}

export const Button: React.FC<ButtonProps> = ({
  children,
  isLoading = false,
  disabled = false,
  icon,
  onClick,
  className = "",
  type = "button",
  variant = "primary",
}) => {
  const combined = [styles["gen-btn"], styles[`gen-btn--${variant}`], className].filter(Boolean).join(" ");

  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === "function") {
      const IconComp = icon as React.ElementType;
      return (
        <span className={styles["gen-btn-icon"]} aria-hidden>
          <IconComp />
        </span>
      );
    }
    return (
      <span className={styles["gen-btn-icon"]} aria-hidden>
        {icon}
      </span>
    );
  };

  return (
    <button className={combined} disabled={disabled || isLoading} onClick={onClick} type={type}>
      {isLoading ? "Loading..." : (<>{renderIcon()}{children}</>)}
    </button>
  );
};

export default Button;
