import type { FormEvent } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { Switch } from "@/components/Switch/Switch";
import type { Customer } from "@/types/customer";
import type { DistributorSearch } from "@/types/distributor";
import formStyles from "../../components/DashboardForm/DashboardForm.module.css";
import autocompleteStyles from "../../components/DropdownSelect/DropdownSelect.module.css";

type DistributorAutocomplete = {
  suggestions: DistributorSearch[];
  isFetching: boolean;
  showSuggestions: boolean;
  handleChange: (value: string) => void;
  handleFocus: () => void;
  handleBlur: () => void;
  handlePick: (distributor: DistributorSearch) => void;
};

type CustomerFormState = {
  name: string;
  phone_no: string;
  distributor_name: string;
  distributor_id: number | null;
  is_active?: boolean;
};

type CustomersPageModalsProps = {
  modalState: {
    showAddModal: boolean;
    showEditModal: boolean;
    showDeleteModal: boolean;
    selectedCustomer: Customer | null;
    deleteDisabled: boolean;
    actionError: string | null;
    actionLoading: boolean;
  };
  addFlow: {
    step: "distributor" | "details";
    stepError: string | null;
    addForm: CustomerFormState;
    setAddForm: Dispatch<SetStateAction<CustomerFormState>>;
    onAddFormSubmit: (e?: FormEvent) => void;
    onAddNext: () => void;
    onAddBack: () => void;
  };
  editFlow: {
    editForm: CustomerFormState & { is_active: boolean };
    setEditForm: Dispatch<SetStateAction<CustomerFormState & { is_active: boolean }>>;
    onEditSubmit: (e: FormEvent) => void;
  };
  autocomplete: {
    addDistributor: DistributorAutocomplete;
    editDistributor: DistributorAutocomplete;
  };
  actions: {
    onCloseAdd: () => void;
    onCloseEdit: () => void;
    onCloseDelete: () => void;
    onDelete: () => void;
  };
};

export function CustomersPageModals({
  modalState,
  addFlow,
  editFlow,
  autocomplete,
  actions,
}: CustomersPageModalsProps) {
  const {
    showAddModal,
    showEditModal,
    showDeleteModal,
    selectedCustomer,
    deleteDisabled,
    actionError,
    actionLoading,
  } = modalState;
  const { step, stepError, addForm, setAddForm, onAddFormSubmit, onAddNext, onAddBack } = addFlow;
  const { editForm, setEditForm, onEditSubmit } = editFlow;
  const { addDistributor, editDistributor } = autocomplete;
  const { onCloseAdd, onCloseEdit, onCloseDelete, onDelete } = actions;

  return (
    <>
      <Modal isOpen={showAddModal} onClose={onCloseAdd} title="Add Customer">
        <form className={formStyles["dashboard-modal-form"]} onSubmit={onAddFormSubmit}>
          {step === "distributor" ? (
            <>
              <div className={autocompleteStyles["dashboard-autocomplete"]}>
                <Input
                  id="add-customer-distributor"
                  label="Distributor (optional)"
                  placeholder="Search distributor by name"
                  value={addForm.distributor_name}
                  onChange={(e) => addDistributor.handleChange(e.target.value)}
                  autoComplete="off"
                  onFocus={addDistributor.handleFocus}
                  onBlur={addDistributor.handleBlur}
                  aria-autocomplete="list"
                  aria-expanded={addDistributor.showSuggestions}
                  aria-controls="add-customer-distributor-list"
                />
                {addDistributor.showSuggestions && (
                  <div
                    id="add-customer-distributor-list"
                    className={autocompleteStyles["dashboard-autocomplete-list"]}
                    role="listbox"
                  >
                    {addDistributor.isFetching ? (
                      <div className={autocompleteStyles["dashboard-autocomplete-empty"]}>Searching...</div>
                    ) : addDistributor.suggestions.length === 0 ? (
                      <div className={autocompleteStyles["dashboard-autocomplete-empty"]}>No matches</div>
                    ) : (
                      addDistributor.suggestions.map((distributor) => (
                        <button
                          key={distributor.id}
                          type="button"
                          className={autocompleteStyles["dashboard-autocomplete-item"]}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            addDistributor.handlePick(distributor);
                          }}
                          role="option"
                        >
                          {distributor.name}
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
                id="add-customer-name"
                label="Customer Name"
                placeholder="Enter customer name"
                value={addForm.name}
                onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <Input
                id="add-customer-phone"
                label="Phone Number (optional)"
                placeholder="Enter phone number"
                value={addForm.phone_no}
                onChange={(e) => setAddForm((prev) => ({ ...prev, phone_no: e.target.value }))}
              />
              {actionError && <p className={formStyles["dashboard-modal-error"]}>{actionError}</p>}
              <div className={formStyles["dashboard-modal-actions"]}>
                <Button type="button" variant="cancel" onClick={onAddBack} disabled={actionLoading}>
                  Back
                </Button>
                <Button type="submit" isLoading={actionLoading}>
                  Create Customer
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>

      <Modal isOpen={showEditModal} onClose={onCloseEdit} title="Edit Customer">
        <form className={formStyles["dashboard-modal-form"]} onSubmit={onEditSubmit}>
          <div className={autocompleteStyles["dashboard-autocomplete"]}>
            <Input
              id="edit-customer-distributor"
              label="Distributor (optional)"
              placeholder="Search distributor by name"
              value={editForm.distributor_name}
              onChange={(e) => editDistributor.handleChange(e.target.value)}
              autoComplete="off"
              onFocus={editDistributor.handleFocus}
              onBlur={editDistributor.handleBlur}
              aria-autocomplete="list"
              aria-expanded={editDistributor.showSuggestions}
              aria-controls="edit-customer-distributor-list"
            />
            {editDistributor.showSuggestions && (
              <div
                id="edit-customer-distributor-list"
                className={autocompleteStyles["dashboard-autocomplete-list"]}
                role="listbox"
              >
                {editDistributor.isFetching ? (
                  <div className={autocompleteStyles["dashboard-autocomplete-empty"]}>Searching...</div>
                ) : editDistributor.suggestions.length === 0 ? (
                  <div className={autocompleteStyles["dashboard-autocomplete-empty"]}>No matches</div>
                ) : (
                  editDistributor.suggestions.map((distributor) => (
                    <button
                      key={distributor.id}
                      type="button"
                      className={autocompleteStyles["dashboard-autocomplete-item"]}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        editDistributor.handlePick(distributor);
                      }}
                      role="option"
                    >
                      {distributor.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <Input
            id="edit-customer-name"
            label="Customer Name"
            placeholder="Update customer name"
            value={editForm.name}
            onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            id="edit-customer-phone"
            label="Phone Number (optional)"
            placeholder="Enter phone number"
            value={editForm.phone_no}
            onChange={(e) => setEditForm((prev) => ({ ...prev, phone_no: e.target.value }))}
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
            <Button type="submit" isLoading={actionLoading} disabled={!selectedCustomer}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showDeleteModal} onClose={onCloseDelete} title="Delete Customer">
        <div className={formStyles["dashboard-modal-form"]}>
          <p>
            Are you sure you want to delete{" "}
            <strong>{selectedCustomer?.name || "this customer"}</strong>? This action cannot be undone.
          </p>
          {deleteDisabled && (
            <p className={formStyles["dashboard-modal-error"]}>Customer is referenced by other records.</p>
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
              disabled={!selectedCustomer || deleteDisabled}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
