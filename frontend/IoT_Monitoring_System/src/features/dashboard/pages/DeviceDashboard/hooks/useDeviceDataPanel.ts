import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { devicesApi } from "../../../api/devicesApi";
import type { DataFieldType, DashboardChartConfig, DashboardPanelConfig, Device } from "@/types/device";
import { type DevicePayload, formatValue } from "./deviceDashboardUtils";
import { buildDashboardConfig, normalizeDashboardConfig } from "./dashboardConfig";
import {
  buildSectionAssignments,
  ensurePanelLayout,
  getLayoutMaxY,
  getSectionIdFromKey,
  getSectionKey,
  isSectionKey,
  normalizeLayoutItem,
} from "@/features/dashboard/components/DeviceDataPanel/utils/deviceDataPanelUtils";

type DataPanelConfig = NonNullable<DashboardPanelConfig["config"]>;
type CaseItem = { id: string; label: string; color: string };

type UseDeviceDataPanelParams = {
  device: Device | null;
  deviceUid?: string;
  liveData: DevicePayload | null;
  onDeviceUpdate?: (device: Device) => void;
};

type PanelLayoutConfig = NonNullable<DashboardPanelConfig["layout"]>;
type PanelSection = NonNullable<DashboardPanelConfig["sections"]>[number];

const cleanPanelConfig = (fields: string[], config: DataPanelConfig) => {
  const nextEntries = Object.entries(config).filter(([key]) => fields.includes(key));
  return Object.fromEntries(nextEntries);
};

