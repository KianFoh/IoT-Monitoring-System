import type { Dispatch, SetStateAction } from "react";
import type {
  BarOrientation,
  ChartItem,
  ChartType,
  DataFieldMetric,
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
  pieAllowedFields: string[];
  barAllowedFields: string[];
  selectedChartType: ChartType;
  selectedOutputType: "button";
  selectedOutputValueType: "boolean" | "multi";
  selectedOutputField: string;
  selectedOutputCase: string;
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
  selectedStatFontSize: string;
  editingChartId: string | null;
  editingChartType: ChartType | null;
  editingOutputId: string | null;
  editingOutputType: "button" | null;
  editName: string;
  editOutputName: string;
  editOutputField: string;
  editOutputCase: string;
  editField: string;
  editMin: string;
  editMax: string;
  editLineTicks: string;
  editLineDecimals: string;
  editStatFontSize: string;
  editLineListMode: LineListMode;
  selectedLineSmooth: boolean;
  editLineSmooth: boolean;
  editBarOrientation: BarOrientation;
  editBarRaceMode: boolean;
  editPieShowLabels: boolean;
  editOutputValueType: "boolean" | "multi";
  getChartType?: (field: string) => DataFieldType;
  getChartMetric?: (field: string) => DataFieldMetric | string;
  dispatchChartForm: Dispatch<any>;
  setDraftCharts: Dispatch<SetStateAction<ChartItem[]>>;
  setDraftLayout: Dispatch<SetStateAction<Layout>>;
  setActiveMenuId: Dispatch<SetStateAction<string | null>>;
};

