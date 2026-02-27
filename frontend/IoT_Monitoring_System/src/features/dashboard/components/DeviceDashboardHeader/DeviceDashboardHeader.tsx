import { Link, useNavigate } from "react-router-dom";
import styles from "./DeviceDashboardHeader.module.css";

type DeviceDashboardHeaderProps =
  | {
      title: string;
      subtitle?: string;
      backLabel?: string;
      useHistoryBack: true;
    }
  | {
      title: string;
      subtitle?: string;
      backLabel?: string;
      useHistoryBack?: false;
      backHref: string;
    };

export function DeviceDashboardHeader(props: DeviceDashboardHeaderProps) {
  const { title, subtitle, backLabel = "Back to Devices" } = props;
  const navigate = useNavigate();
  return (
    <div className={styles["device-dashboard-header"]}>
      <div className={styles["device-dashboard-title"]}>
        <h1>{title}</h1>
        {subtitle && <span className={styles["device-dashboard-subtitle"]}>{subtitle}</span>}
      </div>
      {props.useHistoryBack ? (
        <button
          type="button"
          className={styles["dashboard-section-link"]}
          onClick={() => navigate(-1)}
        >
          {backLabel}
        </button>
      ) : (
        <Link to={props.backHref} className={styles["dashboard-section-link"]}>
          {backLabel}
        </Link>
      )}
    </div>
  );
}
