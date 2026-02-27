import { useEffect, useState, type FormEvent } from "react";
import { FaPlus } from "react-icons/fa";
import { DataTable } from "../../components/DataTable/DataTable";
import Pagination from "../../components/Pagination/Pagination";
import SearchFilter from "../../components/SearchFilter/SearchFilter";
import PageSizeSelect from "../../components/PageSizeSelect/PageSizeSelect";
import { Button } from "@/components/Button/Button";
import { useCustomersTable } from "./hooks/useCustomersTable";
import { useCustomerActions } from "./hooks/useCustomerActions";
import { useCustomerColumns } from "./hooks/useCustomerColumns";
import { useSearchAutocomplete } from "../../hooks/useSearchAutocomplete";
import { CustomersPageModals } from "./CustomersPageModals";
import { distributorsApi } from "../../api/distributorsApi";
import type { DistributorSearch } from "@/types/distributor";
import styles from "./CustomersPage.module.css";

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
        columns={columns}        emptyMessage={loading ? "Loading customers..." : "No customers found"}
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
    </div>
  );
}
