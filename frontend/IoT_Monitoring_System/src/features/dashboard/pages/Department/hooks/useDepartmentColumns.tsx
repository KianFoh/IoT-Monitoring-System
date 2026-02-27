import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Department } from "@/types/department";
import { TableActions } from "../../../components/TableActions/TableActions";
import styles from "../../../styles/StatusBadge.module.css";

export function useDepartmentColumns(
  onEdit: (d: Department) => void,
  onDelete: (d: Department) => void
) {
  const columns = useMemo<ColumnDef<Department>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
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
            disableDelete={!info.row.original.is_deletable}
            deleteDisabledReason="Department is referenced by other records"
          />
        ),
      },
    ],
    [onEdit, onDelete]
  );

  return columns;
}
