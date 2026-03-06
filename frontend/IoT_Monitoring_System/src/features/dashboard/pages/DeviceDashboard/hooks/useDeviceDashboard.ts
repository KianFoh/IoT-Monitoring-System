import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/context/AuthContext";
import { wsManager } from "@/services/ws";
import { devicesApi } from "../../../api/devicesApi";
import type { DashboardChartConfig, Device } from "@/types/device";
import { type DevicePayload, extractPayloadInfo } from "./deviceDashboardUtils";
import { useDeviceDataPanel } from "./useDeviceDataPanel";
import { buildDashboardConfig, normalizeDashboardConfig } from "./dashboardConfig";
import type { ChartFilterMode } from "@/features/dashboard/components/DeviceDataChart/types/deviceDataChartTypes";
import {
  ensureChartLayout,
  getLayoutMaxY,
  getSectionKey,
  isSectionKey,
  normalizeLayoutItem,
  orderSectionsByLayout,
} from "@/features/dashboard/components/DeviceDataChart/utils/deviceDataChartUtils";

export type DisplayMode = "data_panel" | "data_chart";

const DISPLAY_OPTIONS: Array<{ value: DisplayMode; label: string }> = [
  { value: "data_panel", label: "Data panel" },
  { value: "data_chart", label: "Data chart" },
];

type ChartItemConfig = NonNullable<DashboardChartConfig["items"]>;
type ChartLayoutConfig = NonNullable<DashboardChartConfig["layout"]>;
type ChartSection = NonNullable<DashboardChartConfig["sections"]>[number];

const normalizeChartItems = (items: ChartItemConfig | undefined) =>
  (items ?? []).map((item) => ({
    ...item,
    name: item.name?.trim() || "New panel",
  }));

const sanitizeChartLayoutItem = (item: NonNullable<ChartLayoutConfig>[number]) => {
  const normalized = normalizeLayoutItem(item);
  return {
    i: normalized.i,
    x: normalized.x,
    y: normalized.y,
    w: normalized.w,
    h: normalized.h,
    minW: normalized.minW,
    minH: normalized.minH,
  };
};

const buildCombinedChartLayout = (
  items: Array<{ id: string; section_id?: string | null }>,
  sections: ChartSection[],
  layout: ChartLayoutConfig | undefined
) => {
  const normalizedLayout = (layout ?? []).map((item) => normalizeLayoutItem(item));
  if (normalizedLayout.some((item) => isSectionKey(item.i))) {
    return ensureChartLayout(items, sections, normalizedLayout);
  }

  const validSectionIds = new Set(sections.map((section) => section.id));
  const unsectionedItems = items.filter(
    (item) => !item.section_id || !validSectionIds.has(item.section_id)
  );
  let combined = ensureChartLayout(unsectionedItems, [], normalizedLayout);
  let nextY = getLayoutMaxY(combined);

  sections.forEach((section) => {
    const sectionHeader = normalizeLayoutItem({
      i: getSectionKey(section.id),
      x: 0,
      y: nextY,
      w: 1,
      h: 1,
    });
    combined.push(sectionHeader);
    nextY += sectionHeader.h;
    const sectionItems = items.filter((item) => item.section_id === section.id);
    const baseLayout = normalizedLayout.filter((item) =>
      sectionItems.some((chart) => chart.id === item.i)
    );
    const sectionLayout = ensureChartLayout(sectionItems, [], baseLayout);
    const offsetItems = sectionLayout.map((item) => ({
      ...item,
      y: item.y + nextY,
    }));
    combined = combined.concat(offsetItems);
    nextY = getLayoutMaxY(combined);
  });

  return ensureChartLayout(items, sections, combined);
};

const formatLastUpdate = (value: Date) => {
  const pad = (num: number) => String(num).padStart(2, "0");
  const day = pad(value.getDate());
  const month = pad(value.getMonth() + 1);
  const year = value.getFullYear();
  const rawHours = value.getHours();
  const hours12 = rawHours % 12 || 12;
  const minutes = pad(value.getMinutes());
  const seconds = pad(value.getSeconds());
  const meridiem = rawHours >= 12 ? "PM" : "AM";
  return `${day}/${month}/${year} ${pad(hours12)}:${minutes}:${seconds} ${meridiem}`;
};

// Ignore null/undefined values so partial updates don't wipe previous data.
const mergeLiveData = (prev: DevicePayload | null, next: DevicePayload) => {
  const filteredEntries = Object.entries(next).filter(([, value]) => value !== null && value !== undefined);
  if (filteredEntries.length === 0) {
    return prev ?? next;
  }
  const filtered = Object.fromEntries(filteredEntries);
  return prev ? { ...prev, ...filtered } : filtered;
};

