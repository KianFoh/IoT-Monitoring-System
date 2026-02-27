import type { FormEvent } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { Switch } from "@/components/Switch/Switch";
import type { CustomerSearch } from "@/types/customer";
import type { MqttUser } from "@/types/mqttUser";
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

type MqttUserAddForm = {
  username: string;
  password: string;
  customer_name: string;
  customer_id: number | null;
};

type MqttUserEditForm = {
  username: string;
  password: string;
  is_active: boolean;
};

type MqttUserPageModalsProps = {
  modalState: {
    showAddModal: boolean;
    showEditModal: boolean;
    showDeleteModal: boolean;
    selectedUser: MqttUser | null;
    actionError: string | null;
    actionLoading: boolean;
  };
  addFlow: {
    step: "customer" | "credentials";
    stepError: string | null;
    addForm: MqttUserAddForm;
    setAddForm: (updater: (prev: MqttUserAddForm) => MqttUserAddForm) => void;
    showPassword: boolean;
  };
  editFlow: {
    editForm: MqttUserEditForm;
    setEditForm: (updater: (prev: MqttUserEditForm) => MqttUserEditForm) => void;
    showPassword: boolean;
    passwordLoading: boolean;
    passwordError: string | null;
  };
  customerAutocomplete: CustomerAutocomplete;
  actions: {
    onCloseAdd: () => void;
    onCloseEdit: () => void;
    onCloseDelete: () => void;
    onAddSubmit: (e: FormEvent) => void;
    onAddNext: () => void;
    onAddBack: () => void;
    onEditSubmit: (e: FormEvent) => void;
    onDelete: () => void;
    onToggleAddPassword: () => void;
    onToggleEditPassword: () => void;
  };
};

export function MqttUserPageModals({
  modalState,
  addFlow,
  editFlow,
  customerAutocomplete,
  actions,
}: MqttUserPageModalsProps) {
  const {
    showAddModal,
    showEditModal,
    showDeleteModal,
    selectedUser,
    actionError,
    actionLoading,
  } = modalState;
  const { step, stepError, addForm, setAddForm, showPassword: showAddPassword } = addFlow;
  const {
    editForm,
    setEditForm,
    showPassword: showEditPassword,
    passwordLoading,
    passwordError,
  } = editFlow;
  const {
    onCloseAdd,
    onCloseEdit,
    onCloseDelete,
    onAddSubmit,
    onAddNext,
    onAddBack,
    onEditSubmit,
    onDelete,
    onToggleAddPassword,
    onToggleEditPassword,
  } = actions;

  return (
    <>
      <Modal isOpen={showAddModal} onClose={onCloseAdd} title="Add MQTT User">
        <form className={formStyles["dashboard-modal-form"]} onSubmit={onAddSubmit}>
          {step === "customer" ? (
            <>
              <div className={autocompleteStyles["dashboard-autocomplete"]}>
                <Input
                  id="add-mqtt-customer"
                  label="Customer"
                  placeholder="Search customer by name"
                  value={addForm.customer_name}
                  onChange={(e) => customerAutocomplete.handleChange(e.target.value)}
                  autoComplete="off"
                  onFocus={customerAutocomplete.handleFocus}
                  onBlur={customerAutocomplete.handleBlur}
                  aria-autocomplete="list"
                  aria-expanded={customerAutocomplete.showSuggestions}
                  aria-controls="add-mqtt-customer-list"
                />
                {customerAutocomplete.showSuggestions && (
                  <div
                    id="add-mqtt-customer-list"
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
                <Button type="button" onClick={onAddNext}>
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
                onRightIconClick={onToggleAddPassword}
                value={addForm.password}
                autoComplete="new-password"
                onChange={(e) => setAddForm((prev) => ({ ...prev, password: e.target.value }))}
              />
              {actionError && <p className={formStyles["dashboard-modal-error"]}>{actionError}</p>}
              <div className={formStyles["dashboard-modal-actions"]}>
                <Button type="button" variant="cancel" onClick={onAddBack} disabled={actionLoading}>
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

      <Modal isOpen={showEditModal} onClose={onCloseEdit} title="Edit MQTT User">
        <form className={formStyles["dashboard-modal-form"]} onSubmit={onEditSubmit}>
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
            placeholder={passwordLoading ? "Loading password..." : "Enter new password"}
            type={showEditPassword ? "text" : "password"}
            rightIcon={showEditPassword ? FaEyeSlash : FaEye}
            rightIconLabel={showEditPassword ? "Hide password" : "Show password"}
            onRightIconClick={onToggleEditPassword}
            value={editForm.password}
            autoComplete="new-password"
            disabled={passwordLoading}
            onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
          />
          {passwordError && <p className={formStyles["dashboard-modal-error"]}>{passwordError}</p>}
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
            <Button type="submit" isLoading={actionLoading} disabled={!selectedUser}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showDeleteModal} onClose={onCloseDelete} title="Delete MQTT User">
        <div className={formStyles["dashboard-modal-form"]}>
          <p>
            Are you sure you want to delete{" "}
            <strong>{selectedUser?.username || "this user"}</strong>? This action cannot be undone.
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
              disabled={!selectedUser}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
