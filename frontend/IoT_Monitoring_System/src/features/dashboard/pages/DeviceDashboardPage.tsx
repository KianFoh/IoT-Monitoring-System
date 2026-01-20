import { Link, useParams } from "react-router-dom";
import styles from "../styles/dashboard.module.css";

export function DeviceDashboardPage() {
  const { deviceUid } = useParams<{ deviceUid: string }>();

  return (
    <div className={styles["devices-container"]}>
      <div className={styles["dashboard-section-header"]}>
        <div>
          <h1>Device Dashboard</h1>
          <p>Real-time status and telemetry for a single device.</p>
        </div>
        <Link to="/dashboard/devices" className={styles["dashboard-section-link"]}>
          Back to Devices
        </Link>
      </div>

      <p>Device UID: {deviceUid ?? "Unknown"}</p>
    </div>
  );
}
