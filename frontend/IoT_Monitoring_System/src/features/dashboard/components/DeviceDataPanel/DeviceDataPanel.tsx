import { type ReactNode, type Ref, useEffect, useMemo, useRef, useState } from "react";
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
import type { DeviceDataPanelProps, PanelLayoutItem, PanelSection } from "./types/deviceDataPanelTypes";
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
  getFieldType,
  getFieldUnit,
  getFieldColor,
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
  const sectionModal = useSectionModalState();
  const [draftAssignments, setDraftAssignments] = useState<Record<string, string | null>>({});
  // Guard against layout updates triggered by props or effects vs user interactions.
  const isUserInteraction = useRef(false);
  const previousFieldsRef = useRef<string[]>(panelFields);
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

  const { state: sectionModalState, close: closeSectionModal, setName: setSectionModalName } =
    sectionModal;
  const listModalItems = useMemo(() => {
    if (!activeListField) return [];
    return buildListModalItems(getFieldRawValue(activeListField));
  }, [activeListField, getFieldRawValue]);
  const listCaseColors = useMemo(() => {
    if (!activeListField) return null;
    return getFieldCaseColors?.(activeListField) ?? null;
  }, [activeListField, getFieldCaseColors]);

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
    if (fieldType === "list") {
      const rawValue = getFieldRawValue(field);
      const unit = getFieldUnit(field);
      const count = getListCount(rawValue);
      const display = unit ? `${count} ${unit}` : String(count);
      return <span className={styles["device-data-list-value"]}>{display}</span>;
    }
    if (fieldType === "boolean") {
      const display = getFieldBooleanDisplay?.(field);
      const label = display?.label ?? getFieldValue(field);
      const color = display?.color?.trim();
      if (color) {
        return <span style={{ color }}>{label}</span>;
      }
      return label;
    }
    const displayValue = getFieldValue(field);
    if (fieldType !== "text") {
      return displayValue;
    }
    const rawValue = getFieldRawValue(field);
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
    return <span style={{ color }}>{displayValue}</span>;
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
    const canOpenMenu = fieldType === "list" || (!readOnly && isLayoutEditing);
    const labelColor = getFieldColor?.(field)?.trim();
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
      <DeviceDataPanelHeader
        isEditing={isLayoutEditing}
        disabled={disabled}
        readOnly={readOnly}
        layoutSaving={layoutSaving}
        subtitle={subtitle}
        displayMode={displayMode}
        options={options}
        onDisplayChange={onDisplayChange}
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
