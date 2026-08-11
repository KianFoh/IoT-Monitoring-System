import type { FormEvent } from "react";
import { FaEye, FaEyeSlash, FaPlus, FaTrash } from "react-icons/fa";
import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { Switch } from "@/components/Switch/Switch";
import DropdownSelect from "../../components/DropdownSelect/DropdownSelect";
import type { CustomerSearch } from "@/types/customer";
import type { DepartmentSearch } from "@/types/department";
import type { User, UserRole } from "@/types/user";
import type { UserDepartmentAssignment } from "./hooks/useUserActions";
import formStyles from "../../components/DashboardForm/DashboardForm.module.css";
import pageStyles from "./UsersPage.module.css";
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

type UserModalView = "details" | "departments" | "department_customer" | "department_department";
type DepartmentOwner = "add" | "edit";

type UserAddForm = {
  customer_name: string;
  customer_id: number | null;
  department_name: string;
  department_id: number | null;
  departments: UserDepartmentAssignment[];
  email: string;
  role: UserRole;
};

type UserEditForm = {
  email: string;
  password: string;
  role: UserRole;
  is_verified: boolean;
  is_active: boolean;
  departments: UserDepartmentAssignment[];
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
    view: UserModalView;
    addForm: UserAddForm;
    setAddForm: (updater: (prev: UserAddForm) => UserAddForm) => void;
  };
  editFlow: {
    view: UserModalView;
    editForm: UserEditForm;
    setEditForm: (updater: (prev: UserEditForm) => UserEditForm) => void;
    showPassword: boolean;
  };
  departmentFlow: {
    owner: DepartmentOwner;
    draft: {
      customer_name: string;
      customer_id: number | null;
      department_name: string;
      department_id: number | null;
    };
    stepError: string | null;
    addDepartments: UserDepartmentAssignment[];
    editDepartments: UserDepartmentAssignment[];
  };
  roleOptions: Array<{ value: UserRole; label: string }>;
  customerAutocomplete: AutocompleteState<CustomerSearch>;
  departmentAutocomplete: AutocompleteState<DepartmentSearch>;
  actions: {
    onCloseAdd: () => void;
    onCloseEdit: () => void;
    onCloseDelete: () => void;
    onAddSubmit: (event: FormEvent) => void;
    onOpenDepartmentList: (owner: DepartmentOwner) => void;
    onOpenAddDepartment: (owner: DepartmentOwner) => void;
    onDepartmentCustomerNext: () => void;
    onAddDepartmentToUser: () => void;
    onRemoveDepartment: (owner: DepartmentOwner, departmentId: number) => void;
    onDepartmentBack: () => void;
    onBackToAddDetails: () => void;
    onBackToEditDetails: () => void;
    onEditSubmit: (event: FormEvent) => void;
    onDelete: () => void;
    onToggleEditPassword: () => void;
  };
};

const formatDepartmentAssignment = (item: UserDepartmentAssignment) =>
  item.customer_name ? `${item.customer_name} / ${item.department_name}` : item.department_name;

