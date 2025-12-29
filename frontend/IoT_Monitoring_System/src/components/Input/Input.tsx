import type { InputHTMLAttributes } from "react";
import "./Input.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: string;
  error?: string;
}

export const Input = ({ label, icon, error, id, className = "", ...props }: InputProps) => {
  return (
    <div className="inputGroup">
      {label && (
        <label htmlFor={id} className="inputLabel">
          {label}
        </label>
      )}
      <div className="inputContainer">
        {icon && <span className="inputIconLeft">{icon}</span>}
        <input
          id={id}
          className={`inputField ${icon ? "withIcon" : ""} ${error ? "inputError" : ""} ${className}`}
          {...props}
        />
      </div>
      {error && <span className="inputErrorMessage">{error}</span>}
    </div>
  );
};
