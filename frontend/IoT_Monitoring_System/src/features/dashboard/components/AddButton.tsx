import styles from "../styles/dashboard.module.css";

interface AddButtonProps {
  itemName?: string;
  onClick?: () => void;
  className?: string;
}

export default function AddButton({ itemName = "Item", onClick, className }: AddButtonProps) {
  return (
    <div className={styles["add-button-container"]}>
      <button
        type="button"
        className={`${styles["dashboard-add-button"]} ${className ?? ""}`}
        onClick={onClick}
        aria-label={`Add ${itemName}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden focusable="false" width="16" height="16">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className={styles["dashboard-add-button-label"]}>Add {itemName}</span>
      </button>
    </div>
  );
}