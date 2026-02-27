import type { FormEvent } from "react";
import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { Switch } from "@/components/Switch/Switch";
import DropdownSelect from "../../components/DropdownSelect/DropdownSelect";
import type { CustomerSearch } from "@/types/customer";
import type { DepartmentSearch } from "@/types/department";
import type { Device, DeviceConnectivity } from "@/types/device";
import formStyles from "../../components/DashboardForm/DashboardForm.module.css";
import autocompleteStyles from "../../components/DropdownSelect/DropdownSelect.module.css";

type Autocomplete<T> = {
  suggestions: T[];
  isFetching: boolean;
  showSuggestions: boolean;
  handleChange: (value: string) => void;
  handleFocus: () => void;
  handleBlur: () => void;
  handlePick: (option: T) => void;
};

type UserDevicesPageModalsProps = {
  modalState: {
    showEditModal: boolean;
    selectedDevice: Device | null;
    actionError: string | null;
    actionLoading: boolean;
  };
  editFlow: {
    editMachine: string;
    onEditMachineChange: (value: string) => void;
    onEditSubmit: (e: FormEvent) => void;
  };
  actions: {
    onCloseEdit: () => void;
  };
};

export function UserDevicesPageModals({
  modalState,
  editFlow,
  actions,
}: UserDevicesPageModalsProps) {
  const { showEditModal, selectedDevice, actionError, actionLoading } = modalState;
  const { editMachine, onEditMachineChange, onEditSubmit } = editFlow;
  const { onCloseEdit } = actions;
  return (
    <Modal isOpen={showEditModal} onClose={onCloseEdit} title="Edit Device">
      <form className={formStyles["dashboard-modal-form"]} onSubmit={onEditSubmit}>
        <Input
          id="edit-device-machine"
          label="Machine"
          placeholder="Enter machine name"
          value={editMachine}
          onChange={(e) => onEditMachineChange(e.target.value)}
        />
        {actionError && <p className={formStyles["dashboard-modal-error"]}>{actionError}</p>}
        <div className={formStyles["dashboard-modal-actions"]}>
          <Button onClick={onCloseEdit} type="button" variant="cancel" disabled={actionLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={actionLoading} disabled={!selectedDevice}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}

type DeviceAddForm = {
  customer_name: string;
  customer_id: number | null;
  department_name: string;
  department_id: number | null;
  uid: string;
  name: string;
  machine: string;
  data_interval: string;
};

type DeviceEditForm = {
  name: string;
  machine: string;
  connectivity: DeviceConnectivity;
  mobile_number: string;
  sim_id: string;
  data_interval: string;
  is_active: boolean;
};

type ConnectivityOption = { value: DeviceConnectivity; label: string };

type SuperuserDevicesPageModalsProps = {
  modalState: {
    showAddModal: boolean;
    showEditModal: boolean;
    showDeleteModal: boolean;
    selectedDevice: Device | null;
    actionError: string | null;
    actionLoading: boolean;
  };
  addFlow: {
    step: "customer" | "department" | "details";
    stepError: string | null;
    addForm: DeviceAddForm;
    editForm: DeviceEditForm;
    setAddForm: (updater: (prev: DeviceAddForm) => DeviceAddForm) => void;
    setEditForm: (updater: (prev: DeviceEditForm) => DeviceEditForm) => void;
    onAddSubmit: (e?: FormEvent) => void;
    onAddNextCustomer: () => void;
    onAddNextDepartment: () => void;
    onAddBack: () => void;
  };
  autocomplete: {
    customer: Autocomplete<CustomerSearch>;
    department: Autocomplete<DepartmentSearch>;
  };
  actions: {
    onCloseAdd: () => void;
    onCloseEdit: () => void;
    onCloseDelete: () => void;
    onEditSubmit: (e: FormEvent) => void;
    onDelete: () => void;
  };
  connectivityOptions: ConnectivityOption[];
};

export function SuperuserDevicesPageModals({
  modalState,
  addFlow,
  autocomplete,
  actions,
  connectivityOptions,
}: SuperuserDevicesPageModalsProps) {
  const {
    showAddModal,
    showEditModal,
    showDeleteModal,
    selectedDevice,
    actionError,
    actionLoading,
  } = modalState;
  const {
    step,
    stepError,
    addForm,
    editForm,
    setAddForm,
    setEditForm,
    onAddSubmit,
    onAddNextCustomer,
    onAddNextDepartment,
    onAddBack,
  } = addFlow;
  const { customer: customerAutocomplete, department: departmentAutocomplete } = autocomplete;
  const { onCloseAdd, onCloseEdit, onCloseDelete, onEditSubmit, onDelete } = actions;

  return (
    <>
      <Modal isOpen={showAddModal} onClose={onCloseAdd} title="Add Device">
        <form className={formStyles["dashboard-modal-form"]} onSubmit={onAddSubmit}>
          {step === "customer" ? (
            <>
              <div className={autocompleteStyles["dashboard-autocomplete"]}>
                <Input
                  id="add-device-customer"
                  label="Customer"
                  placeholder="Search customer by name"
                  value={addForm.customer_name}
                  onChange={(e) => customerAutocomplete.handleChange(e.target.value)}
                  autoComplete="off"
                  onFocus={customerAutocomplete.handleFocus}
                  onBlur={customerAutocomplete.handleBlur}
                  aria-autocomplete="list"
                  aria-expanded={customerAutocomplete.showSuggestions}
                  aria-controls="add-device-customer-list"
                />
                {customerAutocomplete.showSuggestions && (
                  <div
                    id="add-device-customer-list"
                    className={autocompleteStyles["dashboard-autocomplete-list"]}
                    role="listbox"
                  >
                    {customerAutocomplete.isFetching ? (
                      <div className={autocompleteStyles["dashboard-autocomplete-empty"]}>Searching...</div>
                    ) : customerAutocomplete.suggestions.length === 0 ? (
                      <div className={autocompleteStyles["dashboard-autocomplete-empty"]}>No matches</div>
                    ) : (
                      customerAutocomplete.suggestions.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          className={autocompleteStyles["dashboard-autocomplete-item"]}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            customerAutocomplete.handlePick(customer);
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
              {stepError && <p className={formStyles["dashboard-modal-error"]}>{stepError}</p>}
              <div className={formStyles["dashboard-modal-actions"]}>
                <Button onClick={onCloseAdd} type="button" variant="cancel" disabled={actionLoading}>
                  Cancel
                </Button>
                <Button type="button" onClick={onAddNextCustomer}>
                  Next
                </Button>
              </div>
            </>
          ) : step === "department" ? (
            <>
              <div className={autocompleteStyles["dashboard-autocomplete"]}>
                <Input
                  id="add-device-department"
                  label="Department"
                  placeholder="Search department by name"
                  value={addForm.department_name}
                  onChange={(e) => departmentAutocomplete.handleChange(e.target.value)}
                  autoComplete="off"
                  onFocus={departmentAutocomplete.handleFocus}
                  onBlur={departmentAutocomplete.handleBlur}
                  aria-autocomplete="list"
                  aria-expanded={departmentAutocomplete.showSuggestions}
                  aria-controls="add-device-department-list"
                />
                {departmentAutocomplete.showSuggestions && (
                  <div
                    id="add-device-department-list"
                    className={autocompleteStyles["dashboard-autocomplete-list"]}
                    role="listbox"
                  >
                    {departmentAutocomplete.isFetching ? (
                      <div className={autocompleteStyles["dashboard-autocomplete-empty"]}>Searching...</div>
                    ) : departmentAutocomplete.suggestions.length === 0 ? (
                      <div className={autocompleteStyles["dashboard-autocomplete-empty"]}>No matches</div>
                    ) : (
                      departmentAutocomplete.suggestions.map((department) => (
                        <button
                          key={department.id}
                          type="button"
                          className={autocompleteStyles["dashboard-autocomplete-item"]}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            departmentAutocomplete.handlePick(department);
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
              {stepError && <p className={formStyles["dashboard-modal-error"]}>{stepError}</p>}
              <div className={formStyles["dashboard-modal-actions"]}>
                <Button type="button" variant="cancel" onClick={onAddBack} disabled={actionLoading}>
                  Back
                </Button>
                <Button type="button" onClick={onAddNextDepartment}>
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
              {actionError && <p className={formStyles["dashboard-modal-error"]}>{actionError}</p>}
              <div className={formStyles["dashboard-modal-actions"]}>
                <Button type="button" variant="cancel" onClick={onAddBack} disabled={actionLoading}>
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

      <Modal isOpen={showEditModal} onClose={onCloseEdit} title="Edit Device">
        <form className={formStyles["dashboard-modal-form"]} onSubmit={onEditSubmit}>
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
          <DropdownSelect
            id="edit-device-connectivity"
            label="Connectivity"
            value={editForm.connectivity}
            options={connectivityOptions}
            onChange={(value) =>
              setEditForm((prev) => ({
                ...prev,
                connectivity: value,
                ...(value === "cellular" ? {} : { mobile_number: "", sim_id: "" }),
              }))
            }
          />
          {editForm.connectivity === "cellular" && (
            <div className={formStyles["dashboard-readonly-group"]}>
              <div className={formStyles["dashboard-readonly-item"]}>
                <span className={formStyles["dashboard-readonly-label"]}>Mobile Number</span>
                <span
                  className={`${formStyles["dashboard-readonly-value"]} ${
                    editForm.mobile_number?.trim() ? "" : formStyles["dashboard-readonly-muted"]
                  }`}
                >
                  {editForm.mobile_number?.trim() || "Waiting for device response..."}
                </span>
              </div>
              <div className={formStyles["dashboard-readonly-item"]}>
                <span className={formStyles["dashboard-readonly-label"]}>SIM ID</span>
                <span
                  className={`${formStyles["dashboard-readonly-value"]} ${
                    editForm.sim_id?.trim() ? "" : formStyles["dashboard-readonly-muted"]
                  }`}
                >
                  {editForm.sim_id?.trim() || "Waiting for device response..."}
                </span>
              </div>
            </div>
          )}
          <div className={formStyles["dashboard-checkbox-row"]}>
            <Switch
              checked={editForm.is_active}
              onChange={(v) => setEditForm((prev) => ({ ...prev, is_active: v }))}
              label="Active"
            />
          </div>
          {actionError && <p className={formStyles["dashboard-modal-error"]}>{actionError}</p>}
          <div className={formStyles["dashboard-modal-actions"]}>
            <Button onClick={onCloseEdit} type="button" variant="cancel" disabled={actionLoading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={actionLoading} disabled={!selectedDevice}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showDeleteModal} onClose={onCloseDelete} title="Delete Device">
        <div className={formStyles["dashboard-modal-form"]}>
          <p>
            Are you sure you want to delete{" "}
            <strong>{selectedDevice?.name || "this device"}</strong>? This action cannot be undone.
          </p>
          {actionError && <p className={formStyles["dashboard-modal-error"]}>{actionError}</p>}
          <div className={formStyles["dashboard-modal-actions"]}>
            <Button onClick={onCloseDelete} type="button" variant="cancel" disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={onDelete}
              type="button"
              variant="danger"
              isLoading={actionLoading}
              disabled={!selectedDevice}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
