import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Device } from "@/types/dashboard";
import { DataTable } from "../components/DataTable";
import { TableActions } from "../components/TableActions";
import Pagination from "../components/Pagination";
import SearchFilter from "../components/SearchFilter";
import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import PageSizeSelect from "../components/PageSizeSelect";
import { FaPlus } from "react-icons/fa";
import styles from "../styles/dashboard.module.css";
import { useDevicesTable } from "../hooks/useDevicesTable";
import { useDeviceActions } from "../hooks/useDeviceActions";
import { Switch } from "@/components/Switch/Switch";

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

  const {
    showAddModal,
    showEditModal,
    showDeleteModal,
    selectedDevice,
    actionError,
    actionLoading,
    addForm,
    setAddForm,
    editForm,
    setEditForm,
    openAddModal,
    closeAddModal,
    openEditModal,
    closeEditModal,
    openDeleteModal,
    closeDeleteModal,
    handleAddSubmit,
    handleEditSubmit,
    handleDelete,
  } = useDeviceActions();

  

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
        cell: (info) => (
          <TableActions
            item={info.row.original}
            onEdit={openEditModal}
            onDelete={openDeleteModal}
          />
        ),
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
              onClick={openAddModal}
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


      <Modal isOpen={showAddModal} onClose={closeAddModal} title="Add Device">
        <form className={styles["dashboard-modal-form"]} onSubmit={handleAddSubmit}>
          <Input
            id="add-device-uid"
            label="Device UID"
            placeholder="Enter unique device UID"
            value={addForm.uid}
            onChange={(e) => setAddForm((prev) => ({ ...prev, uid: e.target.value }))}
          />
          <Input
            id="add-device-name"
            label="Device Name"
            placeholder="Enter device name"
            value={addForm.name}
            onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          {actionError && <p className={styles["dashboard-modal-error"]}>{actionError}</p>}
          <div className={styles["dashboard-modal-actions"]}>
            <Button onClick={closeAddModal} type="button" variant="cancel" disabled={actionLoading}>
              Cancel
            </Button>
              <Button type="submit" isLoading={actionLoading}>
              Create Device
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showEditModal} onClose={closeEditModal} title="Edit Device">
        <form className={styles["dashboard-modal-form"]} onSubmit={handleEditSubmit}>
          <Input
            id="edit-device-name"
            label="Device Name"
            placeholder="Update device name"
            value={editForm.name}
            onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            id="edit-device-dept"
            label="Department ID"
            placeholder="Optional department id"
            type="number"
            value={editForm.department_id}
            onChange={(e) => setEditForm((prev) => ({ ...prev, department_id: e.target.value }))}
          />
          <div className={styles["dashboard-checkbox-row"]}>
            <Switch
              checked={editForm.is_online}
              onChange={(v) => setEditForm((prev) => ({ ...prev, is_online: v }))}
              label="Online"
            />
            <Switch
              checked={editForm.is_active}
              onChange={(v) => setEditForm((prev) => ({ ...prev, is_active: v }))}
              label="Active"
            />
          </div>
          {actionError && <p className={styles["dashboard-modal-error"]}>{actionError}</p>}
          <div className={styles["dashboard-modal-actions"]}>
            <Button onClick={closeEditModal} type="button" variant="cancel" disabled={actionLoading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={actionLoading} disabled={!selectedDevice}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showDeleteModal} onClose={closeDeleteModal} title="Delete Device">
        <div className={styles["dashboard-modal-form"]}>
          <p>Are you sure you want to delete <strong>{selectedDevice?.name || "this device"}</strong>? This action cannot be undone.</p>
          {actionError && <p className={styles["dashboard-modal-error"]}>{actionError}</p>}
          <div className={styles["dashboard-modal-actions"]}>
            <Button onClick={closeDeleteModal} type="button" variant="cancel" disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleDelete} type="button" variant="danger" isLoading={actionLoading} disabled={!selectedDevice}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
