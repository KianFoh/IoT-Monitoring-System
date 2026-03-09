import { FaFilter, FaPlus } from "react-icons/fa";
import { Button } from "@/components/Button/Button";
import DropdownSelect from "../DropdownSelect/DropdownSelect";
import styles from "./DeviceDataChart.module.css";
import type { DisplayOption } from "./types/deviceDataChartTypes";

type DeviceDataChartHeaderProps<T extends string> = {
  isEditing: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  saving: boolean;
  displayMode: T;
  options: DisplayOption<T>[];
  onDisplayChange: (value: T) => void;
  onOpenFilter: () => void;
  onOpenAdd: () => void;
  onOpenOutput: () => void;
  onOpenSection: () => void;
  onEnterEdit: () => void;
  onExitEdit: () => void;
  onSave: () => void;
  hasDataOptions: boolean;
};

export function DeviceDataChartHeader<T extends string>({
  isEditing,
  disabled,
  readOnly,
  saving,
  displayMode,
  options,
  onDisplayChange,
  onOpenFilter,
  onOpenAdd,
  onOpenOutput,
  onOpenSection,
  onEnterEdit,
  onExitEdit,
  onSave,
  hasDataOptions,
}: DeviceDataChartHeaderProps<T>) {
  return (
    <div className={styles["device-data-panel-header"]}>
      <div>
        <h2>Data Chart</h2>
        <span className={styles["device-data-panel-subtitle"]}>View device data chart</span>
      </div>
      <div className={styles["device-data-panel-controls"]}>
        {isEditing ? (
          <div className={styles["device-chart-edit-actions"]}>
            <button
              type="button"
              className={styles["device-data-panel-filter-button"]}
              onClick={onOpenFilter}
              disabled={disabled || saving}
              aria-label="Open filters"
            >
              <FaFilter />
            </button>
            <Button
              onClick={onOpenSection}
              disabled={disabled || saving}
              className={styles["device-data-panel-control-button"]}
            >
              <span className={styles["device-panel-button-icon"]}>
                <FaPlus />
              </span>
              Add section
            </Button>
            <Button
              onClick={onOpenAdd}
              disabled={!hasDataOptions || disabled || saving}
              className={styles["device-data-panel-control-button"]}
            >
              Add chart
            </Button>
            <Button
              onClick={onOpenOutput}
              disabled={disabled || saving}
              className={styles["device-data-panel-control-button"]}
            >
              Add output
            </Button>
            <Button
              onClick={onExitEdit}
              variant="cancel"
              disabled={disabled || saving}
              className={styles["device-data-panel-control-button"]}
            >
              Exit edit
            </Button>
            <Button
              onClick={onSave}
              disabled={disabled || saving}
              isLoading={saving}
              className={styles["device-data-panel-control-button"]}
            >
              Save
            </Button>
          </div>
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
            <div className={styles["device-chart-actions"]}>
              {!readOnly && (
                <Button
                  onClick={onEnterEdit}
                  variant="primary"
                  disabled={disabled}
                  className={styles["device-data-panel-control-button"]}
                >
                  Edit
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
