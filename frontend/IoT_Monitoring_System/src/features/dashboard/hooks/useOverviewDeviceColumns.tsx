import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { DashboardOverviewDevice } from "@/types/dashboard";
import styles from "../styles/dashboard.module.css";

export default function useOverviewDeviceColumns(): ColumnDef<DashboardOverviewDevice>[] {
  return useMemo<ColumnDef<DashboardOverviewDevice>[]>(() => [
    {
      accessorKey: "uid",
      header: "UID",
      cell: (info) => <span className={styles["device-id"]}>{info.getValue<string>()}</span>,
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: (info) => <>{info.getValue<string>() || "-"}</>,
    },
    {
      accessorKey: "department_name",
      header: "Department",
      cell: (info) => <>{info.getValue<string | null>() || "-"}</>,
    },
    {
      accessorKey: "customer_name",
      header: "Customer",
      cell: (info) => <>{info.getValue<string | null>() || "-"}</>,
    },
    {
      accessorKey: "is_online",
      header: "Status",
      cell: (info) => (
        <span
          className={`${styles["dashboard-status-badge"]} ${
            info.getValue<boolean>() ? styles["online"] : styles["offline"]
          }`}
        >
          {info.getValue<boolean>() ? "Online" : "Offline"}
        </span>
      ),
    },
  ], []);
}