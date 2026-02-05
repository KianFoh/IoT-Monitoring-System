import React from "react";
import type { InputHTMLAttributes } from "react";
import styles from "./Input.module.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode | React.ElementType;
  rightIcon?: React.ReactNode | React.ElementType;
  onRightIconClick?: () => void;
  rightIconLabel?: string;
  error?: string;
  groupClassName?: string;
  labelClassName?: string;
  containerClassName?: string;
  inputClassName?: string;
}

export const Input = ({
  label,
  icon,
  rightIcon,
  onRightIconClick,
  rightIconLabel,
  error,
  id,
  groupClassName,
  labelClassName,
  containerClassName,
  inputClassName,
  ...props
}: InputProps) => {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === "function" || typeof icon === "object") {
      const IconComp = icon as React.ElementType;
      return <IconComp />;
    }
    return icon;
  };

  const renderRightIcon = () => {
    if (!rightIcon) return null;
    if (React.isValidElement(rightIcon)) return rightIcon;
    if (typeof rightIcon === "function" || typeof rightIcon === "object") {
      const IconComp = rightIcon as React.ElementType;
      return <IconComp />;
    }
    return rightIcon;
  };

  return (
    <div className={[styles["gen-inputGroup"], groupClassName].filter(Boolean).join(" ")}>
      {label && (
        <label
          htmlFor={id}
          className={[styles["gen-inputLabel"], labelClassName].filter(Boolean).join(" ")}
        >
          {label}
        </label>
      )}
      <div className={[styles["gen-inputContainer"], containerClassName].filter(Boolean).join(" ")}>
        {icon && <span className={styles["gen-inputIconLeft"]}>{renderIcon()}</span>}
        {rightIcon && (
          onRightIconClick ? (
            <button
              type="button"
              className={styles["gen-inputIconButton"]}
              onClick={onRightIconClick}
              aria-label={rightIconLabel || "Toggle input"}
              disabled={props.disabled}
            >
              <span className={styles["gen-inputIconRight"]}>{renderRightIcon()}</span>
            </button>
          ) : (
            <span className={styles["gen-inputIconRight"]}>{renderRightIcon()}</span>
          )
        )}
        <input
          id={id}
          className={[
            styles["gen-inputField"],
            icon ? styles.withIcon : "",
            rightIcon ? styles.withRightIcon : "",
            error ? styles.inputError : "",
            inputClassName ?? "",
          ].filter(Boolean).join(" ")}
          {...props}
        />
      </div>
      {error && <span className={styles["gen-inputErrorMessage"]}>{error}</span>}
    </div>
  );
};
