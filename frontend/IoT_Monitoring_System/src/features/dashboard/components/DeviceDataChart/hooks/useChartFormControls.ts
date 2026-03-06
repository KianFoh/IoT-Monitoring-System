import { useEffect, useMemo } from "react";
import type { ChartFormState } from "../state/deviceDataChartState";
import type { ChartFilterMode, DataFieldType } from "../types/deviceDataChartTypes";

type UseChartFormControlsParams = {
  chartForm: ChartFormState;
  dispatchChartForm: React.Dispatch<any>;
  availableFields: string[];
  meterAllowedFields: string[];
  listAllowedFields: string[];
  getChartType?: (field: string) => DataFieldType;
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
  disabled,
  readOnly,
  onFilterModeChange,
}: UseChartFormControlsParams) => {
  const {
    selectedChartType,
    selectedField,
    selectedLineFields,
    editingChartType,
    editField,
    isEditOpen,
  } = chartForm;

  const setSelectedChartType = (value: ChartFormState["selectedChartType"]) =>
    dispatchChartForm({ type: "set-selected-chart-type", value });
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
  const setSelectedLineListMode = (value: ChartFormState["selectedLineListMode"]) =>
    dispatchChartForm({ type: "set-selected-line-list-mode", value });
  const setSelectedBarOrientation = (value: ChartFormState["selectedBarOrientation"]) =>
    dispatchChartForm({ type: "set-selected-bar-orientation", value });
  const setSelectedBarRaceMode = (value: boolean) =>
    dispatchChartForm({ type: "set-selected-bar-race-mode", value });
  const setSelectedPieShowLabels = (value: boolean) =>
    dispatchChartForm({ type: "set-selected-pie-show-labels", value });
  const setEditName = (value: string) => dispatchChartForm({ type: "set-edit-name", value });
  const setEditField = (value: string) => dispatchChartForm({ type: "set-edit-field", value });
  const setEditMin = (value: string) => dispatchChartForm({ type: "set-edit-min", value });
  const setEditMax = (value: string) => dispatchChartForm({ type: "set-edit-max", value });
  const setEditLineTicks = (value: string) =>
    dispatchChartForm({ type: "set-edit-line-ticks", value });
  const setEditLineDecimals = (value: string) =>
    dispatchChartForm({ type: "set-edit-line-decimals", value });
  const setEditLineListMode = (value: ChartFormState["editLineListMode"]) =>
    dispatchChartForm({ type: "set-edit-line-list-mode", value });
  const setEditBarOrientation = (value: ChartFormState["editBarOrientation"]) =>
    dispatchChartForm({ type: "set-edit-bar-orientation", value });
  const setEditBarRaceMode = (value: boolean) =>
    dispatchChartForm({ type: "set-edit-bar-race-mode", value });
  const setEditPieShowLabels = (value: boolean) =>
    dispatchChartForm({ type: "set-edit-pie-show-labels", value });
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

  return {
    canAddChart,
    editFieldType,
    selectedLineField,
    selectedLineFieldType,
    isSelectedLineText,
    isSelectedLineList,
    hideLineNumericInputsInAdd,
    isEditLineText,
    isEditLineList,
    hideLineNumericInputsInEdit,
    setSelectedChartType,
    setSelectedField,
    setSelectedMin,
    setSelectedMax,
    setSelectedLineMin,
    setSelectedLineMax,
    setSelectedLineTicks,
    setSelectedLineDecimals,
    setSelectedLineListMode,
    setSelectedBarOrientation,
    setSelectedBarRaceMode,
    setSelectedPieShowLabels,
    setEditName,
    setEditField,
    setEditMin,
    setEditMax,
    setEditLineTicks,
    setEditLineDecimals,
    setEditLineListMode,
    setEditBarOrientation,
    setEditBarRaceMode,
    setEditPieShowLabels,
    setTimeGranularity,
    setTimeStart,
    setTimeEnd,
    setFilterMode,
    setRangePreset,
  };
};
