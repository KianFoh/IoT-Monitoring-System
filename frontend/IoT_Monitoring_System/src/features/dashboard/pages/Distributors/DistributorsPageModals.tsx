import { useRef, type FormEvent, type RefObject } from "react";
import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { Switch } from "@/components/Switch/Switch";
import type { Distributor } from "@/types/distributor";
import formStyles from "../../components/DashboardForm/DashboardForm.module.css";

type DistributorFormState = {
  name: string;
  phone_no: string;
};

type DistributorEditFormState = DistributorFormState & { is_active: boolean };

type LogoPickerProps = {
  id: string;
  inputRef: RefObject<HTMLInputElement | null>;
  preview: string | null;
  onChange: (file: File | null) => void;
  ariaLabel: string;
};

type DistributorsPageModalsProps = {
  modalState: {
    showAddModal: boolean;
    showEditModal: boolean;
    showDeleteModal: boolean;
    selectedDistributor: Distributor | null;
    deleteDisabled: boolean;
    actionError: string | null;
    actionLoading: boolean;
  };
  forms: {
    addForm: DistributorFormState;
    setAddForm: (updater: (prev: DistributorFormState) => DistributorFormState) => void;
    editForm: DistributorEditFormState;
    setEditForm: (updater: (prev: DistributorEditFormState) => DistributorEditFormState) => void;
  };
  logo: {
    addLogoPreview: string | null;
    editLogoPreview: string | null;
    onAddLogoChange: (file: File | null) => void;
    onEditLogoChange: (file: File | null) => void;
  };
  actions: {
    onCloseAdd: () => void;
    onCloseEdit: () => void;
    onCloseDelete: () => void;
    onAddSubmit: (e: FormEvent) => void;
    onEditSubmit: (e: FormEvent) => void;
    onDelete: () => void;
  };
};

function LogoPicker({ id, inputRef, preview, onChange, ariaLabel }: LogoPickerProps) {
  return (
    <div className={formStyles["dashboard-modal-field"]}>
      <label className={formStyles["dashboard-modal-label"]}>Logo (optional)</label>
      <div className={formStyles["dashboard-modal-logo-row"]}>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/*"
          className={formStyles["dashboard-file-input"]}
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          className={[formStyles["dashboard-logo-preview"], formStyles["dashboard-logo-editable"]].join(" ")}
          onClick={() => inputRef.current?.click()}
          aria-label={ariaLabel}
        >
          {preview ? (
            <img
              src={preview}
              alt="Distributor logo preview"
              className={formStyles["dashboard-logo-preview-img"]}
            />
          ) : (
            <div className={formStyles["dashboard-logo-empty"]}>
              <span className={formStyles["dashboard-logo-empty-title"]}>Upload Logo</span>
              <span className={formStyles["dashboard-logo-empty-subtitle"]}>PNG, JPG up to 2MB</span>
            </div>
          )}
          <span className={formStyles["dashboard-logo-overlay"]}>{preview ? "Change" : "Upload"}</span>
        </button>
      </div>
    </div>
  );
}

export function DistributorsPageModals({
  modalState,
  forms,
  logo,
  actions,
}: DistributorsPageModalsProps) {
  const addLogoInputRef = useRef<HTMLInputElement | null>(null);
  const editLogoInputRef = useRef<HTMLInputElement | null>(null);
  const {
    showAddModal,
    showEditModal,
    showDeleteModal,
    selectedDistributor,
    deleteDisabled,
    actionError,
    actionLoading,
  } = modalState;
  const { addForm, setAddForm, editForm, setEditForm } = forms;
  const { addLogoPreview, editLogoPreview, onAddLogoChange, onEditLogoChange } = logo;
  const { onCloseAdd, onCloseEdit, onCloseDelete, onAddSubmit, onEditSubmit, onDelete } = actions;

  return (
    <>
      <Modal isOpen={showAddModal} onClose={onCloseAdd} title="Add Distributor">
        <form className={formStyles["dashboard-modal-form"]} onSubmit={onAddSubmit}>
          <LogoPicker
            id="add-distributor-logo"
            inputRef={addLogoInputRef}
            preview={addLogoPreview}
            onChange={onAddLogoChange}
            ariaLabel="Upload distributor logo"
          />
          <Input
            id="add-distributor-name"
            label="Distributor Name"
            placeholder="Enter distributor name"
            value={addForm.name}
            onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            id="add-distributor-phone"
            label="Phone Number (optional)"
            placeholder="Enter phone number"
            value={addForm.phone_no}
            onChange={(e) => setAddForm((prev) => ({ ...prev, phone_no: e.target.value }))}
          />
          {actionError && <p className={formStyles["dashboard-modal-error"]}>{actionError}</p>}
          <div className={formStyles["dashboard-modal-actions"]}>
            <Button onClick={onCloseAdd} type="button" variant="cancel" disabled={actionLoading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={actionLoading}>
              Create Distributor
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showEditModal} onClose={onCloseEdit} title="Edit Distributor">
        <form className={formStyles["dashboard-modal-form"]} onSubmit={onEditSubmit}>
          <LogoPicker
            id="edit-distributor-logo"
            inputRef={editLogoInputRef}
            preview={editLogoPreview}
            onChange={onEditLogoChange}
            ariaLabel="Change distributor logo"
          />
          <Input
            id="edit-distributor-name"
            label="Distributor Name"
            placeholder="Update distributor name"
            value={editForm.name}
            onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            id="edit-distributor-phone"
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
            <Button type="submit" isLoading={actionLoading} disabled={!selectedDistributor}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showDeleteModal} onClose={onCloseDelete} title="Delete Distributor">
        <div className={formStyles["dashboard-modal-form"]}>
          <p>
            Are you sure you want to delete{" "}
            <strong>{selectedDistributor?.name || "this distributor"}</strong>? This action cannot be undone.
          </p>
          {deleteDisabled && (
            <p className={formStyles["dashboard-modal-error"]}>Distributor is referenced by other records.</p>
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
              disabled={!selectedDistributor || deleteDisabled}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
