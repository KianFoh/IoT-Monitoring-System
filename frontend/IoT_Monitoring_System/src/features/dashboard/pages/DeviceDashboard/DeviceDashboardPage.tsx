import { useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";
import { DeviceDashboardHeader } from "../../components/DeviceDashboardHeader/DeviceDashboardHeader";
import { DeviceDashboardMeta } from "../../components/DeviceDashboardMeta/DeviceDashboardMeta";
import { DeviceDataPanel } from "../../components/DeviceDataPanel/DeviceDataPanel";
import { DeviceDataChart } from "../../components/DeviceDataChart/DeviceDataChart";
import { useDeviceDashboard } from "./hooks/useDeviceDashboard";
import { DeviceDashboardPageModals } from "./DeviceDashboardPageModals";
import styles from "./DeviceDashboardPage.module.css";
import formStyles from "../../components/DashboardForm/DashboardForm.module.css";
import badgeStyles from "../../styles/StatusBadge.module.css";

const DATA_FIELD_TYPE_OPTIONS: Array<{ value: "number" | "text" | "list"; label: string }> = [
  { value: "number", label: "Numeric" },
  { value: "text", label: "Text" },
  { value: "list", label: "List" },
];

export function DeviceDashboardPage() {
  const { deviceUid } = useParams<{ deviceUid: string }>();
  const { user } = useAuth();
  const isReadOnly = user?.role === "user";
  const canEdit = !isReadOnly;
  const noop = () => {};
  const dashboard = useDeviceDashboard(deviceUid);
  const { device: deviceState, display, panel, chart } = dashboard;
  const {
    data: device,
    loading: deviceLoading,
    error: deviceError,
    status: deviceStatus,
    lastUpdateLabel,
  } = deviceState;
  const { mode: displayMode, setMode: setDisplayMode, options: displayOptions } = display;

  const statusClass =
    deviceStatus === "online"
      ? badgeStyles["online"]
      : deviceStatus === "offline"
        ? badgeStyles["offline"]
        : "";
  const statusBadge = deviceStatus ? (
    <span className={`${badgeStyles["dashboard-status-badge"]} ${statusClass}`}>{deviceStatus}</span>
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
        backLabel="Back"
        useHistoryBack
      />

      {deviceLoading && <p>Loading device...</p>}
      {deviceError && <p className={formStyles["dashboard-modal-error"]}>{deviceError}</p>}

      {device && <DeviceDashboardMeta items={metaItems} />}

      {device && displayMode === "data_panel" && (
        <DeviceDataPanel
          displayMode={displayMode}
          options={displayOptions}
          onDisplayChange={setDisplayMode}
          readOnly={isReadOnly}
          subtitle={panel.panelSubtitle}
          panelFields={panel.panelFields}
          panelLayout={panel.panelLayout}
          panelSections={panel.panelSections}
          getFieldLabel={panel.getFieldLabel}
          getFieldSectionId={panel.getFieldSectionId}
          getFieldRawValue={panel.getFieldRawValue}
          getFieldValue={panel.getDisplayValue}
          getFieldType={panel.getFieldType}
          getFieldUnit={panel.getFieldUnit}
          onOpenFieldConfig={canEdit ? panel.openFieldConfig : noop}
          onAddField={canEdit ? panel.openAddField : noop}
          onRemoveField={canEdit ? panel.handleRemoveField : noop}
          onAddSection={canEdit ? panel.addSection : noop}
          onRenameSection={canEdit ? panel.renameSection : noop}
          onDeleteSection={canEdit ? panel.deleteSection : noop}
          onToggleSection={panel.toggleSection}
          onStartEdit={canEdit ? panel.beginPanelEdit : undefined}
          onCancelEdit={canEdit ? panel.cancelPanelEdit : undefined}
          onSaveLayout={canEdit ? panel.savePanelLayout : undefined}
          layoutSaving={panel.panelLayoutSaving}
          layoutError={panel.panelLayoutError}
        />
      )}

      {device && displayMode === "data_chart" && (
        <DeviceDataChart
          displayMode={displayMode}
          options={displayOptions}
          onDisplayChange={setDisplayMode}
          readOnly={isReadOnly}
          availableFields={panel.panelFields}
          getChartValue={panel.getFieldRawValue}
          getChartUnit={panel.getFieldUnit}
          savedCharts={chart.items}
          savedLayout={chart.layout}
          savedSections={chart.sections}
          onSave={canEdit ? chart.save : undefined}
          saving={chart.saving}
          saveError={chart.error}
        />
      )}

      {canEdit && (
        <DeviceDashboardPageModals
          modalState={{
            panel,
            fieldTypeOptions: DATA_FIELD_TYPE_OPTIONS,
          }}
        />
      )}
    </div>
  );
}