export function useDeviceDashboard(deviceUid?: string) {
  const { access_token } = useAuth();
  const queryClient = useQueryClient();
  const [device, setDevice] = useState<Device | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("data_panel");
  const [chartFilterMode, setChartFilterMode] = useState<ChartFilterMode>("raw");
  const [liveData, setLiveData] = useState<DevicePayload | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [wsStatus, setWsStatus] = useState<"idle" | "connecting" | "connected" | "failed">("idle");
  const [deviceStatus, setDeviceStatus] = useState<"online" | "offline" | null>(null);
  const [chartItems, setChartItems] = useState<NonNullable<ChartItemConfig>>([]);
  const [chartLayout, setChartLayout] = useState<NonNullable<ChartLayoutConfig>>([]);
  const [chartSections, setChartSections] = useState<ChartSection[]>([]);
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
    setChartSections([]);
    setChartError(null);
    setLatestFetched(false);
    setChartFilterMode("raw");
  }, [deviceUid]);

  useEffect(() => {
    if (displayMode !== "data_chart" && chartFilterMode !== "raw") {
      setChartFilterMode("raw");
    }
  }, [displayMode, chartFilterMode]);

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
      setChartSections([]);
      return;
    }
    const normalized = normalizeDashboardConfig(device.dashboard_config);
    const chartConfig = normalized.data_chart;
    const normalizedItems = normalizeChartItems(chartConfig.items);
    const sections = chartConfig.sections;
    const normalizedLayout = buildCombinedChartLayout(
      normalizedItems,
      sections,
      chartConfig.layout
    );
    setChartItems(normalizedItems);
    setChartLayout(normalizedLayout);
    setChartSections(sections);
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
        setLiveData((prev) => mergeLiveData(prev, data));
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
  }, [
    access_token,
    device?.customer_name,
    device?.department_name,
    device?.uid,
    updateLastUpdate,
  ]);

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
        setChartSections([]);
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
      data_chart_sections: ChartSection[];
    }) => {
      if (!device) {
        throw new Error("Device not loaded");
      }
      const currentConfig = normalizeDashboardConfig(device.dashboard_config);
      const sanitizedLayout = payload.data_chart_layout.map((item) => sanitizeChartLayoutItem(item));
      const orderedSections = orderSectionsByLayout(payload.data_chart_sections, sanitizedLayout);
      const normalizedConfig = {
        ...currentConfig,
        data_chart: {
          ...currentConfig.data_chart,
          items: payload.data_chart_items,
          layout: sanitizedLayout,
          sections: orderedSections,
        },
      };
      return devicesApi.update(device.id, {
        dashboard_config: buildDashboardConfig(normalizedConfig),
      });
    },
    onSuccess: (updated) => {
      setDevice(updated);
      const normalized = normalizeDashboardConfig(updated.dashboard_config);
      const chartConfig = normalized.data_chart;
      const normalizedItems = normalizeChartItems(chartConfig.items);
      const sections = chartConfig.sections;
      const normalizedLayout = buildCombinedChartLayout(
        normalizedItems,
        sections,
        chartConfig.layout
      );
      setChartItems(normalizedItems);
      setChartLayout(normalizedLayout);
      setChartSections(sections);
      if (deviceUid) {
        queryClient.setQueryData(["devices", "by-uid", deviceUid], updated);
      }
    },
  });

  const saveChartConfig = useCallback(
    async (
      items: NonNullable<ChartItemConfig>,
      layout: NonNullable<ChartLayoutConfig>,
      sections: ChartSection[]
    ) => {
      setChartError(null);
      try {
        await chartMutation.mutateAsync({
          data_chart_items: items,
          data_chart_layout: layout,
          data_chart_sections: sections,
        });
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
    device: {
      data: device,
      loading: deviceQuery.isPending,
      error: deviceError,
      status: deviceStatus,
      lastUpdate,
      lastUpdateLabel,
    },
    display: {
      mode: displayMode,
      setMode: setDisplayMode,
      options: DISPLAY_OPTIONS,
    },
    panel,
    chart: {
      items: chartItems,
      layout: chartLayout,
      sections: chartSections,
      filterMode: chartFilterMode,
      setFilterMode: setChartFilterMode,
      saving: chartMutation.isPending,
      error: chartError,
      save: saveChartConfig,
    },
  } as const;
}
