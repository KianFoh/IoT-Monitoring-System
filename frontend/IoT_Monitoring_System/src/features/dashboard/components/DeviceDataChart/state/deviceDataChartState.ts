import { useCallback, useState } from "react";
import type {
  BarOrientation,
  ChartFilterMode,
  ChartItem,
  ChartRangePreset,
  ChartType,
  LineListMode,
  LineGranularity,
} from "../types/deviceDataChartTypes";
export type ChartFormState = {
  isAddOpen: boolean;
  isAddOutputOpen: boolean;
  isEditOutputOpen: boolean;
  isEditOpen: boolean;
  isFilterOpen: boolean;
  filterMode: ChartFilterMode;
  rangePreset: ChartRangePreset;
  selectedChartType: ChartType;
  selectedOutputType: "button";
  selectedOutputValueType: "boolean" | "multi";
  selectedOutputField: string;
  selectedOutputCase: string;
  selectedField: string;
  selectedMin: string;
  selectedMax: string;
  selectedLineFields: string[];
  selectedLineMin: string;
  selectedLineMax: string;
  selectedLineTicks: string;
  selectedLineDecimals: string;
  selectedStatFontSize: string;
  selectedLineListMode: LineListMode;
  selectedBarOrientation: BarOrientation;
  selectedBarRaceMode: boolean;
  selectedPieShowLabels: boolean;
  timeGranularity: LineGranularity;
  timeStart: string;
  timeEnd: string;
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
  editBarOrientation: BarOrientation;
  editBarRaceMode: boolean;
  editPieShowLabels: boolean;
  editOutputValueType: "boolean" | "multi";
};

type ChartFormAction =
  | { type: "open-add"; payload: { defaultField: string } }
  | { type: "close-add" }
  | { type: "open-add-output"; payload: { defaultField: string } }
  | { type: "close-add-output" }
  | { type: "open-edit"; payload: { chart: ChartItem } }
  | { type: "close-edit" }
  | { type: "open-edit-output"; payload: { chart: ChartItem } }
  | { type: "close-edit-output" }
  | { type: "open-filter" }
  | { type: "close-filter" }
  | { type: "set-filter-mode"; value: ChartFilterMode }
  | { type: "set-range-preset"; value: ChartRangePreset }
  | { type: "set-selected-chart-type"; value: ChartType }
  | { type: "set-selected-output-type"; value: "button" }
  | { type: "set-selected-output-value-type"; value: "boolean" | "multi" }
  | { type: "set-selected-output-field"; value: string }
  | { type: "set-selected-output-case"; value: string }
  | { type: "set-selected-field"; value: string }
  | { type: "set-selected-min"; value: string }
  | { type: "set-selected-max"; value: string }
  | { type: "set-selected-line-field"; value: string }
  | { type: "set-selected-line-min"; value: string }
  | { type: "set-selected-line-max"; value: string }
  | { type: "set-selected-line-ticks"; value: string }
  | { type: "set-selected-line-decimals"; value: string }
  | { type: "set-selected-stat-font-size"; value: string }
  | { type: "set-selected-line-list-mode"; value: LineListMode }
  | { type: "set-selected-bar-orientation"; value: BarOrientation }
  | { type: "set-selected-bar-race-mode"; value: boolean }
  | { type: "set-selected-pie-show-labels"; value: boolean }
  | { type: "set-time-granularity"; value: LineGranularity }
  | { type: "set-time-start"; value: string }
  | { type: "set-time-end"; value: string }
  | { type: "set-edit-name"; value: string }
  | { type: "set-edit-output-name"; value: string }
  | { type: "set-edit-output-field"; value: string }
  | { type: "set-edit-output-case"; value: string }
  | { type: "set-edit-field"; value: string }
  | { type: "set-edit-min"; value: string }
  | { type: "set-edit-max"; value: string }
  | { type: "set-edit-line-ticks"; value: string }
  | { type: "set-edit-line-decimals"; value: string }
  | { type: "set-edit-stat-font-size"; value: string }
  | { type: "set-edit-line-list-mode"; value: LineListMode }
  | { type: "set-edit-bar-orientation"; value: BarOrientation }
  | { type: "set-edit-bar-race-mode"; value: boolean }
  | { type: "set-edit-pie-show-labels"; value: boolean }
  | { type: "set-edit-output-value-type"; value: "boolean" | "multi" }
  | { type: "reset-editing-ui" };

