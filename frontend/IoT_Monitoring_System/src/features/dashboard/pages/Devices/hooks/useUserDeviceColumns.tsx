import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Device } from "@/types/device";
import { TableActions } from "../../../components/TableActions/TableActions";
import styles from "../../../styles/StatusBadge.module.css";

export function useUserDeviceColumns(
  onEdit: (device: Device) => void,
  onView: (device: Device) => void
) {
  return useMemo<ColumnDef<Device>[]>(
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
        accessorKey: "machine",
        header: "Machine",
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
      {
        id: "actions",
        header: "Actions",
        meta: { align: "center" },
        cell: (info) => (
          <TableActions
            item={info.row.original}
            onEdit={onEdit}
            onView={onView}
            showDelete={false}
            showView={true}
            viewTitle="View data"
          />
        ),
      },
    ],
    [onEdit, onView]
  );
}
