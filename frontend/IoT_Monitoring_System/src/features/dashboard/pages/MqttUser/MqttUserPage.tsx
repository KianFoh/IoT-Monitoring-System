import { useEffect, useState, type FormEvent } from "react";
import { FaPlus } from "react-icons/fa";
import { DataTable } from "../../components/DataTable/DataTable";
import Pagination from "../../components/Pagination/Pagination";
import SearchFilter from "../../components/SearchFilter/SearchFilter";
import PageSizeSelect from "../../components/PageSizeSelect/PageSizeSelect";
import { Button } from "@/components/Button/Button";
import { useMqttUsersTable } from "./hooks/useMqttUsersTable";
import { useMqttUserActions } from "./hooks/useMqttUserActions";
import { useMqttUserColumns } from "./hooks/useMqttUserColumns";
import { useSearchAutocomplete } from "../../hooks/useSearchAutocomplete";
import { customersApi } from "../../api/customersApi";
import { mqttUsersApi } from "../../api/mqttUsersApi";
import type { CustomerSearch } from "@/types/customer";
import { MqttUserPageModals } from "./MqttUserPageModals";
import styles from "./MqttUserPage.module.css";

const findCustomerId = (name: string, options: CustomerSearch[]) => {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;
  const match = options.find((customer) => customer.name.toLowerCase() === normalized);
  return match ? match.id : null;
};

export function MqttUserPage() {
  const {
    query,
    setQuery,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    mqttUsers,
    totalPages,
    loading,
    error,
  } = useMqttUsersTable(5);

  const {
    showAddModal,
    showEditModal,
    showDeleteModal,
    selectedUser,
    actionError,
    actionLoading,
    setOriginalPassword,
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
  } = useMqttUserActions();

  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [addStep, setAddStep] = useState<"customer" | "credentials">("customer");
  const [addStepError, setAddStepError] = useState<string | null>(null);
  const [editPasswordLoading, setEditPasswordLoading] = useState(false);
  const [passwordFetchError, setPasswordFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!showAddModal) {
      setShowAddPassword(false);
    }
    setAddStep("customer");
    setAddStepError(null);
  }, [showAddModal]);

  useEffect(() => {
    if (!showEditModal) {
      setShowEditPassword(false);
      setEditPasswordLoading(false);
      setPasswordFetchError(null);
      setOriginalPassword(null);
    }
  }, [setOriginalPassword, showEditModal]);

  const customerAutocomplete = useSearchAutocomplete<CustomerSearch>({
    value: addForm.customer_name,
    id: addForm.customer_id,
    setValue: (value) => setAddForm((prev) => ({ ...prev, customer_name: value })),
    setId: (id) => setAddForm((prev) => ({ ...prev, customer_id: id })),
    active: showAddModal && addStep === "customer",
    queryKeyBase: ["customers", "search"],
    searchFn: (query) => customersApi.search({ name: query }),
    resolveId: (value, options) => findCustomerId(value, options),
    onInputChange: () => setAddStepError(null),
  });

  useEffect(() => {
    if (!showEditModal || !selectedUser) return;
    let cancelled = false;
    setEditPasswordLoading(true);
    setPasswordFetchError(null);
    mqttUsersApi
      .getWithPassword(selectedUser.id)
      .then((data) => {
        if (cancelled) return;
        const password = data.password ?? "";
        setEditForm((prev) => ({ ...prev, password }));
        setOriginalPassword(password);
      })
      .catch((err: any) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load password";
        setPasswordFetchError(message);
        setEditForm((prev) => ({ ...prev, password: "" }));
        setOriginalPassword(null);
      })
      .finally(() => {
        if (cancelled) return;
        setEditPasswordLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [setEditForm, setOriginalPassword, selectedUser?.id, showEditModal]);

  const handleAddNext = () => {
    if (!addForm.customer_id) {
      setAddStepError("Invalid customer");
      return;
    }
    setAddStepError(null);
    setAddStep("credentials");
  };

  const handleAddBack = () => {
    setAddStep("customer");
  };

  const handleAddFormSubmit = (e?: FormEvent) => {
    if (addStep === "customer") {
      e?.preventDefault();
      handleAddNext();
      return;
    }
    handleAddSubmit(e);
  };

  const columns = useMqttUserColumns(openEditModal, openDeleteModal);
  const emptyMessage = loading ? "Loading MQTT users..." : "No MQTT users found";

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
    showPassword: showAddPassword,
  };

  const editFlow = {
    editForm,
    setEditForm,
    showPassword: showEditPassword,
    passwordLoading: editPasswordLoading,
    passwordError: passwordFetchError,
  };

  const actions = {
    onCloseAdd: closeAddModal,
    onCloseEdit: closeEditModal,
    onCloseDelete: closeDeleteModal,
    onAddSubmit: handleAddFormSubmit,
    onAddNext: handleAddNext,
    onAddBack: handleAddBack,
    onEditSubmit: handleEditSubmit,
    onDelete: handleDelete,
    onToggleAddPassword: () => setShowAddPassword((prev) => !prev),
    onToggleEditPassword: () => setShowEditPassword((prev) => !prev),
  };

  return (
    <div className={styles["devices-container"]}>
      <h1>MQTT Users</h1>
      <p>Manage MQTT broker users and credentials</p>

      <div className={styles["dashboard-devices-topbar"]}>
        <div className={styles["dashboard-search-and-action"]}>
          <div className={styles["dashboard-search-wrapper"]}>
            <SearchFilter
              value={query}
              onChange={setQuery}
              placeholder="Search users by username or customer..."
            />
          </div>

          <div className={styles["dashboard-add-button-container"]}>
            <Button
              icon={FaPlus}
              className={styles["dashboard-add-button"]}
              onClick={openAddModal}
            >
              Add MQTT User
            </Button>
          </div>
        </div>
      </div>

      {error && <p>{error}</p>}

      <DataTable
        data={mqttUsers}
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

      <MqttUserPageModals
        modalState={modalState}
        addFlow={addFlow}
        editFlow={editFlow}
        customerAutocomplete={customerAutocomplete}
        actions={actions}
      />
    </div>
  );
} 
