import { useEffect, useState } from "react";
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
import { useDepartmentsTable } from "../hooks/useDepartmentsTable";
import { useDepartmentActions } from "../hooks/useDepartmentActions";
import { useDepartmentColumns } from "../hooks/useDepartmentColumns";
import { customersApi } from "../api/customersApi";
import type { CustomerSearch } from "@/types/customer";
import styles from "../styles/dashboard.module.css";

const findCustomerId = (name: string, options: CustomerSearch[]) => {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;
  const match = options.find((customer) => customer.name.toLowerCase() === normalized);
  return match ? match.id : null;
};

export function DepartmentPage() {
  const {
    query,
    setQuery,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    departments,
    totalPages,
    loading,
    error,
  } = useDepartmentsTable(5);

  const {
    showAddModal,
    showEditModal,
    showDeleteModal,
    selectedDepartment,
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
  } = useDepartmentActions();

  const columns = useDepartmentColumns(openEditModal, openDeleteModal);
  const deleteDisabled = !!selectedDepartment && !selectedDepartment.is_deletable;

  const [customerQuery, setCustomerQuery] = useState("");
  const [debouncedCustomerQuery, setDebouncedCustomerQuery] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCustomerQuery(customerQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerQuery]);

  const { data: customerSuggestions = [], isFetching: isCustomerFetching } = useQuery<CustomerSearch[]>({
    queryKey: ["customers", "search", debouncedCustomerQuery],
    queryFn: () => customersApi.search({ name: debouncedCustomerQuery }),
    enabled: !!debouncedCustomerQuery.trim(),
    placeholderData: (prev) => prev ?? [],
  });

  useEffect(() => {
    const name = addForm.customer_name;
    const trimmedName = name.trim();
    const customer_id = findCustomerId(name, customerSuggestions);
    if (!trimmedName) {
      setAddForm((prev) => (prev.customer_id === null ? prev : { ...prev, customer_id: null }));
      return;
    }
    if (customer_id === null) return;
    setAddForm((prev) => (prev.customer_id === customer_id ? prev : { ...prev, customer_id }));
  }, [addForm.customer_name, customerSuggestions, setAddForm]);

  useEffect(() => {
    if (!showAddModal && !showEditModal) {
      setCustomerQuery("");
      setCustomerDropdownOpen(false);
    }
  }, [showAddModal, showEditModal]);

  const handleCustomerNameChange = (value: string) => {
    setCustomerQuery(value);
    setCustomerDropdownOpen(true);
    const customer_id = findCustomerId(value, customerSuggestions);
    setAddForm((prev) => ({ ...prev, customer_name: value, customer_id }));
  };

  const handleCustomerFocus = () => {
    setCustomerQuery(addForm.customer_name);
    setCustomerDropdownOpen(true);
  };

  const handleCustomerBlur = () => {
    setTimeout(() => setCustomerDropdownOpen(false), 120);
  };

  const handleCustomerPick = (customer: CustomerSearch) => {
    handleCustomerNameChange(customer.name);
    setCustomerDropdownOpen(false);
  };

  const hasCustomerQuery = customerQuery.trim().length > 0;
  const showAddSuggestions = showAddModal && customerDropdownOpen && hasCustomerQuery;

  return (
    <div className={styles["devices-container"]}>
      <h1>Departments</h1>
      <p>Manage your customer departments</p>

      <div className={styles["dashboard-devices-topbar"]}>
        <div className={styles["dashboard-search-and-action"]}>
          <div className={styles["dashboard-search-wrapper"]}>
            <SearchFilter
              value={query}
              onChange={(v) => setQuery(v)}
              placeholder="Search departments by name or customer..."
            />
          </div>

          <div className={styles["dashboard-add-button-container"]}>
            <Button
              icon={FaPlus}
              className={styles["dashboard-add-button"]}
              onClick={openAddModal}
            >
              Add Department
            </Button>
          </div>
        </div>
      </div>

      {error && <p>{error}</p>}

      <DataTable
        data={departments}
        columns={columns}
        tableClassName={styles["dashboard-table"]}
        emptyMessage={loading ? "Loading departments..." : "No departments found"}
      />

      <div className={styles["dashboard-pagination-row"]}>
        <div className={styles["dashboard-page-size-left"]}>
          <PageSizeSelect value={pageSize} onChange={(n) => { setPageSize(n); setCurrentPage(1); }} />
        </div>
        <div className={styles["dashboard-pagination-right"]}>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => setCurrentPage(p)} maxPagesToShow={5} />
        </div>
      </div>

      <Modal isOpen={showAddModal} onClose={closeAddModal} title="Add Department">
        <form className={styles["dashboard-modal-form"]} onSubmit={handleAddSubmit}>
          <Input
            id="add-department-name"
            label="Department Name"
            placeholder="Enter department name"
            value={addForm.name}
            onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <div className={styles["dashboard-autocomplete"]}>
            <Input
              id="add-department-customer"
              label="Customer"
              placeholder="Search customer by name"
              value={addForm.customer_name}
              onChange={(e) => handleCustomerNameChange(e.target.value)}
              autoComplete="off"
              onFocus={handleCustomerFocus}
              onBlur={handleCustomerBlur}
              aria-autocomplete="list"
              aria-expanded={showAddSuggestions}
              aria-controls="add-department-customer-list"
            />
            {showAddSuggestions && (
              <div
                id="add-department-customer-list"
                className={styles["dashboard-autocomplete-list"]}
                role="listbox"
              >
                {isCustomerFetching ? (
                  <div className={styles["dashboard-autocomplete-empty"]}>Searching...</div>
                ) : customerSuggestions.length === 0 ? (
                  <div className={styles["dashboard-autocomplete-empty"]}>No matches</div>
                ) : (
                  customerSuggestions.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      className={styles["dashboard-autocomplete-item"]}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleCustomerPick(customer);
                      }}
                      role="option"
                    >
                      {customer.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {actionError && <p className={styles["dashboard-modal-error"]}>{actionError}</p>}
          <div className={styles["dashboard-modal-actions"]}>
            <Button onClick={closeAddModal} type="button" variant="cancel" disabled={actionLoading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={actionLoading}>
              Create Department
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showEditModal} onClose={closeEditModal} title="Edit Department">
        <form className={styles["dashboard-modal-form"]} onSubmit={handleEditSubmit}>
          <Input
            id="edit-department-name"
            label="Department Name"
            placeholder="Update department name"
            value={editForm.name}
            onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
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
            <Button type="submit" isLoading={actionLoading} disabled={!selectedDepartment}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showDeleteModal} onClose={closeDeleteModal} title="Delete Department">
        <div className={styles["dashboard-modal-form"]}>
          <p>Are you sure you want to delete <strong>{selectedDepartment?.name || "this department"}</strong>? This action cannot be undone.</p>
          {deleteDisabled && (
            <p className={styles["dashboard-modal-error"]}>Department is referenced by other records.</p>
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
              disabled={!selectedDepartment || deleteDisabled}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