export function UsersPageModals({
  modalState,
  addFlow,
  editFlow,
  departmentFlow,
  roleOptions,
  customerAutocomplete,
  departmentAutocomplete,
  actions,
}: UsersPageModalsProps) {
  const { showAddModal, showEditModal, showDeleteModal, selectedUser, actionError, actionLoading } =
    modalState;
  const { view: addView, addForm, setAddForm } = addFlow;
  const { view: editView, editForm, setEditForm, showPassword: showEditPassword } = editFlow;
  const { owner: departmentOwner, draft, stepError, addDepartments, editDepartments } = departmentFlow;
  const {
    onCloseAdd,
    onCloseEdit,
    onCloseDelete,
    onAddSubmit,
    onOpenDepartmentList,
    onOpenAddDepartment,
    onDepartmentCustomerNext,
    onAddDepartmentToUser,
    onRemoveDepartment,
    onDepartmentBack,
    onBackToAddDetails,
    onBackToEditDetails,
    onEditSubmit,
    onDelete,
    onToggleEditPassword,
  } = actions;

  const renderDepartmentList = (owner: DepartmentOwner, departments: UserDepartmentAssignment[]) => (
    <div className={formStyles["dashboard-modal-form"]}>
      <div className={pageStyles["dashboard-user-department-list"]}>
        {departments.length === 0 ? (
          <p className={pageStyles["dashboard-user-department-empty"]}>No departments added.</p>
        ) : (
          departments.map((item) => (
            <div key={item.department_id} className={pageStyles["dashboard-user-department-item"]}>
              <span>{formatDepartmentAssignment(item)}</span>
              <button
                type="button"
                aria-label={`Remove ${item.department_name}`}
                onClick={() => onRemoveDepartment(owner, item.department_id)}
                className={pageStyles["dashboard-user-department-remove"]}
              >
                <FaTrash />
              </button>
            </div>
          ))
        )}
      </div>
      <Button type="button" icon={FaPlus} onClick={() => onOpenAddDepartment(owner)}>
        Add Department
      </Button>
      <div className={formStyles["dashboard-modal-actions"]}>
        <Button
          type="button"
          variant="cancel"
          onClick={owner === "add" ? onBackToAddDetails : onBackToEditDetails}
        >
          Back
        </Button>
      </div>
    </div>
  );

  const renderCustomerStep = () => (
    <div className={formStyles["dashboard-modal-form"]}>
      <div className={autocompleteStyles["dashboard-autocomplete"]}>
        <Input
          id={`${departmentOwner}-user-customer`}
          label="Customer"
          placeholder="Search customer by name"
          value={draft.customer_name}
          onChange={(e) => customerAutocomplete.handleChange(e.target.value)}
          autoComplete="off"
          onFocus={customerAutocomplete.handleFocus}
          onBlur={customerAutocomplete.handleBlur}
          aria-autocomplete="list"
          aria-expanded={customerAutocomplete.showSuggestions}
          aria-controls={`${departmentOwner}-user-customer-list`}
        />
        {customerAutocomplete.showSuggestions && (
          <div
            id={`${departmentOwner}-user-customer-list`}
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
        <Button type="button" variant="cancel" onClick={onDepartmentBack} disabled={actionLoading}>
          Back
        </Button>
        <Button type="button" onClick={onDepartmentCustomerNext}>
          Next
        </Button>
      </div>
    </div>
  );

  const renderDepartmentStep = () => (
    <div className={formStyles["dashboard-modal-form"]}>
      <div className={autocompleteStyles["dashboard-autocomplete"]}>
        <Input
          id={`${departmentOwner}-user-department`}
          label="Department"
          placeholder="Search department by name"
          value={draft.department_name}
          onChange={(e) => departmentAutocomplete.handleChange(e.target.value)}
          autoComplete="off"
          onFocus={departmentAutocomplete.handleFocus}
          onBlur={departmentAutocomplete.handleBlur}
          aria-autocomplete="list"
          aria-expanded={departmentAutocomplete.showSuggestions}
          aria-controls={`${departmentOwner}-user-department-list`}
        />
        {departmentAutocomplete.showSuggestions && (
          <div
            id={`${departmentOwner}-user-department-list`}
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
        <Button type="button" variant="cancel" onClick={onDepartmentBack} disabled={actionLoading}>
          Back
        </Button>
        <Button type="button" onClick={onAddDepartmentToUser}>
          Add
        </Button>
      </div>
    </div>
  );

  const renderDepartmentFlow = (view: UserModalView, departments: UserDepartmentAssignment[]) => {
    if (view === "departments") return renderDepartmentList(departmentOwner, departments);
    if (view === "department_customer") return renderCustomerStep();
    if (view === "department_department") return renderDepartmentStep();
    return null;
  };

  return (
    <>
      <Modal isOpen={showAddModal} onClose={onCloseAdd} title="Add User">
        {addView === "details" ? (
          <form className={formStyles["dashboard-modal-form"]} onSubmit={onAddSubmit}>
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
            <button
              type="button"
              className={pageStyles["dashboard-user-departments-button"]}
              onClick={() => onOpenDepartmentList("add")}
            >
              <span>Departments</span>
              <strong>{addDepartments.length}</strong>
            </button>
            {actionError && <p className={formStyles["dashboard-modal-error"]}>{actionError}</p>}
            <div className={formStyles["dashboard-modal-actions"]}>
              <Button onClick={onCloseAdd} type="button" variant="cancel" disabled={actionLoading}>
                Cancel
              </Button>
              <Button type="submit" isLoading={actionLoading}>
                Create User
              </Button>
            </div>
          </form>
        ) : (
          renderDepartmentFlow(addView, addDepartments)
        )}
      </Modal>

      <Modal isOpen={showEditModal} onClose={onCloseEdit} title="Edit User">
        {editView === "details" ? (
          <form className={formStyles["dashboard-modal-form"]} onSubmit={onEditSubmit}>
            <Input
              id="edit-user-email"
              label="Email"
              placeholder="Update user email"
              value={editForm.email}
              onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <Input
              id="edit-user-password"
              label="Password"
              placeholder="Enter new password"
              type={showEditPassword ? "text" : "password"}
              rightIcon={showEditPassword ? FaEyeSlash : FaEye}
              rightIconLabel={showEditPassword ? "Hide password" : "Show password"}
              onRightIconClick={onToggleEditPassword}
              value={editForm.password}
              autoComplete="new-password"
              onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
            />
            <DropdownSelect
              id="edit-user-role"
              label="Role"
              value={editForm.role}
              options={roleOptions}
              onChange={(value) => setEditForm((prev) => ({ ...prev, role: value }))}
            />
            <button
              type="button"
              className={pageStyles["dashboard-user-departments-button"]}
              onClick={() => onOpenDepartmentList("edit")}
            >
              <span>Departments</span>
              <strong>{editDepartments.length}</strong>
            </button>
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
        ) : (
          renderDepartmentFlow(editView, editDepartments)
        )}
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
