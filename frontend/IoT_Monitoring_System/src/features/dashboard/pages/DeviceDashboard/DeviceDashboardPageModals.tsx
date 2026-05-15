import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { FaArrowLeft, FaPlus, FaTimes } from "react-icons/fa";
import DropdownSelect from "../../components/DropdownSelect/DropdownSelect";
import formStyles from "../../components/DashboardForm/DashboardForm.module.css";
import inputStyles from "@/components/Input/Input.module.css";

type FieldTypeOption = { value: "number" | "text" | "list" | "boolean"; label: string };
type CaseItem = { id: string; label: string; color: string };

const DEFAULT_FIELD_COLOR = "#c7ddff";

const normalizeHex = (value: string) => {
  const trimmed = value.trim();
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(trimmed);
  if (!match) return null;
  const hex = match[1].toLowerCase();
  if (hex.length === 3) {
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  }
  return `#${hex}`;
};

const rgbToHex = (value: string) => {
  const match = /rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/i.exec(
    value.trim()
  );
  if (!match) return null;
  const toHex = (part: string) => {
    const num = Math.min(255, Math.max(0, Number(part)));
    if (!Number.isFinite(num)) return null;
    return num.toString(16).padStart(2, "0");
  };
  const r = toHex(match[1]);
  const g = toHex(match[2]);
  const b = toHex(match[3]);
  if (!r || !g || !b) return null;
  return `#${r}${g}${b}`;
};

const toPickerColor = (value: string) =>
  normalizeHex(value) || rgbToHex(value) || DEFAULT_FIELD_COLOR;

const hexToRgb = (hex: string) => {
  const normalized = normalizeHex(hex);
  if (!normalized) return "";
  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
};

