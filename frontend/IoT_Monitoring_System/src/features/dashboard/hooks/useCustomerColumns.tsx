import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Customer } from "@/types/customer";
import { TableActions } from "../components/TableActions";
import styles from "../styles/dashboard.module.css";

export function useCustomerColumns(
  onEdit: (c: Customer) => void,
  onDelete: (c: Customer) => void
) {
  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        meta: { width: 200 },
      },
      {
        accessorKey: "phone_no",
        header: "Phone",
        meta: { width: 180 },
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
            deleteDisabledReason="Customer is referenced by other records"
          />
        ),
      },
    ],
    [onEdit, onDelete]
  );

  return columns;
}

export default useCustomerColumns;
