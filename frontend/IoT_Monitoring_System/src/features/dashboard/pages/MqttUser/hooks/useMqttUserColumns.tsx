import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { MqttUser } from "@/types/mqttUser";
import { TableActions } from "../../../components/TableActions/TableActions";
import styles from "../../../styles/StatusBadge.module.css";

export function useMqttUserColumns(
  onEdit: (u: MqttUser) => void,
  onDelete: (u: MqttUser) => void
) {
  const columns = useMemo<ColumnDef<MqttUser>[]>(
    () => [
      {
        accessorKey: "username",
        header: "Username",
        meta: { width: 200 },
      },
      {
        accessorKey: "customer_name",
        header: "Customer",
        meta: { width: 200 },
        cell: (info) => info.getValue<string | null>() || "-",
      },
      {
        accessorKey: "is_active",
        header: "Status",
        meta: { width: 120 },
        cell: (info) => (
          <span
            className={`${styles["dashboard-status-badge"]} ${
              info.getValue<boolean>() ? styles["active"] : styles["inactive"]
            }`}
          >
            {info.getValue<boolean>() ? "Active" : "Inactive"}
          </span>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Created At",
        meta: { width: 200 },
        cell: (info) => {
          const v = info.getValue<string | null>();
          return <span>{v ? new Date(v).toLocaleString() : ""}</span>;
        },
      },
      {
        id: "actions",
        header: "Actions",
        meta: { width: 140, align: "center" },
        cell: (info) => (
          <TableActions
            item={info.row.original}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ),
      },
    ],
    [onEdit, onDelete]
  );

  return columns;
}
