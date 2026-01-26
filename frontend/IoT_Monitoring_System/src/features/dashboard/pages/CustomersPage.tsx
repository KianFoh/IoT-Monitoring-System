import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { distributorsApi } from "../api/distributorsApi";
import type { DistributorSearch } from "@/types/distributor";
import styles from "../styles/dashboard.module.css";

const findDistributorId = (name: string, options: DistributorSearch[]) => {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;
  const match = options.find((distributor) => distributor.name.toLowerCase() === normalized);
  return match ? match.id : null;
};

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

  const [addStep, setAddStep] = useState<"distributor" | "details">("distributor");
  const [addStepError, setAddStepError] = useState<string | null>(null);

  const [addDistributorQuery, setAddDistributorQuery] = useState("");
  const [debouncedAddDistributorQuery, setDebouncedAddDistributorQuery] = useState("");
  const [addDistributorDropdownOpen, setAddDistributorDropdownOpen] = useState(false);

  const [editDistributorQuery, setEditDistributorQuery] = useState("");
  const [debouncedEditDistributorQuery, setDebouncedEditDistributorQuery] = useState("");
  const [editDistributorDropdownOpen, setEditDistributorDropdownOpen] = useState(false);

  useEffect(() => {
    if (!showAddModal) {
      setAddStep("distributor");
      setAddStepError(null);
      setAddDistributorQuery("");
      setAddDistributorDropdownOpen(false);
    } else {
      setAddStep("distributor");
      setAddStepError(null);
    }
  }, [showAddModal]);

  useEffect(() => {
    if (!showEditModal) {
      setEditDistributorQuery("");
      setEditDistributorDropdownOpen(false);
    } else {
      setEditDistributorQuery(editForm.distributor_name);
    }
  }, [showEditModal, editForm.distributor_name]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAddDistributorQuery(addDistributorQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [addDistributorQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEditDistributorQuery(editDistributorQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [editDistributorQuery]);

  const { data: addDistributorSuggestions = [], isFetching: isAddDistributorFetching } = useQuery<DistributorSearch[]>({
    queryKey: ["distributors", "search", debouncedAddDistributorQuery],
    queryFn: () => distributorsApi.search({ name: debouncedAddDistributorQuery }),
    enabled: !!debouncedAddDistributorQuery.trim(),
    placeholderData: (prev) => prev ?? [],
  });

  const { data: editDistributorSuggestions = [], isFetching: isEditDistributorFetching } = useQuery<DistributorSearch[]>({
    queryKey: ["distributors", "search", debouncedEditDistributorQuery],
    queryFn: () => distributorsApi.search({ name: debouncedEditDistributorQuery }),
    enabled: !!debouncedEditDistributorQuery.trim(),
    placeholderData: (prev) => prev ?? [],
  });

  useEffect(() => {
    const name = addForm.distributor_name;
    const trimmedName = name.trim();
    const distributor_id = findDistributorId(name, addDistributorSuggestions);
    if (!trimmedName) {
      setAddForm((prev) => (prev.distributor_id === null ? prev : { ...prev, distributor_id: null }));
      return;
    }
    if (distributor_id === null) return;
    setAddForm((prev) => (prev.distributor_id === distributor_id ? prev : { ...prev, distributor_id }));
  }, [addForm.distributor_name, addDistributorSuggestions, setAddForm]);

  useEffect(() => {
    if (!showEditModal) return;
    const name = editForm.distributor_name;
    const trimmedName = name.trim();
    const distributor_id = findDistributorId(name, editDistributorSuggestions);
    if (!trimmedName) {
      setEditForm((prev) => (prev.distributor_id === null ? prev : { ...prev, distributor_id: null }));
      return;
    }
    if (distributor_id === null) return;
    setEditForm((prev) => (prev.distributor_id === distributor_id ? prev : { ...prev, distributor_id }));
  }, [editForm.distributor_name, editDistributorSuggestions, setEditForm, showEditModal]);

  const handleAddDistributorNameChange = (value: string) => {
    setAddDistributorQuery(value);
    setAddDistributorDropdownOpen(true);
    setAddStepError(null);
    const distributor_id = findDistributorId(value, addDistributorSuggestions);
    setAddForm((prev) => ({ ...prev, distributor_name: value, distributor_id }));
  };

  const handleAddDistributorFocus = () => {
    setAddDistributorQuery(addForm.distributor_name);
    setAddDistributorDropdownOpen(true);
  };

  const handleAddDistributorBlur = () => {
    setTimeout(() => setAddDistributorDropdownOpen(false), 120);
  };

  const handleAddDistributorPick = (distributor: DistributorSearch) => {
    handleAddDistributorNameChange(distributor.name);
    setAddDistributorDropdownOpen(false);
  };

  const handleEditDistributorNameChange = (value: string) => {
    setEditDistributorQuery(value);
    setEditDistributorDropdownOpen(true);
    const distributor_id = findDistributorId(value, editDistributorSuggestions);
    setEditForm((prev) => ({ ...prev, distributor_name: value, distributor_id }));
  };

  const handleEditDistributorFocus = () => {
    setEditDistributorQuery(editForm.distributor_name);
    setEditDistributorDropdownOpen(true);
  };

  const handleEditDistributorBlur = () => {
    setTimeout(() => setEditDistributorDropdownOpen(false), 120);
  };

  const handleEditDistributorPick = (distributor: DistributorSearch) => {
    handleEditDistributorNameChange(distributor.name);
    setEditDistributorDropdownOpen(false);
  };

  const handleDistributorNext = () => {
    const trimmedName = addForm.distributor_name.trim();
    if (trimmedName && !addForm.distributor_id) {
      setAddStepError("Invalid distributor");
      return;
    }
    setAddStepError(null);
    setAddDistributorDropdownOpen(false);
    setAddStep("details");
  };

  const handleAddBack = () => {
    setAddStepError(null);
    setAddStep("distributor");
  };

  const handleAddFormSubmit = (e?: FormEvent) => {
    if (addStep === "distributor") {
      e?.preventDefault();
      handleDistributorNext();
      return;
    }
    handleAddSubmit(e);
  };

  const showAddDistributorSuggestions =
    showAddModal &&
    addStep === "distributor" &&
    addDistributorDropdownOpen &&
    addDistributorQuery.trim().length > 0;

  const showEditDistributorSuggestions =
    showEditModal && editDistributorDropdownOpen && editDistributorQuery.trim().length > 0;

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
              placeholder="Search customers by name, phone, or distributor..."
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
        <form className={styles["dashboard-modal-form"]} onSubmit={handleAddFormSubmit}>
          {addStep === "distributor" ? (
            <>
              <div className={styles["dashboard-autocomplete"]}>
                <Input
                  id="add-customer-distributor"
                  label="Distributor (optional)"
                  placeholder="Search distributor by name"
                  value={addForm.distributor_name}
                  onChange={(e) => handleAddDistributorNameChange(e.target.value)}
                  autoComplete="off"
                  onFocus={handleAddDistributorFocus}
                  onBlur={handleAddDistributorBlur}
                  aria-autocomplete="list"
                  aria-expanded={showAddDistributorSuggestions}
                  aria-controls="add-customer-distributor-list"
                />
                {showAddDistributorSuggestions && (
                  <div
                    id="add-customer-distributor-list"
                    className={styles["dashboard-autocomplete-list"]}
                    role="listbox"
                  >
                    {isAddDistributorFetching ? (
                      <div className={styles["dashboard-autocomplete-empty"]}>Searching...</div>
                    ) : addDistributorSuggestions.length === 0 ? (
                      <div className={styles["dashboard-autocomplete-empty"]}>No matches</div>
                    ) : (
                      addDistributorSuggestions.map((distributor) => (
                        <button
                          key={distributor.id}
                          type="button"
                          className={styles["dashboard-autocomplete-item"]}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleAddDistributorPick(distributor);
                          }}
                          role="option"
                        >
                          {distributor.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {addStepError && <p className={styles["dashboard-modal-error"]}>{addStepError}</p>}
              <div className={styles["dashboard-modal-actions"]}>
                <Button onClick={closeAddModal} type="button" variant="cancel" disabled={actionLoading}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleDistributorNext}>
                  Next
                </Button>
              </div>
            </>
          ) : (
            <>
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
                <Button type="button" variant="cancel" onClick={handleAddBack} disabled={actionLoading}>
                  Back
                </Button>
                <Button type="submit" isLoading={actionLoading}>
                  Create Customer
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>

      <Modal isOpen={showEditModal} onClose={closeEditModal} title="Edit Customer">
        <form className={styles["dashboard-modal-form"]} onSubmit={handleEditSubmit}>
          <div className={styles["dashboard-autocomplete"]}>
            <Input
              id="edit-customer-distributor"
              label="Distributor (optional)"
              placeholder="Search distributor by name"
              value={editForm.distributor_name}
              onChange={(e) => handleEditDistributorNameChange(e.target.value)}
              autoComplete="off"
              onFocus={handleEditDistributorFocus}
              onBlur={handleEditDistributorBlur}
              aria-autocomplete="list"
              aria-expanded={showEditDistributorSuggestions}
              aria-controls="edit-customer-distributor-list"
            />
            {showEditDistributorSuggestions && (
              <div
                id="edit-customer-distributor-list"
                className={styles["dashboard-autocomplete-list"]}
                role="listbox"
              >
                {isEditDistributorFetching ? (
                  <div className={styles["dashboard-autocomplete-empty"]}>Searching...</div>
                ) : editDistributorSuggestions.length === 0 ? (
                  <div className={styles["dashboard-autocomplete-empty"]}>No matches</div>
                ) : (
                  editDistributorSuggestions.map((distributor) => (
                    <button
                      key={distributor.id}
                      type="button"
                      className={styles["dashboard-autocomplete-item"]}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleEditDistributorPick(distributor);
                      }}
                      role="option"
                    >
                      {distributor.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
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
