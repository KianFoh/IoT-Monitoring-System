import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { devicesApi } from "../api/devicesApi";
import type { Device } from "@/types/device";
import { type DevicePayload, extractPayloadInfo, formatValue } from "./deviceDashboardUtils";

type DataPanelConfig = Record<string, { label?: string; unit?: string }>;

type UseDeviceDataPanelParams = {
  device: Device | null;
  deviceUid?: string;
  liveData: DevicePayload | null;
  wsReady: boolean;
  onDeviceUpdate?: (device: Device) => void;
  onLastUpdate?: (timestamp: Date) => void;
};

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
  wsReady,
  onDeviceUpdate,
  onLastUpdate,
}: UseDeviceDataPanelParams) {
  const queryClient = useQueryClient();
  const [panelFields, setPanelFields] = useState<string[]>([]);
  const [panelConfig, setPanelConfig] = useState<DataPanelConfig>({});
  const [panelError, setPanelError] = useState<string | null>(null);
  const [latestSnapshot, setLatestSnapshot] = useState<DevicePayload | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [configSaving, setConfigSaving] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    setPanelFields([]);
    setPanelConfig({});
    setPanelError(null);
    setLatestSnapshot(null);
    setPanelLoading(false);
    setEditingField(null);
    setEditLabel("");
    setEditUnit("");
    setConfigSaving(false);
    setConfigError(null);
  }, [deviceUid]);

  useEffect(() => {
    if (!device) return;
    setPanelFields(device.dashboard_config?.data_panel_fields ?? []);
    setPanelConfig(device.dashboard_config?.data_panel_config ?? {});
  }, [device]);

  const latestQuery = useQuery<{ data: DevicePayload | null; timestamp: Date | null }, Error>({
    queryKey: ["devices", "latest", device?.uid],
    enabled: Boolean(device?.uid && panelFields.length > 0 && wsReady),
    queryFn: async () => {
      if (!device?.uid) return { data: null, timestamp: null };
      const latest = await devicesApi.latestData(device.uid);
      return extractPayloadInfo(latest);
    },
  });

  useEffect(() => {
    if (latestQuery.data?.timestamp && onLastUpdate) {
      onLastUpdate(latestQuery.data.timestamp);
    }
    if (latestQuery.data?.data) {
      setLatestSnapshot(latestQuery.data.data);
    }
  }, [latestQuery.data, onLastUpdate]);

  useEffect(() => {
    if (!latestQuery.error) return;
    const message = latestQuery.error instanceof Error ? latestQuery.error.message : "Failed to load latest device data";
    setPanelError(message);
  }, [latestQuery.error]);

  const updateMutation = useMutation({
    mutationFn: (payload: {
      dashboard_config: {
        data_panel_fields?: string[];
        data_panel_config?: DataPanelConfig;
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
      return devicesApi.update(device.id, {
        dashboard_config: {
          data_panel_fields: nextPanelFields,
          data_panel_config: nextPanelConfig,
          data_chart_items: currentConfig.data_chart_items,
          data_chart_layout: sanitizedChartLayout,
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
    if (latestSnapshot && Object.prototype.hasOwnProperty.call(latestSnapshot, field)) {
      return latestSnapshot[field];
    }
    return undefined;
  };

  const getFieldLabel = (field: string) => panelConfig[field]?.label?.trim() || field;
  const getFieldUnit = (field: string) => panelConfig[field]?.unit?.trim() || "";

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
    setConfigError(null);
  };

  const closeFieldConfig = () => {
    setEditingField(null);
    setConfigError(null);
    setEditLabel("");
    setEditUnit("");
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

  const handleGeneratePanel = async () => {
    if (!device) return;
    setPanelLoading(true);
    setPanelError(null);
    try {
      const latestResult = await latestQuery.refetch();
      const latestInfo = latestResult.data ?? { data: null, timestamp: null };
      const payload = latestInfo.data;
      if (!payload || Object.keys(payload).length === 0) {
        setPanelError("No data available for this device yet.");
        return;
      }

      const fields = Object.keys(payload);
      const cleanedConfig = cleanPanelConfig(fields, panelConfig);
      setPanelFields(fields);
      setLatestSnapshot(payload);
      if (latestInfo.timestamp && onLastUpdate) {
        onLastUpdate(latestInfo.timestamp);
      }
      setPanelConfig(cleanedConfig);

      await updateMutation.mutateAsync({
        dashboard_config: {
          data_panel_fields: fields,
          data_panel_config: cleanedConfig,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate data panel";
      setPanelError(message);
    } finally {
      setPanelLoading(false);
    }
  };

  const panelFieldsSorted = useMemo(() => panelFields.slice(), [panelFields]);
  const showGenerate = panelFields.length === 0;
  const panelSubtitle = showGenerate
    ? "Generate a panel from the latest payload."
    : "List of device data";

  return {
    panelFields: panelFieldsSorted,
    panelSubtitle,
    showGenerate,
    panelLoading,
    panelError,
    getFieldLabel,
    getDisplayValue,
    openFieldConfig,
    handleGeneratePanel,
    editingField,
    editLabel,
    setEditLabel,
    editUnit,
    setEditUnit,
    closeFieldConfig,
    handleSaveConfig,
    configSaving,
    configError,
  } as const;
}
