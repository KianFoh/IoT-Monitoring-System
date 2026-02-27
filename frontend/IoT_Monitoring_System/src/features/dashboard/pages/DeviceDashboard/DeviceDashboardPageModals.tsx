import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import DropdownSelect from "../../components/DropdownSelect/DropdownSelect";
import formStyles from "../../components/DashboardForm/DashboardForm.module.css";

type FieldTypeOption = { value: "number" | "text" | "list"; label: string };

type DeviceDashboardPanelState = {
  editingField: string | null;
  editLabel: string;
  setEditLabel: (value: string) => void;
  editUnit: string;
  setEditUnit: (value: string) => void;
  editType: "number" | "text" | "list";
  setEditType: (value: "number" | "text" | "list") => void;
  configError: string | null;
  configSaving: boolean;
  closeFieldConfig: () => void;
  handleSaveConfig: () => void;
  isAddFieldOpen: boolean;
  closeAddField: () => void;
  newFieldKey: string;
  setNewFieldKey: (value: string) => void;
  newFieldLabel: string;
  setNewFieldLabel: (value: string) => void;
  newFieldUnit: string;
  setNewFieldUnit: (value: string) => void;
  newFieldType: "number" | "text" | "list";
  setNewFieldType: (value: "number" | "text" | "list") => void;
  addFieldError: string | null;
  addFieldSaving: boolean;
  handleAddField: () => void;
};

type DeviceDashboardPageModalsProps = {
  modalState: {
    panel: DeviceDashboardPanelState;
    fieldTypeOptions: FieldTypeOption[];
  };
};

export function DeviceDashboardPageModals({
  modalState,
}: DeviceDashboardPageModalsProps) {
  const { panel, fieldTypeOptions } = modalState;
  return (
    <>
      <Modal
        isOpen={!!panel.editingField}
        onClose={panel.closeFieldConfig}
        title={panel.editingField ? `Configure ${panel.editingField}` : "Configure field"}
      >
        <div className={formStyles["dashboard-modal-form"]}>
          <Input
            id="device-field-key"
            label="Data key"
            placeholder="Enter data key"
            value={panel.editingField ?? ""}
            disabled
          />
          <Input
            id="device-field-label"
            label="Data label"
            placeholder="Enter display label"
            value={panel.editLabel}
            onChange={(event) => panel.setEditLabel(event.target.value)}
          />
          <Input
            id="device-field-unit"
            label="Unit"
            placeholder="Enter Unit"
            value={panel.editUnit}
            onChange={(event) => panel.setEditUnit(event.target.value)}
          />
          <DropdownSelect
            id="device-field-type"
            label="Field type"
            value={panel.editType}
            options={fieldTypeOptions}
            onChange={(value) => panel.setEditType(value)}
          />
          {panel.configError && <p className={formStyles["dashboard-modal-error"]}>{panel.configError}</p>}
          <div className={formStyles["dashboard-modal-actions"]}>
            <Button
              type="button"
              variant="cancel"
              onClick={panel.closeFieldConfig}
              disabled={panel.configSaving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={panel.handleSaveConfig} isLoading={panel.configSaving}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={panel.isAddFieldOpen} onClose={panel.closeAddField} title="Add data field">
        <div className={formStyles["dashboard-modal-form"]}>
          <Input
            id="device-data-field-key"
            label="Data key"
            placeholder="e.g. temperature"
            value={panel.newFieldKey}
            onChange={(event) => panel.setNewFieldKey(event.target.value)}
          />
          <Input
            id="device-data-field-label"
            label="Data label"
            placeholder="e.g. Temperature"
            value={panel.newFieldLabel}
            onChange={(event) => panel.setNewFieldLabel(event.target.value)}
          />
          <Input
            id="device-data-field-unit"
            label="Unit (optional)"
            placeholder="e.g. C"
            value={panel.newFieldUnit}
            onChange={(event) => panel.setNewFieldUnit(event.target.value)}
          />
          <DropdownSelect
            id="device-data-field-type"
            label="Field type"
            value={panel.newFieldType}
            options={fieldTypeOptions}
            onChange={(value) => panel.setNewFieldType(value)}
          />
          {panel.addFieldError && <p className={formStyles["dashboard-modal-error"]}>{panel.addFieldError}</p>}
          <div className={formStyles["dashboard-modal-actions"]}>
            <Button
              type="button"
              variant="cancel"
              onClick={panel.closeAddField}
              disabled={panel.addFieldSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={panel.handleAddField}
              isLoading={panel.addFieldSaving}
              disabled={!panel.newFieldKey.trim()}
            >
              Add field
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
