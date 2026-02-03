import { type Ref, useEffect, useMemo, useRef, useState } from "react";
import { FaChevronDown, FaChevronRight, FaEllipsisV, FaFilter, FaPlus } from "react-icons/fa";
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
  section_id?: string | null;
};

type ChartLayoutItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  isResizable?: boolean;
  isDraggable?: boolean;
  static?: boolean;
  maxW?: number;
};

type ChartSection = {
  id: string;
  name: string;
  collapsed?: boolean;
};

type ChartItem = {
  id: string;
  type: ChartType;
  field: string;
  name: string;
  min?: number;
  max?: number;
  fields?: string[];
  section_id?: string | null;
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
const DEFAULT_PANEL_SIZE = { w: 4, h: 3 };
const GRID_MARGIN: [number, number] = [16, 16];
const GRID_PADDING: [number, number] = [0, 0];
const RESIZE_HANDLES: ResizeHandleAxis[] = ["se"];
const GRID_COMPACTOR = getCompactor("vertical", false, false);
const RESIZE_HANDLE_INSET = 10;
const SECTION_PREFIX = "section:";
const SECTION_ROW_HEIGHT = 1;

const getSectionKey = (sectionId: string) => `${SECTION_PREFIX}${sectionId}`;
const isSectionKey = (key: string) => key.startsWith(SECTION_PREFIX);
const getSectionIdFromKey = (key: string) => key.replace(SECTION_PREFIX, "");
const getLayoutMaxY = (layout: Array<{ y: number; h: number }>) =>
  layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);


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
  savedSections?: ChartSection[];
  onSave?: (
    charts: ChartItemConfig[],
    layout: ChartLayoutItem[],
    sections: ChartSection[]
  ) => Promise<void>;
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

const normalizeLayoutItem = (item: LayoutItem | ChartLayoutItem): ChartLayoutItem => {
  if (isSectionKey(item.i)) {
    return {
      i: item.i,
      x: 0,
      y: item.y,
      w: GRID_COLS,
      h: SECTION_ROW_HEIGHT,
      minW: GRID_COLS,
      maxW: GRID_COLS,
      minH: SECTION_ROW_HEIGHT,
      isResizable: false,
      isDraggable: false,
    };
  }
  return {
    i: item.i,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: item.minW,
    minH: item.minH,
  };
};

const ensureChartLayout = (
  charts: ChartItem[],
  sections: ChartSection[],
  layout: ChartLayoutItem[]
) => {
  const chartIds = new Set(charts.map((chart) => chart.id));
  const sectionKeys = new Set(sections.map((section) => getSectionKey(section.id)));
  let nextLayout = layout
    .filter((item) => chartIds.has(item.i) || sectionKeys.has(item.i))
    .map((item) => normalizeLayoutItem(item));
  const usedIds = new Set(nextLayout.map((item) => item.i));
  let nextY = getLayoutMaxY(nextLayout);
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
      maxW: GRID_COLS,
      minH: SECTION_ROW_HEIGHT,
      isResizable: false,
      isDraggable: false,
    });
    nextY += SECTION_ROW_HEIGHT;
  });
  return nextLayout.map((item) => normalizeLayoutItem(item));
};

const buildSectionAssignments = (
  layout: ChartLayoutItem[],
  sections: ChartSection[],
  currentAssignments: Record<string, string | null>,
  recomputeIds: Set<string> | null = null
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
    if (!recomputeIds || !recomputeIds.has(item.i)) {
      assignments[item.i] = currentAssignment ?? null;
      return;
    }
    let assigned: string | null = null;
    for (const header of headers) {
      if (header.y <= item.y) {
        if (header.collapsed) {
          assigned = null;
          break;
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

const mergeLayout = (prev: Layout, next: Layout) => {
  const nextMap = new Map(next.map((item) => [item.i, item]));
  const prevIds = new Set(prev.map((item) => item.i));
  const merged = prev.map((item) => nextMap.get(item.i) ?? item);
  next.forEach((item) => {
    if (!prevIds.has(item.i)) {
      merged.push(item);
    }
  });
  return merged;
};

const orderSectionsByLayout = (sections: ChartSection[], layout: ChartLayoutItem[]) => {
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
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [sectionModalName, setSectionModalName] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionModalError, setSectionModalError] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
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
      setActiveSectionMenu(null);
      setSectionModalOpen(false);
      setSectionModalName("");
      setSectionModalError(null);
      setEditingSectionId(null);
    }
  }, [isEditing]);

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
    setDraftSections(savedSections);
    setViewSections(savedSections);
    setDraftAssignments({});
    setSectionModalOpen(false);
    setSectionModalName("");
    setSectionModalError(null);
    setEditingSectionId(null);
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

  const openAddSection = () => {
    if (!isEditing || readOnly || disabled) return;
    setEditingSectionId(null);
    setSectionModalName("");
    setSectionModalError(null);
    setSectionModalOpen(true);
  };

  const openRenameSection = (section: ChartSection) => {
    if (!isEditing || readOnly || disabled) return;
    setEditingSectionId(section.id);
    setSectionModalName(section.name);
    setSectionModalError(null);
    setSectionModalOpen(true);
  };

  const closeSectionModal = () => {
    setSectionModalOpen(false);
    setSectionModalName("");
    setSectionModalError(null);
    setEditingSectionId(null);
  };

  const handleSaveSection = () => {
    const trimmed = sectionModalName.trim();
    if (!trimmed) {
      setSectionModalError("Section name is required.");
      return;
    }
    if (editingSectionId) {
      setDraftSections((prev) =>
        prev.map((section) =>
          section.id === editingSectionId ? { ...section, name: trimmed } : section
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
              <Button
                onClick={openAddSection}
                disabled={disabled || saving}
                className={styles["device-data-panel-control-button"]}
              >
                <span className={styles["device-panel-button-icon"]}>
                  <FaPlus />
                </span>
                Add section
              </Button>
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

      <Modal
        isOpen={sectionModalOpen}
        onClose={closeSectionModal}
        title={editingSectionId ? "Rename section" : "Add section"}
      >
        <div className={styles["dashboard-modal-form"]}>
          <Input
            id="device-chart-section-name"
            label="Section name"
            placeholder="e.g. Core Metrics"
            value={sectionModalName}
            onChange={(event) => setSectionModalName(event.target.value)}
          />
          {sectionModalError && <p className={styles["dashboard-modal-error"]}>{sectionModalError}</p>}
          <div className={styles["dashboard-modal-actions"]}>
            <Button type="button" variant="cancel" onClick={closeSectionModal}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveSection} disabled={!sectionModalName.trim()}>
              {editingSectionId ? "Save" : "Add"}
            </Button>
          </div>
        </div>
      </Modal>

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
