import { type DragEvent as ReactDragEvent, type ReactNode, type Ref, useEffect, useMemo, useRef, useState } from "react";
import { FaChevronDown, FaChevronRight, FaCog, FaEllipsisV } from "react-icons/fa";
import {
  GridLayout,
  type Layout,
  type LayoutItem,
  type ResizeHandleAxis,
  useContainerWidth,
} from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import styles from "./DeviceDataPanel.module.css";
import formStyles from "../DashboardForm/DashboardForm.module.css";
import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import DropdownSelect from "../DropdownSelect/DropdownSelect";
import { DeviceDataPanelHeader } from "./DeviceDataPanelHeader";
import { DeviceDataPanelModals } from "./DeviceDataPanelModals";
import {
  GRID_COLS,
  GRID_COMPACTOR,
  GRID_MARGIN,
  GRID_PADDING,
  GRID_ROW_HEIGHT,
  RESIZE_HANDLE_INSET,
  RESIZE_HANDLES,
} from "./utils/deviceDataPanelConstants";
import { useSectionModalState } from "./state/deviceDataPanelState";
import type {
  DeviceDataPanelProps,
  PanelLayoutItem,
  PanelSection,
} from "./types/deviceDataPanelTypes";
import type { LineGranularity } from "../DeviceDataChart/types/deviceDataChartTypes";
import { useDeviceChartData } from "../DeviceDataChart/hooks/useDeviceChartData";
import {
  FILTER_MODE_OPTIONS,
  LINE_GRANULARITY_OPTIONS,
  RANGE_PRESET_OPTIONS,
} from "../DeviceDataChart/utils/deviceDataChartConstants";
import {
  getCustomRangeInputStep,
  getCustomRangeLimitEnd,
  parseCustomRangeInputMs,
  usesDateOnlyCustomRangeInput,
} from "../DeviceDataChart/utils/deviceDataChartUtils";
import {
  formatStatNumber,
  formatStatUnitValue,
  getRangeGranularity,
} from "../DeviceDataChart/utils/deviceChartHelpers";
import { useOutsideMenuClose } from "../../hooks/useOutsideMenuClose";
import {
  buildListModalItems,
  buildSectionAssignments,
  ensurePanelLayout,
  getListCount,
  getSectionIdFromKey,
  getSectionKey,
  isSectionKey,
  mergeLayout,
  normalizeLayoutItem,
} from "./utils/deviceDataPanelUtils";

type DeviceDataCardContentProps = {
  label: string;
  labelColor?: string;
  value: ReactNode;
};

const clearBrowserSelection = () => {
  if (typeof window === "undefined") return;
  window.getSelection?.()?.removeAllRanges?.();
};

const getRangeRefreshSpec = (granularity: LineGranularity) => {
  switch (granularity) {
    case "sec":
      return { min: 2, max: 5, step: 1, unit: "s" as const };
    case "minute":
      return { min: 5, max: 10, step: 1, unit: "s" as const };
    case "hour":
      return { min: 30, max: 60, step: 1, unit: "s" as const };
    case "day":
    case "week":
      return { min: 2, max: 5, step: 1, unit: "min" as const };
    case "month":
    case "year":
      return { min: 5, max: 10, step: 1, unit: "min" as const };
    default:
      return { min: 5, max: 10, step: 1, unit: "s" as const };
  }
};

const buildRefreshRangeOptions = (
  spec: ReturnType<typeof getRangeRefreshSpec>
): Array<{ value: string; label: string }> => {
  const options: Array<{ value: string; label: string }> = [];
  for (let value = spec.min; value <= spec.max; value += spec.step) {
    const label = spec.unit === "min" ? `${value} min` : `${value}s`;
    options.push({ value: String(value), label });
  }
  return options;
};

const getCountTotal = (value: unknown) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "boolean") return 1;
  if (Array.isArray(value)) return value.length;
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce<number>((sum, item) => {
      if (typeof item === "number" && Number.isFinite(item)) return sum + item;
      if (typeof item === "boolean") return sum + 1;
      if (typeof item === "string") {
        const parsed = Number(item.trim());
        return Number.isFinite(parsed) ? sum + parsed : sum + 1;
      }
      return item === null || item === undefined ? sum : sum + 1;
    }, 0);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : 1;
  }
  return 0;
};

const formatCountTotal = (count: number, unit: string) => {
  const display = Number.isInteger(count) ? String(count) : String(count);
  return unit ? `${display} ${unit}` : display;
};

