import { type Ref, useEffect, useMemo, useRef, useState } from "react";
import { FaChevronDown, FaChevronRight, FaCog, FaEllipsisV, FaPlus } from "react-icons/fa";
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

type DeviceDataPanelProps<T extends string> = {
  displayMode: T;
  options: DisplayOption<T>[];
  onDisplayChange: (value: T) => void;
  disabled?: boolean;
  readOnly?: boolean;
  subtitle: string;
  panelFields: string[];
  panelLayout: PanelLayoutItem[];
  panelSections: PanelSection[];
  getFieldLabel: (field: string) => string;
  getFieldSectionId: (field: string) => string | null;
  getFieldRawValue: (field: string) => unknown;
  getFieldValue: (field: string) => string;
  getFieldType: (field: string) => "number" | "text" | "list";
  getFieldUnit: (field: string) => string;
  onOpenFieldConfig: (field: string) => void;
  onAddField: () => void;
  onRemoveField: (field: string) => void;
  onAddSection: (name: string) => void;
  onRenameSection: (sectionId: string, name: string) => void;
  onDeleteSection: (sectionId: string, fieldsInSection?: string[]) => void;
  onToggleSection: (sectionId: string) => void;
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
  onSaveLayout?: (payload: {
    layout: PanelLayoutItem[];
    assignments?: Record<string, string | null>;
  }) => Promise<void>;
  layoutSaving?: boolean;
  layoutError?: string | null;
};

type PanelLayoutItem = {
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

type PanelSection = {
  id: string;
  name: string;
  collapsed?: boolean;
};

const GRID_COLS = 12;
const GRID_ROW_HEIGHT = 80;
const GRID_MARGIN: [number, number] = [16, 16];
const GRID_PADDING: [number, number] = [0, 0];
const RESIZE_HANDLES: ResizeHandleAxis[] = ["se"];
const RESIZE_HANDLE_INSET = 10;
const DEFAULT_PANEL_SIZE = { w: 3, h: 2, minW: 1, minH: 1 };
const SECTION_PREFIX = "section:";
const SECTION_ROW_HEIGHT = 1;

const getSectionKey = (sectionId: string) => `${SECTION_PREFIX}${sectionId}`;
const isSectionKey = (key: string) => key.startsWith(SECTION_PREFIX);
const getSectionIdFromKey = (key: string) => key.replace(SECTION_PREFIX, "");
const getLayoutMaxY = (layout: Array<{ y: number; h: number }>) =>
  layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);
const GRID_COMPACTOR = getCompactor("vertical", false, false);



const normalizeLayoutItem = (item: LayoutItem | PanelLayoutItem): PanelLayoutItem => {
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
    minW: DEFAULT_PANEL_SIZE.minW,
    minH: DEFAULT_PANEL_SIZE.minH,
  };
};

