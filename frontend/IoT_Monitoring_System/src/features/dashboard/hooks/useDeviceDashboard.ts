import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/context/AuthContext";
import { wsManager } from "@/services/ws";
import { devicesApi } from "../api/devicesApi";
import type { Device } from "@/types/device";
import { type DevicePayload, extractPayloadInfo } from "./deviceDashboardUtils";
import { useDeviceDataPanel } from "./useDeviceDataPanel";

export type DisplayMode = "data_panel" | "data_chart";

const DISPLAY_OPTIONS: Array<{ value: DisplayMode; label: string }> = [
  { value: "data_panel", label: "Data panel" },
  { value: "data_chart", label: "Data chart" },
];

export function useDeviceDashboard(deviceUid?: string) {
  const { access_token } = useAuth();
  const [device, setDevice] = useState<Device | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("data_panel");
  const [liveData, setLiveData] = useState<DevicePayload | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [wsStatus, setWsStatus] = useState<"idle" | "connecting" | "connected" | "failed">("idle");
  const [deviceStatus, setDeviceStatus] = useState<"online" | "offline" | null>(null);

  useEffect(() => {
    setDevice(null);
    setLiveData(null);
    setLastUpdate(null);
    setWsStatus("idle");
    setDeviceStatus(null);
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

  const updateLastUpdate = useCallback((timestamp: Date) => {
    setLastUpdate((prev) => (!prev || timestamp > prev ? timestamp : prev));
  }, []);

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
        updateLastUpdate(timestamp);
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
  }, [access_token, device?.customer_name, device?.department_name, device?.uid, updateLastUpdate]);

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
      if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return;
      const statusPayload = payload as { status?: unknown; uid?: unknown };
      const statusValue =
        typeof statusPayload.status === "string" ? statusPayload.status.toLowerCase() : null;
      if (statusValue !== "online" && statusValue !== "offline") return;
      if (statusPayload.uid && statusPayload.uid !== uid) return;
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

  const handleDeviceUpdate = useCallback((updated: Device) => {
    setDevice(updated);
  }, []);

  const panel = useDeviceDataPanel({
    device,
    deviceUid,
    liveData,
    wsReady,
    onDeviceUpdate: handleDeviceUpdate,
    onLastUpdate: updateLastUpdate,
  });

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
    ...panel,
    lastUpdateLabel,
  } as const;
}
