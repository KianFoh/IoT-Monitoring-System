import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "../../components/DataTable/DataTable";
import Pagination from "../../components/Pagination/Pagination";
import SearchFilter from "../../components/SearchFilter/SearchFilter";
import { Button } from "@/components/Button/Button";
import { Modal } from "@/components/Modal/Modal";
import PageSizeSelect from "../../components/PageSizeSelect/PageSizeSelect";
import { FaFilter, FaPlus } from "react-icons/fa";
import styles from "./DevicesPage.module.css";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useDevicesTable } from "./hooks/useDevicesTable";
import { useDeviceActions } from "./hooks/useDeviceActions";
import { useDeviceColumns } from "./hooks/useDeviceColumns";
import { useUserDeviceColumns } from "./hooks/useUserDeviceColumns";
import { useSearchAutocomplete } from "../../hooks/useSearchAutocomplete";
import { UserDevicesPageModals, SuperuserDevicesPageModals } from "./DevicesPageModals";
import { customersApi } from "../../api/customersApi";
import { departmentsApi } from "../../api/departmentsApi";
import { distributorsApi } from "../../api/distributorsApi";
import { devicesApi } from "../../api/devicesApi";
import type { Customer, CustomerSearch } from "@/types/customer";
import type { Department, DepartmentSearch } from "@/types/department";
import type { Device, DeviceConnectivity } from "@/types/device";
import type { Distributor } from "@/types/distributor";

const CONNECTIVITY_OPTIONS: Array<{ value: DeviceConnectivity; label: string }> = [
  { value: "wifi", label: "Wi-Fi" },
  { value: "cellular", label: "Cellular" },
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

const toggleId = (ids: number[], id: number) =>
  ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];

const sortByName = <T extends { name: string }>(items: T[]) =>
  [...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

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
        columns={columns}        emptyMessage={loading ? "Loading devices..." : "No devices found"}
      />

      <div className={styles["dashboard-pagination-row"]}>
        <div className={styles["dashboard-page-size-left"]}>
          <PageSizeSelect value={pageSize} onChange={(n) => { setPageSize(n); setCurrentPage(1); }} />
        </div>
        <div className={styles["dashboard-pagination-right"]}>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => setCurrentPage(p)} maxPagesToShow={5} />
        </div>
      </div>

      <UserDevicesPageModals
        modalState={{ showEditModal, selectedDevice, actionError, actionLoading }}
        editFlow={{ editMachine, onEditMachineChange: setEditMachine, onEditSubmit: handleEditSubmit }}
        actions={{ onCloseEdit: closeEditModal }}
      />
    </div>
  );
}

