import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { FaPlus, FaEye, FaEyeSlash } from "react-icons/fa";
import { DataTable } from "../components/DataTable";
import Pagination from "../components/Pagination";
import SearchFilter from "../components/SearchFilter";
import PageSizeSelect from "../components/PageSizeSelect";
import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { Switch } from "@/components/Switch/Switch";
import { useMqttUsersTable } from "../hooks/useMqttUsersTable";
import { useMqttUserActions } from "../hooks/useMqttUserActions";
import { useMqttUserColumns } from "../hooks/useMqttUserColumns";
import { customersApi } from "../api/customersApi";
import { mqttUsersApi } from "../api/mqttUsersApi";
import type { CustomerSearch } from "@/types/customer";
import styles from "../styles/dashboard.module.css";

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

  const [customerQuery, setCustomerQuery] = useState("");
  const [debouncedCustomerQuery, setDebouncedCustomerQuery] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  useEffect(() => {
    if (!showAddModal) {
      setShowAddPassword(false);
    } else {
      setAddStep("customer");
      setAddStepError(null);
    }
  }, [showAddModal]);

  useEffect(() => {
    if (!showEditModal) {
      setShowEditPassword(false);
      setEditPasswordLoading(false);
      setPasswordFetchError(null);
      setOriginalPassword(null);
    }
  }, [setOriginalPassword, showEditModal]);

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
    if (!showAddModal) {
      setCustomerQuery("");
      setCustomerDropdownOpen(false);
    }
  }, [showAddModal]);

  const handleCustomerNameChange = (value: string) => {
    setCustomerQuery(value);
    setCustomerDropdownOpen(true);
    setAddStepError(null);
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
  const showAddSuggestions = showAddModal && addStep === "customer" && customerDropdownOpen && hasCustomerQuery;

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
    setCustomerDropdownOpen(false);
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

  return (
    <div className={styles["devices-container"]}>
      <h1>MQTT Users</h1>
      <p>Manage MQTT broker users and credentials</p>

      <div className={styles["dashboard-devices-topbar"]}>
        <div className={styles["dashboard-search-and-action"]}>
          <div className={styles["dashboard-search-wrapper"]}>
            <SearchFilter
              value={query}
              onChange={(v) => setQuery(v)}
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
        columns={columns}
        tableClassName={styles["dashboard-table"]}
        emptyMessage={loading ? "Loading MQTT users..." : "No MQTT users found"}
      />

      <div className={styles["dashboard-pagination-row"]}>
        <div className={styles["dashboard-page-size-left"]}>
          <PageSizeSelect value={pageSize} onChange={(n) => { setPageSize(n); setCurrentPage(1); }} />
        </div>
        <div className={styles["dashboard-pagination-right"]}>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => setCurrentPage(p)} maxPagesToShow={5} />
        </div>
      </div>

      <Modal isOpen={showAddModal} onClose={closeAddModal} title="Add MQTT User">
        <form className={styles["dashboard-modal-form"]} onSubmit={handleAddFormSubmit}>
          {addStep === "customer" ? (
            <>
              <div className={styles["dashboard-autocomplete"]}>
                <Input
                  id="add-mqtt-customer"
                  label="Customer"
                  placeholder="Search customer by name"
                  value={addForm.customer_name}
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                  autoComplete="off"
                  onFocus={handleCustomerFocus}
                  onBlur={handleCustomerBlur}
                  aria-autocomplete="list"
                  aria-expanded={showAddSuggestions}
                  aria-controls="add-mqtt-customer-list"
                />
                {showAddSuggestions && (
                  <div
                    id="add-mqtt-customer-list"
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
              {addStepError && <p className={styles["dashboard-modal-error"]}>{addStepError}</p>}
              <div className={styles["dashboard-modal-actions"]}>
                <Button onClick={closeAddModal} type="button" variant="cancel" disabled={actionLoading}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleAddNext}>
                  Next
                </Button>
              </div>
            </>
          ) : (
            <>
              <Input
                id="add-mqtt-username"
                label="Username"
                placeholder="Enter MQTT username"
                value={addForm.username}
                onChange={(e) => setAddForm((prev) => ({ ...prev, username: e.target.value }))}
              />
              <Input
                id="add-mqtt-password"
                label="Password"
                placeholder="Enter password"
                type={showAddPassword ? "text" : "password"}
                rightIcon={showAddPassword ? FaEyeSlash : FaEye}
                rightIconLabel={showAddPassword ? "Hide password" : "Show password"}
                onRightIconClick={() => setShowAddPassword((prev) => !prev)}
                value={addForm.password}
                autoComplete="new-password"
                onChange={(e) => setAddForm((prev) => ({ ...prev, password: e.target.value }))}
              />
              {actionError && <p className={styles["dashboard-modal-error"]}>{actionError}</p>}
              <div className={styles["dashboard-modal-actions"]}>
                <Button type="button" variant="cancel" onClick={handleAddBack} disabled={actionLoading}>
                  Back
                </Button>
                <Button type="submit" isLoading={actionLoading}>
                  Create MQTT User
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>

      <Modal isOpen={showEditModal} onClose={closeEditModal} title="Edit MQTT User">
        <form className={styles["dashboard-modal-form"]} onSubmit={handleEditSubmit}>
          <Input
            id="edit-mqtt-username"
            label="Username"
            placeholder="Update username"
            value={editForm.username}
            onChange={(e) => setEditForm((prev) => ({ ...prev, username: e.target.value }))}
          />
          <Input
            id="edit-mqtt-password"
            label="Password"
            placeholder={editPasswordLoading ? "Loading password..." : "Enter new password"}
            type={showEditPassword ? "text" : "password"}
            rightIcon={showEditPassword ? FaEyeSlash : FaEye}
            rightIconLabel={showEditPassword ? "Hide password" : "Show password"}
            onRightIconClick={() => setShowEditPassword((prev) => !prev)}
            value={editForm.password}
            autoComplete="new-password"
            disabled={editPasswordLoading}
            onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
          />
          {passwordFetchError && <p className={styles["dashboard-modal-error"]}>{passwordFetchError}</p>}
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
            <Button type="submit" isLoading={actionLoading} disabled={!selectedUser}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showDeleteModal} onClose={closeDeleteModal} title="Delete MQTT User">
        <div className={styles["dashboard-modal-form"]}>
          <p>Are you sure you want to delete <strong>{selectedUser?.username || "this user"}</strong>? This action cannot be undone.</p>
          {actionError && <p className={styles["dashboard-modal-error"]}>{actionError}</p>}
          <div className={styles["dashboard-modal-actions"]}>
            <Button onClick={closeDeleteModal} type="button" variant="cancel" disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleDelete} type="button" variant="danger" isLoading={actionLoading} disabled={!selectedUser}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
} 