export const INITIAL_CHART_FORM_STATE: ChartFormState = {
  isAddOpen: false,
  isAddOutputOpen: false,
  isEditOutputOpen: false,
  isEditOpen: false,
  isFilterOpen: false,
  filterMode: "raw",
  rangePreset: "last_1_hour",
  selectedChartType: "meter",
  selectedOutputType: "button",
  selectedOutputValueType: "boolean",
  selectedOutputField: "",
  selectedOutputCase: "",
  selectedField: "",
  selectedMin: "",
  selectedMax: "",
  selectedLineFields: [],
  selectedLineMin: "",
  selectedLineMax: "",
  selectedLineTicks: "",
  selectedLineDecimals: "",
  selectedStatFontSize: "",
  selectedLineListMode: "single",
  selectedBarOrientation: "horizontal",
  selectedBarRaceMode: false,
  selectedPieShowLabels: true,
  timeGranularity: "day",
  timeStart: "",
  timeEnd: "",
  editingChartId: null,
  editingChartType: null,
  editingOutputId: null,
  editingOutputType: null,
  editName: "",
  editOutputName: "",
  editOutputField: "",
  editOutputCase: "",
  editField: "",
  editMin: "",
  editMax: "",
  editLineTicks: "",
  editLineDecimals: "",
  editStatFontSize: "",
  editLineListMode: "single",
  editBarOrientation: "horizontal",
  editBarRaceMode: false,
  editPieShowLabels: true,
  editOutputValueType: "boolean",
};

