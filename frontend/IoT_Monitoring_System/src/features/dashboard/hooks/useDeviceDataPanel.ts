import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { devicesApi } from "../api/devicesApi";
import type { DataFieldType, Device } from "@/types/device";
import { type DevicePayload, formatValue } from "./deviceDashboardUtils";

type DataPanelConfig = Record<
  string,
  { label?: string; unit?: string; type?: DataFieldType; section_id?: string | null }
>;

type UseDeviceDataPanelParams = {
  device: Device | null;
  deviceUid?: string;
  liveData: DevicePayload | null;
  onDeviceUpdate?: (device: Device) => void;
};

type ChartItemConfig = NonNullable<Device["dashboard_config"]>["data_chart_items"];
type ChartLayoutConfig = NonNullable<Device["dashboard_config"]>["data_chart_layout"];
type PanelLayoutConfig = NonNullable<Device["dashboard_config"]>["data_panel_layout"];
type PanelSection = NonNullable<NonNullable<Device["dashboard_config"]>["data_panel_sections"]>[number];
type PanelSectionLayouts = NonNullable<Device["dashboard_config"]>["data_panel_section_layouts"];

const DEFAULT_PANEL_SIZE = { w: 3, h: 2, minW: 1, minH: 1 };
const GRID_COLS = 12;
const SECTION_PREFIX = "section:";
const SECTION_ROW_HEIGHT = 1;

const getSectionKey = (sectionId: string) => `${SECTION_PREFIX}${sectionId}`;
const isSectionKey = (key: string) => key.startsWith(SECTION_PREFIX);
const getSectionIdFromKey = (key: string) => key.replace(SECTION_PREFIX, "");
const getLayoutMaxY = (layout: Array<{ y: number; h: number }>) =>
  layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);

const cleanPanelConfig = (fields: string[], config: DataPanelConfig) => {
  const nextEntries = Object.entries(config).filter(([key]) => fields.includes(key));
  return Object.fromEntries(nextEntries);
};

const clonePanelConfig = (config: DataPanelConfig) =>
  Object.fromEntries(
    Object.entries(config).map(([key, value]) => [key, { ...value }])
  ) as DataPanelConfig;

const clonePanelLayout = (layout: PanelLayoutConfig) =>
  layout.map((item) => ({ ...item }));

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

