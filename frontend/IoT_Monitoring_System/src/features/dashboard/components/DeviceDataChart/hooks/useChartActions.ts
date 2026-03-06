import type { Dispatch, SetStateAction } from "react";
import type {
  BarOrientation,
  ChartItem,
  ChartType,
  DataFieldType,
  LineListMode,
} from "../types/deviceDataChartTypes";
import { DEFAULT_PANEL_SIZE } from "../utils/deviceDataChartConstants";
import {
  getNextPosition,
  isSectionKey,
  parseOptionalInteger,
  parseOptionalNumber,
} from "../utils/deviceDataChartUtils";
import type { Layout } from "react-grid-layout";

type UseChartActionsParams = {
  readOnly?: boolean;
  disabled?: boolean;
  availableFields: string[];
  listAllowedFields: string[];
  selectedChartType: ChartType;
  selectedField: string;
  selectedLineFields: string[];
  selectedLineFieldType: DataFieldType | null;
  selectedLineListMode: LineListMode;
  selectedBarOrientation: BarOrientation;
  selectedBarRaceMode: boolean;
  selectedPieShowLabels: boolean;
  selectedMin: string;
  selectedMax: string;
  selectedLineMin: string;
  selectedLineMax: string;
  selectedLineTicks: string;
  selectedLineDecimals: string;
  editingChartId: string | null;
  editingChartType: ChartType | null;
  editName: string;
  editField: string;
  editMin: string;
  editMax: string;
  editLineTicks: string;
  editLineDecimals: string;
  editLineListMode: LineListMode;
  editBarOrientation: BarOrientation;
  editBarRaceMode: boolean;
  editPieShowLabels: boolean;
  getChartType?: (field: string) => DataFieldType;
  dispatchChartForm: Dispatch<any>;
  setDraftCharts: Dispatch<SetStateAction<ChartItem[]>>;
  setDraftLayout: Dispatch<SetStateAction<Layout>>;
  setActiveMenuId: Dispatch<SetStateAction<string | null>>;
};

