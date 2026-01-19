import { FaPlus } from "react-icons/fa";
import { DataTable } from "../components/DataTable";
import Pagination from "../components/Pagination";
import SearchFilter from "../components/SearchFilter";
import PageSizeSelect from "../components/PageSizeSelect";
import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { Switch } from "@/components/Switch/Switch";
import { useCustomersTable } from "../hooks/useCustomersTable";
import { useCustomerActions } from "../hooks/useCustomerActions";
import { useCustomerColumns } from "../hooks/useCustomerColumns";
import styles from "../styles/dashboard.module.css";

export function CustomersPage() {
  const {
    query,
    setQuery,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    customers,
    totalPages,
    loading,
    error,
  } = useCustomersTable(5);

  const {
    showAddModal,
    showEditModal,
    showDeleteModal,
    selectedCustomer,
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
  } = useCustomerActions();

  const columns = useCustomerColumns(openEditModal, openDeleteModal);
  const deleteDisabled = !!selectedCustomer && !selectedCustomer.is_deletable;

  return (
    <div className={styles["devices-container"]}>
      <h1>Customers</h1>
      <p>Manage your customers</p>

      <div className={styles["dashboard-devices-topbar"]}>
        <div className={styles["dashboard-search-and-action"]}>
          <div className={styles["dashboard-search-wrapper"]}>
            <SearchFilter
              value={query}
              onChange={(v) => setQuery(v)}
              placeholder="Search customers by name or phone..."
            />
          </div>

          <div className={styles["dashboard-add-button-container"]}>
            <Button
              icon={FaPlus}
              className={styles["dashboard-add-button"]}
              onClick={openAddModal}
            >
              Add Customer
            </Button>
          </div>
        </div>
      </div>
      {error && <p>{error}</p>}
      <DataTable
        data={customers}
        columns={columns}
        tableClassName={styles["dashboard-table"]}
        emptyMessage={loading ? "Loading customers..." : "No customers found"}
      />

      <div className={styles["dashboard-pagination-row"]}>
        <div className={styles["dashboard-page-size-left"]}>
          <PageSizeSelect value={pageSize} onChange={(n) => { setPageSize(n); setCurrentPage(1); }} />
        </div>
        <div className={styles["dashboard-pagination-right"]}>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => setCurrentPage(p)} maxPagesToShow={5} />
        </div>
      </div>

      <Modal isOpen={showAddModal} onClose={closeAddModal} title="Add Customer">
        <form className={styles["dashboard-modal-form"]} onSubmit={handleAddSubmit}>
          <Input
            id="add-customer-name"
            label="Customer Name"
            placeholder="Enter customer name"
            value={addForm.name}
            onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            id="add-customer-phone"
            label="Phone Number (optional)"
            placeholder="Enter phone number"
            value={addForm.phone_no}
            onChange={(e) => setAddForm((prev) => ({ ...prev, phone_no: e.target.value }))}
          />
          {actionError && <p className={styles["dashboard-modal-error"]}>{actionError}</p>}
          <div className={styles["dashboard-modal-actions"]}>
            <Button onClick={closeAddModal} type="button" variant="cancel" disabled={actionLoading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={actionLoading}>
              Create Customer
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showEditModal} onClose={closeEditModal} title="Edit Customer">
        <form className={styles["dashboard-modal-form"]} onSubmit={handleEditSubmit}>
          <Input
            id="edit-customer-name"
            label="Customer Name"
            placeholder="Update customer name"
            value={editForm.name}
            onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            id="edit-customer-phone"
            label="Phone Number (optional)"
            placeholder="Enter phone number"
            value={editForm.phone_no}
            onChange={(e) => setEditForm((prev) => ({ ...prev, phone_no: e.target.value }))}
          />
          <div className={styles["dashboard-checkbox-row"]}>
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
            <Button type="submit" isLoading={actionLoading} disabled={!selectedCustomer}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showDeleteModal} onClose={closeDeleteModal} title="Delete Customer">
        <div className={styles["dashboard-modal-form"]}>
          <p>Are you sure you want to delete <strong>{selectedCustomer?.name || "this customer"}</strong>? This action cannot be undone.</p>
          {deleteDisabled && (
            <p className={styles["dashboard-modal-error"]}>Customer is referenced by other records.</p>
          )}
          {actionError && <p className={styles["dashboard-modal-error"]}>{actionError}</p>}
          <div className={styles["dashboard-modal-actions"]}>
            <Button onClick={closeDeleteModal} type="button" variant="cancel" disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              type="button"
              variant="danger"
              isLoading={actionLoading}
              disabled={!selectedCustomer || deleteDisabled}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
