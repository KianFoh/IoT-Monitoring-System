import React from "react";
import styles from "./Button.module.css";

interface ButtonProps {
  children?: React.ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  icon?: React.ElementType;
  onClick?: () => void;
  className?: string;
}

export const Button = ({ children, isLoading = false, disabled, icon, onClick, className }: ButtonProps) => {
  const combined = [styles["gen-btn"], className].filter(Boolean).join(" ");

  const renderIcon = () => {
    if (!icon) return null;
    const IconComp = icon as React.ElementType;
    return (
      <span className={styles["gen-btn-icon"]} aria-hidden>
        <IconComp />
      </span>
    );
  };

  return (
    <button className={combined} disabled={disabled || isLoading} onClick={onClick}>
      {isLoading ? "Loading..." : (<>{renderIcon()}{children}</>)}
    </button>
  );
};
