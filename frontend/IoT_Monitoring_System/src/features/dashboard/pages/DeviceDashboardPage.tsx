import { useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";
import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { DeviceDashboardHeader } from "../components/DeviceDashboardHeader";
import { DeviceDashboardMeta } from "../components/DeviceDashboardMeta";
import { DeviceDataPanel } from "../components/DeviceDataPanel";
import { DeviceDataChart } from "../components/DeviceDataChart";
import DropdownSelect from "../components/DropdownSelect";
import { useDeviceDashboard } from "../hooks/useDeviceDashboard";
import styles from "../styles/dashboard.module.css";

const DATA_FIELD_TYPE_OPTIONS: Array<{ value: "number" | "text" | "list"; label: string }> = [
  { value: "number", label: "Numeric" },
  { value: "text", label: "Text" },
  { value: "list", label: "List" },
];

export function DeviceDashboardPage() {
  const { deviceUid } = useParams<{ deviceUid: string }>();
  const { user } = useAuth();
  const isReadOnly = user?.role === "user";
  const {
    device,
    deviceLoading,
    deviceError,
    deviceStatus,
    displayMode,
    setDisplayMode,
    displayOptions,
    panelFields,
    panelLayout,
    panelSections,
    panelSubtitle,
    getFieldRawValue,
    getFieldLabel,
    getDisplayValue,
    getFieldUnit,
    getFieldType,
    getFieldSectionId,
    addSection,
    renameSection,
    deleteSection,
    toggleSection,
    beginPanelEdit,
    cancelPanelEdit,
    savePanelLayout,
    panelLayoutSaving,
    panelLayoutError,
    openFieldConfig,
    handleRemoveField,
    isAddFieldOpen,
    openAddField,
    closeAddField,
    newFieldKey,
    setNewFieldKey,
    newFieldLabel,
    setNewFieldLabel,
    newFieldUnit,
    setNewFieldUnit,
    newFieldType,
    setNewFieldType,
    addFieldError,
    addFieldSaving,
    handleAddField,
    chartItems,
    chartLayout,
    chartSections,
    chartSaving,
    chartError,
    saveChartConfig,
    editingField,
    editLabel,
    setEditLabel,
    editUnit,
    setEditUnit,
    editType,
    setEditType,
    closeFieldConfig,
    handleSaveConfig,
    configSaving,
    configError,
    lastUpdateLabel,
  } = useDeviceDashboard(deviceUid);

  const statusClass =
    deviceStatus === "online"
      ? styles["online"]
      : deviceStatus === "offline"
        ? styles["offline"]
        : "";
  const statusBadge = deviceStatus ? (
    <span className={`${styles["dashboard-status-badge"]} ${statusClass}`}>{deviceStatus}</span>
  ) : (
    "--"
  );
  const metaItems = device
    ? isReadOnly
      ? [
          { label: "UID", value: device.uid },
          { label: "Device Name", value: device.name || "Unknown" },
          { label: "Machine", value: device.machine || "Unknown" },
          { label: "Status", value: statusBadge },
          { label: "Data Interval", value: `${device.data_interval}s` },
          { label: "Last Update", value: lastUpdateLabel },
        ]
      : [
          { label: "Customer", value: device.customer_name || "Unknown" },
          { label: "Department", value: device.department_name || "Unknown" },
          { label: "UID", value: device.uid },
          { label: "Status", value: statusBadge },
          { label: "Data Interval", value: `${device.data_interval}s` },
          { label: "Last Update", value: lastUpdateLabel },
        ]
    : [];

  return (
    <div className={styles["devices-container"]}>
      <DeviceDashboardHeader
        title="Device Dashboard"
        backHref="/dashboard/devices"
        backLabel="Back"
        useHistoryBack
      />

      {deviceLoading && <p>Loading device...</p>}
      {deviceError && <p className={styles["dashboard-modal-error"]}>{deviceError}</p>}

      {device && <DeviceDashboardMeta items={metaItems} />}

      {device && displayMode === "data_panel" && (
        <DeviceDataPanel
          displayMode={displayMode}
          options={displayOptions}
          onDisplayChange={setDisplayMode}
          disabled={!device}
          readOnly={isReadOnly}
          subtitle={panelSubtitle}
          panelFields={panelFields}
          panelLayout={panelLayout}
          panelSections={panelSections}
          getFieldLabel={getFieldLabel}
          getFieldSectionId={getFieldSectionId}
          getFieldRawValue={getFieldRawValue}
          getFieldValue={getDisplayValue}
          getFieldType={getFieldType}
          getFieldUnit={getFieldUnit}
          onOpenFieldConfig={isReadOnly ? () => {} : openFieldConfig}
          onAddField={isReadOnly ? () => {} : openAddField}
          onRemoveField={isReadOnly ? () => {} : handleRemoveField}
          onAddSection={isReadOnly ? () => {} : addSection}
          onRenameSection={isReadOnly ? () => {} : renameSection}
          onDeleteSection={isReadOnly ? () => {} : deleteSection}
          onToggleSection={toggleSection}
          onStartEdit={isReadOnly ? undefined : beginPanelEdit}
          onCancelEdit={isReadOnly ? undefined : cancelPanelEdit}
          onSaveLayout={isReadOnly ? undefined : savePanelLayout}
          layoutSaving={panelLayoutSaving}
          layoutError={panelLayoutError}
        />
      )}

      {device && displayMode === "data_chart" && (
        <DeviceDataChart
          displayMode={displayMode}
          options={displayOptions}
          onDisplayChange={setDisplayMode}
          disabled={!device}
          readOnly={isReadOnly}
          availableFields={panelFields}
          getChartValue={getFieldRawValue}
          getChartUnit={getFieldUnit}
          savedCharts={chartItems}
          savedLayout={chartLayout}
          savedSections={chartSections}
          onSave={isReadOnly ? undefined : saveChartConfig}
          saving={chartSaving}
          saveError={chartError}
        />
      )}

      {!isReadOnly && (
        <Modal
          isOpen={!!editingField}
          onClose={closeFieldConfig}
          title={editingField ? `Configure ${editingField}` : "Configure field"}
        >
          <div className={styles["dashboard-modal-form"]}>
            <Input
              id="device-field-key"
              label="Data key"
              placeholder="Enter data key"
              value={editingField ?? ""}
              disabled
            />
            <Input
              id="device-field-label"
              label="Data label"
              placeholder="Enter display label"
              value={editLabel}
              onChange={(event) => setEditLabel(event.target.value)}
            />
            <Input
              id="device-field-unit"
              label="Unit"
              placeholder="Enter Unit"
              value={editUnit}
              onChange={(event) => setEditUnit(event.target.value)}
            />
            <DropdownSelect
              id="device-field-type"
              label="Field type"
              value={editType}
              options={DATA_FIELD_TYPE_OPTIONS}
              onChange={(value) => setEditType(value)}
            />
            {configError && <p className={styles["dashboard-modal-error"]}>{configError}</p>}
            <div className={styles["dashboard-modal-actions"]}>
              <Button type="button" variant="cancel" onClick={closeFieldConfig} disabled={configSaving}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSaveConfig} isLoading={configSaving}>
                Save
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {!isReadOnly && (
        <Modal isOpen={isAddFieldOpen} onClose={closeAddField} title="Add data field">
          <div className={styles["dashboard-modal-form"]}>
            <Input
              id="device-data-field-key"
              label="Data key"
              placeholder="e.g. temperature"
              value={newFieldKey}
              onChange={(event) => setNewFieldKey(event.target.value)}
            />
            <Input
              id="device-data-field-label"
              label="Data label"
              placeholder="e.g. Temperature"
              value={newFieldLabel}
              onChange={(event) => setNewFieldLabel(event.target.value)}
            />
            <Input
              id="device-data-field-unit"
              label="Unit (optional)"
              placeholder="e.g. °C"
              value={newFieldUnit}
              onChange={(event) => setNewFieldUnit(event.target.value)}
            />
            <DropdownSelect
              id="device-data-field-type"
              label="Field type"
              value={newFieldType}
              options={DATA_FIELD_TYPE_OPTIONS}
              onChange={(value) => setNewFieldType(value)}
            />
            {addFieldError && <p className={styles["dashboard-modal-error"]}>{addFieldError}</p>}
            <div className={styles["dashboard-modal-actions"]}>
              <Button type="button" variant="cancel" onClick={closeAddField} disabled={addFieldSaving}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAddField}
                isLoading={addFieldSaving}
                disabled={!newFieldKey.trim()}
              >
                Add field
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
