import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Device } from "@/types/device";
import { TableActions } from "../../../components/TableActions/TableActions";
import styles from "../../../styles/StatusBadge.module.css";

const formatInstallationDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

export function useUserDeviceColumns(
  onEdit: (device: Device) => void,
  onView: (device: Device) => void
) {
  return useMemo<ColumnDef<Device>[]>(
    () => [
      {
        accessorKey: "uid",
        header: "UID",
        meta: { width: 170 },
        cell: (info) => <>{info.getValue<string>()}</>,
      },
      {
        accessorKey: "name",
        header: "Machine Model",
        meta: { width: 180 },
      },
      {
        accessorKey: "machine_series_number",
        header: "Series Number",
        meta: { width: 180 },
        cell: (info) => <>{info.getValue<string | null>() || "-"}</>,
      },
      {
        accessorKey: "distributor_name",
        header: "Machine Maker",
        meta: { width: 170 },
        cell: (info) => <>{info.getValue<string | null>() || "-"}</>,
      },
      {
        accessorKey: "customer_name",
        header: "Machine User",
        meta: { width: 170 },
        cell: (info) => <>{info.getValue<string | null>() || "-"}</>,
      },
      {
        accessorKey: "department_name",
        header: "Department",
        meta: { width: 160 },
        cell: (info) => <>{info.getValue<string | null>() || "-"}</>,
      },
      {
        accessorKey: "machine",
        header: "Machine",
        meta: { width: 150 },
        cell: (info) => <>{info.getValue<string | null>() || "-"}</>,
      },
      {
        accessorKey: "installation_date",
        header: "Installation",
        meta: { width: 140 },
        cell: (info) => <>{formatInstallationDate(info.getValue<string | null>())}</>,
      },
      {
        accessorKey: "is_online",
        header: "Status",
        meta: { width: 115 },
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
        meta: { width: 130, align: "center" },
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
