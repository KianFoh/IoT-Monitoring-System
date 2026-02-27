import { useEffect, useId, useState, useRef } from "react";
import { FaChevronDown } from "react-icons/fa";
import styles from "./DropdownSelect.module.css";

type Option<T extends string> = {
  value: T;
  label: string;
};

type DropdownSelectProps<T extends string> = {
  id?: string;
  label?: string;
  value: T;
  options: Option<T>[];
  placeholder?: string;
  onChange: (value: T) => void;
  disabled?: boolean;
  groupClassName?: string;
  triggerClassName?: string;
};

export default function DropdownSelect<T extends string>({
  id,
  label,
  value,
  options,
  placeholder = "Select an option",
  onChange,
  disabled,
  groupClassName,
  triggerClassName,
}: DropdownSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement | null>(null);
  const autoId = useId();
  const resolvedId = id ?? `dropdown-${autoId}`;
  const selected = options.find((option) => option.value === value);
  const displayValue = selected?.label ?? "";
  const showPlaceholder = !displayValue;
  const selectedIndex = options.findIndex((option) => option.value === value);

  const closeMenu = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const handlePick = (option: Option<T>) => {
    onChange(option.value);
    closeMenu();
  };

  const ensureActiveIndex = () => {
    if (!options.length) return -1;
    return selectedIndex >= 0 ? selectedIndex : 0;
  };

  const handleToggle = () => {
    if (disabled) return;
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        setActiveIndex(ensureActiveIndex());
      } else {
        setActiveIndex(-1);
      }
      return next;
    });
  };

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
      closeMenu();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (!options.length) return;

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setActiveIndex(ensureActiveIndex());
        } else {
          setActiveIndex((prev) => (prev + 1) % options.length);
        }
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setActiveIndex(ensureActiveIndex());
        } else {
          setActiveIndex((prev) => (prev - 1 + options.length) % options.length);
        }
        break;
      }
      case "Enter":
      case " ": {
        if (!open) {
          event.preventDefault();
          setOpen(true);
          setActiveIndex(ensureActiveIndex());
          break;
        }
        if (activeIndex >= 0) {
          event.preventDefault();
          handlePick(options[activeIndex]);
        }
        break;
      }
      case "Escape": {
        if (open) {
          event.preventDefault();
          closeMenu();
        }
        break;
      }
      default:
        break;
    }
  };

  useEffect(() => {
    if (!open) return;
    if (activeIndex < 0) return;
    const items = listRef.current?.querySelectorAll<HTMLButtonElement>("button");
    items?.[activeIndex]?.focus();
  }, [open, activeIndex]);

  useEffect(() => {
    if (!open) return;
    if (activeIndex >= options.length) {
      setActiveIndex(options.length ? options.length - 1 : -1);
    }
  }, [open, activeIndex, options.length]);

  return (
    <div
      className={[styles["dashboard-select-group"], groupClassName].filter(Boolean).join(" ")}
    >
      {label && (
        <label htmlFor={resolvedId} className={styles["dashboard-select-label"]}>
          {label}
        </label>
      )}
      <div className={styles["dashboard-autocomplete"]} onBlur={handleBlur} onKeyDown={handleKeyDown}>
        <button
          id={resolvedId}
          type="button"
          className={[
            styles["dashboard-select-trigger"],
            open ? styles["dashboard-select-open"] : "",
            triggerClassName,
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={handleToggle}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${resolvedId}-list`}
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
            id={`${resolvedId}-list`}
            className={styles["dashboard-autocomplete-list"]}
            role="listbox"
            ref={listRef}
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
