import { useMemo, useState, useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Device } from "@/types/dashboard";
import { DataTable } from "../components/DataTable";
import { TableActions } from "../components/TableActions";
import Pagination from "../components/Pagination";
import SearchFilter from "../components/SearchFilter";
import { Button } from "@/components/Button/Button";
import styles from "../styles/dashboard.module.css";

export function DevicesPage() {
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const data: Device[] = useMemo(
    () => [
      { id: 1, uid: "DEV00123122312321312213123231232133", name: "Temperature Sensor", department_id: 1, is_online: true, is_active: true, created_at: new Date().toISOString() },
      { id: 2, uid: "DEV002", name: "Humidity Sensor", department_id: 2, is_online: false, is_active: false, created_at: new Date().toISOString() },
      { id: 3, uid: "DEV003", name: "Pressure Sensor", department_id: 1, is_online: true, is_active: true, created_at: new Date().toISOString() },
      { id: 4, uid: "DEV004", name: "CO2 Sensor", department_id: 3, is_online: false, is_active: true, created_at: new Date().toISOString() },
      { id: 5, uid: "DEV005", name: "Light Sensor", department_id: 2, is_online: true, is_active: true, created_at: new Date().toISOString() },
      { id: 6, uid: "DEV006", name: "Vibration Sensor", department_id: 4, is_online: true, is_active: false, created_at: new Date().toISOString() },
      { id: 7, uid: "DEV007", name: "Door Sensor", department_id: 1, is_online: false, is_active: true, created_at: new Date().toISOString() },
      { id: 8, uid: "DEV008", name: "Motion Sensor", department_id: 3, is_online: true, is_active: true, created_at: new Date().toISOString() },
      { id: 9, uid: "DEV009", name: "Smoke Sensor", department_id: 2, is_online: false, is_active: true, created_at: new Date().toISOString() },
      { id: 10, uid: "DEV010", name: "Gas Sensor", department_id: 4, is_online: true, is_active: false, created_at: new Date().toISOString() },
      { id: 11, uid: "DEV011", name: "Water Leak Sensor", department_id: 1, is_online: true, is_active: true, created_at: new Date().toISOString() },
      { id: 12, uid: "DEV012", name: "Proximity Sensor", department_id: 2, is_online: false, is_active: true, created_at: new Date().toISOString() },
    ],
    []
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    return data.filter(
      (d) =>
        String(d.uid).toLowerCase().includes(q) ||
        String(d.name ?? "").toLowerCase().includes(q) ||
        String(d.department_id ?? "").toLowerCase().includes(q)
    );
  }, [data, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [currentPage, totalPages]);

  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const handleEdit = (device: Device) => console.log("Edit device:", device);
  const handleDelete = (device: Device) => console.log("Delete device:", device);

  const columns = useMemo<ColumnDef<Device>[]>(
    () => [
      {
        accessorKey: "uid",
        header: "UID",
        meta: { width: 250 },
        cell: (info) => <span className={styles["device-id"]}>{info.getValue<string>()}</span>,
      },
      { accessorKey: "name", header: "Name", meta: { width: 200 } },
      { accessorKey: "department_id", header: "Department ID", meta: { width: 200 } },
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
          const v = info.getValue<string>();
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
              onChange={(v) => {
                setQuery(v);
                setCurrentPage(1);
              }}
              placeholder="Search devices by UID, name or department ID"
            />
          </div>

          <div className={styles["dashboard-add-button-container"]}>
            <Button
              onClick={() => {
                console.log("Add device");
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden focusable="false" width="16" height="16">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Add Device
            </Button>
          </div>
        </div>
      </div>
      <DataTable data={pagedData} columns={columns} tableClassName={styles["dashboard-table"]} emptyMessage="No devices found" />

      <div className={styles["pagination-wrapper"]}>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => setCurrentPage(p)} maxPagesToShow={5} />
      </div>
    </div>
  );
}
