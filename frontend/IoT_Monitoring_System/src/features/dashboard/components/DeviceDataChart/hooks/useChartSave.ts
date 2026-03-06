import type { Dispatch, SetStateAction } from "react";
import type { Layout } from "react-grid-layout";
import type { ChartItem, ChartLayoutItem, ChartSection } from "../types/deviceDataChartTypes";
import { buildSectionAssignments, normalizeLayoutItem, orderSectionsByLayout } from "../utils/deviceDataChartUtils";

type UseChartSaveParams = {
  readOnly?: boolean;
  disabled?: boolean;
  onSave?: (
    charts: ChartItem[],
    layout: ChartLayoutItem[],
    sections: ChartSection[]
  ) => Promise<void>;
  normalizedSavedCharts: ChartItem[];
  normalizedSavedLayout: Layout;
  savedSections: ChartSection[];
  savedAssignments: Record<string, string | null>;
  draftCharts: ChartItem[];
  draftLayout: Layout;
  draftSections: ChartSection[];
  draftAssignments: Record<string, string | null>;
  setDraftCharts: Dispatch<SetStateAction<ChartItem[]>>;
  setDraftLayout: Dispatch<SetStateAction<Layout>>;
  setDraftSections: Dispatch<SetStateAction<ChartSection[]>>;
  setViewSections: Dispatch<SetStateAction<ChartSection[]>>;
  setDraftAssignments: Dispatch<SetStateAction<Record<string, string | null>>>;
  setIsEditing: Dispatch<SetStateAction<boolean>>;
  setActiveMenuId: Dispatch<SetStateAction<string | null>>;
  setActiveSectionMenu: Dispatch<SetStateAction<string | null>>;
  resetSectionModal: () => void;
  dispatchChartForm: Dispatch<any>;
};

export const useChartSave = ({
  readOnly,
  disabled,
  onSave,
  normalizedSavedCharts,
  normalizedSavedLayout,
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
}: UseChartSaveParams) => {
  const handleEnterEdit = () => {
    if (readOnly || disabled) return;
    setDraftCharts(normalizedSavedCharts);
    setDraftLayout(normalizedSavedLayout);
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
    setDraftLayout(normalizedSavedLayout);
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
    const sanitizedLayout = (draftLayout as ChartLayoutItem[]).map((item) => normalizeLayoutItem(item));
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

  return { handleEnterEdit, handleExitEdit, handleSaveChanges };
};
