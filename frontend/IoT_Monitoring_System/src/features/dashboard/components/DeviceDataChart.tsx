import { type Ref, useEffect, useMemo, useState } from "react";
import { FaEllipsisV, FaFilter } from "react-icons/fa";
import {
  GridLayout,
  getCompactor,
  type Layout,
  type LayoutItem,
  type ResizeHandleAxis,
  useContainerWidth,
} from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { MeterChart } from "./charts/MeterChart";
import DropdownSelect from "./DropdownSelect";
import styles from "../styles/dashboard.module.css";

type DisplayOption<T extends string> = {
  value: T;
  label: string;
};

type ChartType = "meter" | "line" | "bar";

type LineGranularity = "sec" | "minute" | "hour" | "day" | "week" | "month" | "year";

type ChartItemConfig = {
  id: string;
  type: ChartType;
  field: string;
  name?: string | null;
  min?: number | null;
  max?: number | null;
  fields?: string[] | null;
};

type ChartLayoutItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

type ChartItem = {
  id: string;
  type: ChartType;
  field: string;
  name: string;
  min?: number;
  max?: number;
  fields?: string[];
};

const CHART_OPTIONS: Array<{ value: ChartType; label: string }> = [
  { value: "meter", label: "Meter" },
  { value: "line", label: "Line" },
  { value: "bar", label: "Bar" },
];

