import { useEffect, useState, type FormEvent } from "react";
import { FaPlus } from "react-icons/fa";
import { DataTable } from "../../components/DataTable/DataTable";
import Pagination from "../../components/Pagination/Pagination";
import SearchFilter from "../../components/SearchFilter/SearchFilter";
import PageSizeSelect from "../../components/PageSizeSelect/PageSizeSelect";
import { Button } from "@/components/Button/Button";
import { useUsersTable } from "./hooks/useUsersTable";
import { useUserActions } from "./hooks/useUserActions";
import { useUserColumns } from "./hooks/useUserColumns";
import { useSearchAutocomplete } from "../../hooks/useSearchAutocomplete";
import { customersApi } from "../../api/customersApi";
import { departmentsApi } from "../../api/departmentsApi";
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

export function UsersPage() {
  const {
    query,
    setQuery,
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

  const columns = useUserColumns(openEditModal, openDeleteModal);

  const [addStep, setAddStep] = useState<"customer" | "department" | "details">("customer");
  const [addStepError, setAddStepError] = useState<string | null>(null);
  const [showEditPassword, setShowEditPassword] = useState(false);

  useEffect(() => {
    setAddStep("customer");
    setAddStepError(null);
  }, [showAddModal]);

  useEffect(() => {
    if (!showEditModal) {
      setShowEditPassword(false);
    }
  }, [showEditModal]);

  const customerAutocomplete = useSearchAutocomplete<CustomerSearch>({
    value: addForm.customer_name,
    id: addForm.customer_id,
    setValue: (value) => setAddForm((prev) => ({ ...prev, customer_name: value })),
    setId: (id) => setAddForm((prev) => ({ ...prev, customer_id: id })),
    active: showAddModal && addStep === "customer",
    queryKeyBase: ["customers", "search"],
    searchFn: (query) => customersApi.search({ name: query }),
    resolveId: (value, options) => findCustomerId(value, options),
    onInputChange: (_value, nextId, prevId) => {
      setAddStepError(null);
      if (nextId !== prevId) {
        setAddForm((prev) => ({ ...prev, department_name: "", department_id: null }));
      }
    },
  });

  const departmentAutocomplete = useSearchAutocomplete<DepartmentSearch>({
    value: addForm.department_name,
    id: addForm.department_id,
    setValue: (value) => setAddForm((prev) => ({ ...prev, department_name: value })),
    setId: (id) => setAddForm((prev) => ({ ...prev, department_id: id })),
    active: showAddModal && addStep === "department",
    queryKeyBase: ["departments", "search", addForm.customer_id],
    searchFn: (query) =>
      departmentsApi.search({
        name: query,
        customer_id: addForm.customer_id ?? undefined,
      }),
    resolveId: (value, options) => findDepartmentId(value, options),
    enabled: !!addForm.customer_id,
    onInputChange: () => setAddStepError(null),
  });

  const handleCustomerNext = () => {
    if (!addForm.customer_id) {
      setAddStepError("Invalid customer");
      return;
    }
    setAddStepError(null);
    setAddStep("department");
  };

  const handleDepartmentNext = () => {
    if (!addForm.department_id) {
      setAddStepError("Invalid department");
      return;
    }
    setAddStepError(null);
    setAddStep("details");
  };

  const handleAddBack = () => {
    setAddStepError(null);
    if (addStep === "details") {
      setAddStep("department");
    } else if (addStep === "department") {
      setAddStep("customer");
    }
  };

  const handleAddFormSubmit = (e?: FormEvent) => {
    if (addStep === "customer") {
      e?.preventDefault();
      handleCustomerNext();
      return;
    }
    if (addStep === "department") {
      e?.preventDefault();
      handleDepartmentNext();
      return;
    }
    handleAddSubmit(e);
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
    step: addStep,
    stepError: addStepError,
    addForm,
    setAddForm,
  };

  const editFlow = {
    editForm,
    setEditForm,
    showPassword: showEditPassword,
  };

  const actions = {
    onCloseAdd: closeAddModal,
    onCloseEdit: closeEditModal,
    onCloseDelete: closeDeleteModal,
    onAddSubmit: handleAddFormSubmit,
    onCustomerNext: handleCustomerNext,
    onDepartmentNext: handleDepartmentNext,
    onAddBack: handleAddBack,
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

          <div className={styles["dashboard-add-button-container"]}>
            <Button
              icon={FaPlus}
              className={styles["dashboard-add-button"]}
              onClick={openAddModal}
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
        roleOptions={ROLE_OPTIONS}
        customerAutocomplete={customerAutocomplete}
        departmentAutocomplete={departmentAutocomplete}
        actions={actions}
      />
    </div>
  );
}
