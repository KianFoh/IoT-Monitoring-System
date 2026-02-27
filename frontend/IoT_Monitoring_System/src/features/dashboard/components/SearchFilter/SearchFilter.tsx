import { useState, useEffect } from "react";
import { FaSearch } from "react-icons/fa";
import styles from "./SearchFilter.module.css";

interface SearchFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  debounceTime?: number;
}

export default function SearchFilter({
  value,
  onChange,
  placeholder = "Search...",
  id,
  debounceTime = 300,
}: SearchFilterProps) {
  const [internalValue, setInternalValue] = useState(value);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (internalValue !== value) {
        onChange(internalValue);
      }
    }, debounceTime);

    return () => clearTimeout(handler);
  }, [internalValue, debounceTime, onChange, value]);

  return (
    <div className={styles["dashboard-inputContainer"]}>
      <span className={styles["dashboard-inputIconLeft"]} aria-hidden>
        <FaSearch />
      </span>
      <input
        id={id}
        type="search"
        className={`${styles["dashboard-inputField"]} ${styles["dashboard-inputField-withIcon"]}`}
        placeholder={placeholder}
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        autoComplete="off"
        aria-label={placeholder}
      />
    </div>
  );
}
