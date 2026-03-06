import { useMemo } from "react";
import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import styles from "./DeviceDataPanel.module.css";
import type { ListModalItem } from "./types/deviceDataPanelTypes";
import type { SectionModalState } from "./state/deviceDataPanelState";
import formStyles from "../DashboardForm/DashboardForm.module.css";

type DeviceDataPanelModalsProps = {
  sectionModalState: SectionModalState;
  onSectionNameChange: (value: string) => void;
  onSectionClose: () => void;
  onSectionSave: () => void;
  activeListField: string | null;
  listModalItems: ListModalItem[];
  listCaseColors: Record<string, string> | null;
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
  listCaseColors,
  getFieldLabel,
  onCloseList,
}: DeviceDataPanelModalsProps) {
  const normalizedCaseColors = useMemo(() => {
    if (!listCaseColors) return null;
    const map = new Map<string, string>();
    Object.entries(listCaseColors).forEach(([label, color]) => {
      const key = label.trim().toLowerCase();
      const value = typeof color === "string" ? color.trim() : "";
      if (!key || !value || map.has(key)) return;
      map.set(key, value);
    });
    return map;
  }, [listCaseColors]);

  const resolveCaseColor = (matchKey: string) => {
    if (!listCaseColors) return undefined;
    const direct = listCaseColors[matchKey];
    if (direct) return direct;
    const trimmed = matchKey.trim();
    if (!trimmed) return undefined;
    const trimmedDirect = listCaseColors[trimmed];
    if (trimmedDirect) return trimmedDirect;
    return normalizedCaseColors?.get(trimmed.toLowerCase());
  };

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
              {listModalItems.map((item, index) => {
                const color = resolveCaseColor(item.matchKey);
                return (
                  <li
                    key={`${activeListField ?? "list"}-detail-${index}`}
                    style={color ? { color } : undefined}
                  >
                    {item.label}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Modal>
    </>
  );
}
