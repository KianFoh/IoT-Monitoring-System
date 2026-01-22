import { useEffect, useMemo, useState } from "react";
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
const DEFAULT_PANEL_SIZE = { w: 4, h: 3 };
const GRID_MARGIN: [number, number] = [16, 16];
const GRID_PADDING: [number, number] = [0, 0];
const RESIZE_HANDLES: ResizeHandleAxis[] = ["se"];
const GRID_COMPACTOR = getCompactor("vertical", false, false);

type DeviceDataChartProps<T extends string> = {
  displayMode: T;
  options: DisplayOption<T>[];
  onDisplayChange: (value: T) => void;
  disabled?: boolean;
  availableFields: string[];
};

const getNextPosition = (layout: Layout) => {
  if (layout.length === 0) return { x: 0, y: 0 };
  const maxY = Math.max(...layout.map((item) => item.y + item.h));
  return { x: 0, y: maxY };
};

const getChartLabel = (type: ChartType) =>
  CHART_OPTIONS.find((option) => option.value === type)?.label ?? type;

export function DeviceDataChart<T extends string>({
  displayMode,
  options,
  onDisplayChange,
  disabled,
  availableFields,
}: DeviceDataChartProps<T>) {
  const [isEditing, setIsEditing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [charts, setCharts] = useState<ChartItem[]>([]);
  const [layout, setLayout] = useState<Layout>([]);
  const [selectedChartType, setSelectedChartType] = useState<ChartType>(CHART_OPTIONS[0].value);
  const [selectedField, setSelectedField] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingChartId, setEditingChartId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editField, setEditField] = useState("");
  const dragCancelSelector = `.${styles["device-chart-menu-button"]}, .${styles["device-chart-menu"]}`;
  const { width, containerRef, mounted, measureWidth } = useContainerWidth({
    initialWidth: 0,
    measureBeforeMount: true,
  });

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
    if (!mounted) return;
    measureWidth();
  }, [mounted, charts.length, isEditing, isAddOpen, measureWidth]);

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

  const handleToggleEdit = () => {
    setIsEditing((prev) => !prev);
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
    const nextPosition = getNextPosition(layout);
    const nextLayout: LayoutItem = {
      i: id,
      x: nextPosition.x,
      y: nextPosition.y,
      w: DEFAULT_PANEL_SIZE.w,
      h: DEFAULT_PANEL_SIZE.h,
      minH: 0.5,
      minW: 0.5,
    };
    setCharts((prev) => [
      ...prev,
      { id, type: selectedChartType, field: selectedField, name: "New panel" },
    ]);
    setLayout((prev) => [...prev, nextLayout]);
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
    setCharts((prev) =>
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
    setCharts((prev) => prev.filter((chart) => chart.id !== chartId));
    setLayout((prev) => prev.filter((item) => item.i !== chartId));
    setActiveMenuId(null);
  };

  const handleLayoutChange = (nextLayout: Layout) => {
    setLayout(nextLayout);
  };

  const emptyMessage = isEditing
    ? "No charts yet. Use Add chart to create one."
    : "No charts yet. Switch to Edit to add charts.";

  return (
    <div className={styles["device-data-panel"]}>
      <div className={styles["device-data-panel-header"]}>
        <div>
          <h2>Display Panel</h2>
          <span className={styles["device-data-panel-subtitle"]}>Data chart view.</span>
        </div>
        <div className={styles["device-data-panel-controls"]}>
          <DropdownSelect
            id="device-dashboard-display"
            value={displayMode}
            options={options}
            onChange={onDisplayChange}
            disabled={disabled}
          />
          <div className={styles["device-chart-actions"]}>
            <Button onClick={handleToggleEdit} variant={isEditing ? "cancel" : "primary"} disabled={disabled}>
              {isEditing ? "Exit edit" : "Edit"}
            </Button>
            {isEditing && (
              <Button onClick={handleOpenAdd} disabled={!dataOptions.length || disabled}>
                Add chart
              </Button>
            )}
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`${styles["device-chart-grid"]} ${isEditing ? styles["device-chart-grid-editing"] : ""}`}
      >
        {charts.length === 0 ? (
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
            layout={layout}
            gridConfig={{
              cols: GRID_COLS,
              rowHeight: GRID_ROW_HEIGHT,
              margin: GRID_MARGIN,
              containerPadding: GRID_PADDING,
            }}
            dragConfig={{ enabled: isEditing && !disabled, cancel: dragCancelSelector }}
            resizeConfig={{ enabled: isEditing && !disabled, handles: RESIZE_HANDLES }}
            compactor={GRID_COMPACTOR}
            onLayoutChange={handleLayoutChange}
          >
            {charts.map((chart) => (
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