function SuperuserDevicesPage() {
  const navigate = useNavigate();
  const {
    query,
    setQuery,
    filters,
    setFilters,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    devices,
    totalPages,
    loading,
    error,
  } = useDevicesTable(5);

  const deviceActions = useDeviceActions();
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
  } = deviceActions;

  const handleViewDashboard = useCallback(
    (device: Device) => {
      navigate(`/dashboard/devices/${device.uid}`);
    },
    [navigate]
  );
  const columns = useDeviceColumns(
    deviceActions.openEditModal,
    deviceActions.openDeleteModal,
    handleViewDashboard
  );

  const [showFilterOverlay, setShowFilterOverlay] = useState(false);

  const { data: distributorData } = useQuery({
    queryKey: ["devices", "filters", "distributors"],
    queryFn: () => distributorsApi.list({ page: 1, page_size: 100 }),
  });

  const { data: customerData } = useQuery({
    queryKey: ["devices", "filters", "customers"],
    queryFn: () => customersApi.list({ page: 1, page_size: 100 }),
  });

  const { data: departmentData } = useQuery({
    queryKey: ["devices", "filters", "departments"],
    queryFn: () => departmentsApi.list({ page: 1, page_size: 100 }),
  });

  const distributors: Distributor[] = useMemo(() => sortByName(distributorData?.items ?? []), [distributorData]);
  const customers: Customer[] = useMemo(() => sortByName(customerData?.items ?? []), [customerData]);
  const departments: Department[] = useMemo(() => sortByName(departmentData?.items ?? []), [departmentData]);

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

  const clearDeviceFilters = () => {
    setFilters({
      distributorIds: [],
      customerIds: [],
      departmentIds: [],
    });
  };

  const [addStep, setAddStep] = useState<"customer" | "department" | "details">("customer");
  const [addStepError, setAddStepError] = useState<string | null>(null);
  const customerAutocomplete = useSearchAutocomplete<CustomerSearch>({
    value: addForm.customer_name,
    id: addForm.customer_id,
    setValue: (value) => setAddForm((prev) => ({ ...prev, customer_name: value })),
    setId: (id) => setAddForm((prev) => ({ ...prev, customer_id: id })),
    active: showAddModal && addStep === "customer",
    queryKeyBase: ["customers", "search"],
    searchFn: (query) => customersApi.search({ name: query }),
    resolveId: findCustomerId,
    onInputChange: (_value, nextId, prevId) => {
      setAddStepError(null);
      if (prevId !== nextId) {
        setAddForm((prev) => ({
          ...prev,
          department_name: "",
          department_id: null,
        }));
      }
    },
  });

  const departmentAutocomplete = useSearchAutocomplete<DepartmentSearch>({
    value: addForm.department_name,
    id: addForm.department_id,
    setValue: (value) => setAddForm((prev) => ({ ...prev, department_name: value })),
    setId: (id) => setAddForm((prev) => ({ ...prev, department_id: id })),
    active: showAddModal && addStep === "department",
    queryKeyBase: ["departments", "search", addForm.customer_id ?? null],
    searchFn: (query) =>
      departmentsApi.search({
        name: query,
        customer_id: addForm.customer_id ?? undefined,
      }),
    resolveId: findDepartmentId,
    enabled: !!addForm.customer_id,
    onInputChange: () => setAddStepError(null),
  });

  useEffect(() => {
    setAddStep("customer");
    setAddStepError(null);
  }, [showAddModal]);

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

  // Stepper: customer -> department -> details
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
    deviceActions.handleAddSubmit(e);
  };

  return (
    <div className={styles["devices-container"]}>
      <h1>Devices</h1>
      <p>Manage and monitor your IoT devices</p>

      <div className={styles["dashboard-devices-topbar"]}>
        <div className={styles["dashboard-search-and-action"]}>
          <div className={styles["dashboard-search-filter-group"]}>
            <div className={styles["dashboard-search-wrapper"]}>
              <SearchFilter
                value={query}
                onChange={(v) => setQuery(v)}
                placeholder="Search devices by UID, device name or customer name..."
              />
            </div>

            <div className={styles["dashboard-filter-container"]}>
              <button
                type="button"
                className={styles["dashboard-filter-button"]}
                onClick={() => setShowFilterOverlay(true)}
                aria-label="Filter devices"
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
              onClick={deviceActions.openAddModal}
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
      <SuperuserDevicesPageModals
        modalState={{
          showAddModal,
          showEditModal,
          showDeleteModal,
          selectedDevice,
          actionError,
          actionLoading,
        }}
        addFlow={{
          step: addStep,
          stepError: addStepError,
          addForm,
          editForm,
          setAddForm,
          setEditForm,
          onAddSubmit: handleAddFormSubmit,
          onAddNextCustomer: handleCustomerNext,
          onAddNextDepartment: handleDepartmentNext,
          onAddBack: handleAddBack,
        }}
        autocomplete={{
          customer: customerAutocomplete,
          department: departmentAutocomplete,
        }}
        actions={{
          onCloseAdd: deviceActions.closeAddModal,
          onCloseEdit: deviceActions.closeEditModal,
          onCloseDelete: deviceActions.closeDeleteModal,
          onEditSubmit: deviceActions.handleEditSubmit,
          onDelete: deviceActions.handleDelete,
        }}
        connectivityOptions={CONNECTIVITY_OPTIONS}
      />

      <Modal
        isOpen={showFilterOverlay}
        onClose={() => setShowFilterOverlay(false)}
        title="Filter devices"
        className={styles["dashboard-filter-modal"]}
        footer={
          <div className={styles["dashboard-filter-footer"]}>
            <button
              type="button"
              className={styles["dashboard-filter-clear"]}
              onClick={clearDeviceFilters}
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
          <FilterGroup
            title="Department"
            items={visibleDepartments}
            selectedIds={filters.departmentIds}
            onToggle={handleDepartmentFilterChange}
            emptyMessage="No departments found"
          />
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
