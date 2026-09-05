import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FaFilter, FaPlus, FaTimes } from "react-icons/fa";
import { DataTable } from "../../components/DataTable/DataTable";
import Pagination from "../../components/Pagination/Pagination";
import SearchFilter from "../../components/SearchFilter/SearchFilter";
import PageSizeSelect from "../../components/PageSizeSelect/PageSizeSelect";
import { Button } from "@/components/Button/Button";
import { useUsersTable } from "./hooks/useUsersTable";
import { useUserActions, type UserDepartmentAssignment } from "./hooks/useUserActions";
import { useUserColumns } from "./hooks/useUserColumns";
import { useSearchAutocomplete } from "../../hooks/useSearchAutocomplete";
import { customersApi } from "../../api/customersApi";
import { departmentsApi } from "../../api/departmentsApi";
import { distributorsApi } from "../../api/distributorsApi";
import type { Distributor } from "@/types/distributor";
import type { Customer } from "@/types/customer";
import type { Department } from "@/types/department";
import type { CustomerSearch } from "@/types/customer";
import type { DepartmentSearch } from "@/types/department";
import type { UserRole } from "@/types/user";
import { UsersPageModals } from "./UsersPageModals";
import styles from "./UsersPage.module.css";

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
  { value: "superuser", label: "Superuser" },
];

const findCustomerId = (name: string, options: CustomerSearch[]) => {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;
  const match = options.find((customer) => customer.name.toLowerCase() === normalized);
  return match ? match.id : null;
};

const findDepartmentId = (name: string, options: DepartmentSearch[]) => {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;
  const match = options.find((department) => department.name.toLowerCase() === normalized);
  return match ? match.id : null;
};

type UserModalView = "details" | "departments" | "department_customer" | "department_department";
type DepartmentOwner = "add" | "edit";

const EMPTY_DEPARTMENT_DRAFT = {
  customer_name: "",
  customer_id: null as number | null,
  department_name: "",
  department_id: null as number | null,
};

const toggleId = (ids: number[], id: number) =>
  ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];

