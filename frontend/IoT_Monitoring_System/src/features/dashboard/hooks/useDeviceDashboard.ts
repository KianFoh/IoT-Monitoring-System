import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

const DEFAULT_CHART_LAYOUT = { w: 4, h: 3, minW: 3, minH: 3 };

type ChartItemConfig = NonNullable<Device["dashboard_config"]>["data_chart_items"];
type ChartLayoutConfig = NonNullable<Device["dashboard_config"]>["data_chart_layout"];

const normalizeChartItems = (items: ChartItemConfig | undefined) =>
  (items ?? []).map((item) => ({
    ...item,
    name: item.name?.trim() || "New panel",
  }));

const sanitizeChartLayoutItem = (item: NonNullable<ChartLayoutConfig>[number]) => ({
  i: item.i,
  x: item.x,
  y: item.y,
  w: item.w,
  h: item.h,
  minW: item.minW,
  minH: item.minH,
});

const normalizeChartLayout = (
  items: Array<{ id: string }>,
  layout: ChartLayoutConfig | undefined
) => {
  const nextLayout = (layout ?? [])
    .filter((item) => items.some((chart) => chart.id === item.i))
    .map((item) => sanitizeChartLayoutItem(item));
  const usedIds = new Set(nextLayout.map((item) => item.i));
  let nextY = nextLayout.reduce((max, item) => Math.max(max, item.y + item.h), 0);
  items.forEach((item) => {
    if (usedIds.has(item.id)) return;
    nextLayout.push({
      i: item.id,
      x: 0,
      y: nextY,
      w: DEFAULT_CHART_LAYOUT.w,
      h: DEFAULT_CHART_LAYOUT.h,
      minW: DEFAULT_CHART_LAYOUT.minW,
      minH: DEFAULT_CHART_LAYOUT.minH,
    });
    nextY += DEFAULT_CHART_LAYOUT.h;
  });
  return nextLayout;
};

