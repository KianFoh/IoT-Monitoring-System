import type { FormEvent } from "react";
import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { Switch } from "@/components/Switch/Switch";
import DropdownSelect from "../../components/DropdownSelect/DropdownSelect";
import type { CustomerSearch } from "@/types/customer";
import type { DepartmentSearch } from "@/types/department";
import type { User, UserRole } from "@/types/user";
import formStyles from "../../components/DashboardForm/DashboardForm.module.css";
import autocompleteStyles from "../../components/DropdownSelect/DropdownSelect.module.css";

type AutocompleteState<T extends { id: number; name: string }> = {
  suggestions: T[];
  isFetching: boolean;
  showSuggestions: boolean;
  handleChange: (value: string) => void;
  handleFocus: () => void;
  handleBlur: () => void;
  handlePick: (option: T) => void;
};

type UserAddForm = {
  customer_name: string;
  customer_id: number | null;
  department_name: string;
  department_id: number | null;
  email: string;
  role: UserRole;
};

type UserEditForm = {
  email: string;
  role: UserRole;
  is_verified: boolean;
  is_active: boolean;
};

type UsersPageModalsProps = {
  modalState: {
    showAddModal: boolean;
    showEditModal: boolean;
    showDeleteModal: boolean;
    selectedUser: User | null;
    actionError: string | null;
    actionLoading: boolean;
  };
  addFlow: {
    step: "customer" | "department" | "details";
    stepError: string | null;
    addForm: UserAddForm;
    setAddForm: (updater: (prev: UserAddForm) => UserAddForm) => void;
  };
  editFlow: {
    editForm: UserEditForm;
    setEditForm: (updater: (prev: UserEditForm) => UserEditForm) => void;
  };
  roleOptions: Array<{ value: UserRole; label: string }>;
  customerAutocomplete: AutocompleteState<CustomerSearch>;
  departmentAutocomplete: AutocompleteState<DepartmentSearch>;
  actions: {
    onCloseAdd: () => void;
    onCloseEdit: () => void;
    onCloseDelete: () => void;
    onAddSubmit: (event: FormEvent) => void;
    onCustomerNext: () => void;
    onDepartmentNext: () => void;
    onAddBack: () => void;
    onEditSubmit: (event: FormEvent) => void;
    onDelete: () => void;
  };
};

export function UsersPageModals({
  modalState,
  addFlow,
  editFlow,
  roleOptions,
  customerAutocomplete,
  departmentAutocomplete,
  actions,
}: UsersPageModalsProps) {
  const { showAddModal, showEditModal, showDeleteModal, selectedUser, actionError, actionLoading } =
    modalState;
  const { step, stepError, addForm, setAddForm } = addFlow;
  const { editForm, setEditForm } = editFlow;
  const {
    onCloseAdd,
    onCloseEdit,
    onCloseDelete,
    onAddSubmit,
    onCustomerNext,
    onDepartmentNext,
    onAddBack,
    onEditSubmit,
    onDelete,
  } = actions;

  return (
    <>
      <Modal isOpen={showAddModal} onClose={onCloseAdd} title="Add User">
        <form className={formStyles["dashboard-modal-form"]} onSubmit={onAddSubmit}>
          {step === "customer" ? (
            <>
              <div className={autocompleteStyles["dashboard-autocomplete"]}>
                <Input
                  id="add-user-customer"
                  label="Customer"
                  placeholder="Search customer by name"
                  value={addForm.customer_name}
                  onChange={(e) => customerAutocomplete.handleChange(e.target.value)}
                  autoComplete="off"
                  onFocus={customerAutocomplete.handleFocus}
                  onBlur={customerAutocomplete.handleBlur}
                  aria-autocomplete="list"
                  aria-expanded={customerAutocomplete.showSuggestions}
                  aria-controls="add-user-customer-list"
                />
                {customerAutocomplete.showSuggestions && (
                  <div
                    id="add-user-customer-list"
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
                <Button type="button" onClick={onCustomerNext}>
                  Next
                </Button>
              </div>
            </>
          ) : step === "department" ? (
            <>
              <div className={autocompleteStyles["dashboard-autocomplete"]}>
                <Input
                  id="add-user-department"
                  label="Department"
                  placeholder="Search department by name"
                  value={addForm.department_name}
                  onChange={(e) => departmentAutocomplete.handleChange(e.target.value)}
                  autoComplete="off"
                  onFocus={departmentAutocomplete.handleFocus}
                  onBlur={departmentAutocomplete.handleBlur}
                  aria-autocomplete="list"
                  aria-expanded={departmentAutocomplete.showSuggestions}
                  aria-controls="add-user-department-list"
                />
                {departmentAutocomplete.showSuggestions && (
                  <div
                    id="add-user-department-list"
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
                <Button type="button" onClick={onDepartmentNext}>
                  Next
                </Button>
              </div>
            </>
          ) : (
            <>
              <Input
                id="add-user-email"
                label="Email"
                placeholder="Enter user email"
                value={addForm.email}
                onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
              />
              <DropdownSelect
                id="add-user-role"
                label="Role"
                value={addForm.role}
                options={roleOptions}
                onChange={(value) => setAddForm((prev) => ({ ...prev, role: value }))}
              />
              {actionError && <p className={formStyles["dashboard-modal-error"]}>{actionError}</p>}
              <div className={formStyles["dashboard-modal-actions"]}>
                <Button type="button" variant="cancel" onClick={onAddBack} disabled={actionLoading}>
                  Back
                </Button>
                <Button type="submit" isLoading={actionLoading}>
                  Create User
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>

      <Modal isOpen={showEditModal} onClose={onCloseEdit} title="Edit User">
        <form className={formStyles["dashboard-modal-form"]} onSubmit={onEditSubmit}>
          <Input
            id="edit-user-email"
            label="Email"
            placeholder="Update user email"
            value={editForm.email}
            onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          <DropdownSelect
            id="edit-user-role"
            label="Role"
            value={editForm.role}
            options={roleOptions}
            onChange={(value) => setEditForm((prev) => ({ ...prev, role: value }))}
          />
          <div className={formStyles["dashboard-checkbox-row"]}>
            <Switch
              checked={editForm.is_verified}
              onChange={(v) => setEditForm((prev) => ({ ...prev, is_verified: v }))}
              label="Verified"
            />
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

      <Modal isOpen={showDeleteModal} onClose={onCloseDelete} title="Delete User">
        <div className={formStyles["dashboard-modal-form"]}>
          <p>
            Are you sure you want to delete <strong>{selectedUser?.email || "this user"}</strong>? This action cannot be undone.
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