const parsePanelNumber = (value: unknown) => {
  if (typeof value === "boolean") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

function DeviceDataCardContent({ label, labelColor, value }: DeviceDataCardContentProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    let frameId = 0;
    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      const nextWidth = Math.max(0, Math.round(rect.width));
      const nextHeight = Math.max(0, Math.round(rect.height));
      setSize((prev) =>
        prev.width === nextWidth && prev.height === nextHeight
          ? prev
          : { width: nextWidth, height: nextHeight }
      );
    };
    updateSize();
    const observer = new ResizeObserver(() => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updateSize);
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);

  const hasSize = size.width > 0 && size.height > 0;
  const minDim = Math.max(1, Math.min(size.width || 0, size.height || 0));
  const hideLabel = hasSize && minDim < 52;
  const hideValue = hasSize && minDim < 32;
  const labelFontSize = hasSize ? Math.min(16, Math.max(10, Math.round(minDim * 0.24))) : undefined;
  const valueFontSize = hasSize ? Math.min(22, Math.max(12, Math.round(minDim * 0.38))) : undefined;
  const labelStyle = {
    ...(labelColor ? { color: labelColor } : {}),
    ...(labelFontSize ? { fontSize: labelFontSize } : {}),
  };
  const valueStyle = valueFontSize ? { fontSize: valueFontSize } : undefined;

  return (
    <div className={styles["device-data-card-content"]} ref={contentRef}>
      {!hideLabel && (
        <span className={styles["device-data-label"]} style={labelStyle}>
          {label}
        </span>
      )}
      {!hideValue && (
        <span className={styles["device-data-value"]} style={valueStyle}>
          {value}
        </span>
      )}
    </div>
  );
}

