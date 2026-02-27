import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import styles from "./DeviceDataPanel.module.css";
import type { SectionModalState } from "./deviceDataPanelState";
import formStyles from "../DashboardForm/DashboardForm.module.css";

type DeviceDataPanelModalsProps = {
  sectionModalState: SectionModalState;
  onSectionNameChange: (value: string) => void;
  onSectionClose: () => void;
  onSectionSave: () => void;
  activeListField: string | null;
  listModalItems: string[];
  getFieldLabel: (field: string) => string;
  onCloseList: () => void;
};

export function DeviceDataPanelModals({
  sectionModalState,
  onSectionNameChange,
  onSectionClose,
  onSectionSave,
  activeListField,
  listModalItems,
  getFieldLabel,
  onCloseList,
}: DeviceDataPanelModalsProps) {
  return (
    <>
      <Modal
        isOpen={sectionModalState.isOpen}
        onClose={onSectionClose}
        title={sectionModalState.editingId ? "Rename section" : "Add section"}
      >
        <div className={formStyles["dashboard-modal-form"]}>
          <Input
            id="device-section-name"
            label="Section name"
            placeholder="e.g. Water Quality"
            value={sectionModalState.name}
            onChange={(event) => onSectionNameChange(event.target.value)}
          />
          {sectionModalState.error && (
            <p className={formStyles["dashboard-modal-error"]}>{sectionModalState.error}</p>
          )}
          <div className={formStyles["dashboard-modal-actions"]}>
            <Button type="button" variant="cancel" onClick={onSectionClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onSectionSave}
              disabled={!sectionModalState.name.trim()}
            >
              {sectionModalState.editingId ? "Save" : "Add"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!activeListField}
        onClose={onCloseList}
        title={activeListField ? `${getFieldLabel(activeListField)} details` : "Field details"}
        footer={
          <Button type="button" variant="cancel" onClick={onCloseList}>
            Close
          </Button>
        }
      >
        <div className={styles["device-data-list-modal"]}>
          {listModalItems.length === 0 ? (
            <p className={styles["device-data-list-empty"]}>No items available.</p>
          ) : (
            <ul>
              {listModalItems.map((item, index) => (
                <li key={`${activeListField ?? "list"}-detail-${index}`}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </>
  );
}
