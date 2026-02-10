import { FaPlus } from "react-icons/fa";
import { DataTable } from "../components/DataTable";
import Pagination from "../components/Pagination";
import SearchFilter from "../components/SearchFilter";
import PageSizeSelect from "../components/PageSizeSelect";
import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { Switch } from "@/components/Switch/Switch";
import { useDistributorsTable } from "../hooks/useDistributorsTable";
import { useDistributorActions } from "../hooks/useDistributorActions";
import { useDistributorColumns } from "../hooks/useDistributorColumns";
import styles from "../styles/dashboard.module.css";
import { useRef } from "react";

export function DistributorsPage() {
  const {
    query,
    setQuery,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    distributors,
    totalPages,
    loading,
    error,
  } = useDistributorsTable(5);

  const {
    showAddModal,
    showEditModal,
    showDeleteModal,
    selectedDistributor,
    actionError,
    actionLoading,
    addForm,
    setAddForm,
    editForm,
    setEditForm,
    addLogoPreview,
    editLogoPreview,
    handleAddLogoChange,
    handleEditLogoChange,
    openAddModal,
    closeAddModal,
    openEditModal,
    closeEditModal,
    openDeleteModal,
    closeDeleteModal,
    handleAddSubmit,
    handleEditSubmit,
    handleDelete,
  } = useDistributorActions();

  const columns = useDistributorColumns(openEditModal, openDeleteModal);
  const deleteDisabled = !!selectedDistributor && !selectedDistributor.is_deletable;
  const addLogoInputRef = useRef<HTMLInputElement | null>(null);
  const editLogoInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className={styles["devices-container"]}>
      <h1>Distributors</h1>
      <p>Manage your distributors</p>

      <div className={styles["dashboard-devices-topbar"]}>
        <div className={styles["dashboard-search-and-action"]}>
          <div className={styles["dashboard-search-wrapper"]}>
            <SearchFilter
              value={query}
              onChange={(v) => setQuery(v)}
              placeholder="Search distributors by name or phone..."
            />
          </div>

          <div className={styles["dashboard-add-button-container"]}>
            <Button
              icon={FaPlus}
              className={styles["dashboard-add-button"]}
              onClick={openAddModal}
            >
              Add Distributor
            </Button>
          </div>
        </div>
      </div>
      {error && <p>{error}</p>}
      <DataTable
        data={distributors}
        columns={columns}
        tableClassName={styles["dashboard-table"]}
        emptyMessage={loading ? "Loading distributors..." : "No distributors found"}
      />

      <div className={styles["dashboard-pagination-row"]}>
        <div className={styles["dashboard-page-size-left"]}>
          <PageSizeSelect value={pageSize} onChange={(n) => { setPageSize(n); setCurrentPage(1); }} />
        </div>
        <div className={styles["dashboard-pagination-right"]}>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => setCurrentPage(p)} maxPagesToShow={5} />
        </div>
      </div>

      <Modal isOpen={showAddModal} onClose={closeAddModal} title="Add Distributor">
        <form className={styles["dashboard-modal-form"]} onSubmit={handleAddSubmit}>
          <div className={styles["dashboard-modal-field"]}>
            <label className={styles["dashboard-modal-label"]}>Logo (optional)</label>
            <div className={styles["dashboard-modal-logo-row"]}>
              <input
                ref={addLogoInputRef}
                id="add-distributor-logo"
                type="file"
                accept="image/*"
                className={styles["dashboard-file-input"]}
                onChange={(e) => handleAddLogoChange(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                className={[
                  styles["dashboard-logo-preview"],
                  styles["dashboard-logo-editable"],
                ].join(" ")}
                onClick={() => addLogoInputRef.current?.click()}
                aria-label="Upload distributor logo"
              >
                {addLogoPreview ? (
                  <img
                    src={addLogoPreview}
                    alt="Distributor logo preview"
                    className={styles["dashboard-logo-preview-img"]}
                  />
                ) : (
                  <div className={styles["dashboard-logo-empty"]}>
                    <span className={styles["dashboard-logo-empty-title"]}>Upload Logo</span>
                    <span className={styles["dashboard-logo-empty-subtitle"]}>PNG, JPG up to 2MB</span>
                  </div>
                )}
                <span className={styles["dashboard-logo-overlay"]}>
                  {addLogoPreview ? "Change" : "Upload"}
                </span>
              </button>
            </div>
          </div>
          <Input
            id="add-distributor-name"
            label="Distributor Name"
            placeholder="Enter distributor name"
            value={addForm.name}
            onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            id="add-distributor-phone"
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
              Create Distributor
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showEditModal} onClose={closeEditModal} title="Edit Distributor">
        <form className={styles["dashboard-modal-form"]} onSubmit={handleEditSubmit}>
          <div className={styles["dashboard-modal-field"]}>
            <label className={styles["dashboard-modal-label"]}>Logo (optional)</label>
            <div className={styles["dashboard-modal-logo-row"]}>
              <input
                ref={editLogoInputRef}
                id="edit-distributor-logo"
                type="file"
                accept="image/*"
                className={styles["dashboard-file-input"]}
                onChange={(e) => handleEditLogoChange(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                className={[
                  styles["dashboard-logo-preview"],
                  styles["dashboard-logo-editable"],
                ].join(" ")}
                onClick={() => editLogoInputRef.current?.click()}
                aria-label="Change distributor logo"
              >
                {editLogoPreview ? (
                  <img
                    src={editLogoPreview}
                    alt="Distributor logo preview"
                    className={styles["dashboard-logo-preview-img"]}
                  />
                ) : (
                  <div className={styles["dashboard-logo-empty"]}>
                    <span className={styles["dashboard-logo-empty-title"]}>Upload Logo</span>
                    <span className={styles["dashboard-logo-empty-subtitle"]}>PNG, JPG up to 2MB</span>
                  </div>
                )}
                <span className={styles["dashboard-logo-overlay"]}>
                  {editLogoPreview ? "Change" : "Upload"}
                </span>
              </button>
            </div>
          </div>
          <Input
            id="edit-distributor-name"
            label="Distributor Name"
            placeholder="Update distributor name"
            value={editForm.name}
            onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            id="edit-distributor-phone"
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
            <Button type="submit" isLoading={actionLoading} disabled={!selectedDistributor}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showDeleteModal} onClose={closeDeleteModal} title="Delete Distributor">
        <div className={styles["dashboard-modal-form"]}>
          <p>Are you sure you want to delete <strong>{selectedDistributor?.name || "this distributor"}</strong>? This action cannot be undone.</p>
          {deleteDisabled && (
            <p className={styles["dashboard-modal-error"]}>Distributor is referenced by other records.</p>
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
              disabled={!selectedDistributor || deleteDisabled}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
