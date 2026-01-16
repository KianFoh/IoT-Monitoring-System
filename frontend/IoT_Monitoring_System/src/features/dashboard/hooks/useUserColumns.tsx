import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { User } from "@/types/user";
import { TableActions } from "../components/TableActions";
import styles from "../styles/dashboard.module.css";

const formatRole = (role: string) => role.replace("_", " ");

export function useUserColumns(
  onEdit: (u: User) => void,
  onDelete: (u: User) => void
) {
  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: "email",
        header: "Email",
        meta: { width: 260 },
      },
      {
        accessorKey: "customer_name",
        header: "Customer",
        meta: { width: 200 },
        cell: (info) => info.getValue<string | null>() || "-",
      },
      {
        accessorKey: "department_name",
        header: "Department",
        meta: { width: 200 },
        cell: (info) => info.getValue<string | null>() || "-",
      },
      {
        accessorKey: "role",
        header: "Role",
        meta: { width: 140 },
        cell: (info) => <span>{formatRole(info.getValue<string>())}</span>,
      },
      {
        accessorKey: "is_verified",
        header: "Verified",
        meta: { width: 140 },
        cell: (info) => (
          <span
            className={`${styles["dashboard-status-badge"]} ${
              info.getValue<boolean>() ? styles["active"] : styles["inactive"]
            }`}
          >
            {info.getValue<boolean>() ? "Verified" : "Unverified"}
          </span>
        ),
      },
      {
        accessorKey: "is_active",
        header: "Active",
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

export default useUserColumns;
