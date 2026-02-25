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
  const renderIconNode = (node?: React.ReactNode | React.ElementType) => {
    if (!node) return null;
    if (React.isValidElement(node)) return node;
    if (typeof node === "function") {
      const IconComp = node as React.ElementType;
      return <IconComp />;
    }
    return node;
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
        {icon && <span className={styles["gen-inputIconLeft"]}>{renderIconNode(icon)}</span>}
        {rightIcon && (
          onRightIconClick ? (
            <button
              type="button"
              className={styles["gen-inputIconButton"]}
              onClick={onRightIconClick}
              aria-label={rightIconLabel || "Toggle input"}
              disabled={props.disabled}
            >
              <span className={styles["gen-inputIconRight"]}>{renderIconNode(rightIcon)}</span>
            </button>
          ) : (
            <span className={styles["gen-inputIconRight"]}>{renderIconNode(rightIcon)}</span>
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
