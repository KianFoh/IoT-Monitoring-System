import { useCallback, useState } from "react";
import type { ChartItem, ChartType, LineGranularity } from "./deviceDataChartTypes";

export type ChartFormState = {
  isAddOpen: boolean;
  isEditOpen: boolean;
  isFilterOpen: boolean;
  selectedChartType: ChartType;
  selectedField: string;
  selectedMin: string;
  selectedMax: string;
  selectedLineFields: string[];
  selectedLineMin: string;
  selectedLineMax: string;
  timeGranularity: LineGranularity;
  timeStart: string;
  timeEnd: string;
  editingChartId: string | null;
  editingChartType: ChartType | null;
  editName: string;
  editField: string;
  editMin: string;
  editMax: string;
};

type ChartFormAction =
  | { type: "open-add"; payload: { defaultField: string; defaultLineFields: string[] } }
  | { type: "close-add" }
  | { type: "open-edit"; payload: { chart: ChartItem } }
  | { type: "close-edit" }
  | { type: "open-filter" }
  | { type: "close-filter" }
  | { type: "set-selected-chart-type"; value: ChartType }
  | { type: "set-selected-field"; value: string }
  | { type: "set-selected-min"; value: string }
  | { type: "set-selected-max"; value: string }
  | { type: "set-selected-line-fields"; value: string[] }
  | { type: "set-selected-line-min"; value: string }
  | { type: "set-selected-line-max"; value: string }
  | { type: "set-time-granularity"; value: LineGranularity }
  | { type: "set-time-start"; value: string }
  | { type: "set-time-end"; value: string }
  | { type: "set-edit-name"; value: string }
  | { type: "set-edit-field"; value: string }
  | { type: "set-edit-min"; value: string }
  | { type: "set-edit-max"; value: string }
  | { type: "reset-editing-ui" };

export const INITIAL_CHART_FORM_STATE: ChartFormState = {
  isAddOpen: false,
  isEditOpen: false,
  isFilterOpen: false,
  selectedChartType: "meter",
  selectedField: "",
  selectedMin: "",
  selectedMax: "",
  selectedLineFields: [],
  selectedLineMin: "",
  selectedLineMax: "",
  timeGranularity: "day",
  timeStart: "",
  timeEnd: "",
  editingChartId: null,
  editingChartType: null,
  editName: "",
  editField: "",
  editMin: "",
  editMax: "",
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
        selectedMin: "",
        selectedMax: "",
        selectedLineMin: "",
        selectedLineMax: "",
        selectedLineFields: action.payload.defaultLineFields,
        selectedField: action.payload.defaultField || state.selectedField,
      };
    case "close-add":
      return {
        ...state,
        isAddOpen: false,
        selectedMin: "",
        selectedMax: "",
        selectedLineMin: "",
        selectedLineMax: "",
        selectedLineFields: [],
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
      };
    case "close-edit":
      return {
        ...state,
        isEditOpen: false,
        editingChartId: null,
        editingChartType: null,
        editMin: "",
        editMax: "",
      };
    case "open-filter":
      return { ...state, isFilterOpen: true };
    case "close-filter":
      return { ...state, isFilterOpen: false };
    case "set-selected-chart-type":
      return { ...state, selectedChartType: action.value };
    case "set-selected-field":
      return { ...state, selectedField: action.value };
    case "set-selected-min":
      return { ...state, selectedMin: action.value };
    case "set-selected-max":
      return { ...state, selectedMax: action.value };
    case "set-selected-line-fields":
      return { ...state, selectedLineFields: action.value };
    case "set-selected-line-min":
      return { ...state, selectedLineMin: action.value };
    case "set-selected-line-max":
      return { ...state, selectedLineMax: action.value };
    case "set-time-granularity":
      return { ...state, timeGranularity: action.value };
    case "set-time-start":
      return { ...state, timeStart: action.value };
    case "set-time-end":
      return { ...state, timeEnd: action.value };
    case "set-edit-name":
      return { ...state, editName: action.value };
    case "set-edit-field":
      return { ...state, editField: action.value };
    case "set-edit-min":
      return { ...state, editMin: action.value };
    case "set-edit-max":
      return { ...state, editMax: action.value };
    case "reset-editing-ui":
      return {
        ...state,
        isAddOpen: false,
        isEditOpen: false,
        isFilterOpen: false,
        editingChartId: null,
        editingChartType: null,
        editMin: "",
        editMax: "",
        selectedMin: "",
        selectedMax: "",
        selectedLineMin: "",
        selectedLineMax: "",
        selectedLineFields: [],
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
