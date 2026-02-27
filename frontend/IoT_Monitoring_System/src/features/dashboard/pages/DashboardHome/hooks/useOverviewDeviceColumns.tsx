import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { DashboardOverviewDevice } from "@/types/dashboard";
import { TableActions } from "../../../components/TableActions/TableActions";
import styles from "../DashboardHome.module.css";
import badgeStyles from "../../../styles/StatusBadge.module.css";

export default function useOverviewDeviceColumns(
  onView: (device: DashboardOverviewDevice) => void
): ColumnDef<DashboardOverviewDevice>[] {
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
          className={`${badgeStyles["dashboard-status-badge"]} ${
            info.getValue<boolean>() ? badgeStyles["online"] : badgeStyles["offline"]
          }`}
        >
          {info.getValue<boolean>() ? "Online" : "Offline"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Action",
      meta: { align: "center" },
      cell: (info) => (
        <TableActions
          item={info.row.original}
          onView={onView}
          showEdit={false}
          showDelete={false}
          viewTitle="View data"
        />
      ),
    },
  ], [onView]);
}
