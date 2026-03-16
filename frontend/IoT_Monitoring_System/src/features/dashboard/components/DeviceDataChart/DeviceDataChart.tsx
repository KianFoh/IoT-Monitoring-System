import { type DragEvent as ReactDragEvent, type Ref, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { FaChevronDown, FaChevronRight, FaEllipsisV } from "react-icons/fa";
import {
  GridLayout,
  type Layout,
  type ResizeHandleAxis,
  useContainerWidth,
} from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import styles from "./DeviceDataChart.module.css";
import formStyles from "../DashboardForm/DashboardForm.module.css";
import { DeviceDataChartHeader } from "./DeviceDataChartHeader";
import { DeviceDataChartModals } from "./DeviceDataChartModals";
import { DeviceChartCard } from "./DeviceChartCard";
import { useDeviceChartData } from "./hooks/useDeviceChartData";
import { useChartLayout } from "./hooks/useChartLayout";
import { useChartFormControls } from "./hooks/useChartFormControls";
import { useChartActions } from "./hooks/useChartActions";
import { useSectionActions } from "./hooks/useSectionActions";
import { useChartSave } from "./hooks/useChartSave";
import { useOutsideMenuClose } from "../../hooks/useOutsideMenuClose";
import {
  GRID_COLS,
  GRID_COMPACTOR,
  GRID_MARGIN,
  GRID_PADDING,
  GRID_ROW_HEIGHT,
  RESIZE_HANDLE_INSET,
  RESIZE_HANDLES,
} from "./utils/deviceDataChartConstants";
import { chartFormReducer, INITIAL_CHART_FORM_STATE, useSectionModalState } from "./state/deviceDataChartState";
import type {
  ChartItem,
  ChartLayoutItem,
  ChartSection,
  DeviceDataChartProps,
  LineGranularity,
} from "./types/deviceDataChartTypes";
import {
  ensureChartLayout,
  getCustomRangeInputStep,
  getSectionIdFromKey,
  getSectionKey,
  isSectionKey,
  normalizeChart,
  usesDateOnlyCustomRangeInput,
} from "./utils/deviceDataChartUtils";
import { getRangeGranularity, normalizeCaseList } from "./utils/deviceChartHelpers";

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

const clearBrowserSelection = () => {
  if (typeof window === "undefined") return;
  window.getSelection?.()?.removeAllRanges?.();
};

export function DeviceDataChart<T extends string>({
  displayMode,
  options,
  onDisplayChange,
  deviceUid,
  dataIntervalSeconds,
  disabled,
  readOnly = false,
  availableFields,
  getChartValue,
  getChartUnit,
  getChartLabel,
  getChartType,
  getChartColor,
  getChartCases,
  getChartCaseColors,
  getChartBooleanColors,
  getChartBooleanLabels,
  onOutputSend,
  onFilterModeChange,
  rawTimestamp,
  savedCharts = [],
  savedLayout = [],
  savedSections = [],
  onSave,
  saving = false,
  saveError = null,
}: DeviceDataChartProps<T>) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftSections, setDraftSections] = useState<ChartSection[]>(savedSections);
  const [viewSections, setViewSections] = useState<ChartSection[]>(savedSections);
  const [draftAssignments, setDraftAssignments] = useState<Record<string, string | null>>({});
  const [activeSectionMenu, setActiveSectionMenu] = useState<string | null>(null);
  const sectionModal = useSectionModalState();
  const [chartForm, dispatchChartForm] = useReducer(chartFormReducer, INITIAL_CHART_FORM_STATE);
  const normalizedSavedCharts = useMemo(
    () => savedCharts.map((chart) => normalizeChart(chart)),
    [savedCharts]
  );
  const normalizedSavedLayout = useMemo(
    () => ensureChartLayout(normalizedSavedCharts, savedSections, savedLayout),
    [normalizedSavedCharts, savedSections, savedLayout]
  );
  const [draftCharts, setDraftCharts] = useState<ChartItem[]>(normalizedSavedCharts);
  const [draftLayout, setDraftLayout] = useState<Layout>(normalizedSavedLayout as Layout);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [rangeRefreshMs, setRangeRefreshMs] = useState<number>(5000);
  const [chartViewToken, setChartViewToken] = useState(0);
  const [observedWidth, setObservedWidth] = useState<number | null>(null);
  const [frozenValues, setFrozenValues] = useState<Record<string, unknown> | null>(null);
  const wasEditingRef = useRef(false);
  const maxRawGapMs = useMemo(() => {
    if (typeof dataIntervalSeconds !== "number" || !Number.isFinite(dataIntervalSeconds)) {
      return null;
    }
    if (dataIntervalSeconds <= 0) return null;
    return Math.max(3000, Math.round(dataIntervalSeconds * 1000 * 3));
  }, [dataIntervalSeconds]);
  const {
    isAddOpen,
    isAddOutputOpen,
    isEditOutputOpen,
    isEditOpen,
    isFilterOpen,
    selectedChartType,
    selectedOutputType,
    selectedOutputValueType,
    selectedOutputField,
    selectedOutputCase,
    selectedField,
    selectedMin,
    selectedMax,
    selectedLineFields,
    selectedLineMin,
    selectedLineMax,
    selectedLineTicks,
    selectedLineDecimals,
    selectedStatFontSize,
    selectedLineListMode,
    selectedLineSmooth,
    selectedBarOrientation,
    selectedBarRaceMode,
    selectedPieShowLabels,
    timeGranularity,
    timeStart,
    timeEnd,
    editingChartId,
    editingChartType,
    editingOutputId,
    editingOutputType,
    editName,
    editOutputName,
    editOutputField,
    editOutputCase,
    editField,
    editMin,
    editMax,
    editLineTicks,
    editLineDecimals,
    editStatFontSize,
    editLineListMode,
    editLineSmooth,
    editBarOrientation,
    editBarRaceMode,
    editPieShowLabels,
    editOutputValueType,
    filterMode,
    rangePreset,
  } = chartForm;
  const {
    state: sectionModalState,
    openAdd: openSectionModalAdd,
    openRename: openSectionModalRename,
    close: closeSectionModal,
    setName: setSectionModalName,
    setError: setSectionModalError,
    reset: resetSectionModal,
  } = sectionModal;
  const { rawSeries, filteredRawData, filteredLatestValues } = useDeviceChartData({
    deviceUid,
    filterMode,
    rawTimestamp,
    getChartValue,
    availableFields,
    maxRawGapMs,
    rangePreset,
    timeGranularity,
    timeStart,
    timeEnd,
    rangeRefreshMs,
    getChartType,
    suspendLive: isEditing,
    suspendRange: isEditing,
  });
  const dragCancelSelector = `.${styles["device-chart-menu-button"]}, .${styles["device-chart-menu"]}, .${styles["device-section-menu-button"]}, .${styles["device-section-menu"]}, .${styles["device-section-toggle"]}, .${styles["device-chart-resize-handle"]}, .react-resizable-handle`;
  const handlePreventNativeDrag = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!isEditing) return;
    event.preventDefault();
    clearBrowserSelection();
  };
  const { width, containerRef, measureWidth, mounted } = useContainerWidth({
    initialWidth: 1200,
    measureBeforeMount: true,
  });
  const gridWidth = Math.max(observedWidth ?? width, 1);
  const resizeHandles = isEditing && !disabled && !readOnly ? RESIZE_HANDLES : [];
  const renderResizeHandle = (axis: ResizeHandleAxis, ref: Ref<HTMLSpanElement>) => (
    <span
      ref={ref}
      className={styles["device-chart-resize-handle"]}
      style={axis === "se" ? { right: RESIZE_HANDLE_INSET, bottom: RESIZE_HANDLE_INSET } : undefined}
    >
      <span className={styles["device-chart-resize-handle-icon"]} />
    </span>
  );

  const dataOptions = useMemo(
    () => availableFields.map((field) => ({ value: field, label: field })),
    [availableFields]
  );
  const meterAllowedFields = useMemo(() => {
    if (!getChartType) return availableFields;
    return availableFields.filter((field) => getChartType(field) === "number");
  }, [availableFields, getChartType]);
  const meterDataOptions = useMemo(
    () => meterAllowedFields.map((field) => ({ value: field, label: field })),
    [meterAllowedFields]
  );
  const listAllowedFields = useMemo(() => {
    if (!getChartType) return [];
    return availableFields.filter((field) => getChartType(field) === "list");
  }, [availableFields, getChartType]);
  const listDataOptions = useMemo(
    () => listAllowedFields.map((field) => ({ value: field, label: field })),
    [listAllowedFields]
  );
  const {
    canAddChart,
    selectedOutputFieldType,
    editOutputFieldType,
    selectedLineFieldType,
    isSelectedLineList,
    hideLineNumericInputsInAdd,
    isEditLineList,
    hideLineNumericInputsInEdit,
    setSelectedChartType,
    setSelectedOutputType,
    setSelectedOutputValueType,
    setSelectedOutputField,
    setSelectedOutputCase,
    setSelectedField,
    setSelectedMin,
    setSelectedMax,
    setSelectedLineMin,
    setSelectedLineMax,
    setSelectedLineTicks,
    setSelectedLineDecimals,
    setSelectedStatFontSize,
    setSelectedLineListMode,
    setSelectedLineSmooth,
    setSelectedBarOrientation,
    setSelectedBarRaceMode,
    setSelectedPieShowLabels,
    setEditName,
    setEditOutputName,
    setEditOutputField,
    setEditOutputCase,
    setEditField,
    setEditMin,
    setEditMax,
    setEditLineTicks,
    setEditLineDecimals,
    setEditStatFontSize,
    setEditLineListMode,
    setEditLineSmooth,
    setEditBarOrientation,
    setEditBarRaceMode,
    setEditPieShowLabels,
    setEditOutputValueType,
    setTimeGranularity,
    setTimeStart,
    setTimeEnd,
    setFilterMode,
    setRangePreset,
  } = useChartFormControls({
    chartForm,
    dispatchChartForm,
    availableFields,
    meterAllowedFields,
    listAllowedFields,
    getChartType,
    getChartCases,
    disabled,
    readOnly,
    onFilterModeChange,
  });
  const selectedOutputCases = useMemo(
    () => normalizeCaseList(getChartCases?.(selectedOutputField)),
    [getChartCases, selectedOutputField]
  );
  const selectedOutputCaseOptions = useMemo(
    () => selectedOutputCases.map((label) => ({ value: label, label })),
    [selectedOutputCases]
  );
  const editOutputCases = useMemo(
    () => normalizeCaseList(getChartCases?.(editOutputField)),
    [getChartCases, editOutputField]
  );
  const editOutputCaseOptions = useMemo(
    () => editOutputCases.map((label) => ({ value: label, label })),
    [editOutputCases]
  );
  const requiresOutputCase =
    selectedOutputFieldType === "text" || selectedOutputFieldType === "list";
  const requiresEditOutputCase =
    editOutputFieldType === "text" || editOutputFieldType === "list";
  const canAddOutput = useMemo(() => {
    if (disabled || readOnly) return false;
    if (!selectedOutputField) return false;
    if (!requiresOutputCase) return true;
    if (!selectedOutputCaseOptions.length) return false;
    return Boolean(selectedOutputCase.trim());
  }, [
    disabled,
    readOnly,
    selectedOutputField,
    requiresOutputCase,
    selectedOutputCaseOptions.length,
    selectedOutputCase,
  ]);
  const canSaveOutput = useMemo(() => {
    if (disabled || readOnly) return false;
    if (!editOutputName.trim()) return false;
    if (!editOutputField) return false;
    if (!requiresEditOutputCase) return true;
    if (!editOutputCaseOptions.length) return false;
    return Boolean(editOutputCase.trim());
  }, [
    disabled,
    readOnly,
    editOutputName,
    editOutputField,
    requiresEditOutputCase,
    editOutputCaseOptions.length,
    editOutputCase,
  ]);
  const {
    sectionsForRender,
    dragBounded,
    chartsForRender,
    chartMap,
    savedAssignments,
    visibleLayout,
    chartsBySection,
    handleLayoutChange,
    handleDragStart,
    handleDragStop,
    handleResizeStart,
    handleResizeStop,
  } = useChartLayout({
    isEditing,
    readOnly,
    disabled,
    draftSections,
    viewSections,
    draftCharts,
    normalizedSavedCharts,
    draftLayout,
    normalizedSavedLayout: normalizedSavedLayout as Layout,
    draftAssignments,
    setDraftLayout,
    setDraftAssignments,
  });

  const timeDateInputType = usesDateOnlyCustomRangeInput(timeGranularity)
    ? "date"
    : "datetime-local";
  const timeDateStep =
    timeDateInputType === "datetime-local"
      ? getCustomRangeInputStep(timeGranularity)
      : undefined;
  const timeDateLabel = timeDateInputType === "datetime-local" ? "date/time" : "date";
  const rangeRefreshSpec = useMemo(
    () => getRangeRefreshSpec(getRangeGranularity(rangePreset)),
    [rangePreset]
  );
  const rangeRefreshUnitMs = rangeRefreshSpec.unit === "min" ? 60_000 : 1_000;
  const rangeRefreshMinMs = rangeRefreshSpec.min * rangeRefreshUnitMs;
  const rangeRefreshMaxMs = rangeRefreshSpec.max * rangeRefreshUnitMs;
  const rangeRefreshValue = Math.round(rangeRefreshMs / rangeRefreshUnitMs);
  const rangeRefreshOptions = useMemo(
    () => buildRefreshRangeOptions(rangeRefreshSpec),
    [rangeRefreshSpec]
  );
  const {
    handleOpenAdd,
    handleCloseAdd,
    handleOpenAddOutput,
    handleCloseAddOutput,
    handleSelectLineField,
    handleAddChart,
    handleAddOutput,
    handleOpenEdit,
    handleCloseEdit,
    handleCloseEditOutput,
    handleOpenFilter,
    handleCloseFilter,
    handleSaveEdit,
    handleSaveEditOutput,
    handleRemoveChart,
  } = useChartActions({
    readOnly,
    disabled,
    availableFields,
    listAllowedFields,
    selectedChartType,
    selectedOutputType,
    selectedOutputValueType,
    selectedOutputField,
    selectedOutputCase,
    selectedField,
    selectedLineFields,
    selectedLineFieldType,
    selectedLineListMode,
    selectedBarOrientation,
    selectedBarRaceMode,
    selectedPieShowLabels,
    selectedMin,
    selectedMax,
    selectedLineMin,
    selectedLineMax,
    selectedLineTicks,
    selectedLineDecimals,
    selectedStatFontSize,
    selectedLineSmooth,
    editingChartId,
    editingChartType,
    editingOutputId,
    editingOutputType,
    editName,
    editOutputName,
    editOutputField,
    editOutputCase,
    editField,
    editMin,
    editMax,
    editLineTicks,
    editLineDecimals,
    editStatFontSize,
    editLineListMode,
    editLineSmooth,
    editBarOrientation,
    editBarRaceMode,
    editPieShowLabels,
    editOutputValueType,
    getChartType,
    dispatchChartForm,
    setDraftCharts,
    setDraftLayout,
    setActiveMenuId,
  });
  const {
    openAddSection,
    openRenameSection,
    handleSaveSection,
    handleToggleSection,
    handleDeleteSection,
  } = useSectionActions({
    isEditing,
    readOnly,
    disabled,
    sectionModalState,
    setSectionModalError,
    openSectionModalAdd,
    openSectionModalRename,
    closeSectionModal,
    draftCharts,
    draftAssignments,
    setDraftSections,
    setDraftCharts,
    setDraftLayout,
    setViewSections,
  });
  const { handleEnterEdit, handleExitEdit, handleSaveChanges } = useChartSave({
    readOnly,
    disabled,
    onSave,
    normalizedSavedCharts,
    normalizedSavedLayout: normalizedSavedLayout as Layout,
    savedSections,
    savedAssignments,
    draftCharts,
    draftLayout,
    draftSections,
    draftAssignments,
    setDraftCharts,
    setDraftLayout,
    setDraftSections,
    setViewSections,
    setDraftAssignments,
    setIsEditing,
    setActiveMenuId,
    setActiveSectionMenu,
    resetSectionModal,
    dispatchChartForm,
  });

  const zoomResetKey = `${displayMode}:${filterMode}:${rangePreset}:${timeStart}:${timeEnd}:${timeGranularity}:${chartViewToken}`;

  useEffect(() => {
    if (readOnly && isEditing) {
      setIsEditing(false);
    }
  }, [readOnly, isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    clearBrowserSelection();
  }, [isEditing]);

  useEffect(() => {
    if (isEditing && !wasEditingRef.current) {
      if (!getChartValue || !availableFields.length) {
        setFrozenValues({});
      } else {
        const snapshot: Record<string, unknown> = {};
        availableFields.forEach((field) => {
          const value = getChartValue(field);
          if (value !== undefined) snapshot[field] = value;
        });
        setFrozenValues(snapshot);
      }
    } else if (!isEditing && wasEditingRef.current) {
      setFrozenValues(null);
    }
    wasEditingRef.current = isEditing;
  }, [isEditing, availableFields, getChartValue]);

  useEffect(() => {
    if (filterMode !== "range") return;
    setRangeRefreshMs((prev) => {
      if (!Number.isFinite(prev)) return rangeRefreshMinMs;
      if (prev < rangeRefreshMinMs) return rangeRefreshMinMs;
      if (prev > rangeRefreshMaxMs) return rangeRefreshMaxMs;
      return prev;
    });
  }, [filterMode, rangeRefreshMinMs, rangeRefreshMaxMs]);

  useEffect(() => {
    if (!isEditing) {
      setActiveMenuId(null);
      setActiveSectionMenu(null);
      dispatchChartForm({ type: "reset-editing-ui" });
      resetSectionModal();
    }
  }, [isEditing, dispatchChartForm, resetSectionModal]);

  useEffect(() => {
    if (isEditing) return;
    setDraftCharts(normalizedSavedCharts);
    setDraftLayout(normalizedSavedLayout as Layout);
    setDraftSections(savedSections);
  }, [normalizedSavedCharts, normalizedSavedLayout, savedSections, isEditing]);

  useEffect(() => {
    if (isEditing) return;
    setViewSections(savedSections);
  }, [savedSections, isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    setDraftLayout((prev) =>
      ensureChartLayout(draftCharts, draftSections, prev as ChartLayoutItem[]) as Layout
    );
  }, [draftCharts, draftSections, isEditing]);

  useEffect(() => {
    measureWidth();
  }, [
    draftCharts.length,
    normalizedSavedCharts.length,
    draftSections.length,
    savedSections.length,
    isEditing,
    isAddOpen,
    measureWidth,
  ]);
  useEffect(() => {
    if (displayMode !== "data_chart") return;
    setChartViewToken((prev) => prev + 1);
    measureWidth();
    let rafId = 0;
    let rafId2 = 0;
    const timeoutId = window.setTimeout(() => {
      measureWidth();
      window.dispatchEvent(new Event("resize"));
    }, 120);
    rafId = requestAnimationFrame(() => {
      measureWidth();
      window.dispatchEvent(new Event("resize"));
      rafId2 = requestAnimationFrame(() => {
        measureWidth();
        window.dispatchEvent(new Event("resize"));
      });
    });
    return () => {
      window.clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
      if (rafId2) cancelAnimationFrame(rafId2);
    };
  }, [displayMode, measureWidth]);
  useEffect(() => {
    if (displayMode !== "data_chart") return;
    const container = containerRef.current;
    if (!container) return;
    let frameId = 0;
    const update = () => {
      const next = Math.max(container.getBoundingClientRect().width, 1);
      setObservedWidth((prev) => (prev === null || Math.abs(prev - next) > 1 ? next : prev));
    };
    update();
    const observer = new ResizeObserver(() => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(update);
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [displayMode, containerRef]);

  useOutsideMenuClose(activeMenuId, "data-chart-menu", setActiveMenuId);
  useOutsideMenuClose(activeSectionMenu, "data-section-menu", setActiveSectionMenu);

  useEffect(() => {
    if (
      activeSectionMenu &&
      !sectionsForRender.some((section) => section.id === activeSectionMenu)
    ) {
      setActiveSectionMenu(null);
    }
  }, [activeSectionMenu, sectionsForRender]);

  const emptyMessage = "No charts configured yet.";
  const showSectionsLayout =
    chartsForRender.length > 0 || sectionsForRender.length > 0 || isEditing;

  const renderChartCard = (chart: ChartItem) => (
    <div
      key={chart.id}
      className={activeMenuId === chart.id ? styles["device-chart-item-active"] : undefined}
    >
      <DeviceChartCard
        chart={chart}
        isEditing={isEditing}
        activeMenuId={activeMenuId}
        setActiveMenuId={setActiveMenuId}
        onEdit={handleOpenEdit}
        onRemove={handleRemoveChart}
        filterMode={filterMode}
        rangePreset={rangePreset}
        timeGranularity={timeGranularity}
        rawSeries={rawSeries}
        filteredRawData={filteredRawData}
        filteredLatestValues={filteredLatestValues}
        frozenValues={frozenValues}
        zoomResetKey={zoomResetKey}
        getChartValue={getChartValue}
        getChartUnit={getChartUnit}
        getChartLabel={getChartLabel}
        getChartType={getChartType}
        getChartColor={getChartColor}
        getChartCases={getChartCases}
        getChartCaseColors={getChartCaseColors}
        getChartBooleanColors={getChartBooleanColors}
        getChartBooleanLabels={getChartBooleanLabels}
        onOutputSend={onOutputSend}
        disabled={disabled}
        readOnly={readOnly}
      />
    </div>
  );

  const renderSectionRow = (sectionId: string) => {
    const section = sectionsForRender.find((item) => item.id === sectionId);
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
    const chartCount = chartsBySection[section.id]?.length ?? 0;
    return (
      <div
        key={getSectionKey(section.id)}
        className={`${styles["device-section-row"]} ${
          isEditing ? styles["device-section-row-editing"] : ""
        } ${activeSectionMenu === section.id ? styles["device-section-row-active"] : ""}`}
        data-section-menu={section.id}
      >
        <div className={styles["device-section-row-left"]}>
          <button
            type="button"
            className={styles["device-section-toggle"]}
            onClick={() => {
              if (disabled) return;
              handleToggleSection(section.id);
            }}
            disabled={disabled}
            aria-label={isCollapsed ? "Expand section" : "Collapse section"}
          >
            {isCollapsed ? <FaChevronRight /> : <FaChevronDown />}
          </button>
          <span className={styles["device-section-title"]}>{section.name}</span>
          {isEditing && !readOnly && (
            <span className={styles["device-section-count"]}>{chartCount} items</span>
          )}
        </div>
        <div className={styles["device-section-row-actions"]}>
          {isEditing && !readOnly && (
            <div className={styles["device-section-actions"]}>
              <button
                type="button"
                className={`${styles["device-section-menu-button"]} ${
                  activeSectionMenu === section.id
                    ? styles["device-section-menu-button-active"]
                    : ""
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
                      handleDeleteSection(section.id);
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

  const modalOptions = {
    data: dataOptions,
    meter: meterDataOptions,
    list: listDataOptions,
  };
  const sectionModalProps = {
    state: sectionModalState,
    onNameChange: setSectionModalName,
    onClose: closeSectionModal,
    onSave: handleSaveSection,
  };
  const addModalProps = {
    isOpen: isAddOpen,
    selectedChartType,
    selectedField,
    selectedMin,
    selectedMax,
    selectedLineFields,
    selectedLineMin,
    selectedLineMax,
    selectedLineTicks,
    selectedLineDecimals,
    selectedStatFontSize,
    selectedLineListMode,
    selectedLineSmooth,
    selectedBarOrientation,
    selectedBarRaceMode,
    selectedPieShowLabels,
    hideLineNumericInputs: hideLineNumericInputsInAdd,
    showLineListMode: isSelectedLineList,
    canAddChart,
    onSelectedChartTypeChange: setSelectedChartType,
    onSelectedFieldChange: setSelectedField,
    onSelectedMinChange: setSelectedMin,
    onSelectedMaxChange: setSelectedMax,
    onSelectedLineMinChange: setSelectedLineMin,
    onSelectedLineMaxChange: setSelectedLineMax,
    onSelectedLineTicksChange: setSelectedLineTicks,
    onSelectedLineDecimalsChange: setSelectedLineDecimals,
    onSelectedStatFontSizeChange: setSelectedStatFontSize,
    onSelectedLineListModeChange: setSelectedLineListMode,
    onSelectedLineSmoothChange: setSelectedLineSmooth,
    onSelectedBarOrientationChange: setSelectedBarOrientation,
    onSelectedBarRaceModeChange: setSelectedBarRaceMode,
    onSelectedPieShowLabelsChange: setSelectedPieShowLabels,
    onSelectLineField: handleSelectLineField,
    onClose: handleCloseAdd,
    onAdd: handleAddChart,
  };
  const outputModalProps = {
    isOpen: isAddOutputOpen,
    selectedOutputType,
    selectedOutputValueType,
    selectedOutputField,
    selectedOutputFieldType,
    selectedOutputCase,
    outputCaseOptions: selectedOutputCaseOptions,
    canAddOutput,
    onSelectedOutputTypeChange: setSelectedOutputType,
    onSelectedOutputValueTypeChange: setSelectedOutputValueType,
    onSelectedOutputFieldChange: setSelectedOutputField,
    onSelectedOutputCaseChange: setSelectedOutputCase,
    onClose: handleCloseAddOutput,
    onAdd: handleAddOutput,
  };
  const editOutputModalProps = {
    isOpen: isEditOutputOpen,
    editOutputName,
    editOutputValueType,
    editOutputField,
    editOutputFieldType,
    editOutputCase,
    editOutputCaseOptions,
    editingOutputType,
    canSaveOutput,
    onEditOutputNameChange: setEditOutputName,
    onEditOutputValueTypeChange: setEditOutputValueType,
    onEditOutputFieldChange: setEditOutputField,
    onEditOutputCaseChange: setEditOutputCase,
    onClose: handleCloseEditOutput,
    onSave: handleSaveEditOutput,
  };
  const editModalProps = {
    isOpen: isEditOpen,
    editName,
    editField,
    editMin,
    editMax,
    editLineTicks,
    editLineDecimals,
    editStatFontSize,
    editLineListMode,
    editLineSmooth,
    editBarOrientation,
    editBarRaceMode,
    editPieShowLabels,
    hideLineNumericInputs: hideLineNumericInputsInEdit,
    showLineListMode: isEditLineList,
    editingChartType,
    onEditNameChange: setEditName,
    onEditFieldChange: setEditField,
    onEditMinChange: setEditMin,
    onEditMaxChange: setEditMax,
    onEditLineTicksChange: setEditLineTicks,
    onEditLineDecimalsChange: setEditLineDecimals,
    onEditStatFontSizeChange: setEditStatFontSize,
    onEditLineListModeChange: setEditLineListMode,
    onEditLineSmoothChange: setEditLineSmooth,
    onEditBarOrientationChange: setEditBarOrientation,
    onEditBarRaceModeChange: setEditBarRaceMode,
    onEditPieShowLabelsChange: setEditPieShowLabels,
    onClose: handleCloseEdit,
    onSave: handleSaveEdit,
  };
  const filterModalProps = {
    isOpen: isFilterOpen,
    filterMode,
    rangePreset,
    rangeRefreshValue,
    rangeRefreshOptions,
    timeGranularity,
    timeStart,
    timeEnd,
    timeDateInputType,
    timeDateStep,
    timeDateLabel,
    onFilterModeChange: setFilterMode,
    onRangePresetChange: setRangePreset,
    onRangeRefreshChange: (value: string) => {
      if (value.trim() === "") return;
      const next = Number(value);
      if (!Number.isFinite(next)) return;
      const clamped = Math.min(rangeRefreshSpec.max, Math.max(rangeRefreshSpec.min, next));
      setRangeRefreshMs(clamped * rangeRefreshUnitMs);
    },
    onTimeGranularityChange: setTimeGranularity,
    onTimeStartChange: setTimeStart,
    onTimeEndChange: setTimeEnd,
    onClose: handleCloseFilter,
  };

  return (
    <div className={styles["device-data-panel"]}>
      <DeviceDataChartHeader
        isEditing={isEditing}
        disabled={disabled}
        readOnly={readOnly}
        saving={saving}
        displayMode={displayMode}
        options={options}
        onDisplayChange={onDisplayChange}
        onOpenFilter={handleOpenFilter}
        onOpenAdd={handleOpenAdd}
        onOpenOutput={handleOpenAddOutput}
        onOpenSection={openAddSection}
        onEnterEdit={handleEnterEdit}
        onExitEdit={handleExitEdit}
        onSave={handleSaveChanges}
        hasDataOptions={dataOptions.length > 0}
      />
      {isEditing && saveError && <p className={formStyles["dashboard-modal-error"]}>{saveError}</p>}

      {!showSectionsLayout ? (
        <div className={styles["device-data-empty"]}>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className={`${styles["device-chart-grid"]} ${
            isEditing ? styles["device-chart-grid-editing"] : ""
          }`}
          onDragStartCapture={handlePreventNativeDrag}
        >
          {mounted && (
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
                enabled: isEditing && !disabled,
                cancel: dragCancelSelector,
                bounded: dragBounded,
              }}
              resizeConfig={{
                enabled: isEditing && !disabled,
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
                  : chartMap.has(item.i)
                    ? renderChartCard(chartMap.get(item.i)!)
                    : null
              )}
            </GridLayout>
          )}
        </div>
      )}

      <DeviceDataChartModals
        disabled={disabled}
        options={modalOptions}
        sectionModal={sectionModalProps}
        addModal={addModalProps}
        outputModal={outputModalProps}
        editOutputModal={editOutputModalProps}
        editModal={editModalProps}
        filterModal={filterModalProps}
      />
    </div>
  );
}
