import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FaFilter, FaPlus } from "react-icons/fa";
import { DataTable } from "../../components/DataTable/DataTable";
import Pagination from "../../components/Pagination/Pagination";
import SearchFilter from "../../components/SearchFilter/SearchFilter";
import PageSizeSelect from "../../components/PageSizeSelect/PageSizeSelect";
import { Button } from "@/components/Button/Button";
import { Modal } from "@/components/Modal/Modal";
import { useDepartmentsTable } from "./hooks/useDepartmentsTable";
import { useDepartmentActions } from "./hooks/useDepartmentActions";
import { useDepartmentColumns } from "./hooks/useDepartmentColumns";
import { useSearchAutocomplete } from "../../hooks/useSearchAutocomplete";
import { DepartmentPageModals } from "./DepartmentPageModals";
import { customersApi } from "../../api/customersApi";
import { distributorsApi } from "../../api/distributorsApi";
import type { Customer, CustomerSearch } from "@/types/customer";
import type { Distributor } from "@/types/distributor";
import styles from "./DepartmentPage.module.css";

const findCustomerId = (name: string, options: CustomerSearch[]) => {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;
  const match = options.find((customer) => customer.name.toLowerCase() === normalized);
  return match ? match.id : null;
};

const toggleId = (ids: number[], id: number) =>
  ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];

const sortByName = <T extends { name: string }>(items: T[]) =>
  [...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

export function DepartmentPage() {
  const {
    query,
    setQuery,
    filters,
    setFilters,
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
  const [showFilterOverlay, setShowFilterOverlay] = useState(false);

  const { data: distributorData } = useQuery({
    queryKey: ["departments", "filters", "distributors"],
    queryFn: () => distributorsApi.list({ page: 1, page_size: 100 }),
  });

  const { data: customerData } = useQuery({
    queryKey: ["departments", "filters", "customers"],
    queryFn: () => customersApi.list({ page: 1, page_size: 100 }),
  });

  const distributors: Distributor[] = useMemo(() => sortByName(distributorData?.items ?? []), [distributorData]);
  const customers: Customer[] = useMemo(() => sortByName(customerData?.items ?? []), [customerData]);

  const visibleCustomers = useMemo(() => {
    if (!filters.distributorIds.length) return customers;
    return customers.filter((customer) =>
      customer.distributor_id != null && filters.distributorIds.includes(customer.distributor_id)
    );
  }, [customers, filters.distributorIds]);

  const activeFilterCount = filters.distributorIds.length + filters.customerIds.length;

  const handleDistributorFilterChange = (id: number) => {
    setFilters({
      distributorIds: toggleId(filters.distributorIds, id),
      customerIds: [],
    });
  };

  const handleCustomerFilterChange = (id: number) => {
    setFilters({
      ...filters,
      customerIds: toggleId(filters.customerIds, id),
    });
  };

  const clearDepartmentFilters = () => {
    setFilters({
      distributorIds: [],
      customerIds: [],
    });
  };

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
          <div className={styles["dashboard-search-filter-group"]}>
            <div className={styles["dashboard-search-wrapper"]}>
              <SearchFilter
                value={query}
                onChange={(v) => setQuery(v)}
                placeholder="Search departments by name, MQTT topic, or customer..."
              />
            </div>

            <div className={styles["dashboard-filter-container"]}>
              <button
                type="button"
                className={styles["dashboard-filter-button"]}
                onClick={() => setShowFilterOverlay(true)}
                aria-label="Filter departments"
                aria-expanded={showFilterOverlay}
              >
                <FaFilter aria-hidden />
                {activeFilterCount > 0 && (
                  <span className={styles["dashboard-filter-count"]}>{activeFilterCount}</span>
                )}
              </button>
            </div>
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
        columns={columns}
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

      <Modal
        isOpen={showFilterOverlay}
        onClose={() => setShowFilterOverlay(false)}
        title="Filter departments"
        className={styles["dashboard-filter-modal"]}
        footer={
          <div className={styles["dashboard-filter-footer"]}>
            <button
              type="button"
              className={styles["dashboard-filter-clear"]}
              onClick={clearDepartmentFilters}
              disabled={activeFilterCount === 0}
            >
              Clear filters
            </button>
          </div>
        }
      >
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
        </div>
      </Modal>
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
