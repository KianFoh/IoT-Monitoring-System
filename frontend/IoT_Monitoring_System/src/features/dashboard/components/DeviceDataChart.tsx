import { type Ref, useEffect, useMemo, useState } from "react";
import { FaEllipsisV } from "react-icons/fa";
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
import DropdownSelect from "./DropdownSelect";
import styles from "../styles/dashboard.module.css";

type DisplayOption<T extends string> = {
  value: T;
  label: string;
};

type ChartType = "meter" | "line" | "bar";

type ChartItemConfig = {
  id: string;
  type: ChartType;
  field: string;
  name?: string | null;
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
};

const CHART_OPTIONS: Array<{ value: ChartType; label: string }> = [
  { value: "meter", label: "Meter" },
  { value: "line", label: "Line" },
  { value: "bar", label: "Bar" },
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
  availableFields: string[];
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

const normalizeChart = (chart: ChartItemConfig): ChartItem => ({
  ...chart,
  name: chart.name?.trim() || "New panel",
});

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

export function DeviceDataChart<T extends string>({
  displayMode,
  options,
  onDisplayChange,
  disabled,
  availableFields,
  savedCharts = [],
  savedLayout = [],
  onSave,
  saving = false,
  saveError = null,
}: DeviceDataChartProps<T>) {
  const [isEditing, setIsEditing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
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
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingChartId, setEditingChartId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editField, setEditField] = useState("");
  const dragCancelSelector = `.${styles["device-chart-menu-button"]}, .${styles["device-chart-menu"]}, .${styles["device-chart-resize-handle"]}, .react-resizable-handle`;
  const { width, containerRef, mounted, measureWidth } = useContainerWidth({
    initialWidth: 0,
    measureBeforeMount: true,
  });
  const resizeHandles = isEditing && !disabled ? RESIZE_HANDLES : [];
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
    setDraftCharts(normalizedSavedCharts);
    setDraftLayout(normalizedSavedLayout as Layout);
    setIsEditing(true);
  };

  const handleExitEdit = () => {
    setIsEditing(false);
    setActiveMenuId(null);
    setIsAddOpen(false);
    setIsEditOpen(false);
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
    setIsAddOpen(true);
  };

  const handleCloseAdd = () => {
    setIsAddOpen(false);
  };

  const handleAddChart = () => {
    if (!selectedField) return;
    const id = `chart-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const nextPosition = getNextPosition(draftLayout);
    const nextLayout: LayoutItem = {
      i: id,
      x: nextPosition.x,
      y: nextPosition.y,
      w: DEFAULT_PANEL_SIZE.w,
      h: DEFAULT_PANEL_SIZE.h,
    };
    setDraftCharts((prev) => [
      ...prev,
      { id, type: selectedChartType, field: selectedField, name: "New panel" },
    ]);
    setDraftLayout((prev) => [...prev, nextLayout]);
    setIsAddOpen(false);
  };

  const handleOpenEdit = (chart: ChartItem) => {
    setEditingChartId(chart.id);
    setEditName(chart.name.trim() || "New panel");
    setEditField(chart.field);
    setIsEditOpen(true);
    setActiveMenuId(null);
  };

  const handleCloseEdit = () => {
    setIsEditOpen(false);
    setEditingChartId(null);
  };

  const handleSaveEdit = () => {
    if (!editingChartId) return;
    const name = editName.trim() || "New panel";
    const field = editField || "";
    setDraftCharts((prev) =>
      prev.map((chart) =>
        chart.id === editingChartId
          ? {
              ...chart,
              name,
              field: field || chart.field,
            }
          : chart
      )
    );
    setIsEditOpen(false);
    setEditingChartId(null);
  };

  const handleRemoveChart = (chartId: string) => {
    setDraftCharts((prev) => prev.filter((chart) => chart.id !== chartId));
    setDraftLayout((prev) => prev.filter((item) => item.i !== chartId));
    setActiveMenuId(null);
  };

  const handleLayoutChange = (nextLayout: Layout) => {
    if (!isEditing) return;
    setDraftLayout(nextLayout);
  };

  const emptyMessage = isEditing
    ? "No charts yet. Use Add chart to create one."
    : "No charts yet. Switch to Edit to add charts.";

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
              <DropdownSelect
                id="device-dashboard-display"
                value={displayMode}
                options={options}
                onChange={onDisplayChange}
                disabled={disabled}
              />
              <div className={styles["device-chart-actions"]}>
                <Button onClick={handleEnterEdit} variant="primary" disabled={disabled} className={styles["device-data-panel-control-button"]}>
                  Edit
                </Button>
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
            {displayCharts.map((chart) => (
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
              </div>
            ))}
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
          <DropdownSelect
            id="device-chart-field"
            label="Data field"
            value={selectedField}
            options={dataOptions}
            placeholder={dataOptions.length ? "Select data" : "No data fields available"}
            onChange={setSelectedField}
            disabled={!dataOptions.length || disabled}
          />
          {!dataOptions.length && (
            <p className={styles["dashboard-modal-error"]}>Generate a data panel to load fields.</p>
          )}
          <div className={styles["dashboard-modal-actions"]}>
            <Button type="button" variant="cancel" onClick={handleCloseAdd}>
              Cancel
            </Button>
            <Button type="button" onClick={handleAddChart} disabled={!selectedField || disabled}>
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
          {!dataOptions.length && (
            <p className={styles["dashboard-modal-error"]}>Generate a data panel to load fields.</p>
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
    </div>
  );
}
