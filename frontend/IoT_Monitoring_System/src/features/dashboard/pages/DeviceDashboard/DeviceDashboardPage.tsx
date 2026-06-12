import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";
import { wsManager } from "@/services/ws";
import { DeviceDashboardHeader } from "../../components/DeviceDashboardHeader/DeviceDashboardHeader";
import { DeviceDashboardMeta } from "../../components/DeviceDashboardMeta/DeviceDashboardMeta";
import { DeviceDataPanel } from "../../components/DeviceDataPanel/DeviceDataPanel";
import { DeviceDataChart } from "../../components/DeviceDataChart/DeviceDataChart";
import { DeviceAlertRulesPanel } from "../../components/DeviceAlertRulesPanel/DeviceAlertRulesPanel";
import { useDeviceDashboard } from "./hooks/useDeviceDashboard";
import { DeviceDashboardPageModals } from "./DeviceDashboardPageModals";
import styles from "./DeviceDashboardPage.module.css";
import formStyles from "../../components/DashboardForm/DashboardForm.module.css";
import badgeStyles from "../../styles/StatusBadge.module.css";

const DATA_FIELD_TYPE_OPTIONS: Array<{ value: "number" | "text" | "list" | "boolean"; label: string }> = [
  { value: "number", label: "Numeric" },
  { value: "text", label: "Text" },
  { value: "list", label: "List" },
  { value: "boolean", label: "Boolean" },
];

export function DeviceDashboardPage() {
  const { deviceUid } = useParams<{ deviceUid: string }>();
  const { user } = useAuth();
  const normalizedRole = String(user?.role ?? "").trim().toLowerCase();
  const isReadOnly = normalizedRole === "user";
  const canEdit = !isReadOnly;
  const canManageAlertRules = normalizedRole === "superuser";
  const canControlOutput = Boolean(user);
  const noop = () => {};
  const dashboard = useDeviceDashboard(deviceUid);
  const { device: deviceState, display, panel, chart, alertRules } = dashboard;
  const {
    data: device,
    loading: deviceLoading,
    error: deviceError,
    status: deviceStatus,
    lastUpdate,
    lastUpdateLabel,
  } = deviceState;
  const { mode: displayMode, setMode: setDisplayMode, options: displayOptions } = display;
  const handleOutputSend = useCallback(
    (field: string, value: string | number | boolean) => {
      if (!canControlOutput || !device) return;
      const customer = device.customer_name?.trim().toLowerCase() || "";
      const department = device.department_name?.trim().toLowerCase() || "";
      const uid = device.uid?.trim() || "";
      const key = field.trim();
      if (!customer || !department || !uid || !key) return;
      const receiveKey = `device-receive:${customer}/${department}/${uid}`;
      const payloadValue = typeof value === "boolean" ? (value ? "true" : "false") : value;
      wsManager.sendStream(receiveKey, { [key]: payloadValue });
    },
    [canControlOutput, device?.customer_name, device?.department_name, device?.uid]
  );
  const getChartRawValue = useCallback(
    (field: string) => {
      const chartLiveData = chart.liveData;
      if (chartLiveData && Object.prototype.hasOwnProperty.call(chartLiveData, field)) {
        return chartLiveData[field];
      }
      if (chartLiveData && panel.getters.getFieldType(field) === "list") {
        return undefined;
      }
      return panel.getters.getFieldRawValue(field);
    },
    [chart.liveData, panel.getters.getFieldRawValue, panel.getters.getFieldType]
  );

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

  const panelProps = {
    displayMode,
    options: displayOptions,
    onDisplayChange: setDisplayMode,
    readOnly: isReadOnly,
    subtitle: panel.data.subtitle,
    panelFields: panel.data.fields,
    panelLayout: panel.data.layout,
    panelSections: panel.data.sections,
    getFieldLabel: panel.getters.getFieldLabel,
    getFieldSectionId: panel.getters.getFieldSectionId,
    getFieldRawValue: panel.getters.getFieldRawValue,
    getFieldValue: panel.getters.getDisplayValue,
    getFieldBooleanDisplay: panel.getters.getFieldBooleanDisplay,
    getFieldType: panel.getters.getFieldType,
    getFieldUnit: panel.getters.getFieldUnit,
    getFieldColor: panel.getters.getFieldColor,
    getFieldCaseColors: panel.getters.getFieldCaseColors,
    onOpenFieldConfig: canEdit ? panel.actions.openFieldConfig : noop,
    onAddField: canEdit ? panel.actions.openAddField : noop,
    onDuplicateField: canEdit ? panel.actions.duplicateField : undefined,
    onRemoveField: canEdit ? panel.actions.removeField : noop,
    onAddSection: canEdit ? panel.actions.addSection : noop,
    onRenameSection: canEdit ? panel.actions.renameSection : noop,
    onDeleteSection: canEdit ? panel.actions.deleteSection : noop,
    onToggleSection: panel.actions.toggleSection,
    onStartEdit: canEdit ? panel.actions.beginEdit : undefined,
    onCancelEdit: canEdit ? panel.actions.cancelEdit : undefined,
    onSaveLayout: canEdit ? panel.actions.saveLayout : undefined,
    layoutSaving: panel.layoutStatus.saving,
    layoutError: panel.layoutStatus.error,
  };

  const chartProps = {
    displayMode,
    options: displayOptions,
    onDisplayChange: setDisplayMode,
    deviceUid: device?.uid ?? "",
    dataIntervalSeconds: device?.data_interval,
    readOnly: isReadOnly,
    allowOutputControl: canControlOutput,
    availableFields: panel.data.fields,
    getChartValue: getChartRawValue,
    getChartUnit: panel.getters.getFieldUnit,
    getChartLabel: panel.getters.getFieldLabel,
    getChartType: panel.getters.getFieldType,
    getChartColor: panel.getters.getFieldColor,
    getChartCases: panel.getters.getFieldCases,
    getChartCaseColors: panel.getters.getFieldCaseColors,
    getChartBooleanColors: panel.getters.getFieldBooleanColors,
    getChartBooleanLabels: panel.getters.getFieldBooleanLabels,
    onOutputSend: handleOutputSend,
    onFilterModeChange: chart.setFilterMode,
    rawTimestamp: lastUpdate,
    savedCharts: chart.items,
    savedLayout: chart.layout,
    savedSections: chart.sections,
    onSave: canEdit ? chart.save : undefined,
    saving: chart.saving,
    saveError: chart.error,
  };

  const alertRulesProps = {
    displayMode,
    options: displayOptions,
    onDisplayChange: setDisplayMode,
    deviceId: device?.id,
    availableFields: panel.data.fields,
    getFieldLabel: panel.getters.getFieldLabel,
    getFieldType: panel.getters.getFieldType,
    getFieldCases: panel.getters.getFieldCases,
    getFieldBooleanLabels: panel.getters.getFieldBooleanLabels,
    readOnly: !canManageAlertRules,
    rules: alertRules.items,
    adding: alertRules.adding,
    updating: alertRules.updating,
    deleting: alertRules.deleting,
    addError: alertRules.error,
    onAddRule: canManageAlertRules ? alertRules.add : undefined,
    onUpdateRule: canManageAlertRules ? alertRules.update : undefined,
    onDeleteRule: canManageAlertRules ? alertRules.remove : undefined,
  };

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
        <DeviceDataPanel {...panelProps} />
      )}

      {device && displayMode === "data_chart" && (
        <DeviceDataChart {...chartProps} />
      )}

      {device && displayMode === "alert_rules" && (
        <DeviceAlertRulesPanel {...alertRulesProps} />
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

