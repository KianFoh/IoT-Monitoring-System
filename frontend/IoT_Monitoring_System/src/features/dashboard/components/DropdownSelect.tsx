import { useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import styles from "../styles/dashboard.module.css";

type Option<T extends string> = {
  value: T;
  label: string;
};

type DropdownSelectProps<T extends string> = {
  id: string;
  label?: string;
  value: T;
  options: Option<T>[];
  placeholder?: string;
  onChange: (value: T) => void;
  disabled?: boolean;
};

export default function DropdownSelect<T extends string>({
  id,
  label,
  value,
  options,
  placeholder = "Select an option",
  onChange,
  disabled,
}: DropdownSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const displayValue = selected?.label ?? "";
  const showPlaceholder = !displayValue;

  const handleBlur = () => {
    setTimeout(() => setOpen(false), 120);
  };

  const handlePick = (option: Option<T>) => {
    onChange(option.value);
    setOpen(false);
  };

  return (
    <div className={styles["dashboard-select-group"]}>
      {label && (
        <label htmlFor={id} className={styles["dashboard-select-label"]}>
          {label}
        </label>
      )}
      <div className={styles["dashboard-autocomplete"]}>
        <button
          id={id}
          type="button"
          className={`${styles["dashboard-select-trigger"]} ${open ? styles["dashboard-select-open"] : ""}`}
          onClick={() => !disabled && setOpen((prev) => !prev)}
          onBlur={handleBlur}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          disabled={disabled}
        >
          <span
            className={`${styles["dashboard-select-value"]} ${showPlaceholder ? styles["dashboard-select-placeholder"] : ""}`}
          >
            {showPlaceholder ? placeholder : displayValue}
          </span>
          <span className={styles["dashboard-select-arrow"]}>
            <FaChevronDown />
          </span>
        </button>
        {open && (
          <div
            id={`${id}-list`}
            className={styles["dashboard-autocomplete-list"]}
            role="listbox"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={styles["dashboard-autocomplete-item"]}
                onMouseDown={(event) => {
                  event.preventDefault();
                  handlePick(option);
                }}
                role="option"
                aria-selected={option.value === value}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
