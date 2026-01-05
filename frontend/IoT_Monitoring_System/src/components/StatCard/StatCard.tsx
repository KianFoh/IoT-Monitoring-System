import type { ReactNode } from "react";
import "./StatCard.css";

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
    <div className={`stat-card stat-card--${color} ${className}`}>
      {icon && <div className="stat-card__icon">{icon}</div>}
      <div className="stat-card__content">
        <p className="stat-card__title">{title}</p>
        <h3 className="stat-card__value">{value}</h3>
      </div>
    </div>
  );
};