export function DeviceDataPanel<T extends string>({
  displayMode,
  options,
  onDisplayChange,
  deviceUid,
  dataIntervalSeconds,
  rawTimestamp,
  filterMode,
  onFilterModeChange,
  rangePreset,
  onRangePresetChange,
  rangeRefreshMs,
  onRangeRefreshMsChange,
  timeGranularity,
  onTimeGranularityChange,
  timeStart,
  onTimeStartChange,
  timeEnd,
  onTimeEndChange,
  disabled,
  readOnly = false,
  subtitle,
  panelFields,
  panelLayout,
  panelSections,
  getFieldLabel,
  getFieldSectionId,
  getFieldRawValue,
  getFieldValue,
  getFieldBooleanDisplay,
  getFieldBooleanColors,
  getFieldBooleanLabels,
  getFieldType,
  getFieldMetric,
  getFieldUnit,
  getFieldColor,
  getFieldCases,
  getFieldCaseColors,
  onOpenFieldConfig,
  onAddField,
  onDuplicateField,
  onRemoveField,
  onAddSection,
  onRenameSection,
  onDeleteSection,
  onToggleSection,
  onStartEdit,
  onCancelEdit,
  onSaveLayout,
  layoutSaving = false,
  layoutError = null,
}: DeviceDataPanelProps<T>) {
  const [activeMenuField, setActiveMenuField] = useState<string | null>(null);
  const [activeListField, setActiveListField] = useState<string | null>(null);
  const [isLayoutEditing, setIsLayoutEditing] = useState(false);
  const [activeSectionMenu, setActiveSectionMenu] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const sectionModal = useSectionModalState();
  const [draftAssignments, setDraftAssignments] = useState<Record<string, string | null>>({});
  // Guard against layout updates triggered by props or effects vs user interactions.
  const isUserInteraction = useRef(false);
  const previousFieldsRef = useRef<string[]>(panelFields);
  const maxRawGapMs = useMemo(() => {
    if (typeof dataIntervalSeconds !== "number" || !Number.isFinite(dataIntervalSeconds)) {
      return null;
    }
    if (dataIntervalSeconds <= 0) return null;
    return Math.max(3000, Math.round(dataIntervalSeconds * 1000 * 3));
  }, [dataIntervalSeconds]);
  const rangeRefreshSpec = useMemo(
    () => getRangeRefreshSpec(getRangeGranularity(rangePreset)),
    [rangePreset]
  );
  const rangeRefreshOptions = useMemo(
    () => buildRefreshRangeOptions(rangeRefreshSpec),
    [rangeRefreshSpec]
  );
  const rangeRefreshUnitMs = rangeRefreshSpec.unit === "min" ? 60_000 : 1000;
  const rangeRefreshValue = Math.round(rangeRefreshMs / rangeRefreshUnitMs);
  const { filteredLatestValues } = useDeviceChartData({
    deviceUid,
    filterMode,
    rawTimestamp,
    getChartValue: getFieldRawValue,
    availableFields: panelFields,
    maxRawGapMs,
    rangePreset,
    timeGranularity,
    timeStart,
    timeEnd,
    rangeRefreshMs,
    getChartType: getFieldType,
    getChartMetric: getFieldMetric,
    getChartCases: getFieldCases,
    suspendLive: isLayoutEditing,
    suspendRange: isLayoutEditing,
  });
  const getDisplayRawValue = (field: string) => {
    if (filterMode === "raw") return getFieldRawValue(field);
    const value = filteredLatestValues[field];
    const fieldType = getFieldType(field);
    const fieldMetric = getFieldMetric?.(field);
    if (
      fieldMetric !== "count" &&
      (fieldType === "text" || fieldType === "boolean") &&
      (Array.isArray(value) || (value && typeof value === "object"))
    ) {
      return undefined;
    }
    return value;
  };
  const getDisplayFormattedValue = (field: string) => {
    const rawValue = getDisplayRawValue(field);
    if (rawValue === null || rawValue === undefined) return "--";
    if (Array.isArray(rawValue)) return JSON.stringify(rawValue);
    if (typeof rawValue === "object") {
      const entries = Object.entries(rawValue as Record<string, unknown>).filter(([, value]) => value !== null && value !== undefined);
      if (
        entries.length > 0 &&
        entries.every(([, value]) => ["string", "number", "boolean"].includes(typeof value))
      ) {
        return entries.map(([key, value]) => `${key}: ${String(value)}`).join(", ");
      }
      return JSON.stringify(rawValue);
    }
    return String(rawValue);
  };
  const currentAssignments = useMemo(() => {
    const map: Record<string, string | null> = {};
    panelFields.forEach((field) => {
      map[field] = getFieldSectionId(field);
    });
    return map;
  }, [panelFields, getFieldSectionId]);
  const normalizedLayout = useMemo(
    () => ensurePanelLayout(panelFields, panelSections, panelLayout),
    [panelFields, panelSections, panelLayout]
  );
  const [draftLayout, setDraftLayout] = useState<Layout>(normalizedLayout as Layout);
  const { width, containerRef, measureWidth } = useContainerWidth({
    initialWidth: 1200,
    measureBeforeMount: false,
  });
  const gridWidth = Math.max(width, 1);
  const resizeHandles = isLayoutEditing && !disabled && !readOnly ? RESIZE_HANDLES : [];
  const dragCancelSelector = `.${styles["device-data-settings"]}, .${styles["device-data-menu"]}, .${styles["device-section-menu-button"]}, .${styles["device-section-menu"]}, .${styles["device-section-toggle"]}, .${styles["device-chart-resize-handle"]}, .react-resizable-handle`;
  const dragBounded = !(isLayoutEditing && panelSections.length > 0);
  const handlePreventNativeDrag = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!isLayoutEditing) return;
    event.preventDefault();
    clearBrowserSelection();
  };
  const renderResizeHandle = (axis: ResizeHandleAxis, ref: Ref<HTMLSpanElement>) => (
    <span
      ref={ref}
      className={styles["device-chart-resize-handle"]}
      style={axis === "se" ? { right: RESIZE_HANDLE_INSET, bottom: RESIZE_HANDLE_INSET } : undefined}
    >
      <span className={styles["device-chart-resize-handle-icon"]} />
    </span>
  );

  const { state: sectionModalState, close: closeSectionModal, setName: setSectionModalName } =
    sectionModal;
  const listModalItems = useMemo(() => {
    if (!activeListField) return [];
    return buildListModalItems(getDisplayRawValue(activeListField));
  }, [activeListField, getDisplayRawValue]);
  const listCaseColors = useMemo(() => {
    if (!activeListField) return null;
    if (getFieldType(activeListField) === "boolean") {
      const labels = getFieldBooleanLabels?.(activeListField) ?? null;
      const colors = getFieldBooleanColors?.(activeListField) ?? null;
      const trueLabel = labels?.trueLabel?.trim() || "True";
      const falseLabel = labels?.falseLabel?.trim() || "False";
      const trueColor = colors?.trueColor?.trim() || "";
      const falseColor = colors?.falseColor?.trim() || "";
      const map: Record<string, string> = {};
      if (trueColor) {
        map[trueLabel] = trueColor;
        map.true = trueColor;
        map["1"] = trueColor;
      }
      if (falseColor) {
        map[falseLabel] = falseColor;
        map.false = falseColor;
        map["0"] = falseColor;
      }
      return Object.keys(map).length ? map : null;
    }
    return getFieldCaseColors?.(activeListField) ?? null;
  }, [
    activeListField,
    getFieldBooleanColors,
    getFieldBooleanLabels,
    getFieldCaseColors,
    getFieldType,
  ]);

  useOutsideMenuClose(activeMenuField, "data-field-menu", setActiveMenuField);
  useOutsideMenuClose(activeSectionMenu, "data-section-menu", setActiveSectionMenu);

  useEffect(() => {
    if (activeMenuField && !panelFields.includes(activeMenuField)) {
      setActiveMenuField(null);
    }
  }, [activeMenuField, panelFields]);

  useEffect(() => {
    if (activeSectionMenu && !panelSections.some((section) => section.id === activeSectionMenu)) {
      setActiveSectionMenu(null);
    }
  }, [activeSectionMenu, panelSections]);

  useEffect(() => {
    if (activeListField && !panelFields.includes(activeListField)) {
      setActiveListField(null);
    }
  }, [activeListField, panelFields]);

  useEffect(() => {
    if (!isLayoutEditing) {
      setDraftLayout(normalizedLayout as Layout);
    }
  }, [normalizedLayout, isLayoutEditing]);

  useEffect(() => {
    if (!isLayoutEditing) return;
    clearBrowserSelection();
  }, [isLayoutEditing]);

  useEffect(() => {
    if (!isLayoutEditing) {
      previousFieldsRef.current = panelFields;
      return;
    }
    setDraftLayout((prev) => {
      let nextLayout = prev as PanelLayoutItem[];
      const previousFields = previousFieldsRef.current;
      const removed = previousFields.filter((field) => !panelFields.includes(field));
      const added = panelFields.filter((field) => !previousFields.includes(field));
      if (removed.length === 1 && added.length === 1) {
        const [from] = removed;
        const [to] = added;
        nextLayout = nextLayout.map((item) =>
          item.i === from ? { ...item, i: to } : item
        );
        setDraftAssignments((prevAssignments) => {
          if (!(from in prevAssignments)) return prevAssignments;
          const nextAssignments = { ...prevAssignments, [to]: prevAssignments[from] ?? null };
          delete nextAssignments[from];
          return nextAssignments;
        });
      }
      previousFieldsRef.current = panelFields;
      return ensurePanelLayout(panelFields, panelSections, nextLayout) as Layout;
    });
  }, [panelFields, panelSections, isLayoutEditing]);

  useEffect(() => {
    measureWidth();
  }, [panelFields.length, panelSections.length, isLayoutEditing, measureWidth]);

  const renderFieldValue = (field: string) => {
    const fieldType = getFieldType(field);
    const fieldMetric = getFieldMetric?.(field);
    if (fieldType === "list") {
      const rawValue = getDisplayRawValue(field);
      const unit = getFieldUnit(field);
      const count = fieldMetric === "count" ? getCountTotal(rawValue) : getListCount(rawValue);
      const display = formatCountTotal(count, unit);
      return <span className={styles["device-data-value-inner"]}>{display}</span>;
    }
    if (
      fieldMetric === "count" &&
      !(filterMode === "raw" && (fieldType === "boolean" || fieldType === "text"))
    ) {
      const count = getCountTotal(getDisplayRawValue(field));
      return formatCountTotal(count, getFieldUnit(field));
    }
    if (fieldType === "boolean") {
      const display = getFieldBooleanDisplay?.(field, getDisplayRawValue(field));
      const label = display?.label ?? getDisplayFormattedValue(field);
      const color = display?.color?.trim();
      if (color) {
        return <span className={styles["device-data-value-inner"]} style={{ color }}>{label}</span>;
      }
      return label;
    }
    const displayValue = filterMode === "raw" ? getFieldValue(field) : (() => {
      const rawValue = getDisplayRawValue(field);
      const unit = getFieldUnit(field);
      const numericValue = parsePanelNumber(rawValue);
      if (fieldType === "number" && numericValue !== null) {
        return formatStatUnitValue(formatStatNumber(numericValue, 2), unit);
      }
      const value = getDisplayFormattedValue(field);
      if (!unit || value === "--") return value;
      return formatStatUnitValue(value, unit);
    })();
    if (fieldType !== "text") {
      return displayValue;
    }
    const rawValue = getDisplayRawValue(field);
    const caseColors = getFieldCaseColors?.(field) ?? null;
    if (!caseColors || rawValue === null || rawValue === undefined) {
      return displayValue;
    }
    const key = String(rawValue).trim();
    if (!key) return displayValue;
    const directColor = caseColors[key];
    const fallbackColor = caseColors[key.toLowerCase()];
    const color = directColor || fallbackColor;
    if (!color) return displayValue;
    return <span className={styles["device-data-value-inner"]} style={{ color }}>{displayValue}</span>;
  };

  const openAddSection = () => {
    if (!isLayoutEditing || readOnly || disabled) return;
    sectionModal.openAdd();
  };

  const openRenameSection = (section: PanelSection) => {
    if (!isLayoutEditing || readOnly || disabled) return;
    sectionModal.openRename(section);
  };

  const handleSaveSection = () => {
    const trimmed = sectionModal.state.name.trim();
    if (!trimmed) {
      sectionModal.setError("Section name is required.");
      return;
    }
    if (sectionModal.state.editingId) {
      onRenameSection(sectionModal.state.editingId, trimmed);
    } else {
      onAddSection(trimmed);
    }
    sectionModal.close();
  };

  const handleEnterLayoutEdit = () => {
    if (readOnly || disabled) return;
    onStartEdit?.();
    setDraftLayout(normalizedLayout as Layout);
    setDraftAssignments(
      buildSectionAssignments(normalizedLayout, panelSections, currentAssignments)
    );
    setIsLayoutEditing(true);
  };

  const handleCancelLayoutEdit = () => {
    onCancelEdit?.();
    setIsLayoutEditing(false);
    setDraftLayout(normalizedLayout as Layout);
    setDraftAssignments({});
    setActiveSectionMenu(null);
    sectionModal.close();
  };

  const handleSaveLayout = async () => {
    if (!onSaveLayout) {
      setIsLayoutEditing(false);
      return;
    }
    try {
      const sanitizedLayout = (draftLayout as PanelLayoutItem[]).map((item) =>
        normalizeLayoutItem(item)
      );
      const baseAssignments = isLayoutEditing ? draftAssignments : currentAssignments;
      const recomputeIds = new Set(
        sanitizedLayout.filter((item) => !isSectionKey(item.i)).map((item) => item.i)
      );
      const assignments = buildSectionAssignments(
        sanitizedLayout,
        panelSections,
        baseAssignments,
        recomputeIds
      );
      await onSaveLayout({ layout: sanitizedLayout, assignments });
      setIsLayoutEditing(false);
      setActiveSectionMenu(null);
    } catch {
      // keep editing mode on failure
    }
  };

  const handleLayoutChange = (nextLayout: Layout) => {
    if (!isLayoutEditing || readOnly || disabled) return;
    if (!isUserInteraction.current) return;
    setDraftLayout((prev) => mergeLayout(prev, nextLayout));
  };

  const handleDragStart = () => {
    if (!isLayoutEditing || readOnly || disabled) return;
    isUserInteraction.current = true;
  };

  const handleDragStop = (
    nextLayout: Layout,
    _oldItem: LayoutItem | null,
    newItem: LayoutItem | null
  ) => {
    if (!isLayoutEditing || readOnly || disabled) return;
    isUserInteraction.current = false;
    const normalized = (nextLayout as PanelLayoutItem[]).map((item) =>
      normalizeLayoutItem(item)
    );
    setDraftLayout((prev) => mergeLayout(prev, normalized));
    if (!newItem) return;
    if (isSectionKey(newItem.i)) return;
    const nextAssignments = buildSectionAssignments(
      normalized,
      panelSections,
      draftAssignments,
      new Set([newItem.i])
    );
    setDraftAssignments((prev) => ({
      ...prev,
      [newItem.i]: nextAssignments[newItem.i] ?? null,
    }));
  };

  const handleResizeStart = () => {
    if (!isLayoutEditing || readOnly || disabled) return;
    isUserInteraction.current = true;
  };

  const handleResizeStop = (nextLayout: Layout) => {
    if (!isLayoutEditing || readOnly || disabled) return;
    isUserInteraction.current = false;
    setDraftLayout((prev) => mergeLayout(prev, nextLayout));
  };

  const displayLayout = useMemo(
    () => (isLayoutEditing ? (draftLayout as PanelLayoutItem[]) : normalizedLayout),
    [draftLayout, isLayoutEditing, normalizedLayout]
  );
  const sectionAssignments = useMemo(
    () =>
      buildSectionAssignments(
        displayLayout,
        panelSections,
        isLayoutEditing ? draftAssignments : currentAssignments
      ),
    [displayLayout, panelSections, currentAssignments, draftAssignments, isLayoutEditing]
  );
  const collapsedSectionIds = useMemo(
    () => new Set(panelSections.filter((section) => section.collapsed).map((section) => section.id)),
    [panelSections]
  );
  const visibleLayout = useMemo(
    () =>
      displayLayout.filter((item) => {
        if (isSectionKey(item.i)) return true;
        const sectionId = sectionAssignments[item.i];
        return !sectionId || !collapsedSectionIds.has(sectionId);
      }),
    [displayLayout, sectionAssignments, collapsedSectionIds]
  );
  const fieldsBySection = useMemo(() => {
    const map: Record<string, string[]> = {};
    Object.entries(sectionAssignments).forEach(([field, sectionId]) => {
      if (!sectionId) return;
      if (!map[sectionId]) {
        map[sectionId] = [];
      }
      map[sectionId].push(field);
    });
    return map;
  }, [sectionAssignments]);
  const showSectionsLayout = panelFields.length > 0 || panelSections.length > 0 || isLayoutEditing;

  const renderFieldCard = (field: string) => {
    const fieldType = getFieldType(field);
    const fieldMetric = getFieldMetric?.(field);
    const canViewCountDetails = filterMode !== "raw";
    const canViewDetails =
      fieldType === "list" ||
      (canViewCountDetails &&
        (fieldType === "text" || fieldType === "boolean") &&
        fieldMetric === "count");
    const canOpenMenu = canViewDetails || (!readOnly && isLayoutEditing);
    const labelColor = getFieldColor?.(field)?.trim();
    return (
      <div
        key={field}
        className={`${styles["device-data-card"]} ${
          isLayoutEditing ? styles["device-data-card-editing"] : ""
        } ${activeMenuField === field ? styles["device-data-card-active"] : ""}`}
      >
        {canOpenMenu && (
          <div className={styles["device-data-card-actions"]} data-field-menu={field}>
            <button
              type="button"
              className={`${styles["device-data-settings"]} ${
                activeMenuField === field ? styles["device-data-settings-active"] : ""
              }`}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setActiveMenuField((prev) => (prev === field ? null : field));
              }}
              aria-label={`Field options for ${field}`}
            >
              <FaCog />
            </button>
            {activeMenuField === field && (
              <div
                className={styles["device-data-menu"]}
                onMouseDown={(event) => event.stopPropagation()}
              >
                {canViewDetails && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuField(null);
                      setActiveListField(field);
                    }}
                    disabled={getListCount(getDisplayRawValue(field)) === 0}
                  >
                    View details
                  </button>
                )}
                {isLayoutEditing && !readOnly && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenuField(null);
                        onOpenFieldConfig(field);
                      }}
                    >
                      Edit
                    </button>
                    {onDuplicateField && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuField(null);
                          onDuplicateField(field);
                        }}
                      >
                        Duplicate
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles["device-data-menu-remove"]}
                      onClick={() => {
                        setActiveMenuField(null);
                        onRemoveField(field);
                      }}
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
        <DeviceDataCardContent
          label={getFieldLabel(field)}
          labelColor={labelColor || undefined}
          value={renderFieldValue(field)}
        />
      </div>
    );
  };

  const renderSectionRow = (sectionId: string) => {
    const section = panelSections.find((item) => item.id === sectionId);
    if (!section) {
      return (
        <div
          key={getSectionKey(sectionId)}
          className={styles["device-section-row"]}
          style={{ visibility: "hidden" }}
          aria-hidden="true"
        />
      );
    }
    const isCollapsed = Boolean(section.collapsed);
    const fieldsInSection = fieldsBySection[section.id] ?? [];
    return (
      <div
        key={getSectionKey(section.id)}
        className={`${styles["device-section-row"]} ${
          isLayoutEditing ? styles["device-section-row-editing"] : ""
        } ${activeSectionMenu === section.id ? styles["device-section-row-active"] : ""}`}
        data-section-menu={section.id}
      >
        <div className={styles["device-section-row-left"]}>
          <button
            type="button"
            className={styles["device-section-toggle"]}
            onClick={() => {
              if (disabled) return;
              onToggleSection(section.id);
            }}
            disabled={disabled}
            aria-label={isCollapsed ? "Expand section" : "Collapse section"}
          >
            {isCollapsed ? <FaChevronRight /> : <FaChevronDown />}
          </button>
          <span className={styles["device-section-title"]}>{section.name}</span>
          {isLayoutEditing && !readOnly && (
            <span className={styles["device-section-count"]}>{fieldsInSection.length} items</span>
          )}
        </div>
        <div className={styles["device-section-row-actions"]}>
          {isLayoutEditing && !readOnly && (
            <div className={styles["device-section-actions"]}>
              <button
                type="button"
                className={`${styles["device-section-menu-button"]} ${
                  activeSectionMenu === section.id ? styles["device-section-menu-button-active"] : ""
                }`}
                aria-label="Section options"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveSectionMenu((prev) => (prev === section.id ? null : section.id));
                }}
              >
                <FaEllipsisV />
              </button>
              {activeSectionMenu === section.id && (
                <div className={styles["device-section-menu"]}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSectionMenu(null);
                      openRenameSection(section);
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className={styles["device-section-menu-remove"]}
                    onClick={() => {
                      setActiveSectionMenu(null);
                      onDeleteSection(section.id, fieldsInSection);
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const useDateOnlyCustomInput = usesDateOnlyCustomRangeInput(timeGranularity);
  const timeDateInputType = useDateOnlyCustomInput ? "date" : "datetime-local";
  const timeDateStep = useDateOnlyCustomInput ? undefined : getCustomRangeInputStep(timeGranularity);
  const timeDateLabel = useDateOnlyCustomInput ? "(date)" : "(time)";
  const startTimeValue = timeStart.trim();
  const endTimeValue = timeEnd.trim();
  const parsedStartTime = startTimeValue
    ? parseCustomRangeInputMs(startTimeValue, timeGranularity)
    : null;
  const parsedEndTime = endTimeValue
    ? parseCustomRangeInputMs(endTimeValue, timeGranularity, { end: true })
    : null;
  const hasTimeFormatError =
    filterMode === "custom" &&
    Boolean((startTimeValue && parsedStartTime === null) || (endTimeValue && parsedEndTime === null));
  const hasTimeRangeError =
    filterMode === "custom" &&
    parsedStartTime !== null &&
    parsedEndTime !== null &&
    parsedStartTime > parsedEndTime;
  const maxCustomRangeEnd =
    parsedStartTime === null ? null : getCustomRangeLimitEnd(parsedStartTime, timeGranularity);
  const hasTimeRangeLimitError =
    filterMode === "custom" &&
    maxCustomRangeEnd !== null &&
    parsedEndTime !== null &&
    parsedEndTime > maxCustomRangeEnd;
  const maxEndDate =
    maxCustomRangeEnd === null
      ? undefined
      : useDateOnlyCustomInput
        ? new Date(maxCustomRangeEnd).toISOString().slice(0, 10)
        : new Date(maxCustomRangeEnd).toISOString().slice(0, 16);

  return (
    <div className={styles["device-data-panel"]}>
      <DeviceDataPanelHeader
        isEditing={isLayoutEditing}
        disabled={disabled}
        readOnly={readOnly}
        layoutSaving={layoutSaving}
        subtitle={subtitle}
        displayMode={displayMode}
        options={options}
        onDisplayChange={onDisplayChange}
        onOpenFilter={() => setIsFilterOpen(true)}
        onOpenSection={openAddSection}
        onAddField={onAddField}
        onEnterEdit={handleEnterLayoutEdit}
        onExitEdit={handleCancelLayoutEdit}
        onSave={handleSaveLayout}
      />

      {isLayoutEditing && layoutError && (
        <p className={formStyles["dashboard-modal-error"]}>{layoutError}</p>
      )}

      {!showSectionsLayout ? (
        <div className={styles["device-data-empty"]}>
          <p>No data fields configured yet.</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className={`${styles["device-chart-grid"]} ${
            isLayoutEditing ? styles["device-chart-grid-editing"] : ""
          }`}
          onDragStartCapture={handlePreventNativeDrag}
        >
          <GridLayout
            width={gridWidth}
            layout={visibleLayout}
            gridConfig={{
              cols: GRID_COLS,
              rowHeight: GRID_ROW_HEIGHT,
              margin: GRID_MARGIN,
              containerPadding: GRID_PADDING,
            }}
            dragConfig={{
              enabled: isLayoutEditing && !disabled,
              cancel: dragCancelSelector,
              bounded: dragBounded,
            }}
            resizeConfig={{
              enabled: isLayoutEditing && !disabled,
              handles: resizeHandles,
              handleComponent: renderResizeHandle,
            }}
            compactor={GRID_COMPACTOR}
            onLayoutChange={handleLayoutChange}
            onDragStart={handleDragStart}
            onDragStop={handleDragStop}
            onResizeStart={handleResizeStart}
            onResizeStop={handleResizeStop}
          >
            {visibleLayout.map((item) =>
              isSectionKey(item.i)
                ? renderSectionRow(getSectionIdFromKey(item.i))
                : renderFieldCard(item.i)
            )}
          </GridLayout>
        </div>
      )}

      <Modal isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} title="Data panel filters">
        <div className={formStyles["dashboard-modal-form"]}>
          <DropdownSelect
            id="device-panel-filter-mode"
            label="Mode"
            value={filterMode}
            options={FILTER_MODE_OPTIONS}
            onChange={onFilterModeChange}
            disabled={disabled}
          />
          {filterMode === "raw" && (
            <div className={formStyles["dashboard-modal-hint"]}>Using live device data.</div>
          )}
          {filterMode === "range" && (
            <div className={formStyles["dashboard-inline-row"]}>
              <DropdownSelect
                id="device-panel-range-preset"
                label="Range"
                value={rangePreset}
                options={RANGE_PRESET_OPTIONS}
                onChange={onRangePresetChange}
                disabled={disabled}
                groupClassName={formStyles["dashboard-inline-field"]}
              />
              <DropdownSelect
                id="device-panel-range-refresh"
                label="Refresh rate"
                value={String(rangeRefreshValue)}
                options={rangeRefreshOptions}
                onChange={(value) => {
                  const next = Number(value);
                  if (!Number.isFinite(next)) return;
                  const clamped = Math.min(rangeRefreshSpec.max, Math.max(rangeRefreshSpec.min, next));
                  onRangeRefreshMsChange(clamped * rangeRefreshUnitMs);
                }}
                disabled={disabled || rangeRefreshOptions.length === 0}
                groupClassName={formStyles["dashboard-inline-field"]}
              />
            </div>
          )}
          {filterMode === "custom" && (
            <>
              <DropdownSelect
                id="device-panel-time-granularity"
                label="Granularity"
                value={timeGranularity}
                options={LINE_GRANULARITY_OPTIONS}
                onChange={(value) => {
                  onTimeGranularityChange(value);
                  onTimeStartChange("");
                  onTimeEndChange("");
                }}
                disabled={disabled}
              />
              <Input
                id="device-panel-time-start"
                label={`Start ${timeDateLabel}`}
                type={timeDateInputType}
                step={timeDateStep}
                value={timeStart}
                onChange={(event) => onTimeStartChange(event.target.value)}
                disabled={disabled}
                max={endTimeValue || undefined}
              />
              <Input
                id="device-panel-time-end"
                label={`End ${timeDateLabel}`}
                type={timeDateInputType}
                step={timeDateStep}
                value={timeEnd}
                onChange={(event) => onTimeEndChange(event.target.value)}
                disabled={disabled}
                min={startTimeValue || undefined}
                max={maxEndDate}
              />
              {hasTimeFormatError && (
                <p className={formStyles["dashboard-modal-error"]}>
                  Enter a valid start and end time.
                </p>
              )}
              {!hasTimeFormatError && hasTimeRangeError && (
                <p className={formStyles["dashboard-modal-error"]}>
                  End time must be after start time.
                </p>
              )}
              {!hasTimeFormatError && !hasTimeRangeError && hasTimeRangeLimitError && (
                <p className={formStyles["dashboard-modal-error"]}>
                  Selected range is too large for this granularity.
                </p>
              )}
            </>
          )}
          <div className={formStyles["dashboard-modal-actions"]}>
            <Button type="button" variant="cancel" onClick={() => setIsFilterOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <DeviceDataPanelModals
        sectionModalState={sectionModalState}
        onSectionNameChange={setSectionModalName}
        onSectionClose={closeSectionModal}
        onSectionSave={handleSaveSection}
        activeListField={activeListField}
        listModalItems={listModalItems}
        listCaseColors={listCaseColors}
        getFieldLabel={getFieldLabel}
        onCloseList={() => setActiveListField(null)}
      />
    </div>
  );
}
