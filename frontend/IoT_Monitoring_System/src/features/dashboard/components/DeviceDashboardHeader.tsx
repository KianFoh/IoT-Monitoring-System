import { Link } from "react-router-dom";
import styles from "../styles/dashboard.module.css";

type DeviceDashboardHeaderProps = {
  title: string;
  subtitle?: string;
  backHref: string;
  backLabel?: string;
};

export function DeviceDashboardHeader({
  title,
  subtitle,
  backHref,
  backLabel = "Back to Devices",
}: DeviceDashboardHeaderProps) {
  return (
    <div className={styles["device-dashboard-header"]}>
      <div className={styles["device-dashboard-title"]}>
        <h1>{title}</h1>
        {subtitle && <span className={styles["device-dashboard-subtitle"]}>{subtitle}</span>}
      </div>
      <Link to={backHref} className={styles["dashboard-section-link"]}>
        {backLabel}
      </Link>
    </div>
  );
}
