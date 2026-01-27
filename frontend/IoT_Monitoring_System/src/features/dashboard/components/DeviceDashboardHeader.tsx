import { Link, useNavigate } from "react-router-dom";
import styles from "../styles/dashboard.module.css";

type DeviceDashboardHeaderProps = {
  title: string;
  subtitle?: string;
  backHref: string;
  backLabel?: string;
  useHistoryBack?: boolean;
};

export function DeviceDashboardHeader({
  title,
  subtitle,
  backHref,
  backLabel = "Back to Devices",
  useHistoryBack = false,
}: DeviceDashboardHeaderProps) {
  const navigate = useNavigate();
  return (
    <div className={styles["device-dashboard-header"]}>
      <div className={styles["device-dashboard-title"]}>
        <h1>{title}</h1>
        {subtitle && <span className={styles["device-dashboard-subtitle"]}>{subtitle}</span>}
      </div>
      {useHistoryBack ? (
        <button
          type="button"
          className={styles["dashboard-section-link"]}
          onClick={() => navigate(-1)}
        >
          {backLabel}
        </button>
      ) : (
        <Link to={backHref} className={styles["dashboard-section-link"]}>
          {backLabel}
        </Link>
      )}
    </div>
  );
}
