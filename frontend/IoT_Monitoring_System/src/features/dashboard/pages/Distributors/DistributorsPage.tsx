import { FaPlus } from "react-icons/fa";
import { DataTable } from "../../components/DataTable/DataTable";
import Pagination from "../../components/Pagination/Pagination";
import SearchFilter from "../../components/SearchFilter/SearchFilter";
import PageSizeSelect from "../../components/PageSizeSelect/PageSizeSelect";
import { Button } from "@/components/Button/Button";
import { useDistributorsTable } from "./hooks/useDistributorsTable";
import { useDistributorActions } from "./hooks/useDistributorActions";
import { useDistributorColumns } from "./hooks/useDistributorColumns";
import { DistributorsPageModals } from "./DistributorsPageModals";
import styles from "./DistributorsPage.module.css";

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

  const distributorActions = useDistributorActions();
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
  } = distributorActions;

  const columns = useDistributorColumns(
    distributorActions.openEditModal,
    distributorActions.openDeleteModal
  );
  const deleteDisabled = !!selectedDistributor && !selectedDistributor.is_deletable;
  const emptyMessage = loading ? "Loading machine makers..." : "No machine makers found";

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setCurrentPage(1);
  };

  const modalState = {
    showAddModal,
    showEditModal,
    showDeleteModal,
    selectedDistributor,
    deleteDisabled,
    actionError,
    actionLoading,
  };

  const forms = {
    addForm,
    setAddForm,
    editForm,
    setEditForm,
  };

  const logo = {
    addLogoPreview,
    editLogoPreview,
    onAddLogoChange: handleAddLogoChange,
    onEditLogoChange: handleEditLogoChange,
  };

  const actions = {
    onCloseAdd: distributorActions.closeAddModal,
    onCloseEdit: distributorActions.closeEditModal,
    onCloseDelete: distributorActions.closeDeleteModal,
    onAddSubmit: distributorActions.handleAddSubmit,
    onEditSubmit: distributorActions.handleEditSubmit,
    onDelete: distributorActions.handleDelete,
  };

  return (
    <div className={styles["devices-container"]}>
      <h1>Machine Makers</h1>
      <p>Manage your machine makers</p>

      <div className={styles["dashboard-devices-topbar"]}>
        <div className={styles["dashboard-search-and-action"]}>
          <div className={styles["dashboard-search-wrapper"]}>
            <SearchFilter
              value={query}
              onChange={setQuery}
              placeholder="Search machine makers by name, subdomain, MQTT topic, or phone..."
            />
          </div>

          <div className={styles["dashboard-add-button-container"]}>
            <Button
              icon={FaPlus}
              className={styles["dashboard-add-button"]}
              onClick={distributorActions.openAddModal}
            >
              Add Machine Maker
            </Button>
          </div>
        </div>
      </div>
      {error && <p>{error}</p>}
      <DataTable
        data={distributors}
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

      <DistributorsPageModals
        modalState={modalState}
        forms={forms}
        logo={logo}
        actions={actions}
      />
    </div>
  );
}
