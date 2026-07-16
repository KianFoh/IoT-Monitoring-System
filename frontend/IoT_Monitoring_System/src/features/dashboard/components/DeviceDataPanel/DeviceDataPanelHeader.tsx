import { FaFilter, FaPlus } from "react-icons/fa";
import { Button } from "@/components/Button/Button";
import DropdownSelect from "../DropdownSelect/DropdownSelect";
import styles from "./DeviceDataPanel.module.css";
import type { DisplayOption } from "./types/deviceDataPanelTypes";

type DeviceDataPanelHeaderProps<T extends string> = {
  isEditing: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  layoutSaving: boolean;
  subtitle: string;
  displayMode: T;
  options: DisplayOption<T>[];
  onDisplayChange: (value: T) => void;
  onOpenFilter: () => void;
  onOpenSection: () => void;
  onAddField: () => void;
  onEnterEdit: () => void;
  onExitEdit: () => void;
  onSave: () => void;
};

export function DeviceDataPanelHeader<T extends string>({
  isEditing,
  disabled,
  readOnly,
  layoutSaving,
  subtitle,
  displayMode,
  options,
  onDisplayChange,
  onOpenFilter,
  onOpenSection,
  onAddField,
  onEnterEdit,
  onExitEdit,
  onSave,
}: DeviceDataPanelHeaderProps<T>) {
  return (
    <div className={styles["device-data-panel-header"]}>
      <div>
        <h2>Data Panel</h2>
        <span className={styles["device-data-panel-subtitle"]}>{subtitle}</span>
      </div>
      <div className={styles["device-data-panel-controls"]}>
        {isEditing ? (
          !readOnly && (
            <>
              <button
                type="button"
                className={styles["device-data-panel-filter-button"]}
                onClick={onOpenFilter}
                disabled={disabled || layoutSaving}
                aria-label="Open filters"
              >
                <FaFilter />
              </button>
              <Button
                onClick={onOpenSection}
                disabled={disabled || layoutSaving}
                className={styles["device-data-panel-control-button"]}
              >
                <span className={styles["device-panel-button-icon"]}>
                  <FaPlus />
                </span>
                Add section
              </Button>
              <Button
                onClick={onAddField}
                disabled={disabled || layoutSaving}
                className={styles["device-data-panel-control-button"]}
              >
                Add field
              </Button>
              <Button
                variant="cancel"
                onClick={onExitEdit}
                disabled={disabled || layoutSaving}
                className={styles["device-data-panel-control-button"]}
              >
                Exit edit
              </Button>
              <Button
                onClick={onSave}
                isLoading={layoutSaving}
                disabled={disabled || layoutSaving}
                className={styles["device-data-panel-control-button"]}
              >
                Save
              </Button>
            </>
          )
        ) : (
          <>
            <button
              type="button"
              className={styles["device-data-panel-filter-button"]}
              onClick={onOpenFilter}
              disabled={disabled}
              aria-label="Open filters"
            >
              <FaFilter />
            </button>
            <DropdownSelect
              id="device-dashboard-display"
              value={displayMode}
              options={options}
              onChange={onDisplayChange}
              disabled={disabled}
              groupClassName={styles["device-data-panel-select-group"]}
              triggerClassName={styles["device-data-panel-select-trigger"]}
            />
            {!readOnly && (
              <div className={styles["device-chart-actions"]}>
                <Button
                  onClick={onEnterEdit}
                  disabled={disabled}
                  className={styles["device-data-panel-control-button"]}
                >
                  Edit
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
