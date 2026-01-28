import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { devicesApi } from "../api/devicesApi";
import type { DataFieldType, Device } from "@/types/device";
import { type DevicePayload, formatValue } from "./deviceDashboardUtils";

type DataPanelConfig = Record<string, { label?: string; unit?: string; type?: DataFieldType }>;

type UseDeviceDataPanelParams = {
  device: Device | null;
  deviceUid?: string;
  liveData: DevicePayload | null;
  onDeviceUpdate?: (device: Device) => void;
};

type ChartItemConfig = NonNullable<Device["dashboard_config"]>["data_chart_items"];
type ChartLayoutConfig = NonNullable<Device["dashboard_config"]>["data_chart_layout"];

const cleanPanelConfig = (fields: string[], config: DataPanelConfig) => {
  const nextEntries = Object.entries(config).filter(([key]) => fields.includes(key));
  return Object.fromEntries(nextEntries);
};

const sanitizeChartLayout = (
  layout: Array<{
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
  }> | undefined
) =>
  layout
    ? layout.map((item) => ({
        i: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        minW: item.minW,
        minH: item.minH,
      }))
    : undefined;

export function useDeviceDataPanel({
  device,
  deviceUid,
  liveData,
  onDeviceUpdate,
}: UseDeviceDataPanelParams) {
  const queryClient = useQueryClient();
  const [panelFields, setPanelFields] = useState<string[]>([]);
  const [panelConfig, setPanelConfig] = useState<DataPanelConfig>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editType, setEditType] = useState<DataFieldType>("number");
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldUnit, setNewFieldUnit] = useState("");
  const [newFieldType, setNewFieldType] = useState<DataFieldType>("number");
  const [addFieldError, setAddFieldError] = useState<string | null>(null);
  const [addFieldSaving, setAddFieldSaving] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    setPanelFields([]);
    setPanelConfig({});
    setEditingField(null);
    setEditLabel("");
    setEditUnit("");
    setEditType("number");
    setIsAddFieldOpen(false);
    setNewFieldKey("");
    setNewFieldLabel("");
    setNewFieldUnit("");
    setNewFieldType("number");
    setAddFieldError(null);
    setAddFieldSaving(false);
    setConfigSaving(false);
    setConfigError(null);
  }, [deviceUid]);

  useEffect(() => {
    if (!device) return;
    setPanelFields(device.dashboard_config?.data_panel_fields ?? []);
    setPanelConfig(device.dashboard_config?.data_panel_config ?? {});
  }, [device]);

  const updateMutation = useMutation({
    mutationFn: (payload: {
      dashboard_config: {
        data_panel_fields?: string[];
        data_panel_config?: DataPanelConfig;
        data_chart_items?: ChartItemConfig;
        data_chart_layout?: ChartLayoutConfig;
      };
    }) => {
      if (!device) {
        throw new Error("Device not loaded");
      }
      const currentConfig = device.dashboard_config ?? {};
      const sanitizedChartLayout = sanitizeChartLayout(currentConfig.data_chart_layout);
      const nextPanelFields =
        payload.dashboard_config.data_panel_fields ?? currentConfig.data_panel_fields;
      const nextPanelConfig =
        payload.dashboard_config.data_panel_config ?? currentConfig.data_panel_config;
      const nextChartItems =
        payload.dashboard_config.data_chart_items ?? currentConfig.data_chart_items;
      const nextChartLayout = sanitizeChartLayout(
        payload.dashboard_config.data_chart_layout ?? sanitizedChartLayout
      );
      return devicesApi.update(device.id, {
        dashboard_config: {
          data_panel_fields: nextPanelFields,
          data_panel_config: nextPanelConfig,
          data_chart_items: nextChartItems,
          data_chart_layout: nextChartLayout,
        },
      });
    },
    onSuccess: (updated) => {
      setPanelFields(updated.dashboard_config?.data_panel_fields ?? []);
      setPanelConfig(updated.dashboard_config?.data_panel_config ?? {});
      onDeviceUpdate?.(updated);
      if (deviceUid) {
        queryClient.setQueryData(["devices", "by-uid", deviceUid], updated);
      }
    },
  });

  const getFieldValue = (field: string) => {
    if (liveData && Object.prototype.hasOwnProperty.call(liveData, field)) {
      return liveData[field];
    }
    return undefined;
  };

  const getFieldRawValue = (field: string) => getFieldValue(field);
  const getFieldLabel = (field: string) => panelConfig[field]?.label?.trim() || field;
  const getFieldUnit = (field: string) => panelConfig[field]?.unit?.trim() || "";
  const getFieldType = (field: string) => panelConfig[field]?.type ?? "text";

  const getDisplayValue = (field: string) => {
    const value = formatValue(getFieldValue(field));
    const unit = getFieldUnit(field);
    if (!unit || value === "--") return value;
    return `${value} ${unit}`;
  };

  const openFieldConfig = (field: string) => {
    setEditingField(field);
    setEditLabel(panelConfig[field]?.label?.trim() || field);
    setEditUnit(panelConfig[field]?.unit?.trim() || "");
    setEditType(panelConfig[field]?.type ?? "number");
    setConfigError(null);
  };

  const closeFieldConfig = () => {
    setEditingField(null);
    setConfigError(null);
    setEditLabel("");
    setEditUnit("");
    setEditType("number");
  };

  const handleSaveConfig = async () => {
    if (!device || !editingField) return;
    setConfigSaving(true);
    setConfigError(null);
    const nextConfig: DataPanelConfig = {
      ...panelConfig,
      [editingField]: {
        label: editLabel.trim() || editingField,
        unit: editUnit.trim() || undefined,
        type: editType,
      },
    };
    const cleanedConfig = cleanPanelConfig(panelFields, nextConfig);
    try {
      await updateMutation.mutateAsync({
        dashboard_config: {
          data_panel_fields: panelFields,
          data_panel_config: cleanedConfig,
        },
      });
      setPanelConfig(cleanedConfig);
      setEditingField(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save field settings";
      setConfigError(message);
    } finally {
      setConfigSaving(false);
    }
  };

  const handleRemoveField = async (field: string) => {
    if (!device) return;
    if (!panelFields.includes(field)) return;
    const nextFields = panelFields.filter((item) => item !== field);
    const nextConfig: DataPanelConfig = { ...panelConfig };
    delete nextConfig[field];
    const cleanedConfig = cleanPanelConfig(nextFields, nextConfig);
    const currentConfig = device.dashboard_config ?? {};
    const existingCharts = (currentConfig.data_chart_items ?? []).slice();
    const remainingCharts = existingCharts.filter((chart) => {
      if (!chart) return false;
      if (chart.field === field) return false;
      if (Array.isArray(chart.fields) && chart.fields.includes(field)) return false;
      return true;
    });
    const existingLayout = currentConfig.data_chart_layout ?? [];
    const remainingLayout = existingLayout.filter((item) =>
      remainingCharts.some((chart) => chart.id === item.i)
    );
    try {
      await updateMutation.mutateAsync({
        dashboard_config: {
          data_panel_fields: nextFields,
          data_panel_config: cleanedConfig,
          data_chart_items: remainingCharts,
          data_chart_layout: remainingLayout,
        },
      });
      if (editingField === field) {
        closeFieldConfig();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to remove data field";
      setConfigError(message);
    }
  };

  const openAddField = () => {
    setIsAddFieldOpen(true);
    setAddFieldError(null);
  };

  const closeAddField = () => {
    setIsAddFieldOpen(false);
    setNewFieldKey("");
    setNewFieldLabel("");
    setNewFieldUnit("");
    setNewFieldType("number");
    setAddFieldError(null);
    setAddFieldSaving(false);
  };

  const handleAddField = async () => {
    if (!device) return;
    const trimmedKey = newFieldKey.trim();
    if (!trimmedKey) {
      setAddFieldError("Data key is required.");
      return;
    }
    const duplicate = panelFields.some(
      (field) => field.trim().toLowerCase() === trimmedKey.toLowerCase()
    );
    if (duplicate) {
      setAddFieldError("Data key already exists.");
      return;
    }

    setAddFieldSaving(true);
    setAddFieldError(null);
    const trimmedLabel = newFieldLabel.trim();
    const trimmedUnit = newFieldUnit.trim();
    const nextFields = [...panelFields, trimmedKey];
    const nextConfig: DataPanelConfig = {
      ...panelConfig,
      [trimmedKey]: {
        label: trimmedLabel || trimmedKey,
        unit: trimmedUnit || undefined,
        type: newFieldType,
      },
    };
    const cleanedConfig = cleanPanelConfig(nextFields, nextConfig);
    try {
      await updateMutation.mutateAsync({
        dashboard_config: {
          data_panel_fields: nextFields,
          data_panel_config: cleanedConfig,
        },
      });
      closeAddField();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add data field";
      setAddFieldError(message);
    } finally {
      setAddFieldSaving(false);
    }
  };

  const panelFieldsSorted = useMemo(() => panelFields.slice(), [panelFields]);
  const panelSubtitle = "List of device data";

  return {
    panelFields: panelFieldsSorted,
    panelSubtitle,
    getFieldRawValue,
    getFieldLabel,
    getDisplayValue,
    getFieldUnit,
    getFieldType,
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
  } as const;
}