const formatLastUpdate = (value: Date) => {
  const pad = (num: number) => String(num).padStart(2, "0");
  const day = pad(value.getDate());
  const month = pad(value.getMonth() + 1);
  const year = value.getFullYear();
  const hours = pad(value.getHours());
  const minutes = pad(value.getMinutes());
  const seconds = pad(value.getSeconds());
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

export function useDeviceDashboard(deviceUid?: string) {
  const { access_token, user } = useAuth();
  const queryClient = useQueryClient();
  const [device, setDevice] = useState<Device | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("data_panel");
  const [liveData, setLiveData] = useState<DevicePayload | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [wsStatus, setWsStatus] = useState<"idle" | "connecting" | "connected" | "failed">("idle");
  const [deviceStatus, setDeviceStatus] = useState<"online" | "offline" | null>(null);
  const [chartItems, setChartItems] = useState<NonNullable<ChartItemConfig>>([]);
  const [chartLayout, setChartLayout] = useState<NonNullable<ChartLayoutConfig>>([]);
  const [chartError, setChartError] = useState<string | null>(null);
  const [latestFetched, setLatestFetched] = useState(false);

  useEffect(() => {
    setDevice(null);
    setLiveData(null);
    setLastUpdate(null);
    setWsStatus("idle");
    setDeviceStatus(null);
    setChartItems([]);
    setChartLayout([]);
    setChartError(null);
    setLatestFetched(false);
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

  useEffect(() => {
    if (!device) {
      setChartItems([]);
      setChartLayout([]);
      return;
    }
    const normalizedItems = normalizeChartItems(device.dashboard_config?.data_chart_items);
    const normalizedLayout = normalizeChartLayout(normalizedItems, device.dashboard_config?.data_chart_layout);
    setChartItems(normalizedItems);
    setChartLayout(normalizedLayout);
  }, [device]);

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
        setLiveData((prev) => (prev ? { ...prev, ...data } : data));
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
    if (wsStatus === "idle") {
      setLatestFetched(false);
    }
  }, [wsStatus]);

  useEffect(() => {
    const uid = device?.uid;
    if (!uid) return;

    const unsubscribe = wsManager.on("device_status", (event: any) => {
      const evtType = event?.type ?? event?.eventType ?? event?.payload?.type;
      const payload = event?.data ?? event?.payload?.data ?? event?.payload ?? event;
      if (evtType !== "status" || !payload) return;
      const status = typeof payload.status === "string" ? payload.status.toLowerCase() : null;
      if (status !== "online" && status !== "offline") return;
      if (payload.uid && payload.uid !== uid) return;
      setDeviceStatus(status);
    });

    return () => unsubscribe();
  }, [device?.uid]);

  useEffect(() => {
    if (!deviceUid) return;
    const normalizedUid = deviceUid.trim().toLowerCase();
    const unsubscribe = wsManager.on("device", (event: any) => {
      const payload = event?.data;
      if (!payload || typeof payload !== "object") return;
      const payloadUid =
        typeof (payload as { uid?: string }).uid === "string"
          ? (payload as { uid?: string }).uid!.toLowerCase()
          : "";
      if (!payloadUid || payloadUid !== normalizedUid) return;

      if (event?.type === "delete") {
        setDevice(null);
        setDeviceStatus(null);
        setChartItems([]);
        setChartLayout([]);
        setChartError(null);
        if (deviceUid) {
          queryClient.setQueryData(["devices", "by-uid", deviceUid], null);
        }
        return;
      }

      if (event?.type === "update" || event?.type === "add") {
        setDevice((prev) => {
          const next = payload as Device;
          if (!prev) return next;
          return {
            ...prev,
            ...next,
            dashboard_config: next.dashboard_config ?? prev.dashboard_config,
          };
        });
        if (typeof (payload as { is_online?: boolean }).is_online === "boolean") {
          setDeviceStatus((payload as { is_online: boolean }).is_online ? "online" : "offline");
        }
        if (deviceUid) {
          queryClient.setQueryData(["devices", "by-uid", deviceUid], payload as Device);
        }
      }
    });

    return () => unsubscribe();
  }, [deviceUid, queryClient]);

  useEffect(() => {
    if (wsStatus !== "connected") return;
    if (!device?.uid || latestFetched) return;
    let cancelled = false;
    devicesApi
      .latestData(device.uid)
      .then((payload) => {
        if (cancelled) return;
        if (!payload) {
          setLatestFetched(true);
          return;
        }
        const { data, timestamp } = extractPayloadInfo(payload);
        if (data && !liveData) {
          setLiveData(data);
        }
        if (timestamp) {
          updateLastUpdate(timestamp);
        }
        setLatestFetched(true);
      })
      .catch(() => {
        if (!cancelled) setLatestFetched(true);
      });
    return () => {
      cancelled = true;
    };
  }, [wsStatus, device?.uid, latestFetched, liveData, updateLastUpdate]);

  const handleDeviceUpdate = useCallback((updated: Device) => {
    setDevice(updated);
  }, []);

  const panel = useDeviceDataPanel({
    device,
    deviceUid,
    liveData,
    onDeviceUpdate: handleDeviceUpdate,
  });

  const chartMutation = useMutation({
    mutationFn: (payload: {
      data_chart_items: NonNullable<ChartItemConfig>;
      data_chart_layout: NonNullable<ChartLayoutConfig>;
    }) => {
      if (!device) {
        throw new Error("Device not loaded");
      }
      const currentConfig = device.dashboard_config ?? {};
      const sanitizedLayout = payload.data_chart_layout.map((item) => sanitizeChartLayoutItem(item));
      return devicesApi.update(device.id, {
        dashboard_config: {
          data_panel_fields: currentConfig.data_panel_fields,
          data_panel_config: currentConfig.data_panel_config,
          data_chart_items: payload.data_chart_items,
          data_chart_layout: sanitizedLayout,
        },
      });
    },
    onSuccess: (updated) => {
      setDevice(updated);
      const normalizedItems = normalizeChartItems(updated.dashboard_config?.data_chart_items);
      const normalizedLayout = normalizeChartLayout(normalizedItems, updated.dashboard_config?.data_chart_layout);
      setChartItems(normalizedItems);
      setChartLayout(normalizedLayout);
      if (deviceUid) {
        queryClient.setQueryData(["devices", "by-uid", deviceUid], updated);
      }
    },
  });

  const saveChartConfig = useCallback(
    async (
      items: NonNullable<ChartItemConfig>,
      layout: NonNullable<ChartLayoutConfig>
    ) => {
      setChartError(null);
      try {
        await chartMutation.mutateAsync({ data_chart_items: items, data_chart_layout: layout });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to save chart layout";
        setChartError(message);
        throw err;
      }
    },
    [chartMutation]
  );

  const lastUpdateLabel = useMemo(
    () => (lastUpdate ? formatLastUpdate(lastUpdate) : "--"),
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
    chartItems,
    chartLayout,
    chartSaving: chartMutation.isPending,
    chartError,
    saveChartConfig,
    lastUpdateLabel,
  } as const;
}
