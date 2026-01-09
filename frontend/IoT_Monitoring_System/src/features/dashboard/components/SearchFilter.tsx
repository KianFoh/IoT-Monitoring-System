import { FaSearch } from "react-icons/fa";
import styles from "../styles/dashboard.module.css";

interface SearchFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

export default function SearchFilter({ value, onChange, placeholder = "Search...", id }: SearchFilterProps) {
  return (
    <div className={styles["dashboard-inputContainer"]}>
      <span className={styles["dashboard-inputIconLeft"]} aria-hidden>
        <FaSearch />
      </span>
      <input
        id={id}
        className={`${styles["dashboard-inputField"]} ${styles["dashboard-inputField-withIcon"]}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
      />
    </div>
  );
}