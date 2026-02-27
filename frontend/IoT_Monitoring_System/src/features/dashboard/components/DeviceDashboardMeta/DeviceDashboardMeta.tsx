import type { ReactNode } from "react";
import styles from "./DeviceDashboardMeta.module.css";

type MetaItem = {
  id?: string;
  label: string;
  value: ReactNode;
};

type DeviceDashboardMetaProps = {
  items: MetaItem[];
};

export function DeviceDashboardMeta({ items }: DeviceDashboardMetaProps) {
  return (
    <div className={styles["device-dashboard-meta"]}>
      {items.map((item, index) => (
        <div
          key={item.id ?? `${item.label}-${index}`}
          className={styles["device-dashboard-meta-item"]}
        >
          <span className={styles["device-dashboard-meta-label"]}>{item.label}</span>
          <span className={styles["device-dashboard-meta-value"]}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