export const chartFormReducer = (
  state: ChartFormState,
  action: ChartFormAction
): ChartFormState => {
  switch (action.type) {
    case "open-add":
      return {
        ...state,
        isAddOpen: true,
        selectedBarRaceMode: false,
        selectedPieShowLabels: true,
        selectedMin: "",
        selectedMax: "",
        selectedLineMin: "",
        selectedLineMax: "",
        selectedLineTicks: "",
        selectedLineDecimals: "",
        selectedStatFontSize: "",
        selectedLineListMode: "single",
        selectedLineFields: action.payload.defaultField ? [action.payload.defaultField] : [],
        selectedField: action.payload.defaultField || state.selectedField,
      };
    case "close-add":
      return {
        ...state,
        isAddOpen: false,
        selectedBarRaceMode: false,
        selectedPieShowLabels: true,
        selectedMin: "",
        selectedMax: "",
        selectedLineMin: "",
        selectedLineMax: "",
        selectedLineTicks: "",
        selectedLineDecimals: "",
        selectedStatFontSize: "",
        selectedLineFields: [],
        selectedLineListMode: "single",
      };
    case "open-add-output":
      return {
        ...state,
        isAddOutputOpen: true,
        selectedOutputType: "button",
        selectedOutputValueType: "boolean",
        selectedOutputField: action.payload.defaultField || state.selectedOutputField,
        selectedOutputCase: "",
      };
    case "close-add-output":
      return {
        ...state,
        isAddOutputOpen: false,
      };
    case "open-edit":
      return {
        ...state,
        isEditOpen: true,
        editingChartId: action.payload.chart.id,
        editingChartType: action.payload.chart.type,
        editName: action.payload.chart.name.trim() || "New panel",
        editField: action.payload.chart.fields?.[0] ?? action.payload.chart.field,
        editMin: typeof action.payload.chart.min === "number" ? String(action.payload.chart.min) : "",
        editMax: typeof action.payload.chart.max === "number" ? String(action.payload.chart.max) : "",
        editLineTicks:
          typeof action.payload.chart.tick_count === "number"
            ? String(action.payload.chart.tick_count)
            : "",
        editLineDecimals:
          typeof action.payload.chart.value_decimals === "number"
            ? String(action.payload.chart.value_decimals)
            : "",
        editStatFontSize:
          typeof action.payload.chart.stat_font_size === "number"
            ? String(action.payload.chart.stat_font_size)
            : "",
        editLineListMode:
          action.payload.chart.line_list_mode === "multi" ? "multi" : "single",
        editBarOrientation:
          action.payload.chart.bar_orientation ??
          (action.payload.chart.type === "bar" ? "horizontal" : state.editBarOrientation),
        editBarRaceMode: Boolean(action.payload.chart.bar_race_mode),
        editPieShowLabels: action.payload.chart.pie_show_labels !== false,
      };
    case "close-edit":
      return {
        ...state,
        isEditOpen: false,
        editingChartId: null,
        editingChartType: null,
        editMin: "",
        editMax: "",
        editLineTicks: "",
        editLineDecimals: "",
        editStatFontSize: "",
        editLineListMode: "single",
        editBarOrientation: "horizontal",
        editBarRaceMode: false,
        editPieShowLabels: true,
      };
    case "open-edit-output":
      return {
        ...state,
        isEditOutputOpen: true,
        editingOutputId: action.payload.chart.id,
        editingOutputType: action.payload.chart.type === "button" ? "button" : null,
        editOutputName: action.payload.chart.name.trim() || "Output",
        editOutputField:
          action.payload.chart.fields?.[0] ?? action.payload.chart.field ?? "",
        editOutputCase: action.payload.chart.value_cases?.[0] ?? "",
        editOutputValueType:
          action.payload.chart.output_value_type === "multi" ? "multi" : "boolean",
      };
    case "close-edit-output":
      return {
        ...state,
        isEditOutputOpen: false,
        editingOutputId: null,
        editingOutputType: null,
        editOutputName: "",
        editOutputField: "",
        editOutputCase: "",
        editOutputValueType: "boolean",
      };
    case "open-filter":
      return { ...state, isFilterOpen: true };
    case "close-filter":
      return { ...state, isFilterOpen: false };
    case "set-filter-mode":
      return { ...state, filterMode: action.value };
    case "set-range-preset":
      return { ...state, rangePreset: action.value };
    case "set-selected-chart-type":
      return { ...state, selectedChartType: action.value };
    case "set-selected-output-type":
      return { ...state, selectedOutputType: action.value };
    case "set-selected-output-value-type":
      return { ...state, selectedOutputValueType: action.value };
    case "set-selected-output-field":
      return { ...state, selectedOutputField: action.value };
    case "set-selected-output-case":
      return { ...state, selectedOutputCase: action.value };
    case "set-selected-field":
      return { ...state, selectedField: action.value };
    case "set-selected-min":
      return { ...state, selectedMin: action.value };
    case "set-selected-max":
      return { ...state, selectedMax: action.value };
    case "set-selected-line-field":
      return { ...state, selectedLineFields: action.value ? [action.value] : [] };
    case "set-selected-line-min":
      return { ...state, selectedLineMin: action.value };
    case "set-selected-line-max":
      return { ...state, selectedLineMax: action.value };
    case "set-selected-line-ticks":
      return { ...state, selectedLineTicks: action.value };
    case "set-selected-line-decimals":
      return { ...state, selectedLineDecimals: action.value };
    case "set-selected-stat-font-size":
      return { ...state, selectedStatFontSize: action.value };
    case "set-selected-line-list-mode":
      return { ...state, selectedLineListMode: action.value };
    case "set-selected-bar-orientation":
      return { ...state, selectedBarOrientation: action.value };
    case "set-selected-bar-race-mode":
      return { ...state, selectedBarRaceMode: action.value };
    case "set-selected-pie-show-labels":
      return { ...state, selectedPieShowLabels: action.value };
    case "set-time-granularity":
      return { ...state, timeGranularity: action.value, timeStart: "", timeEnd: "" };
    case "set-time-start":
      return { ...state, timeStart: action.value };
    case "set-time-end":
      return { ...state, timeEnd: action.value };
    case "set-edit-name":
      return { ...state, editName: action.value };
    case "set-edit-output-name":
      return { ...state, editOutputName: action.value };
    case "set-edit-output-field":
      return { ...state, editOutputField: action.value };
    case "set-edit-output-case":
      return { ...state, editOutputCase: action.value };
    case "set-edit-field":
      return { ...state, editField: action.value };
    case "set-edit-min":
      return { ...state, editMin: action.value };
    case "set-edit-max":
      return { ...state, editMax: action.value };
    case "set-edit-line-ticks":
      return { ...state, editLineTicks: action.value };
    case "set-edit-line-decimals":
      return { ...state, editLineDecimals: action.value };
    case "set-edit-stat-font-size":
      return { ...state, editStatFontSize: action.value };
    case "set-edit-line-list-mode":
      return { ...state, editLineListMode: action.value };
    case "set-edit-bar-orientation":
      return { ...state, editBarOrientation: action.value };
    case "set-edit-bar-race-mode":
      return { ...state, editBarRaceMode: action.value };
    case "set-edit-pie-show-labels":
      return { ...state, editPieShowLabels: action.value };
    case "set-edit-output-value-type":
      return { ...state, editOutputValueType: action.value };
    case "reset-editing-ui":
      return {
        ...state,
        isAddOpen: false,
        isAddOutputOpen: false,
        isEditOutputOpen: false,
        isEditOpen: false,
        isFilterOpen: false,
        editingChartId: null,
        editingChartType: null,
        editingOutputId: null,
        editingOutputType: null,
        editMin: "",
        editMax: "",
        editLineTicks: "",
        editLineDecimals: "",
        editStatFontSize: "",
        editLineListMode: "single",
        editBarOrientation: "horizontal",
        editBarRaceMode: false,
        editPieShowLabels: true,
        editOutputName: "",
        editOutputField: "",
        editOutputCase: "",
        editOutputValueType: "boolean",
        selectedMin: "",
        selectedMax: "",
        selectedLineMin: "",
        selectedLineMax: "",
        selectedLineTicks: "",
        selectedLineDecimals: "",
        selectedStatFontSize: "",
        selectedLineFields: [],
        selectedLineListMode: "single",
        selectedOutputField: "",
        selectedOutputCase: "",
        selectedBarOrientation: "horizontal",
        selectedBarRaceMode: false,
        selectedPieShowLabels: true,
      };
    default:
      return state;
  }
};

export type SectionModalState = {
  isOpen: boolean;
  name: string;
  error: string | null;
  editingId: string | null;
};

const INITIAL_SECTION_MODAL_STATE: SectionModalState = {
  isOpen: false,
  name: "",
  error: null,
  editingId: null,
};

export const useSectionModalState = () => {
  const [state, setState] = useState<SectionModalState>(INITIAL_SECTION_MODAL_STATE);

  const openAdd = useCallback(
    () =>
      setState({
        isOpen: true,
        name: "",
        error: null,
        editingId: null,
      }),
    []
  );
  const openRename = useCallback(
    (section: { id: string; name: string }) =>
      setState({
        isOpen: true,
        name: section.name,
        error: null,
        editingId: section.id,
      }),
    []
  );
  const close = useCallback(() => setState(INITIAL_SECTION_MODAL_STATE), []);
  const setName = useCallback((name: string) => setState((prev) => ({ ...prev, name })), []);
  const setError = useCallback(
    (error: string | null) => setState((prev) => ({ ...prev, error })),
    []
  );
  const reset = useCallback(() => setState(INITIAL_SECTION_MODAL_STATE), []);

  return {
    state,
    openAdd,
    openRename,
    close,
    setName,
    setError,
    reset,
  };
};
