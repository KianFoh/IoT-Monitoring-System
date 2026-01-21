import type { ReactNode } from "react";
import styles from "../styles/dashboard.module.css";

type MetaItem = {
  label: string;
  value: ReactNode;
};

type DeviceDashboardMetaProps = {
  items: MetaItem[];
};

export function DeviceDashboardMeta({ items }: DeviceDashboardMetaProps) {
  return (
    <div className={styles["device-dashboard-meta"]}>
      {items.map((item) => (
        <div key={item.label} className={styles["device-dashboard-meta-item"]}>
          <span className={styles["device-dashboard-meta-label"]}>{item.label}</span>
          <span className={styles["device-dashboard-meta-value"]}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
