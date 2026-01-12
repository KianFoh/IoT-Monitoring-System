import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Device } from "@/types/dashboard";
import { DataTable } from "../components/DataTable";
import { TableActions } from "../components/TableActions";
import Pagination from "../components/Pagination";
import SearchFilter from "../components/SearchFilter";
import { Button } from "@/components/Button/Button";
import PageSizeSelect from "../components/PageSizeSelect";
import { FaPlus } from "react-icons/fa";
import styles from "../styles/dashboard.module.css";
import { useDevicesTable } from "../hooks/useDevicesTable";

export function DevicesPage() {
  const {
    query,
    setQuery,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    devices,
    totalPages,
    loading,
    error,
  } = useDevicesTable(5);

  const handleEdit = (device: Device) => console.log("Edit device:", device);
  const handleDelete = (device: Device) => console.log("Delete device:", device);

  const columns = useMemo<ColumnDef<Device>[]>(
    () => [
      {
        accessorKey: "uid",
        header: "UID",
        meta: { width: 150 },
        cell: (info) => <>{info.getValue<string>()}</>,
      },
      { 
        accessorKey: "name", 
        header: "Name", 
        meta: { width: 200 } },
      {
        accessorKey: "department_name",
        header: "Department",
        meta: { width: 150 },
        cell: (info) => <>{info.getValue<string | null>() || "-"}</>,
      },
      {
        accessorKey: "customer_name",
        header: "Customer",
        meta: { width: 200 },
        cell: (info) => <>{info.getValue<string | null>() || "-"}</>,
      },
      {
        accessorKey: "is_online",
        header: "Status",
        meta: { width: 100 },
        cell: (info) => (
          <span className={`${styles["dashboard-status-badge"]} ${info.getValue<boolean>() ? styles["online"] : styles["offline"]}`}>
            {info.getValue<boolean>() ? "Online" : "Offline"}
          </span>
        ),
      },
      {
        accessorKey: "is_active",
        header: "Active",
        meta: { width: 100 },
        cell: (info) => (
          <span className={`${styles["dashboard-status-badge"]} ${info.getValue<boolean>() ? styles["active"] : styles["inactive"]}`}>
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
        meta: { width: 140 },
        cell: (info) => <TableActions item={info.row.original} onEdit={handleEdit} onDelete={handleDelete} />,
      },
    ],
    []
  );

  return (
    <div className={styles["devices-container"]}>
      <h1>Devices</h1>
      <p>Manage and monitor your IoT devices</p>

      <div className={styles["dashboard-devices-topbar"]}>
        <div className={styles["dashboard-search-and-action"]}>
          <div className={styles["dashboard-search-wrapper"]}>
            <SearchFilter
              value={query}
              onChange={(v) => setQuery(v)}
              placeholder="Search devices by UID, Name or Customer Name..."
            />
          </div>

          <div className={styles["dashboard-add-button-container"]}>
            <Button
              icon={FaPlus}
              className={styles["dashboard-add-button"]}
              onClick={() => {
                console.log("Add device");
              }}
            >
              Add Device
            </Button>
          </div>
        </div>
      </div>
      {error && <p>{error}</p>}
      <DataTable
        data={devices}
        columns={columns}
        tableClassName={styles["dashboard-table"]}
        emptyMessage={loading ? "Loading devices..." : "No devices found"}
      />

      <div className={styles["dashboard-pagination-row"]}>
        <div className={styles["dashboard-page-size-left"]}>
          <PageSizeSelect value={pageSize} onChange={(n) => { setPageSize(n); setCurrentPage(1); }} />
        </div>
        <div className={styles["dashboard-pagination-right"]}>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => setCurrentPage(p)} maxPagesToShow={5} />
        </div>
      </div>
    </div>
  );
}
