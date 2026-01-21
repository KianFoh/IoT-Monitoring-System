import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/context/AuthContext";
import { wsManager } from "@/services/ws";
import { devicesApi } from "../api/devicesApi";
import type { Device } from "@/types/device";

export type DisplayMode = "data_panel";

type DevicePayload = Record<string, unknown>;
type DataPanelConfig = Record<string, { label?: string; unit?: string }>;

const DISPLAY_OPTIONS: { value: DisplayMode; label: string }[] = [
  { value: "data_panel", label: "Data panel" },
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const parseTimestamp = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const extractPayloadInfo = (payload: unknown): { data: DevicePayload | null; timestamp: Date | null } => {
  if (!isRecord(payload)) return { data: null, timestamp: null };
  const payloadData = (payload as { data?: unknown }).data;
  const timestamp = parseTimestamp(
    (payload as { ts?: unknown; timestamp?: unknown }).ts ??
      (payload as { ts?: unknown; timestamp?: unknown }).timestamp
  );
  if (isRecord(payloadData)) {
    return { data: payloadData, timestamp };
  }
  const copy: DevicePayload = { ...payload };
  delete copy._id;
  delete copy.device_id;
  delete copy.ts;
  delete copy.timestamp;
  return { data: Object.keys(copy).length ? copy : null, timestamp };
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined) return "--";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const cleanPanelConfig = (fields: string[], config: DataPanelConfig) => {
  const nextEntries = Object.entries(config).filter(([key]) => fields.includes(key));
  return Object.fromEntries(nextEntries);
};

export function useDeviceDashboard(deviceUid?: string) {
  const { access_token } = useAuth();
  const queryClient = useQueryClient();
  const [device, setDevice] = useState<Device | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("data_panel");
  const [panelFields, setPanelFields] = useState<string[]>([]);
  const [panelConfig, setPanelConfig] = useState<DataPanelConfig>({});
  const [panelError, setPanelError] = useState<string | null>(null);
  const [latestSnapshot, setLatestSnapshot] = useState<DevicePayload | null>(null);
  const [liveData, setLiveData] = useState<DevicePayload | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [wsStatus, setWsStatus] = useState<"idle" | "connecting" | "connected" | "failed">("idle");
  const [deviceStatus, setDeviceStatus] = useState<"online" | "offline" | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [configSaving, setConfigSaving] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    setDevice(null);
    setPanelFields([]);
    setPanelConfig({});
    setPanelError(null);
    setLatestSnapshot(null);
    setLiveData(null);
    setLastUpdate(null);
    setWsStatus("idle");
    setDeviceStatus(null);
    setPanelLoading(false);
    setEditingField(null);
    setEditLabel("");
    setEditUnit("");
    setConfigSaving(false);
    setConfigError(null);
  }, [deviceUid]);

  const deviceQuery = useQuery<Device | null, Error>({
    queryKey: ["devices", "by-uid", deviceUid],
    enabled: !!deviceUid,
    queryFn: async () => {
      if (!deviceUid) return null;
      const response = await devicesApi.list({ page: 1, page_size: 100, search: deviceUid });
      const normalized = deviceUid.trim().toLowerCase();
      const match = response.items.find((item) => item.uid.toLowerCase() === normalized);
      return match ?? null;
    },
  });

  useEffect(() => {
    if (deviceQuery.data) {
      setDevice(deviceQuery.data);
      setPanelFields(deviceQuery.data.dashboard_config?.data_panel_fields ?? []);
      setPanelConfig(deviceQuery.data.dashboard_config?.data_panel_config ?? {});
      if (typeof deviceQuery.data.is_online === "boolean") {
        setDeviceStatus(deviceQuery.data.is_online ? "online" : "offline");
      }
      return;
    }
    if (deviceQuery.isSuccess) {
      setDevice(null);
      setDeviceStatus(null);
    }
  }, [deviceQuery.data, deviceQuery.isSuccess]);

  const deviceError = useMemo(() => {
    if (!deviceUid) return "Missing device UID.";
    if (deviceQuery.error) return deviceQuery.error.message;
    if (!deviceQuery.isPending && deviceQuery.isSuccess && !deviceQuery.data) return "Device not found.";
    return null;
  }, [deviceUid, deviceQuery.error, deviceQuery.isPending, deviceQuery.isSuccess, deviceQuery.data]);

  useEffect(() => {
    const customer = device?.customer_name?.trim().toLowerCase();
    const department = device?.department_name?.trim().toLowerCase();
    const uid = device?.uid;
    if (!access_token || !customer || !department || !uid) return;

    const streamKey = `device:${customer}/${department}/${uid}`;
    const path = `/ws/devices/${encodeURIComponent(customer)}/${encodeURIComponent(department)}/${encodeURIComponent(uid)}`;
    let cancelled = false;
    setWsStatus("connecting");

    const unsubscribe = wsManager.onStream(streamKey, (payload: unknown) => {
      if (cancelled) return;
      const { data, timestamp } = extractPayloadInfo(payload);
      if (timestamp) {
        setLastUpdate((prev) => (!prev || timestamp > prev ? timestamp : prev));
      }
      if (data) {
        setLiveData(data);
      }
    });

    wsManager
      .connectStream(streamKey, path)
      .then(() => {
        if (!cancelled) setWsStatus("connected");
      })
      .catch(() => {
        if (!cancelled) setWsStatus("failed");
      });

    return () => {
      cancelled = true;
      unsubscribe();
      wsManager.disconnectStream(streamKey);
      setWsStatus("idle");
    };
  }, [access_token, device?.customer_name, device?.department_name, device?.uid]);

  useEffect(() => {
    const customer = device?.customer_name?.trim().toLowerCase();
    const department = device?.department_name?.trim().toLowerCase();
    const uid = device?.uid;
    if (!access_token || !customer || !department || !uid) return;

    const streamKey = `device-status:${customer}/${department}/${uid}`;
    const path = `/ws/devices/${encodeURIComponent(customer)}/${encodeURIComponent(department)}/${encodeURIComponent(uid)}/status`;
    let cancelled = false;

    const unsubscribe = wsManager.onStream(streamKey, (payload: unknown) => {
      if (cancelled) return;
      if (!payload) return;
      if (typeof payload === "string") {
        const statusText = payload.toLowerCase();
        if (statusText === "online" || statusText === "offline") {
          setDeviceStatus(statusText);
        }
        return;
      }
      if (!isRecord(payload)) return;
      const statusValue = typeof payload.status === "string" ? payload.status.toLowerCase() : null;
      if (statusValue !== "online" && statusValue !== "offline") return;
      if (payload.uid && payload.uid !== uid) return;
      setDeviceStatus(statusValue);
    });

    wsManager.connectStream(streamKey, path).catch(() => {});

    return () => {
      cancelled = true;
      unsubscribe();
      wsManager.disconnectStream(streamKey);
    };
  }, [access_token, device?.customer_name, device?.department_name, device?.uid]);

  const wsReady = wsStatus === "connected" || wsStatus === "failed";

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
    if (latestQuery.data?.timestamp) {
      setLastUpdate((prev) => (!prev || latestQuery.data!.timestamp! > prev ? latestQuery.data!.timestamp : prev));
    }
    if (latestQuery.data?.data) {
      setLatestSnapshot(latestQuery.data.data);
    }
  }, [latestQuery.data]);

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
      return devicesApi.update(device.id, payload);
    },
    onSuccess: (updated) => {
      setDevice(updated);
      setPanelFields(updated.dashboard_config?.data_panel_fields ?? []);
      setPanelConfig(updated.dashboard_config?.data_panel_config ?? {});
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
      if (latestInfo.timestamp) {
        setLastUpdate((prev) => (!prev || latestInfo.timestamp > prev ? latestInfo.timestamp : prev));
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
    : "Latest device snapshot.";

  const lastUpdateLabel = useMemo(
    () => (lastUpdate ? lastUpdate.toLocaleString() : "--"),
    [lastUpdate]
  );

  return {
    device,
    deviceLoading: deviceQuery.isPending,
    deviceError,
    deviceStatus,
    displayMode,
    setDisplayMode,
    displayOptions: DISPLAY_OPTIONS,
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
    lastUpdateLabel,
  } as const;
}