const createCaseId = () => `case-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizeCaseColorMap = (caseColors?: Record<string, string> | null) => {
  const map = new Map<string, string>();
  if (!caseColors) return map;
  Object.entries(caseColors).forEach(([label, color]) => {
    const trimmedLabel = label.trim().toLowerCase();
    const trimmedColor = typeof color === "string" ? color.trim() : "";
    if (!trimmedLabel || !trimmedColor) return;
    map.set(trimmedLabel, trimmedColor);
  });
  return map;
};

const buildCaseItems = (
  cases?: string[] | null,
  caseColors?: Record<string, string> | null
): CaseItem[] => {
  const colorMap = normalizeCaseColorMap(caseColors);
  const list = Array.isArray(cases) ? cases : [];
  return list.map((label) => {
    const trimmedLabel = label.trim();
    const color = colorMap.get(trimmedLabel.toLowerCase()) ?? "";
    return {
      id: createCaseId(),
      label: trimmedLabel,
      color,
    };
  });
};

const normalizeCaseItems = (items: CaseItem[]) => {
  const seen = new Set<string>();
  return items
    .map((item) => ({
      ...item,
      label: item.label.trim(),
      color: item.color.trim(),
    }))
    .filter((item) => Boolean(item.label))
    .filter((item) => {
      const key = item.label.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const normalizeBooleanValue = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    if (value === 0) return false;
    if (value === 1) return true;
    return null;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return null;
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
    ? layout.map((item) => {
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
      })
    : undefined;

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
  let combined = ensurePanelLayout(unsectionedFields, [], normalizedLayout);
  let nextY = getLayoutMaxY(combined);

  sections.forEach((section) => {
    const headerKey = getSectionKey(section.id);
    const sectionHeader = normalizeLayoutItem({
      i: headerKey,
      x: 0,
      y: nextY,
      w: 1,
      h: 1,
    });
    combined.push(sectionHeader);
    nextY += sectionHeader.h;
    const sectionFields = fields.filter((field) => config[field]?.section_id === section.id);
    const baseLayout = normalizedLayout.filter((item) => sectionFields.includes(item.i));
    const sectionItems = ensurePanelLayout(sectionFields, [], baseLayout).map((item) => ({
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
  const [editColor, setEditColor] = useState("");
  const [editTrueLabel, setEditTrueLabel] = useState("");
  const [editFalseLabel, setEditFalseLabel] = useState("");
  const [editTrueColor, setEditTrueColor] = useState("");
  const [editFalseColor, setEditFalseColor] = useState("");
  const [editCaseItems, setEditCaseItems] = useState<CaseItem[]>([]);
  const [newFieldCaseItems, setNewFieldCaseItems] = useState<CaseItem[]>([]);
  const [caseConfigMode, setCaseConfigMode] = useState<"edit" | "new" | null>(null);
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldUnit, setNewFieldUnit] = useState("");
  const [newFieldType, setNewFieldType] = useState<DataFieldType>("number");
  const [newFieldColor, setNewFieldColor] = useState("");
  const [newFieldTrueLabel, setNewFieldTrueLabel] = useState("");
  const [newFieldFalseLabel, setNewFieldFalseLabel] = useState("");
  const [newFieldTrueColor, setNewFieldTrueColor] = useState("");
  const [newFieldFalseColor, setNewFieldFalseColor] = useState("");
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
    setEditColor("");
    setEditTrueLabel("");
    setEditFalseLabel("");
    setEditTrueColor("");
    setEditFalseColor("");
    setEditCaseItems([]);
    setNewFieldCaseItems([]);
    setCaseConfigMode(null);
    setIsAddFieldOpen(false);
    setNewFieldKey("");
    setNewFieldLabel("");
    setNewFieldUnit("");
    setNewFieldType("number");
    setNewFieldColor("");
    setNewFieldTrueLabel("");
    setNewFieldFalseLabel("");
    setNewFieldTrueColor("");
    setNewFieldFalseColor("");
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
    const normalized = normalizeDashboardConfig(device.dashboard_config);
    const panelConfig = normalized.data_panel;
    const fields = panelConfig.fields;
    const config = panelConfig.config;
    const sections = panelConfig.sections;
    const baseLayout = panelConfig.layout;
    const combinedLayout = buildCombinedPanelLayout(
      fields,
      sections,
      baseLayout,
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
      data_panel?: Partial<DashboardPanelConfig>;
      data_chart?: Partial<DashboardChartConfig>;
    }) => {
      if (!device) {
        throw new Error("Device not loaded");
      }
      const currentConfig = normalizeDashboardConfig(device.dashboard_config);
      const nextPanel: Required<DashboardPanelConfig> = {
        fields: payload.data_panel?.fields ?? currentConfig.data_panel.fields,
        config: payload.data_panel?.config ?? currentConfig.data_panel.config,
        layout: payload.data_panel?.layout ?? currentConfig.data_panel.layout,
        sections: payload.data_panel?.sections ?? currentConfig.data_panel.sections,
      };
      const nextChart: Required<DashboardChartConfig> = {
        items: payload.data_chart?.items ?? currentConfig.data_chart.items,
        layout: payload.data_chart?.layout ?? currentConfig.data_chart.layout,
        sections: payload.data_chart?.sections ?? currentConfig.data_chart.sections,
      };
      const nextPanelLayout = sanitizePanelLayout(nextPanel.layout) ?? [];
      const nextChartLayout = sanitizeChartLayout(nextChart.layout) ?? [];
      const normalizedConfig = {
        ...currentConfig,
        data_panel: {
          ...nextPanel,
          layout: nextPanelLayout,
        },
        data_chart: {
          ...nextChart,
          layout: nextChartLayout,
        },
      };
      return devicesApi.update(device.id, {
        dashboard_config: buildDashboardConfig(normalizedConfig),
      });
    },
    onSuccess: (updated) => {
      const normalized = normalizeDashboardConfig(updated.dashboard_config);
      const panelConfig = normalized.data_panel;
      const combinedLayout = buildCombinedPanelLayout(
        panelConfig.fields,
        panelConfig.sections,
        panelConfig.layout,
        panelConfig.config
      );
      setPanelFields(panelConfig.fields);
      setPanelConfig(panelConfig.config);
      setPanelLayout(combinedLayout);
      setPanelSections(panelConfig.sections);
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
  const getFieldUnit = (field: string) =>
    panelConfig[field]?.type === "boolean" ? "" : panelConfig[field]?.unit?.trim() || "";
  const getFieldType = (field: string) => panelConfig[field]?.type ?? "text";
  const getFieldColor = (field: string) => panelConfig[field]?.color?.trim() || "";
  const getFieldCases = (field: string) => panelConfig[field]?.cases ?? [];
  const getFieldCaseColors = (field: string) => panelConfig[field]?.case_colors ?? null;
  const getFieldSectionId = (field: string) => {
    const sectionId = panelConfig[field]?.section_id ?? null;
    if (!sectionId) return null;
    return panelSections.some((section) => section.id === sectionId) ? sectionId : null;
  };

  const getFieldBooleanColors = (field: string) => {
    const config = panelConfig[field];
    const trueColor = config?.true_color?.trim() || "";
    const falseColor = config?.false_color?.trim() || "";
    if (!trueColor && !falseColor) return null;
    return {
      trueColor: trueColor || undefined,
      falseColor: falseColor || undefined,
    };
  };

  const getFieldBooleanLabels = (field: string) => {
    const config = panelConfig[field];
    const trueLabel = config?.true_label?.trim() || "True";
    const falseLabel = config?.false_label?.trim() || "False";
    return {
      trueLabel,
      falseLabel,
    };
  };

  const getFieldBooleanDisplay = (field: string) => {
    const rawValue = getFieldRawValue(field);
    const normalized = normalizeBooleanValue(rawValue);
    const config = panelConfig[field];
    const trueLabel = config?.true_label?.trim() || "True";
    const falseLabel = config?.false_label?.trim() || "False";
    const trueColor = config?.true_color?.trim() || "";
    const falseColor = config?.false_color?.trim() || "";
    if (normalized === true) {
      return { label: trueLabel, color: trueColor || undefined };
    }
    if (normalized === false) {
      return { label: falseLabel, color: falseColor || undefined };
    }
    return { label: formatValue(rawValue), color: undefined };
  };

  const getDisplayValue = (field: string) => {
    const value = formatValue(getFieldValue(field));
    if (getFieldType(field) === "boolean") return value;
    const unit = getFieldUnit(field);
    if (!unit || value === "--") return value;
    return `${value} ${unit}`;
  };

  const openFieldConfig = (field: string) => {
    setEditingField(field);
    setEditLabel(panelConfig[field]?.label?.trim() || field);
    setEditUnit(panelConfig[field]?.unit?.trim() || "");
    setEditType(panelConfig[field]?.type ?? "number");
    setEditColor(panelConfig[field]?.color?.trim() || "");
    setEditTrueLabel(panelConfig[field]?.true_label?.trim() || "");
    setEditFalseLabel(panelConfig[field]?.false_label?.trim() || "");
    setEditTrueColor(panelConfig[field]?.true_color?.trim() || "");
    setEditFalseColor(panelConfig[field]?.false_color?.trim() || "");
    setEditCaseItems(buildCaseItems(panelConfig[field]?.cases, panelConfig[field]?.case_colors));
    setCaseConfigMode(null);
    setConfigError(null);
  };

  const closeFieldConfig = () => {
    setEditingField(null);
    setConfigError(null);
    setEditLabel("");
    setEditUnit("");
    setEditType("number");
    setEditColor("");
    setEditTrueLabel("");
    setEditFalseLabel("");
    setEditTrueColor("");
    setEditFalseColor("");
    setEditCaseItems([]);
    setCaseConfigMode(null);
  };

  const openEditCaseConfig = () => {
    if (!editingField) return;
    setCaseConfigMode("edit");
  };

  const openNewCaseConfig = () => {
    setCaseConfigMode("new");
  };

  const closeCaseConfig = () => {
    setCaseConfigMode(null);
  };

  const handleSaveConfig = async () => {
    if (!device || !editingField) return;
    setConfigSaving(true);
    setConfigError(null);
    const normalizedCases =
      editType === "text" || editType === "list" ? normalizeCaseItems(editCaseItems) : [];
    const nextCases = normalizedCases.length
      ? normalizedCases.map((item) => item.label)
      : undefined;
    const nextCaseColors = normalizedCases.reduce<Record<string, string>>((acc, item) => {
      if (item.color) {
        acc[item.label] = item.color;
      }
      return acc;
    }, {});
    const caseColors = Object.keys(nextCaseColors).length ? nextCaseColors : undefined;
    const booleanConfig =
      editType === "boolean"
        ? {
            true_label: editTrueLabel.trim() || undefined,
            false_label: editFalseLabel.trim() || undefined,
            true_color: editTrueColor.trim() || undefined,
            false_color: editFalseColor.trim() || undefined,
          }
        : {
            true_label: undefined,
            false_label: undefined,
            true_color: undefined,
            false_color: undefined,
          };
    const nextConfig: DataPanelConfig = {
      ...panelConfig,
      [editingField]: {
        ...(panelConfig[editingField] ?? {}),
        label: editLabel.trim() || editingField,
        unit: editType === "boolean" ? undefined : editUnit.trim() || undefined,
        type: editType,
        color: editColor.trim() || undefined,
        cases: nextCases,
        case_colors: caseColors,
        ...booleanConfig,
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
    setNewFieldCaseItems([]);
    setCaseConfigMode(null);
  };

  const closeAddField = () => {
    setIsAddFieldOpen(false);
    setNewFieldKey("");
    setNewFieldLabel("");
    setNewFieldUnit("");
    setNewFieldType("number");
    setNewFieldColor("");
    setNewFieldTrueLabel("");
    setNewFieldFalseLabel("");
    setNewFieldTrueColor("");
    setNewFieldFalseColor("");
    setNewFieldCaseItems([]);
    setCaseConfigMode(null);
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
    const normalizedCases =
      newFieldType === "text" || newFieldType === "list"
        ? normalizeCaseItems(newFieldCaseItems)
        : [];
    const nextCases = normalizedCases.length
      ? normalizedCases.map((item) => item.label)
      : undefined;
    const nextCaseColors = normalizedCases.reduce<Record<string, string>>((acc, item) => {
      if (item.color) {
        acc[item.label] = item.color;
      }
      return acc;
    }, {});
    const caseColors = Object.keys(nextCaseColors).length ? nextCaseColors : undefined;
    const booleanConfig =
      newFieldType === "boolean"
        ? {
            true_label: newFieldTrueLabel.trim() || undefined,
            false_label: newFieldFalseLabel.trim() || undefined,
            true_color: newFieldTrueColor.trim() || undefined,
            false_color: newFieldFalseColor.trim() || undefined,
          }
        : {
            true_label: undefined,
            false_label: undefined,
            true_color: undefined,
            false_color: undefined,
          };
    const nextFields = [...panelFields, trimmedKey];
    const nextConfig: DataPanelConfig = {
      ...panelConfig,
      [trimmedKey]: {
        label: trimmedLabel || trimmedKey,
        unit: newFieldType === "boolean" ? undefined : trimmedUnit || undefined,
        type: newFieldType,
        color: newFieldColor.trim() || undefined,
        cases: nextCases,
        case_colors: caseColors,
        ...booleanConfig,
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
      buildSectionAssignments(
        sanitizedLayout,
        orderedSections,
        currentAssignments,
        new Set(panelFields)
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
    const currentConfig = normalizeDashboardConfig(device.dashboard_config);
    const chartItems = currentConfig.data_chart.items.filter(Boolean);
    const fieldSet = new Set(panelFields);
    const remainingCharts = chartItems.filter((chart) => {
      if (chart.field && !fieldSet.has(chart.field)) return false;
      if (Array.isArray(chart.fields) && chart.fields.some((field) => !fieldSet.has(field))) {
        return false;
      }
      return true;
    });
    const chartLayout = currentConfig.data_chart.layout;
    const remainingLayout = chartLayout.filter((item) =>
      remainingCharts.some((chart) => chart.id === item.i)
    );
    try {
      await updateMutation.mutateAsync({
        data_panel: {
          fields: panelFields,
          config: normalizedConfig,
          layout: sanitizedLayout,
          sections: orderedSections,
        },
        data_chart: {
          items: remainingCharts,
          layout: remainingLayout,
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

  const panelSubtitle = "List of device data";

  return {
    data: {
      fields: panelFields,
      layout: panelLayout,
      sections: panelSections,
      subtitle: panelSubtitle,
    },
    getters: {
      getFieldRawValue,
      getFieldLabel,
      getDisplayValue,
      getFieldBooleanDisplay,
      getFieldBooleanColors,
      getFieldBooleanLabels,
      getFieldUnit,
      getFieldType,
      getFieldColor,
      getFieldCases,
      getFieldCaseColors,
      getFieldSectionId,
    },
    actions: {
      openFieldConfig,
      closeFieldConfig,
      saveFieldConfig: handleSaveConfig,
      removeField: handleRemoveField,
      openAddField,
      closeAddField,
      addField: handleAddField,
      addSection,
      renameSection,
      deleteSection,
      toggleSection,
      beginEdit: beginPanelEdit,
      cancelEdit: cancelPanelEdit,
      saveLayout: savePanelLayout,
    },
    edit: {
      field: editingField,
      label: editLabel,
      setLabel: setEditLabel,
      unit: editUnit,
      setUnit: setEditUnit,
      type: editType,
      setType: setEditType,
      color: editColor,
      setColor: setEditColor,
      trueLabel: editTrueLabel,
      setTrueLabel: setEditTrueLabel,
      falseLabel: editFalseLabel,
      setFalseLabel: setEditFalseLabel,
      trueColor: editTrueColor,
      setTrueColor: setEditTrueColor,
      falseColor: editFalseColor,
      setFalseColor: setEditFalseColor,
      caseItems: editCaseItems,
      setCaseItems: setEditCaseItems,
      saving: configSaving,
      error: configError,
    },
    addField: {
      isOpen: isAddFieldOpen,
      key: newFieldKey,
      setKey: setNewFieldKey,
      label: newFieldLabel,
      setLabel: setNewFieldLabel,
      unit: newFieldUnit,
      setUnit: setNewFieldUnit,
      type: newFieldType,
      setType: setNewFieldType,
      color: newFieldColor,
      setColor: setNewFieldColor,
      trueLabel: newFieldTrueLabel,
      setTrueLabel: setNewFieldTrueLabel,
      falseLabel: newFieldFalseLabel,
      setFalseLabel: setNewFieldFalseLabel,
      trueColor: newFieldTrueColor,
      setTrueColor: setNewFieldTrueColor,
      falseColor: newFieldFalseColor,
      setFalseColor: setNewFieldFalseColor,
      caseItems: newFieldCaseItems,
      setCaseItems: setNewFieldCaseItems,
      saving: addFieldSaving,
      error: addFieldError,
    },
    caseConfig: {
      mode: caseConfigMode,
      openEdit: openEditCaseConfig,
      openNew: openNewCaseConfig,
      close: closeCaseConfig,
    },
    layoutStatus: {
      saving: panelLayoutSaving,
      error: panelLayoutError,
    },
  } as const;
}
