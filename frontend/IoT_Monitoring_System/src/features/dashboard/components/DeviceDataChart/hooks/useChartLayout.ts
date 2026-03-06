import type { Dispatch, SetStateAction } from "react";
import { useCallback, useMemo, useRef } from "react";
import type { Layout, LayoutItem } from "react-grid-layout";
import type { ChartItem, ChartLayoutItem, ChartSection } from "../types/deviceDataChartTypes";
import {
  buildSectionAssignments,
  isSectionKey,
  mergeLayout,
  normalizeLayoutItem,
} from "../utils/deviceDataChartUtils";

type UseChartLayoutParams = {
  isEditing: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  draftSections: ChartSection[];
  viewSections: ChartSection[];
  draftCharts: ChartItem[];
  normalizedSavedCharts: ChartItem[];
  draftLayout: Layout;
  normalizedSavedLayout: Layout;
  draftAssignments: Record<string, string | null>;
  setDraftLayout: Dispatch<SetStateAction<Layout>>;
  setDraftAssignments: Dispatch<SetStateAction<Record<string, string | null>>>;
};

export const useChartLayout = ({
  isEditing,
  readOnly,
  disabled,
  draftSections,
  viewSections,
  draftCharts,
  normalizedSavedCharts,
  draftLayout,
  normalizedSavedLayout,
  draftAssignments,
  setDraftLayout,
  setDraftAssignments,
}: UseChartLayoutParams) => {
  const isUserInteraction = useRef(false);
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

  const handleLayoutChange = useCallback(
    (nextLayout: Layout) => {
      if (!isEditing || readOnly || disabled) return;
      if (!isUserInteraction.current) return;
      setDraftLayout((prev) => mergeLayout(prev, nextLayout));
    },
    [disabled, isEditing, readOnly, setDraftLayout]
  );

  const handleDragStart = useCallback(() => {
    if (!isEditing || readOnly || disabled) return;
    isUserInteraction.current = true;
  }, [disabled, isEditing, readOnly]);

  const handleDragStop = useCallback(
    (nextLayout: Layout, _oldItem: LayoutItem | null, newItem: LayoutItem | null) => {
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
    },
    [
      disabled,
      draftAssignments,
      draftSections,
      isEditing,
      readOnly,
      setDraftAssignments,
      setDraftLayout,
    ]
  );

  const handleResizeStart = useCallback(() => {
    if (!isEditing || readOnly || disabled) return;
    isUserInteraction.current = true;
  }, [disabled, isEditing, readOnly]);

  const handleResizeStop = useCallback(
    (nextLayout: Layout) => {
      if (!isEditing || readOnly || disabled) return;
      isUserInteraction.current = false;
      setDraftLayout((prev) => mergeLayout(prev, nextLayout));
    },
    [disabled, isEditing, readOnly, setDraftLayout]
  );

  return {
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
  };
};
