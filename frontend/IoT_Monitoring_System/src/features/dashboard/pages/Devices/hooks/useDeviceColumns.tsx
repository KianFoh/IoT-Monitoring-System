import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Device } from "@/types/device";
import { TableActions } from "../../../components/TableActions/TableActions";
import styles from "../../../styles/StatusBadge.module.css";

export function useDeviceColumns(
  onEdit: (d: Device) => void,
  onDelete: (d: Device) => void,
  onView?: (d: Device) => void
) {
  const columns = useMemo<ColumnDef<Device>[]>(
    () => [
      {
        accessorKey: "uid",
        header: "UID",
        cell: (info) => <>{info.getValue<string>()}</>,
      },
      {
        accessorKey: "name",
        header: "Name",
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
          <span className={`${styles["dashboard-status-badge"]} ${info.getValue<boolean>() ? styles["online"] : styles["offline"]}`}>
            {info.getValue<boolean>() ? "Online" : "Offline"}
          </span>
        ),
      },
      {
        accessorKey: "is_active",
        header: "Active",
        cell: (info) => (
          <span className={`${styles["dashboard-status-badge"]} ${info.getValue<boolean>() ? styles["active"] : styles["inactive"]}`}>
            {info.getValue<boolean>() ? "Active" : "Inactive"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        meta: { align: "center" },
        cell: (info) => (
          <TableActions
            item={info.row.original}
            onEdit={onEdit}
            onDelete={onDelete}
            onView={onView}
          />
        ),
      },
    ],
    [onEdit, onDelete, onView]
  );

  return columns;
}
