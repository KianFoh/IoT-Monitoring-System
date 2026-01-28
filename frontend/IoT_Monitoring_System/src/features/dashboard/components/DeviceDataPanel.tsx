import { useEffect, useMemo, useState } from "react";
import { FaCog } from "react-icons/fa";
import { Button } from "@/components/Button/Button";
import { Modal } from "@/components/Modal/Modal";
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
  panelFields: string[];
  getFieldLabel: (field: string) => string;
  getFieldRawValue: (field: string) => unknown;
  getFieldValue: (field: string) => string;
  getFieldType: (field: string) => "number" | "text" | "list";
  getFieldUnit: (field: string) => string;
  onOpenFieldConfig: (field: string) => void;
  onAddField: () => void;
  onRemoveField: (field: string) => void;
};

export function DeviceDataPanel<T extends string>({
  displayMode,
  options,
  onDisplayChange,
  disabled,
  readOnly = false,
  subtitle,
  panelFields,
  getFieldLabel,
  getFieldRawValue,
  getFieldValue,
  getFieldType,
  getFieldUnit,
  onOpenFieldConfig,
  onAddField,
  onRemoveField,
}: DeviceDataPanelProps<T>) {
  const [activeMenuField, setActiveMenuField] = useState<string | null>(null);
  const [activeListField, setActiveListField] = useState<string | null>(null);

  const listModalItems = useMemo(() => {
    if (!activeListField) return [];
    const rawValue = getFieldRawValue(activeListField);
    if (Array.isArray(rawValue)) {
      return rawValue.map((item) => String(item));
    }
    if (rawValue && typeof rawValue === "object") {
      return Object.entries(rawValue as Record<string, unknown>).map(([key, value]) =>
        typeof value === "number" ? `${key} (${value})` : `${key}: ${String(value)}`
      );
    }
    if (typeof rawValue === "string" && rawValue.trim()) {
      return [rawValue];
    }
    return [];
  }, [activeListField, getFieldRawValue]);

  useEffect(() => {
    if (!activeMenuField) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest(`[data-field-menu="${activeMenuField}"]`)) return;
      setActiveMenuField(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [activeMenuField]);

  useEffect(() => {
    if (activeMenuField && !panelFields.includes(activeMenuField)) {
      setActiveMenuField(null);
    }
  }, [activeMenuField, panelFields]);

  useEffect(() => {
    if (activeListField && !panelFields.includes(activeListField)) {
      setActiveListField(null);
    }
  }, [activeListField, panelFields]);

  const getListCount = (rawValue: unknown) => {
    if (Array.isArray(rawValue)) {
      return rawValue.length;
    }
    if (rawValue && typeof rawValue === "object") {
      return Object.values(rawValue as Record<string, unknown>).reduce<number>((sum, value) => {
        if (typeof value === "number") return sum + value;
        return sum + 1;
      }, 0);
    }
    if (typeof rawValue === "string" && rawValue.trim()) {
      return 1;
    }
    return 0;
  };

  const renderFieldValue = (field: string) => {
    const fieldType = getFieldType(field);
    if (fieldType !== "list") {
      return getFieldValue(field);
    }
    const rawValue = getFieldRawValue(field);
    const unit = getFieldUnit(field);
    const count = getListCount(rawValue);
    const display = unit ? `${count} ${unit}` : String(count);
    return <span className={styles["device-data-list-value"]}>{display}</span>;
  };

  return (
    <div className={styles["device-data-panel"]}>
      <div className={styles["device-data-panel-header"]}>
        <div>
          <h2>Data Panel</h2>
          <span className={styles["device-data-panel-subtitle"]}>{subtitle}</span>
        </div>
        <div className={styles["device-data-panel-controls"]}>
          {!readOnly && (
            <Button
              onClick={onAddField}
              disabled={disabled}
              className={styles["device-data-panel-control-button"]}
            >
              Add field
            </Button>
          )}
          <DropdownSelect
            id="device-dashboard-display"
            value={displayMode}
            options={options}
            onChange={onDisplayChange}
            disabled={disabled}
          />
        </div>
      </div>

      {panelFields.length === 0 ? (
        <div className={styles["device-data-empty"]}>
          <p>No data fields configured yet.</p>
        </div>
      ) : (
        <div className={styles["device-data-grid"]}>
          {panelFields.map((field) => {
            const fieldType = getFieldType(field);
            const canOpenMenu = !readOnly || fieldType === "list";
            return (
            <div key={field} className={styles["device-data-card"]}>
              {canOpenMenu && (
                <div className={styles["device-data-card-actions"]} data-field-menu={field}>
                  <button
                    type="button"
                    className={`${styles["device-data-settings"]} ${
                      activeMenuField === field ? styles["device-data-settings-active"] : ""
                    }`}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveMenuField((prev) => (prev === field ? null : field));
                    }}
                    aria-label={`Field options for ${field}`}
                  >
                    <FaCog />
                  </button>
                  {activeMenuField === field && (
                    <div
                      className={styles["device-data-menu"]}
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      {fieldType === "list" && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuField(null);
                            setActiveListField(field);
                          }}
                          disabled={getListCount(getFieldRawValue(field)) === 0}
                        >
                          View details
                        </button>
                      )}
                      {!readOnly && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuField(null);
                              onOpenFieldConfig(field);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className={styles["device-data-menu-remove"]}
                            onClick={() => {
                              setActiveMenuField(null);
                              onRemoveField(field);
                            }}
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                )}
                <span className={styles["device-data-label"]}>{getFieldLabel(field)}</span>
                <span className={styles["device-data-value"]}>{renderFieldValue(field)}</span>
            </div>
          )})}
        </div>
      )}

      <Modal
        isOpen={!!activeListField}
        onClose={() => setActiveListField(null)}
        title={
          activeListField
            ? `${getFieldLabel(activeListField)} details`
            : "Field details"
        }
        footer={
          <Button type="button" variant="cancel" onClick={() => setActiveListField(null)}>
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
                <li key={`${activeListField}-detail-${index}`}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </div>
  );
}