const LINE_GRANULARITY_OPTIONS: Array<{ value: LineGranularity; label: string }> = [
  { value: "sec", label: "Second" },
  { value: "minute", label: "Minute" },
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

const GRID_COLS = 12;
const GRID_ROW_HEIGHT = 80;
const DEFAULT_PANEL_SIZE = { w: 4, h: 3};
const GRID_MARGIN: [number, number] = [16, 16];
const GRID_PADDING: [number, number] = [0, 0];
const RESIZE_HANDLES: ResizeHandleAxis[] = ["se"];
const GRID_COMPACTOR = getCompactor("vertical", false, false);
const RESIZE_HANDLE_INSET = 10;

type DeviceDataChartProps<T extends string> = {
  displayMode: T;
  options: DisplayOption<T>[];
  onDisplayChange: (value: T) => void;
  disabled?: boolean;
  readOnly?: boolean;
  availableFields: string[];
  getChartValue?: (field: string) => unknown;
  getChartUnit?: (field: string) => string;
  savedCharts?: ChartItemConfig[];
  savedLayout?: ChartLayoutItem[];
  onSave?: (charts: ChartItemConfig[], layout: ChartLayoutItem[]) => Promise<void>;
  saving?: boolean;
  saveError?: string | null;
};

const getNextPosition = (layout: Layout) => {
  if (layout.length === 0) return { x: 0, y: 0 };
  const maxY = Math.max(...layout.map((item) => item.y + item.h));
  return { x: 0, y: maxY };
};

const normalizeChart = (chart: ChartItemConfig): ChartItem => {
  const normalizedFields =
    chart.type === "line"
      ? Array.isArray(chart.fields) && chart.fields.length
        ? chart.fields
        : chart.field
          ? [chart.field]
          : []
      : undefined;

  return {
    ...chart,
    name: chart.name?.trim() || "New panel",
    min: typeof chart.min === "number" ? chart.min : undefined,
    max: typeof chart.max === "number" ? chart.max : undefined,
    fields: normalizedFields,
  };
};

const sanitizeLayoutItem = (item: LayoutItem | ChartLayoutItem): ChartLayoutItem => ({
  i: item.i,
  x: item.x,
  y: item.y,
  w: item.w,
  h: item.h,
  minW: item.minW,
  minH: item.minH,
});

const ensureLayoutForCharts = (charts: ChartItem[], layout: ChartLayoutItem[]) => {
  const nextLayout = layout
    .filter((item) => charts.some((chart) => chart.id === item.i))
    .map((item) => sanitizeLayoutItem(item));
  const usedIds = new Set(nextLayout.map((item) => item.i));
  let nextY = nextLayout.reduce((max, item) => Math.max(max, item.y + item.h), 0);
  charts.forEach((chart) => {
    if (usedIds.has(chart.id)) return;
    nextLayout.push({
      i: chart.id,
      x: 0,
      y: nextY,
      w: DEFAULT_PANEL_SIZE.w,
      h: DEFAULT_PANEL_SIZE.h,
    });
    nextY += DEFAULT_PANEL_SIZE.h;
  });
  return nextLayout;
};

const parseNumericValue = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const parseOptionalNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

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
  onSave,
  saving = false,
  saveError = null,
}: DeviceDataChartProps<T>) {
  const [isEditing, setIsEditing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const normalizedSavedCharts = useMemo(
    () => savedCharts.map((chart) => normalizeChart(chart)),
    [savedCharts]
  );
  const normalizedSavedLayout = useMemo(
    () => ensureLayoutForCharts(normalizedSavedCharts, savedLayout),
    [normalizedSavedCharts, savedLayout]
  );
  const [draftCharts, setDraftCharts] = useState<ChartItem[]>(normalizedSavedCharts);
  const [draftLayout, setDraftLayout] = useState<Layout>(normalizedSavedLayout as Layout);
  const [selectedChartType, setSelectedChartType] = useState<ChartType>(CHART_OPTIONS[0].value);
  const [selectedField, setSelectedField] = useState("");
  const [selectedMin, setSelectedMin] = useState("");
  const [selectedMax, setSelectedMax] = useState("");
  const [selectedLineFields, setSelectedLineFields] = useState<string[]>([]);
  const [selectedLineMin, setSelectedLineMin] = useState("");
  const [selectedLineMax, setSelectedLineMax] = useState("");
  const [timeGranularity, setTimeGranularity] = useState<LineGranularity>("day");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingChartId, setEditingChartId] = useState<string | null>(null);
  const [editingChartType, setEditingChartType] = useState<ChartType | null>(null);
  const [editName, setEditName] = useState("");
  const [editField, setEditField] = useState("");
  const [editMin, setEditMin] = useState("");
  const [editMax, setEditMax] = useState("");
  const dragCancelSelector = `.${styles["device-chart-menu-button"]}, .${styles["device-chart-menu"]}, .${styles["device-chart-resize-handle"]}, .react-resizable-handle`;
  const { width, containerRef, mounted, measureWidth } = useContainerWidth({
    initialWidth: 0,
    measureBeforeMount: true,
  });
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
      setSelectedField("");
      return;
    }
    if (!availableFields.includes(selectedField)) {
      setSelectedField(availableFields[0]);
    }
  }, [availableFields, selectedField]);

  useEffect(() => {
    if (!availableFields.length) {
      setSelectedLineFields([]);
      return;
    }
    setSelectedLineFields((prev) => prev.filter((field) => availableFields.includes(field)));
  }, [availableFields]);

  useEffect(() => {
    if (selectedChartType !== "line") return;
    if (!availableFields.length) return;
    setSelectedLineFields((prev) => (prev.length ? prev : [availableFields[0]]));
  }, [availableFields, selectedChartType]);

  useEffect(() => {
    if (!isEditing) {
      setIsAddOpen(false);
      setActiveMenuId(null);
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditing) return;
    setDraftCharts(normalizedSavedCharts);
    setDraftLayout(normalizedSavedLayout as Layout);
  }, [normalizedSavedCharts, normalizedSavedLayout, isEditing]);

  useEffect(() => {
    if (!mounted) return;
    measureWidth();
  }, [mounted, draftCharts.length, normalizedSavedCharts.length, isEditing, isAddOpen, measureWidth]);

  useEffect(() => {
    if (!isEditOpen) return;
    if (!availableFields.length) return;
    if (!availableFields.includes(editField)) {
      setEditField(availableFields[0]);
    }
  }, [availableFields, editField, isEditOpen]);

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

  const handleEnterEdit = () => {
    if (readOnly || disabled) return;
    setDraftCharts(normalizedSavedCharts);
    setDraftLayout(normalizedSavedLayout as Layout);
    setIsEditing(true);
  };

  const handleExitEdit = () => {
    setIsEditing(false);
    setActiveMenuId(null);
    setIsAddOpen(false);
    setIsEditOpen(false);
    setIsFilterOpen(false);
    setEditingChartType(null);
    setEditMin("");
    setEditMax("");
    setSelectedMin("");
    setSelectedMax("");
    setSelectedLineMin("");
    setSelectedLineMax("");
    setSelectedLineFields([]);
    setDraftCharts(normalizedSavedCharts);
    setDraftLayout(normalizedSavedLayout as Layout);
  };

  const handleSaveChanges = async () => {
    if (!onSave) {
      setIsEditing(false);
      setActiveMenuId(null);
      return;
    }
    const nextCharts = draftCharts.map((chart) => ({
      ...chart,
      name: chart.name.trim() || "New panel",
    }));
    const nextLayout = draftLayout.map((item) => sanitizeLayoutItem(item));
    try {
      await onSave(nextCharts, nextLayout);
      setIsEditing(false);
      setActiveMenuId(null);
    } catch {
      // keep edit mode active when saving fails
    }
  };

  const handleOpenAdd = () => {
    if (readOnly || disabled) return;
    setSelectedMin("");
    setSelectedMax("");
    setSelectedLineMin("");
    setSelectedLineMax("");
    setSelectedLineFields(availableFields.length ? [availableFields[0]] : []);
    setIsAddOpen(true);
  };

  const handleCloseAdd = () => {
    setIsAddOpen(false);
    setSelectedMin("");
    setSelectedMax("");
    setSelectedLineMin("");
    setSelectedLineMax("");
    setSelectedLineFields([]);
  };

  const handleToggleLineField = (field: string) => {
    setSelectedLineFields((prev) =>
      prev.includes(field) ? prev.filter((item) => item !== field) : [...prev, field]
    );
  };

  const handleAddChart = () => {
    const isLineChart = selectedChartType === "line";
    const selectedLinePrimary = selectedLineFields[0] ?? "";
    const fieldValue = isLineChart ? selectedLinePrimary : selectedField;
    if (!fieldValue) return;
    if (isLineChart && selectedLineFields.length === 0) return;
    const id = `chart-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const nextPosition = getNextPosition(draftLayout);
    const nextLayout: LayoutItem = {
      i: id,
      x: nextPosition.x,
      y: nextPosition.y,
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
    setDraftLayout((prev) => [...prev, nextLayout]);
    setIsAddOpen(false);
    setSelectedMin("");
    setSelectedMax("");
    setSelectedLineMin("");
    setSelectedLineMax("");
    setSelectedLineFields([]);
  };

  const handleOpenEdit = (chart: ChartItem) => {
    if (readOnly || disabled) return;
    setEditingChartId(chart.id);
    setEditingChartType(chart.type);
    setEditName(chart.name.trim() || "New panel");
    setEditField(chart.fields?.[0] ?? chart.field);
    setEditMin(typeof chart.min === "number" ? String(chart.min) : "");
    setEditMax(typeof chart.max === "number" ? String(chart.max) : "");
    setIsEditOpen(true);
    setActiveMenuId(null);
  };

  const handleCloseEdit = () => {
    setIsEditOpen(false);
    setEditingChartId(null);
    setEditingChartType(null);
    setEditMin("");
    setEditMax("");
  };

  const handleOpenFilter = () => {
    setIsFilterOpen(true);
  };

  const handleCloseFilter = () => {
    setIsFilterOpen(false);
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
    setIsEditOpen(false);
    setEditingChartId(null);
    setEditingChartType(null);
  };

  const handleRemoveChart = (chartId: string) => {
    if (readOnly || disabled) return;
    setDraftCharts((prev) => prev.filter((chart) => chart.id !== chartId));
    setDraftLayout((prev) => prev.filter((item) => item.i !== chartId));
    setActiveMenuId(null);
  };

  const handleLayoutChange = (nextLayout: Layout) => {
    if (!isEditing || readOnly) return;
    setDraftLayout(nextLayout);
  };

  const emptyMessage = "No charts configured yet.";

  const displayCharts = isEditing ? draftCharts : normalizedSavedCharts;
  const displayLayout = isEditing ? draftLayout : (normalizedSavedLayout as Layout);

  return (
    <div className={styles["device-data-panel"]}>
      <div className={styles["device-data-panel-header"]}>
        <div>
          <h2>Data Chart</h2>
          <span className={styles["device-data-panel-subtitle"]}>View device data chart</span>
        </div>
        <div className={styles["device-data-panel-controls"]}>
          {isEditing ? (
            <div className={styles["device-chart-edit-actions"]}>
              <button
                type="button"
                className={styles["device-data-panel-filter-button"]}
                onClick={handleOpenFilter}
                disabled={disabled || saving}
                aria-label="Open filters"
              >
                <FaFilter />
              </button>
              <Button onClick={handleOpenAdd} disabled={!dataOptions.length || disabled || saving} className={styles["device-data-panel-control-button"]}>
                Add chart
              </Button>
              <Button onClick={handleExitEdit} variant="cancel" disabled={disabled || saving} className={styles["device-data-panel-control-button"]}>
                Exit edit
              </Button>
              <Button onClick={handleSaveChanges} disabled={disabled || saving} isLoading={saving} className={styles["device-data-panel-control-button"]}>
                Save
              </Button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className={styles["device-data-panel-filter-button"]}
                onClick={handleOpenFilter}
                disabled={disabled}
                aria-label="Open filters"
              >
                <FaFilter />
              </button>
              <DropdownSelect
                id="device-dashboard-display"
                value={displayMode}
                options={options}
                onChange={onDisplayChange}
                disabled={disabled}
              />
              <div className={styles["device-chart-actions"]}>
                {!readOnly && (
                  <Button onClick={handleEnterEdit} variant="primary" disabled={disabled} className={styles["device-data-panel-control-button"]}>
                    Edit
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {isEditing && saveError && <p className={styles["dashboard-modal-error"]}>{saveError}</p>}

      <div
        ref={containerRef}
        className={`${styles["device-chart-grid"]} ${isEditing ? styles["device-chart-grid-editing"] : ""}`}
      >
        {displayCharts.length === 0 ? (
          <div className={styles["device-data-empty"]}>
            <p>{emptyMessage}</p>
          </div>
        ) : !mounted ? (
          <div className={styles["device-data-empty"]}>
            <p>Preparing chart grid...</p>
          </div>
        ) : (
          <GridLayout
            width={width}
            layout={displayLayout}
            gridConfig={{
              cols: GRID_COLS,
              rowHeight: GRID_ROW_HEIGHT,
              margin: GRID_MARGIN,
              containerPadding: GRID_PADDING,
            }}
            dragConfig={{ enabled: isEditing && !disabled, cancel: dragCancelSelector, bounded: true }}
            resizeConfig={{
              enabled: isEditing && !disabled,
              handles: resizeHandles,
              handleComponent: renderResizeHandle,
            }}
            compactor={GRID_COMPACTOR}
            onLayoutChange={handleLayoutChange}
          >
            {displayCharts.map((chart) => {
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
            })}
          </GridLayout>
        )}
      </div>

      <Modal isOpen={isAddOpen} onClose={handleCloseAdd} title="Add chart">
        <div className={styles["dashboard-modal-form"]}>
          <DropdownSelect
            id="device-chart-type"
            label="Chart type"
            value={selectedChartType}
            options={CHART_OPTIONS}
            onChange={setSelectedChartType}
            disabled={disabled} 
          />
          {selectedChartType !== "line" && (
            <DropdownSelect
              id="device-chart-field"
              label="Data field"
              value={selectedField}
              options={dataOptions}
              placeholder={dataOptions.length ? "Select data" : "No data fields available"}
              onChange={setSelectedField}
              disabled={!dataOptions.length || disabled}
            />
          )}
          {selectedChartType === "line" && (
            <>
              <div>
                <span className={styles["dashboard-select-label"]}>Data fields</span>
                <div className={styles["dashboard-checkbox-row"]}>
                  {dataOptions.map((option) => (
                    <label key={option.value}>
                      <input
                        type="checkbox"
                        checked={selectedLineFields.includes(option.value)}
                        onChange={() => handleToggleLineField(option.value)}
                        disabled={disabled}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className={styles["dashboard-inline-row"]}>
                <Input
                  id="device-chart-line-min"
                  label="Min (optional)"
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={selectedLineMin}
                  onChange={(event) => setSelectedLineMin(event.target.value)}
                  disabled={disabled}
                />
                <Input
                  id="device-chart-line-max"
                  label="Max (optional)"
                  type="number"
                  inputMode="decimal"
                  placeholder="100"
                  value={selectedLineMax}
                  onChange={(event) => setSelectedLineMax(event.target.value)}
                  disabled={disabled}
                />
              </div>
            </>
          )}
          {selectedChartType === "meter" && (
            <>
              <div className={styles["dashboard-inline-row"]}>
                <Input
                  id="device-chart-min"
                  label="Min"
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={selectedMin}
                  onChange={(event) => setSelectedMin(event.target.value)}
                  disabled={disabled}
                />
                <Input
                  id="device-chart-max"
                  label="Max"
                  type="number"
                  inputMode="decimal"
                  placeholder="100"
                  value={selectedMax}
                  onChange={(event) => setSelectedMax(event.target.value)}
                  disabled={disabled}
                />
              </div>
            </>
          )}
          {!dataOptions.length && (
            <p className={styles["dashboard-modal-error"]}>Add data fields in the data panel first.</p>
          )}
          {selectedChartType === "line" && dataOptions.length > 0 && selectedLineFields.length === 0 && (
            <p className={styles["dashboard-modal-error"]}>Select at least one data field.</p>
          )}
          <div className={styles["dashboard-modal-actions"]}>
            <Button type="button" variant="cancel" onClick={handleCloseAdd}>
              Cancel
            </Button>
            <Button type="button" onClick={handleAddChart} disabled={!canAddChart}>
              Add chart
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isEditOpen} onClose={handleCloseEdit} title="Edit chart">
        <div className={styles["dashboard-modal-form"]}>
          <Input
            id="device-edit-chart-name"
            label="Chart name"
            placeholder="Enter chart name"
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
          />
          <DropdownSelect
            id="device-edit-chart-field"
            label="Data field"
            value={editField}
            options={dataOptions}
            placeholder={dataOptions.length ? "Select data" : "No data fields available"}
            onChange={setEditField}
            disabled={!dataOptions.length}
          />
          {(editingChartType === "meter" || editingChartType === "line") && (
            <>
              <div className={styles["dashboard-inline-row"]}>
                <Input
                  id="device-edit-chart-min"
                  label="Min"
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={editMin}
                  onChange={(event) => setEditMin(event.target.value)}
                />
                <Input
                  id="device-edit-chart-max"
                  label="Max"
                  type="number"
                  inputMode="decimal"
                  placeholder="100"
                  value={editMax}
                  onChange={(event) => setEditMax(event.target.value)}
                />
              </div>
            </>
          )}
          {!dataOptions.length && (
            <p className={styles["dashboard-modal-error"]}>Add data fields in the data panel first.</p>
          )}
          <div className={styles["dashboard-modal-actions"]}>
            <Button type="button" variant="cancel" onClick={handleCloseEdit}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveEdit}
              disabled={!editName.trim() || (!editField && dataOptions.length > 0)}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isFilterOpen} onClose={handleCloseFilter} title="Chart filters">
        <div className={styles["dashboard-modal-form"]}>
          <DropdownSelect
            id="device-data-time-granularity"
            label="Granularity"
            value={timeGranularity}
            options={LINE_GRANULARITY_OPTIONS}
            onChange={setTimeGranularity}
            disabled={disabled}
          />
          <Input
            id="device-data-time-start"
            label={`Start ${timeDateLabel}`}
            type={timeDateInputType}
            step={timeDateStep}
            value={timeStart}
            onChange={(event) => setTimeStart(event.target.value)}
            disabled={disabled}
          />
          <Input
            id="device-data-time-end"
            label={`End ${timeDateLabel}`}
            type={timeDateInputType}
            step={timeDateStep}
            value={timeEnd}
            onChange={(event) => setTimeEnd(event.target.value)}
            disabled={disabled}
          />
          <div className={styles["dashboard-modal-actions"]}>
            <Button type="button" variant="cancel" onClick={handleCloseFilter}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
