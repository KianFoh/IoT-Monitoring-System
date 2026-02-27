import { FaPlus } from "react-icons/fa";
import { DataTable } from "../../components/DataTable/DataTable";
import Pagination from "../../components/Pagination/Pagination";
import SearchFilter from "../../components/SearchFilter/SearchFilter";
import PageSizeSelect from "../../components/PageSizeSelect/PageSizeSelect";
import { Button } from "@/components/Button/Button";
import { useDepartmentsTable } from "./hooks/useDepartmentsTable";
import { useDepartmentActions } from "./hooks/useDepartmentActions";
import { useDepartmentColumns } from "./hooks/useDepartmentColumns";
import { useSearchAutocomplete } from "../../hooks/useSearchAutocomplete";
import { DepartmentPageModals } from "./DepartmentPageModals";
import { customersApi } from "../../api/customersApi";
import type { CustomerSearch } from "@/types/customer";
import styles from "./DepartmentPage.module.css";

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

  const departmentActions = useDepartmentActions();
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
  } = departmentActions;

  const columns = useDepartmentColumns(
    departmentActions.openEditModal,
    departmentActions.openDeleteModal
  );
  const deleteDisabled = !!selectedDepartment && !selectedDepartment.is_deletable;

  const customerAutocomplete = useSearchAutocomplete<CustomerSearch>({
    value: addForm.customer_name,
    id: addForm.customer_id,
    setValue: (value) => setAddForm((prev) => ({ ...prev, customer_name: value })),
    setId: (id) => setAddForm((prev) => ({ ...prev, customer_id: id })),
    active: showAddModal,
    queryKeyBase: ["customers", "search", "add-department"],
    searchFn: (query) => customersApi.search({ name: query }),
    resolveId: findCustomerId,
  });

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
              onClick={departmentActions.openAddModal}
            >
              Add Department
            </Button>
          </div>
        </div>
      </div>

      {error && <p>{error}</p>}

      <DataTable
        data={departments}
        columns={columns}        emptyMessage={loading ? "Loading departments..." : "No departments found"}
      />

      <div className={styles["dashboard-pagination-row"]}>
        <div className={styles["dashboard-page-size-left"]}>
          <PageSizeSelect value={pageSize} onChange={(n) => { setPageSize(n); setCurrentPage(1); }} />
        </div>
        <div className={styles["dashboard-pagination-right"]}>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => setCurrentPage(p)} maxPagesToShow={5} />
        </div>
      </div>

      <DepartmentPageModals
        modalState={{
          showAddModal,
          showEditModal,
          showDeleteModal,
          selectedDepartment,
          deleteDisabled,
          actionError,
          actionLoading,
        }}
        addFlow={{
          addForm,
          setAddForm,
          onAddSubmit: departmentActions.handleAddSubmit,
        }}
        editFlow={{
          editForm,
          setEditForm,
          onEditSubmit: departmentActions.handleEditSubmit,
        }}
        autocomplete={{
          customer: customerAutocomplete,
        }}
        actions={{
          onCloseAdd: departmentActions.closeAddModal,
          onCloseEdit: departmentActions.closeEditModal,
          onCloseDelete: departmentActions.closeDeleteModal,
          onDelete: departmentActions.handleDelete,
        }}
      />
    </div>
  );
}
