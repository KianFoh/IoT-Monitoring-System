import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { Switch } from "@/components/Switch/Switch";
import type { CustomerSearch } from "@/types/customer";
import type { Department } from "@/types/department";
import formStyles from "../../components/DashboardForm/DashboardForm.module.css";
import autocompleteStyles from "../../components/DropdownSelect/DropdownSelect.module.css";

type CustomerAutocomplete = {
  suggestions: CustomerSearch[];
  isFetching: boolean;
  showSuggestions: boolean;
  handleChange: (value: string) => void;
  handleFocus: () => void;
  handleBlur: () => void;
  handlePick: (customer: CustomerSearch) => void;
};

type DepartmentFormState = {
  name: string;
  mqtt_topic: string;
  customer_name: string;
  customer_id: number | null;
};

type DepartmentEditFormState = {
  name: string;
  mqtt_topic: string;
  is_active: boolean;
};

type DepartmentPageModalsProps = {
  modalState: {
    showAddModal: boolean;
    showEditModal: boolean;
    showDeleteModal: boolean;
    selectedDepartment: Department | null;
    deleteDisabled: boolean;
    actionError: string | null;
    actionLoading: boolean;
  };
  addFlow: {
    addForm: DepartmentFormState;
    setAddForm: Dispatch<SetStateAction<DepartmentFormState>>;
    onAddSubmit: (e: FormEvent) => void;
  };
  editFlow: {
    editForm: DepartmentEditFormState;
    setEditForm: Dispatch<SetStateAction<DepartmentEditFormState>>;
    onEditSubmit: (e: FormEvent) => void;
  };
  autocomplete: {
    customer: CustomerAutocomplete;
  };
  actions: {
    onCloseAdd: () => void;
    onCloseEdit: () => void;
    onCloseDelete: () => void;
    onDelete: () => void;
  };
};

export function DepartmentPageModals({
  modalState,
  addFlow,
  editFlow,
  autocomplete,
  actions,
}: DepartmentPageModalsProps) {
  const {
    showAddModal,
    showEditModal,
    showDeleteModal,
    selectedDepartment,
    deleteDisabled,
    actionError,
    actionLoading,
  } = modalState;
  const { addForm, setAddForm, onAddSubmit } = addFlow;
  const { editForm, setEditForm, onEditSubmit } = editFlow;
  const { customer: customerAutocomplete } = autocomplete;
  const { onCloseAdd, onCloseEdit, onCloseDelete, onDelete } = actions;

  return (
    <>
      <Modal isOpen={showAddModal} onClose={onCloseAdd} title="Add Department">
        <form className={formStyles["dashboard-modal-form"]} onSubmit={onAddSubmit}>
          <Input
            id="add-department-name"
            label="Department Name"
            placeholder="Enter department name"
            value={addForm.name}
            onChange={(e) =>
              setAddForm((prev) => ({
                ...prev,
                name: e.target.value,
                mqtt_topic: prev.mqtt_topic.trim() ? prev.mqtt_topic : e.target.value,
              }))
            }
          />
          <Input
            id="add-department-mqtt-topic"
            label="MQTT Topic"
            placeholder="Enter MQTT topic"
            value={addForm.mqtt_topic}
            onChange={(e) => setAddForm((prev) => ({ ...prev, mqtt_topic: e.target.value }))}
          />
          <div className={autocompleteStyles["dashboard-autocomplete"]}>
            <Input
              id="add-department-customer"
              label="Customer"
              placeholder="Search customer by name"
              value={addForm.customer_name}
              onChange={(e) => customerAutocomplete.handleChange(e.target.value)}
              autoComplete="off"
              onFocus={customerAutocomplete.handleFocus}
              onBlur={customerAutocomplete.handleBlur}
              aria-autocomplete="list"
              aria-expanded={customerAutocomplete.showSuggestions}
              aria-controls="add-department-customer-list"
            />
            {customerAutocomplete.showSuggestions && (
              <div
                id="add-department-customer-list"
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
          {actionError && <p className={formStyles["dashboard-modal-error"]}>{actionError}</p>}
          <div className={formStyles["dashboard-modal-actions"]}>
            <Button onClick={onCloseAdd} type="button" variant="cancel" disabled={actionLoading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={actionLoading}>
              Create Department
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showEditModal} onClose={onCloseEdit} title="Edit Department">
        <form className={formStyles["dashboard-modal-form"]} onSubmit={onEditSubmit}>
          <Input
            id="edit-department-name"
            label="Department Name"
            placeholder="Update department name"
            value={editForm.name}
            onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            id="edit-department-mqtt-topic"
            label="MQTT Topic"
            placeholder="Update MQTT topic"
            value={editForm.mqtt_topic}
            onChange={(e) => setEditForm((prev) => ({ ...prev, mqtt_topic: e.target.value }))}
          />
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
            <Button type="submit" isLoading={actionLoading} disabled={!selectedDepartment}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showDeleteModal} onClose={onCloseDelete} title="Delete Department">
        <div className={formStyles["dashboard-modal-form"]}>
          <p>
            Are you sure you want to delete{" "}
            <strong>{selectedDepartment?.name || "this department"}</strong>? This action cannot be undone.
          </p>
          {deleteDisabled && (
            <p className={formStyles["dashboard-modal-error"]}>Department is referenced by other records.</p>
          )}
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
              disabled={!selectedDepartment || deleteDisabled}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