export const useChartActions = ({
  readOnly,
  disabled,
  availableFields,
  pieAllowedFields,
  barAllowedFields,
  selectedChartType,
  selectedOutputType,
  selectedOutputValueType,
  selectedOutputField,
  selectedOutputCase,
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
  selectedStatFontSize,
  selectedLineSmooth,
  editingChartId,
  editingChartType,
  editingOutputId,
  editingOutputType,
  editName,
  editOutputName,
  editOutputField,
  editOutputCase,
  editField,
  editMin,
  editMax,
  editLineTicks,
  editLineDecimals,
  editStatFontSize,
  editLineListMode,
  editLineSmooth,
  editBarOrientation,
  editBarRaceMode,
  editPieShowLabels,
  editOutputValueType,
  getChartType,
  getChartMetric,
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

  const handleOpenAddOutput = () => {
    if (readOnly || disabled) return;
    dispatchChartForm({
      type: "open-add-output",
      payload: {
        defaultField: selectedOutputField || availableFields[0] || "",
      },
    });
  };

  const handleCloseAddOutput = () => {
    dispatchChartForm({ type: "close-add-output" });
  };

  const handleSelectLineField = (field: string) => {
    dispatchChartForm({ type: "set-selected-line-field", value: field });
  };

  const handleAddChart = () => {
    const isLineChart = selectedChartType === "line" || selectedChartType === "area";
    const isMeterChart = selectedChartType === "meter";
    const isWaterTankChart = selectedChartType === "water_tank";
    const isPieChart = selectedChartType === "pie";
    const isBarChart = selectedChartType === "bar";
    const isStatChart = selectedChartType === "stat";
    const barOrientation = selectedBarOrientation;
    const selectedLinePrimary = selectedLineFields[0] ?? "";
    const fieldValue = isLineChart ? selectedLinePrimary : selectedField;
    if (!fieldValue) return;
    if (isLineChart && selectedLineFields.length === 0) return;
    if (isPieChart && !pieAllowedFields.includes(fieldValue)) return;
    if (isBarChart && !barAllowedFields.includes(fieldValue)) return;
    const fieldType = getChartType?.(fieldValue) ?? null;
    const fieldMetric = getChartMetric?.(fieldValue) ?? null;
    if (isWaterTankChart && fieldType !== "text") return;
    const isLineTextCount = isLineChart && fieldType === "text" && fieldMetric === "count";
    const isLineBooleanCount =
      isLineChart && fieldType === "boolean" && fieldMetric === "count";
    const isWaterTankNumeric =
      isWaterTankChart && fieldType !== "text" && fieldType !== "list" && fieldType !== "boolean";
    const id = `chart-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const nextLayout = {
      i: id,
      x: 0,
      y: 0,
      w: DEFAULT_PANEL_SIZE.w,
      h: DEFAULT_PANEL_SIZE.h,
    };
    const meterMin =
      isMeterChart || isWaterTankNumeric
        ? parseOptionalNumber(selectedMin)
        : undefined;
    const meterMax =
      isMeterChart || isWaterTankNumeric
        ? parseOptionalNumber(selectedMax)
        : undefined;
    const isLineText = isLineChart && selectedLineFieldType === "text";
    const isLineCategoricalText = isLineText && !isLineTextCount;
    const lineMin =
      isLineChart && !isLineCategoricalText ? parseOptionalNumber(selectedLineMin) : undefined;
    const lineMax =
      isLineChart && !isLineCategoricalText ? parseOptionalNumber(selectedLineMax) : undefined;
    const tickCount =
      isLineChart || isMeterChart || isWaterTankNumeric
        ? isLineCategoricalText
          ? undefined
          : parseOptionalInteger(selectedLineTicks, 2)
        : undefined;
    const valueDecimals =
      isLineChart || isMeterChart || isWaterTankNumeric
        ? isLineCategoricalText
          ? undefined
          : parseOptionalInteger(selectedLineDecimals, 0)
        : undefined;
    const parsedStatFontSize = isStatChart ? parseOptionalInteger(selectedStatFontSize) : undefined;
    const statFontSize =
      typeof parsedStatFontSize === "number" && parsedStatFontSize > 0
        ? parsedStatFontSize
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
        ...(isMeterChart || isWaterTankNumeric
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
              line_smooth: selectedLineSmooth,
              fields: selectedLineFields.length ? [selectedLineFields[0]] : [],
              ...(selectedLineFieldType === "list" || isLineTextCount || isLineBooleanCount
                ? { line_list_mode: selectedLineListMode }
                : {}),
            }
          : {}),
        ...(isStatChart ? { stat_font_size: statFontSize } : {}),
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

  const handleAddOutput = () => {
    if (readOnly || disabled) return;
    if (!selectedOutputField) return;
    const outputFieldType = getChartType?.(selectedOutputField) ?? null;
    const requiresCase = outputFieldType === "text" || outputFieldType === "list";
    const outputCase = selectedOutputCase.trim();
    if (requiresCase && !outputCase) return;
    const id = `chart-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const nextLayout = {
      i: id,
      x: 0,
      y: 0,
      w: DEFAULT_PANEL_SIZE.w,
      h: DEFAULT_PANEL_SIZE.h,
    };
    const outputType = selectedOutputType || "button";
    setDraftCharts((prev) => [
      ...prev,
      {
        id,
        type: outputType,
        field: selectedOutputField,
        name: "Output",
        output_value_type: selectedOutputValueType,
        ...(requiresCase && outputCase ? { value_cases: [outputCase] } : {}),
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
    dispatchChartForm({ type: "close-add-output" });
  };

  const handleOpenEdit = (chart: ChartItem) => {
    if (readOnly || disabled) return;
    if (chart.type === "button") {
      dispatchChartForm({ type: "open-edit-output", payload: { chart } });
    } else {
      dispatchChartForm({ type: "open-edit", payload: { chart } });
    }
    setActiveMenuId(null);
  };

  const handleCloseEdit = () => {
    dispatchChartForm({ type: "close-edit" });
  };

  const handleCloseEditOutput = () => {
    dispatchChartForm({ type: "close-edit-output" });
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
    const isWaterTankChart = editingChartType === "water_tank";
    const isPieChart = editingChartType === "pie";
    const isBarChart = editingChartType === "bar";
    const isStatChart = editingChartType === "stat";
    const barOrientation = editBarOrientation;
    const fieldType =
      editingChartType === "button" ? null : getChartType?.(field) ?? null;
    const fieldMetric =
      editingChartType === "button" ? null : getChartMetric?.(field) ?? null;
    if (isWaterTankChart && fieldType !== "text") return;
    if (isPieChart && !pieAllowedFields.includes(field)) return;
    if (isBarChart && !barAllowedFields.includes(field)) return;
    const isLineTextCount = isLineChart && fieldType === "text" && fieldMetric === "count";
    const isLineBooleanCount = isLineChart && fieldType === "boolean" && fieldMetric === "count";
    const isLineText = isLineChart && fieldType === "text";
    const isLineCategoricalText = isLineText && !isLineTextCount;
    const isWaterTankNumeric =
      isWaterTankChart && fieldType !== "text" && fieldType !== "list" && fieldType !== "boolean";
    const min =
      isLineChart || isMeterChart || isWaterTankNumeric
        ? isLineCategoricalText
          ? undefined
          : parseOptionalNumber(editMin)
        : undefined;
    const max =
      isLineChart || isMeterChart || isWaterTankNumeric
        ? isLineCategoricalText
          ? undefined
          : parseOptionalNumber(editMax)
        : undefined;
    const tickCount =
      isLineChart || isMeterChart || isWaterTankNumeric
        ? isLineCategoricalText
          ? undefined
          : parseOptionalInteger(editLineTicks, 2)
        : undefined;
    const valueDecimals =
      isLineChart || isMeterChart || isWaterTankNumeric
        ? isLineCategoricalText
          ? undefined
          : parseOptionalInteger(editLineDecimals, 0)
        : undefined;
    const parsedStatFontSize = isStatChart ? parseOptionalInteger(editStatFontSize) : undefined;
    const statFontSize =
      typeof parsedStatFontSize === "number" && parsedStatFontSize > 0
        ? parsedStatFontSize
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
              ...(isLineChart || isMeterChart || isWaterTankChart
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
                    line_list_mode:
                      fieldType === "list" || isLineTextCount || isLineBooleanCount
                        ? editLineListMode
                        : undefined,
                    line_smooth: editLineSmooth,
                  }
                : {}),
              ...(isStatChart ? { stat_font_size: statFontSize } : {}),
            }
          : chart
      )
    );
    dispatchChartForm({ type: "close-edit" });
  };

  const handleSaveEditOutput = () => {
    if (!editingOutputId) return;
    const name = editOutputName.trim() || "Output";
    const outputValueType =
      editingOutputType === "button" ? "boolean" : editOutputValueType;
    if (!editOutputField) return;
    const outputFieldType = getChartType?.(editOutputField) ?? null;
    const requiresCase = outputFieldType === "text" || outputFieldType === "list";
    const outputCase = editOutputCase.trim();
    if (requiresCase && !outputCase) return;
    const nextCases = requiresCase && outputCase ? [outputCase] : undefined;
    setDraftCharts((prev) =>
      prev.map((chart) =>
        chart.id === editingOutputId
          ? {
              ...chart,
              name,
              field: editOutputField,
              output_value_type: outputValueType,
              value_cases: nextCases,
            }
          : chart
      )
    );
    dispatchChartForm({ type: "close-edit-output" });
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
    handleOpenAddOutput,
    handleCloseAddOutput,
    handleSelectLineField,
    handleAddChart,
    handleAddOutput,
    handleOpenEdit,
    handleCloseEdit,
    handleCloseEditOutput,
    handleOpenFilter,
    handleCloseFilter,
    handleSaveEdit,
    handleSaveEditOutput,
    handleRemoveChart,
  };
};