type DeviceDashboardPanelState = {
  edit: {
    field: string | null;
    key: string;
    setKey: (value: string) => void;
    label: string;
    setLabel: (value: string) => void;
    unit: string;
    setUnit: (value: string) => void;
    type: "number" | "text" | "list" | "boolean";
    setType: (value: "number" | "text" | "list" | "boolean") => void;
    color: string;
    setColor: (value: string) => void;
    trueLabel: string;
    setTrueLabel: (value: string) => void;
    falseLabel: string;
    setFalseLabel: (value: string) => void;
    trueColor: string;
    setTrueColor: (value: string) => void;
    falseColor: string;
    setFalseColor: (value: string) => void;
    caseItems: CaseItem[];
    setCaseItems: (value: CaseItem[] | ((prev: CaseItem[]) => CaseItem[])) => void;
    saving: boolean;
    error: string | null;
  };
  addField: {
    isOpen: boolean;
    key: string;
    setKey: (value: string) => void;
    label: string;
    setLabel: (value: string) => void;
    unit: string;
    setUnit: (value: string) => void;
    type: "number" | "text" | "list" | "boolean";
    setType: (value: "number" | "text" | "list" | "boolean") => void;
    color: string;
    setColor: (value: string) => void;
    trueLabel: string;
    setTrueLabel: (value: string) => void;
    falseLabel: string;
    setFalseLabel: (value: string) => void;
    trueColor: string;
    setTrueColor: (value: string) => void;
    falseColor: string;
    setFalseColor: (value: string) => void;
    caseItems: CaseItem[];
    setCaseItems: (value: CaseItem[] | ((prev: CaseItem[]) => CaseItem[])) => void;
    saving: boolean;
    error: string | null;
  };
  caseConfig: {
    mode: "edit" | "new" | null;
    openEdit: () => void;
    openNew: () => void;
    close: () => void;
  };
  actions: {
    closeFieldConfig: () => void;
    saveFieldConfig: () => void;
    closeAddField: () => void;
    addField: () => void;
  };
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
  const editColorPicker = toPickerColor(panel.edit.color);
  const newFieldColorPicker = toPickerColor(panel.addField.color);
  const editTrueColorPicker = toPickerColor(panel.edit.trueColor);
  const editFalseColorPicker = toPickerColor(panel.edit.falseColor);
  const newTrueColorPicker = toPickerColor(panel.addField.trueColor);
  const newFalseColorPicker = toPickerColor(panel.addField.falseColor);
  const editCaseCount = panel.edit.caseItems.filter((item) => item.label.trim()).length;
  const newCaseCount = panel.addField.caseItems.filter((item) => item.label.trim()).length;
  const isCaseConfigOpen = panel.caseConfig.mode !== null;
  const isEditCaseConfig = panel.caseConfig.mode === "edit";
  const activeCaseItems = isEditCaseConfig ? panel.edit.caseItems : panel.addField.caseItems;
  const setActiveCaseItems = isEditCaseConfig
    ? panel.edit.setCaseItems
    : panel.addField.setCaseItems;
  const activeFieldKey = panel.edit.key?.trim() || panel.edit.field || "";
  const activeFieldLabel = activeFieldKey ? `Configure ${activeFieldKey}` : "Configure field";
  const newCaseFieldName =
    panel.addField.label.trim() || panel.addField.key.trim() || "new field";
  const caseConfigTitle = isEditCaseConfig
    ? `Cases for ${panel.edit.key?.trim() || panel.edit.field || "field"}`
    : `Cases for ${newCaseFieldName}`;
  const createCaseItem = (): CaseItem => ({
    id: `case-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label: "",
    color: "",
  });
  const handleAddCase = () => {
    if (!setActiveCaseItems) return;
    setActiveCaseItems((prev) => [...prev, createCaseItem()]);
  };
  const handleCaseLabelChange = (id: string, value: string) => {
    setActiveCaseItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, label: value } : item))
    );
  };
  const handleCaseColorChange = (id: string, value: string) => {
    setActiveCaseItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, color: value } : item))
    );
  };
  const handleRemoveCase = (id: string) => {
    setActiveCaseItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <>
      <Modal
        isOpen={!!panel.edit.field && !isCaseConfigOpen}
        onClose={panel.actions.closeFieldConfig}
        title={activeFieldLabel}
      >
        <div className={formStyles["dashboard-modal-form"]}>
          <div className={formStyles["dashboard-picker-field-row"]}>
            <Input
              id="device-field-key"
              label="Data key"
              placeholder="Enter data key"
              value={panel.edit.key}
              onChange={(event) => panel.edit.setKey(event.target.value)}
              groupClassName={`${formStyles["dashboard-picker-field-main"]} ${formStyles["dashboard-picker-field-main-full"]}`}
              inputClassName={formStyles["dashboard-picker-field-input"]}
            />
          </div>
          <div className={formStyles["dashboard-picker-field-row"]}>
            <Input
              id="device-field-label"
              label="Data label"
              placeholder="Enter display label"
              value={panel.edit.label}
              onChange={(event) => panel.edit.setLabel(event.target.value)}
              groupClassName={formStyles["dashboard-picker-field-main"]}
              inputClassName={formStyles["dashboard-picker-field-input"]}
            />
            <input
              type="color"
              className={`${formStyles["dashboard-color-input"]} ${formStyles["dashboard-label-color"]}`}
              value={editColorPicker}
              onChange={(event) => panel.edit.setColor(hexToRgb(event.target.value))}
              aria-label="Field color picker"
            />
          </div>
          {panel.edit.type !== "boolean" && (
            <div className={formStyles["dashboard-picker-field-row"]}>
              <Input
                id="device-field-unit"
                label="Unit"
                placeholder="Enter Unit"
                value={panel.edit.unit}
                onChange={(event) => panel.edit.setUnit(event.target.value)}
                groupClassName={`${formStyles["dashboard-picker-field-main"]} ${formStyles["dashboard-picker-field-main-full"]}`}
                inputClassName={formStyles["dashboard-picker-field-input"]}
              />
            </div>
          )}
          <div className={formStyles["dashboard-picker-field-row"]}>
            <DropdownSelect
              id="device-field-type"
              label="Field type"
              value={panel.edit.type}
              options={fieldTypeOptions}
              onChange={(value) => panel.edit.setType(value)}
              groupClassName={`${formStyles["dashboard-picker-field-main"]} ${formStyles["dashboard-picker-field-main-full"]}`}
              triggerClassName={formStyles["dashboard-picker-field-trigger"]}
            />
          </div>
          {panel.edit.type === "boolean" && (
            <>
              <div className={formStyles["dashboard-picker-field-row"]}>
                <Input
                  id="device-field-true-label"
                  label="True label"
                  placeholder="e.g. On"
                  value={panel.edit.trueLabel}
                  onChange={(event) => panel.edit.setTrueLabel(event.target.value)}
                  groupClassName={formStyles["dashboard-picker-field-main"]}
                  inputClassName={formStyles["dashboard-picker-field-input"]}
                />
                <input
                  type="color"
                  className={`${formStyles["dashboard-color-input"]} ${formStyles["dashboard-label-color"]}`}
                  value={editTrueColorPicker}
                  onChange={(event) => panel.edit.setTrueColor(hexToRgb(event.target.value))}
                  aria-label="True color picker"
                />
              </div>
              <div className={formStyles["dashboard-picker-field-row"]}>
                <Input
                  id="device-field-false-label"
                  label="False label"
                  placeholder="e.g. Off"
                  value={panel.edit.falseLabel}
                  onChange={(event) => panel.edit.setFalseLabel(event.target.value)}
                  groupClassName={formStyles["dashboard-picker-field-main"]}
                  inputClassName={formStyles["dashboard-picker-field-input"]}
                />
                <input
                  type="color"
                  className={`${formStyles["dashboard-color-input"]} ${formStyles["dashboard-label-color"]}`}
                  value={editFalseColorPicker}
                  onChange={(event) => panel.edit.setFalseColor(hexToRgb(event.target.value))}
                  aria-label="False color picker"
                />
              </div>
            </>
          )}
          {(panel.edit.type === "text" || panel.edit.type === "list") && (
            <div className={formStyles["dashboard-modal-field"]}>
              <label className={inputStyles["gen-inputLabel"]}>Cases (Optional)</label>
              <Button type="button" onClick={panel.caseConfig.openEdit}>
                Configure cases{editCaseCount ? ` (${editCaseCount})` : ""}
              </Button>
            </div>
          )}
          {panel.edit.error && <p className={formStyles["dashboard-modal-error"]}>{panel.edit.error}</p>}
          <div className={formStyles["dashboard-modal-actions"]}>
            <Button
              type="button"
              variant="cancel"
              onClick={panel.actions.closeFieldConfig}
              disabled={panel.edit.saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={panel.actions.saveFieldConfig}
              isLoading={panel.edit.saving}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={panel.addField.isOpen && !isCaseConfigOpen}
        onClose={panel.actions.closeAddField}
        title="Add data field"
      >
        <div className={formStyles["dashboard-modal-form"]}>
          <div className={formStyles["dashboard-picker-field-row"]}>
            <Input
              id="device-data-field-key"
              label="Data key"
              placeholder="e.g. temperature"
              value={panel.addField.key}
              onChange={(event) => panel.addField.setKey(event.target.value)}
              groupClassName={`${formStyles["dashboard-picker-field-main"]} ${formStyles["dashboard-picker-field-main-full"]}`}
              inputClassName={formStyles["dashboard-picker-field-input"]}
            />
          </div>
          <div className={formStyles["dashboard-picker-field-row"]}>
            <Input
              id="device-data-field-label"
              label="Data label"
              placeholder="e.g. Temperature"
              value={panel.addField.label}
              onChange={(event) => panel.addField.setLabel(event.target.value)}
              groupClassName={formStyles["dashboard-picker-field-main"]}
              inputClassName={formStyles["dashboard-picker-field-input"]}
            />
            <input
              type="color"
              className={`${formStyles["dashboard-color-input"]} ${formStyles["dashboard-label-color"]}`}
              value={newFieldColorPicker}
              onChange={(event) => panel.addField.setColor(hexToRgb(event.target.value))}
              aria-label="Field color picker"
            />
          </div>
          {panel.addField.type !== "boolean" && (
            <div className={formStyles["dashboard-picker-field-row"]}>
              <Input
                id="device-data-field-unit"
                label="Unit (optional)"
                placeholder="e.g. C"
                value={panel.addField.unit}
                onChange={(event) => panel.addField.setUnit(event.target.value)}
                groupClassName={`${formStyles["dashboard-picker-field-main"]} ${formStyles["dashboard-picker-field-main-full"]}`}
                inputClassName={formStyles["dashboard-picker-field-input"]}
              />
            </div>
          )}
          <div className={formStyles["dashboard-picker-field-row"]}>
            <DropdownSelect
              id="device-data-field-type"
              label="Field type"
              value={panel.addField.type}
              options={fieldTypeOptions}
              onChange={(value) => panel.addField.setType(value)}
              groupClassName={`${formStyles["dashboard-picker-field-main"]} ${formStyles["dashboard-picker-field-main-full"]}`}
              triggerClassName={formStyles["dashboard-picker-field-trigger"]}
            />
          </div>
          {panel.addField.type === "boolean" && (
            <>
              <div className={formStyles["dashboard-picker-field-row"]}>
                <Input
                  id="device-data-field-true-label"
                  label="True label"
                  placeholder="e.g. On"
                  value={panel.addField.trueLabel}
                  onChange={(event) => panel.addField.setTrueLabel(event.target.value)}
                  groupClassName={formStyles["dashboard-picker-field-main"]}
                  inputClassName={formStyles["dashboard-picker-field-input"]}
                />
                <input
                  type="color"
                  className={`${formStyles["dashboard-color-input"]} ${formStyles["dashboard-label-color"]}`}
                  value={newTrueColorPicker}
                  onChange={(event) => panel.addField.setTrueColor(hexToRgb(event.target.value))}
                  aria-label="True color picker"
                />
              </div>
              <div className={formStyles["dashboard-picker-field-row"]}>
                <Input
                  id="device-data-field-false-label"
                  label="False label"
                  placeholder="e.g. Off"
                  value={panel.addField.falseLabel}
                  onChange={(event) => panel.addField.setFalseLabel(event.target.value)}
                  groupClassName={formStyles["dashboard-picker-field-main"]}
                  inputClassName={formStyles["dashboard-picker-field-input"]}
                />
                <input
                  type="color"
                  className={`${formStyles["dashboard-color-input"]} ${formStyles["dashboard-label-color"]}`}
                  value={newFalseColorPicker}
                  onChange={(event) => panel.addField.setFalseColor(hexToRgb(event.target.value))}
                  aria-label="False color picker"
                />
              </div>
            </>
          )}
          {(panel.addField.type === "text" || panel.addField.type === "list") && (
            <div className={formStyles["dashboard-modal-field"]}>
              <label className={inputStyles["gen-inputLabel"]}>Cases (Optional)</label>
              <Button type="button" onClick={panel.caseConfig.openNew}>
                Configure cases{newCaseCount ? ` (${newCaseCount})` : ""}
              </Button>
            </div>
          )}
          {panel.addField.error && <p className={formStyles["dashboard-modal-error"]}>{panel.addField.error}</p>}
          <div className={formStyles["dashboard-modal-actions"]}>
            <Button
              type="button"
              variant="cancel"
              onClick={panel.actions.closeAddField}
              disabled={panel.addField.saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={panel.actions.addField}
              isLoading={panel.addField.saving}
              disabled={!panel.addField.key.trim()}
            >
              Add field
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isCaseConfigOpen} onClose={panel.caseConfig.close} title={caseConfigTitle}>
        <div className={formStyles["dashboard-modal-form"]}>
          <div className={formStyles["dashboard-case-list"]}>
            {activeCaseItems.length === 0 ? (
              <p className={formStyles["dashboard-modal-hint"]}>No cases yet.</p>
            ) : (
              activeCaseItems.map((item) => (
                <div key={item.id} className={formStyles["dashboard-case-row"]}>
                  <Input
                    id={`case-label-${item.id}`}
                    placeholder="Case label"
                    value={item.label}
                    onChange={(event) => handleCaseLabelChange(item.id, event.target.value)}
                    groupClassName={formStyles["dashboard-case-label"]}
                  />
                  <div className={formStyles["dashboard-case-color-row"]}>
                    <input
                      type="color"
                      className={formStyles["dashboard-color-input"]}
                      value={toPickerColor(item.color)}
                      onChange={(event) =>
                        handleCaseColorChange(item.id, hexToRgb(event.target.value))
                      }
                      aria-label="Case color picker"
                    />
                  </div>
                  <button
                    type="button"
                    className={formStyles["dashboard-case-remove"]}
                    onClick={() => handleRemoveCase(item.id)}
                    aria-label="Remove case"
                  >
                    <FaTimes />
                  </button>
                </div>
              ))
            )}
            <button
              type="button"
              className={formStyles["dashboard-case-add-row"]}
              onClick={handleAddCase}
            >
              <span className={formStyles["dashboard-case-add-icon"]}>
                <FaPlus />
              </span>
              <span>Add case</span>
            </button>
          </div>
          <div className={formStyles["dashboard-modal-actions"]}>
            <Button
              type="button"
              variant="cancel"
              icon={FaArrowLeft}
              onClick={panel.caseConfig.close}
            >
              Back to field
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
