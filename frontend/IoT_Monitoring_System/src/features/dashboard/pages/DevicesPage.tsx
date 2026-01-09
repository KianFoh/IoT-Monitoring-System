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

  const data: Device[] = useMemo(
    () => [
      { id: 1, uid: "DEV0012312231232131221312323123", name: "Temperature Sensor", customer_name: "ACME Corp", department_name: "Building Controls", is_online: true, is_active: true, created_at: new Date().toISOString() },
      { id: 2, uid: "DEV002", name: "Humidity Sensor", customer_name: "Beta Ltd", department_name: "Environmental", is_online: false, is_active: false, created_at: new Date().toISOString() },
      { id: 3, uid: "DEV003", name: "Pressure Sensor", customer_name: "ACME Corp", department_name: "Process", is_online: true, is_active: true, created_at: new Date().toISOString() },
      { id: 4, uid: "DEV004", name: "CO2 Sensor", customer_name: "Gamma Inc", department_name: "Air Quality", is_online: false, is_active: true, created_at: new Date().toISOString() },
      { id: 5, uid: "DEV005", name: "Light Sensor", customer_name: "Beta Ltd", department_name: "Lighting", is_online: true, is_active: true, created_at: new Date().toISOString() },
      { id: 6, uid: "DEV006", name: "Vibration Sensor", customer_name: "Delta PLC", department_name: "Mechanical", is_online: true, is_active: false, created_at: new Date().toISOString() },
      { id: 7, uid: "DEV007", name: "Door Sensor", customer_name: "ACME Corp", department_name: "Security", is_online: false, is_active: true, created_at: new Date().toISOString() },
      { id: 8, uid: "DEV008", name: "Motion Sensor", customer_name: "Gamma Inc", department_name: "Security", is_online: true, is_active: true, created_at: new Date().toISOString() },
      { id: 9, uid: "DEV009", name: "Smoke Sensor", customer_name: "Beta Ltd", department_name: "Safety", is_online: false, is_active: true, created_at: new Date().toISOString() },
      { id: 10, uid: "DEV010", name: "Gas Sensor", customer_name: "Delta PLC", department_name: "Safety", is_online: true, is_active: false, created_at: new Date().toISOString() },
      { id: 11, uid: "DEV011", name: "Water Leak Sensor", customer_name: "ACME Corp", department_name: "Facilities", is_online: true, is_active: true, created_at: new Date().toISOString() },
      { id: 12, uid: "DEV012", name: "Proximity Sensor", customer_name: "Beta Ltd", department_name: "Access", is_online: false, is_active: true, created_at: new Date().toISOString() },
    ],
    []
  );
  const {
    query,
    setQuery,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    pagedData,
    totalPages,
  } = useDevicesTable(data, 5);

  const handleEdit = (device: Device) => console.log("Edit device:", device);
  const handleDelete = (device: Device) => console.log("Delete device:", device);

  const columns = useMemo<ColumnDef<Device>[]>(
    () => [
      {
        accessorKey: "uid",
        header: "UID",
        meta: { width: 250 },
        cell: (info) => <>{info.getValue<string>()}</>,
      },
      { accessorKey: "name", header: "Name", meta: { width: 200 } },
      {
        accessorKey: "customer_name",
        header: "Customer",
        meta: { width: 220},
        cell: (info) => <>{info.getValue<string>()}</>,
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
      <DataTable data={pagedData} columns={columns} tableClassName={styles["dashboard-table"]} emptyMessage="No devices found" />

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