const sanitizePanelLayout = (
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
    ? layout.map((item) =>
        isSectionKey(item.i)
          ? {
              i: item.i,
              x: 0,
              y: item.y,
              w: GRID_COLS,
              h: SECTION_ROW_HEIGHT,
              minW: GRID_COLS,
              minH: SECTION_ROW_HEIGHT,
            }
          : {
              i: item.i,
              x: item.x,
              y: item.y,
              w: item.w,
              h: item.h,
              minW: DEFAULT_PANEL_SIZE.minW,
              minH: DEFAULT_PANEL_SIZE.minH,
            }
      )
    : undefined;

const normalizePanelLayoutItem = (
  item: {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
  }
) =>
  isSectionKey(item.i)
    ? {
        i: item.i,
        x: 0,
        y: item.y,
        w: GRID_COLS,
        h: SECTION_ROW_HEIGHT,
        minW: GRID_COLS,
        minH: SECTION_ROW_HEIGHT,
      }
    : {
        i: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        minW: DEFAULT_PANEL_SIZE.minW,
        minH: DEFAULT_PANEL_SIZE.minH,
      };

const ensureLayoutForFields = (
  fields: string[],
  layout: Array<{
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
  }>
) => {
  const nextLayout = layout
    .filter((item) => fields.includes(item.i))
    .map((item) => normalizePanelLayoutItem(item));
  const usedIds = new Set(nextLayout.map((item) => item.i));
  let nextY = getLayoutMaxY(nextLayout);
  fields.forEach((field) => {
    if (usedIds.has(field)) return;
    nextLayout.push({
      i: field,
      x: 0,
      y: nextY,
      w: DEFAULT_PANEL_SIZE.w,
      h: DEFAULT_PANEL_SIZE.h,
      minW: DEFAULT_PANEL_SIZE.minW,
      minH: DEFAULT_PANEL_SIZE.minH,
    });
    nextY += DEFAULT_PANEL_SIZE.h;
  });
  return nextLayout;
};

const ensurePanelLayout = (
  fields: string[],
  sections: PanelSection[],
  layout: PanelLayoutConfig
) => {
  const fieldSet = new Set(fields);
  const sectionKeys = new Set(sections.map((section) => getSectionKey(section.id)));
  let nextLayout = layout
    .filter((item) => fieldSet.has(item.i) || sectionKeys.has(item.i))
    .map((item) => normalizePanelLayoutItem(item));
  const usedIds = new Set(nextLayout.map((item) => item.i));
  const sectionHeaderYs = nextLayout
    .filter((item) => isSectionKey(item.i))
    .map((item) => item.y)
    .sort((a, b) => a - b);
  let insertY = sectionHeaderYs.length ? sectionHeaderYs[0] : getLayoutMaxY(nextLayout);
  fields.forEach((field) => {
    if (usedIds.has(field)) return;
    if (sectionHeaderYs.length) {
      nextLayout = nextLayout.map((item) =>
        item.y >= insertY ? { ...item, y: item.y + DEFAULT_PANEL_SIZE.h } : item
      );
    }
    nextLayout.push({
      i: field,
      x: 0,
      y: insertY,
      w: DEFAULT_PANEL_SIZE.w,
      h: DEFAULT_PANEL_SIZE.h,
      minW: DEFAULT_PANEL_SIZE.minW,
      minH: DEFAULT_PANEL_SIZE.minH,
    });
    usedIds.add(field);
    insertY += DEFAULT_PANEL_SIZE.h;
  });
  let nextY = getLayoutMaxY(nextLayout);
  sections.forEach((section) => {
    const key = getSectionKey(section.id);
    if (usedIds.has(key)) return;
    nextLayout.push({
      i: key,
      x: 0,
      y: nextY,
      w: GRID_COLS,
      h: SECTION_ROW_HEIGHT,
      minW: GRID_COLS,
      minH: SECTION_ROW_HEIGHT,
    });
    usedIds.add(key);
    nextY += SECTION_ROW_HEIGHT;
  });
  return nextLayout.map((item) => normalizePanelLayoutItem(item));
};

const deriveSectionAssignments = (
  layout: PanelLayoutConfig,
  sections: PanelSection[],
  currentAssignments: Record<string, string | null>
) => {
  const sectionMap = new Map(sections.map((section) => [section.id, section]));
  const headers = layout
    .filter((item) => isSectionKey(item.i))
    .map((item) => ({
      id: getSectionIdFromKey(item.i),
      y: item.y,
      x: item.x,
      collapsed: Boolean(sectionMap.get(getSectionIdFromKey(item.i))?.collapsed),
    }))
    .filter((item) => sectionMap.has(item.id))
    .sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
  const assignments: Record<string, string | null> = {};
  layout.forEach((item) => {
    if (isSectionKey(item.i)) return;
    const currentAssignment = currentAssignments[item.i] ?? null;
    let assigned: string | null = null;
    for (const header of headers) {
      if (header.y <= item.y) {
        if (header.collapsed) {
          if (currentAssignment === header.id) {
            assigned = header.id;
            break;
          }
          continue;
        } else {
          assigned = header.id;
        }
      } else {
        break;
      }
    }
    assignments[item.i] = assigned;
  });
  return assignments;
};

const orderSectionsByLayout = (sections: PanelSection[], layout: PanelLayoutConfig) => {
  const positions = new Map<string, number>();
  layout.forEach((item) => {
    if (isSectionKey(item.i)) {
      positions.set(getSectionIdFromKey(item.i), item.y);
    }
  });
  return [...sections].sort((a, b) => {
    const posA = positions.get(a.id);
    const posB = positions.get(b.id);
    if (posA == null && posB == null) return 0;
    if (posA == null) return 1;
    if (posB == null) return -1;
    if (posA === posB) return 0;
    return posA - posB;
  });
};

const buildCombinedPanelLayout = (
  fields: string[],
  sections: PanelSection[],
  layout: PanelLayoutConfig,
  sectionLayouts: PanelSectionLayouts | undefined,
  config: DataPanelConfig
) => {
  const normalizedLayout = sanitizePanelLayout(layout ?? []) ?? [];
  if (normalizedLayout.some((item) => isSectionKey(item.i))) {
    return ensurePanelLayout(fields, sections, normalizedLayout);
  }

  const validSectionIds = new Set(sections.map((section) => section.id));
  const unsectionedFields = fields.filter((field) => {
    const sectionId = config[field]?.section_id ?? null;
    return !sectionId || !validSectionIds.has(sectionId);
  });
  let combined = ensureLayoutForFields(unsectionedFields, normalizedLayout);
  let nextY = getLayoutMaxY(combined);

  sections.forEach((section) => {
    const headerKey = getSectionKey(section.id);
    combined.push({
      i: headerKey,
      x: 0,
      y: nextY,
      w: GRID_COLS,
      h: SECTION_ROW_HEIGHT,
      minW: GRID_COLS,
      minH: SECTION_ROW_HEIGHT,
    });
    nextY += SECTION_ROW_HEIGHT;
    const sectionFields = fields.filter((field) => config[field]?.section_id === section.id);
    const baseLayout = (sectionLayouts?.[section.id] ?? []) as PanelLayoutConfig;
    const sectionItems = ensureLayoutForFields(sectionFields, baseLayout).map((item) => ({
      ...item,
      y: item.y + nextY,
    }));
    combined = combined.concat(sectionItems);
    nextY = getLayoutMaxY(combined);
  });

  return ensurePanelLayout(fields, sections, combined);
};

export function useDeviceDataPanel({
  device,
  deviceUid,
  liveData,
  onDeviceUpdate,
}: UseDeviceDataPanelParams) {
  const queryClient = useQueryClient();
  const [panelFields, setPanelFields] = useState<string[]>([]);
  const [panelConfig, setPanelConfig] = useState<DataPanelConfig>({});
  const [panelLayout, setPanelLayout] = useState<NonNullable<PanelLayoutConfig>>([]);
  const [panelSections, setPanelSections] = useState<PanelSection[]>([]);
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
  const [panelLayoutSaving, setPanelLayoutSaving] = useState(false);
  const [panelLayoutError, setPanelLayoutError] = useState<string | null>(null);
  const panelSnapshotRef = useRef<{
    fields: string[];
    config: DataPanelConfig;
    layout: PanelLayoutConfig;
    sections: PanelSection[];
  } | null>(null);

  useEffect(() => {
    setPanelFields([]);
    setPanelConfig({});
    setPanelLayout([]);
    setPanelSections([]);
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
    setPanelLayoutSaving(false);
    setPanelLayoutError(null);
    panelSnapshotRef.current = null;
  }, [deviceUid]);

  useEffect(() => {
    if (!device) return;
    const fields = device.dashboard_config?.data_panel_fields ?? [];
    const config = device.dashboard_config?.data_panel_config ?? {};
    const sections = device.dashboard_config?.data_panel_sections ?? [];
    const baseLayout = device.dashboard_config?.data_panel_layout ?? [];
    const sectionLayouts = device.dashboard_config?.data_panel_section_layouts ?? {};
    const combinedLayout = buildCombinedPanelLayout(
      fields,
      sections,
      baseLayout,
      sectionLayouts,
      config
    );
    setPanelFields(fields);
    setPanelConfig(config);
    setPanelLayout(combinedLayout);
    setPanelSections(sections);
    panelSnapshotRef.current = null;
  }, [device]);

  const updateMutation = useMutation({
    mutationFn: (payload: {
      dashboard_config: {
        data_panel_fields?: string[];
        data_panel_config?: DataPanelConfig;
        data_panel_layout?: PanelLayoutConfig;
        data_panel_sections?: PanelSection[];
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
      const nextPanelLayout = sanitizePanelLayout(
        payload.dashboard_config.data_panel_layout ?? currentConfig.data_panel_layout
      );
      const nextPanelSections =
        payload.dashboard_config.data_panel_sections ?? currentConfig.data_panel_sections;
      const nextChartItems =
        payload.dashboard_config.data_chart_items ?? currentConfig.data_chart_items;
      const nextChartLayout = sanitizeChartLayout(
        payload.dashboard_config.data_chart_layout ?? sanitizedChartLayout
      );
      return devicesApi.update(device.id, {
        dashboard_config: {
          data_panel_fields: nextPanelFields,
          data_panel_config: nextPanelConfig,
          data_panel_layout: nextPanelLayout,
          data_panel_sections: nextPanelSections,
          data_chart_items: nextChartItems,
          data_chart_layout: nextChartLayout,
        },
      });
    },
    onSuccess: (updated) => {
      const fields = updated.dashboard_config?.data_panel_fields ?? [];
      const config = updated.dashboard_config?.data_panel_config ?? {};
      const sections = updated.dashboard_config?.data_panel_sections ?? [];
      const baseLayout = updated.dashboard_config?.data_panel_layout ?? [];
      const sectionLayouts = updated.dashboard_config?.data_panel_section_layouts ?? {};
      const combinedLayout = buildCombinedPanelLayout(
        fields,
        sections,
        baseLayout,
        sectionLayouts,
        config
      );
      setPanelFields(fields);
      setPanelConfig(config);
      setPanelLayout(combinedLayout);
      setPanelSections(sections);
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
  const getFieldSectionId = (field: string) => {
    const sectionId = panelConfig[field]?.section_id ?? null;
    if (!sectionId) return null;
    return panelSections.some((section) => section.id === sectionId) ? sectionId : null;
  };

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
        ...(panelConfig[editingField] ?? {}),
        label: editLabel.trim() || editingField,
        unit: editUnit.trim() || undefined,
        type: editType,
      },
    };
    const cleanedConfig = cleanPanelConfig(panelFields, nextConfig);
    setPanelConfig(cleanedConfig);
    setEditingField(null);
    setConfigSaving(false);
  };

  const handleRemoveField = async (field: string) => {
    if (!panelFields.includes(field)) return;
    const nextFields = panelFields.filter((item) => item !== field);
    const nextConfig: DataPanelConfig = { ...panelConfig };
    delete nextConfig[field];
    const cleanedConfig = cleanPanelConfig(nextFields, nextConfig);
    setPanelFields(nextFields);
    setPanelConfig(cleanedConfig);
    if (editingField === field) {
      closeFieldConfig();
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
    setPanelFields(nextFields);
    setPanelConfig(cleanedConfig);
    closeAddField();
    setAddFieldSaving(false);
  };

  const addSection = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = `section-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setPanelSections((prev) => [...prev, { id, name: trimmed, collapsed: false }]);
  };

  const renameSection = (sectionId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPanelSections((prev) =>
      prev.map((section) => (section.id === sectionId ? { ...section, name: trimmed } : section))
    );
  };

  const toggleSection = (sectionId: string) => {
    setPanelSections((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, collapsed: !section.collapsed } : section
      )
    );
  };


  const deleteSection = (sectionId: string, fieldsInSection?: string[]) => {
    const fieldsToRemove =
      fieldsInSection ?? panelFields.filter((field) => getFieldSectionId(field) === sectionId);
    if (fieldsToRemove.length === 0) {
      setPanelSections((prev) => prev.filter((section) => section.id !== sectionId));
      return;
    }

    const nextFields = panelFields.filter((field) => getFieldSectionId(field) !== sectionId);
    const nextConfig: DataPanelConfig = { ...panelConfig };
    fieldsToRemove.forEach((field) => {
      delete nextConfig[field];
    });
    const cleanedConfig = cleanPanelConfig(nextFields, nextConfig);
    setPanelFields(nextFields);
    setPanelConfig(cleanedConfig);
    setPanelSections((prev) => prev.filter((section) => section.id !== sectionId));
    if (editingField && fieldsToRemove.includes(editingField)) {
      closeFieldConfig();
    }
  };


  const beginPanelEdit = () => {
    panelSnapshotRef.current = {
      fields: [...panelFields],
      config: clonePanelConfig(panelConfig),
      layout: clonePanelLayout(panelLayout),
      sections: panelSections.map((section) => ({ ...section })),
    };
    setConfigError(null);
    setAddFieldError(null);
  };

  const cancelPanelEdit = () => {
    const snapshot = panelSnapshotRef.current;
    if (snapshot) {
      setPanelFields([...snapshot.fields]);
      setPanelConfig(clonePanelConfig(snapshot.config));
      setPanelLayout(clonePanelLayout(snapshot.layout));
      setPanelSections(snapshot.sections.map((section) => ({ ...section })));
    }
    panelSnapshotRef.current = null;
    closeAddField();
    closeFieldConfig();
    setConfigError(null);
    setAddFieldError(null);
  };

  const savePanelLayout = async (payload: {
    layout: NonNullable<PanelLayoutConfig>;
    assignments?: Record<string, string | null>;
  }) => {
    if (!device) return;
    setPanelLayoutSaving(true);
    setPanelLayoutError(null);
    const sanitizedLayout = sanitizePanelLayout(payload.layout) ?? [];
    const trimmedSections = panelSections.filter((section) => Boolean(section?.id));
    const orderedSections = orderSectionsByLayout(trimmedSections, sanitizedLayout);
    const validSectionIds = new Set(orderedSections.map((section) => section.id));
    const cleanedConfig = cleanPanelConfig(panelFields, panelConfig);
    const currentAssignments = Object.fromEntries(
      panelFields.map((field) => [field, getFieldSectionId(field)])
    ) as Record<string, string | null>;
    const sectionAssignments =
      payload.assignments ??
      deriveSectionAssignments(
        sanitizedLayout,
        orderedSections,
        currentAssignments
      );
    const normalizedConfig = Object.fromEntries(
      Object.entries(cleanedConfig).map(([key, value]) => {
        const assignedSection = sectionAssignments[key];
        return [
          key,
          {
            ...value,
            section_id:
              assignedSection && validSectionIds.has(assignedSection) ? assignedSection : null,
          },
        ];
      })
    ) as DataPanelConfig;
    const currentConfig = device.dashboard_config ?? {};
    const chartItems = (currentConfig.data_chart_items ?? []).filter(Boolean);
    const fieldSet = new Set(panelFields);
    const remainingCharts = chartItems.filter((chart) => {
      if (chart.field && !fieldSet.has(chart.field)) return false;
      if (Array.isArray(chart.fields) && chart.fields.some((field) => !fieldSet.has(field))) {
        return false;
      }
      return true;
    });
    const chartLayout = currentConfig.data_chart_layout ?? [];
    const remainingLayout = chartLayout.filter((item) =>
      remainingCharts.some((chart) => chart.id === item.i)
    );
    try {
      await updateMutation.mutateAsync({
        dashboard_config: {
          data_panel_fields: panelFields,
          data_panel_config: normalizedConfig,
          data_panel_layout: sanitizedLayout,
          data_panel_sections: orderedSections,
          data_panel_section_layouts: {},
          data_chart_items: remainingCharts,
          data_chart_layout: remainingLayout,
        },
      });
      panelSnapshotRef.current = null;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save data panel layout";
      setPanelLayoutError(message);
      throw err;
    } finally {
      setPanelLayoutSaving(false);
    }
  };

  const panelFieldsSorted = useMemo(() => panelFields.slice(), [panelFields]);
  const panelSubtitle = "List of device data";

  return {
    panelFields: panelFieldsSorted,
    panelLayout,
    panelSections,
    panelSubtitle,
    getFieldRawValue,
    getFieldLabel,
    getDisplayValue,
    getFieldUnit,
    getFieldType,
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
    getFieldSectionId,
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
