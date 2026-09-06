import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { FaFilter, FaPlus } from "react-icons/fa";
import { DataTable } from "../../components/DataTable/DataTable";
import Pagination from "../../components/Pagination/Pagination";
import SearchFilter from "../../components/SearchFilter/SearchFilter";
import PageSizeSelect from "../../components/PageSizeSelect/PageSizeSelect";
import { Button } from "@/components/Button/Button";
import { Modal } from "@/components/Modal/Modal";
import { useCustomersTable } from "./hooks/useCustomersTable";
import { useCustomerActions } from "./hooks/useCustomerActions";
import { useCustomerColumns } from "./hooks/useCustomerColumns";
import { useSearchAutocomplete } from "../../hooks/useSearchAutocomplete";
import { CustomersPageModals } from "./CustomersPageModals";
import { distributorsApi } from "../../api/distributorsApi";
import type { Distributor, DistributorSearch } from "@/types/distributor";
import styles from "./CustomersPage.module.css";

const findDistributorId = (name: string, options: DistributorSearch[]) => {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;
  const match = options.find((distributor) => distributor.name.toLowerCase() === normalized);
  return match ? match.id : null;
};

const toggleId = (ids: number[], id: number) =>
  ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];

const sortByName = <T extends { name: string }>(items: T[]) =>
  [...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

export function CustomersPage() {
  const {
    query,
    setQuery,
    filters,
    setFilters,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    customers,
    totalPages,
    loading,
    error,
  } = useCustomersTable(5);

  const customerActions = useCustomerActions();
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
  } = customerActions;

  const columns = useCustomerColumns(customerActions.openEditModal, customerActions.openDeleteModal);
  const deleteDisabled = !!selectedCustomer && !selectedCustomer.is_deletable;

  const [addStep, setAddStep] = useState<"distributor" | "details">("distributor");
  const [addStepError, setAddStepError] = useState<string | null>(null);
  const [showFilterOverlay, setShowFilterOverlay] = useState(false);

  const { data: distributorData } = useQuery({
    queryKey: ["customers", "filters", "distributors"],
    queryFn: () => distributorsApi.list({ page: 1, page_size: 100 }),
  });

  const distributors: Distributor[] = useMemo(() => sortByName(distributorData?.items ?? []), [distributorData]);
  const activeFilterCount = filters.distributorIds.length;

  const handleDistributorFilterChange = (id: number) => {
    setFilters({
      distributorIds: toggleId(filters.distributorIds, id),
    });
  };

  const clearCustomerFilters = () => {
    setFilters({
      distributorIds: [],
    });
  };

  const addDistributorAutocomplete = useSearchAutocomplete<DistributorSearch>({
    value: addForm.distributor_name,
    id: addForm.distributor_id,
    setValue: (value) => setAddForm((prev) => ({ ...prev, distributor_name: value })),
    setId: (id) => setAddForm((prev) => ({ ...prev, distributor_id: id })),
    active: showAddModal && addStep === "distributor",
    queryKeyBase: ["distributors", "search", "add-customer"],
    searchFn: (query) => distributorsApi.search({ name: query }),
    resolveId: findDistributorId,
    onInputChange: () => setAddStepError(null),
  });

  const editDistributorAutocomplete = useSearchAutocomplete<DistributorSearch>({
    value: editForm.distributor_name,
    id: editForm.distributor_id,
    setValue: (value) => setEditForm((prev) => ({ ...prev, distributor_name: value })),
    setId: (id) => setEditForm((prev) => ({ ...prev, distributor_id: id })),
    active: showEditModal,
    queryKeyBase: ["distributors", "search", "edit-customer"],
    searchFn: (query) => distributorsApi.search({ name: query }),
    resolveId: findDistributorId,
  });

  useEffect(() => {
    setAddStep("distributor");
    setAddStepError(null);
  }, [showAddModal]);

  const handleDistributorNext = () => {
    const trimmedName = addForm.distributor_name.trim();
    if (trimmedName && !addForm.distributor_id) {
      setAddStepError("Invalid distributor");
      return;
    }
    setAddStepError(null);
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
    customerActions.handleAddSubmit(e);
  };

  return (
    <div className={styles["devices-container"]}>
      <h1>Customers</h1>
      <p>Manage your customers</p>

      <div className={styles["dashboard-devices-topbar"]}>
        <div className={styles["dashboard-search-and-action"]}>
          <div className={styles["dashboard-search-filter-group"]}>
            <div className={styles["dashboard-search-wrapper"]}>
              <SearchFilter
                value={query}
                onChange={(v) => setQuery(v)}
                placeholder="Search customers by name, MQTT topic, phone, or distributor..."
              />
            </div>

            <div className={styles["dashboard-filter-container"]}>
              <button
                type="button"
                className={styles["dashboard-filter-button"]}
                onClick={() => setShowFilterOverlay(true)}
                aria-label="Filter customers"
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
              onClick={customerActions.openAddModal}
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

      <CustomersPageModals
        modalState={{
          showAddModal,
          showEditModal,
          showDeleteModal,
          selectedCustomer,
          deleteDisabled,
          actionError,
          actionLoading,
        }}
        addFlow={{
          step: addStep,
          stepError: addStepError,
          addForm,
          setAddForm,
          onAddFormSubmit: handleAddFormSubmit,
          onAddNext: handleDistributorNext,
          onAddBack: handleAddBack,
        }}
        editFlow={{
          editForm,
          setEditForm,
          onEditSubmit: customerActions.handleEditSubmit,
        }}
        autocomplete={{
          addDistributor: addDistributorAutocomplete,
          editDistributor: editDistributorAutocomplete,
        }}
        actions={{
          onCloseAdd: customerActions.closeAddModal,
          onCloseEdit: customerActions.closeEditModal,
          onCloseDelete: customerActions.closeDeleteModal,
          onDelete: customerActions.handleDelete,
        }}
      />

      <Modal
        isOpen={showFilterOverlay}
        onClose={() => setShowFilterOverlay(false)}
        title="Filter customers"
        className={styles["dashboard-filter-modal"]}
        footer={
          <div className={styles["dashboard-filter-footer"]}>
            <button
              type="button"
              className={styles["dashboard-filter-clear"]}
              onClick={clearCustomerFilters}
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
