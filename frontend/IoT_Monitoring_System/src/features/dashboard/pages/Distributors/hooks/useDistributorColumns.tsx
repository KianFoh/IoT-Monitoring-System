import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Distributor } from "@/types/distributor";
import { TableActions } from "../../../components/TableActions/TableActions";
import styles from "../DistributorsPage.module.css";
import badgeStyles from "../../../styles/StatusBadge.module.css";
import { config } from "@/config";

const getInitials = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return "M";
  const parts = trimmed.split(/[\s@._-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "M";
};

export function useDistributorColumns(
  onEdit: (d: Distributor) => void,
  onDelete: (d: Distributor) => void
) {
  const columns = useMemo<ColumnDef<Distributor>[]>(
    () => [
      {
        id: "logo",
        header: "Logo",
        meta: { width: 300, align: "center" },
        cell: (info) => {
          const distributor = info.row.original;
          const logoSrc = distributor.logo_url
            ? (distributor.logo_url.startsWith("http")
              ? distributor.logo_url
              : `${config.api.baseUrl}${distributor.logo_url}`)
            : null;
          return (
            <div className={styles["dashboard-logo-badge"]}>
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={distributor.name}
                  className={styles["dashboard-logo-img"]}
                />
              ) : (
                <span className={styles["dashboard-logo-placeholder"]}>
                  {getInitials(distributor.name)}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "name",
        header: "Machine Maker",
        meta: { width: 220 },
      },
      {
        accessorKey: "subdomain",
        header: "Subdomain",
        meta: { width: 180 },
      },
      {
        accessorKey: "mqtt_topic",
        header: "MQTT Topic",
        meta: { width: 180 },
      },
      {
        accessorKey: "phone_no",
        header: "Phone",
        meta: { width: 160 },
        cell: (info) => info.getValue<string | null>() || "-",
      },
      {
        accessorKey: "is_active",
        header: "Status",
        meta: { width: 120 },
        cell: (info) => (
          <span
            className={`${badgeStyles["dashboard-status-badge"]} ${
              info.getValue<boolean>() ? badgeStyles["active"] : badgeStyles["inactive"]
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
            deleteDisabledReason="Machine maker is referenced by other records"
          />
        ),
      },
    ],
    [onEdit, onDelete]
  );

  return columns;
}
