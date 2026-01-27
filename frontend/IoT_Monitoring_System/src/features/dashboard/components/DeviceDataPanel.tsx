import { FaCog } from "react-icons/fa";
import { Button } from "@/components/Button/Button";
import DropdownSelect from "./DropdownSelect";
import styles from "../styles/dashboard.module.css";

type DisplayOption<T extends string> = {
  value: T;
  label: string;
};

type DeviceDataPanelProps<T extends string> = {
  displayMode: T;
  options: DisplayOption<T>[];
  onDisplayChange: (value: T) => void;
  disabled?: boolean;
  readOnly?: boolean;
  subtitle: string;
  showGenerate: boolean;
  panelLoading: boolean;
  panelError: string | null;
  onGenerate: () => void;
  panelFields: string[];
  getFieldLabel: (field: string) => string;
  getFieldValue: (field: string) => string;
  onOpenFieldConfig: (field: string) => void;
};

export function DeviceDataPanel<T extends string>({
  displayMode,
  options,
  onDisplayChange,
  disabled,
  readOnly = false,
  subtitle,
  showGenerate,
  panelLoading,
  panelError,
  onGenerate,
  panelFields,
  getFieldLabel,
  getFieldValue,
  onOpenFieldConfig,
}: DeviceDataPanelProps<T>) {
  return (
    <div className={styles["device-data-panel"]}>
      <div className={styles["device-data-panel-header"]}>
        <div>
          <h2>Data Panel</h2>
          <span className={styles["device-data-panel-subtitle"]}>{subtitle}</span>
        </div>
        <div className={styles["device-data-panel-controls"]}>
          <DropdownSelect
            id="device-dashboard-display"
            value={displayMode}
            options={options}
            onChange={onDisplayChange}
            disabled={disabled}
          />
        </div>
      </div>

      {showGenerate ? (
        <div className={styles["device-data-empty"]}>
          <p>No data panel configured yet.</p>
          {!readOnly && (
            <Button
              onClick={onGenerate}
              isLoading={panelLoading}
              disabled={disabled || panelLoading}
              className={styles["device-data-generate"]}
            >
              Generate data panel
            </Button>
          )}
          {panelError && <p className={styles["dashboard-modal-error"]}>{panelError}</p>}
        </div>
      ) : (
        <>
          {panelError && <p className={styles["dashboard-modal-error"]}>{panelError}</p>}
          <div className={styles["device-data-grid"]}>
            {panelFields.map((field) => (
              <div key={field} className={styles["device-data-card"]}>
                {!readOnly && (
                  <button
                    type="button"
                    className={styles["device-data-settings"]}
                    onClick={() => onOpenFieldConfig(field)}
                    aria-label={`Configure ${field}`}
                  >
                    <FaCog />
                  </button>
                )}
                <span className={styles["device-data-label"]}>{getFieldLabel(field)}</span>
                <span className={styles["device-data-value"]}>{getFieldValue(field)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
