import { useEffect, useMemo } from "react";
import type { ChartFormState } from "../state/deviceDataChartState";
import type { ChartFilterMode, DataFieldType } from "../types/deviceDataChartTypes";
import { normalizeCaseList } from "../utils/deviceChartHelpers";

type UseChartFormControlsParams = {
  chartForm: ChartFormState;
  dispatchChartForm: React.Dispatch<any>;
  availableFields: string[];
  meterAllowedFields: string[];
  listAllowedFields: string[];
  getChartType?: (field: string) => DataFieldType;
  getChartCases?: (field: string) => string[] | null | undefined;
  disabled?: boolean;
  readOnly?: boolean;
  onFilterModeChange?: (value: ChartFilterMode) => void;
};

export const useChartFormControls = ({
  chartForm,
  dispatchChartForm,
  availableFields,
  meterAllowedFields,
  listAllowedFields,
  getChartType,
  getChartCases,
  disabled,
  readOnly,
  onFilterModeChange,
}: UseChartFormControlsParams) => {
  const {
    selectedChartType,
    selectedField,
    selectedLineFields,
    selectedOutputField,
    selectedOutputCase,
    editingChartType,
    editField,
    isEditOpen,
    isEditOutputOpen,
    editOutputField,
    editOutputCase,
  } = chartForm;

  const setSelectedChartType = (value: ChartFormState["selectedChartType"]) =>
    dispatchChartForm({ type: "set-selected-chart-type", value });
  const setSelectedOutputType = (value: ChartFormState["selectedOutputType"]) =>
    dispatchChartForm({ type: "set-selected-output-type", value });
  const setSelectedOutputValueType = (value: ChartFormState["selectedOutputValueType"]) =>
    dispatchChartForm({ type: "set-selected-output-value-type", value });
  const setSelectedOutputField = (value: string) =>
    dispatchChartForm({ type: "set-selected-output-field", value });
  const setSelectedOutputCase = (value: string) =>
    dispatchChartForm({ type: "set-selected-output-case", value });
  const setSelectedField = (value: string) =>
    dispatchChartForm({ type: "set-selected-field", value });
  const setSelectedMin = (value: string) =>
    dispatchChartForm({ type: "set-selected-min", value });
  const setSelectedMax = (value: string) =>
    dispatchChartForm({ type: "set-selected-max", value });
  const setSelectedLineMin = (value: string) =>
    dispatchChartForm({ type: "set-selected-line-min", value });
  const setSelectedLineMax = (value: string) =>
    dispatchChartForm({ type: "set-selected-line-max", value });
  const setSelectedLineTicks = (value: string) =>
    dispatchChartForm({ type: "set-selected-line-ticks", value });
  const setSelectedLineDecimals = (value: string) =>
    dispatchChartForm({ type: "set-selected-line-decimals", value });
  const setSelectedStatFontSize = (value: string) =>
    dispatchChartForm({ type: "set-selected-stat-font-size", value });
  const setSelectedLineListMode = (value: ChartFormState["selectedLineListMode"]) =>
    dispatchChartForm({ type: "set-selected-line-list-mode", value });
  const setSelectedLineSmooth = (value: boolean) =>
    dispatchChartForm({ type: "set-selected-line-smooth", value });
  const setSelectedBarOrientation = (value: ChartFormState["selectedBarOrientation"]) =>
    dispatchChartForm({ type: "set-selected-bar-orientation", value });
  const setSelectedBarRaceMode = (value: boolean) =>
    dispatchChartForm({ type: "set-selected-bar-race-mode", value });
  const setSelectedPieShowLabels = (value: boolean) =>
    dispatchChartForm({ type: "set-selected-pie-show-labels", value });
  const setEditName = (value: string) => dispatchChartForm({ type: "set-edit-name", value });
  const setEditOutputName = (value: string) =>
    dispatchChartForm({ type: "set-edit-output-name", value });
  const setEditOutputField = (value: string) =>
    dispatchChartForm({ type: "set-edit-output-field", value });
  const setEditOutputCase = (value: string) =>
    dispatchChartForm({ type: "set-edit-output-case", value });
  const setEditField = (value: string) => dispatchChartForm({ type: "set-edit-field", value });
  const setEditMin = (value: string) => dispatchChartForm({ type: "set-edit-min", value });
  const setEditMax = (value: string) => dispatchChartForm({ type: "set-edit-max", value });
  const setEditLineTicks = (value: string) =>
    dispatchChartForm({ type: "set-edit-line-ticks", value });
  const setEditLineDecimals = (value: string) =>
    dispatchChartForm({ type: "set-edit-line-decimals", value });
  const setEditStatFontSize = (value: string) =>
    dispatchChartForm({ type: "set-edit-stat-font-size", value });
  const setEditLineListMode = (value: ChartFormState["editLineListMode"]) =>
    dispatchChartForm({ type: "set-edit-line-list-mode", value });
  const setEditLineSmooth = (value: boolean) =>
    dispatchChartForm({ type: "set-edit-line-smooth", value });
  const setEditBarOrientation = (value: ChartFormState["editBarOrientation"]) =>
    dispatchChartForm({ type: "set-edit-bar-orientation", value });
  const setEditBarRaceMode = (value: boolean) =>
    dispatchChartForm({ type: "set-edit-bar-race-mode", value });
  const setEditPieShowLabels = (value: boolean) =>
    dispatchChartForm({ type: "set-edit-pie-show-labels", value });
  const setEditOutputValueType = (value: ChartFormState["editOutputValueType"]) =>
    dispatchChartForm({ type: "set-edit-output-value-type", value });
  const setTimeGranularity = (value: ChartFormState["timeGranularity"]) =>
    dispatchChartForm({ type: "set-time-granularity", value });
  const setTimeStart = (value: string) => dispatchChartForm({ type: "set-time-start", value });
  const setTimeEnd = (value: string) => dispatchChartForm({ type: "set-time-end", value });
  const setFilterMode = (value: ChartFilterMode) => {
    dispatchChartForm({ type: "set-filter-mode", value });
    onFilterModeChange?.(value);
  };
  const setRangePreset = (value: ChartFormState["rangePreset"]) =>
    dispatchChartForm({ type: "set-range-preset", value });

  const canAddChart = useMemo(() => {
    if (disabled || readOnly) return false;
    if (selectedChartType === "line" || selectedChartType === "area") {
      return selectedLineFields.length > 0;
    }
    if (selectedChartType === "pie" || selectedChartType === "bar") {
      return Boolean(selectedField) && listAllowedFields.includes(selectedField);
    }
    return Boolean(selectedField);
  }, [
    disabled,
    readOnly,
    selectedChartType,
    selectedLineFields.length,
    selectedField,
    listAllowedFields,
  ]);

  const editFieldType = editField && getChartType ? getChartType(editField) : null;
  const selectedLineField = selectedLineFields[0] ?? "";
  const selectedLineFieldType =
    selectedLineField && getChartType ? getChartType(selectedLineField) : null;
  const selectedOutputFieldType =
    selectedOutputField && getChartType ? getChartType(selectedOutputField) : null;
  const editOutputFieldType =
    editOutputField && getChartType ? getChartType(editOutputField) : null;
  const isSelectedLineText = selectedLineFieldType === "text";
  const isSelectedLineList = selectedLineFieldType === "list";
  const hideLineNumericInputsInAdd = isSelectedLineText;
  const isEditLineText =
    (editingChartType === "line" || editingChartType === "area") && editFieldType === "text";
  const isEditLineList =
    (editingChartType === "line" || editingChartType === "area") && editFieldType === "list";
  const hideLineNumericInputsInEdit = isEditLineText;

  useEffect(() => {
    const allowedFields =
      selectedChartType === "meter"
        ? meterAllowedFields
        : selectedChartType === "pie" || selectedChartType === "bar"
          ? listAllowedFields
          : availableFields;
    if (!allowedFields.length) {
      if (selectedField) {
        dispatchChartForm({ type: "set-selected-field", value: "" });
      }
      return;
    }
    if (!allowedFields.includes(selectedField)) {
      dispatchChartForm({ type: "set-selected-field", value: allowedFields[0] });
    }
  }, [
    availableFields,
    meterAllowedFields,
    selectedChartType,
    selectedField,
    dispatchChartForm,
    listAllowedFields,
  ]);

  useEffect(() => {
    if (!availableFields.length) {
      if (selectedLineFields.length) {
        dispatchChartForm({ type: "set-selected-line-field", value: "" });
      }
      return;
    }
    const selected = selectedLineFields[0];
    if (selected && availableFields.includes(selected)) return;
    dispatchChartForm({ type: "set-selected-line-field", value: availableFields[0] });
  }, [availableFields, selectedLineFields, dispatchChartForm]);

  useEffect(() => {
    if (selectedChartType !== "line" && selectedChartType !== "area") return;
    if (!availableFields.length) return;
    if (!selectedLineFields.length) {
      dispatchChartForm({ type: "set-selected-line-field", value: availableFields[0] });
    }
  }, [availableFields, selectedChartType, selectedLineFields.length, dispatchChartForm]);

  useEffect(() => {
    if (!isEditOpen) return;
    if (editingChartType === "button") return;
    const allowedFields =
      editingChartType === "meter"
        ? meterAllowedFields
        : editingChartType === "pie" || editingChartType === "bar"
          ? listAllowedFields
          : availableFields;
    if (!allowedFields.length) return;
    if (!allowedFields.includes(editField)) {
      dispatchChartForm({ type: "set-edit-field", value: allowedFields[0] });
    }
  }, [
    availableFields,
    meterAllowedFields,
    editingChartType,
    editField,
    isEditOpen,
    dispatchChartForm,
    listAllowedFields,
  ]);

  useEffect(() => {
    if (!availableFields.length) {
      if (selectedOutputField) {
        dispatchChartForm({ type: "set-selected-output-field", value: "" });
      }
      return;
    }
    if (!selectedOutputField || !availableFields.includes(selectedOutputField)) {
      dispatchChartForm({ type: "set-selected-output-field", value: availableFields[0] });
    }
  }, [availableFields, selectedOutputField, dispatchChartForm]);

  useEffect(() => {
    if (!isEditOutputOpen) return;
    if (!availableFields.length) {
      if (editOutputField) {
        dispatchChartForm({ type: "set-edit-output-field", value: "" });
      }
      return;
    }
    if (!editOutputField || !availableFields.includes(editOutputField)) {
      dispatchChartForm({ type: "set-edit-output-field", value: availableFields[0] });
    }
  }, [availableFields, editOutputField, isEditOutputOpen, dispatchChartForm]);

  useEffect(() => {
    if (!selectedOutputField) {
      if (selectedOutputCase) {
        dispatchChartForm({ type: "set-selected-output-case", value: "" });
      }
      return;
    }
    if (selectedOutputFieldType !== "text" && selectedOutputFieldType !== "list") {
      if (selectedOutputCase) {
        dispatchChartForm({ type: "set-selected-output-case", value: "" });
      }
      return;
    }
    const cases = normalizeCaseList(getChartCases?.(selectedOutputField));
    if (!cases.length) {
      if (selectedOutputCase) {
        dispatchChartForm({ type: "set-selected-output-case", value: "" });
      }
      return;
    }
    const current = selectedOutputCase.trim().toLowerCase();
    const matched = current
      ? cases.find((item) => item.toLowerCase() === current)
      : null;
    if (!matched) {
      dispatchChartForm({ type: "set-selected-output-case", value: cases[0] });
    } else if (matched !== selectedOutputCase) {
      dispatchChartForm({ type: "set-selected-output-case", value: matched });
    }
  }, [
    selectedOutputField,
    selectedOutputFieldType,
    selectedOutputCase,
    getChartCases,
    dispatchChartForm,
  ]);

  useEffect(() => {
    if (!isEditOutputOpen) return;
    if (!editOutputField) {
      if (editOutputCase) {
        dispatchChartForm({ type: "set-edit-output-case", value: "" });
      }
      return;
    }
    if (editOutputFieldType !== "text" && editOutputFieldType !== "list") {
      if (editOutputCase) {
        dispatchChartForm({ type: "set-edit-output-case", value: "" });
      }
      return;
    }
    const cases = normalizeCaseList(getChartCases?.(editOutputField));
    if (!cases.length) {
      if (editOutputCase) {
        dispatchChartForm({ type: "set-edit-output-case", value: "" });
      }
      return;
    }
    const current = editOutputCase.trim().toLowerCase();
    const matched = current ? cases.find((item) => item.toLowerCase() === current) : null;
    if (!matched) {
      dispatchChartForm({ type: "set-edit-output-case", value: cases[0] });
    } else if (matched !== editOutputCase) {
      dispatchChartForm({ type: "set-edit-output-case", value: matched });
    }
  }, [
    isEditOutputOpen,
    editOutputField,
    editOutputFieldType,
    editOutputCase,
    getChartCases,
    dispatchChartForm,
  ]);

  return {
    canAddChart,
    editFieldType,
    selectedOutputFieldType,
    editOutputFieldType,
    selectedLineField,
    selectedLineFieldType,
    isSelectedLineText,
    isSelectedLineList,
    hideLineNumericInputsInAdd,
    isEditLineText,
    isEditLineList,
    hideLineNumericInputsInEdit,
    setSelectedChartType,
    setSelectedOutputType,
    setSelectedOutputValueType,
    setSelectedOutputField,
    setSelectedOutputCase,
    setSelectedField,
    setSelectedMin,
    setSelectedMax,
    setSelectedLineMin,
    setSelectedLineMax,
    setSelectedLineTicks,
    setSelectedLineDecimals,
    setSelectedStatFontSize,
    setSelectedLineListMode,
    setSelectedLineSmooth,
    setSelectedBarOrientation,
    setSelectedBarRaceMode,
    setSelectedPieShowLabels,
    setEditName,
    setEditOutputName,
    setEditOutputField,
    setEditOutputCase,
    setEditField,
    setEditMin,
    setEditMax,
    setEditLineTicks,
    setEditLineDecimals,
    setEditStatFontSize,
    setEditLineListMode,
    setEditLineSmooth,
    setEditBarOrientation,
    setEditBarRaceMode,
    setEditPieShowLabels,
    setEditOutputValueType,
    setTimeGranularity,
    setTimeStart,
    setTimeEnd,
    setFilterMode,
    setRangePreset,
  };
};
