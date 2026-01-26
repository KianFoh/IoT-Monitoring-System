import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Device } from "@/types/device";
import { TableActions } from "../components/TableActions";
import styles from "../styles/dashboard.module.css";

const noop = () => {};

export default function useUserOverviewDeviceColumns(): ColumnDef<Device>[] {
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
        cell: (info) => <>{info.getValue<string>() || "-"}</>,
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
        header: "Action",
        meta: { align: "center" },
        cell: (info) => (
          <TableActions
            item={info.row.original}
            onView={noop}
            showEdit={false}
            showDelete={false}
            viewTitle="View data (coming soon)"
          />
        ),
      },
    ],
    []
  );
}