export function UsersPage() {
  const {
    query,
    setQuery,
    filters,
    setFilters,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    users,
    totalPages,
    loading,
    error,
  } = useUsersTable(5);

  const {
    showAddModal,
    showEditModal,
    showDeleteModal,
    selectedUser,
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
  } = useUserActions();

  const [addView, setAddView] = useState<UserModalView>("details");
  const [editView, setEditView] = useState<UserModalView>("details");
  const [departmentOwner, setDepartmentOwner] = useState<DepartmentOwner>("add");
  const [departmentDraft, setDepartmentDraft] = useState(EMPTY_DEPARTMENT_DRAFT);
  const [departmentStepError, setDepartmentStepError] = useState<string | null>(null);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showFilterOverlay, setShowFilterOverlay] = useState(false);

  const { data: distributorData } = useQuery({
    queryKey: ["users", "filters", "distributors"],
    queryFn: () => distributorsApi.list({ page: 1, page_size: 100 }),
  });

  const { data: customerData } = useQuery({
    queryKey: ["users", "filters", "customers"],
    queryFn: () => customersApi.list({ page: 1, page_size: 100 }),
  });

  const { data: departmentData } = useQuery({
    queryKey: ["users", "filters", "departments"],
    queryFn: () => departmentsApi.list({ page: 1, page_size: 100 }),
  });

  const distributors: Distributor[] = distributorData?.items ?? [];
  const customers: Customer[] = customerData?.items ?? [];
  const departments: Department[] = departmentData?.items ?? [];

  const visibleCustomers = useMemo(() => {
    if (!filters.distributorIds.length) return customers;
    return customers.filter((customer) =>
      customer.distributor_id != null && filters.distributorIds.includes(customer.distributor_id)
    );
  }, [customers, filters.distributorIds]);

  const visibleDepartments = useMemo(() => {
    if (filters.customerIds.length) {
      return departments.filter((department) => filters.customerIds.includes(department.customer_id));
    }
    if (filters.distributorIds.length) {
      const visibleCustomerIds = new Set(visibleCustomers.map((customer) => customer.id));
      return departments.filter((department) => visibleCustomerIds.has(department.customer_id));
    }
    return departments;
  }, [departments, filters.customerIds, filters.distributorIds, visibleCustomers]);

  const activeFilterCount =
    filters.distributorIds.length + filters.customerIds.length + filters.departmentIds.length;

  const handleDistributorFilterChange = (id: number) => {
    setFilters({
      distributorIds: toggleId(filters.distributorIds, id),
      customerIds: [],
      departmentIds: [],
    });
  };

  const handleCustomerFilterChange = (id: number) => {
    setFilters({
      ...filters,
      customerIds: toggleId(filters.customerIds, id),
      departmentIds: [],
    });
  };

  const handleDepartmentFilterChange = (id: number) => {
    setFilters({
      ...filters,
      departmentIds: toggleId(filters.departmentIds, id),
    });
  };

  const clearUserFilters = () => {
    setFilters({
      distributorIds: [],
      customerIds: [],
      departmentIds: [],
    });
  };

  const resetDepartmentState = () => {
    setAddView("details");
    setEditView("details");
    setDepartmentDraft(EMPTY_DEPARTMENT_DRAFT);
    setDepartmentStepError(null);
  };

  const handleOpenAddModal = () => {
    resetDepartmentState();
    openAddModal();
  };

  const handleCloseAddModal = () => {
    resetDepartmentState();
    closeAddModal();
  };

  const handleOpenEditModal = (user: Parameters<typeof openEditModal>[0]) => {
    resetDepartmentState();
    setShowEditPassword(false);
    openEditModal(user);
  };

  const handleCloseEditModal = () => {
    resetDepartmentState();
    setShowEditPassword(false);
    closeEditModal();
  };

  const columns = useUserColumns(handleOpenEditModal, openDeleteModal);

  const customerAutocomplete = useSearchAutocomplete<CustomerSearch>({
    value: departmentDraft.customer_name,
    id: departmentDraft.customer_id,
    setValue: (value) => setDepartmentDraft((prev) => ({ ...prev, customer_name: value })),
    setId: (id) => setDepartmentDraft((prev) => ({ ...prev, customer_id: id })),
    active:
      (showAddModal || showEditModal) &&
      (addView === "department_customer" || editView === "department_customer"),
    queryKeyBase: ["customers", "search"],
    searchFn: (query) => customersApi.search({ name: query }),
    resolveId: (value, options) => findCustomerId(value, options),
    onInputChange: (_value, nextId, prevId) => {
      setDepartmentStepError(null);
      if (nextId !== prevId) {
        setDepartmentDraft((prev) => ({ ...prev, department_name: "", department_id: null }));
      }
    },
  });

  const departmentAutocomplete = useSearchAutocomplete<DepartmentSearch>({
    value: departmentDraft.department_name,
    id: departmentDraft.department_id,
    setValue: (value) => setDepartmentDraft((prev) => ({ ...prev, department_name: value })),
    setId: (id) => setDepartmentDraft((prev) => ({ ...prev, department_id: id })),
    active:
      (showAddModal || showEditModal) &&
      (addView === "department_department" || editView === "department_department"),
    queryKeyBase: ["departments", "search", departmentDraft.customer_id],
    searchFn: (query) =>
      departmentsApi.search({
        name: query,
        customer_id: departmentDraft.customer_id ?? undefined,
      }),
    resolveId: (value, options) => findDepartmentId(value, options),
    enabled: !!departmentDraft.customer_id,
    onInputChange: () => setDepartmentStepError(null),
  });

  const setOwnerView = (owner: DepartmentOwner, view: UserModalView) => {
    if (owner === "add") {
      setAddView(view);
    } else {
      setEditView(view);
    }
  };

  const handleOpenDepartmentList = (owner: DepartmentOwner) => {
    setDepartmentOwner(owner);
    setDepartmentStepError(null);
    setOwnerView(owner, "departments");
  };

  const handleOpenAddDepartment = (owner: DepartmentOwner) => {
    setDepartmentOwner(owner);
    setDepartmentDraft(EMPTY_DEPARTMENT_DRAFT);
    setDepartmentStepError(null);
    setOwnerView(owner, "department_customer");
  };

  const handleDepartmentCustomerNext = () => {
    if (!departmentDraft.customer_id) {
      setDepartmentStepError("Invalid customer");
      return;
    }
    setDepartmentStepError(null);
    setOwnerView(departmentOwner, "department_department");
  };

  const getCurrentDepartments = () =>
    departmentOwner === "add" ? addForm.departments : editForm.departments;

  const handleAddDepartmentToUser = () => {
    if (!departmentDraft.department_id) {
      setDepartmentStepError("Invalid department");
      return;
    }
    if (getCurrentDepartments().some((item) => item.department_id === departmentDraft.department_id)) {
      setDepartmentStepError("Department already added");
      return;
    }

    const assignment: UserDepartmentAssignment = {
      customer_name: departmentDraft.customer_name,
      customer_id: departmentDraft.customer_id,
      department_name: departmentDraft.department_name,
      department_id: departmentDraft.department_id,
    };

    if (departmentOwner === "add") {
      setAddForm((prev) => ({ ...prev, departments: [...prev.departments, assignment] }));
    } else {
      setEditForm((prev) => ({ ...prev, departments: [...prev.departments, assignment] }));
    }
    setDepartmentDraft(EMPTY_DEPARTMENT_DRAFT);
    setDepartmentStepError(null);
    setOwnerView(departmentOwner, "departments");
  };

  const handleRemoveDepartment = (owner: DepartmentOwner, departmentId: number) => {
    if (owner === "add") {
      setAddForm((prev) => ({
        ...prev,
        departments: prev.departments.filter((item) => item.department_id !== departmentId),
      }));
    } else {
      setEditForm((prev) => ({
        ...prev,
        departments: prev.departments.filter((item) => item.department_id !== departmentId),
      }));
    }
  };

  const handleDepartmentBack = () => {
    setDepartmentStepError(null);
    if (addView === "department_department" || editView === "department_department") {
      setOwnerView(departmentOwner, "department_customer");
      return;
    }
    setOwnerView(departmentOwner, "departments");
  };

  const emptyMessage = loading ? "Loading users..." : "No users found";

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setCurrentPage(1);
  };

  const modalState = {
    showAddModal,
    showEditModal,
    showDeleteModal,
    selectedUser,
    actionError,
    actionLoading,
  };

  const addFlow = {
    view: addView,
    addForm,
    setAddForm,
  };

  const editFlow = {
    view: editView,
    editForm,
    setEditForm,
    showPassword: showEditPassword,
  };

  const departmentFlow = {
    owner: departmentOwner,
    draft: departmentDraft,
    stepError: departmentStepError,
    addDepartments: addForm.departments,
    editDepartments: editForm.departments,
  };

  const actions = {
    onCloseAdd: handleCloseAddModal,
    onCloseEdit: handleCloseEditModal,
    onCloseDelete: closeDeleteModal,
    onAddSubmit: handleAddSubmit,
    onOpenDepartmentList: handleOpenDepartmentList,
    onOpenAddDepartment: handleOpenAddDepartment,
    onDepartmentCustomerNext: handleDepartmentCustomerNext,
    onAddDepartmentToUser: handleAddDepartmentToUser,
    onRemoveDepartment: handleRemoveDepartment,
    onDepartmentBack: handleDepartmentBack,
    onBackToAddDetails: () => setAddView("details"),
    onBackToEditDetails: () => setEditView("details"),
    onEditSubmit: handleEditSubmit,
    onDelete: handleDelete,
    onToggleEditPassword: () => setShowEditPassword((prev) => !prev),
  };

  return (
    <div className={styles["devices-container"]}>
      <h1>Users</h1>
      <p>Manage user accounts and permissions</p>

      <div className={styles["dashboard-devices-topbar"]}>
        <div className={styles["dashboard-search-and-action"]}>
          <div className={styles["dashboard-search-wrapper"]}>
            <SearchFilter
              value={query}
              onChange={setQuery}
              placeholder="Search users by email, customer, or department..."
            />
          </div>

          <div className={styles["dashboard-filter-container"]}>
            <button
              type="button"
              className={styles["dashboard-filter-button"]}
              onClick={() => setShowFilterOverlay((prev) => !prev)}
              aria-label="Filter users"
              aria-expanded={showFilterOverlay}
            >
              <FaFilter aria-hidden />
              {activeFilterCount > 0 && (
                <span className={styles["dashboard-filter-count"]}>{activeFilterCount}</span>
              )}
            </button>

            {showFilterOverlay && (
              <div className={styles["dashboard-filter-overlay"]} role="dialog" aria-label="User filters">
                <div className={styles["dashboard-filter-header"]}>
                  <strong>Filter users</strong>
                  <button
                    type="button"
                    className={styles["dashboard-filter-close"]}
                    onClick={() => setShowFilterOverlay(false)}
                    aria-label="Close filters"
                  >
                    <FaTimes aria-hidden />
                  </button>
                </div>

                <div className={styles["dashboard-filter-content"]}>
                  <FilterGroup
                    title="Distributor"
                    items={distributors}
                    selectedIds={filters.distributorIds}
                    onToggle={handleDistributorFilterChange}
                    emptyMessage="No distributors found"
                  />
                  <FilterGroup
                    title="Customer"
                    items={visibleCustomers}
                    selectedIds={filters.customerIds}
                    onToggle={handleCustomerFilterChange}
                    emptyMessage="No customers found"
                  />
                  <FilterGroup
                    title="Department"
                    items={visibleDepartments}
                    selectedIds={filters.departmentIds}
                    onToggle={handleDepartmentFilterChange}
                    emptyMessage="No departments found"
                  />
                </div>

                <div className={styles["dashboard-filter-footer"]}>
                  <button
                    type="button"
                    className={styles["dashboard-filter-clear"]}
                    onClick={clearUserFilters}
                    disabled={activeFilterCount === 0}
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className={styles["dashboard-add-button-container"]}>
            <Button
              icon={FaPlus}
              className={styles["dashboard-add-button"]}
              onClick={handleOpenAddModal}
            >
              Add User
            </Button>
          </div>
        </div>
      </div>

      {error && <p>{error}</p>}

      <DataTable
        data={users}
        columns={columns}        emptyMessage={emptyMessage}
      />

      <div className={styles["dashboard-pagination-row"]}>
        <div className={styles["dashboard-page-size-left"]}>
          <PageSizeSelect value={pageSize} onChange={handlePageSizeChange} />
        </div>
        <div className={styles["dashboard-pagination-right"]}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            maxPagesToShow={5}
          />
        </div>
      </div>

      <UsersPageModals
        modalState={modalState}
        addFlow={addFlow}
        editFlow={editFlow}
        departmentFlow={departmentFlow}
        roleOptions={ROLE_OPTIONS}
        customerAutocomplete={customerAutocomplete}
        departmentAutocomplete={departmentAutocomplete}
        actions={actions}
      />
    </div>
  );
}

type FilterItem = {
  id: number;
  name: string;
};

function FilterGroup({
  title,
  items,
  selectedIds,
  onToggle,
  emptyMessage,
}: {
  title: string;
  items: FilterItem[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  emptyMessage: string;
}) {
  return (
    <section className={styles["dashboard-filter-group"]}>
      <h2>{title}</h2>
      <div className={styles["dashboard-filter-options"]}>
        {items.length ? (
          items.map((item) => (
            <label key={item.id} className={styles["dashboard-filter-option"]}>
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={() => onToggle(item.id)}
              />
              <span>{item.name}</span>
            </label>
          ))
        ) : (
          <p className={styles["dashboard-filter-empty"]}>{emptyMessage}</p>
        )}
      </div>
    </section>
  );
}