const ensurePanelLayout = (
  fields: string[],
  sections: PanelSection[],
  layout: PanelLayoutItem[]
) => {
  const fieldSet = new Set(fields);
  const sectionKeys = new Set(sections.map((section) => getSectionKey(section.id)));
  let nextLayout = layout
    .filter((item) => fieldSet.has(item.i) || sectionKeys.has(item.i))
    .map((item) => normalizeLayoutItem(item));
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
  layout: PanelLayoutItem[],
  sections: PanelSection[],
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

export function DeviceDataPanel<T extends string>({
  displayMode,
  options,
  onDisplayChange,
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
  getFieldType,
  getFieldUnit,
  onOpenFieldConfig,
  onAddField,
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
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [sectionModalName, setSectionModalName] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionModalError, setSectionModalError] = useState<string | null>(null);
  const [draftAssignments, setDraftAssignments] = useState<Record<string, string | null>>({});
  const isUserInteraction = useRef(false);
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
  const renderResizeHandle = (axis: ResizeHandleAxis, ref: Ref<HTMLSpanElement>) => (
    <span
      ref={ref}
      className={styles["device-chart-resize-handle"]}
      style={axis === "se" ? { right: RESIZE_HANDLE_INSET, bottom: RESIZE_HANDLE_INSET } : undefined}
    >
      <span className={styles["device-chart-resize-handle-icon"]} />
    </span>
  );

  const listModalItems = useMemo(() => {
    if (!activeListField) return [];
    const rawValue = getFieldRawValue(activeListField);
    if (Array.isArray(rawValue)) {
      return rawValue.map((item) => String(item));
    }
    if (rawValue && typeof rawValue === "object") {
      return Object.entries(rawValue as Record<string, unknown>).map(([key, value]) =>
        typeof value === "number" ? `${key} (${value})` : `${key}: ${String(value)}`
      );
    }
    if (typeof rawValue === "string" && rawValue.trim()) {
      return [rawValue];
    }
    return [];
  }, [activeListField, getFieldRawValue]);

  useEffect(() => {
    if (!activeMenuField) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest(`[data-field-menu="${activeMenuField}"]`)) return;
      setActiveMenuField(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [activeMenuField]);

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
    setDraftLayout((prev) =>
      ensurePanelLayout(panelFields, panelSections, prev as PanelLayoutItem[]) as Layout
    );
  }, [panelFields, panelSections, isLayoutEditing]);

  useEffect(() => {
    measureWidth();
  }, [panelFields.length, panelSections.length, isLayoutEditing, measureWidth]);

  const getListCount = (rawValue: unknown) => {
    if (Array.isArray(rawValue)) {
      return rawValue.length;
    }
    if (rawValue && typeof rawValue === "object") {
      return Object.values(rawValue as Record<string, unknown>).reduce<number>((sum, value) => {
        if (typeof value === "number") return sum + value;
        return sum + 1;
      }, 0);
    }
    if (typeof rawValue === "string" && rawValue.trim()) {
      return 1;
    }
    return 0;
  };

  const renderFieldValue = (field: string) => {
    const fieldType = getFieldType(field);
    if (fieldType !== "list") {
      return getFieldValue(field);
    }
    const rawValue = getFieldRawValue(field);
    const unit = getFieldUnit(field);
    const count = getListCount(rawValue);
    const display = unit ? `${count} ${unit}` : String(count);
    return <span className={styles["device-data-list-value"]}>{display}</span>;
  };

  const openAddSection = () => {
    if (!isLayoutEditing || readOnly || disabled) return;
    setEditingSectionId(null);
    setSectionModalName("");
    setSectionModalError(null);
    setSectionModalOpen(true);
  };

  const openRenameSection = (section: PanelSection) => {
    if (!isLayoutEditing || readOnly || disabled) return;
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
      onRenameSection(editingSectionId, trimmed);
    } else {
      onAddSection(trimmed);
    }
    closeSectionModal();
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
    closeSectionModal();
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
      const assignments = baseAssignments;
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
    if (!newItem) {
      setDraftLayout((prev) => mergeLayout(prev, normalized));
      return;
    }
    if (isSectionKey(newItem.i)) {
      setDraftLayout((prev) => mergeLayout(prev, normalized));
      return;
    }
    setDraftLayout((prev) => mergeLayout(prev, normalized));
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
    const canOpenMenu = fieldType === "list" || (!readOnly && isLayoutEditing);
    return (
      <div
        key={field}
        className={`${styles["device-data-card"]} ${
          isLayoutEditing ? styles["device-data-card-editing"] : ""
        }`}
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
                {fieldType === "list" && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuField(null);
                      setActiveListField(field);
                    }}
                    disabled={getListCount(getFieldRawValue(field)) === 0}
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
        <span className={styles["device-data-label"]}>{getFieldLabel(field)}</span>
        <span className={styles["device-data-value"]}>{renderFieldValue(field)}</span>
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
        }`}
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

  return (
    <div className={styles["device-data-panel"]}>
      <div className={styles["device-data-panel-header"]}>
        <div>
          <h2>Data Panel</h2>
          <span className={styles["device-data-panel-subtitle"]}>{subtitle}</span>
        </div>
        <div className={styles["device-data-panel-controls"]}>
          {isLayoutEditing ? (
            !readOnly && (
              <>
                <Button
                  onClick={openAddSection}
                  disabled={disabled || layoutSaving}
                  className={styles["device-data-panel-control-button"]}
                >
                  <span className={styles["device-panel-button-icon"]}>
                    <FaPlus />
                  </span>
                  Add section
                </Button>
                <Button
                  onClick={onAddField}
                  disabled={disabled || layoutSaving}
                  className={styles["device-data-panel-control-button"]}
                >
                  Add field
                </Button>
                <Button
                  variant="cancel"
                  onClick={handleCancelLayoutEdit}
                  disabled={disabled || layoutSaving}
                  className={styles["device-data-panel-control-button"]}
                >
                  Exit edit
                </Button>
                <Button
                  onClick={handleSaveLayout}
                  isLoading={layoutSaving}
                  disabled={disabled || layoutSaving}
                  className={styles["device-data-panel-control-button"]}
                >
                  Save
                </Button>
              </>
            )
          ) : (
            <>
              <DropdownSelect
                id="device-dashboard-display"
                value={displayMode}
                options={options}
                onChange={onDisplayChange}
                disabled={disabled}
              />
              {!readOnly && (
                <div className={styles["device-chart-actions"]}>
                  <Button
                    onClick={handleEnterLayoutEdit}
                    disabled={disabled}
                    className={styles["device-data-panel-control-button"]}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {isLayoutEditing && layoutError && (
        <p className={styles["dashboard-modal-error"]}>{layoutError}</p>
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

      <Modal
        isOpen={sectionModalOpen}
        onClose={closeSectionModal}
        title={editingSectionId ? "Rename section" : "Add section"}
      >
        <div className={styles["dashboard-modal-form"]}>
          <Input
            id="device-section-name"
            label="Section name"
            placeholder="e.g. Water Quality"
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

      <Modal
        isOpen={!!activeListField}
        onClose={() => setActiveListField(null)}
        title={
          activeListField
            ? `${getFieldLabel(activeListField)} details`
            : "Field details"
        }
        footer={
          <Button type="button" variant="cancel" onClick={() => setActiveListField(null)}>
            Close
          </Button>
        }
      >
        <div className={styles["device-data-list-modal"]}>
          {listModalItems.length === 0 ? (
            <p className={styles["device-data-list-empty"]}>No items available.</p>
          ) : (
            <ul>
              {listModalItems.map((item, index) => (
                <li key={`${activeListField}-detail-${index}`}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </div>
  );
}
