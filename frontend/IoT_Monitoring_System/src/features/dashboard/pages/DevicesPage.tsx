import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "../components/DataTable";
import Pagination from "../components/Pagination";
import SearchFilter from "../components/SearchFilter";
import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import PageSizeSelect from "../components/PageSizeSelect";
import { FaPlus } from "react-icons/fa";
import styles from "../styles/dashboard.module.css";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useDevicesTable } from "../hooks/useDevicesTable";
import { useDeviceActions } from "../hooks/useDeviceActions";
import { useDeviceColumns } from "../hooks/useDeviceColumns";
import { useUserDeviceColumns } from "../hooks/useUserDeviceColumns";
import { Switch } from "@/components/Switch/Switch";
import { customersApi } from "../api/customersApi";
import { departmentsApi } from "../api/departmentsApi";
import { devicesApi } from "../api/devicesApi";
import type { CustomerSearch } from "@/types/customer";
import type { DepartmentSearch } from "@/types/department";
import type { Device } from "@/types/device";

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

function UserDevicesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    query,
    setQuery,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    devices,
    totalPages,
    loading,
    error,
  } = useDevicesTable(5);

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [editMachine, setEditMachine] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const openEditModal = useCallback((device: Device) => {
    setSelectedDevice(device);
    setEditMachine(device.machine ?? "");
    setActionError(null);
    setShowEditModal(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setShowEditModal(false);
    setSelectedDevice(null);
    setEditMachine("");
    setActionError(null);
  }, []);

  const handleEditSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!selectedDevice) return;
      setActionLoading(true);
      setActionError(null);
      try {
        const machine = editMachine.trim();
        await devicesApi.update(selectedDevice.id, { machine: machine.length ? machine : null });
        queryClient.invalidateQueries({ queryKey: ["devices", "list"] });
        closeEditModal();
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : "Failed to update device");
      } finally {
        setActionLoading(false);
      }
    },
    [selectedDevice, editMachine, queryClient, closeEditModal]
  );

  const handleViewDashboard = useCallback(
    (device: Device) => {
      navigate(`/dashboard/devices/${device.uid}`);
    },
    [navigate]
  );

  const columns = useUserDeviceColumns(openEditModal, handleViewDashboard);

  return (
    <div className={styles["devices-container"]}>
      <h1>Devices</h1>
      <p>Manage and monitor your IoT devices</p>

      <div className={styles["dashboard-devices-topbar"]}>
        <div className={styles["dashboard-search-and-action"]}>
          <div className={styles["dashboard-search-wrapper"]}>
            <SearchFilter
              value={query}
              onChange={(v) => setQuery(v)}
              placeholder="Search devices by UID, device name or machine name..."
            />
          </div>
        </div>
      </div>

      {error && <p>{error}</p>}
      <DataTable
        data={devices}
        columns={columns}
        tableClassName={styles["dashboard-table"]}
        emptyMessage={loading ? "Loading devices..." : "No devices found"}
      />

      <div className={styles["dashboard-pagination-row"]}>
        <div className={styles["dashboard-page-size-left"]}>
          <PageSizeSelect value={pageSize} onChange={(n) => { setPageSize(n); setCurrentPage(1); }} />
        </div>
        <div className={styles["dashboard-pagination-right"]}>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => setCurrentPage(p)} maxPagesToShow={5} />
        </div>
      </div>

      <Modal isOpen={showEditModal} onClose={closeEditModal} title="Edit Device">
        <form className={styles["dashboard-modal-form"]} onSubmit={handleEditSubmit}>
          <Input
            id="edit-device-machine"
            label="Machine"
            placeholder="Enter machine name"
            value={editMachine}
            onChange={(e) => setEditMachine(e.target.value)}
          />
          {actionError && <p className={styles["dashboard-modal-error"]}>{actionError}</p>}
          <div className={styles["dashboard-modal-actions"]}>
            <Button onClick={closeEditModal} type="button" variant="cancel" disabled={actionLoading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={actionLoading} disabled={!selectedDevice}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function SuperuserDevicesPage() {
  const navigate = useNavigate();
  const {
    query,
    setQuery,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    devices,
    totalPages,
    loading,
    error,
  } = useDevicesTable(5);

  const {
    showAddModal,
    showEditModal,
    showDeleteModal,
    selectedDevice,
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
  } = useDeviceActions();

  const handleViewDashboard = (device: Device) => {
    navigate(`/dashboard/devices/${device.uid}`);
  };
  const columns = useDeviceColumns(openEditModal, openDeleteModal, handleViewDashboard);

  const [addStep, setAddStep] = useState<"customer" | "department" | "details">("customer");
  const [addStepError, setAddStepError] = useState<string | null>(null);

  const [customerQuery, setCustomerQuery] = useState("");
  const [debouncedCustomerQuery, setDebouncedCustomerQuery] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  const [departmentQuery, setDepartmentQuery] = useState("");
  const [debouncedDepartmentQuery, setDebouncedDepartmentQuery] = useState("");
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);

  useEffect(() => {
    if (!showAddModal) {
      setAddStep("customer");
      setAddStepError(null);
      setCustomerQuery("");
      setDepartmentQuery("");
      setCustomerDropdownOpen(false);
      setDepartmentDropdownOpen(false);
    } else {
      setAddStep("customer");
      setAddStepError(null);
    }
  }, [showAddModal]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCustomerQuery(customerQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDepartmentQuery(departmentQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [departmentQuery]);

  const { data: customerSuggestions = [], isFetching: isCustomerFetching } = useQuery<CustomerSearch[]>({
    queryKey: ["customers", "search", debouncedCustomerQuery],
    queryFn: () => customersApi.search({ name: debouncedCustomerQuery }),
    enabled: !!debouncedCustomerQuery.trim(),
    placeholderData: (prev) => prev ?? [],
  });

  const { data: departmentSuggestions = [], isFetching: isDepartmentFetching } = useQuery<DepartmentSearch[]>({
    queryKey: ["departments", "search", debouncedDepartmentQuery, addForm.customer_id],
    queryFn: () =>
      departmentsApi.search({
        name: debouncedDepartmentQuery,
        customer_id: addForm.customer_id ?? undefined,
      }),
    enabled: !!debouncedDepartmentQuery.trim() && !!addForm.customer_id,
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
    const name = addForm.department_name;
    const trimmedName = name.trim();
    const department_id = findDepartmentId(name, departmentSuggestions);
    if (!trimmedName) {
      setAddForm((prev) => (prev.department_id === null ? prev : { ...prev, department_id: null }));
      return;
    }
    if (department_id === null) return;
    setAddForm((prev) => (prev.department_id === department_id ? prev : { ...prev, department_id }));
  }, [addForm.department_name, departmentSuggestions, setAddForm]);

  const handleCustomerNameChange = (value: string) => {
    setCustomerQuery(value);
    setCustomerDropdownOpen(true);
    setAddStepError(null);
    const customer_id = findCustomerId(value, customerSuggestions);
    const resetDepartment = addForm.customer_id !== customer_id;
    if (resetDepartment) {
      setDepartmentQuery("");
      setDepartmentDropdownOpen(false);
    }
    setAddForm((prev) => ({
      ...prev,
      customer_name: value,
      customer_id,
      department_name: resetDepartment ? "" : prev.department_name,
      department_id: resetDepartment ? null : prev.department_id,
    }));
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

  const handleDepartmentNameChange = (value: string) => {
    setDepartmentQuery(value);
    setDepartmentDropdownOpen(true);
    setAddStepError(null);
    const department_id = findDepartmentId(value, departmentSuggestions);
    setAddForm((prev) => ({ ...prev, department_name: value, department_id }));
  };

  const handleDepartmentFocus = () => {
    setDepartmentQuery(addForm.department_name);
    setDepartmentDropdownOpen(true);
  };

  const handleDepartmentBlur = () => {
    setTimeout(() => setDepartmentDropdownOpen(false), 120);
  };

  const handleDepartmentPick = (department: DepartmentSearch) => {
    handleDepartmentNameChange(department.name);
    setDepartmentDropdownOpen(false);
  };

  const hasCustomerQuery = customerQuery.trim().length > 0;
  const showCustomerSuggestions = showAddModal && addStep === "customer" && customerDropdownOpen && hasCustomerQuery;

  const hasDepartmentQuery = departmentQuery.trim().length > 0;
  const showDepartmentSuggestions =
    showAddModal && addStep === "department" && departmentDropdownOpen && hasDepartmentQuery;

  const handleCustomerNext = () => {
    if (!addForm.customer_id) {
      setAddStepError("Invalid customer");
      return;
    }
    setAddStepError(null);
    setCustomerDropdownOpen(false);
    setAddStep("department");
  };

  const handleDepartmentNext = () => {
    if (!addForm.department_id) {
      setAddStepError("Invalid department");
      return;
    }
    setAddStepError(null);
    setDepartmentDropdownOpen(false);
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

  return (
    <div className={styles["devices-container"]}>
      <h1>Devices</h1>
      <p>Manage and monitor your IoT devices</p>

      <div className={styles["dashboard-devices-topbar"]}>
        <div className={styles["dashboard-search-and-action"]}>
          <div className={styles["dashboard-search-wrapper"]}>
            <SearchFilter
              value={query}
              onChange={(v) => setQuery(v)}
              placeholder="Search devices by UID, device name or customer name..."
            />
          </div>

          <div className={styles["dashboard-add-button-container"]}>
            <Button
              icon={FaPlus}
              className={styles["dashboard-add-button"]}
              onClick={openAddModal}
            >
              Add Device
            </Button>
          </div>
        </div>
      </div>
      {error && <p>{error}</p>}
      <DataTable
        data={devices}
        columns={columns}
        tableClassName={styles["dashboard-table"]}
        emptyMessage={loading ? "Loading devices..." : "No devices found"}
      />

      <div className={styles["dashboard-pagination-row"]}>
        <div className={styles["dashboard-page-size-left"]}>
          <PageSizeSelect value={pageSize} onChange={(n) => { setPageSize(n); setCurrentPage(1); }} />
        </div>
        <div className={styles["dashboard-pagination-right"]}>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => setCurrentPage(p)} maxPagesToShow={5} />
        </div>
      </div>


      <Modal isOpen={showAddModal} onClose={closeAddModal} title="Add Device">
        <form className={styles["dashboard-modal-form"]} onSubmit={handleAddFormSubmit}>
          {addStep === "customer" ? (
            <>
              <div className={styles["dashboard-autocomplete"]}>
                <Input
                  id="add-device-customer"
                  label="Customer"
                  placeholder="Search customer by name"
                  value={addForm.customer_name}
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                  autoComplete="off"
                  onFocus={handleCustomerFocus}
                  onBlur={handleCustomerBlur}
                  aria-autocomplete="list"
                  aria-expanded={showCustomerSuggestions}
                  aria-controls="add-device-customer-list"
                />
                {showCustomerSuggestions && (
                  <div
                    id="add-device-customer-list"
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
                <Button type="button" onClick={handleCustomerNext}>
                  Next
                </Button>
              </div>
            </>
          ) : addStep === "department" ? (
            <>
              <div className={styles["dashboard-autocomplete"]}>
                <Input
                  id="add-device-department"
                  label="Department"
                  placeholder="Search department by name"
                  value={addForm.department_name}
                  onChange={(e) => handleDepartmentNameChange(e.target.value)}
                  autoComplete="off"
                  onFocus={handleDepartmentFocus}
                  onBlur={handleDepartmentBlur}
                  aria-autocomplete="list"
                  aria-expanded={showDepartmentSuggestions}
                  aria-controls="add-device-department-list"
                />
                {showDepartmentSuggestions && (
                  <div
                    id="add-device-department-list"
                    className={styles["dashboard-autocomplete-list"]}
                    role="listbox"
                  >
                    {isDepartmentFetching ? (
                      <div className={styles["dashboard-autocomplete-empty"]}>Searching...</div>
                    ) : departmentSuggestions.length === 0 ? (
                      <div className={styles["dashboard-autocomplete-empty"]}>No matches</div>
                    ) : (
                      departmentSuggestions.map((department) => (
                        <button
                          key={department.id}
                          type="button"
                          className={styles["dashboard-autocomplete-item"]}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleDepartmentPick(department);
                          }}
                          role="option"
                        >
                          {department.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {addStepError && <p className={styles["dashboard-modal-error"]}>{addStepError}</p>}
              <div className={styles["dashboard-modal-actions"]}>
                <Button type="button" variant="cancel" onClick={handleAddBack} disabled={actionLoading}>
                  Back
                </Button>
                <Button type="button" onClick={handleDepartmentNext}>
                  Next
                </Button>
              </div>
            </>
          ) : (
            <>
              <Input
                id="add-device-uid"
                label="Device UID"
                placeholder="Enter unique device UID"
                value={addForm.uid}
                onChange={(e) => setAddForm((prev) => ({ ...prev, uid: e.target.value }))}
              />
              <Input
                id="add-device-name"
                label="Device Name"
                placeholder="Enter device name"
                value={addForm.name}
                onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <Input
                id="add-device-interval"
                label="Data Interval (Sec)"
                placeholder="Enter data interval in seconds"
                type="number"
                value={addForm.data_interval}
                onChange={(e) => setAddForm((prev) => ({ ...prev, data_interval: e.target.value }))}
              />
              <Input
                id="add-device-machine"
                label="Machine (optional)"
                placeholder="Enter machine name"
                value={addForm.machine}
                onChange={(e) => setAddForm((prev) => ({ ...prev, machine: e.target.value }))}
              />
              {actionError && <p className={styles["dashboard-modal-error"]}>{actionError}</p>}
              <div className={styles["dashboard-modal-actions"]}>
                <Button type="button" variant="cancel" onClick={handleAddBack} disabled={actionLoading}>
                  Back
                </Button>
                <Button type="submit" isLoading={actionLoading}>
                  Create Device
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>

      <Modal isOpen={showEditModal} onClose={closeEditModal} title="Edit Device">
        <form className={styles["dashboard-modal-form"]} onSubmit={handleEditSubmit}>
          <Input
            id="edit-device-name"
            label="Device Name"
            placeholder="Update device name"
            value={editForm.name}
            onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            id="edit-device-interval"
            label="Data Interval (Sec)"
            placeholder="Enter data interval in seconds"
            type="number"
            value={editForm.data_interval}
            onChange={(e) => setEditForm((prev) => ({ ...prev, data_interval: e.target.value }))}
          />
          <Input
            id="edit-device-machine"
            label="Machine (optional)"
            placeholder="Enter machine name"
            value={editForm.machine}
            onChange={(e) => setEditForm((prev) => ({ ...prev, machine: e.target.value }))}
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
            <Button type="submit" isLoading={actionLoading} disabled={!selectedDevice}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showDeleteModal} onClose={closeDeleteModal} title="Delete Device">
        <div className={styles["dashboard-modal-form"]}>
          <p>Are you sure you want to delete <strong>{selectedDevice?.name || "this device"}</strong>? This action cannot be undone.</p>
          {actionError && <p className={styles["dashboard-modal-error"]}>{actionError}</p>}
          <div className={styles["dashboard-modal-actions"]}>
            <Button onClick={closeDeleteModal} type="button" variant="cancel" disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleDelete} type="button" variant="danger" isLoading={actionLoading} disabled={!selectedDevice}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function DevicesPage() {
  const { user } = useAuth();
  if (user?.role === "user") {
    return <UserDevicesPage />;
  }
  return <SuperuserDevicesPage />;
}