export const useChartActions = ({
  readOnly,
  disabled,
  availableFields,
  listAllowedFields,
  selectedChartType,
  selectedField,
  selectedLineFields,
  selectedLineFieldType,
  selectedLineListMode,
  selectedBarOrientation,
  selectedBarRaceMode,
  selectedPieShowLabels,
  selectedMin,
  selectedMax,
  selectedLineMin,
  selectedLineMax,
  selectedLineTicks,
  selectedLineDecimals,
  editingChartId,
  editingChartType,
  editName,
  editField,
  editMin,
  editMax,
  editLineTicks,
  editLineDecimals,
  editLineListMode,
  editBarOrientation,
  editBarRaceMode,
  editPieShowLabels,
  getChartType,
  dispatchChartForm,
  setDraftCharts,
  setDraftLayout,
  setActiveMenuId,
}: UseChartActionsParams) => {
  const handleOpenAdd = () => {
    if (readOnly || disabled) return;
    dispatchChartForm({
      type: "open-add",
      payload: {
        defaultField: selectedField || availableFields[0] || "",
      },
    });
  };

  const handleCloseAdd = () => {
    dispatchChartForm({ type: "close-add" });
  };

  const handleSelectLineField = (field: string) => {
    dispatchChartForm({ type: "set-selected-line-field", value: field });
  };

  const handleAddChart = () => {
    const isLineChart = selectedChartType === "line" || selectedChartType === "area";
    const isMeterChart = selectedChartType === "meter";
    const isPieChart = selectedChartType === "pie";
    const isBarChart = selectedChartType === "bar";
    const barOrientation = selectedBarRaceMode ? "horizontal" : selectedBarOrientation;
    const selectedLinePrimary = selectedLineFields[0] ?? "";
    const fieldValue = isLineChart ? selectedLinePrimary : selectedField;
    if (!fieldValue) return;
    if (isLineChart && selectedLineFields.length === 0) return;
    if (isPieChart && !listAllowedFields.includes(fieldValue)) return;
    if (isBarChart && !listAllowedFields.includes(fieldValue)) return;
    const id = `chart-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const nextLayout = {
      i: id,
      x: 0,
      y: 0,
      w: DEFAULT_PANEL_SIZE.w,
      h: DEFAULT_PANEL_SIZE.h,
    };
    const meterMin = isMeterChart ? parseOptionalNumber(selectedMin) : undefined;
    const meterMax = isMeterChart ? parseOptionalNumber(selectedMax) : undefined;
    const isLineText = isLineChart && selectedLineFieldType === "text";
    const lineMin = isLineChart && !isLineText ? parseOptionalNumber(selectedLineMin) : undefined;
    const lineMax = isLineChart && !isLineText ? parseOptionalNumber(selectedLineMax) : undefined;
    const tickCount =
      isLineChart || isMeterChart
        ? isLineText
          ? undefined
          : parseOptionalInteger(selectedLineTicks, 2)
        : undefined;
    const valueDecimals =
      isLineChart || isMeterChart
        ? isLineText
          ? undefined
          : parseOptionalInteger(selectedLineDecimals, 0)
        : undefined;
    setDraftCharts((prev) => [
      ...prev,
      {
        id,
        type: selectedChartType,
        field: fieldValue,
        name: "New panel",
        ...(isBarChart
          ? { bar_orientation: barOrientation, bar_race_mode: selectedBarRaceMode }
          : {}),
        ...(isPieChart ? { pie_show_labels: selectedPieShowLabels } : {}),
        ...(isMeterChart
          ? {
              min: meterMin,
              max: meterMax,
              tick_count: tickCount,
              value_decimals: valueDecimals,
            }
          : {}),
        ...(isLineChart
          ? {
              min: lineMin,
              max: lineMax,
              tick_count: tickCount,
              value_decimals: valueDecimals,
              fields: selectedLineFields.length ? [selectedLineFields[0]] : [],
              ...(selectedLineFieldType === "list"
                ? { line_list_mode: selectedLineListMode }
                : {}),
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
    const isLineChart = editingChartType === "line" || editingChartType === "area";
    const isMeterChart = editingChartType === "meter";
    const isPieChart = editingChartType === "pie";
    const isBarChart = editingChartType === "bar";
    const barOrientation = editBarRaceMode ? "horizontal" : editBarOrientation;
    const fieldType = getChartType?.(field) ?? null;
    const isLineText = isLineChart && fieldType === "text";
    const min =
      isLineChart || isMeterChart
        ? isLineText
          ? undefined
          : parseOptionalNumber(editMin)
        : undefined;
    const max =
      isLineChart || isMeterChart
        ? isLineText
          ? undefined
          : parseOptionalNumber(editMax)
        : undefined;
    const tickCount =
      isLineChart || isMeterChart
        ? isLineText
          ? undefined
          : parseOptionalInteger(editLineTicks, 2)
        : undefined;
    const valueDecimals =
      isLineChart || isMeterChart
        ? isLineText
          ? undefined
          : parseOptionalInteger(editLineDecimals, 0)
        : undefined;
    setDraftCharts((prev) =>
      prev.map((chart) =>
        chart.id === editingChartId
          ? {
              ...chart,
              name,
              field: field || chart.field,
              ...(isBarChart
                ? { bar_orientation: barOrientation, bar_race_mode: editBarRaceMode }
                : {}),
              ...(isPieChart ? { pie_show_labels: editPieShowLabels } : {}),
              ...(isLineChart || isMeterChart
                ? {
                    min,
                    max,
                    tick_count: tickCount,
                    value_decimals: valueDecimals,
                  }
                : {}),
              ...(isLineChart
                ? {
                    fields: field ? [field] : [],
                    line_list_mode: fieldType === "list" ? editLineListMode : undefined,
                  }
                : {}),
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

  return {
    handleOpenAdd,
    handleCloseAdd,
    handleSelectLineField,
    handleAddChart,
    handleOpenEdit,
    handleCloseEdit,
    handleOpenFilter,
    handleCloseFilter,
    handleSaveEdit,
    handleRemoveChart,
  };
};
