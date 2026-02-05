import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { User } from "@/types/user";
import { TableActions } from "../components/TableActions";
import styles from "../styles/dashboard.module.css";
import { config } from "@/config";

const formatRole = (role: string) => role.replace("_", " ");
const getInitials = (user: User) => {
  const username = user.username?.trim() || "";
  if (username) {
    const parts = username.split(/[\s@._-]+/).filter(Boolean);
    const letters = parts.slice(0, 3).map((part) => part[0]?.toUpperCase() ?? "");
    return letters.join("") || "U";
  }
  const email = user.email?.trim() || "";
  return email ? email[0]?.toUpperCase() ?? "U" : "U";
};

export function useUserColumns(
  onEdit: (u: User) => void,
  onDelete: (u: User) => void
) {
  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: "avatar",
        header: "",
        meta: { width: 70, align: "center" },
        cell: (info) => {
          const user = info.row.original;
          const profileSrc = user.profile_picture
            ? (user.profile_picture.startsWith("http")
              ? user.profile_picture
              : `${config.api.baseUrl}${user.profile_picture}`)
            : null;
          return (
            <div className={styles["dashboard-user-avatar"]}>
              {profileSrc ? (
                <img
                  src={profileSrc}
                  alt={user.username || user.email}
                  className={styles["dashboard-user-avatar-img"]}
                />
              ) : (
                <span className={styles["dashboard-user-avatar-placeholder"]}>
                  {getInitials(user)}
                </span>
              )}
            </div>
          );
        },
      },
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
