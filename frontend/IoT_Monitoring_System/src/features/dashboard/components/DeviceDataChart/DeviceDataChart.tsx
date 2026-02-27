import { type Ref, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { FaChevronDown, FaChevronRight, FaEllipsisV } from "react-icons/fa";
import {
  GridLayout,
  type Layout,
  type LayoutItem,
  type ResizeHandleAxis,
  useContainerWidth,
} from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { MeterChart } from "../charts/Meter/MeterChart";
import styles from "./DeviceDataChart.module.css";
import formStyles from "../DashboardForm/DashboardForm.module.css";
import { DeviceDataChartHeader } from "./DeviceDataChartHeader";
import { DeviceDataChartModals } from "./DeviceDataChartModals";
import {
  DEFAULT_PANEL_SIZE,
  GRID_COLS,
  GRID_COMPACTOR,
  GRID_MARGIN,
  GRID_PADDING,
  GRID_ROW_HEIGHT,
  RESIZE_HANDLE_INSET,
  RESIZE_HANDLES,
  SECTION_ROW_HEIGHT,
} from "./deviceDataChartConstants";
import { chartFormReducer, INITIAL_CHART_FORM_STATE, useSectionModalState } from "./deviceDataChartState";
import type {
  ChartItem,
  ChartLayoutItem,
  ChartSection,
  ChartType,
  DeviceDataChartProps,
  LineGranularity,
} from "./deviceDataChartTypes";
import {
  buildSectionAssignments,
  ensureChartLayout,
  getLayoutMaxY,
  getNextPosition,
  getSectionIdFromKey,
  getSectionKey,
  isSectionKey,
  mergeLayout,
  normalizeChart,
  normalizeLayoutItem,
  orderSectionsByLayout,
  parseNumericValue,
  parseOptionalNumber,
} from "./deviceDataChartUtils";

export function DeviceDataChart<T extends string>({
  displayMode,
  options,
  onDisplayChange,
  disabled,
  readOnly = false,
  availableFields,
  getChartValue,
  getChartUnit,
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
  const isUserInteraction = useRef(false);
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
  const {
    isAddOpen,
    isEditOpen,
    isFilterOpen,
    selectedChartType,
    selectedField,
    selectedMin,
    selectedMax,
    selectedLineFields,
    selectedLineMin,
    selectedLineMax,
    timeGranularity,
    timeStart,
    timeEnd,
    editingChartId,
    editingChartType,
    editName,
    editField,
    editMin,
    editMax,
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
  const setSelectedChartType = (value: ChartType) =>
    dispatchChartForm({ type: "set-selected-chart-type", value });
  const setSelectedField = (value: string) =>
    dispatchChartForm({ type: "set-selected-field", value });
  const setSelectedMin = (value: string) =>
    dispatchChartForm({ type: "set-selected-min", value });
  const setSelectedMax = (value: string) =>
    dispatchChartForm({ type: "set-selected-max", value });
  const setSelectedLineMin = (value: string) =>
    dispatchChartForm({ type: "set-selected-line-min", value });
  const setSelectedLineMax = (value: string) =>
    dispatchChartForm({ type: "set-selected-line-max", value });
  const setEditName = (value: string) => dispatchChartForm({ type: "set-edit-name", value });
  const setEditField = (value: string) => dispatchChartForm({ type: "set-edit-field", value });
  const setEditMin = (value: string) => dispatchChartForm({ type: "set-edit-min", value });
  const setEditMax = (value: string) => dispatchChartForm({ type: "set-edit-max", value });
  const setTimeGranularity = (value: LineGranularity) =>
    dispatchChartForm({ type: "set-time-granularity", value });
  const setTimeStart = (value: string) => dispatchChartForm({ type: "set-time-start", value });
  const setTimeEnd = (value: string) => dispatchChartForm({ type: "set-time-end", value });
  const dragCancelSelector = `.${styles["device-chart-menu-button"]}, .${styles["device-chart-menu"]}, .${styles["device-section-menu-button"]}, .${styles["device-section-menu"]}, .${styles["device-section-toggle"]}, .${styles["device-chart-resize-handle"]}, .react-resizable-handle`;
  const { width, containerRef, measureWidth } = useContainerWidth({
    initialWidth: 1200,
    measureBeforeMount: false,
  });
  const gridWidth = Math.max(width, 1);
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

  const sectionsForRender = isEditing ? draftSections : viewSections;
  const dragBounded = !(isEditing && sectionsForRender.length > 0);
  const chartsForRender = isEditing ? draftCharts : normalizedSavedCharts;
  const savedAssignments = useMemo(() => {
    const map: Record<string, string | null> = {};
    chartsForRender.forEach((chart) => {
      map[chart.id] = chart.section_id ?? null;
    });
    return map;
  }, [chartsForRender]);
  const chartMap = useMemo(() => {
    const map = new Map<string, ChartItem>();
    chartsForRender.forEach((chart) => {
      map.set(chart.id, chart);
    });
    return map;
  }, [chartsForRender]);

  const timeDateInputType =
    timeGranularity === "sec" || timeGranularity === "minute" ? "datetime-local" : "date";
  const timeDateStep =
    timeDateInputType === "datetime-local" ? (timeGranularity === "sec" ? 60 : 3600) : undefined;
  const timeDateLabel = timeDateInputType === "datetime-local" ? "date/time" : "date";

  const canAddChart = useMemo(() => {
    if (disabled || readOnly) return false;
    if (selectedChartType === "line") {
      return selectedLineFields.length > 0;
    }
    return Boolean(selectedField);
  }, [disabled, readOnly, selectedChartType, selectedLineFields.length, selectedField]);

  useEffect(() => {
    if (readOnly && isEditing) {
      setIsEditing(false);
    }
  }, [readOnly, isEditing]);

  useEffect(() => {
    if (!availableFields.length) {
      if (selectedField) {
        dispatchChartForm({ type: "set-selected-field", value: "" });
      }
      return;
    }
    if (!availableFields.includes(selectedField)) {
      dispatchChartForm({ type: "set-selected-field", value: availableFields[0] });
    }
  }, [availableFields, selectedField, dispatchChartForm]);

  useEffect(() => {
    if (!availableFields.length) {
      if (selectedLineFields.length) {
        dispatchChartForm({ type: "set-selected-line-fields", value: [] });
      }
      return;
    }
    const nextFields = selectedLineFields.filter((field) => availableFields.includes(field));
    if (nextFields.length !== selectedLineFields.length) {
      dispatchChartForm({ type: "set-selected-line-fields", value: nextFields });
    }
  }, [availableFields, selectedLineFields, dispatchChartForm]);

  useEffect(() => {
    if (selectedChartType !== "line") return;
    if (!availableFields.length) return;
    if (!selectedLineFields.length) {
      dispatchChartForm({
        type: "set-selected-line-fields",
        value: [availableFields[0]],
      });
    }
  }, [availableFields, selectedChartType, selectedLineFields.length, dispatchChartForm]);

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
    if (!isEditOpen) return;
    if (!availableFields.length) return;
    if (!availableFields.includes(editField)) {
      dispatchChartForm({ type: "set-edit-field", value: availableFields[0] });
    }
  }, [availableFields, editField, isEditOpen, dispatchChartForm]);

  useEffect(() => {
    if (!activeMenuId) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest(`[data-chart-menu="${activeMenuId}"]`)) return;
      setActiveMenuId(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [activeMenuId]);

  useEffect(() => {
    if (!activeSectionMenu) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest(`[data-section-menu="${activeSectionMenu}"]`)) return;
      setActiveSectionMenu(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [activeSectionMenu]);

  useEffect(() => {
    if (
      activeSectionMenu &&
      !sectionsForRender.some((section) => section.id === activeSectionMenu)
    ) {
      setActiveSectionMenu(null);
    }
  }, [activeSectionMenu, sectionsForRender]);

  const handleEnterEdit = () => {
    if (readOnly || disabled) return;
    setDraftCharts(normalizedSavedCharts);
    setDraftLayout(normalizedSavedLayout as Layout);
    setDraftSections(savedSections);
    setDraftAssignments(
      buildSectionAssignments(normalizedSavedLayout as ChartLayoutItem[], savedSections, savedAssignments)
    );
    setActiveSectionMenu(null);
    setIsEditing(true);
  };

  const handleExitEdit = () => {
    setIsEditing(false);
    setActiveMenuId(null);
    setActiveSectionMenu(null);
    dispatchChartForm({ type: "reset-editing-ui" });
    setDraftCharts(normalizedSavedCharts);
    setDraftLayout(normalizedSavedLayout as Layout);
    setDraftSections(savedSections);
    setViewSections(savedSections);
    setDraftAssignments({});
    resetSectionModal();
  };

  const handleSaveChanges = async () => {
    if (!onSave) {
      setIsEditing(false);
      setActiveMenuId(null);
      return;
    }
    const sanitizedLayout = (draftLayout as ChartLayoutItem[]).map((item) =>
      normalizeLayoutItem(item)
    );
    const nextSections = draftSections.filter((section) => Boolean(section?.id));
    const orderedSections = orderSectionsByLayout(nextSections, sanitizedLayout);
    const assignments = draftAssignments;
    const nextCharts = draftCharts.map((chart) => ({
      ...chart,
      name: chart.name.trim() || "New panel",
      section_id: assignments[chart.id] ?? null,
    }));
    try {
      await onSave(nextCharts, sanitizedLayout, orderedSections);
      setIsEditing(false);
      setActiveMenuId(null);
      setActiveSectionMenu(null);
    } catch {
      // keep edit mode active when saving fails
    }
  };

  const handleOpenAdd = () => {
    if (readOnly || disabled) return;
    dispatchChartForm({
      type: "open-add",
      payload: {
        defaultField: selectedField || availableFields[0] || "",
        defaultLineFields: availableFields.length ? [availableFields[0]] : [],
      },
    });
  };

  const handleCloseAdd = () => {
    dispatchChartForm({ type: "close-add" });
  };

  const openAddSection = () => {
    if (!isEditing || readOnly || disabled) return;
    openSectionModalAdd();
  };

  const openRenameSection = (section: ChartSection) => {
    if (!isEditing || readOnly || disabled) return;
    openSectionModalRename(section);
  };

  const handleSaveSection = () => {
    const trimmed = sectionModalState.name.trim();
    if (!trimmed) {
      setSectionModalError("Section name is required.");
      return;
    }
    if (sectionModalState.editingId) {
      setDraftSections((prev) =>
        prev.map((section) =>
          section.id === sectionModalState.editingId ? { ...section, name: trimmed } : section
        )
      );
    } else {
      const id = `section-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setDraftSections((prev) => [...prev, { id, name: trimmed, collapsed: false }]);
      setDraftLayout((prev) => {
        const nextY = getLayoutMaxY(prev as ChartLayoutItem[]);
        return [
          ...prev,
          {
            i: getSectionKey(id),
            x: 0,
            y: nextY,
            w: GRID_COLS,
            h: SECTION_ROW_HEIGHT,
            minW: GRID_COLS,
            maxW: GRID_COLS,
            minH: SECTION_ROW_HEIGHT,
            isResizable: false,
            isDraggable: false,
          },
        ];
      });
    }
    closeSectionModal();
  };

  const handleToggleSection = (sectionId: string) => {
    const toggle = (sections: ChartSection[]) =>
      sections.map((section) =>
        section.id === sectionId ? { ...section, collapsed: !section.collapsed } : section
      );
    if (isEditing) {
      setDraftSections((prev) => toggle(prev));
      return;
    }
    setViewSections((prev) => toggle(prev));
  };

  const handleDeleteSection = (sectionId: string) => {
    if (!isEditing || readOnly) return;
    const chartIdsToRemove = draftCharts
      .filter((chart) => draftAssignments[chart.id] === sectionId)
      .map((chart) => chart.id);
    setDraftSections((prev) => prev.filter((section) => section.id !== sectionId));
    setDraftCharts((prev) => prev.filter((chart) => !chartIdsToRemove.includes(chart.id)));
    setDraftLayout((prev) =>
      prev.filter(
        (item) => item.i !== getSectionKey(sectionId) && !chartIdsToRemove.includes(item.i)
      )
    );
  };

  const handleToggleLineField = (field: string) => {
    const nextFields = selectedLineFields.includes(field)
      ? selectedLineFields.filter((item) => item !== field)
      : [...selectedLineFields, field];
    dispatchChartForm({ type: "set-selected-line-fields", value: nextFields });
  };

  const handleAddChart = () => {
    const isLineChart = selectedChartType === "line";
    const selectedLinePrimary = selectedLineFields[0] ?? "";
    const fieldValue = isLineChart ? selectedLinePrimary : selectedField;
    if (!fieldValue) return;
    if (isLineChart && selectedLineFields.length === 0) return;
    const id = `chart-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const nextLayout: LayoutItem = {
      i: id,
      x: 0,
      y: 0,
      w: DEFAULT_PANEL_SIZE.w,
      h: DEFAULT_PANEL_SIZE.h,
    };
    const meterMin = selectedChartType === "meter" ? parseOptionalNumber(selectedMin) : undefined;
    const meterMax = selectedChartType === "meter" ? parseOptionalNumber(selectedMax) : undefined;
    const lineMin = selectedChartType === "line" ? parseOptionalNumber(selectedLineMin) : undefined;
    const lineMax = selectedChartType === "line" ? parseOptionalNumber(selectedLineMax) : undefined;
    setDraftCharts((prev) => [
      ...prev,
      {
        id,
        type: selectedChartType,
        field: fieldValue,
        name: "New panel",
        ...(selectedChartType === "meter" ? { min: meterMin, max: meterMax } : {}),
        ...(selectedChartType === "line"
          ? {
              min: lineMin,
              max: lineMax,
              fields: selectedLineFields,
            }
          : {}),
      },
    ]);
    setDraftLayout((prev) => {
      const sectionHeaders = prev
        .filter((item) => isSectionKey(item.i))
        .sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
      if (sectionHeaders.length) {
        const insertY = sectionHeaders[0].y;
        const shifted = prev.map((item) =>
          item.y >= insertY ? { ...item, y: item.y + DEFAULT_PANEL_SIZE.h } : item
        );
        return [
          ...shifted,
          {
            ...nextLayout,
            y: insertY,
          },
        ];
      }
      const nextPosition = getNextPosition(prev);
      return [
        ...prev,
        {
          ...nextLayout,
          x: nextPosition.x,
          y: nextPosition.y,
        },
      ];
    });
    dispatchChartForm({ type: "close-add" });
  };

  const handleOpenEdit = (chart: ChartItem) => {
    if (readOnly || disabled) return;
    dispatchChartForm({ type: "open-edit", payload: { chart } });
    setActiveMenuId(null);
  };

  const handleCloseEdit = () => {
    dispatchChartForm({ type: "close-edit" });
  };

  const handleOpenFilter = () => {
    dispatchChartForm({ type: "open-filter" });
  };

  const handleCloseFilter = () => {
    dispatchChartForm({ type: "close-filter" });
  };

  const handleSaveEdit = () => {
    if (!editingChartId) return;
    const name = editName.trim() || "New panel";
    const field = editField || "";
    const min =
      editingChartType === "meter" || editingChartType === "line"
        ? parseOptionalNumber(editMin)
        : undefined;
    const max =
      editingChartType === "meter" || editingChartType === "line"
        ? parseOptionalNumber(editMax)
        : undefined;
    setDraftCharts((prev) =>
      prev.map((chart) =>
        chart.id === editingChartId
          ? {
              ...chart,
              name,
              field: field || chart.field,
              ...(chart.type === "meter" || chart.type === "line" ? { min, max } : {}),
            }
          : chart
      )
    );
    dispatchChartForm({ type: "close-edit" });
  };

  const handleRemoveChart = (chartId: string) => {
    if (readOnly || disabled) return;
    setDraftCharts((prev) => prev.filter((chart) => chart.id !== chartId));
    setDraftLayout((prev) => prev.filter((item) => item.i !== chartId));
    setActiveMenuId(null);
  };

  const handleLayoutChange = (nextLayout: Layout) => {
    if (!isEditing || readOnly || disabled) return;
    if (!isUserInteraction.current) return;
    setDraftLayout((prev) => mergeLayout(prev, nextLayout));
  };

  const handleDragStart = () => {
    if (!isEditing || readOnly || disabled) return;
    isUserInteraction.current = true;
  };

  const handleDragStop = (
    nextLayout: Layout,
    _oldItem: LayoutItem | null,
    newItem: LayoutItem | null
  ) => {
    if (!isEditing || readOnly || disabled) return;
    isUserInteraction.current = false;
    const normalized = (nextLayout as ChartLayoutItem[]).map((item) => normalizeLayoutItem(item));
    setDraftLayout((prev) => mergeLayout(prev, normalized));
    if (!newItem) return;
    if (isSectionKey(newItem.i)) {
      return;
    }
    const nextAssignments = buildSectionAssignments(
      normalized,
      draftSections,
      draftAssignments,
      new Set([newItem.i])
    );
    setDraftAssignments((prev) => ({
      ...prev,
      [newItem.i]: nextAssignments[newItem.i] ?? null,
    }));
  };

  const handleResizeStart = () => {
    if (!isEditing || readOnly || disabled) return;
    isUserInteraction.current = true;
  };

  const handleResizeStop = (nextLayout: Layout) => {
    if (!isEditing || readOnly || disabled) return;
    isUserInteraction.current = false;
    setDraftLayout((prev) => mergeLayout(prev, nextLayout));
  };

  const displayLayout = useMemo(
    () => (isEditing ? (draftLayout as ChartLayoutItem[]) : normalizedSavedLayout),
    [draftLayout, isEditing, normalizedSavedLayout]
  );
  const sectionAssignments = useMemo(
    () =>
      buildSectionAssignments(
        displayLayout,
        sectionsForRender,
        isEditing ? draftAssignments : savedAssignments
      ),
    [displayLayout, sectionsForRender, savedAssignments, draftAssignments, isEditing]
  );
  const collapsedSectionIds = useMemo(
    () => new Set(sectionsForRender.filter((section) => section.collapsed).map((section) => section.id)),
    [sectionsForRender]
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
  const chartsBySection = useMemo(() => {
    const map: Record<string, ChartItem[]> = {};
    sectionsForRender.forEach((section) => {
      map[section.id] = [];
    });
    chartsForRender.forEach((chart) => {
      const sectionId = sectionAssignments[chart.id];
      if (!sectionId) return;
      if (!map[sectionId]) {
        map[sectionId] = [];
      }
      map[sectionId].push(chart);
    });
    return map;
  }, [chartsForRender, sectionAssignments, sectionsForRender]);

  const emptyMessage = "No charts configured yet.";
  const showSectionsLayout =
    chartsForRender.length > 0 || sectionsForRender.length > 0 || isEditing;

  const renderChartCard = (chart: ChartItem) => {
    const rawValue = getChartValue ? getChartValue(chart.field) : null;
    const numericValue = parseNumericValue(rawValue);
    const unit = getChartUnit ? getChartUnit(chart.field) : "";
    const meterMin = typeof chart.min === "number" ? chart.min : undefined;
    const meterMax = typeof chart.max === "number" ? chart.max : undefined;
    const placeholder =
      chart.type === "line" ? "Line chart coming soon." : "Bar chart coming soon.";
    const chartContent =
      chart.type === "meter" ? (
        <MeterChart value={numericValue} unit={unit} min={meterMin} max={meterMax} />
      ) : (
        <div className={styles["device-chart-placeholder"]}>{placeholder}</div>
      );

    return (
      <div
        key={chart.id}
        className={`${styles["device-chart-card"]} ${
          isEditing ? styles["device-chart-card-editing"] : ""
        }`}
      >
        <div className={styles["device-chart-card-header"]}>
          <span className={styles["device-chart-card-title"]}>{chart.name || "New panel"}</span>
          <div className={styles["device-chart-card-actions"]} data-chart-menu={chart.id}>
            {isEditing && (
              <>
                <button
                  type="button"
                  className={`${styles["device-chart-menu-button"]} ${
                    activeMenuId === chart.id ? styles["device-chart-menu-button-active"] : ""
                  }`}
                  aria-label="Chart options"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveMenuId((prev) => (prev === chart.id ? null : chart.id));
                  }}
                >
                  <FaEllipsisV />
                </button>
                {activeMenuId === chart.id && (
                  <div
                    className={styles["device-chart-menu"]}
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    <button type="button" onClick={() => handleOpenEdit(chart)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className={styles["device-chart-menu-remove"]}
                      onClick={() => handleRemoveChart(chart.id)}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className={styles["device-chart-card-body"]}>{chartContent}</div>
      </div>
    );
  };

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
        }`}
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
        </div>
      )}

      <DeviceDataChartModals
        disabled={disabled}
        dataOptions={dataOptions}
        canAddChart={canAddChart}
        sectionModalState={sectionModalState}
        onSectionNameChange={setSectionModalName}
        onSectionClose={closeSectionModal}
        onSectionSave={handleSaveSection}
        isAddOpen={isAddOpen}
        selectedChartType={selectedChartType}
        selectedField={selectedField}
        selectedMin={selectedMin}
        selectedMax={selectedMax}
        selectedLineFields={selectedLineFields}
        selectedLineMin={selectedLineMin}
        selectedLineMax={selectedLineMax}
        onSelectedChartTypeChange={setSelectedChartType}
        onSelectedFieldChange={setSelectedField}
        onSelectedMinChange={setSelectedMin}
        onSelectedMaxChange={setSelectedMax}
        onSelectedLineMinChange={setSelectedLineMin}
        onSelectedLineMaxChange={setSelectedLineMax}
        onToggleLineField={handleToggleLineField}
        onCloseAdd={handleCloseAdd}
        onAddChart={handleAddChart}
        isEditOpen={isEditOpen}
        editName={editName}
        editField={editField}
        editMin={editMin}
        editMax={editMax}
        editingChartType={editingChartType}
        onEditNameChange={setEditName}
        onEditFieldChange={setEditField}
        onEditMinChange={setEditMin}
        onEditMaxChange={setEditMax}
        onCloseEdit={handleCloseEdit}
        onSaveEdit={handleSaveEdit}
        isFilterOpen={isFilterOpen}
        timeGranularity={timeGranularity}
        timeStart={timeStart}
        timeEnd={timeEnd}
        timeDateInputType={timeDateInputType}
        timeDateStep={timeDateStep}
        timeDateLabel={timeDateLabel}
        onTimeGranularityChange={setTimeGranularity}
        onTimeStartChange={setTimeStart}
        onTimeEndChange={setTimeEnd}
        onCloseFilter={handleCloseFilter}
      />
    </div>
  );
}
