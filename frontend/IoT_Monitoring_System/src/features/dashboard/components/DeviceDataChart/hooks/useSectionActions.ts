import type { Dispatch, SetStateAction } from "react";
import type { Layout } from "react-grid-layout";
import type { ChartItem, ChartSection } from "../types/deviceDataChartTypes";
import { GRID_COLS, SECTION_ROW_HEIGHT } from "../utils/deviceDataChartConstants";
import { getLayoutMaxY, getSectionKey } from "../utils/deviceDataChartUtils";
import type { SectionModalState } from "../state/deviceDataChartState";

type UseSectionActionsParams = {
  isEditing: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  sectionModalState: SectionModalState;
  setSectionModalError: (error: string | null) => void;
  openSectionModalAdd: () => void;
  openSectionModalRename: (section: { id: string; name: string }) => void;
  closeSectionModal: () => void;
  draftCharts: ChartItem[];
  draftAssignments: Record<string, string | null>;
  setDraftSections: Dispatch<SetStateAction<ChartSection[]>>;
  setDraftCharts: Dispatch<SetStateAction<ChartItem[]>>;
  setDraftLayout: Dispatch<SetStateAction<Layout>>;
  setViewSections: Dispatch<SetStateAction<ChartSection[]>>;
};

export const useSectionActions = ({
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
}: UseSectionActionsParams) => {
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
        const nextY = getLayoutMaxY(prev);
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

  return {
    openAddSection,
    openRenameSection,
    handleSaveSection,
    handleToggleSection,
    handleDeleteSection,
  };
};
