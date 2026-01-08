import type { ReactNode } from "react";
import styles from "./StatCard.module.css";

interface StatCardProps {
  title: string;
  value: number | string;
  icon?: ReactNode;
  color?: "primary" | "success" | "warning" | "error" | "info";
  className?: string;
}

export const StatCard = ({
  title,
  value,
  icon,
  color = "primary",
  className = "",
}: StatCardProps) => {
  return (
    <div className={`${styles["gen-stat-card"]} ${styles[`gen-stat-card--${color}`]} ${className}`}>
      {icon && <div className={styles["gen-stat-card__icon"]}>{icon}</div>}
      <div className={styles["gen-stat-card__content"]}>
        <p className={styles["gen-stat-card__title"]}>{title}</p>
        <h3 className={styles["gen-stat-card__value"]}>{value}</h3>
      </div>
    </div>
  );
};
