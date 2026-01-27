import { useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";
import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { DeviceDashboardHeader } from "../components/DeviceDashboardHeader";
import { DeviceDashboardMeta } from "../components/DeviceDashboardMeta";
import { DeviceDataPanel } from "../components/DeviceDataPanel";
import { DeviceDataChart } from "../components/DeviceDataChart";
import { useDeviceDashboard } from "../hooks/useDeviceDashboard";
import styles from "../styles/dashboard.module.css";

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
    panelSubtitle,
    showGenerate,
    panelLoading,
    panelError,
    getFieldRawValue,
    getFieldLabel,
    getDisplayValue,
    getFieldUnit,
    openFieldConfig,
    handleGeneratePanel,
    chartItems,
    chartLayout,
    chartSaving,
    chartError,
    saveChartConfig,
    editingField,
    editLabel,
    setEditLabel,
    editUnit,
    setEditUnit,
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
        subtitle={device ? `${device.name} - ${device.uid}` : "Device telemetry"}
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
          showGenerate={showGenerate}
          panelLoading={panelLoading}
          panelError={panelError}
          onGenerate={isReadOnly ? () => {} : handleGeneratePanel}
          panelFields={panelFields}
          getFieldLabel={getFieldLabel}
          getFieldValue={getDisplayValue}
          onOpenFieldConfig={isReadOnly ? () => {} : openFieldConfig}
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
              id="device-field-label"
              label="Label"
              placeholder="Enter Data Name"
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
    </div>
  );
}
